// Runtime-agnostic i18n helpers (safe for client components, middleware and server).
export const LOCALES = ['tet', 'pt', 'en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tet';
export const LOCALE_COOKIE = 'ec_lang';
export const LOCALE_LABEL: Record<Locale, string> = { tet: 'TET', pt: 'PT', en: 'EN', id: 'ID' };
export const LOCALE_NAME: Record<Locale, string> = { tet: 'Tetun', pt: 'Português', en: 'English', id: 'Bahasa Indonesia' };
export const INTL_LOCALE: Record<Locale, string> = { tet: 'pt-PT', pt: 'pt-PT', en: 'en-GB', id: 'id-ID' };

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

export type Dict = { [k: string]: string | Dict };

const FALLBACK: Locale[] = ['tet', 'en', 'pt', 'id'];

/** Resolve a translatable DB value ({tet,pt,en,id}) for a locale, falling back to Tetum first. */
export function loc(value: unknown, locale: Locale): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const o = value as Record<string, unknown>;
  for (const l of [locale, ...FALLBACK]) {
    const v = o[l];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

/** Keep only known languages, trimmed and non-empty. */
export function cleanI18n(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (input && typeof input === 'object') {
    for (const l of LOCALES) {
      const v = (input as Record<string, unknown>)[l];
      if (typeof v === 'string' && v.trim()) out[l] = v.trim();
    }
  }
  return out;
}

function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object') cur = cur[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** translate(dict, fallbackDict, 'checkout.title', {n: 3}) - "{n}" placeholders. Missing keys fall back, finally to the key. */
export function translate(dict: Dict, fallback: Dict, key: string, vars?: Record<string, string | number>): string {
  let s = lookup(dict, key) ?? lookup(fallback, key) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
