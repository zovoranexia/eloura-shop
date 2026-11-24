'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { api, errorMessage } from '@/lib/client/api';
import { Field } from './Field';

/** Guest order lookup: order code + the phone number or e-mail used at checkout. */
export function TrackForm() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (code.trim().length < 6 || contact.trim().length < 5) return setErr(t('errors.VALIDATION'));
    setBusy(true);
    try {
      const r = await api<{ code: string; token: string }>('/api/orders/track', { body: { code: code.trim(), contact: contact.trim() } });
      router.push(`/order/${r.code}?t=${encodeURIComponent(r.token)}`);
    } catch (x) {
      setErr(errorMessage(t, x));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field id="tr-code" label={t('track.code')} hint={t('track.code_hint')}><input id="tr-code" className="input uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="EC-261124-XXXX" autoComplete="off" maxLength={30} /></Field>
      <Field id="tr-contact" label={t('track.contact')} hint={t('track.contact_hint')}><input id="tr-contact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="off" maxLength={150} /></Field>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary btn-block"><Search size={16} />{t('track.submit')}</button>
    </form>
  );
}
