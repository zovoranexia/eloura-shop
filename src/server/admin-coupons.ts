import 'server-only';
import { z } from 'zod';
import { cleanI18n } from '@/lib/i18n-shared';
import { parseDiliLocal } from '@/lib/time';

const when = z.string().max(20).optional().nullable().refine((v) => !v || !!parseDiliLocal(v), 'INVALID');

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'INVALID'),
  description: z.record(z.string().max(300)).optional(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().min(1).max(10_000_000),
  minOrderCents: z.number().int().min(0).max(10_000_000).default(0),
  maxDiscountCents: z.number().int().min(1).max(10_000_000).nullable().optional(),
  usageLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  /** "YYYY-MM-DDTHH:mm" in Dili time */
  startsAt: when, endsAt: when,
  isActive: z.boolean().default(true),
}).superRefine((c, ctx) => {
  if (c.type === 'PERCENT' && c.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'PERCENT_MAX_100' });
});

export const couponData = (c: z.infer<typeof couponSchema>) => ({
  code: c.code, description: cleanI18n(c.description), type: c.type, value: c.value, minOrderCents: c.minOrderCents,
  maxDiscountCents: c.maxDiscountCents ?? null, usageLimit: c.usageLimit ?? null,
  startsAt: c.startsAt ? parseDiliLocal(c.startsAt) : null, endsAt: c.endsAt ? parseDiliLocal(c.endsAt) : null, isActive: c.isActive,
});
