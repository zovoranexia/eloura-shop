import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, notFound } from '@/lib/errors';
import { cleanI18n } from '@/lib/i18n-shared';
import { audit } from '@/lib/audit';
import { categorySchema, uniqueSlug } from '@/server/admin-catalog';

export const PUT = route<{ id: string }>({ perm: 'categories.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const b = await ctx.body(categorySchema);
  const cur = await prisma.category.findUnique({ where: { id } });
  if (!cur) throw notFound();
  const nm = cleanI18n(b.name);
  if (!nm.tet && !nm.en) throw new AppError(422, 'VALIDATION', { name: 'REQUIRED' });
  const slug = b.slug && b.slug !== cur.slug ? await uniqueSlug('category', b.slug, id) : cur.slug;
  const c = await prisma.category.update({ where: { id }, data: { slug, name: cleanI18n(b.name), image: b.image || null, sortOrder: b.sortOrder, isActive: b.isActive } });
  await audit(ctx, 'category.update', 'category', id);
  return c;
});

export const DELETE = route<{ id: string }>({ perm: 'categories.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  await prisma.category.delete({ where: { id } }); // products stay, just uncategorised (FK SetNull)
  await audit(ctx, 'category.delete', 'category', id);
  return { ok: true };
});
