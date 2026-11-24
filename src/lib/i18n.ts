import { cookies } from 'next/headers';
import tet from '@/messages/tet.json';
import pt from '@/messages/pt.json';
import en from '@/messages/en.json';
import id from '@/messages/id.json';
import adminTet from '@/messages/admin/tet.json';
import adminPt from '@/messages/admin/pt.json';
import adminEn from '@/messages/admin/en.json';
import adminId from '@/messages/admin/id.json';
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, loc, translate, cleanI18n, type Locale, type Dict } from './i18n-shared';

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, loc, translate, cleanI18n };
export type { Locale, Dict };

const STORE = { tet, pt, en, id } as unknown as Record<Locale, Dict>;
const ADMIN = { tet: adminTet, pt: adminPt, en: adminEn, id: adminId } as unknown as Record<Locale, Dict>;

/** Merged dictionary: storefront messages (+ `admin` namespace for the dashboard). Missing keys fall back to Tetum, then the key. */
export function getDictionary(locale: Locale, opts: { admin?: boolean } = {}): Dict {
  return opts.admin ? { ...STORE[locale], admin: ADMIN[locale] } : STORE[locale];
}
export function getFallbackDictionary(opts: { admin?: boolean } = {}): Dict {
  return opts.admin ? { ...STORE.tet, admin: ADMIN.tet } : STORE.tet;
}

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Server-side translator bound to the request locale. */
export async function getT(opts: { admin?: boolean } = {}) {
  const locale = await getLocale();
  const dict = getDictionary(locale, opts);
  const fb = getFallbackDictionary(opts);
  return { locale, dict, t: (key: string, vars?: Record<string, string | number>) => translate(dict, fb, key, vars) };
}

/** Translator for a given locale without a request (emails, background jobs). */
export function translatorFor(locale: Locale, opts: { admin?: boolean } = {}) {
  const dict = getDictionary(locale, opts);
  const fb = getFallbackDictionary(opts);
  return (key: string, vars?: Record<string, string | number>) => translate(dict, fb, key, vars);
}
