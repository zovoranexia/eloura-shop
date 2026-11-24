import 'server-only';
import { prisma } from '@/lib/db';

export const DEFAULT_SETTINGS = {
  store: {
    name: 'Eloura Chic',
    tagline: { tet: 'Moda & Asesóriu feminina', pt: 'Moda e acessórios femininos', en: 'Fashion & Accessories', id: 'Fashion & Aksesori wanita' } as Record<string, string>,
    email: 'hello@eloura.example',
    phone: '+670 7700 0000',
    whatsapp: '+670 7700 0000',
    address: 'Dili, Timor-Leste',
    instagram: '', facebook: '', tiktok: '',
    returnDays: 7,
  },
  commerce: {
    /** non-COD orders must receive a payment proof within this many hours or they are cancelled */
    paymentDeadlineHours: 24,
    /** COD is allowed only for order totals between these caps (cents) */
    codMinCents: 0,
    codMaxCents: 15000,
    /** optional COD handling fee (cents) */
    codFeeCents: 0,
    /** auto-flag a customer for COD after this many refused COD deliveries (0 = never) */
    codAutoBlockAfter: 2,
    /** bump when the COD terms text changes; stored with each accepted order */
    codTermsVersion: 'v1',
    lowStockThreshold: 3,
    maxQtyPerLine: 10,
  },
};
export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

const cache = new Map<string, { at: number; v: unknown }>();
const TTL = 15_000;

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v as Settings[K];
  const row = await prisma.storeSetting.findUnique({ where: { key } });
  const v = { ...DEFAULT_SETTINGS[key], ...((row?.value as object) ?? {}) } as Settings[K];
  cache.set(key, { at: Date.now(), v });
  return v;
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  await prisma.storeSetting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });
  cache.delete(key);
}

export async function getAllSettings(): Promise<Settings> {
  const [store, commerce] = await Promise.all([getSetting('store'), getSetting('commerce')]);
  return { store, commerce };
}
