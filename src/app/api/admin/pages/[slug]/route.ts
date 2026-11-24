import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { cleanI18n } from '@/lib/i18n-shared';
import { audit } from '@/lib/audit';
import { pageSchema } from '@/server/admin-content';
import { revalidatePath } from 'next/cache';

export const PUT = route<{ slug: string }>({ perm: 'cms.manage' }, async (ctx) => {
  const slug = ctx.params.slug;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new AppError(422, 'VALIDATION', { slug: 'INVALID' });
  const b = await ctx.body(pageSchema);
  const data = { title: cleanI18n(b.title), body: cleanI18n(b.body), isPublished: b.isPublished };
  const p = await prisma.cmsPage.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  await audit(ctx, 'cms.update', 'page', slug);
  revalidatePath(`/page/${slug}`);
  return p;
});
