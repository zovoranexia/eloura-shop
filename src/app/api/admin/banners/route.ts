import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { bannerData, bannerSchema } from '@/server/admin-content';

export const GET = route({ perm: 'banners.manage' }, async () => prisma.banner.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] }));

export const POST = route({ perm: 'banners.manage' }, async (ctx) => {
  const b = await prisma.banner.create({ data: bannerData(await ctx.body(bannerSchema)) });
  await audit(ctx, 'banner.create', 'banner', b.id);
  return b;
});
