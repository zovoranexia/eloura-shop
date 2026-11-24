'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/client/api';
import { normalizePhone } from '@/lib/phone';
import { Field } from './Field';

export function ContactForm() {
  const t = useT();
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = 'REQUIRED';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'invalid_string';
    if (f.phone && !normalizePhone(f.phone).valid) er.phone = 'INVALID_PHONE';
    if (f.message.trim().length < 5) er.message = 'too_small';
    setErrors(er);
    if (Object.keys(er).length) return;
    setState('busy');
    try {
      await api('/api/contact', { body: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, message: f.message.trim(), website: f.website } });
      setState('done');
    } catch (x) {
      if (x instanceof ApiError && x.code === 'VALIDATION') setErrors(x.fields); else setErr(errorMessage(t, x));
      setState('idle');
    }
  }
  if (state === 'done') return <p role="status" className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900">{t('contact.sent')}</p>;
  const m = (k: string) => (errors[k] === 'INVALID_PHONE' ? t('errors.INVALID_PHONE') : errors[k] ? fieldMessage(t, errors[k]) : undefined);
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ct-name" label={t('common.name')} required error={m('name')}><input id="ct-name" className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={100} autoComplete="name" /></Field>
        <Field id="ct-email" label={t('common.email')} required error={m('email')}><input id="ct-email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={150} autoComplete="email" /></Field>
        <Field id="ct-phone" label={t('checkout.phone')} error={m('phone')} className="sm:col-span-2"><input id="ct-phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+670 7XXX XXXX" maxLength={25} autoComplete="tel" /></Field>
        <Field id="ct-msg" label={t('contact.message')} required error={m('message')} className="sm:col-span-2"><textarea id="ct-msg" className={`input min-h-32 ${errors.message ? 'input-error' : ''}`} value={f.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} /></Field>
      </div>
      {/* honeypot: invisible to people, tempting to bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label></div>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      <button type="submit" disabled={state === 'busy'} className="btn-primary"><Send size={15} />{t('contact.send')}</button>
    </form>
  );
}
