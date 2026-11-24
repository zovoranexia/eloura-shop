import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { addDays, diliDay, diliDayStart, TZ } from '@/lib/time';
import { loc } from '@/lib/i18n';
import { getSetting } from './settings';

// Timestamps are stored as naive UTC; convert to the Dili wall clock before bucketing into days / months.
const dili = (col: string) => Prisma.raw(`(("${col}" AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')`);

const num = (v: unknown) => Number(v ?? 0);

export async function dashboard(locale: 'tet' | 'pt' | 'en' | 'id' = 'en') {
  const today = diliDay();
  const from14 = addDays(today, -13);
  const threshold = (await getSetting('commerce')).lowStockThreshold;

  const [daily, ordersDaily, monthly, byStatus, byMethod, counts, low, topRows, codCash] = await Promise.all([
    prisma.$queryRaw<{ d: string; revenue: bigint }[]>`
      SELECT to_char(${dili('paidAt')}, 'YYYY-MM-DD') AS d, COALESCE(SUM("totalCents"),0)::bigint AS revenue
        FROM "Order" WHERE "paymentStatus" = 'PAID' AND "status" <> 'CANCELLED' AND "paidAt" >= ${diliDayStart(from14)} GROUP BY 1`,
    prisma.$queryRaw<{ d: string; n: number }[]>`
      SELECT to_char(${dili('createdAt')}, 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
        FROM "Order" WHERE "status" <> 'CANCELLED' AND "createdAt" >= ${diliDayStart(from14)} GROUP BY 1`,
    prisma.$queryRaw<{ m: string; revenue: bigint; n: number }[]>`
      SELECT to_char(${dili('paidAt')}, 'YYYY-MM') AS m, COALESCE(SUM("totalCents"),0)::bigint AS revenue, COUNT(*)::int AS n
        FROM "Order" WHERE "paymentStatus" = 'PAID' AND "status" <> 'CANCELLED' AND "paidAt" >= ${diliDayStart(addDays(today, -180))} GROUP BY 1 ORDER BY 1`,
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.$queryRaw<{ method: string; n: number; revenue: bigint }[]>`
      SELECT "paymentMethod"::text AS method, COUNT(*)::int AS n,
             COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' THEN "totalCents" ELSE 0 END),0)::bigint AS revenue
        FROM "Order" WHERE "status" <> 'CANCELLED' GROUP BY 1`,
    Promise.all([
      prisma.order.count({ where: { status: 'AWAITING_VERIFICATION' } }),
      prisma.order.count({ where: { status: 'PENDING_CONFIRMATION' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { paymentStatus: 'REFUND_PENDING' } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.user.count({ where: { createdAt: { gte: diliDayStart(addDays(today, -6)) } } }),
    ]),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: threshold }, product: { isActive: true } }, orderBy: [{ stock: 'asc' }, { id: 'asc' }], take: 10,
      include: { product: { select: { id: true, name: true } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'], where: { order: { status: { not: 'CANCELLED' }, createdAt: { gte: diliDayStart(addDays(today, -29)) } } },
      _sum: { qty: true }, orderBy: { _sum: { qty: 'desc' } }, take: 5,
    }),
    prisma.order.aggregate({ where: { paymentMethod: 'COD', status: 'DELIVERED', codCollectedAt: { not: null }, codReconciledAt: null }, _sum: { codCollectedCents: true }, _count: { _all: true } }),
  ]);

  const dailyMap = new Map(daily.map((r) => [r.d, num(r.revenue)]));
  const ordMap = new Map(ordersDaily.map((r) => [r.d, r.n]));
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(from14, i);
    return { date: d, revenueCents: dailyMap.get(d) ?? 0, orders: ordMap.get(d) ?? 0 };
  });
  const products = await prisma.product.findMany({ where: { id: { in: topRows.map((r) => r.productId).filter((x): x is number => x != null) } }, select: { id: true, name: true } });
  const [awaiting, codConfirm, toPack, outForDelivery, refunds, unread, newCustomers] = counts;
  const thisMonth = today.slice(0, 7);
  return {
    today,
    revenueTodayCents: dailyMap.get(today) ?? 0,
    revenue14Cents: series.reduce((s, r) => s + r.revenueCents, 0),
    revenueMonthCents: num(monthly.find((m) => m.m === thisMonth)?.revenue),
    ordersToday: ordMap.get(today) ?? 0,
    series,
    monthly: monthly.map((m) => ({ month: m.m, revenueCents: num(m.revenue), orders: m.n })),
    statusCounts: byStatus.map((s) => ({ status: s.status, n: s._count._all })),
    methodBreakdown: byMethod.map((m) => ({ method: m.method, orders: m.n, revenueCents: num(m.revenue) })),
    awaitingVerification: awaiting, codToConfirm: codConfirm, toPack, outForDelivery, refundsPending: refunds, unreadMessages: unread, newCustomers7: newCustomers,
    codCashToReconcileCents: codCash._sum.codCollectedCents ?? 0, codOrdersToReconcile: codCash._count._all,
    lowStock: low.map((v) => ({ productId: v.product.id, name: loc(v.product.name, locale), sku: v.sku, size: v.size, color: v.color, stock: v.stock })),
    topProducts: topRows.map((r) => ({ name: loc(products.find((p) => p.id === r.productId)?.name, locale), qty: r._sum.qty ?? 0 })),
  };
}

/* ------------------------------------------------------------------ CSV exports */
const guard = (v: unknown) => {
  const s = v == null ? '' : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // spreadsheet formula-injection guard
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const toCsv = (header: string[], rows: unknown[][]) => '﻿' + [header, ...rows].map((r) => r.map(guard).join(',')).join('\r\n');
const diliStamp = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' }).format(d) : '');
const usd = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2);

export async function exportOrders(fromDay: string, toDay: string) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: diliDayStart(fromDay), lt: diliDayStart(addDays(toDay, 1)) } }, orderBy: { id: 'asc' }, include: { items: true },
  });
  return toCsv(
    ['Order', 'Created (Asia/Dili)', 'Status', 'Payment status', 'Method', 'Customer', 'Phone', 'Municipality', 'Admin post', 'Suco', 'Items', 'Subtotal USD', 'Discount USD', 'Shipping USD', 'COD fee USD', 'Total USD', 'Coupon'],
    orders.map((o) => [o.code, diliStamp(o.createdAt), o.status, o.paymentStatus, o.paymentMethod, o.customerName, o.customerPhone, o.municipality, o.adminPost, o.suco,
      o.items.reduce((s, i) => s + i.qty, 0), usd(o.subtotalCents), usd(o.discountCents), usd(o.shippingCents), usd(o.codFeeCents), usd(o.totalCents), o.couponCode]),
  );
}

export async function exportPayments(fromDay: string, toDay: string) {
  const rows = await prisma.paymentProof.findMany({
    where: { createdAt: { gte: diliDayStart(fromDay), lt: diliDayStart(addDays(toDay, 1)) } }, orderBy: { id: 'asc' }, include: { order: { select: { code: true, customerName: true } } },
  });
  return toCsv(
    ['Submitted (Asia/Dili)', 'Order', 'Customer', 'Method', 'Amount USD', 'Reference', 'Payer', 'Customer-stated time', 'Status', 'Reviewed (Asia/Dili)', 'Review note'],
    rows.map((p) => [diliStamp(p.createdAt), p.order.code, p.order.customerName, p.method, usd(p.amountCents), p.reference, p.payerName, diliStamp(p.paidAt), p.status, diliStamp(p.reviewedAt), p.reviewNote]),
  );
}

export async function exportCod(fromDay: string, toDay: string) {
  const rows = await prisma.order.findMany({
    where: { paymentMethod: 'COD', status: 'DELIVERED', deliveredAt: { gte: diliDayStart(fromDay), lt: diliDayStart(addDays(toDay, 1)) } },
    orderBy: { deliveredAt: 'asc' }, include: { assignedCourier: { select: { name: true } } },
  });
  return toCsv(
    ['Order', 'Delivered (Asia/Dili)', 'Customer', 'Admin post', 'Suco', 'Courier', 'Total USD', 'Cash collected USD', 'Reconciled (Asia/Dili)'],
    rows.map((o) => [o.code, diliStamp(o.deliveredAt), o.customerName, o.adminPost, o.suco, o.assignedCourier?.name, usd(o.totalCents), usd(o.codCollectedCents), diliStamp(o.codReconciledAt)]),
  );
}

export async function exportRevenue(fromDay: string, toDay: string) {
  const rows = await prisma.$queryRaw<{ d: string; orders: number; revenue: bigint; bank: bigint; atm: bigint; tpay: bigint; mosan: bigint; cod: bigint }[]>`
    SELECT to_char(${dili('paidAt')}, 'YYYY-MM-DD') AS d, COUNT(*)::int AS orders, COALESCE(SUM("totalCents"),0)::bigint AS revenue,
      COALESCE(SUM("totalCents") FILTER (WHERE "paymentMethod" = 'BANK_BNCTL'),0)::bigint AS bank,
      COALESCE(SUM("totalCents") FILTER (WHERE "paymentMethod" = 'ATM_BNCTL'),0)::bigint AS atm,
      COALESCE(SUM("totalCents") FILTER (WHERE "paymentMethod" = 'TPAY'),0)::bigint AS tpay,
      COALESCE(SUM("totalCents") FILTER (WHERE "paymentMethod" = 'MOSAN'),0)::bigint AS mosan,
      COALESCE(SUM("totalCents") FILTER (WHERE "paymentMethod" = 'COD'),0)::bigint AS cod
    FROM "Order" WHERE "paymentStatus" = 'PAID' AND "status" <> 'CANCELLED'
      AND "paidAt" >= ${diliDayStart(fromDay)} AND "paidAt" < ${diliDayStart(addDays(toDay, 1))} GROUP BY 1 ORDER BY 1`;
  return toCsv(
    ['Day (Asia/Dili)', 'Paid orders', 'Revenue USD', 'BNCTL bank USD', 'BNCTL ATM USD', 'T-Pay USD', 'Mosan USD', 'COD USD'],
    rows.map((r) => [r.d, r.orders, usd(num(r.revenue)), usd(num(r.bank)), usd(num(r.atm)), usd(num(r.tpay)), usd(num(r.mosan)), usd(num(r.cod))]),
  );
}
