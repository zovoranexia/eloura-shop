import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { couponData, couponSchema } from '@/server/admin-coupons';

export const GET = route({ perm: 'coupons.manage' }, async () => prisma.coupon.findMany({ orderBy: { id: 'desc' } }));

export const POST = route({ perm: 'coupons.manage' }, async (ctx) => {
  const c = await prisma.coupon.create({ data: couponData(await ctx.body(couponSchema)) });
  await audit(ctx, 'coupon.create', 'coupon', c.id, { code: c.code });
  return c;
});
