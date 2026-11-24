import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { bannerData, bannerSchema } from '@/server/admin-content';

export const PUT = route<{ id: string }>({ perm: 'banners.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const b = await prisma.banner.update({ where: { id }, data: bannerData(await ctx.body(bannerSchema)) });
  await audit(ctx, 'banner.update', 'banner', id);
  return b;
});

export const DELETE = route<{ id: string }>({ perm: 'banners.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  await prisma.banner.delete({ where: { id } });
  await audit(ctx, 'banner.delete', 'banner', id);
  return { ok: true };
});
