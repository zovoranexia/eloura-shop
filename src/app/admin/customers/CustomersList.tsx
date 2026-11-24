'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap, td, th, trCls } from '@/components/admin/ui';
import { formatDate } from '@/lib/time';

type Row = { id: number; name: string; email: string; phone: string | null; isActive: boolean; orders: number; codBlocked: boolean; codRefusals: number; createdAt: string; lastLoginAt: string | null };

export function CustomersList() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData<Paged<Row>>('/api/admin/customers', { q, codBlocked: flagged ? '1' : '', page, limit: 20 });
  return (
    <>
      <PageHeader title={t('admin.customers.title')} subtitle={t('admin.customers.subtitle')} />
      <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
        <div className="relative min-w-[240px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input className="input pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t('admin.customers.search')} aria-label={t('common.search')} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flagged} onChange={(e) => { setFlagged(e.target.checked); setPage(1); }} /> {t('admin.customers.onlyFlagged')}</label>
      </div>
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.items.length ? <div className="card"><Empty /></div> : (
        <>
          <TableWrap>
            <thead className="bg-cream"><tr><th className={th}>{t('common.name')}</th><th className={th}>{t('common.phone')}</th><th className={th}>{t('admin.customers.orders')}</th><th className={th}>{t('admin.customers.joined')}</th><th className={th}>{t('common.status')}</th></tr></thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className={trCls}>
                  <td className={td}><Link href={`/admin/customers/${c.id}`} className="font-semibold text-mauve hover:underline">{c.name}</Link><div className="text-xs text-taupe">{c.email}</div></td>
                  <td className={td}>{c.phone ?? '—'}</td><td className={td}>{c.orders}</td><td className={`${td} text-taupe`}>{formatDate(c.createdAt, locale)}</td>
                  <td className={td}><div className="flex flex-wrap gap-1.5">{c.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}{c.codBlocked && <Badge tone="red">{t('admin.customers.codBlocked')}</Badge>}{!c.codBlocked && c.codRefusals > 0 && <Badge tone="amber">{t('admin.customers.refusals', { n: c.codRefusals })}</Badge>}</div></td>
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
