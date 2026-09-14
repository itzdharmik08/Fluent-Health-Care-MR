import { supabase } from '../lib/supabase';
import { Order, OrderItem, PaymentStatus, PaymentMode } from '../types/order';
import { authService } from './authService';
import { CalculationsEngine } from '../lib/calculations';

export const orderService = {
  /**
   * Fetch all orders for current user
   */
  async getOrders(): Promise<Order[]> {
    await authService.ensureUserProfile();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        doctor:doctors (*),
        order_items (
          *,
          medicine:medicines (
            id,
            medicine_name,
            brand_name,
            packing,
            mrp,
            current_rate,
            gst_percent
          )
        )
      `)
      .order('order_date', { ascending: false });

    if (error) throw error;
    return (data || []) as Order[];
  },

  /**
   * Fetch single order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        doctor:doctors (*),
        order_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Order;
  },

  /**
   * Create new order with transaction line item snapshots
   */
  async createOrder(
    doctorId: string,
    items: OrderItem[],
    paymentStatus: PaymentStatus = 'pending',
    paymentMode: PaymentMode = 'Cash',
    notes = ''
  ): Promise<Order> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    // Sanitize items - ensure valid medicine and positive quantity
    const validItems = (items || []).filter((item) => {
      if (!item) return false;
      const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
      const qty = Number(item.quantity);
      return Boolean(item.medicine_id) && name.length > 0 && !isNaN(qty) && qty > 0;
    });

    const totals = CalculationsEngine.calculateOrderTotals(validItems);
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderPayload = {
      user_id: user?.id,
      doctor_id: doctorId,
      order_number: orderNumber,
      order_date: new Date().toISOString(),
      subtotal: totals.gross_subtotal,
      discount_amount: totals.discount_amount,
      gst_amount: totals.gst_amount,
      total_amount: totals.total_amount,
      payment_status: paymentStatus,
      payment_mode: paymentMode,
      notes: notes,
      status: 'completed',
    };

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()
      .single();

    if (orderErr) throw orderErr;

    const lineItemsPayload = validItems.map((item) => {
      const calc = CalculationsEngine.calculateLineItem(item);
      return {
        order_id: insertedOrder.id,
        medicine_id: item.medicine_id,
        medicine_name_snapshot: (item.medicine_name_snapshot || item.medicine_name || 'Medicine Item').trim(),
        quantity: item.quantity,
        rate: item.rate,
        discount_percent: item.discount_percent || 0,
        discount_amount: calc.discount_amount,
        gst_percent: item.gst_percent || 12,
        gst_amount: calc.gst_amount,
        subtotal: calc.gross_amount,
        total_amount: calc.total_amount,
      };
    });

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(lineItemsPayload);

    if (itemsErr) console.error('Error inserting order items:', itemsErr);

    return insertedOrder as Order;
  },

  /**
   * Update payment status or mode for an order
   */
  async updateOrderPayment(
    orderId: string,
    updates: { payment_status?: PaymentStatus; payment_mode?: PaymentMode }
  ): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
  },

  /**
   * Delete order
   */
  async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
