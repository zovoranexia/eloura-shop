import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { cleanI18n } from '@/lib/i18n-shared';
import { audit } from '@/lib/audit';
import { uniqueSlug, categorySchema } from '@/server/admin-catalog';

export const GET = route({ anyPerm: ['categories.manage', 'products.view'] }, async () =>
  (await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: true } } } }))
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, image: c.image, sortOrder: c.sortOrder, isActive: c.isActive, productCount: c._count.products })));

export const POST = route({ perm: 'categories.manage' }, async (ctx) => {
  const b = await ctx.body(categorySchema);
  const name = cleanI18n(b.name);
  if (!name.tet && !name.en) throw new AppError(422, 'VALIDATION', { name: 'REQUIRED' });
  const c = await prisma.category.create({ data: { slug: await uniqueSlug('category', b.slug || name.en || name.tet), name, image: b.image || null, sortOrder: b.sortOrder, isActive: b.isActive } });
  await audit(ctx, 'category.create', 'category', c.id);
  return c;
});
