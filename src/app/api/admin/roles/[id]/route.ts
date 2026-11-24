import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { revokeSessions } from '@/lib/auth';
import { assertCanGrant, roleSchema } from '@/server/admin-access';

export const PUT = route<{ id: string }>({ perm: 'roles.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw notFound();
  if (role.key === 'SUPER_ADMIN' || role.key === 'CUSTOMER') throw new AppError(403, 'ROLE_LOCKED');
  const b = await ctx.body(roleSchema);
  assertCanGrant(ctx.user!, b.permissions);
  await prisma.$transaction([
    prisma.role.update({ where: { id }, data: { name: b.name, description: b.description || null } }),
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: [...new Set(b.permissions)].map((permissionKey) => ({ roleId: id, permissionKey })) }),
  ]);
  // holders of this role must re-login so the new permission set applies immediately
  const holders = await prisma.userRole.findMany({ where: { roleId: id }, select: { userId: true } });
  for (const h of holders) if (h.userId !== ctx.user!.id) await revokeSessions(h.userId);
  await audit(ctx, 'role.update', 'role', id, { permissions: b.permissions });
  return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'roles.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw notFound();
  if (role.isSystem) throw new AppError(403, 'ROLE_LOCKED');
  if (role._count.users > 0) throw new AppError(409, 'ROLE_IN_USE');
  await prisma.role.delete({ where: { id } });
  await audit(ctx, 'role.delete', 'role', id, { key: role.key });
  return { ok: true };
});
