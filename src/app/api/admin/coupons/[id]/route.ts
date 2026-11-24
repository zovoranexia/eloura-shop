import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { couponData, couponSchema } from '@/server/admin-coupons';

export const PUT = route<{ id: string }>({ perm: 'coupons.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  const c = await prisma.coupon.update({ where: { id }, data: couponData(await ctx.body(couponSchema)) });
  await audit(ctx, 'coupon.update', 'coupon', id);
  return c;
});

export const DELETE = route<{ id: string }>({ perm: 'coupons.manage' }, async (ctx) => {
  const id = Number(ctx.params.id);
  await prisma.coupon.delete({ where: { id } });
  await audit(ctx, 'coupon.delete', 'coupon', id);
  return { ok: true };
});
