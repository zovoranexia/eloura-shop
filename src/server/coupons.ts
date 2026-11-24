import 'server-only';
import type { Coupon } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';

export async function findCoupon(code: string): Promise<Coupon | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  return prisma.coupon.findUnique({ where: { code: c } });
}

/** Validates a coupon against the basket subtotal. Throws an AppError with a translatable code. */
export function assertCouponUsable(c: Coupon | null, subtotalCents: number): Coupon {
  const now = new Date();
  if (!c || !c.isActive) throw new AppError(422, 'COUPON_INVALID');
  if (c.startsAt && c.startsAt > now) throw new AppError(422, 'COUPON_NOT_STARTED');
  if (c.endsAt && c.endsAt < now) throw new AppError(422, 'COUPON_EXPIRED');
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new AppError(422, 'COUPON_EXHAUSTED');
  if (subtotalCents < c.minOrderCents) throw new AppError(422, 'COUPON_MIN_ORDER', { minOrderCents: c.minOrderCents });
  return c;
}

export function couponDiscount(c: Coupon, subtotalCents: number): number {
  let d = c.type === 'PERCENT' ? Math.floor((subtotalCents * c.value) / 100) : c.value;
  if (c.maxDiscountCents != null) d = Math.min(d, c.maxDiscountCents);
  return Math.max(0, Math.min(d, subtotalCents));
}
