'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, ConfirmModal, Empty, ErrorBox, Field, LangTabs, Loading, Modal, MoneyInput, PageHeader, Spinner, Switch, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { formatUSD } from '@/lib/money';
import { formatDateTime, parseDiliLocal, toDiliLocalInput } from '@/lib/time';

type Coupon = {
  id: number; code: string; description: Record<string, string> | null; type: 'PERCENT' | 'FIXED'; value: number; minOrderCents: number; maxDiscountCents: number | null;
  usageLimit: number | null; usedCount: number; startsAt: string | null; endsAt: string | null; isActive: boolean;
};
type Form = {
  id?: number; code: string; description: Record<string, string>; type: 'PERCENT' | 'FIXED'; value: number; minOrderCents: number; maxDiscountCents: number | null;
  usageLimit: string; startsAt: string; endsAt: string; isActive: boolean;
};
const blank: Form = { code: '', description: {}, type: 'PERCENT', value: 10, minOrderCents: 0, maxDiscountCents: null, usageLimit: '', startsAt: '', endsAt: '', isActive: true };

export function Coupons() {
  const { t, locale } = useI18n();
  const { data, loading, error, reload } = useAdminData<Coupon[]>('/api/admin/coupons');
  const { busy, run } = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Coupon | null>(null);

  const edit = (c: Coupon) => { setErrs({}); setForm({
    id: c.id, code: c.code, description: c.description ?? {}, type: c.type, value: c.value, minOrderCents: c.minOrderCents, maxDiscountCents: c.maxDiscountCents,
    usageLimit: c.usageLimit ? String(c.usageLimit) : '', startsAt: toDiliLocalInput(c.startsAt), endsAt: toDiliLocalInput(c.endsAt), isActive: c.isActive,
  }); };

  async function save() {
    if (!form) return;
    setErrs({});
    if ((form.startsAt && !parseDiliLocal(form.startsAt)) || (form.endsAt && !parseDiliLocal(form.endsAt))) { setErrs({ startsAt: 'INVALID' }); return; }
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) { setErrs({ endsAt: 'END_BEFORE_START' }); return; }
    const body = {
      code: form.code.trim().toUpperCase(), description: form.description, type: form.type, value: form.value, minOrderCents: form.minOrderCents,
      maxDiscountCents: form.type === 'PERCENT' ? form.maxDiscountCents : null, usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      startsAt: form.startsAt || null, endsAt: form.endsAt || null, isActive: form.isActive,
    };
    const r = await run(async () => {
      try { return form.id ? await api(`/api/admin/coupons/${form.id}`, { method: 'PUT', body }) : await api('/api/admin/coupons', { body }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) { setForm(null); reload(); }
  }

  const valueLabel = (c: Coupon) => (c.type === 'PERCENT' ? `${c.value}%` : formatUSD(c.value));
  return (
    <>
      <PageHeader title={t('admin.coupons.title')} subtitle={t('admin.coupons.subtitle')} actions={<button type="button" className="btn-primary" onClick={() => { setErrs({}); setForm(blank); }}><Plus size={16} /> {t('admin.coupons.new')}</button>} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.length ? <div className="card"><Empty /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th}>{t('admin.coupons.code')}</th><th className={th}>{t('admin.coupons.discount')}</th><th className={th}>{t('admin.coupons.minOrder')}</th><th className={th}>{t('admin.coupons.usage')}</th><th className={th}>{t('admin.coupons.validity')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className={trCls}>
                <td className={td}><code className="rounded bg-cream-deep px-2 py-1 font-semibold text-mauve">{c.code}</code></td>
                <td className={td}><b>{valueLabel(c)}</b>{c.maxDiscountCents != null && <div className="text-xs text-taupe">{t('admin.coupons.upTo', { max: formatUSD(c.maxDiscountCents) })}</div>}</td>
                <td className={td}>{c.minOrderCents ? formatUSD(c.minOrderCents) : '—'}</td>
                <td className={td}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td className={`${td} text-xs text-taupe`}>{c.startsAt ? formatDateTime(c.startsAt, locale) : '—'}<br />{c.endsAt ? formatDateTime(c.endsAt, locale) : '—'}</td>
                <td className={td}>{c.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => edit(c)}><Pencil size={14} /> {t('common.edit')}</button>
                  <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setDel(c)} aria-label={t('common.delete')}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t('admin.coupons.edit') : t('admin.coupons.new')} size="lg"
        footer={<><button type="button" className="btn-ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner className="!text-white" />}{t('common.save')}</button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.coupons.code')} error={errs.code ? fieldMessage(t, errs.code) : undefined} hint={t('admin.coupons.codeHint')}><input className="input font-mono uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={30} /></Field>
            <Field label={t('admin.coupons.type')}>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Form['type'], value: e.target.value === 'PERCENT' ? 10 : 500 })}>
                <option value="PERCENT">{t('admin.coupons.percent')}</option><option value="FIXED">{t('admin.coupons.fixed')}</option>
              </select>
            </Field>
            <Field label={form.type === 'PERCENT' ? t('admin.coupons.percentValue') : t('admin.coupons.fixedValue')} error={errs.value ? fieldMessage(t, errs.value) : undefined}>
              {form.type === 'PERCENT' ? <input type="number" min={1} max={100} className="input" value={form.value} onChange={(e) => setForm({ ...form, value: Math.floor(Number(e.target.value) || 0) })} />
                : <MoneyInput cents={form.value} onChange={(c) => setForm({ ...form, value: c ?? 0 })} />}
            </Field>
            {form.type === 'PERCENT'
              ? <Field label={t('admin.coupons.maxDiscount')} hint={t('admin.coupons.maxDiscountHint')}><MoneyInput cents={form.maxDiscountCents} allowEmpty placeholder="—" onChange={(c) => setForm({ ...form, maxDiscountCents: c })} /></Field>
              : <div />}
            <Field label={t('admin.coupons.minOrder')}><MoneyInput cents={form.minOrderCents} onChange={(c) => setForm({ ...form, minOrderCents: c ?? 0 })} /></Field>
            <Field label={t('admin.coupons.usageLimit')} hint={t('admin.coupons.usageHint')}><input type="number" min={1} className="input" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="∞" /></Field>
            <Field label={t('admin.coupons.startsAt')} error={errs.startsAt ? fieldMessage(t, errs.startsAt) : undefined} hint="Asia/Dili"><input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label={t('admin.coupons.endsAt')} error={errs.endsAt === 'END_BEFORE_START' ? t('admin.coupons.endBeforeStart') : errs.endsAt ? fieldMessage(t, errs.endsAt) : undefined} hint="Asia/Dili"><input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
            <div className="sm:col-span-2"><LangTabs label={t('admin.coupons.description')} value={form.description} onChange={(description) => setForm({ ...form, description })} /></div>
            <Switch checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} label={t('admin.common.active')} />
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!del} danger title={t('common.delete')} text={t('admin.coupons.deleteText', { code: del?.code ?? '' })} busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => api(`/api/admin/coupons/${del.id}`, { method: 'DELETE' }), t('common.saved')))) { setDel(null); reload(); } }} />
    </>
  );
}
