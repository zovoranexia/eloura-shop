import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { revokeSessions } from '@/lib/auth';

export const GET = route<{ id: string }>({ perm: 'customers.view' }, async (ctx) => {
  const u = await prisma.user.findUnique({
    where: { id: Number(ctx.params.id) },
    include: { addresses: true, orders: { orderBy: { id: 'desc' }, take: 50, select: { id: true, code: true, status: true, paymentStatus: true, paymentMethod: true, totalCents: true, createdAt: true } } },
  });
  if (!u) throw notFound();
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, isActive: u.isActive, locale: u.locale, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    codBlocked: u.codBlocked, codBlockedReason: u.codBlockedReason, codRefusals: u.codRefusals, addresses: u.addresses,
    orders: u.orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
  };
});

/** Activate / deactivate a customer account (staff accounts are managed under Staff & Roles). */
export const PATCH = route<{ id: string }>({ perm: 'customers.manage' }, async (ctx) => {
  const { isActive } = await ctx.body(z.object({ isActive: z.boolean() }));
  const id = Number(ctx.params.id);
  const u = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: { include: { permissions: true } } } } } });
  if (!u) throw notFound();
  if (u.roles.some((r) => r.role.key === 'SUPER_ADMIN' || r.role.permissions.length > 0)) throw new AppError(403, 'FORBIDDEN');
  await prisma.user.update({ where: { id }, data: { isActive } });
  if (!isActive) await revokeSessions(id);
  await audit(ctx, isActive ? 'customer.activate' : 'customer.deactivate', 'user', id);
  return { ok: true };
});
