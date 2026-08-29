import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Order, PaymentStatus, PaymentMode } from '../types/order';
import { formatINR, formatDate, formatDateTime } from '../lib/formatters';
import { Plus, Search, FileText, Printer, CheckCircle, Clock, Eye, X } from 'lucide-react';

export const Orders: React.FC = () => {
  const { orders, isLoading, searchQuery, setSearchQuery, updatePayment } = useOrders();
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Orders & Invoices</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            View transaction history, track payment settlements, and print doctor invoice receipts.
          </p>
        </div>

        <Link
          to="/orders/new"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Order</span>
        </Link>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order number or doctor name..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Orders Table Container */}
      {isLoading ? (
        <div className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">No Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? `No order matching "${searchQuery}".` : 'Start creating your first order for prescribing doctors.'}
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
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
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-indigo-600">{o.order_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{o.doctor?.doctor_name || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400">{o.doctor?.clinic_name || 'Clinic'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(o.order_date)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatINR(o.total_amount)}</td>

                    {/* Interactive Payment Status Selector */}
                    <td className="px-4 py-3">
                      <select
                        value={o.payment_status || 'pending'}
                        onChange={(e) => updatePayment(o.id, e.target.value as PaymentStatus, o.payment_mode)}
                        className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                          o.payment_status === 'paid'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        <option value="pending">Pending ⏳</option>
                        <option value="paid">Paid ✅</option>
                      </select>
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
                      <button
                        onClick={() => setViewingOrder(o)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                        <span>View Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 print:hidden">
              <h2 className="font-bold text-slate-900 text-base">Invoice Receipt ({viewingOrder.order_number})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
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
                  <div className="text-slate-600">{viewingOrder.doctor?.clinic_name || 'Clinic'}</div>
                  <div className="text-slate-500">GST: {viewingOrder.doctor?.gst_number || 'N/A'}</div>
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
                      <td className="py-2 font-semibold text-slate-900">{item.medicine_name_snapshot}</td>
                      <td className="py-2 text-center font-bold">{item.quantity}</td>
                      <td className="py-2 text-right">{formatINR(item.rate)}</td>
                      <td className="py-2 text-right">{item.discount_percent}%</td>
                      <td className="py-2 text-right">{item.gst_percent}%</td>
                      <td className="py-2 text-right font-bold">{formatINR(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Invoice Totals */}
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span>{formatINR(viewingOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatINR(viewingOrder.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>GST Tax:</span>
                    <span>+{formatINR(viewingOrder.gst_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-indigo-700">
                    <span>Total Amount Payable:</span>
                    <span>{formatINR(viewingOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
