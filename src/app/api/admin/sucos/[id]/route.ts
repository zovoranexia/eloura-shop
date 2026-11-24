import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const PUT = route<{ id: string }>({ perm: 'zones.manage' }, async (ctx) => {
  const b = await ctx.body(z.object({ name: z.string().trim().min(2).max(80), codEnabled: z.boolean(), isActive: z.boolean() }));
  const s = await prisma.suco.update({ where: { id: Number(ctx.params.id) }, data: b });
  await audit(ctx, 'suco.update', 'suco', s.id, { name: s.name, codEnabled: s.codEnabled });
  return s;
});

export const DELETE = route<{ id: string }>({ perm: 'zones.manage' }, async (ctx) => {
  await prisma.suco.delete({ where: { id: Number(ctx.params.id) } });
  await audit(ctx, 'suco.delete', 'suco', ctx.params.id);
  return { ok: true };
});
