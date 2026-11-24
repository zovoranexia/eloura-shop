import 'server-only';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { cleanI18n } from '@/lib/i18n-shared';
import { buildSearchText } from './catalog';

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'item';

export async function uniqueSlug(table: 'product' | 'category', base: string, exceptId?: number) {
  let slug = slugify(base), n = 1;
  const exists = (s: string) =>
    table === 'product'
      ? prisma.product.findFirst({ where: { slug: s, id: { not: exceptId ?? -1 } }, select: { id: true } })
      : prisma.category.findFirst({ where: { slug: s, id: { not: exceptId ?? -1 } }, select: { id: true } });
  while (await exists(slug)) slug = `${slugify(base)}-${++n}`;
  return slug;
}

const i18nRecord = z.record(z.string().max(5000));
const imageUrl = z.string().max(300).regex(/^(\/media\/|\/images\/)/, 'INVALID');

export const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().trim().min(2).max(40),
  size: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional().or(z.literal('')),
  stock: z.number().int().min(0).max(100000),
  priceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  slug: z.string().max(70).optional(),
  sku: z.string().trim().min(2).max(40),
  categoryId: z.number().int().positive().nullable().optional(),
  name: i18nRecord,
  description: i18nRecord.optional(),
  priceCents: z.number().int().min(0).max(10_000_000),
  compareAtCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(imageUrl).max(10).default([]),
  variants: z.array(variantSchema).min(1).max(60),
}).superRefine((p, ctx) => {
  if (p.compareAtCents && p.compareAtCents <= p.priceCents) ctx.addIssue({ code: 'custom', path: ['compareAtCents'], message: 'COMPARE_PRICE_LOWER' });
});
export type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(input: ProductInput, id: number | null): Promise<number> {
  const name = cleanI18n(input.name);
  if (!name.tet && !name.en) throw new AppError(422, 'VALIDATION', { name: 'REQUIRED' });
  if (input.categoryId && !(await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) throw new AppError(422, 'VALIDATION', { categoryId: 'INVALID' });
  const skus = new Set<string>();
  for (const v of input.variants) {
    if (skus.has(v.sku)) throw new AppError(422, 'VALIDATION', { variants: 'DUPLICATE_SKU' });
    skus.add(v.sku);
  }
  const description = cleanI18n(input.description);
  const searchText = buildSearchText(name, input.sku);

  return prisma.$transaction(async (tx) => {
    if (await tx.product.findFirst({ where: { sku: input.sku, id: { not: id ?? -1 } }, select: { id: true } })) throw new AppError(409, 'SKU_TAKEN');
    let pid = id;
    const base = {
      sku: input.sku, categoryId: input.categoryId ?? null, name, description, searchText, priceCents: input.priceCents,
      compareAtCents: input.compareAtCents || null, isActive: input.isActive, isFeatured: input.isFeatured,
    };
    if (id) {
      const cur = await tx.product.findUnique({ where: { id } });
      if (!cur) throw notFound();
      const slug = input.slug && input.slug !== cur.slug ? await uniqueSlug('product', input.slug, id) : cur.slug;
      await tx.product.update({ where: { id }, data: { ...base, slug } });
    } else {
      pid = (await tx.product.create({ data: { ...base, slug: await uniqueSlug('product', input.slug || name.en || name.tet) } })).id;
    }
    await tx.productImage.deleteMany({ where: { productId: pid! } });
    if (input.images.length) await tx.productImage.createMany({ data: input.images.map((url, i) => ({ productId: pid!, url, sortOrder: i })) });

    // Variant matrix: update by id, insert new, drop the rest (deactivate when already sold).
    const keep = new Set<number>();
    for (const v of input.variants) {
      const data = { sku: v.sku, size: v.size || null, color: v.color || null, colorHex: v.colorHex || null, stock: v.stock, priceCents: v.priceCents ?? null, isActive: v.isActive };
      if (v.id) {
        const r = await tx.productVariant.updateMany({ where: { id: v.id, productId: pid! }, data });
        if (r.count !== 1) throw notFound();
        keep.add(v.id);
      } else {
        if (await tx.productVariant.findUnique({ where: { sku: v.sku }, select: { id: true } })) throw new AppError(409, 'SKU_TAKEN', { sku: v.sku });
        keep.add((await tx.productVariant.create({ data: { ...data, productId: pid! } })).id);
      }
    }
    for (const old of await tx.productVariant.findMany({ where: { productId: pid! }, select: { id: true } })) {
      if (keep.has(old.id)) continue;
      const sold = await tx.orderItem.findFirst({ where: { variantId: old.id }, select: { id: true } });
      if (sold) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id: old.id } });
    }
    return pid!;
  });
}

export async function deleteProduct(id: number): Promise<'deleted' | 'deactivated'> {
  const p = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!p) throw notFound();
  if (await prisma.orderItem.findFirst({ where: { productId: id }, select: { id: true } })) {
    await prisma.product.update({ where: { id }, data: { isActive: false } }); // keep order history intact
    return 'deactivated';
  }
  await prisma.product.delete({ where: { id } });
  return 'deleted';
}

export const productListWhere = (q: URLSearchParams): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = {};
  const text = q.get('q')?.trim();
  if (text) where.searchText = { contains: text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() };
  if (q.get('category')) where.categoryId = Number(q.get('category'));
  if (q.get('status') === 'active') where.isActive = true;
  if (q.get('status') === 'inactive') where.isActive = false;
  return where;
};

export const categorySchema = z.object({
  name: z.record(z.string().max(200)), image: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0), isActive: z.boolean().default(true), slug: z.string().max(70).optional(),
});

