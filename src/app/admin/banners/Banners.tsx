'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, Card, ConfirmModal, Empty, ErrorBox, Field, ImageUploader, LangTabs, Loading, Modal, PageHeader, Spinner, Switch, useAction } from '@/components/admin/ui';
import { loc } from '@/lib/i18n-shared';
import { formatDateTime, toDiliLocalInput } from '@/lib/time';

type I = Record<string, string>;
type Banner = { id: number; placement: 'HERO' | 'PROMO'; image: string; badge: I | null; title: I; highlight: I | null; subtitle: I | null; ctaLabel: I | null; ctaUrl: string; sortOrder: number; isActive: boolean; startsAt: string | null; endsAt: string | null };
type Form = { id?: number; placement: 'HERO' | 'PROMO'; image: string | null; badge: I; title: I; highlight: I; subtitle: I; ctaLabel: I; ctaUrl: string; sortOrder: number; isActive: boolean; startsAt: string; endsAt: string };
const blank: Form = { placement: 'HERO', image: null, badge: {}, title: {}, highlight: {}, subtitle: {}, ctaLabel: {}, ctaUrl: '/shop', sortOrder: 0, isActive: true, startsAt: '', endsAt: '' };

export function Banners() {
  const { t, locale } = useI18n();
  const { data, loading, error, reload } = useAdminData<Banner[]>('/api/admin/banners');
  const { busy, run } = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Banner | null>(null);

  const edit = (b: Banner) => { setErrs({}); setForm({ id: b.id, placement: b.placement, image: b.image, badge: b.badge ?? {}, title: b.title ?? {}, highlight: b.highlight ?? {}, subtitle: b.subtitle ?? {}, ctaLabel: b.ctaLabel ?? {}, ctaUrl: b.ctaUrl, sortOrder: b.sortOrder, isActive: b.isActive, startsAt: toDiliLocalInput(b.startsAt), endsAt: toDiliLocalInput(b.endsAt) }); };

  async function save() {
    if (!form) return;
    setErrs({});
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) { setErrs({ endsAt: 'END_BEFORE_START' }); return; }
    const body = { ...form, image: form.image ?? '', startsAt: form.startsAt || null, endsAt: form.endsAt || null, id: undefined };
    const r = await run(async () => {
      try { return form.id ? await api(`/api/admin/banners/${form.id}`, { method: 'PUT', body }) : await api('/api/admin/banners', { body }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) { setForm(null); reload(); }
  }
  async function toggle(b: Banner) {
    const body = { ...b, ctaLabel: b.ctaLabel ?? {}, badge: b.badge ?? {}, highlight: b.highlight ?? {}, subtitle: b.subtitle ?? {}, isActive: !b.isActive, startsAt: toDiliLocalInput(b.startsAt) || null, endsAt: toDiliLocalInput(b.endsAt) || null, id: undefined };
    if (await run(() => api(`/api/admin/banners/${b.id}`, { method: 'PUT', body }), t('common.saved'))) reload();
  }

  const section = (placement: 'HERO' | 'PROMO') => {
    const items = (data ?? []).filter((b) => b.placement === placement);
    return (
      <Card title={t(`admin.banners.${placement === 'HERO' ? 'hero' : 'promo'}`)} className="mb-6"
        actions={<button type="button" className="btn-primary btn-sm" onClick={() => { setErrs({}); setForm({ ...blank, placement, sortOrder: items.length, ctaUrl: placement === 'HERO' ? '/shop' : '/shop?sale=1' }); }}><Plus size={14} /> {t('admin.banners.new')}</button>}>
        {!items.length ? <Empty /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-cream-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt="" className="h-36 w-full bg-cream object-cover" />
                <div className="space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-serif text-lg font-semibold">{loc(b.title, locale)}</p><span className="text-xs text-taupe">#{b.sortOrder}</span></div>
                  <p className="truncate text-xs text-taupe">{loc(b.subtitle, locale)}</p>
                  <p className="text-xs text-taupe">→ <code>{b.ctaUrl}</code></p>
                  {(b.startsAt || b.endsAt) && <p className="text-[11px] text-amber-700">{b.startsAt ? formatDateTime(b.startsAt, locale) : '…'} → {b.endsAt ? formatDateTime(b.endsAt, locale) : '…'}</p>}
                  <div className="flex items-center justify-between pt-2">
                    <Switch checked={b.isActive} onChange={() => toggle(b)} label={<Badge tone={b.isActive ? 'green' : 'gray'}>{t(b.isActive ? 'admin.common.active' : 'admin.common.inactive')}</Badge>} />
                    <div className="flex"><button type="button" className="btn-ghost btn-sm" onClick={() => edit(b)}><Pencil size={14} /> {t('common.edit')}</button>
                      <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setDel(b)} aria-label={t('common.delete')}><Trash2 size={14} /></button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <>
      <PageHeader title={t('admin.banners.title')} subtitle={t('admin.banners.subtitle')} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : <>{section('HERO')}{section('PROMO')}</>}

      <Modal open={!!form} onClose={() => setForm(null)} size="lg" title={form?.id ? t('admin.banners.edit') : t('admin.banners.new')}
        footer={<><button type="button" className="btn-ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={busy || !form?.image} onClick={save}>{busy && <Spinner className="!text-white" />}{t('common.save')}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t('admin.banners.image')} hint={form.placement === 'HERO' ? t('admin.banners.heroHint') : t('admin.banners.promoHint')} error={errs.image ? fieldMessage(t, errs.image) : undefined}>
              <ImageUploader kind="banners" value={form.image} onChange={(image) => setForm({ ...form, image })} className="[&>div:first-child]:h-24 [&>div:first-child]:w-44" />
            </Field>
            <LangTabs label={t('admin.banners.badge')} value={form.badge} onChange={(badge) => setForm({ ...form, badge })} />
            <LangTabs label={t('admin.banners.titleField')} value={form.title} onChange={(title) => setForm({ ...form, title })} error={errs.title ? fieldMessage(t, errs.title) : undefined} />
            <LangTabs label={t('admin.banners.highlight')} value={form.highlight} onChange={(highlight) => setForm({ ...form, highlight })} />
            <LangTabs label={t('admin.banners.subtitleField')} value={form.subtitle} onChange={(subtitle) => setForm({ ...form, subtitle })} multiline rows={2} />
            <LangTabs label={t('admin.banners.cta')} value={form.ctaLabel} onChange={(ctaLabel) => setForm({ ...form, ctaLabel })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.banners.link')} error={errs.ctaUrl ? fieldMessage(t, errs.ctaUrl) : undefined} hint="/shop · /shop?category=dresses"><input className="input" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} /></Field>
              <Field label={t('admin.categories.order')}><input type="number" min={0} max={99} className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} /></Field>
              <Field label={t('admin.coupons.startsAt')} hint="Asia/Dili"><input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
              <Field label={t('admin.coupons.endsAt')} error={errs.endsAt === 'END_BEFORE_START' ? t('admin.coupons.endBeforeStart') : errs.endsAt ? fieldMessage(t, errs.endsAt) : undefined} hint="Asia/Dili"><input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
            </div>
            <Switch checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} label={t('admin.common.active')} />
          </div>
        )}
      </Modal>
      <ConfirmModal open={!!del} danger title={t('common.delete')} text={t('admin.banners.deleteText')} busy={busy} onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await run(() => api(`/api/admin/banners/${del.id}`, { method: 'DELETE' }), t('common.saved')))) { setDel(null); reload(); } }} />
    </>
  );
}
