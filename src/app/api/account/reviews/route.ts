import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, conflict } from '@/lib/errors';

/** Verified reviews: only customers with a DELIVERED order containing the product, one review per product. */
export const POST = route({ auth: true, limit: ['review', 10, 60 * 60_000] }, async (ctx) => {
  const b = await ctx.body(z.object({ productId: z.number().int().positive(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }));
  const uid = ctx.user!.id;
  const item = await prisma.orderItem.findFirst({ where: { productId: b.productId, order: { userId: uid, status: 'DELIVERED' } }, select: { orderId: true } });
  if (!item) throw new AppError(403, 'REVIEW_NOT_ALLOWED');
  if (await prisma.review.findUnique({ where: { productId_userId: { productId: b.productId, userId: uid } } })) throw conflict('ALREADY_REVIEWED');
  await prisma.review.create({ data: { productId: b.productId, userId: uid, orderId: item.orderId, rating: b.rating, comment: b.comment || null, isVerified: true } });
  return { ok: true };
});
