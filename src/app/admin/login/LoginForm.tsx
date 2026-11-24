'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api, errorMessage } from '@/lib/client/api';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/i18n-shared';
import { cn } from '@/lib/client/cn';
import { Spinner } from '@/components/admin/ui';

export function LoginForm({ next }: { next: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: { isStaff: boolean } | null }>('/api/auth/login', { body: { email, password } });
      if (!user?.isStaff) {
        await api('/api/auth/logout', { method: 'POST', body: {} });
        setError(t('admin.login.notStaff'));
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally { setBusy(false); }
  }
  async function setLocale(l: Locale) {
    await api('/api/locale', { body: { locale: l } });
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream to-cream-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo-full.png" alt="Eloura Chic" className="mx-auto h-40 w-auto" />
        </div>
        <form onSubmit={submit} className="card space-y-4 p-7" noValidate>
          <div className="text-center">
            <h1 className="text-3xl font-medium">{t('admin.login.title')}</h1>
            <p className="mt-1 text-sm text-taupe">{t('admin.login.subtitle')}</p>
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
          <div>
            <label className="label" htmlFor="email">{t('common.email')}</label>
            <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">{t('common.password')}</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary btn-block" disabled={busy || !email || !password}>{busy ? <Spinner className="!text-white" /> : <Lock size={15} />} {t('admin.login.submit')}</button>
          <p className="text-center text-xs text-taupe">{t('admin.login.secure')}</p>
        </form>
        <div className="mt-5 flex justify-center gap-1.5">
          {LOCALES.map((l) => (
            <button key={l} type="button" onClick={() => setLocale(l)} className={cn('rounded-full px-3 py-1 text-xs font-semibold', l === locale ? 'bg-mauve text-white' : 'text-taupe hover:bg-cream-deep')}>{LOCALE_LABEL[l]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
