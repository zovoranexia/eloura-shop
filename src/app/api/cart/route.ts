import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

/** Server-side cart for signed-in customers (guests keep the cart in localStorage; the client merges on login). */
export const GET = route({ auth: true }, async ({ user }) => {
  const cart = await prisma.cart.findUnique({ where: { userId: user!.id }, include: { items: true } });
  return { items: (cart?.items ?? []).map((i) => ({ variantId: i.variantId, qty: i.qty })) };
});

export const PUT = route({ auth: true }, async (ctx) => {
  const { items } = await ctx.body(z.object({ items: z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(50) })).max(30) }));
  const ids = [...new Set(items.map((i) => i.variantId))];
  const valid = new Set((await prisma.productVariant.findMany({ where: { id: { in: ids }, isActive: true, product: { isActive: true } }, select: { id: true } })).map((v) => v.id));
  const merged = new Map<number, number>();
  for (const i of items) if (valid.has(i.variantId)) merged.set(i.variantId, Math.min((merged.get(i.variantId) ?? 0) + i.qty, 50));
  const cart = await prisma.cart.upsert({ where: { userId: ctx.user!.id }, update: {}, create: { userId: ctx.user!.id } });
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.cartItem.createMany({ data: [...merged].map(([variantId, qty]) => ({ cartId: cart.id, variantId, qty })) }),
  ]);
  return { items: [...merged].map(([variantId, qty]) => ({ variantId, qty })) };
});
