'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/I18nProvider';
import { ApiError, errorMessage, fieldMessage } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth';
import { normalizePhone } from '@/lib/phone';
import { Field } from './Field';
import { safeNext } from '@/lib/client/safe-next';

export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.push(safeNext(next));
    } catch (x) {
      setErr(errorMessage(t, x));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field id="li-email" label={t('common.email')}><input id="li-email" type="email" inputMode="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field id="li-pw" label={t('common.password')}><input id="li-pw" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      <button type="submit" disabled={busy || !email || !password} className="btn-primary btn-block !py-3">{t('auth.submit_login')}</button>
      <p className="text-center text-sm text-taupe">{t('auth.no_account')} <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-mauve underline">{t('nav.register')}</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const t = useT();
  const router = useRouter();
  const { register } = useAuth();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = 'REQUIRED';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'invalid_string';
    if (f.phone && !normalizePhone(f.phone).valid) er.phone = 'INVALID_PHONE';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = 'WEAK_PASSWORD';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, password: f.password });
      router.push(safeNext(next));
    } catch (x) {
      if (x instanceof ApiError && x.code === 'VALIDATION') setErrors(x.fields);
      else setErr(errorMessage(t, x));
      setBusy(false);
    }
  }
  const m = (k: string) => (errors[k] === 'INVALID_PHONE' ? t('errors.INVALID_PHONE') : fieldMessage(t, errors[k]));
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field id="rg-name" label={t('common.name')} required error={m('name')}><input id="rg-name" autoComplete="name" className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={100} /></Field>
      <Field id="rg-email" label={t('common.email')} required error={m('email')}><input id="rg-email" type="email" inputMode="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={150} /></Field>
      <Field id="rg-phone" label={t('checkout.phone')} error={m('phone')} hint={t('checkout.phone_hint')}><input id="rg-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+670 7XXX XXXX" className={`input ${errors.phone ? 'input-error' : ''}`} value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={25} /></Field>
      <Field id="rg-pw" label={t('common.password')} required error={m('password')} hint={t('auth.password_hint')}><input id="rg-pw" type="password" autoComplete="new-password" className={`input ${errors.password ? 'input-error' : ''}`} value={f.password} onChange={(e) => set('password', e.target.value)} maxLength={128} /></Field>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary btn-block !py-3">{t('auth.submit_register')}</button>
      <p className="text-center text-sm text-taupe">{t('auth.have_account')} <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-mauve underline">{t('nav.login')}</Link></p>
    </form>
  );
}
