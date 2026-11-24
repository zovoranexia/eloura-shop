'use client';
import { useState } from 'react';
import { ExternalLink, FilePlus, Pencil } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { ApiError, api, fieldMessage } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { Badge, Card, Empty, ErrorBox, Field, LangTabs, Loading, Modal, PageHeader, Spinner, Switch, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { loc } from '@/lib/i18n-shared';
import { formatDateTime } from '@/lib/time';

type Page = { id: number; slug: string; title: Record<string, string>; body: Record<string, string>; isPublished: boolean; updatedAt: string };
type Form = { slug: string; isNew: boolean; title: Record<string, string>; body: Record<string, string>; isPublished: boolean };

export function CmsPages() {
  const { t, locale } = useI18n();
  const { data, loading, error, reload } = useAdminData<Page[]>('/api/admin/pages');
  const { busy, run } = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [slugTaken, setSlugTaken] = useState(false);

  async function save() {
    if (!form) return;
    setErrs({});
    if (form.isNew && data?.some((p) => p.slug === form.slug)) { setSlugTaken(true); return; }
    const r = await run(async () => {
      try { return await api(`/api/admin/pages/${form.slug}`, { method: 'PUT', body: { title: form.title, body: form.body, isPublished: form.isPublished } }); }
      catch (e) { if (e instanceof ApiError) setErrs(e.fields); throw e; }
    }, t('common.saved'));
    if (r) { setForm(null); reload(); }
  }

  return (
    <>
      <PageHeader title={t('admin.pages.title')} subtitle={t('admin.pages.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={() => { setErrs({}); setSlugTaken(false); setForm({ slug: '', isNew: true, title: {}, body: {}, isPublished: true }); }}><FilePlus size={16} /> {t('admin.pages.new')}</button>} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.length ? <div className="card"><Empty /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th}>{t('admin.pages.page')}</th><th className={th}>Slug</th><th className={th}>{t('admin.pages.languages')}</th><th className={th}>{t('admin.pages.updated')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className={trCls}>
                <td className={`${td} font-semibold`}>{loc(p.title, locale)}</td>
                <td className={`${td} font-mono text-xs text-taupe`}>/page/{p.slug}</td>
                <td className={td}><div className="flex gap-1">{(['tet', 'pt', 'en', 'id'] as const).map((l) => <Badge key={l} tone={p.body?.[l] ? 'green' : 'gray'} className="uppercase">{l}</Badge>)}</div></td>
                <td className={`${td} text-taupe`}>{formatDateTime(p.updatedAt, locale)}</td>
                <td className={td}>{p.isPublished ? <Badge tone="green">{t('admin.pages.published')}</Badge> : <Badge>{t('admin.pages.draft')}</Badge>}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <a className="btn-ghost btn-sm" href={`/page/${p.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { setErrs({}); setSlugTaken(false); setForm({ slug: p.slug, isNew: false, title: p.title ?? {}, body: p.body ?? {}, isPublished: p.isPublished }); }}><Pencil size={14} /> {t('common.edit')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} size="xl" title={form?.isNew ? t('admin.pages.new') : t('admin.pages.edit')}
        footer={<><button type="button" className="btn-ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button><button type="button" className="btn-primary" disabled={busy || !form?.slug} onClick={save}>{busy && <Spinner className="!text-white" />}{t('common.save')}</button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug" error={slugTaken ? t('admin.pages.slugTaken') : errs.slug ? fieldMessage(t, errs.slug) : undefined} hint={t('admin.pages.slugHint')}>
                <input className="input font-mono" value={form.slug} disabled={!form.isNew} maxLength={40} onChange={(e) => { setSlugTaken(false); setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }); }} />
              </Field>
              <div className="flex items-end pb-1"><Switch checked={form.isPublished} onChange={(isPublished) => setForm({ ...form, isPublished })} label={t('admin.pages.published')} /></div>
            </div>
            <LangTabs label={t('admin.pages.titleField')} value={form.title} onChange={(title) => setForm({ ...form, title })} />
            <LangTabs label={t('admin.pages.body')} value={form.body} onChange={(body) => setForm({ ...form, body })} multiline rows={14} />
            <Card className="bg-cream/60 !shadow-none" pad><p className="text-xs text-taupe">{t('admin.pages.markdownHint')}</p></Card>
          </div>
        )}
      </Modal>
    </>
  );
}
