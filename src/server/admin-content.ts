import 'server-only';
import { z } from 'zod';
import { cleanI18n } from '@/lib/i18n-shared';
import { parseDiliLocal } from '@/lib/time';

const i18n = z.record(z.string().max(5000));
const when = z.string().max(20).optional().nullable().refine((v) => !v || !!parseDiliLocal(v), 'INVALID');

export const bannerSchema = z.object({
  placement: z.enum(['HERO', 'PROMO']).default('HERO'),
  image: z.string().max(300).regex(/^(\/media\/|\/images\/)/, 'INVALID'),
  badge: i18n.optional(), title: i18n.refine((t) => Object.values(t).some((x) => x.trim()), 'REQUIRED'), highlight: i18n.optional(), subtitle: i18n.optional(), ctaLabel: i18n.optional(),
  ctaUrl: z.string().max(200).regex(/^\/[\w\-/?=&%.#]*$/, 'INVALID').default('/shop'),
  sortOrder: z.number().int().min(0).max(99).default(0), isActive: z.boolean().default(true),
  startsAt: when, endsAt: when,
});
export const bannerData = (b: z.infer<typeof bannerSchema>) => ({
  placement: b.placement, image: b.image, badge: cleanI18n(b.badge), title: cleanI18n(b.title), highlight: cleanI18n(b.highlight),
  subtitle: cleanI18n(b.subtitle), ctaLabel: cleanI18n(b.ctaLabel), ctaUrl: b.ctaUrl, sortOrder: b.sortOrder, isActive: b.isActive,
  startsAt: b.startsAt ? parseDiliLocal(b.startsAt) : null, endsAt: b.endsAt ? parseDiliLocal(b.endsAt) : null,
});

export const pageSchema = z.object({
  title: i18n, body: i18n, isPublished: z.boolean().default(true),
});

const url = z.string().trim().max(200).refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), 'INVALID');
const bankField = z.string().trim().max(120).optional().or(z.literal(''));
export const methodSchema = z.object({
  enabled: z.boolean(), sortOrder: z.number().int().min(0).max(99),
  name: i18n, instructions: i18n,
  config: z.object({
    accountHolder: bankField, accountNumber: z.string().trim().max(40).optional().or(z.literal('')), bankName: bankField, branch: bankField, swift: z.string().trim().max(20).optional().or(z.literal('')),
    merchantName: bankField, merchantNumber: z.string().trim().max(20).optional().or(z.literal('')),
    qrImage: z.string().max(300).regex(/^(\/media\/|\/images\/)/, 'INVALID').optional().or(z.literal('')),
  }),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(2).max(80), codEnabled: z.boolean(), deliveryFeeCents: z.number().int().min(0).max(100_000),
  freeOverCents: z.number().int().min(0).max(10_000_000).nullable(), etaText: z.string().trim().max(40).nullable().optional(),
  isActive: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional(),
});

export const settingsSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1).max(80), tagline: i18n, email: z.string().trim().email().max(150), phone: z.string().trim().max(30), whatsapp: z.string().trim().max(30),
    address: z.string().trim().max(200), instagram: url, facebook: url, tiktok: url, returnDays: z.number().int().min(0).max(90),
  }),
  commerce: z.object({
    paymentDeadlineHours: z.number().int().min(1).max(168), codMinCents: z.number().int().min(0).max(1_000_000), codMaxCents: z.number().int().min(0).max(1_000_000),
    codFeeCents: z.number().int().min(0).max(100_000), codAutoBlockAfter: z.number().int().min(0).max(20), lowStockThreshold: z.number().int().min(0).max(1000),
    maxQtyPerLine: z.number().int().min(1).max(50), codTermsVersion: z.string().trim().min(1).max(20),
  }).refine((c) => c.codMaxCents >= c.codMinCents, 'COD_RANGE'),
});
