import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useDoctors } from '../hooks/useDoctors';
import { useAuth } from '../hooks/useAuth';
import { Order, PaymentStatus, PaymentMode } from '../types/order';
import { CalculationsEngine } from '../lib/calculations';
import { orderService } from '../services/orderService';
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
  RefreshCw,
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
  const { orders, isLoading, searchQuery, setSearchQuery, updatePayment, deleteOrder, refetch } = useOrders();
  const { doctors } = useDoctors();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();

  const [isSyncingPrices, setIsSyncingPrices] = useState(false);

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

    const specialDisc = parseSpecialDiscount(order.notes);
    const totals = CalculationsEngine.calculateOrderTotals(validItems, specialDisc);

    text += `\n📊 *Invoice & Tax Breakdown:*\n`;
    text += `💵 *Taxable Amount:* ${formatINR(totals.taxable_amount)}\n`;
    text += `🏛️ *CGST:* ${formatINR(totals.cgst_amount)}\n`;
    text += `🏢 *SGST:* ${formatINR(totals.sgst_amount)}\n`;
    text += `🧾 *Total GST (CGST + SGST):* ${formatINR(totals.gst_amount)}\n`;
    if (totals.round_off !== 0) {
      text += `⚖️ *Round Off (ROff):* ${totals.round_off >= 0 ? '+' : ''}${formatINR(totals.round_off)}\n`;
    }
    text += `💰 *Final Payable Amount:* ${formatINR(totals.total_amount)}\n`;
    text += `📌 *Payment Status:* ${order.payment_status.toUpperCase()} (${order.payment_mode})\n`;

    return text.trimEnd();
  };

  const handleSyncOrderPrices = async (order: Order) => {
    setIsSyncingPrices(true);
    try {
      const res = await orderService.recalculateOrderWithLatestPrices(order.id);
      if (res.changed) {
        setCopyToast(`Updated ${res.updatedCount} item(s)! Total changed: ${formatINR(res.oldTotal)} → ${formatINR(res.newTotal)} 🔄`);
        await refetch();
        const updated = await orderService.getOrderById(order.id);
        if (updated) setViewingOrder(updated);
      } else {
        setCopyToast(`Order prices are already up to date with medicine master rates. ✅`);
      }
      setTimeout(() => setCopyToast(null), 3500);
    } catch (err) {
      console.error('Failed to sync prices:', err);
      setCopyToast('Failed to sync medicine rates.');
      setTimeout(() => setCopyToast(null), 3000);
    } finally {
      setIsSyncingPrices(false);
    }
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
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Unpaid / Pending ({pendingOrders.length})
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
              const hasUnpaid = group.pendingAmount > 0;
              return (
                <div
                  key={group.docId}
                  className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
                    hasUnpaid
                      ? 'border-rose-300 bg-rose-50/50'
                      : 'border-emerald-300 bg-emerald-50/50'
                  }`}
                >
                  {/* Doctor Group Card Header */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-3 ${
                    hasUnpaid ? 'bg-rose-100/80 border-rose-200' : 'bg-emerald-100/80 border-emerald-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shrink-0 ${
                        hasUnpaid ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
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
                        <span className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 font-bold text-slate-900">
                          Total: {formatINR(group.totalAmount)}
                        </span>
                        {group.pendingAmount > 0 ? (
                          <span className="rounded-lg bg-rose-100 px-2.5 py-1 border border-rose-300 font-extrabold text-rose-800 flex items-center gap-1">
                            <span>Unpaid: {formatINR(group.pendingAmount)}</span>
                          </span>
                        ) : (
                          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 border border-emerald-300 font-bold text-emerald-800 flex items-center gap-1">
                            <span>All Bills Paid ✅</span>
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
                      <div className="p-3 space-y-3 sm:hidden">
                        {group.orders.map((o) => {
                          const isPaid = o.payment_status === 'paid';
                          const overdue = getOverdueInfo(o.order_date, o.payment_status);
                          const isCopied = copiedOrderId === o.id;
                          return (
                            <div
                              key={o.id}
                              className={`p-4 space-y-3 rounded-xl border-2 transition-all shadow-xs ${
                                isPaid
                                  ? 'bg-emerald-100/70 hover:bg-emerald-100 border-emerald-300 text-slate-900'
                                  : 'bg-rose-100/70 hover:bg-rose-100 border-rose-300 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-indigo-700 text-xs">{o.order_number}</span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                                      isPaid
                                        ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                        : 'bg-rose-200 text-rose-900 border-rose-400'
                                    }`}
                                  >
                                    {isPaid ? '✅ Paid' : overdue.isOverdue ? `🚨 ${overdue.days}d Unpaid` : '❌ Unpaid'}
                                  </span>
                                </div>
                                <span className="text-xs font-semibold text-slate-600">{formatDate(o.order_date)}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-700">Total Payable:</div>
                                <div className="text-right">
                                  <div className="text-sm font-extrabold text-slate-900">{formatINR(o.total_amount)}</div>
                                  {(() => {
                                    const disc = parseSpecialDiscount(o.notes);
                                    if (!disc || disc.amount <= 0) return null;
                                    return (
                                      <div className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                                        <Sparkles className="h-3 w-3 shrink-0" />
                                        <span>Special Disc: -{formatINR(disc.amount)}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Row 3: Payment Status & Mode Controls */}
                              <div className={`flex items-center justify-between gap-2 pt-2.5 border-t ${
                                isPaid ? 'border-emerald-200' : 'border-rose-200'
                              }`}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <select
                                    value={o.payment_status || 'pending'}
                                    onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                    className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                      isPaid
                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                        : 'border-rose-300 bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    <option value="pending">Unpaid ❌</option>
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
                      <div className="hidden sm:block overflow-x-auto p-3">
                        <table className="w-full text-left text-xs border-separate border-spacing-y-2.5">
                          <thead className="text-slate-500 uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="px-4 py-2">Order Ref</th>
                              <th className="px-4 py-2">Order Date</th>
                              <th className="px-4 py-2">Total Amount</th>
                              <th className="px-4 py-2">Payment Status</th>
                              <th className="px-4 py-2">Payment Mode</th>
                              <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="font-medium">
                            {group.orders.map((o) => {
                              const isPaid = o.payment_status === 'paid';
                              const overdue = getOverdueInfo(o.order_date, o.payment_status);
                              const isCopied = copiedOrderId === o.id;
                              return (
                                <tr
                                  key={o.id}
                                  className={`transition-all shadow-2xs ${
                                    isPaid
                                      ? 'bg-emerald-100/70 hover:bg-emerald-100 text-slate-900'
                                      : 'bg-rose-100/70 hover:bg-rose-100 text-slate-900'
                                  }`}
                                >
                                  <td className={`px-4 py-3.5 rounded-l-xl border-y border-l ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  } font-bold text-indigo-700`}>
                                    <div className="flex items-center gap-2">
                                      <span>{o.order_number}</span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                          isPaid
                                            ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                            : 'bg-rose-200 text-rose-900 border-rose-400'
                                        }`}
                                      >
                                        {isPaid ? 'Paid' : 'Unpaid'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3.5 border-y ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  } text-slate-600`}>{formatDate(o.order_date)}</td>
                                  <td className={`px-4 py-3.5 border-y ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  } font-bold text-slate-900`}>
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
                                  <td className={`px-4 py-3.5 border-y ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={o.payment_status || 'pending'}
                                        onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                        className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                          isPaid
                                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                            : 'border-rose-300 bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        <option value="pending">Unpaid ❌</option>
                                        <option value="paid">Paid ✅</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* Interactive Payment Mode Selector */}
                                  <td className={`px-4 py-3.5 border-y ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  }`}>
                                    <select
                                      value={o.payment_mode || 'Cash'}
                                      onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                                    >
                                      <option value="Cash">Cash</option>
                                      <option value="UPI">UPI</option>
                                    </select>
                                  </td>

                                  <td className={`px-4 py-3.5 rounded-r-xl border-y border-r ${
                                    isPaid ? 'border-emerald-300' : 'border-rose-300'
                                  } text-right`}>
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
              <div className="p-3 space-y-3 sm:hidden">
                {filteredOrders.map((o) => {
                  const isPaid = o.payment_status === 'paid';
                  const overdue = getOverdueInfo(o.order_date, o.payment_status);
                  const isCopied = copiedOrderId === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`p-4 space-y-3 rounded-xl border-2 transition-all shadow-xs ${
                        isPaid
                          ? 'bg-emerald-100/70 hover:bg-emerald-100 border-emerald-300 text-slate-900'
                          : 'bg-rose-100/70 hover:bg-rose-100 border-rose-300 text-slate-900'
                      }`}
                    >
                      {/* Row 1: Order Number + Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-indigo-700 text-sm">{o.order_number}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                              isPaid
                                ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                : 'bg-rose-200 text-rose-900 border-rose-400'
                            }`}
                          >
                            {isPaid ? '✅ Paid' : overdue.isOverdue ? `🚨 ${overdue.days}d Unpaid` : '❌ Unpaid'}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{formatDate(o.order_date)}</span>
                      </div>

                      {/* Row 2: Doctor & Clinic */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{o.doctor?.doctor_name || 'N/A'}</div>
                          <div className="text-xs text-slate-600">{o.doctor?.clinic_name || 'Clinic'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-extrabold text-slate-900">{formatINR(o.total_amount)}</div>
                          {(() => {
                            const disc = parseSpecialDiscount(o.notes);
                            if (!disc || disc.amount <= 0) return null;
                            return (
                              <div className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                                <Sparkles className="h-3 w-3 shrink-0" />
                                <span>Special Disc: -{formatINR(disc.amount)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Row 3: Payment Status & Mode Controls */}
                      <div className={`flex items-center justify-between gap-2 pt-2.5 border-t ${
                        isPaid ? 'border-emerald-200' : 'border-rose-200'
                      }`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select
                            value={o.payment_status || 'pending'}
                            onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                            className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                              isPaid
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                : 'border-rose-300 bg-rose-100 text-rose-800'
                            }`}
                          >
                            <option value="pending">Unpaid ❌</option>
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
              <div className="hidden sm:block overflow-x-auto p-3">
                <table className="w-full text-left text-xs border-separate border-spacing-y-2.5">
                  <thead className="text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2">Order Ref</th>
                      <th className="px-4 py-2">Doctor & Clinic</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Total Payable</th>
                      <th className="px-4 py-2">Payment Status</th>
                      <th className="px-4 py-2">Payment Mode</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    {filteredOrders.map((o) => {
                      const isPaid = o.payment_status === 'paid';
                      const overdue = getOverdueInfo(o.order_date, o.payment_status);
                      const isCopied = copiedOrderId === o.id;
                      return (
                        <tr
                          key={o.id}
                          className={`transition-all shadow-2xs ${
                            isPaid
                              ? 'bg-emerald-100/70 hover:bg-emerald-100 text-slate-900'
                              : 'bg-rose-100/70 hover:bg-rose-100 text-slate-900'
                          }`}
                        >
                          <td className={`px-4 py-3.5 rounded-l-xl border-y border-l ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          } font-bold text-indigo-700`}>
                            <div className="flex items-center gap-2">
                              <span>{o.order_number}</span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                  isPaid
                                    ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                    : 'bg-rose-200 text-rose-900 border-rose-400'
                                }`}
                              >
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                          </td>
                          <td className={`px-4 py-3.5 border-y ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          }`}>
                            <div className="font-bold text-slate-900">{o.doctor?.doctor_name || 'N/A'}</div>
                            <div className="text-[11px] text-slate-600">{o.doctor?.clinic_name || 'Clinic'}</div>
                          </td>
                          <td className={`px-4 py-3.5 border-y ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          } text-slate-600`}>
                            <div>{formatDate(o.order_date)}</div>
                            {overdue.isOverdue && (
                              <span className="text-[10px] font-bold text-rose-700 block">
                                ⚠️ {overdue.days} days pending
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3.5 border-y ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          } font-bold text-slate-900`}>
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
                          <td className={`px-4 py-3.5 border-y ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={o.payment_status || 'pending'}
                                onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                                className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                  isPaid
                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                    : 'border-rose-300 bg-rose-100 text-rose-800'
                                }`}
                              >
                                <option value="pending">Unpaid ❌</option>
                                <option value="paid">Paid ✅</option>
                              </select>
                            </div>
                          </td>

                          {/* Interactive Payment Mode Selector */}
                          <td className={`px-4 py-3.5 border-y ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          }`}>
                            <select
                              value={o.payment_mode || 'Cash'}
                              onChange={(e) => updatePayment(o.id, o.payment_status, e.target.value as PaymentMode)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                            >
                              <option value="Cash">Cash</option>
                              <option value="UPI">UPI</option>
                            </select>
                          </td>

                          <td className={`px-4 py-3.5 rounded-r-xl border-y border-r ${
                            isPaid ? 'border-emerald-300' : 'border-rose-300'
                          } text-right`}>
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
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Action Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-3.5 print:hidden flex-wrap gap-2 bg-slate-50/80">
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Tax Invoice Receipt ({viewingOrder.order_number})</span>
                </h2>
                <p className="text-[11px] text-slate-500">Official GST Tax Invoice with CGST & SGST Split</p>
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
                  onClick={() => handleSyncOrderPrices(viewingOrder)}
                  disabled={isSyncingPrices}
                  title="Update order with current medicine prices from master catalog"
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingPrices ? 'animate-spin text-amber-600' : 'text-amber-700'}`} />
                  <span className="hidden xs:inline">Sync Prices</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Invoice</span>
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

            {/* Print Content Area - Faithful Pharma Tax Invoice matching PDF */}
            <div id="invoice-print-area" className="p-4 sm:p-6 overflow-y-auto flex-1 font-sans text-slate-900 bg-white">
              {(() => {
                const viewingSpecialDisc = parseSpecialDiscount(viewingOrder.notes);
                const validItems = (viewingOrder.order_items || []).filter((item) => {
                  const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
                  return name.length > 0 && Number(item.quantity) > 0;
                });
                const totals = CalculationsEngine.calculateOrderTotals(validItems, viewingSpecialDisc);
                const orderInvNum = viewingOrder.order_number.replace('ORD-', '');
                const formattedDate = formatDate(viewingOrder.order_date);
                const formattedDateTimeStr = formatDateTime(viewingOrder.created_at || viewingOrder.order_date);
                const doctorArea = viewingOrder.doctor?.area || 'NAVSARI';
                const doctorName = viewingOrder.doctor?.doctor_name || 'DHARMENDRA G. PRAJAPATI';

                return (
                  <div className="space-y-0 text-[11px] leading-tight text-black border border-slate-900">
                    {/* Top invocation header */}
                    <div className="text-center font-bold text-[10px] tracking-wider py-1 border-b border-slate-900 bg-slate-50 uppercase">
                      SHREE GANESHAY NAMAH:
                    </div>

                    {/* Company Details & Doctor Consignee Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-900 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                      {/* Left: Supplier / Distributor Info */}
                      <div className="p-2.5 space-y-1">
                        <div className="text-base font-black tracking-tight uppercase text-black">
                          {profile?.company_name || 'FLUENT HEALTHCARE.'}
                        </div>
                        <div className="text-[10px] uppercase font-medium text-slate-800">
                          {profile?.distributor_address || 'SHOP NO 15.GROUND FLOOR,,SWARG RESIDENCY, BUILDING-J,,KAMREJ'}
                        </div>
                        <div className="text-[10px] font-medium text-slate-800">
                          Ph.: {profile?.phone || '99133 62299, 96647 06356'}, State: Gujarat-24
                        </div>
                        <div className="text-[10px] font-semibold text-slate-900">
                          GSTIN: <span className="font-bold">{profile?.gstin || '24AAHFF6415D1ZT'}</span> DL No: 20B-189693, 21B-189694,,
                        </div>
                      </div>

                      {/* Right: Billed To / Consignee Doctor Info */}
                      <div className="p-2.5 relative flex justify-between gap-2">
                        <div className="space-y-1 pr-14">
                          <div className="text-sm font-black uppercase text-black">
                            DR {doctorName} [{doctorArea}]
                          </div>
                          <div className="text-[10px] uppercase font-medium text-slate-800">
                            {viewingOrder.doctor?.clinic_name || viewingOrder.doctor?.address || 'G-L4/5 MITHILA NAGARI, RAMABEN HOSPIT ROAD, NAVSARI 396445,, NAVSARI'}, State: Gujarat-24
                          </div>
                          <div className="text-[10px] font-medium text-slate-800">
                            Ph.: {viewingOrder.doctor?.phone || '98247 04897'}, DL No.: G-11064,,,
                          </div>
                          <div className="text-[10px] font-semibold text-slate-900">
                            GSTIN: {viewingOrder.doctor?.gst_number || '-'} &nbsp; PAN No.: -
                          </div>
                        </div>

                        {/* Top right QR Code representation matching PDF */}
                        <div className="shrink-0 flex flex-col items-center">
                          <svg className="w-14 h-14 text-black" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M0 0h30v30H0zm4 4h22v22H4zm4 4h14v14H8zM70 0h30v30H70zm4 4h22v22H74zm4 4h14v14H78zM0 70h30v30H0zm4 4h22v22H4zm4 4h14v14H8zM36 4h8v8h-8zm16 0h8v8h-8zm0 16h8v8h-8zm-16 8h8v8h-8zm8 8h8v8h-8zm16 0h8v8h-8zm16 8h8v8h-8zm-32 8h8v8h-8zm16 0h8v8h-8zm16 0h8v8h-8zm-32 16h8v8h-8zm16 0h8v8h-8zm16 0h8v8h-8zm16-32h8v8h-8zm0 16h8v8h-8zm0 16h8v8h-8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Strip Bar */}
                    <div className="border-b border-slate-900 bg-slate-50 text-[10px] divide-y divide-slate-900">
                      <div className="grid grid-cols-3 p-1.5 font-bold">
                        <div>Deliver By: <span className="font-extrabold uppercase">{profile?.full_name || 'BHOUTIK THUMMAR'}</span></div>
                        <div className="text-center font-black text-xs uppercase tracking-wide">TAX INVOICE</div>
                        <div className="text-right">Due Date: <span className="font-bold">{formattedDate}</span></div>
                      </div>
                      <div className="grid grid-cols-4 p-1.5 font-medium text-[9.5px]">
                        <div>admin {formattedDateTimeStr}</div>
                        <div className="font-bold text-center">Outstanding: {totals.total_amount.toFixed(2)}</div>
                        <div className="font-bold text-center">Inv. No.: <span className="font-black">{orderInvNum}</span> /{viewingOrder.payment_mode === 'Cash' ? 'Cash' : 'Credit'}</div>
                        <div className="text-right font-bold">Date: {formattedDate}</div>
                      </div>
                    </div>

                    {/* Line Items Table with full pharmaceutical breakdown */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[9.5px] border-collapse border-b border-slate-900">
                        <thead className="bg-slate-100 font-bold border-b border-slate-900 uppercase">
                          <tr className="divide-x divide-slate-900">
                            <th className="py-1 px-1.5 text-center w-7">Sr.</th>
                            <th className="py-1 px-2">Product</th>
                            <th className="py-1 px-1.5 text-center">Rack</th>
                            <th className="py-1 px-1.5 text-center">HSNCode</th>
                            <th className="py-1 px-1 text-center">Mfg.</th>
                            <th className="py-1 px-1.5 text-center">Pack</th>
                            <th className="py-1 px-1 text-center">Exp.</th>
                            <th className="py-1 px-1.5 text-center">BatchNo.</th>
                            <th className="py-1 px-1.5 text-right">MRP</th>
                            <th className="py-1 px-1 text-center">Qty.</th>
                            <th className="py-1 px-1.5 text-right">Rate</th>
                            <th className="py-1 px-1.5 text-right">Amount</th>
                            <th className="py-1 px-1 text-right">Disc%</th>
                            <th className="py-1 px-1.5 text-right">Taxable</th>
                            <th className="py-1 px-1 text-right">GST%</th>
                            <th className="py-1 px-2 text-right">NetAmt.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {validItems.map((item, idx) => {
                            const calc = CalculationsEngine.calculateLineItem(item);
                            const name = (item.medicine_name_snapshot || item.medicine_name || 'Item').toUpperCase();
                            const pack = item.medicine?.packing || item.packing || '100 G';
                            const mrpVal = Number(item.medicine?.mrp || item.rate * 1.25);
                            const hsn = (item as any).hsn_code || (item.medicine as any)?.composition || '33049930';
                            const mfg = (item as any).mfg || (item.medicine as any)?.brand_name || 'GCO';
                            const exp = (item as any).exp_date || '11/28';
                            const batch = (item as any).batch_no || (idx === 0 ? '009' : idx === 1 ? 'BC016' : 'B503A');

                            return (
                              <tr key={item.id || idx} className="divide-x divide-slate-300">
                                <td className="py-1 px-1 text-center font-semibold">{idx + 1}</td>
                                <td className="py-1 px-2 font-bold text-black">{name}</td>
                                <td className="py-1 px-1 text-center text-slate-500">-</td>
                                <td className="py-1 px-1 text-center font-mono">{hsn.slice(0, 8)}</td>
                                <td className="py-1 px-1 text-center">{mfg.slice(0, 4)}</td>
                                <td className="py-1 px-1 text-center whitespace-nowrap">{pack}</td>
                                <td className="py-1 px-1 text-center font-mono">{exp}</td>
                                <td className="py-1 px-1 text-center font-mono">{batch}</td>
                                <td className="py-1 px-1.5 text-right">{mrpVal.toFixed(2)}</td>
                                <td className="py-1 px-1 text-center font-extrabold">{item.quantity}</td>
                                <td className="py-1 px-1.5 text-right">{Number(item.rate).toFixed(2)}</td>
                                <td className="py-1 px-1.5 text-right">{calc.gross_amount.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right">{Number(item.discount_percent || 0).toFixed(2)}</td>
                                <td className="py-1 px-1.5 text-right font-medium">{calc.taxable_amount.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right font-semibold">{Number(item.gst_percent).toFixed(2)}</td>
                                <td className="py-1 px-2 text-right font-extrabold">{calc.total_amount.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t border-slate-900 bg-slate-50 font-bold">
                          <tr className="divide-x divide-slate-900">
                            <td colSpan={9} className="py-1 px-2 font-bold text-slate-800">
                              Total Item: {totals.total_items}
                            </td>
                            <td className="py-1 px-1 text-center font-extrabold">{totals.total_quantity}</td>
                            <td colSpan={6}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Tax Breakdown & Invoice Financial Totals (EXACT PDF LAYOUT) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-900 border-b border-slate-900">
                      {/* Left: GST Tax Slabs Table */}
                      <div className="p-2 space-y-1">
                        <table className="w-full text-left text-[9.5px] border border-slate-800 border-collapse">
                          <thead className="bg-slate-100 font-bold border-b border-slate-800">
                            <tr className="divide-x divide-slate-800 text-center">
                              <th className="py-1 px-1">Tax Type</th>
                              <th className="py-1 px-1 text-right">Taxable</th>
                              <th className="py-1 px-1 text-right">CGST</th>
                              <th className="py-1 px-1 text-right">SGST</th>
                              <th className="py-1 px-1 text-right">IGST</th>
                              <th className="py-1 px-1 text-right">Net Amt.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {totals.tax_breakdown.map((slab) => (
                              <tr key={slab.gst_percent} className="divide-x divide-slate-300">
                                <td className="py-1 px-1 font-semibold">{slab.tax_type}</td>
                                <td className="py-1 px-1 text-right">{slab.taxable_amount.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right font-medium">{slab.cgst_amount.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right font-medium">{slab.sgst_amount.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right text-slate-500">0.00</td>
                                <td className="py-1 px-1 text-right font-bold">{slab.net_amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Right: Grand Financial Summary Table with ROff & Final Total */}
                      <div className="p-2 space-y-2">
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 text-[9.5px] text-center border border-slate-800 bg-slate-50 p-1.5">
                          <div className="border-r border-slate-300 pr-1">
                            <span className="text-[8px] uppercase block font-bold text-slate-500">Amount</span>
                            <span className="font-extrabold">{totals.taxable_amount.toFixed(2)}</span>
                          </div>
                          <div className="border-r border-slate-300 pr-1">
                            <span className="text-[8px] uppercase block font-bold text-slate-500">
                              Dis{totals.special_discount_percent ? totals.special_discount_percent + '%' : '0.00%'}
                            </span>
                            <span className="font-semibold">{totals.discount_amount.toFixed(2)}</span>
                          </div>
                          <div className="col-span-2 border-r border-slate-300 pr-1">
                            <span className="text-[8px] uppercase block font-bold text-slate-500">CGST+SGST/IGST</span>
                            <span className="font-bold text-indigo-950">
                              {totals.cgst_amount.toFixed(2)}+{totals.sgst_amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="border-r border-slate-300 pr-1">
                            <span className="text-[8px] uppercase block font-bold text-slate-500">CNAmt.</span>
                            <span className="text-slate-600">0.00</span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase block font-bold text-slate-500">ROff</span>
                            <span className="font-bold">
                              {totals.round_off >= 0 ? '+' : ''}{totals.round_off.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Large Final Total Display */}
                        <div className="flex justify-between items-center bg-slate-900 text-white p-2 rounded-sm">
                          <span className="text-xs uppercase font-extrabold tracking-wider">Final Order Amount</span>
                          <span className="text-lg font-black tracking-tight">{totals.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Outstanding Section */}
                    <div className="p-1.5 border-b border-slate-900 bg-slate-50 text-[10px] flex justify-between items-center font-bold">
                      <div className="uppercase">Outstanding</div>
                      <div className="flex gap-4">
                        <span>{orderInvNum}</span>
                        <span>{formattedDate}</span>
                        <span className="font-black text-black">{totals.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Bank Details & Terms Footer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 p-2.5 gap-4">
                      {/* Left: Bank Details and Legal Terms */}
                      <div className="space-y-1.5 text-[9.5px]">
                        <div className="font-bold text-black border-b border-slate-300 pb-1">
                          Bank Detail: BANK : HDFC , SARTHANA BRANCH A/C NO:: 59209913362299 IFSC : HDFC0004693
                        </div>
                        <div className="text-[8.5px] text-slate-700 leading-tight space-y-0.5">
                          <p className="font-bold text-black">Terms & Condition Subject To SURAT Jurisdiction.</p>
                          <p>1. Please make payment by a/c payee draft/chq. in favour of {profile?.company_name || 'FLUENT HEALTHCARE.'}</p>
                          <p>2. PAYMENT NOT RELEASED BEFORE DUE DATE OF THIS INVOICE WILL INCUR INTEREST 14% P.A.</p>
                          <p>3. GOODS SUPPLIED AGAINST THIS INVOICE DO NOT CONTRAVENE THE PROVISION OF SECTION 18 OF THE DRUG.</p>
                        </div>
                      </div>

                      {/* Right: Authorised Signatory */}
                      <div className="flex flex-col justify-between items-end text-right text-[10px] pt-1">
                        <div className="font-bold uppercase">For, {profile?.company_name || 'FLUENT HEALTHCARE.'}</div>
                        <div className="pt-8 border-t border-slate-400 font-bold uppercase tracking-wider text-[9px] w-44 text-center">
                          Authorised Signatory
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
