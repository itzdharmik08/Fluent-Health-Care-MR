import React from 'react';
import { Link } from 'react-router-dom';
import { useDoctors } from '../hooks/useDoctors';
import { useMedicines } from '../hooks/useMedicines';
import { useOrders } from '../hooks/useOrders';
import { formatINR, formatDate } from '../lib/formatters';
import { UserCheck, Pill, FileText, TrendingUp, Plus, Upload, ArrowUpRight, BellRing, ArrowRight } from 'lucide-react';
import { MonthWiseSalesSection } from '../components/analytics/MonthWiseSalesSection';

export const Dashboard: React.FC = () => {
  const { doctors, isLoading: loadingDocs } = useDoctors();
  const { medicines, isLoading: loadingMeds } = useMedicines();
  const { orders, isLoading: loadingOrders } = useOrders();

  const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.payment_status === 'pending').length;
  const recentOrders = orders.slice(0, 5);

  // 1-Month / 30-Day Overdue Payment calculation
  const overdueOrders = orders.filter((o) => {
    if (o.payment_status === 'paid' || !o.order_date) return false;
    const diffDays = Math.floor((Date.now() - new Date(o.order_date).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 30;
  });

  // Chart dataset for sales analytics
  const chartData = orders
    .slice(0, 7)
    .reverse()
    .map((o) => ({
      name: o.order_number,
      sales: o.total_amount,
    }));

  const isLoading = loadingDocs || loadingMeds || loadingOrders;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time medical representative metrics and distributor revenue analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/orders/new"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Order</span>
          </Link>
          <Link
            to="/import"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Upload className="h-4 w-4 text-slate-400" />
            <span>Import PDF</span>
          </Link>
        </div>
      </div>

      {/* 🚨 1-Month Overdue Payment Reminder Alert */}
      {overdueOrders.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0 shadow-sm">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 text-sm sm:text-base flex items-center gap-2">
                <span>1-Month Payment Reminder Alert</span>
                <span className="rounded-full bg-rose-200 text-rose-900 text-xs px-2 py-0.5 font-extrabold">
                  {overdueOrders.length} Overdue
                </span>
              </h3>
              <p className="text-xs text-rose-700">
                You have {overdueOrders.length} pending order(s) created 30+ days ago requiring payment follow-up.
              </p>
            </div>
          </div>

          <Link
            to="/orders?filter=overdue"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs shrink-0 transition-all"
          >
            <span>View & Send Reminders</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
            {isLoading ? '...' : formatINR(totalSales)}
          </div>
          <span className="text-[11px] font-medium text-emerald-600 mt-1 block">Live Supabase Cloud</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Doctors Network</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
            {isLoading ? '...' : doctors.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active Prescribers</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Medicines Catalog</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Pill className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
            {isLoading ? '...' : medicines.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Categorized Products</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Orders Processed</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
            {isLoading ? '...' : orders.length}
          </div>
          <span className="text-[11px] font-medium text-amber-600 mt-1 block">
            {pendingOrders} Pending Payments
          </span>
        </div>
      </div>

      {/* 📊 Month-Wise Selling & Analytics Section (Current Month vs Past Month) */}
      <MonthWiseSalesSection orders={orders} />

      {/* Recent Orders Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Recent Orders & Transactions</h2>
            <p className="text-xs text-slate-400">Latest doctor transactions and invoices</p>
          </div>
          <Link to="/orders" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
            <span>View All Orders</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center col-span-full">No recent orders found.</p>
          ) : (
            recentOrders.map((o) => {
              const isPaid = o.payment_status === 'paid';
              return (
                <div
                  key={o.id}
                  className={`flex items-center justify-between rounded-xl p-3 text-xs border-2 transition-colors ${
                    isPaid
                      ? 'bg-emerald-100/70 border-emerald-300 text-slate-900 shadow-2xs'
                      : 'bg-rose-100/70 border-rose-300 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{o.order_number}</span>
                      <span
                        className={`inline-block rounded-md px-1.5 py-0.2 text-[9px] font-extrabold border ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {o.doctor?.doctor_name || 'Doctor N/A'} • {formatDate(o.order_date)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-indigo-600">{formatINR(o.total_amount)}</div>
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isPaid ? 'PAID' : 'UNPAID'} ({o.payment_mode || 'Cash'})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <Link
            to="/orders/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Transaction Invoice</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
