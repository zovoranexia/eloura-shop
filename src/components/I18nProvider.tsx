'use client';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { translate, type Dict, type Locale } from '@/lib/i18n-shared';

type Ctx = { locale: Locale; t: (key: string, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);

/**
 * Client-side translator. `dict` is the merged dictionary for the active locale, `fallback` the Tetum one
 * (missing keys fall back to Tetum, then to the key itself).
 */
export function I18nProvider({ locale, dict, fallback, children }: { locale: Locale; dict: Dict; fallback: Dict; children: ReactNode }) {
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(dict, fallback, key, vars), [dict, fallback]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside <I18nProvider>');
  return c;
}
export const useT = () => useI18n().t;
export const useLocale = () => useI18n().locale;
