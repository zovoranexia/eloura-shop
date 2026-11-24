import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { deleteProduct, productSchema, saveProduct } from '@/server/admin-catalog';

export const GET = route<{ id: string }>({ perm: 'products.view' }, async (ctx) => {
  const p = await prisma.product.findUnique({
    where: { id: Number(ctx.params.id) },
    include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, variants: { orderBy: { id: 'asc' } } },
  });
  if (!p) throw notFound();
  return {
    id: p.id, slug: p.slug, sku: p.sku, categoryId: p.categoryId, name: p.name, description: p.description, priceCents: p.priceCents,
    compareAtCents: p.compareAtCents, isActive: p.isActive, isFeatured: p.isFeatured, images: p.images.map((i) => i.url),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, colorHex: v.colorHex, stock: v.stock, priceCents: v.priceCents, isActive: v.isActive })),
  };
});

export const PUT = route<{ id: string }>({ perm: 'products.update' }, async (ctx) => {
  const id = await saveProduct(await ctx.body(productSchema), Number(ctx.params.id));
  await audit(ctx, 'product.update', 'product', id);
  return { id };
});

export const DELETE = route<{ id: string }>({ perm: 'products.delete' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const r = await deleteProduct(id);
  await audit(ctx, `product.${r}`, 'product', id);
  return { ok: true, result: r };
});
