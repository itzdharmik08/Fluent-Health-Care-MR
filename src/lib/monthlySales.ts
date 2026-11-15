import { Order } from '../types/order';

export interface MonthSalesSummary {
  monthKey: string; // "YYYY-MM" (e.g. "2026-11")
  year: number;
  monthIndex: number; // 0 to 11
  monthName: string; // "November"
  monthShort: string; // "Nov"
  monthLabel: string; // "November 2026"
  monthShortLabel: string; // "Nov 2026"
  isCurrentMonth: boolean;
  isLastMonth: boolean;
  totalSales: number;
  ordersCount: number;
  paidAmount: number;
  paidCount: number;
  pendingAmount: number;
  pendingCount: number;
  uniqueDoctorsCount: number;
  orders: Order[];
}

export interface MonthlySalesAnalytics {
  currentMonth: MonthSalesSummary;
  lastMonth: MonthSalesSummary;
  growthPercent: number | null; // percentage change compared to last month
  growthAmount: number; // currentMonth.totalSales - lastMonth.totalSales
  months: MonthSalesSummary[]; // all months that have orders (sorted newest to oldest)
  allTimeSales: number;
  allTimeOrdersCount: number;
  chartData: {
    monthKey: string;
    label: string; // "Nov 26"
    fullLabel: string; // "November 2026"
    sales: number;
    paid: number;
    pending: number;
    orders: number;
  }[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORTS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Parses an order date string and returns year and monthIndex (0-11).
 */
export function getOrderYearMonth(dateStr: string | null | undefined): { year: number; monthIndex: number; monthKey: string } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const monthIndex = d.getMonth();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return { year, monthIndex, monthKey };
}

/**
 * Creates an empty MonthSalesSummary template.
 */
function createEmptySummary(year: number, monthIndex: number, currentMonthKey: string, lastMonthKey: string): MonthSalesSummary {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const monthName = MONTH_NAMES[monthIndex] || '';
  const monthShort = MONTH_SHORTS[monthIndex] || '';

  return {
    monthKey,
    year,
    monthIndex,
    monthName,
    monthShort,
    monthLabel: `${monthName} ${year}`,
    monthShortLabel: `${monthShort} ${year}`,
    isCurrentMonth: monthKey === currentMonthKey,
    isLastMonth: monthKey === lastMonthKey,
    totalSales: 0,
    ordersCount: 0,
    paidAmount: 0,
    paidCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    uniqueDoctorsCount: 0,
    orders: [],
  };
}

/**
 * Calculates complete month-wise sales analytics from an array of Orders.
 */
export function calculateMonthlySales(orders: Order[], referenceDate: Date = new Date()): MonthlySalesAnalytics {
  const curYear = referenceDate.getFullYear();
  const curMonthIndex = referenceDate.getMonth();
  const currentMonthKey = `${curYear}-${String(curMonthIndex + 1).padStart(2, '0')}`;

  const lastMonthDate = new Date(curYear, curMonthIndex - 1, 1);
  const lastYear = lastMonthDate.getFullYear();
  const lastMonthIndex = lastMonthDate.getMonth();
  const lastMonthKey = `${lastYear}-${String(lastMonthIndex + 1).padStart(2, '0')}`;

  // Map to collect data for each month
  const monthMap = new Map<string, MonthSalesSummary>();

  // Ensure current month and last month always exist in the map
  monthMap.set(currentMonthKey, createEmptySummary(curYear, curMonthIndex, currentMonthKey, lastMonthKey));
  monthMap.set(lastMonthKey, createEmptySummary(lastYear, lastMonthIndex, currentMonthKey, lastMonthKey));

  let allTimeSales = 0;
  let allTimeOrdersCount = 0;

  for (const order of orders) {
    const ym = getOrderYearMonth(order.order_date);
    if (!ym) continue;

    const { year, monthIndex, monthKey } = ym;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, createEmptySummary(year, monthIndex, currentMonthKey, lastMonthKey));
    }

    const summary = monthMap.get(monthKey)!;
    const amount = Number(order.total_amount) || 0;

    summary.orders.push(order);
    summary.totalSales += amount;
    summary.ordersCount += 1;

    if (order.payment_status === 'paid') {
      summary.paidAmount += amount;
      summary.paidCount += 1;
    } else {
      summary.pendingAmount += amount;
      summary.pendingCount += 1;
    }

    allTimeSales += amount;
    allTimeOrdersCount += 1;
  }

  // Calculate unique doctors for each month
  for (const summary of monthMap.values()) {
    const docIds = new Set<string>();
    for (const o of summary.orders) {
      const docId = o.doctor_id || o.doctor?.id;
      if (docId) docIds.add(docId);
    }
    summary.uniqueDoctorsCount = docIds.size;
  }

  // Sort months newest first
  const allMonths = Array.from(monthMap.values()).sort((a, b) => {
    return b.monthKey.localeCompare(a.monthKey);
  });

  const currentMonth = monthMap.get(currentMonthKey)!;
  const lastMonth = monthMap.get(lastMonthKey)!;

  // Calculate growth percentage: (Current - Last) / Last * 100
  let growthPercent: number | null = null;
  const growthAmount = currentMonth.totalSales - lastMonth.totalSales;

  if (lastMonth.totalSales > 0) {
    growthPercent = ((currentMonth.totalSales - lastMonth.totalSales) / lastMonth.totalSales) * 100;
  } else if (currentMonth.totalSales > 0) {
    growthPercent = 100; // First month with sales
  } else {
    growthPercent = 0;
  }

  // Chart data: chronological order (oldest to newest), taking last 6 or 12 months
  // If fewer than 6 months recorded, backfill up to 6 months for clean visualization
  const chartMonthsMap = new Map<string, MonthSalesSummary>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(curYear, curMonthIndex - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    chartMonthsMap.set(key, monthMap.get(key) || createEmptySummary(y, m, currentMonthKey, lastMonthKey));
  }

  // Also include any older months that have real orders
  for (const [key, sum] of monthMap.entries()) {
    if (sum.ordersCount > 0 && !chartMonthsMap.has(key)) {
      chartMonthsMap.set(key, sum);
    }
  }

  const chartMonths = Array.from(chartMonthsMap.values()).sort((a, b) => {
    return a.monthKey.localeCompare(b.monthKey);
  });

  const chartData = chartMonths.map((m) => {
    const shortYear = String(m.year).slice(-2);
    return {
      monthKey: m.monthKey,
      label: `${m.monthShort} '${shortYear}`,
      fullLabel: m.monthLabel,
      sales: Math.round(m.totalSales),
      paid: Math.round(m.paidAmount),
      pending: Math.round(m.pendingAmount),
      orders: m.ordersCount,
    };
  });

  return {
    currentMonth,
    lastMonth,
    growthPercent,
    growthAmount,
    months: allMonths,
    allTimeSales,
    allTimeOrdersCount,
    chartData,
  };
}
