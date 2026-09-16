import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useDoctors } from '../hooks/useDoctors';
import { Order, PaymentStatus, PaymentMode } from '../types/order';
import { formatINR, formatDate, formatDateTime } from '../lib/formatters';
import { copyTextToClipboard } from '../lib/utils';
import {
  Plus,
  Search,
  FileText,
  Printer,
  CheckCircle,
  Clock,
  Eye,
  X,
  AlertTriangle,
  Send,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
  Building,
  BellRing,
  Share2,
  Copy,
  Check,
  Sparkles,
  Tag,
  Trash2,
  Edit3,
  Loader2,
  MessageSquare,
  Phone,
} from 'lucide-react';

interface ParsedSpecialDiscount {
  amount: number;
  type: 'percent' | 'fixed';
  value: number;
  doctorName?: string;
}

const parseSpecialDiscount = (notes?: string | null): ParsedSpecialDiscount | null => {
  if (!notes) return null;
  const match = notes.match(/\[SPECIAL_DISCOUNT:amount=([0-9.]+);type=(percent|fixed);value=([0-9.]+);doctor=([^\]]*)\]/);
  if (!match) return null;
  return {
    amount: parseFloat(match[1]) || 0,
    type: match[2] as 'percent' | 'fixed',
    value: parseFloat(match[3]) || 0,
    doctorName: decodeURIComponent(match[4] || ''),
  };
};

const cleanOrderNotes = (notes?: string | null): string => {
  if (!notes) return '';
  return notes.replace(/\[SPECIAL_DISCOUNT:[^\]]+\]\n?/, '').trim();
};

export const Orders: React.FC = () => {
  const { orders, isLoading, searchQuery, setSearchQuery, updatePayment, deleteOrder } = useOrders();
  const { doctors } = useDoctors();
  const [searchParams] = useSearchParams();

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'doctor_grouped' | 'overdue' | 'pending' | 'paid'>('all');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({});
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // WhatsApp Direct Dispatch Number Configuration
  const [whatsappConfigModalOpen, setWhatsappConfigModalOpen] = useState(false);
  const [dispatchWhatsAppNumber, setDispatchWhatsAppNumber] = useState<string>(() => {
    return localStorage.getItem('mr_whatsapp_dispatch_number') || '';
  });
  const [tempWhatsAppNumber, setTempWhatsAppNumber] = useState<string>('');
  const [targetSendType, setTargetSendType] = useState<'configured' | 'doctor'>(() => {
    return (localStorage.getItem('mr_whatsapp_target_type') as 'configured' | 'doctor') || 'configured';
  });
  const [pendingShareOrder, setPendingShareOrder] = useState<Order | null>(null);

  // Sync active tab with URL parameter if present
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'overdue') setActiveTab('overdue');
    else if (filter === 'doctor') setActiveTab('doctor_grouped');
    else if (filter === 'pending') setActiveTab('pending');
  }, [searchParams]);

  // Generate simplified text summary for a SINGLE order
  const generateOrderShareText = (order: Order) => {
    const dateStr = formatDate(order.order_date);
    const docName = order.doctor?.doctor_name || 'N/A';
    const clinicName = order.doctor?.clinic_name?.trim() || '';
    const phone = order.doctor?.phone || 'N/A';
    const rawAddress = order.doctor?.address?.trim() || '';
    const rawArea = order.doctor?.area?.trim() || '';

    let formattedAddress = '';
    if (rawAddress) {
      const cleanAddr = rawAddress
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(', ');

      if (rawArea && !cleanAddr.toLowerCase().includes(rawArea.toLowerCase())) {
        formattedAddress = `${cleanAddr}, ${rawArea}`;
      } else {
        formattedAddress = cleanAddr;
      }
    } else if (rawArea) {
      formattedAddress = rawArea;
    } else if (clinicName) {
      formattedAddress = clinicName;
    } else {
      formattedAddress = 'N/A';
    }

    let text = `📅 *Date:* ${dateStr}\n`;
    text += `👨‍⚕️ *Doctor Name:* ${docName}\n`;
    if (clinicName) {
      text += `🏥 *Clinic Name:* ${clinicName}\n`;
    }
    text += `📞 *Number:* ${phone}\n`;
    text += `📍 *Address:* ${formattedAddress}\n\n`;

    text += `📦 *Order Items:*\n`;

    // Filter strictly for valid items that have a non-empty name and positive quantity
    const validItems = (order.order_items || []).filter((item) => {
      if (!item) return false;
      const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
      const qty = Number(item.quantity);
      return name.length > 0 && !isNaN(qty) && qty > 0;
    });

    if (validItems.length > 0) {
      validItems.forEach((item, idx) => {
        const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
        const qty = item.quantity;
        text += `${idx + 1}. *${name}* - Qty: ${qty}\n`;
      });
    } else {
      text += `(No items listed)\n`;
    }

    return text.trimEnd();
  };

  const handleCopyOrderText = async (order: Order) => {
    const text = generateOrderShareText(order);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedOrderId(order.id);
      setCopyToast(`Order ${order.order_number} copied to clipboard! 📋`);
      setTimeout(() => setCopiedOrderId(null), 2500);
      setTimeout(() => setCopyToast(null), 2500);
    }
  };

  const sendOrderToWhatsApp = (order: Order, targetNumber?: string) => {
    const text = generateOrderShareText(order);
    const rawNumber = (targetNumber || '').replace(/[^0-9]/g, '');
    const finalPhone = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

    const url = finalPhone
      ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleWhatsAppShare = (order: Order) => {
    if (targetSendType === 'doctor') {
      const docPhone = order.doctor?.phone || '';
      sendOrderToWhatsApp(order, docPhone);
      return;
    }

    const savedNumber = localStorage.getItem('mr_whatsapp_dispatch_number') || dispatchWhatsAppNumber;
    if (savedNumber && savedNumber.trim()) {
      sendOrderToWhatsApp(order, savedNumber);
    } else {
      // Prompt config modal directly so user can configure once and immediately send
      setPendingShareOrder(order);
      setTempWhatsAppNumber('');
      setWhatsappConfigModalOpen(true);
    }
  };

  const handleSaveWhatsAppConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = tempWhatsAppNumber.replace(/[^0-9]/g, '');
    localStorage.setItem('mr_whatsapp_dispatch_number', cleanNumber);
    localStorage.setItem('mr_whatsapp_target_type', targetSendType);
    setDispatchWhatsAppNumber(cleanNumber);
    setWhatsappConfigModalOpen(false);

    setCopyToast('WhatsApp dispatch configuration saved! 📱');
    setTimeout(() => setCopyToast(null), 2500);

    // If user clicked Send on an order before configuring, send it immediately
    if (pendingShareOrder) {
      const orderToSend = pendingShareOrder;
      setPendingShareOrder(null);
      sendOrderToWhatsApp(orderToSend, targetSendType === 'doctor' ? (orderToSend.doctor?.phone || '') : cleanNumber);
    }
  };

  const handleClearWhatsAppConfig = () => {
    localStorage.removeItem('mr_whatsapp_dispatch_number');
    setDispatchWhatsAppNumber('');
    setTempWhatsAppNumber('');
    setCopyToast('WhatsApp configuration cleared');
    setTimeout(() => setCopyToast(null), 2000);
  };

  const handleNativeShare = async (order: Order) => {
    const text = generateOrderShareText(order);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${order.order_number} - Fluent Health Care`,
          text: text,
        });
        return;
      } catch {
        // Fallback to copy if share was rejected or cancelled
      }
    }
    await handleCopyOrderText(order);
  };

  // Overdue calculation helper (30+ days / 1 month pending)
  const getOverdueInfo = (orderDateStr: string, paymentStatus: string) => {
    if (paymentStatus === 'paid' || !orderDateStr) return { isOverdue: false, days: 0 };
    const orderDate = new Date(orderDateStr);
    const diffTime = Math.max(0, Date.now() - orderDate.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      isOverdue: days >= 30,
      days,
    };
  };

  // WhatsApp Reminder Link Generator
  const handleSendReminder = (order: Order) => {
    const doctorName = order.doctor?.doctor_name || 'Doctor';
    const phone = (order.doctor?.phone || '').replace(/[^0-9]/g, '');
    const days = getOverdueInfo(order.order_date, order.payment_status).days;
    const amount = formatINR(order.total_amount);

    const message = `Hello Dr. ${doctorName},\nThis is a friendly payment reminder from Fluent Health Care regarding Invoice #${order.order_number} for ${amount} dated ${formatDate(order.order_date)} (${days} days pending).\nKindly clear the dues at your earliest convenience. Thank you!`;

    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  // Delete Order confirmation action
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      if (viewingOrder?.id === orderToDelete.id) {
        setViewingOrder(null);
      }
      setCopyToast(`Order ${orderToDelete.order_number} deleted successfully.`);
      setTimeout(() => setCopyToast(null), 3000);
      setOrderToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete order:', err);
      alert('Failed to delete order. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute overdue & payment metrics
  const overdueOrders = orders.filter((o) => getOverdueInfo(o.order_date, o.payment_status).isOverdue);
  const pendingOrders = orders.filter((o) => o.payment_status === 'pending');
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');

  const totalOverdueAmount = overdueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Group orders by Doctor
  const doctorGroupMap = new Map<
    string,
    {
      docId: string;
      doctorName: string;
      clinicName: string;
      phone?: string;
      area?: string;
      orders: Order[];
      totalAmount: number;
      pendingAmount: number;
      paidAmount: number;
      overdueCount: number;
    }
  >();

  orders.forEach((o) => {
    const docId = o.doctor_id || o.doctor?.id || 'unknown';
    const docName = o.doctor?.doctor_name || 'Unassigned Doctor';
    const clinicName = o.doctor?.clinic_name || 'Clinic';
    const phone = o.doctor?.phone || undefined;
    const area = o.doctor?.area || undefined;

    if (!doctorGroupMap.has(docId)) {
      doctorGroupMap.set(docId, {
        docId,
        doctorName: docName,
        clinicName,
        phone,
        area,
        orders: [],
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        overdueCount: 0,
      });
    }

    const group = doctorGroupMap.get(docId)!;
    group.orders.push(o);
    group.totalAmount += o.total_amount || 0;
    if (o.payment_status === 'paid') {
      group.paidAmount += o.total_amount || 0;
    } else {
      group.pendingAmount += o.total_amount || 0;
      if (getOverdueInfo(o.order_date, o.payment_status).isOverdue) {
        group.overdueCount += 1;
      }
    }
  });

  const doctorGroupsArray = Array.from(doctorGroupMap.values());

  // Filter orders according to activeTab & selectedDoctorFilter
  const filteredOrders = orders.filter((o) => {
    // 1. Doctor Selector Filter
    if (selectedDoctorFilter !== 'all') {
      const docId = o.doctor_id || o.doctor?.id;
      if (docId !== selectedDoctorFilter) return false;
    }

    // 2. Tab Filter
    if (activeTab === 'overdue') {
      return getOverdueInfo(o.order_date, o.payment_status).isOverdue;
    }
    if (activeTab === 'pending') {
      return o.payment_status === 'pending';
    }
    if (activeTab === 'paid') {
      return o.payment_status === 'paid';
    }
    return true;
  });

  // Filter doctor groups according to search / filter
  const filteredDoctorGroups = doctorGroupsArray.filter((g) => {
    if (selectedDoctorFilter !== 'all' && g.docId !== selectedDoctorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchDoc = g.doctorName.toLowerCase().includes(q) || g.clinicName.toLowerCase().includes(q);
      const matchOrder = g.orders.some((o) => o.order_number.toLowerCase().includes(q));
      return matchDoc || matchOrder;
    }
    return true;
  });

  const toggleDoctorExpand = (docId: string) => {
    setExpandedDoctors((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Orders & Doctor Receipts</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track transactions, group orders by doctor, share single order receipts, and monitor 1-month payment reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTempWhatsAppNumber(dispatchWhatsAppNumber);
              setWhatsappConfigModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/90 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-2xs transition-all"
            title="Configure Default WhatsApp Order Dispatch Number"
          >
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp Config</span>
            {dispatchWhatsAppNumber ? (
              <span className="inline-flex items-center rounded-md bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                {dispatchWhatsAppNumber.slice(-4).padStart(dispatchWhatsAppNumber.length, '•')}
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Not configured yet" />
            )}
          </button>

          <Link
            to="/orders/new"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Order</span>
          </Link>
        </div>
      </div>

      {/* 🚨 1-Month Overdue Payment Reminder Alert Banner */}
      {overdueOrders.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shrink-0">
                <BellRing className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-sm sm:text-base flex items-center gap-2">
                  <span>🚨 Payment Reminder Alert (1+ Month Overdue)</span>
                  <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-extrabold text-rose-900">
                    {overdueOrders.length} {overdueOrders.length === 1 ? 'Order' : 'Orders'}
                  </span>
                </h3>
                <p className="text-xs text-rose-700">
                  Total Outstanding Dues Older than 30 Days: <strong>{formatINR(totalOverdueAmount)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('overdue')}
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-all shadow-xs"
            >
              Filter Overdue Orders
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {overdueOrders.slice(0, 4).map((ov) => {
              const info = getOverdueInfo(ov.order_date, ov.payment_status);
              return (
                <div
                  key={ov.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-rose-200/70 shadow-2xs text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{ov.doctor?.doctor_name || 'Doctor'}</span>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                        {info.days} days pending
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Invoice #{ov.order_number} • {formatDate(ov.order_date)}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-extrabold text-slate-900">{formatINR(ov.total_amount)}</div>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleWhatsAppShare(ov)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs"
                      >
                        <Send className="h-2.5 w-2.5" />
                        <span>Share Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs & Doctor Filter Bar */}
      <div className="space-y-3">
        {/* Navigation Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('doctor_grouped')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'doctor_grouped'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Grouped by Doctor ({doctorGroupMap.size})</span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span>Overdue 30+ Days ({overdueOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending ({pendingOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('paid')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Paid ({paidOrders.length})
          </button>
        </div>

        {/* Search & Doctor Dropdown Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or doctor name..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Doctor Filter Dropdown */}
          <div className="w-full sm:w-64">
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none shadow-2xs"
            >
              <option value="all">-- All Doctors ({doctorGroupsArray.length}) --</option>
              {doctors.map((d) => {
                const count = orders.filter((o) => o.doctor_id === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {d.doctor_name} ({count} {count === 1 ? 'order' : 'orders'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Grouped by Doctor View */}
      {activeTab === 'doctor_grouped' ? (
        <div className="space-y-4">
          {filteredDoctorGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              No doctors found matching current search/filter.
            </div>
          ) : (
            filteredDoctorGroups.map((group) => {
              const isExpanded = expandedDoctors[group.docId] !== false; // expanded by default
              return (
                <div key={group.docId} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  {/* Doctor Group Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">{group.doctorName}</h3>
                          {group.overdueCount > 0 && (
                            <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 border border-rose-200">
                              🚨 {group.overdueCount} Overdue Reminder
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{group.clinicName}</span>
                          {group.area && <span>• {group.area}</span>}
                          {group.phone && <span>• 📞 {group.phone}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Summary Pills & Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-semibold text-slate-700">
                          {group.orders.length} Orders
                        </span>
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 border border-emerald-200 font-bold text-emerald-800">
                          Total: {formatINR(group.totalAmount)}
                        </span>
                        {group.pendingAmount > 0 && (
                          <span className="rounded-lg bg-amber-50 px-2.5 py-1 border border-amber-200 font-bold text-amber-800">
                            Pending: {formatINR(group.pendingAmount)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleDoctorExpand(group.docId)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 p-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Doctor Orders Table (Collapsible) */}
                  {isExpanded && (
                    <div>
                      {/* Mobile Cards (sm:hidden) */}
                      <div className="divide-y divide-slate-100 sm:hidden">
                        {group.orders.map((o) => {
                          const overdue = getOverdueInfo(o.order_date, o.payment_status);
                          const isCopied = copiedOrderId === o.id;
                          return (
                            <div key={o.id} className="p-3.5 space-y-2.5 bg-white hover:bg-slate-50/50">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-indigo-600 text-xs">{o.order_number}</span>
                                <span className="text-xs text-slate-500">{formatDate(o.order_date)}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-700">Total Payable:</div>
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-slate-900">{formatINR(o.total_amount)}</div>
                                  {(() => {
                                    const disc = parseSpecialDiscount(o.notes);
                                    if (!disc || disc.amount <= 0) return null;
                                    return (
                                      <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                        <Sparkles className="h-3 w-3 shrink-0" />
                                        <span>Special Disc: -{formatINR(disc.amount)}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Row 3: Payment Status & Mode Controls */}
                              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <select
                                    value={o.payment_status || 'pending'}
                                    onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                    className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                      o.payment_status === 'paid'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : overdue.isOverdue
                                        ? 'border-rose-300 bg-rose-100 text-rose-900 font-extrabold'
                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    <option value="pending">Pending ⏳</option>
                                    <option value="paid">Paid ✅</option>
                                  </select>

                                  <select
                                    value={o.payment_mode || 'Cash'}
                                    onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                                  >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                  </select>
                                </div>

                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Actions
                                </span>
                              </div>

                              {/* Row 4: 5 Action Buttons Grid - guaranteed no edge overflow on any screen */}
                              <div className="grid grid-cols-5 gap-1.5 pt-1">
                                <Link
                                  to={`/orders/edit/${o.id}`}
                                  title="Edit order"
                                  className="flex items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/80 py-1.5 px-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-colors shadow-2xs"
                                >
                                  <Edit3 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[10px] sm:text-[11px]">Edit</span>
                                </Link>

                                <button
                                  onClick={() => handleWhatsAppShare(o)}
                                  title="Share on WhatsApp"
                                  className="flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/80 py-1.5 px-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-colors shadow-2xs"
                                >
                                  <Send className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[10px] sm:text-[11px]">Share</span>
                                </button>

                                <button
                                  onClick={() => handleCopyOrderText(o)}
                                  title="Copy text"
                                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
                                >
                                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
                                  <span className="text-[10px] sm:text-[11px]">{isCopied ? 'Done' : 'Copy'}</span>
                                </button>

                                <button
                                  onClick={() => setViewingOrder(o)}
                                  title="View Invoice"
                                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                  <span className="text-[10px] sm:text-[11px]">Invoice</span>
                                </button>

                                <button
                                  onClick={() => setOrderToDelete(o)}
                                  title="Delete order"
                                  className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50/80 py-1.5 px-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:bg-rose-200 transition-colors shadow-2xs"
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[10px] sm:text-[11px]">Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table (hidden sm:block) */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-4 py-2.5">Order Ref</th>
                              <th className="px-4 py-2.5">Order Date</th>
                              <th className="px-4 py-2.5">Total Amount</th>
                              <th className="px-4 py-2.5">Payment Status</th>
                              <th className="px-4 py-2.5">Payment Mode</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {group.orders.map((o) => {
                              const overdue = getOverdueInfo(o.order_date, o.payment_status);
                              const isCopied = copiedOrderId === o.id;
                              return (
                                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3 font-bold text-indigo-600">{o.order_number}</td>
                                  <td className="px-4 py-3 text-slate-500">{formatDate(o.order_date)}</td>
                                  <td className="px-4 py-3 font-bold text-slate-900">
                                    <div>{formatINR(o.total_amount)}</div>
                                    {(() => {
                                      const disc = parseSpecialDiscount(o.notes);
                                      if (!disc || disc.amount <= 0) return null;
                                      return (
                                        <div className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 mt-0.5">
                                          <Sparkles className="h-3 w-3 shrink-0" />
                                          <span>Special Disc: -{formatINR(disc.amount)}</span>
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* Interactive Payment Status Selector */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={o.payment_status || 'pending'}
                                        onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                        className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                          o.payment_status === 'paid'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : overdue.isOverdue
                                            ? 'border-rose-300 bg-rose-100 text-rose-900 font-extrabold'
                                            : 'border-amber-200 bg-amber-50 text-amber-700'
                                        }`}
                                      >
                                        <option value="pending">Pending ⏳</option>
                                        <option value="paid">Paid ✅</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* Interactive Payment Mode Selector */}
                                  <td className="px-4 py-3">
                                    <select
                                      value={o.payment_mode || 'Cash'}
                                      onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                                    >
                                      <option value="Cash">Cash</option>
                                      <option value="UPI">UPI</option>
                                    </select>
                                  </td>

                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Link
                                        to={`/orders/edit/${o.id}`}
                                        title="Edit this order"
                                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        <span>Edit</span>
                                      </Link>
                                      <button
                                        onClick={() => handleWhatsAppShare(o)}
                                        title="Share this order details on WhatsApp"
                                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>Share</span>
                                      </button>
                                      <button
                                        onClick={() => handleCopyOrderText(o)}
                                        title="Copy single order receipt text"
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                      </button>
                                      <button
                                        onClick={() => setViewingOrder(o)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Invoice</span>
                                      </button>
                                      <button
                                        onClick={() => setOrderToDelete(o)}
                                        title="Delete this order"
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW MODE 2: Flat List View */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">No Orders Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? `No order matching "${searchQuery}".` : 'No transactions recorded under this filter.'}
              </p>
              <Link
                to="/orders/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create Order Now</span>
              </Link>
            </div>
          ) : (
            <div>
              {/* Mobile Cards View (sm:hidden) */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {filteredOrders.map((o) => {
                  const overdue = getOverdueInfo(o.order_date, o.payment_status);
                  const isCopied = copiedOrderId === o.id;
                  return (
                    <div key={o.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                      {/* Row 1: Order Number + Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-indigo-600 text-sm">{o.order_number}</span>
                          {overdue.isOverdue && (
                            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-800 border border-rose-200">
                              🚨 {overdue.days}d Overdue
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500">{formatDate(o.order_date)}</span>
                      </div>

                      {/* Row 2: Doctor & Clinic */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{o.doctor?.doctor_name || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{o.doctor?.clinic_name || 'Clinic'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-extrabold text-slate-900">{formatINR(o.total_amount)}</div>
                          {(() => {
                            const disc = parseSpecialDiscount(o.notes);
                            if (!disc || disc.amount <= 0) return null;
                            return (
                              <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                                <Sparkles className="h-3 w-3 shrink-0" />
                                <span>Special Disc: -{formatINR(disc.amount)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Row 3: Payment Status & Mode Controls */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={o.payment_status || 'pending'}
                            onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                            className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                              o.payment_status === 'paid'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : overdue.isOverdue
                                ? 'border-rose-300 bg-rose-100 text-rose-900 font-extrabold'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <option value="pending">Pending ⏳</option>
                            <option value="paid">Paid ✅</option>
                          </select>

                          <select
                            value={o.payment_mode || 'Cash'}
                            onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                          >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                          </select>
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Actions
                        </span>
                      </div>

                      {/* Row 4: 5 Action Buttons Grid - guaranteed no edge overflow on any screen */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        <Link
                          to={`/orders/edit/${o.id}`}
                          title="Edit order"
                          className="flex items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/80 py-1.5 px-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-colors shadow-2xs"
                        >
                          <Edit3 className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[10px] sm:text-[11px]">Edit</span>
                        </Link>

                        <button
                          onClick={() => handleWhatsAppShare(o)}
                          title="Share on WhatsApp"
                          className="flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/80 py-1.5 px-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-colors shadow-2xs"
                        >
                          <Send className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[10px] sm:text-[11px]">Share</span>
                        </button>

                        <button
                          onClick={() => handleCopyOrderText(o)}
                          title="Copy text"
                          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
                          <span className="text-[10px] sm:text-[11px]">{isCopied ? 'Done' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => setViewingOrder(o)}
                          title="View Invoice"
                          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 px-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-[10px] sm:text-[11px]">Invoice</span>
                        </button>

                        <button
                          onClick={() => setOrderToDelete(o)}
                          title="Delete order"
                          className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50/80 py-1.5 px-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:bg-rose-200 transition-colors shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[10px] sm:text-[11px]">Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Doctor & Clinic</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Total Payable</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOrders.map((o) => {
                      const overdue = getOverdueInfo(o.order_date, o.payment_status);
                      const isCopied = copiedOrderId === o.id;
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-bold text-indigo-600">{o.order_number}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{o.doctor?.doctor_name || 'N/A'}</div>
                            <div className="text-[11px] text-slate-400">{o.doctor?.clinic_name || 'Clinic'}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div>{formatDate(o.order_date)}</div>
                            {overdue.isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                ⚠️ {overdue.days} days pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{formatINR(o.total_amount)}</div>
                            {(() => {
                              const disc = parseSpecialDiscount(o.notes);
                              if (!disc || disc.amount <= 0) return null;
                              return (
                                <div className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 mt-0.5">
                                  <Sparkles className="h-3 w-3 shrink-0" />
                                  <span>Special Disc: -{formatINR(disc.amount)}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Interactive Payment Status Selector */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={o.payment_status || 'pending'}
                                onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                  o.payment_status === 'paid'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : overdue.isOverdue
                                    ? 'border-rose-300 bg-rose-100 text-rose-900 font-extrabold'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                <option value="pending">Pending ⏳</option>
                                <option value="paid">Paid ✅</option>
                              </select>
                            </div>
                          </td>

                          {/* Interactive Payment Mode Selector */}
                          <td className="px-4 py-3">
                            <select
                              value={o.payment_mode || 'Cash'}
                              onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI">UPI</option>
                            </select>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/orders/edit/${o.id}`}
                                title="Edit this order"
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </Link>
                              <button
                                onClick={() => handleWhatsAppShare(o)}
                                title="Share this order details on WhatsApp"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Share</span>
                              </button>
                              <button
                                onClick={() => handleCopyOrderText(o)}
                                title="Copy single order receipt text"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button
                                onClick={() => setViewingOrder(o)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                <span>Invoice</span>
                              </button>
                              <button
                                onClick={() => setOrderToDelete(o)}
                                title="Delete this order"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable & Shareable Invoice Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Action Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4 print:hidden flex-wrap gap-2">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">Invoice Receipt ({viewingOrder.order_number})</h2>
                <p className="text-[11px] text-slate-400">Share single order receipt privately without exposing other data</p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Link
                  to={`/orders/edit/${viewingOrder.id}`}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 shadow-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Edit</span>
                </Link>

                <button
                  onClick={() => handleWhatsAppShare(viewingOrder)}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">WhatsApp</span>
                </button>

                <button
                  onClick={() => handleNativeShare(viewingOrder)}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Share</span>
                </button>

                <button
                  onClick={() => handleCopyOrderText(viewingOrder)}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {copiedOrderId === viewingOrder.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copiedOrderId === viewingOrder.id ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => setOrderToDelete(viewingOrder)}
                  title="Delete order"
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Delete</span>
                </button>

                <button onClick={() => setViewingOrder(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Print Content Area */}
            <div id="invoice-print-area" className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-bold text-indigo-900">FLUENT HEALTH CARE</h1>
                  <p className="text-[11px] text-slate-500">Pharmaceutical Distributor & Supply</p>
                  <p className="text-[11px] text-slate-500">Surat, Gujarat, India</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{viewingOrder.order_number}</div>
                  <div className="text-slate-500">{formatDateTime(viewingOrder.order_date)}</div>
                </div>
              </div>

              {/* Doctor Details & Payment Badges */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Billed To Doctor</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{viewingOrder.doctor?.doctor_name || 'Doctor N/A'}</div>
                  {viewingOrder.doctor?.clinic_name && (
                    <div className="text-slate-600 font-medium">{viewingOrder.doctor?.clinic_name}</div>
                  )}
                  {viewingOrder.doctor?.address && (
                    <div className="text-slate-500 whitespace-pre-line mt-0.5">{viewingOrder.doctor?.address}</div>
                  )}
                  {viewingOrder.doctor?.area && !viewingOrder.doctor?.address?.toLowerCase().includes(viewingOrder.doctor?.area?.toLowerCase()) && (
                    <div className="text-slate-500">{viewingOrder.doctor?.area}</div>
                  )}
                  {viewingOrder.doctor?.phone && (
                    <div className="text-slate-500">Phone: {viewingOrder.doctor?.phone}</div>
                  )}
                  {viewingOrder.doctor?.gst_number && (
                    <div className="text-slate-500">GST: {viewingOrder.doctor?.gst_number}</div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Payment Summary</span>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        viewingOrder.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {viewingOrder.payment_status === 'paid' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {viewingOrder.payment_status.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {viewingOrder.payment_mode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Rate (₹)</th>
                    <th className="py-2 text-right">Disc %</th>
                    <th className="py-2 text-right">GST %</th>
                    <th className="py-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingOrder.order_items?.map((item) => (
                    <tr key={item.id || item.medicine_id}>
                      <td className="py-2 font-semibold text-slate-900">{item.medicine_name_snapshot || item.medicine_name}</td>
                      <td className="py-2 text-center font-bold">{item.quantity}</td>
                      <td className="py-2 text-right">{formatINR(item.rate)}</td>
                      <td className="py-2 text-right">{item.discount_percent}%</td>
                      <td className="py-2 text-right">{item.gst_percent}%</td>
                      <td className="py-2 text-right font-bold">{formatINR(item.total_amount || item.quantity * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Invoice Totals */}
              {(() => {
                const viewingSpecialDisc = parseSpecialDiscount(viewingOrder.notes);
                const itemDiscounts = Math.max(0, viewingOrder.discount_amount - (viewingSpecialDisc?.amount || 0));
                return (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    {cleanOrderNotes(viewingOrder.notes) && (
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-xs">
                        <span className="font-bold text-slate-700">Order Notes:</span>
                        <p className="text-slate-600 mt-0.5 whitespace-pre-line">{cleanOrderNotes(viewingOrder.notes)}</p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <div className="w-80 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Gross Subtotal:</span>
                          <span className="font-semibold">{formatINR(viewingOrder.subtotal)}</span>
                        </div>
                        {itemDiscounts > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Line Items Discount:</span>
                            <span className="font-semibold">-{formatINR(itemDiscounts)}</span>
                          </div>
                        )}
                        {viewingSpecialDisc && viewingSpecialDisc.amount > 0 && (
                          <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>
                                Special Discount ({viewingSpecialDisc.type === 'percent' ? `${viewingSpecialDisc.value}%` : 'Flat'} - Dr. {viewingOrder.doctor?.doctor_name || viewingSpecialDisc.doctorName}):
                              </span>
                            </div>
                            <span className="font-extrabold text-emerald-900">-{formatINR(viewingSpecialDisc.amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-amber-600">
                          <span>GST Tax Total:</span>
                          <span className="font-semibold">+{formatINR(viewingOrder.gst_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-300 pt-2.5 bg-indigo-50/80 p-3 rounded-xl text-indigo-950 font-extrabold">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-indigo-600 block">Final Price Payable</span>
                            <span className="text-base font-extrabold text-indigo-900">{formatINR(viewingOrder.total_amount)}</span>
                          </div>
                          {viewingOrder.discount_amount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              Saved: {formatINR(viewingOrder.discount_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Configuration Modal */}
      {whatsappConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">WhatsApp Order Dispatch Config</h3>
                  <p className="text-xs text-slate-500">Configure 1-tap direct order sending</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWhatsappConfigModalOpen(false);
                  setPendingShareOrder(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWhatsAppConfig} className="p-5 space-y-4 pt-0">
              {pendingShareOrder && (
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-900 flex items-center justify-between">
                  <span>
                    Sending Order: <strong>{pendingShareOrder.order_number}</strong> (Dr. {pendingShareOrder.doctor?.doctor_name})
                  </span>
                  <span className="text-[10px] font-bold bg-indigo-200/80 px-2 py-0.5 rounded-full text-indigo-950">Pending Send</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Send Destination:
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTargetSendType('configured')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      targetSendType === 'configured'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${targetSendType === 'configured' ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      Fixed Dispatch No.
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Warehouse, distributor, stockist or agency
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetSendType('doctor')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      targetSendType === 'doctor'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${targetSendType === 'doctor' ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      Doctor's Phone
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Sends to doctor's mobile from doctor card
                    </span>
                  </button>
                </div>
              </div>

              {targetSendType === 'configured' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Default Dispatch WhatsApp Number</span>
                    <span className="text-[11px] font-normal text-slate-400">10-digit or with country code</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      value={tempWhatsAppNumber}
                      onChange={(e) => setTempWhatsAppNumber(e.target.value)}
                      placeholder="e.g. 9876543210 or 919876543210"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      autoFocus
                    />
                  </div>
                  {tempWhatsAppNumber.trim() && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✓ Direct link will target: <strong>{tempWhatsAppNumber.replace(/[^0-9]/g, '').length === 10 ? `+91 ${tempWhatsAppNumber.replace(/[^0-9]/g, '')}` : `+${tempWhatsAppNumber.replace(/[^0-9]/g, '')}`}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                💡 <strong>1-Tap Instant Sending:</strong> Once saved, clicking the <Send className="h-3 w-3 inline text-emerald-600 mx-0.5" /> <strong>Send</strong> button on any order will instantly open WhatsApp without asking you for a contact number again.
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  {dispatchWhatsAppNumber && (
                    <button
                      type="button"
                      onClick={handleClearWhatsAppConfig}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Clear Number
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappConfigModalOpen(false);
                      setPendingShareOrder(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={targetSendType === 'configured' && !tempWhatsAppNumber.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all"
                  >
                    <Check className="h-4 w-4" />
                    <span>{pendingShareOrder ? 'Save & Send Order' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Order Record?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete order <strong className="text-slate-800">{orderToDelete.order_number}</strong>? This will permanently remove all items and invoice history.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Doctor:</span>
                <span className="font-bold text-slate-900">{orderToDelete.doctor?.doctor_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Clinic:</span>
                <span className="font-semibold text-slate-700">{orderToDelete.doctor?.clinic_name || 'Clinic'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Order Date:</span>
                <span className="font-medium text-slate-700">{formatDate(orderToDelete.order_date)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                <span>Total Amount:</span>
                <span className="text-indigo-700 font-extrabold">{formatINR(orderToDelete.total_amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Copy Feedback Toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-3 pointer-events-none">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{copyToast}</span>
        </div>
      )}
    </div>
  );
};
