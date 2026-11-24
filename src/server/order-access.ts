import 'server-only';
import crypto from 'node:crypto';
import type { Ctx } from '@/lib/api';
import { forbidden, notFound } from '@/lib/errors';
import { findOrderByCode, type OrderFull } from './orders';

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** A customer may open an order when signed in as its owner, or with the secret token returned at checkout / tracking. */
export async function loadOrderFor(ctx: Ctx<{ code: string }>): Promise<OrderFull> {
  const o = await findOrderByCode(ctx.params.code);
  if (!o) throw notFound('ORDER_NOT_FOUND');
  const token = ctx.req.nextUrl.searchParams.get('t') || ctx.req.headers.get('x-order-token') || '';
  if (ctx.user && o.userId === ctx.user.id) return o;
  if (token && safeEqual(token, o.accessToken)) return o;
  throw forbidden();
}
