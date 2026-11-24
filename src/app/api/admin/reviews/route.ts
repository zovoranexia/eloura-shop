import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-shared';
import { pageMeta, paging } from '@/server/paging';

export const GET = route({ perm: 'reviews.moderate' }, async (ctx) => {
  const { page, limit, skip, take } = paging(ctx.req.nextUrl.searchParams);
  const [total, rows] = await Promise.all([
    prisma.review.count(),
    prisma.review.findMany({ orderBy: { id: 'desc' }, skip, take, include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } } }),
  ]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, status: r.status, isVerified: r.isVerified, user: r.user.name, product: loc(r.product.name, ctx.locale), slug: r.product.slug, createdAt: r.createdAt.toISOString() })),
  };
});
