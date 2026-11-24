import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

/** COD cash ledger: delivered COD orders with the cash collected by couriers; ?reconciled=0|1 */
export const GET = route({ perm: 'cod.reconcile' }, async (ctx) => {
  const rec = ctx.req.nextUrl.searchParams.get('reconciled');
  const rows = await prisma.order.findMany({
    where: { paymentMethod: 'COD', status: 'DELIVERED', codCollectedAt: { not: null }, ...(rec === '1' ? { codReconciledAt: { not: null } } : rec === '0' ? { codReconciledAt: null } : {}) },
    orderBy: { deliveredAt: 'desc' }, take: 300, include: { assignedCourier: { select: { id: true, name: true } } },
  });
  return rows.map((o) => ({
    id: o.id, code: o.code, customerName: o.customerName, adminPost: o.adminPost, suco: o.suco, totalCents: o.totalCents, collectedCents: o.codCollectedCents,
    courier: o.assignedCourier, deliveredAt: o.deliveredAt?.toISOString() ?? null, reconciledAt: o.codReconciledAt?.toISOString() ?? null,
  }));
});
