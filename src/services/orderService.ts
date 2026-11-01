import { supabase } from '../lib/supabase';
import { Order, OrderItem, PaymentStatus, PaymentMode, SpecialDiscountConfig } from '../types/order';
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order by id:', error);
      return null;
    }
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
    notes = '',
    specialDiscount?: SpecialDiscountConfig | null
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

    const totals = CalculationsEngine.calculateOrderTotals(validItems, specialDiscount);
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    let formattedNotes = notes || '';
    if (specialDiscount && totals.special_discount_amount > 0) {
      const discountLabel = specialDiscount.type === 'percent'
        ? `${specialDiscount.value}%`
        : `Flat ₹${specialDiscount.value}`;
      const docLabel = specialDiscount.doctor_name ? ` for Dr. ${specialDiscount.doctor_name}` : '';
      const tag = `[SPECIAL_DISCOUNT:amount=${totals.special_discount_amount};type=${specialDiscount.type};value=${specialDiscount.value};doctor=${encodeURIComponent(specialDiscount.doctor_name || '')}]`;
      const humanNote = `🎯 Special One-Time Discount Applied: -₹${totals.special_discount_amount.toFixed(2)} (${discountLabel}${docLabel})`;
      formattedNotes = formattedNotes.trim() ? `${tag}\n${humanNote}\n${formattedNotes}` : `${tag}\n${humanNote}`;
    }

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
      notes: formattedNotes,
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
   * Update existing order with edited line items and doctor details
   */
  async updateOrder(
    orderId: string,
    doctorId: string,
    items: OrderItem[],
    paymentStatus: PaymentStatus = 'pending',
    paymentMode: PaymentMode = 'Cash',
    notes = '',
    specialDiscount?: SpecialDiscountConfig | null
  ): Promise<Order> {
    await authService.ensureUserProfile();

    // Sanitize items - ensure valid medicine and positive quantity
    const validItems = (items || []).filter((item) => {
      if (!item) return false;
      const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
      const qty = Number(item.quantity);
      return Boolean(item.medicine_id) && name.length > 0 && !isNaN(qty) && qty > 0;
    });

    const totals = CalculationsEngine.calculateOrderTotals(validItems, specialDiscount);

    let formattedNotes = notes || '';
    if (specialDiscount && totals.special_discount_amount > 0) {
      const discountLabel = specialDiscount.type === 'percent'
        ? `${specialDiscount.value}%`
        : `Flat ₹${specialDiscount.value}`;
      const docLabel = specialDiscount.doctor_name ? ` for Dr. ${specialDiscount.doctor_name}` : '';
      const tag = `[SPECIAL_DISCOUNT:amount=${totals.special_discount_amount};type=${specialDiscount.type};value=${specialDiscount.value};doctor=${encodeURIComponent(specialDiscount.doctor_name || '')}]`;
      const humanNote = `🎯 Special One-Time Discount Applied: -₹${totals.special_discount_amount.toFixed(2)} (${discountLabel}${docLabel})`;
      formattedNotes = formattedNotes.trim() ? `${tag}\n${humanNote}\n${formattedNotes}` : `${tag}\n${humanNote}`;
    }

    const { data: updatedOrder, error: orderErr } = await supabase
      .from('orders')
      .update({
        doctor_id: doctorId,
        subtotal: totals.gross_subtotal,
        discount_amount: totals.discount_amount,
        gst_amount: totals.gst_amount,
        total_amount: totals.total_amount,
        payment_status: paymentStatus,
        payment_mode: paymentMode,
        notes: formattedNotes,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Remove existing items and replace with updated snapshot items
    const { error: deleteErr } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteErr) console.error('Error deleting previous order items:', deleteErr);

    const lineItemsPayload = validItems.map((item) => {
      const calc = CalculationsEngine.calculateLineItem(item);
      return {
        order_id: orderId,
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

    if (itemsErr) console.error('Error updating order items:', itemsErr);

    return updatedOrder as Order;
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

  /**
   * Auto-sync pending/unpaid orders when a single medicine price changes in the Medicines tab
   */
  async syncPendingOrdersForMedicine(medicineId: string, newRate: number, newGstPercent?: number): Promise<number> {
    try {
      const { data: pendingOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          doctor:doctors (*),
          order_items (*)
        `)
        .eq('payment_status', 'pending');

      if (error || !pendingOrders || pendingOrders.length === 0) return 0;

      let affectedCount = 0;

      for (const order of pendingOrders) {
        const items = order.order_items || [];
        const hasMedicine = items.some((it: any) => it.medicine_id === medicineId);
        if (!hasMedicine) continue;

        const updatedItems = items.map((it: any) => {
          if (it.medicine_id === medicineId) {
            return {
              ...it,
              rate: newRate,
              gst_percent: newGstPercent !== undefined ? newGstPercent : it.gst_percent,
            };
          }
          return it;
        });

        const specialDisc = parseSpecialDiscount(order.notes);
        const totals = CalculationsEngine.calculateOrderTotals(updatedItems, specialDisc);

        await supabase
          .from('orders')
          .update({
            subtotal: totals.gross_subtotal,
            discount_amount: totals.discount_amount,
            gst_amount: totals.gst_amount,
            total_amount: totals.total_amount,
          })
          .eq('id', order.id);

        for (const it of updatedItems) {
          if (it.medicine_id === medicineId && it.id) {
            const calc = CalculationsEngine.calculateLineItem(it);
            await supabase
              .from('order_items')
              .update({
                rate: newRate,
                gst_percent: it.gst_percent,
                discount_amount: calc.discount_amount,
                gst_amount: calc.gst_amount,
                subtotal: calc.gross_amount,
                total_amount: calc.total_amount,
              })
              .eq('id', it.id);
          }
        }

        affectedCount++;
      }

      return affectedCount;
    } catch (err) {
      console.error('Error auto-syncing pending orders for medicine:', err);
      return 0;
    }
  },

  /**
   * Auto-sync pending/unpaid orders when multiple medicine prices change (e.g. bulk file import)
   */
  async syncPendingOrdersForMedicines(updates: Array<{ id: string; current_rate: number; gst_percent?: number }>): Promise<number> {
    if (!updates || updates.length === 0) return 0;

    const rateMap = new Map<string, { rate: number; gst?: number }>();
    updates.forEach((u) => {
      rateMap.set(u.id, { rate: u.current_rate, gst: u.gst_percent });
    });

    try {
      const { data: pendingOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          doctor:doctors (*),
          order_items (*)
        `)
        .eq('payment_status', 'pending');

      if (error || !pendingOrders || pendingOrders.length === 0) return 0;

      let affectedCount = 0;

      for (const order of pendingOrders) {
        const items = order.order_items || [];
        let orderChanged = false;

        const updatedItems = items.map((it: any) => {
          const update = rateMap.get(it.medicine_id);
          if (update && (update.rate !== it.rate || (update.gst !== undefined && update.gst !== it.gst_percent))) {
            orderChanged = true;
            return {
              ...it,
              rate: update.rate,
              gst_percent: update.gst !== undefined ? update.gst : it.gst_percent,
            };
          }
          return it;
        });

        if (!orderChanged) continue;

        const specialDisc = parseSpecialDiscount(order.notes);
        const totals = CalculationsEngine.calculateOrderTotals(updatedItems, specialDisc);

        await supabase
          .from('orders')
          .update({
            subtotal: totals.gross_subtotal,
            discount_amount: totals.discount_amount,
            gst_amount: totals.gst_amount,
            total_amount: totals.total_amount,
          })
          .eq('id', order.id);

        for (const it of updatedItems) {
          const update = rateMap.get(it.medicine_id);
          if (update && it.id) {
            const calc = CalculationsEngine.calculateLineItem(it);
            await supabase
              .from('order_items')
              .update({
                rate: it.rate,
                gst_percent: it.gst_percent,
                discount_amount: calc.discount_amount,
                gst_amount: calc.gst_amount,
                subtotal: calc.gross_amount,
                total_amount: calc.total_amount,
              })
              .eq('id', it.id);
          }
        }

        affectedCount++;
      }

      return affectedCount;
    } catch (err) {
      console.error('Error auto-syncing pending orders for medicines list:', err);
      return 0;
    }
  },

  /**
   * Recalculate a specific order with latest master medicine prices on-demand
   */
  async recalculateOrderWithLatestPrices(orderId: string): Promise<{
    changed: boolean;
    oldTotal: number;
    newTotal: number;
    updatedCount: number;
  }> {
    const order = await this.getOrderById(orderId);
    if (!order || !order.order_items || order.order_items.length === 0) {
      return { changed: false, oldTotal: 0, newTotal: 0, updatedCount: 0 };
    }

    const medicineIds = order.order_items.map((it) => it.medicine_id).filter(Boolean);
    const { data: latestMeds } = await supabase
      .from('medicines')
      .select('id, current_rate, gst_percent')
      .in('id', medicineIds);

    const priceMap = new Map<string, { rate: number; gst_percent: number }>();
    (latestMeds || []).forEach((m) => {
      priceMap.set(m.id, { rate: m.current_rate, gst_percent: m.gst_percent });
    });

    let updatedCount = 0;
    const updatedItems = order.order_items.map((it) => {
      const latest = priceMap.get(it.medicine_id);
      if (latest && (latest.rate !== it.rate || latest.gst_percent !== it.gst_percent)) {
        updatedCount++;
        return {
          ...it,
          rate: latest.rate,
          gst_percent: latest.gst_percent,
        };
      }
      return it;
    });

    if (updatedCount === 0) {
      return { changed: false, oldTotal: order.total_amount, newTotal: order.total_amount, updatedCount: 0 };
    }

    const specialDisc = parseSpecialDiscount(order.notes);
    const totals = CalculationsEngine.calculateOrderTotals(updatedItems, specialDisc);

    await supabase
      .from('orders')
      .update({
        subtotal: totals.gross_subtotal,
        discount_amount: totals.discount_amount,
        gst_amount: totals.gst_amount,
        total_amount: totals.total_amount,
      })
      .eq('id', orderId);

    for (const it of updatedItems) {
      if (it.id) {
        const calc = CalculationsEngine.calculateLineItem(it);
        await supabase
          .from('order_items')
          .update({
            rate: it.rate,
            gst_percent: it.gst_percent,
            discount_amount: calc.discount_amount,
            gst_amount: calc.gst_amount,
            subtotal: calc.gross_amount,
            total_amount: calc.total_amount,
          })
          .eq('id', it.id);
      }
    }

    return {
      changed: true,
      oldTotal: order.total_amount,
      newTotal: totals.total_amount,
      updatedCount,
    };
  },
};

const parseSpecialDiscount = (notes?: string | null): SpecialDiscountConfig | null => {
  if (!notes) return null;
  const match = notes.match(/\[SPECIAL_DISCOUNT:amount=([0-9.]+);type=(percent|fixed);value=([0-9.]+);doctor=([^\]]*)\]/);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]) || 0,
    type: match[2] as 'percent' | 'fixed',
    value: parseFloat(match[3]) || 0,
    doctor_name: decodeURIComponent(match[4] || ''),
  };
};

