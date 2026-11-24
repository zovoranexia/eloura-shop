import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { activeSuperAdmins, isSuperAdmin, resolveRoles, staffUpdateSchema } from '@/server/admin-access';

export const PATCH = route<{ id: string }>({ perm: 'staff.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound();
  const b = await ctx.body(staffUpdateSchema);
  const actor = ctx.user!;

  // A non-super-admin can never touch a super admin; nobody can lock themselves out.
  const targetIsSuper = await isSuperAdmin(id);
  if (targetIsSuper && !actor.roleKeys.includes('SUPER_ADMIN')) throw new AppError(403, 'FORBIDDEN');
  if (id === actor.id && (b.isActive === false || b.roleKeys)) throw new AppError(403, 'CANNOT_MODIFY_SELF');

  const roles = b.roleKeys ? await resolveRoles(actor, b.roleKeys) : undefined;
  const losesSuper = targetIsSuper && ((roles && !roles.some((r) => r.key === 'SUPER_ADMIN')) || b.isActive === false);
  if (losesSuper && (await activeSuperAdmins()) <= 1) throw new AppError(409, 'LAST_SUPER_ADMIN');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(b.name ? { name: b.name } : {}), ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
        ...(b.password ? { passwordHash: await hashPassword(b.password), failedLogins: 0, lockedUntil: null } : {}),
        // credentials / permissions changed: invalidate every issued JWT
        ...(b.password || b.isActive === false || roles ? { tokenVersion: { increment: 1 } } : {}),
      },
    });
    if (roles) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
    }
  });
  await audit(ctx, 'staff.update', 'user', id, { roles: b.roleKeys, isActive: b.isActive, passwordReset: !!b.password });
  return { ok: true };
});
