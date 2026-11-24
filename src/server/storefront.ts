import 'server-only';
import { prisma } from '@/lib/db';
import { loc, type Locale } from '@/lib/i18n';
import { getSetting } from './settings';
import { allMethods, isOffered, isConfigured } from './payments';

/** Storefront-wide configuration handed to the client (same shape as GET /api/config). */
export async function getStoreConfig(locale: Locale) {
  const [store, commerce, zones, methods] = await Promise.all([
    getSetting('store'),
    getSetting('commerce'),
    prisma.deliveryZone.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { sucos: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    }),
    allMethods(),
  ]);
  const dili = zones.filter((z) => z.municipality === 'dili');
  const freeList = dili.map((z) => z.freeOverCents).filter((n): n is number => n != null);
  return {
    store: {
      name: store.name, tagline: loc(store.tagline, locale), email: store.email, phone: store.phone, whatsapp: store.whatsapp, address: store.address,
      instagram: store.instagram, facebook: store.facebook, tiktok: store.tiktok, returnDays: store.returnDays,
    },
    commerce: {
      maxQtyPerLine: commerce.maxQtyPerLine, paymentDeadlineHours: commerce.paymentDeadlineHours, codMinCents: commerce.codMinCents,
      codMaxCents: commerce.codMaxCents, codFeeCents: commerce.codFeeCents,
    },
    municipalities: [...new Map(zones.map((z) => [z.municipality, z])).values()].map((z) => ({
      key: z.municipality, name: z.municipality === 'dili' ? 'Dili' : z.name, deliveryFeeCents: z.deliveryFeeCents, freeOverCents: z.freeOverCents, etaText: z.etaText,
    })),
    diliPosts: dili.map((z) => ({
      key: z.adminPost ?? '', name: z.name, codEnabled: z.codEnabled, deliveryFeeCents: z.deliveryFeeCents, freeOverCents: z.freeOverCents, etaText: z.etaText,
      sucos: z.sucos.map((s) => ({ name: s.name, codEnabled: s.codEnabled })),
    })),
    diliFreeOverCents: freeList.length ? Math.min(...freeList) : null,
    paymentMethods: methods.filter(isOffered).map((m) => ({ key: m.key, name: loc(m.name, locale), demo: m.key !== 'COD' && !isConfigured(m) })),
  };
}
export type StoreConfig = Awaited<ReturnType<typeof getStoreConfig>>;

export async function getBanners(placement: 'HERO' | 'PROMO', locale: Locale) {
  const now = new Date();
  const rows = await prisma.banner.findMany({
    where: {
      isActive: true, placement,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return rows.map((b) => ({
    id: b.id, image: b.image, ctaUrl: b.ctaUrl, badge: loc(b.badge, locale), title: loc(b.title, locale), highlight: loc(b.highlight, locale),
    subtitle: loc(b.subtitle, locale), ctaLabel: loc(b.ctaLabel, locale),
  }));
}
export type StoreBanner = Awaited<ReturnType<typeof getBanners>>[number];

export async function getCmsPage(slug: string, locale: Locale) {
  const p = await prisma.cmsPage.findUnique({ where: { slug } });
  if (!p || !p.isPublished) return null;
  return { slug: p.slug, title: loc(p.title, locale), body: loc(p.body, locale), updatedAt: p.updatedAt };
}

/** Order list for the signed-in customer's account page. */
export async function listCustomerOrders(userId: number, locale: Locale) {
  const rows = await prisma.order.findMany({
    where: { userId }, orderBy: { id: 'desc' }, take: 100,
    include: { items: { orderBy: { id: 'asc' } } },
  });
  return rows.map((o) => ({
    id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(), itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    items: o.items.slice(0, 4).map((i) => ({ name: loc(i.name, locale), image: i.image, qty: i.qty })),
  }));
}

export async function listCustomerAddresses(userId: number) {
  const rows = await prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { id: 'desc' }] });
  return rows.map((a) => ({
    id: a.id, label: a.label ?? '', recipient: a.recipient, phone: a.phone, municipality: a.municipality, adminPost: a.adminPost ?? '', suco: a.suco ?? '',
    street: a.street, notes: a.notes ?? '', isDefault: a.isDefault,
  }));
}
export type CustomerAddress = Awaited<ReturnType<typeof listCustomerAddresses>>[number];

export async function sitemapEntries() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  return { products, categories };
}
