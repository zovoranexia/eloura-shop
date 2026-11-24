import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { pageMeta, paging } from '@/server/paging';

/** Immutable audit trail (the database rejects UPDATE/DELETE on this table). */
export const GET = route({ perm: 'audit.view' }, async (ctx) => {
  const q = ctx.req.nextUrl.searchParams;
  const { page, limit, skip, take } = paging(q, 50);
  const action = q.get('action')?.trim();
  const where = action ? { action: { startsWith: action } } : {};
  const [total, rows] = await Promise.all([prisma.auditLog.count({ where }), prisma.auditLog.findMany({ where, orderBy: { id: 'desc' }, skip, take })]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((a) => ({ id: a.id, user: a.userLabel, action: a.action, entity: a.entity, entityId: a.entityId, meta: a.meta, ip: a.ip, createdAt: a.createdAt.toISOString() })),
  };
});
