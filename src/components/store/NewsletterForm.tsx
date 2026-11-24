'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { api, errorMessage } from '@/lib/client/api';

export function NewsletterForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setState('busy');
    try {
      await api('/api/newsletter', { body: { email } });
      setState('done');
      setEmail('');
    } catch (x) {
      setErr(errorMessage(t, x));
      setState('idle');
    }
  }
  if (state === 'done') return <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-cream">{t('footer.newsletter_ok')}</p>;
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="nl-email" className="sr-only">{t('footer.newsletter_placeholder')}</label>
      <div className="flex items-center rounded-full bg-white p-1 pl-4">
        <input id="nl-email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('footer.newsletter_placeholder')} className="min-w-0 flex-1 bg-transparent text-sm text-espresso outline-none placeholder:text-taupe/70" />
        <button type="submit" disabled={state === 'busy'} aria-label={t('footer.newsletter_btn')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mauve text-white hover:bg-mauve-dark disabled:opacity-60"><Send size={16} /></button>
      </div>
      {err ? <p role="alert" className="mt-2 text-xs text-red-300">{err}</p> : null}
    </form>
  );
}
