import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';

export const PUT = route<{ productId: string }>({ auth: true }, async (ctx) => {
  const productId = Number(ctx.params.productId);
  if (!(await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } }))) throw notFound();
  await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: ctx.user!.id, productId } }, update: {}, create: { userId: ctx.user!.id, productId } });
  return { ok: true };
});

export const DELETE = route<{ productId: string }>({ auth: true }, async (ctx) => {
  await prisma.wishlistItem.deleteMany({ where: { userId: ctx.user!.id, productId: Number(ctx.params.productId) } });
  return { ok: true };
});
