'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, errorMessage, fieldMessage } from '@/lib/client/api';
import { useStoreConfig } from '@/lib/client/store-config';
import type { CustomerAddress } from '@/lib/client/types';
import { normalizePhone } from '@/lib/phone';
import { Field } from './Field';

type Draft = Omit<CustomerAddress, 'id'> & { id?: number };
const BLANK: Draft = { label: '', recipient: '', phone: '', municipality: '', adminPost: '', suco: '', street: '', notes: '', isDefault: false };

function AddressForm({ initial, onDone, onCancel }: { initial: Draft; onDone: () => void; onCancel: () => void }) {
  const t = useT();
  const toast = useToast();
  const config = useStoreConfig();
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const post = config.diliPosts.find((p) => p.key === d.adminPost);
  const isDili = d.municipality === 'dili';
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((c) => ({ ...c, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (d.recipient.trim().length < 2) er.recipient = 'REQUIRED';
    if (!normalizePhone(d.phone).valid) er.phone = 'INVALID_PHONE';
    if (!d.municipality) er.municipality = 'REQUIRED';
    if (isDili && !d.adminPost) er.adminPost = 'REQUIRED';
    if (d.street.trim().length < 3) er.street = 'REQUIRED';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { label: d.label, recipient: d.recipient.trim(), phone: d.phone.trim(), municipality: d.municipality, adminPost: d.adminPost, suco: d.suco, street: d.street.trim(), notes: d.notes, isDefault: d.isDefault };
      if (d.id) await api(`/api/account/addresses/${d.id}`, { method: 'PUT', body }); else await api('/api/account/addresses', { body });
      toast.success(t('common.saved'));
      onDone();
    } catch (x) {
      if (x instanceof ApiError && x.code === 'VALIDATION') setErrors(x.fields); else toast.error(errorMessage(t, x));
    } finally { setBusy(false); }
  }
  const m = (k: string) => (errors[k] === 'INVALID_PHONE' ? t('errors.INVALID_PHONE') : errors[k] ? fieldMessage(t, errors[k]) : undefined);
  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-white p-6 shadow-card" noValidate>
      <h2 className="font-serif text-2xl">{d.id ? t('account.address_edit') : t('account.address_new')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ad-label" label={t('account.address_label')}><input id="ad-label" className="input" value={d.label} onChange={(e) => set('label', e.target.value)} maxLength={40} placeholder={t('account.address_label_ph')} /></Field>
        <Field id="ad-rec" label={t('account.address_recipient')} required error={m('recipient')}><input id="ad-rec" className={`input ${errors.recipient ? 'input-error' : ''}`} value={d.recipient} onChange={(e) => set('recipient', e.target.value)} maxLength={100} /></Field>
        <Field id="ad-phone" label={t('checkout.phone')} required error={m('phone')}><input id="ad-phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+670 7XXX XXXX" maxLength={25} /></Field>
        <Field id="ad-mun" label={t('checkout.municipality')} required error={m('municipality')}>
          <select id="ad-mun" className={`input ${errors.municipality ? 'input-error' : ''}`} value={d.municipality} onChange={(e) => setD((c) => ({ ...c, municipality: e.target.value, adminPost: '', suco: '' }))}>
            <option value="">{t('checkout.select_municipality')}</option>{config.municipalities.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}
          </select>
        </Field>
        {isDili ? (
          <Field id="ad-post" label={t('checkout.admin_post')} required error={m('adminPost')}>
            <select id="ad-post" className={`input ${errors.adminPost ? 'input-error' : ''}`} value={d.adminPost} onChange={(e) => setD((c) => ({ ...c, adminPost: e.target.value, suco: '' }))}>
              <option value="">{t('checkout.select_post')}</option>{config.diliPosts.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </Field>
        ) : null}
        {isDili && post ? (
          <Field id="ad-suco" label={t('checkout.suco')}>
            {post.sucos.length ? <select id="ad-suco" className="input" value={d.suco} onChange={(e) => set('suco', e.target.value)}><option value="">{t('checkout.select_suco')}</option>{post.sucos.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select>
              : <input id="ad-suco" className="input" value={d.suco} onChange={(e) => set('suco', e.target.value)} maxLength={80} />}
          </Field>
        ) : null}
        <Field id="ad-street" label={t('checkout.street')} required error={m('street')} className="sm:col-span-2"><input id="ad-street" className={`input ${errors.street ? 'input-error' : ''}`} value={d.street} onChange={(e) => set('street', e.target.value)} maxLength={200} /></Field>
        <Field id="ad-notes" label={t('checkout.address_notes')} className="sm:col-span-2"><input id="ad-notes" className="input" value={d.notes} onChange={(e) => set('notes', e.target.value)} maxLength={300} /></Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#7D4E57]" checked={d.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />{t('account.address_default')}</label>
      <div className="flex gap-3"><button type="submit" disabled={busy} className="btn-primary">{t('common.save')}</button><button type="button" onClick={onCancel} className="btn-ghost">{t('common.cancel')}</button></div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: CustomerAddress[] }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const config = useStoreConfig();
  const [editing, setEditing] = useState<Draft | null>(null);
  const nameOf = (a: CustomerAddress) => [a.suco, config.diliPosts.find((p) => p.key === a.adminPost)?.name, config.municipalities.find((m) => m.key === a.municipality)?.name].filter(Boolean).join(', ');

  async function remove(id: number) {
    if (!window.confirm(t('account.address_delete_confirm'))) return;
    try { await api(`/api/account/addresses/${id}`, { method: 'DELETE' }); router.refresh(); } catch (e) { toast.error(errorMessage(t, e)); }
  }
  async function makeDefault(a: CustomerAddress) {
    try {
      await api(`/api/account/addresses/${a.id}`, { method: 'PUT', body: { label: a.label, recipient: a.recipient, phone: a.phone, municipality: a.municipality, adminPost: a.adminPost, suco: a.suco, street: a.street, notes: a.notes, isDefault: true } });
      router.refresh();
    } catch (e) { toast.error(errorMessage(t, e)); }
  }

  if (editing) return <AddressForm initial={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); router.refresh(); }} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" onClick={() => setEditing(BLANK)} className="btn-primary btn-sm"><Plus size={14} />{t('account.address_add')}</button></div>
      {addresses.length === 0 ? (
        <div className="rounded-card bg-white p-10 text-center shadow-card"><MapPin className="mx-auto text-mauve" size={32} /><p className="mt-3 font-serif text-2xl">{t('account.addresses_empty')}</p></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-card bg-white p-5 text-sm shadow-card">
              <div className="flex items-center justify-between"><p className="font-semibold">{a.label || a.recipient}</p>{a.isDefault ? <span className="badge bg-mauve-soft text-mauve">{t('account.address_default_badge')}</span> : null}</div>
              <p className="mt-2">{a.recipient} · {a.phone}</p><p className="mt-1">{a.street}</p><p className="text-taupe">{nameOf(a)}</p>
              {a.notes ? <p className="mt-1 text-xs text-taupe">{a.notes}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => setEditing(a)} className="btn-outline btn-sm"><Pencil size={13} />{t('common.edit')}</button>
                {!a.isDefault ? <button type="button" onClick={() => makeDefault(a)} className="btn-ghost btn-sm"><Star size={13} />{t('account.address_make_default')}</button> : null}
                <button type="button" onClick={() => remove(a.id)} className="btn-ghost btn-sm ml-auto text-red-700"><Trash2 size={13} />{t('common.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
