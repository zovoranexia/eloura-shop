import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { ALL_PERMISSIONS } from '@/lib/rbac';
import { passwordOk, type SessionUser } from '@/lib/auth';

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  permissions: z.array(z.string().refine((p) => ALL_PERMISSIONS.includes(p), 'INVALID')).max(ALL_PERMISSIONS.length),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().max(128).refine(passwordOk, 'WEAK_PASSWORD'),
  roleKeys: z.array(z.string().max(40)).min(1).max(5),
  locale: z.enum(['tet', 'pt', 'en', 'id']).default('tet'),
});
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  roleKeys: z.array(z.string().max(40)).min(1).max(5).optional(),
  password: z.string().max(128).refine(passwordOk, 'WEAK_PASSWORD').optional(),
});

/** No privilege escalation: an actor may only hand out permissions they hold themselves. */
export function assertCanGrant(actor: SessionUser, perms: string[]) {
  const have = new Set(actor.permissions);
  if (!perms.every((p) => have.has(p))) throw new AppError(403, 'CANNOT_GRANT');
}

export async function rolePermissions(role: { id: number; key: string }): Promise<string[]> {
  if (role.key === 'SUPER_ADMIN') return [...ALL_PERMISSIONS];
  return (await prisma.rolePermission.findMany({ where: { roleId: role.id } })).map((r) => r.permissionKey);
}

export async function resolveRoles(actor: SessionUser, roleKeys: string[]) {
  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  if (roles.length !== new Set(roleKeys).size) throw new AppError(422, 'VALIDATION', { roleKeys: 'INVALID' });
  for (const r of roles) assertCanGrant(actor, await rolePermissions(r));
  return roles;
}

export const isSuperAdmin = async (userId: number) =>
  !!(await prisma.userRole.findFirst({ where: { userId, role: { key: 'SUPER_ADMIN' } }, select: { userId: true } }));
export const activeSuperAdmins = () => prisma.user.count({ where: { isActive: true, roles: { some: { role: { key: 'SUPER_ADMIN' } } } } });
