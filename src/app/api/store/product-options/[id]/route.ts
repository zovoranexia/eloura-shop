import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';

/** Variants of an active product (size / colour / stock) for the quick-add dialog on product cards. */
export const GET = route<{ id: string }>({}, async (ctx) => {
  const id = Number(ctx.params.id);
  const p = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: { priceCents: true, variants: { where: { isActive: true }, orderBy: { id: 'asc' }, select: { id: true, size: true, color: true, colorHex: true, stock: true, priceCents: true } } },
  });
  if (!p) throw notFound();
  return { variants: p.variants.map((v) => ({ ...v, priceCents: v.priceCents ?? p.priceCents })) };
});
