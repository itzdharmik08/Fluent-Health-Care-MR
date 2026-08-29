import React from 'react';
import { Link } from 'react-router-dom';
import { useDoctors } from '../hooks/useDoctors';
import { useMedicines } from '../hooks/useMedicines';
import { useOrders } from '../hooks/useOrders';
import { formatINR, formatDate } from '../lib/formatters';
import { UserCheck, Pill, FileText, TrendingUp, Plus, Upload, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const { doctors, isLoading: loadingDocs } = useDoctors();
  const { medicines, isLoading: loadingMeds } = useMedicines();
  const { orders, isLoading: loadingOrders } = useOrders();

  const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.payment_status === 'pending').length;
  const recentOrders = orders.slice(0, 5);

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

      {/* Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Sales Revenue Trend</h2>
              <p className="text-xs text-slate-400">Order revenue progression across transactions</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No orders recorded yet to render chart analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [formatINR(Number(val)), 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Orders Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-base">Recent Orders</h2>
              <Link to="/orders" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No recent orders found.</p>
              ) : (
                recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{o.order_number}</div>
                      <div className="text-[11px] text-slate-500">
                        {o.doctor?.doctor_name || 'Doctor N/A'} • {formatDate(o.order_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-600">{formatINR(o.total_amount)}</div>
                      <span
                        className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          o.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {o.payment_status.toUpperCase()} ({o.payment_mode || 'Cash'})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              to="/orders/new"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Transaction Invoice</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
