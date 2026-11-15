import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Order } from '../../types/order';
import { calculateMonthlySales, MonthSalesSummary } from '../../lib/monthlySales';
import { formatINR } from '../../lib/formatters';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  Table,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface MonthWiseSalesSectionProps {
  orders: Order[];
  className?: string;
  showTitle?: boolean;
}

export const MonthWiseSalesSection: React.FC<MonthWiseSalesSectionProps> = ({
  orders,
  className = '',
  showTitle = true,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');
  const analytics = calculateMonthlySales(orders);
  const { currentMonth, lastMonth, growthPercent, growthAmount, months, chartData } = analytics;

  // Filter months to display: show all months that have orders or are current/last month
  const displayMonths = months.filter((m) => m.ordersCount > 0 || m.isCurrentMonth || m.isLastMonth);

  return (
    <div className={`space-y-5 ${className}`}>
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span>Month-Wise Selling & Performance</span>
            </h2>
            <p className="text-xs text-slate-500">
              Live comparison of current month vs past month revenue and historical monthly performance.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Monthly Table</span>
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chart'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Trend Chart</span>
            </button>
          </div>
        </div>
      )}

      {/* 2 Big Hero Cards: Current Month Sell & Past Month Sell */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Month Sell */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Current Month Sell
              </span>
            </div>
            <span className="rounded-full bg-indigo-600 text-white px-2.5 py-0.5 text-[10px] font-extrabold shadow-2xs">
              {currentMonth.monthLabel}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(currentMonth.totalSales)}
            </div>

            {/* Growth pill comparison vs last month */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {growthPercent !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    growthPercent >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {growthPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {growthPercent >= 0 ? '+' : ''}
                    {growthPercent.toFixed(1)}% vs last month
                  </span>
                </span>
              )}
              <span className="text-[11px] text-slate-500 font-medium">
                {currentMonth.ordersCount} {currentMonth.ordersCount === 1 ? 'order' : 'orders'}
              </span>
            </div>
          </div>

          {/* Paid vs Pending Breakdown */}
          <div className="mt-4 pt-3 border-t border-indigo-100/80 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Paid: {formatINR(currentMonth.paidAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 justify-end">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Pending: {formatINR(currentMonth.pendingAmount)}</span>
            </div>
          </div>

          <div className="mt-3">
            <Link
              to={`/orders?month=${currentMonth.monthKey}`}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white py-2 text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <span>View Current Month Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Past Month Sell */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Past Month Sell
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold">
              {lastMonth.monthLabel}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatINR(lastMonth.totalSales)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                {lastMonth.ordersCount} {lastMonth.ordersCount === 1 ? 'order' : 'orders'}
              </span>
              <span>• {lastMonth.uniqueDoctorsCount} prescribers</span>
            </div>
          </div>

          {/* Paid vs Pending Breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Paid: {formatINR(lastMonth.paidAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 justify-end">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Pending: {formatINR(lastMonth.pendingAmount)}</span>
            </div>
          </div>

          <div className="mt-3">
            <Link
              to={`/orders?month=${lastMonth.monthKey}`}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              <span>View Past Month Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: MoM Difference / Growth */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Month-over-Month Change
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                growthAmount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {growthAmount >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>

          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                growthAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {growthAmount >= 0 ? '+' : ''}
              {formatINR(growthAmount)}
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-snug">
              {growthAmount >= 0
                ? 'Sales revenue increased this month compared to past month.'
                : 'Sales revenue is currently trailing last month.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Lifetime:</span>
            <span className="font-bold text-slate-800">{formatINR(analytics.allTimeSales)}</span>
          </div>
        </div>

        {/* Card 4: Current Collection Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Collection (This Month)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              {currentMonth.totalSales > 0 ? (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {Math.round((currentMonth.paidAmount / currentMonth.totalSales) * 100)}%
                  </div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((currentMonth.paidAmount / currentMonth.totalSales) * 100)
                        )}%`,
                      }}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((currentMonth.pendingAmount / currentMonth.totalSales) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-lg font-bold text-slate-400">No sales yet</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              ● Paid: {currentMonth.paidCount}
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              ● Pending: {currentMonth.pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Section Content: Table or Chart */}
      {activeTab === 'table' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Month-Wise Selling Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Detailed monthly performance records with payment status and order counts
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {displayMonths.length} {displayMonths.length === 1 ? 'Month Recorded' : 'Months Recorded'}
            </span>
          </div>

          {/* Mobile View: Clean, non-clipped card list */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {displayMonths.map((m) => (
              <div
                key={m.monthKey}
                className={`p-4 space-y-3 transition-colors ${
                  m.isCurrentMonth
                    ? 'bg-indigo-50/40'
                    : m.isLastMonth
                    ? 'bg-slate-50/50'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {m.monthLabel}
                      </span>
                      {m.isCurrentMonth && (
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[9px] font-extrabold border border-indigo-200">
                          Current Month
                        </span>
                      )}
                      {m.isLastMonth && (
                        <span className="rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 text-[9px] font-bold">
                          Past Month
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {m.ordersCount} {m.ordersCount === 1 ? 'Order' : 'Orders'} • {m.uniqueDoctorsCount} {m.uniqueDoctorsCount === 1 ? 'Doctor' : 'Doctors'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Selling</span>
                    <span className="text-base font-extrabold text-indigo-600">
                      {formatINR(m.totalSales)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/90 p-2.5 border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid Amount</span>
                    <span className="font-bold text-emerald-700">{formatINR(m.paidAmount)}</span>
                    {m.totalSales > 0 && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({Math.round((m.paidAmount / m.totalSales) * 100)}%)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Dues</span>
                    <span className={`font-bold ${m.pendingAmount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {m.pendingAmount > 0 ? formatINR(m.pendingAmount) : '₹0.00 (Cleared)'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/orders?month=${m.monthKey}`}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 py-2 text-xs font-semibold hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  <span>View Orders for {m.monthShort}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet View: Full Ledger Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Month & Year</th>
                  <th className="py-3 px-4">Total Selling</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Pending Dues</th>
                  <th className="py-3 px-4">Prescribers</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayMonths.map((m) => {
                  return (
                    <tr
                      key={m.monthKey}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        m.isCurrentMonth
                          ? 'bg-indigo-50/30 font-medium'
                          : m.isLastMonth
                          ? 'bg-slate-50/40'
                          : ''
                      }`}
                    >
                      {/* Month & Year */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {m.monthLabel}
                          </span>
                          {m.isCurrentMonth && (
                            <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-extrabold border border-indigo-200">
                              Current Month
                            </span>
                          )}
                          {m.isLastMonth && (
                            <span className="rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                              Past Month
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Selling */}
                      <td className="py-3.5 px-4 font-bold text-indigo-600">
                        {formatINR(m.totalSales)}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span>{m.ordersCount}</span>
                        </span>
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                        {formatINR(m.paidAmount)}
                        {m.totalSales > 0 && (
                          <span className="ml-1 text-[10px] font-normal text-slate-400">
                            ({Math.round((m.paidAmount / m.totalSales) * 100)}%)
                          </span>
                        )}
                      </td>

                      {/* Pending Dues */}
                      <td className="py-3.5 px-4 text-amber-700 font-semibold">
                        {m.pendingAmount > 0 ? (
                          formatINR(m.pendingAmount)
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">₹0.00 (All Paid)</span>
                        )}
                      </td>

                      {/* Unique Doctors */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          <span>{m.uniqueDoctorsCount} docs</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/orders?month=${m.monthKey}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-2xs"
                        >
                          <span>View Orders</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Trend Chart View */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-base">Monthly Revenue Trend</h3>
            <p className="text-xs text-slate-400">
              Visual comparison of Total Sales, Paid Collections, and Pending Dues month-by-month
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [formatINR(Number(value)), name]}
                  labelFormatter={(_label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullLabel || _label;
                  }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sales" name="Total Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Paid Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending Dues" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
