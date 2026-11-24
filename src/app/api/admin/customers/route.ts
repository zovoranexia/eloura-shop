import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { pageMeta, paging } from '@/server/paging';

export const GET = route({ perm: 'customers.view' }, async (ctx) => {
  const q = ctx.req.nextUrl.searchParams;
  const { page, limit, skip, take } = paging(q);
  const text = q.get('q')?.trim();
  // customers = accounts without any staff permission
  const where = {
    roles: { none: { role: { permissions: { some: {} } } } },
    NOT: { roles: { some: { role: { key: 'SUPER_ADMIN' } } } },
    ...(text ? { OR: [{ name: { contains: text, mode: 'insensitive' as const } }, { email: { contains: text, mode: 'insensitive' as const } }, { phone: { contains: text.replace(/[\s-]/g, '') } }] } : {}),
    ...(q.get('codBlocked') === '1' ? { codBlocked: true } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { _count: { select: { orders: true } } } }),
  ]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, isActive: u.isActive, orders: u._count.orders, codBlocked: u.codBlocked, codRefusals: u.codRefusals,
      createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  };
});
