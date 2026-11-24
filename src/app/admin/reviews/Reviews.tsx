'use client';
import { useState } from 'react';
import { Eye, EyeOff, Star } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/time';

type Row = { id: number; rating: number; comment: string | null; status: 'PUBLISHED' | 'HIDDEN'; isVerified: boolean; user: string; product: string; slug: string; createdAt: string };

export function Reviews() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminData<Paged<Row>>('/api/admin/reviews', { page, limit: 20 });
  const { busy, run } = useAction();
  const toggle = async (r: Row) => { if (await run(() => api(`/api/admin/reviews/${r.id}`, { method: 'PATCH', body: { status: r.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED' } }), t('common.saved'))) reload(); };
  return (
    <>
      <PageHeader title={t('admin.reviews.title')} subtitle={t('admin.reviews.subtitle')} />
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.items.length ? <div className="card"><Empty /></div> : (
        <>
          <TableWrap>
            <thead className="bg-cream"><tr><th className={th}>{t('admin.reviews.product')}</th><th className={th}>{t('admin.reviews.rating')}</th><th className={th}>{t('admin.reviews.comment')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className={trCls}>
                  <td className={td}><p className="font-semibold">{r.product}</p><p className="text-xs text-taupe">{r.user} · {formatDateTime(r.createdAt, locale)}{r.isVerified ? ` · ${t('admin.reviews.verified')}` : ''}</p></td>
                  <td className={`${td} whitespace-nowrap`}><span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star size={14} fill="currentColor" />{r.rating}</span></td>
                  <td className={`${td} max-w-md text-taupe`}>{r.comment || '—'}</td>
                  <td className={td}>{r.status === 'PUBLISHED' ? <Badge tone="green">{t('admin.reviews.published')}</Badge> : <Badge>{t('admin.reviews.hidden')}</Badge>}</td>
                  <td className={`${td} text-right`}><button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => toggle(r)}>{r.status === 'PUBLISHED' ? <><EyeOff size={14} /> {t('admin.reviews.hide')}</> : <><Eye size={14} /> {t('admin.reviews.publish')}</>}</button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </>
  );
}
