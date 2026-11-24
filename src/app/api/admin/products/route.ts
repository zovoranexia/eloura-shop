import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-shared';
import { audit } from '@/lib/audit';
import { productSchema, saveProduct, productListWhere } from '@/server/admin-catalog';
import { getSetting } from '@/server/settings';
import { pageMeta, paging } from '@/server/paging';

export const GET = route({ perm: 'products.view' }, async (ctx) => {
  const q = ctx.req.nextUrl.searchParams;
  const { page, limit, skip, take } = paging(q);
  const where = productListWhere(q);
  if (q.get('stock') === 'low') {
    const t = (await getSetting('commerce')).lowStockThreshold;
    where.variants = { some: { isActive: true, stock: { lte: t } } };
  }
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, orderBy: { id: 'desc' }, skip, take,
      include: { category: { select: { name: true } }, images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: { select: { stock: true, isActive: true } } },
    }),
  ]);
  return {
    ...pageMeta(total, page, limit),
    items: rows.map((p) => ({
      id: p.id, slug: p.slug, sku: p.sku, name: loc(p.name, 'en') || loc(p.name, 'tet'), priceCents: p.priceCents, compareAtCents: p.compareAtCents,
      isActive: p.isActive, isFeatured: p.isFeatured, image: p.images[0]?.url ?? null, variantCount: p.variants.length,
      stock: p.variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0), category: p.category ? loc(p.category.name, 'en') : null,
    })),
  };
});

export const POST = route({ perm: 'products.create' }, async (ctx) => {
  const id = await saveProduct(await ctx.body(productSchema), null);
  await audit(ctx, 'product.create', 'product', id);
  return { id };
});
