import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

/** Quick stock adjustment without opening the full product editor (permission: inventory.update). */
export const POST = route({ perm: 'inventory.update' }, async (ctx) => {
  const b = await ctx.body(z.object({ variantId: z.number().int().positive(), stock: z.number().int().min(0).max(100000) }));
  const v = await prisma.productVariant.update({ where: { id: b.variantId }, data: { stock: b.stock } });
  await audit(ctx, 'inventory.update', 'variant', v.id, { stock: b.stock });
  return { id: v.id, stock: v.stock };
});
