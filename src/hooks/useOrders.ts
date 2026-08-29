import { useState, useEffect, useCallback } from 'react';
import { Order, OrderItem, PaymentStatus, PaymentMode } from '../types/order';
import { orderService } from '../services/orderService';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (
    doctorId: string,
    items: OrderItem[],
    paymentStatus: PaymentStatus = 'pending',
    paymentMode: PaymentMode = 'Cash',
    notes = ''
  ): Promise<Order> => {
    const newOrder = await orderService.createOrder(doctorId, items, paymentStatus, paymentMode, notes);
    await fetchOrders();
    return newOrder;
  };

  const updatePayment = async (
    orderId: string,
    paymentStatus?: PaymentStatus,
    paymentMode?: PaymentMode
  ) => {
    await orderService.updateOrderPayment(orderId, {
      payment_status: paymentStatus,
      payment_mode: paymentMode,
    });
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            payment_status: paymentStatus || o.payment_status,
            payment_mode: paymentMode || o.payment_mode,
          };
        }
        return o;
      })
    );
  };

  const deleteOrder = async (id: string) => {
    await orderService.deleteOrder(id);
    await fetchOrders();
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const docName = o.doctor?.doctor_name?.toLowerCase() || '';
    const clinicName = o.doctor?.clinic_name?.toLowerCase() || '';
    const num = o.order_number.toLowerCase();
    return num.includes(q) || docName.includes(q) || clinicName.includes(q);
  });

  return {
    orders: filteredOrders,
    allOrders: orders,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchOrders,
    createOrder,
    updatePayment,
    deleteOrder,
  };
}
