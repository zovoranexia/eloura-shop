import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { zoneSchema } from '@/server/admin-content';

export const PUT = route<{ id: string }>({ perm: 'zones.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const z = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!z) throw notFound();
  const b = await ctx.body(zoneSchema);
  // COD can only ever be enabled inside Dili municipality, whatever the form sends.
  const codEnabled = z.municipality === 'dili' ? b.codEnabled : false;
  const out = await prisma.deliveryZone.update({
    where: { id }, data: { name: b.name, codEnabled, deliveryFeeCents: b.deliveryFeeCents, freeOverCents: b.freeOverCents, etaText: b.etaText ?? null, isActive: b.isActive, sortOrder: b.sortOrder ?? z.sortOrder },
  });
  await audit(ctx, 'zone.update', 'zone', id, { municipality: z.municipality, adminPost: z.adminPost, codEnabled });
  return out;
});
