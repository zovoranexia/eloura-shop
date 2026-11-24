import { z } from 'zod';
import { route } from '@/lib/api';
import { MUNICIPALITY_KEYS, DILI_POST_KEYS } from '@/lib/geo';
import { METHOD_KEYS } from '@/server/payments';
import { createOrder } from '@/server/orders';

const schema = z.object({
  items: z.array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(50) })).min(1).max(30),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150).optional().or(z.literal('')),
  phone: z.string().trim().min(7).max(25),
  municipality: z.string().refine((m) => MUNICIPALITY_KEYS.includes(m), 'INVALID'),
  adminPost: z.string().trim().max(40).optional().or(z.literal('')),
  suco: z.string().trim().max(80).optional().or(z.literal('')),
  street: z.string().trim().min(3).max(200),
  addressNotes: z.string().trim().max(300).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  paymentMethod: z.enum(METHOD_KEYS as [string, ...string[]]),
  coupon: z.string().trim().max(40).optional().or(z.literal('')),
  acceptCodTerms: z.boolean().optional(),
}).superRefine((o, ctx) => {
  if (o.municipality === 'dili' && !DILI_POST_KEYS.includes(o.adminPost || '')) ctx.addIssue({ code: 'custom', path: ['adminPost'], message: 'REQUIRED' });
});

export const POST = route({ limit: ['checkout', 15, 10 * 60_000] }, async (ctx) => {
  const b = await ctx.body(schema);
  const rawKey = ctx.req.headers.get('idempotency-key') ?? '';
  const idempotencyKey = /^[A-Za-z0-9_-]{16,64}$/.test(rawKey) ? rawKey : null;
  return createOrder({ user: ctx.user, locale: ctx.locale, idempotencyKey, input: { ...b, paymentMethod: b.paymentMethod as never } });
});
