import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { assertCanGrant, roleSchema, rolePermissions } from '@/server/admin-access';

export const GET = route({ anyPerm: ['roles.manage', 'staff.manage'] }, async () => {
  const roles = await prisma.role.findMany({ orderBy: [{ isSystem: 'desc' }, { id: 'asc' }], include: { _count: { select: { users: true } } } });
  return Promise.all(roles.map(async (r) => ({
    id: r.id, key: r.key, name: r.name, description: r.description, isSystem: r.isSystem, userCount: r._count.users, permissions: await rolePermissions(r),
  })));
});

export const POST = route({ perm: 'roles.manage' }, async (ctx) => {
  const b = await ctx.body(roleSchema);
  assertCanGrant(ctx.user!, b.permissions);
  const base = `CUSTOM_${b.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'ROLE'}`;
  let key = base, n = 1;
  while (await prisma.role.findUnique({ where: { key } })) key = `${base}_${++n}`;
  const role = await prisma.role.create({
    data: { key, name: b.name, description: b.description || null, isSystem: false, permissions: { create: [...new Set(b.permissions)].map((permissionKey) => ({ permissionKey })) } },
  });
  await audit(ctx, 'role.create', 'role', role.id, { key, permissions: b.permissions });
  return role;
});
