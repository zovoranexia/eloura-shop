import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { loc, type Locale } from '@/lib/i18n';

export type ProductCard = {
  id: number; slug: string; sku: string; name: string; priceCents: number; compareAtCents: number | null; discountPercent: number;
  image: string | null; image2: string | null; inStock: boolean; isNew: boolean; isFeatured: boolean;
  category: { slug: string; name: string } | null; rating: number | null; ratingCount: number;
};

/** lower-case, accent-free text used for search */
export const normalizeSearch = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export function buildSearchText(name: unknown, sku: string) {
  const o = (name ?? {}) as Record<string, string>;
  return normalizeSearch([sku, ...Object.values(o)].join(' '));
}

const cardInclude = {
  category: { select: { slug: true, name: true } },
  images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], take: 2 },
  variants: { where: { isActive: true }, select: { stock: true } },
} satisfies Prisma.ProductInclude;
type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

async function ratingsFor(ids: number[]) {
  if (!ids.length) return new Map<number, { avg: number; n: number }>();
  const g = await prisma.review.groupBy({ by: ['productId'], where: { productId: { in: ids }, status: 'PUBLISHED' }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(g.map((r) => [r.productId, { avg: r._avg.rating ?? 0, n: r._count._all }]));
}

function toCard(p: CardRow, locale: Locale, ratings: Map<number, { avg: number; n: number }>): ProductCard {
  const discount = p.compareAtCents && p.compareAtCents > p.priceCents ? Math.round((1 - p.priceCents / p.compareAtCents) * 100) : 0;
  const r = ratings.get(p.id);
  return {
    id: p.id, slug: p.slug, sku: p.sku, name: loc(p.name, locale), priceCents: p.priceCents, compareAtCents: discount ? p.compareAtCents : null, discountPercent: discount,
    image: p.images[0]?.url ?? null, image2: p.images[1]?.url ?? null, inStock: p.variants.some((v) => v.stock > 0),
    isNew: Date.now() - p.createdAt.getTime() < 21 * 864e5, isFeatured: p.isFeatured,
    category: p.category ? { slug: p.category.slug, name: loc(p.category.name, locale) } : null,
    rating: r && r.n ? Math.round(r.avg * 10) / 10 : null, ratingCount: r?.n ?? 0,
  };
}

export async function cardsByIds(ids: number[], locale: Locale): Promise<ProductCard[]> {
  const rows = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, include: cardInclude });
  const ratings = await ratingsFor(rows.map((r) => r.id));
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map((r) => toCard(r, locale, ratings));
}

export type ListFilters = {
  category?: string; q?: string; sort?: 'newest' | 'price_asc' | 'price_desc' | 'discount'; sale?: boolean; featured?: boolean;
  min?: number; max?: number; size?: string; color?: string; page?: number; limit?: number;
};

export async function listProducts(f: ListFilters, locale: Locale) {
  const page = Math.max(1, f.page ?? 1), limit = Math.min(48, Math.max(1, f.limit ?? 12));
  const base: Prisma.ProductWhereInput = { isActive: true, OR: [{ categoryId: null }, { category: { isActive: true } }] };
  const and: Prisma.ProductWhereInput[] = [];
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.q) and.push({ searchText: { contains: normalizeSearch(f.q) } });
  if (f.featured) and.push({ isFeatured: true });
  if (f.sale) {
    const ids = await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM "Product" WHERE "compareAtCents" > "priceCents"`;
    and.push({ id: { in: ids.map((r) => r.id) } });
  }
  const facetWhere: Prisma.ProductWhereInput = { ...base, AND: and };
  const where: Prisma.ProductWhereInput = { ...base, AND: [...and] };
  if (f.min != null || f.max != null) (where.AND as Prisma.ProductWhereInput[]).push({ priceCents: { gte: f.min ?? 0, lte: f.max ?? 100_000_000 } });
  if (f.size) (where.AND as Prisma.ProductWhereInput[]).push({ variants: { some: { isActive: true, size: f.size } } });
  if (f.color) (where.AND as Prisma.ProductWhereInput[]).push({ variants: { some: { isActive: true, color: f.color } } });

  const total = await prisma.product.count({ where });
  let rows: CardRow[];
  if (f.sort === 'discount') {
    const all = await prisma.product.findMany({ where, include: cardInclude });
    all.sort((a, b) => {
      const da = a.compareAtCents ? 1 - a.priceCents / a.compareAtCents : 0, db = b.compareAtCents ? 1 - b.priceCents / b.compareAtCents : 0;
      return db - da;
    });
    rows = all.slice((page - 1) * limit, page * limit);
  } else {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      f.sort === 'price_asc' ? [{ priceCents: 'asc' }] : f.sort === 'price_desc' ? [{ priceCents: 'desc' }] : [{ createdAt: 'desc' }, { id: 'desc' }];
    rows = await prisma.product.findMany({ where, include: cardInclude, orderBy, skip: (page - 1) * limit, take: limit });
  }
  const ratings = await ratingsFor(rows.map((r) => r.id));

  const [variants, price] = await Promise.all([
    prisma.productVariant.findMany({ where: { isActive: true, product: facetWhere }, select: { size: true, color: true, colorHex: true } }),
    prisma.product.aggregate({ where: facetWhere, _min: { priceCents: true }, _max: { priceCents: true } }),
  ]);
  const sizes = [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))];
  const colorMap = new Map<string, string | null>();
  for (const v of variants) if (v.color && !colorMap.has(v.color)) colorMap.set(v.color, v.colorHex);
  return {
    items: rows.map((r) => toCard(r, locale, ratings)), total, page, pages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      sizes: sizes.sort((a, b) => (isNaN(+a) || isNaN(+b) ? sortSize(a) - sortSize(b) : +a - +b)),
      colors: [...colorMap].map(([name, hex]) => ({ name, hex })),
      priceMin: price._min.priceCents ?? 0, priceMax: price._max.priceCents ?? 0,
    },
  };
}
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const sortSize = (s: string) => { const i = SIZE_ORDER.indexOf(s.toUpperCase()); return i < 0 ? 99 : i; };

export async function featuredProducts(locale: Locale, limit = 8) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true, OR: [{ categoryId: null }, { category: { isActive: true } }] },
    include: cardInclude, orderBy: [{ createdAt: 'desc' }], take: limit,
  });
  return withRatings(rows, locale);
}
async function withRatings(rows: CardRow[], locale: Locale) {
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return rows.map((r) => toCard(r, locale, ratings));
}

export async function listCategories(locale: Locale) {
  const rows = await prisma.category.findMany({
    where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: loc(c.name, locale), image: c.image, productCount: c._count.products }));
}

export async function productDetail(slug: string, locale: Locale, viewerId?: number | null) {
  const p = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true } },
      images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      variants: { where: { isActive: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!p) return null;
  const ratings = await ratingsFor([p.id]);
  const r = ratings.get(p.id);
  const reviews = await prisma.review.findMany({
    where: { productId: p.id, status: 'PUBLISHED' }, orderBy: { id: 'desc' }, take: 10, include: { user: { select: { name: true } } },
  });
  let canReview = false;
  if (viewerId) {
    const [bought, done] = await Promise.all([
      prisma.orderItem.findFirst({ where: { productId: p.id, order: { userId: viewerId, status: 'DELIVERED' } }, select: { id: true } }),
      prisma.review.findUnique({ where: { productId_userId: { productId: p.id, userId: viewerId } }, select: { id: true } }),
    ]);
    canReview = !!bought && !done;
  }
  const relatedRows = await prisma.product.findMany({
    where: { isActive: true, id: { not: p.id }, categoryId: p.categoryId }, include: cardInclude, orderBy: [{ isFeatured: 'desc' }, { id: 'desc' }], take: 4,
  });
  const discount = p.compareAtCents && p.compareAtCents > p.priceCents ? Math.round((1 - p.priceCents / p.compareAtCents) * 100) : 0;
  return {
    id: p.id, slug: p.slug, sku: p.sku, name: loc(p.name, locale), description: loc(p.description, locale),
    priceCents: p.priceCents, compareAtCents: discount ? p.compareAtCents : null, discountPercent: discount,
    category: p.category ? { slug: p.category.slug, name: loc(p.category.name, locale) } : null,
    images: p.images.map((i) => i.url),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, colorHex: v.colorHex, stock: v.stock, priceCents: v.priceCents ?? p.priceCents })),
    rating: r && r.n ? Math.round(r.avg * 10) / 10 : null, ratingCount: r?.n ?? 0,
    reviews: reviews.map((x) => {
      const [a, b] = x.user.name.split(' ');
      return { id: x.id, rating: x.rating, comment: x.comment, createdAt: x.createdAt.toISOString(), name: b ? `${a} ${b[0]}.` : a, verified: x.isVerified };
    }),
    canReview, related: await withRatings(relatedRows, locale),
  };
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof productDetail>>>;
