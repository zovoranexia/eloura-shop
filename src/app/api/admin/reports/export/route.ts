import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { addDays, diliDay } from '@/lib/time';
import { exportCod, exportOrders, exportPayments, exportRevenue } from '@/server/reports';

const q = z.object({
  type: z.enum(['orders', 'payments', 'cod', 'revenue']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => addDays(diliDay(), -29)),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => diliDay()),
});

/** CSV exports (UTF-8 with BOM for Excel, spreadsheet-formula guarded, timestamps in Asia/Dili). */
export const GET = route({ perm: 'reports.export' }, async (ctx) => {
  const { type, from, to } = ctx.query(q);
  const fn = { orders: exportOrders, payments: exportPayments, cod: exportCod, revenue: exportRevenue }[type];
  const csv = await fn(from, to);
  await audit(ctx, 'report.export', 'report', type, { from, to });
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="eloura-${type}-${from}_${to}.csv"`, 'Cache-Control': 'no-store' } });
});
