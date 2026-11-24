'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap, td, th, trCls } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/time';

type Row = { id: number; user: string; action: string; entity: string | null; entityId: string | null; meta: unknown; ip: string | null; createdAt: string };
const GROUPS = ['auth', 'order', 'payment', 'cod', 'product', 'category', 'coupon', 'banner', 'cms', 'zone', 'suco', 'payment_method', 'settings', 'staff', 'role', 'customer', 'review', 'report', 'upload'];

export function AuditLog() {
  const { t, locale } = useI18n();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData<Paged<Row>>('/api/admin/audit', { action, page, limit: 50 });
  return (
    <>
      <PageHeader title={t('admin.audit.title')} subtitle={t('admin.audit.subtitle')} actions={<Badge tone="mauve"><Lock size={12} className="mr-1" />{t('admin.audit.immutable')}</Badge>} />
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <select className="input w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label={t('admin.audit.action')}>
          <option value="">{t('admin.audit.allActions')}</option>
          {GROUPS.map((g) => <option key={g} value={g}>{g}.*</option>)}
        </select>
        <p className="text-xs text-taupe">{t('admin.audit.tz')}</p>
      </div>
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.items.length ? <div className="card"><Empty /></div> : (
        <>
          <TableWrap>
            <thead className="bg-cream"><tr><th className={th}>{t('common.date')} (Asia/Dili)</th><th className={th}>{t('admin.audit.who')}</th><th className={th}>{t('admin.audit.action')}</th><th className={th}>{t('admin.audit.target')}</th><th className={th}>IP</th><th className={th}>{t('common.details')}</th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className={trCls}>
                  <td className={`${td} whitespace-nowrap text-taupe`}>{formatDateTime(a.createdAt, locale)}</td>
                  <td className={td}>{a.user}</td>
                  <td className={td}><code className="rounded bg-cream-deep px-1.5 py-0.5 text-xs">{a.action}</code></td>
                  <td className={`${td} text-taupe`}>{[a.entity, a.entityId].filter(Boolean).join(' #') || '—'}</td>
                  <td className={`${td} font-mono text-xs text-taupe`}>{a.ip ?? '—'}</td>
                  <td className={td}>{a.meta ? <details><summary className="cursor-pointer text-xs text-mauve">{t('common.view')}</summary><pre className="mt-1 max-w-xs overflow-x-auto rounded bg-cream p-2 text-[11px]">{JSON.stringify(a.meta, null, 1)}</pre></details> : '—'}</td>
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
