import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';

export const POST = route<{ id: string }>({ perm: 'zones.manage' }, async (ctx) => {
  const zone = await prisma.deliveryZone.findUnique({ where: { id: Number(ctx.params.id) } });
  if (!zone) throw notFound();
  if (zone.municipality !== 'dili') throw new AppError(422, 'SUCO_ONLY_DILI');
  const b = await ctx.body(z.object({ name: z.string().trim().min(2).max(80), codEnabled: z.boolean().default(true) }));
  const s = await prisma.suco.create({ data: { zoneId: zone.id, name: b.name, codEnabled: b.codEnabled } });
  await audit(ctx, 'suco.create', 'suco', s.id, { zone: zone.adminPost, name: b.name });
  return s;
});
