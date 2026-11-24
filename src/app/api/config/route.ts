import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n';
import { DILI_POSTS } from '@/lib/geo';
import { getSetting } from '@/server/settings';
import { allMethods, isOffered, isConfigured } from '@/server/payments';

export const dynamic = 'force-dynamic';

/** Public storefront configuration: store info, delivery zones, COD rules and the offered payment methods. */
export const GET = route({}, async ({ locale }) => {
  const [store, commerce, zones, methods] = await Promise.all([
    getSetting('store'), getSetting('commerce'),
    prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { sucos: { where: { isActive: true }, orderBy: { name: 'asc' } } } }),
    allMethods(),
  ]);
  const dili = zones.filter((z) => z.municipality === 'dili');
  return {
    store: { ...store, tagline: loc(store.tagline, locale) },
    commerce: { currency: 'USD', maxQtyPerLine: commerce.maxQtyPerLine, paymentDeadlineHours: commerce.paymentDeadlineHours, codMinCents: commerce.codMinCents, codMaxCents: commerce.codMaxCents, codFeeCents: commerce.codFeeCents, codTermsVersion: commerce.codTermsVersion },
    municipalities: [...new Map(zones.map((z) => [z.municipality, z])).values()].map((z) => ({
      key: z.municipality, name: z.municipality === 'dili' ? 'Dili' : z.name, deliveryFeeCents: z.deliveryFeeCents, freeOverCents: z.freeOverCents, etaText: z.etaText,
    })),
    dili: {
      posts: dili.map((z) => ({
        key: z.adminPost, name: z.name, codEnabled: z.codEnabled, deliveryFeeCents: z.deliveryFeeCents, freeOverCents: z.freeOverCents, etaText: z.etaText,
        sucos: z.sucos.map((s) => ({ name: s.name, codEnabled: s.codEnabled })),
      })),
      freeOverCents: dili.length ? Math.min(...dili.map((z) => z.freeOverCents ?? Infinity).filter((n) => Number.isFinite(n)), Infinity) : null,
    },
    diliPostNames: DILI_POSTS,
    paymentMethods: methods.filter(isOffered).map((m) => ({ key: m.key, name: loc(m.name, locale), demo: m.key !== 'COD' && !isConfigured(m) })),
  };
});
