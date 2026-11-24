import { z } from 'zod';
import { route } from '@/lib/api';
import { quote } from '@/server/orders';

const schema = z.object({
  items: z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(50) })).max(30),
  municipality: z.string().max(30).optional(), adminPost: z.string().max(40).optional(), suco: z.string().max(80).optional(),
  street: z.string().max(200).optional(), phone: z.string().max(25).optional(), coupon: z.string().max(40).optional(),
});

/** Prices, stock, discount, delivery fee and payment-method availability - always computed on the server. */
export const POST = route({ limit: ['quote', 120, 60_000] }, async (ctx) => {
  const b = await ctx.body(schema);
  return quote({ ...b, userId: ctx.user?.id }, ctx.locale);
});
