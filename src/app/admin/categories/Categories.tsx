'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, ConfirmModal, Empty, ErrorBox, Field, ImageUploader, LangTabs, Loading, Modal, PageHeader, Spinner, Switch, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { loc } from '@/lib/i18n-shared';

type Cat = { id: number; slug: string; name: Record<string, string>; image: string | null; sortOrder: number; isActive: boolean; productCount: number };
type Form = { id?: number; slug: string; name: Record<string, string>; image: string | null; sortOrder: number; isActive: boolean };
const blank: Form = { slug: '', name: {}, image: null, sortOrder: 0, isActive: true };

export function Categories() {
  const { t, locale } = useI18n();
  const { data, loading, error, reload } = useAdminData<Cat[]>('/api/admin/categories');
  const { busy, run } = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Cat | null>(null);

  async function save() {
    if (!form) return;
    setErrs({});
    if (!form.name.tet?.trim() && !form.name.en?.trim()) { setErrs({ name: 'REQUIRED' }); return; } // same rule as the create endpoint (the update endpoint does not check it)
    const body = { name: form.name, image: form.image, sortOrder: form.sortOrder, isActive: form.isActive, slug: form.slug || undefined };
    const r = await run(async () => {
      try { return form.id ? await api(`/api/admin/categories/${form.id}`, { method: 'PUT', body }) : await api('/api/admin/categories', { body }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) { setForm(null); reload(); }
  }

  return (
    <>
      <PageHeader title={t('admin.categories.title')} subtitle={t('admin.categories.subtitle')} actions={<button type="button" className="btn-primary" onClick={() => { setErrs({}); setForm({ ...blank, sortOrder: (data?.length ?? 0) }); }}><Plus size={16} /> {t('admin.categories.new')}</button>} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.length ? <div className="card"><Empty /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th} /><th className={th}>{t('common.name')}</th><th className={th}>Slug</th><th className={th}>{t('admin.categories.products')}</th><th className={th}>{t('admin.categories.order')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className={trCls}>
                <td className={`${td} w-16`}>{c.image ?   <img src={c.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-cream-deep" />}</td>
                <td className={td}><b>{loc(c.name, locale)}</b><div className="text-xs text-taupe">{['tet', 'pt', 'en', 'id'].filter((l) => l !== locale).map((l) => c.name[l]).filter(Boolean).join(' · ')}</div></td>
                <td className={`${td} font-mono text-xs text-taupe`}>{c.slug}</td><td className={td}>{c.productCount}</td><td className={td}>{c.sortOrder}</td>
                <td className={td}>{c.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { setErrs({}); setForm({ id: c.id, slug: c.slug, name: c.name, image: c.image, sortOrder: c.sortOrder, isActive: c.isActive }); }}><Pencil size={14} /> {t('common.edit')}</button>
                  <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setDel(c)} aria-label={t('common.delete')}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t('admin.categories.edit') : t('admin.categories.new')}
        footer={<><button type="button" className="btn-ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner className="!text-white" />}{t('common.save')}</button></>}>
        {form && (
          <div className="space-y-4">
            <LangTabs label={t('common.name')} value={form.name} onChange={(name) => setForm({ ...form, name })} error={errs.name ? fieldMessage(t, errs.name) : undefined} />
            <Field label={t('admin.categories.image')}><ImageUploader kind="categories" value={form.image} onChange={(image) => setForm({ ...form, image })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('admin.categories.order')}><input type="number" min={0} className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Slug" hint={t('admin.products.slugHint')}><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></Field>
            </div>
            <Switch checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} label={t('admin.categories.visible')} />
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!del} danger title={t('common.delete')} text={t('admin.categories.deleteText', { n: del?.productCount ?? 0 })} busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => api(`/api/admin/categories/${del.id}`, { method: 'DELETE' }), t('common.saved')))) { setDel(null); reload(); } }} />
    </>
  );
}
