import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { orderListWhere } from '@/server/admin-orders';
import { pageMeta, paging } from '@/server/paging';

export const GET = route({ perm: 'orders.view' }, async (ctx) => {
  const q = ctx.req.nextUrl.searchParams;
  const { page, limit, skip, take } = paging(q);
  const where = orderListWhere(q);
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { items: { select: { qty: true } }, assignedCourier: { select: { name: true } } } }),
  ]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((o) => ({
      id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, totalCents: o.totalCents, customerName: o.customerName,
      customerPhone: o.customerPhone, municipality: o.municipality, adminPost: o.adminPost, suco: o.suco, itemCount: o.items.reduce((s, i) => s + i.qty, 0),
      courier: o.assignedCourier?.name ?? null, createdAt: o.createdAt.toISOString(),
    })),
  };
});
