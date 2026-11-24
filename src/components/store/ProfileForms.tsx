'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth';
import { LOCALES, LOCALE_NAME, type Locale } from '@/lib/i18n-shared';
import { normalizePhone } from '@/lib/phone';
import type { PublicUser } from '@/lib/client/types';
import { Field } from './Field';

export function ProfileForm() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [locale, setLocale] = useState<Locale>((user?.locale as Locale) ?? 'tet');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = 'REQUIRED';
    if (phone && !normalizePhone(phone).valid) er.phone = 'INVALID_PHONE';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await api<{ user: PublicUser }>('/api/auth/me', { method: 'PATCH', body: { name: name.trim(), phone: phone.trim(), locale } });
      await api('/api/locale', { body: { locale } }); // keep the cookie in sync with the profile
      setUser(r.user);
      toast.success(t('common.saved'));
      router.refresh();
    } catch (x) {
      if (x instanceof ApiError && x.code === 'VALIDATION') setErrors(x.fields); else toast.error(errorMessage(t, x));
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-white p-6 shadow-card" noValidate>
      <h2 className="font-serif text-2xl">{t('account.profile_title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-n" label={t('common.name')} required error={errors.name ? fieldMessage(t, errors.name) : undefined}><input id="pf-n" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
        <Field id="pf-e" label={t('common.email')}><input id="pf-e" className="input" value={user?.email ?? ''} disabled /></Field>
        <Field id="pf-p" label={t('checkout.phone')} error={errors.phone ? t('errors.INVALID_PHONE') : undefined} hint={t('checkout.phone_hint')}><input id="pf-p" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={25} placeholder="+670 7XXX XXXX" /></Field>
        <Field id="pf-l" label={t('common.language')}>
          <select id="pf-l" className="input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>{LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAME[l]}</option>)}</select>
        </Field>
      </div>
      {user?.codBlocked ? <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('account.cod_blocked_note')}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">{t('common.save')}</button>
    </form>
  );
}

export function PasswordForm() {
  const t = useT();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api('/api/auth/password', { body: { current, next } });
      toast.success(t('account.password_changed'));
      setCurrent(''); setNext('');
    } catch (x) { setErr(x instanceof ApiError && x.code === 'VALIDATION' ? t('errors.WEAK_PASSWORD') : errorMessage(t, x)); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-white p-6 shadow-card">
      <h2 className="font-serif text-2xl">{t('account.password_title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pw-c" label={t('account.password_current')}><input id="pw-c" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field id="pw-n" label={t('account.password_new')} hint={t('auth.password_hint')}><input id="pw-n" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      </div>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      <button type="submit" disabled={busy || !current || !next} className="btn-outline">{t('account.password_submit')}</button>
    </form>
  );
}
