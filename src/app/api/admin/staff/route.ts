import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { resolveRoles, staffCreateSchema } from '@/server/admin-access';

/** Staff = accounts holding at least one role other than CUSTOMER. */
export const GET = route({ perm: 'staff.manage' }, async () => {
  const users = await prisma.user.findMany({
    where: { roles: { some: { role: { key: { not: 'CUSTOMER' } } } } }, orderBy: { id: 'asc' }, include: { roles: { include: { role: true } } },
  });
  return users.map((u) => ({
    id: u.id, name: u.name, email: u.email, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(),
    roles: u.roles.map((r) => ({ key: r.role.key, name: r.role.name })),
  }));
});

export const POST = route({ perm: 'staff.manage' }, async (ctx) => {
  const b = await ctx.body(staffCreateSchema);
  const roles = await resolveRoles(ctx.user!, b.roleKeys);
  if (await prisma.user.findUnique({ where: { email: b.email } })) throw new AppError(409, 'EMAIL_TAKEN');
  const u = await prisma.user.create({
    data: { name: b.name, email: b.email, locale: b.locale, passwordHash: await hashPassword(b.password), roles: { create: roles.map((r) => ({ roleId: r.id })) } },
  });
  await audit(ctx, 'staff.create', 'user', u.id, { roles: b.roleKeys });
  return { id: u.id };
});
