'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';
import { LOCALES, LOCALE_LABEL, LOCALE_NAME, type Locale } from '@/lib/i18n-shared';
import { useLocale, useT } from '@/components/I18nProvider';

/** TET | PT | EN | ID — persists in a cookie (and on the profile when signed in), then re-renders server content. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<Locale | null>(null);

  async function change(l: Locale) {
    if (l === locale || busy) return;
    setBusy(l);
    try {
      await api('/api/locale', { body: { locale: l } });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className={`inline-flex items-center rounded-full border border-cream-line bg-white p-0.5 ${className}`} role="group" aria-label={t('nav.language')}>
      {LOCALES.map((l) => (
        <button
          key={l} type="button" lang={l === 'tet' ? 'tet' : l} onClick={() => change(l)} aria-pressed={l === locale} title={LOCALE_NAME[l]}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors ${l === locale ? 'bg-mauve text-white' : 'text-taupe hover:bg-cream-deep'} ${busy === l ? 'opacity-60' : ''}`}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
