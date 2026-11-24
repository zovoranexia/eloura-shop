'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { Empty, ErrorBox, Loading, MethodBadge, OrderStatusBadge, PageHeader, PaymentStatusBadge, Pagination, TableWrap, td, th, trCls } from '@/components/admin/ui';
import { METHODS, ORDER_STATUSES, PAYMENT_STATUSES, areaLabel } from '@/components/admin/constants';
import { formatDateTime } from '@/lib/time';
import { formatUSD } from '@/lib/money';

type Row = {
  id: number; code: string; status: string; paymentStatus: string; paymentMethod: string; totalCents: number; customerName: string; customerPhone: string;
  municipality: string; adminPost: string | null; suco: string | null; itemCount: number; courier: string | null; createdAt: string;
};

export function OrdersList({ initial }: { initial: { status: string; paymentStatus: string; method: string; q: string } }) {
  const { t, locale } = useI18n();
  const [f, setF] = useState({ ...initial, from: '', to: '' });
  const [page, setPage] = useState(1);
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };
  const { data, loading, error } = useAdminData<Paged<Row>>('/api/admin/orders', { ...f, page, limit: 20 });

  return (
    <>
      <PageHeader title={t('admin.orders.title')} subtitle={t('admin.orders.subtitle')} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input className="input pl-9" placeholder={t('admin.orders.searchPlaceholder')} value={f.q} onChange={(e) => set('q', e.target.value)} aria-label={t('common.search')} />
        </div>
        <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label={t('common.status')}>
          <option value="">{t('admin.orders.allStatuses')}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{t(`status.order.${s}`)}</option>)}
        </select>
        <select className="input" value={f.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)} aria-label={t('admin.orders.payment')}>
          <option value="">{t('admin.orders.allPayments')}</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.payment.${s}`)}</option>)}
        </select>
        <select className="input" value={f.method} onChange={(e) => set('method', e.target.value)} aria-label={t('admin.orders.method')}>
          <option value="">{t('admin.orders.allMethods')}</option>
          {METHODS.map((m) => <option key={m} value={m}>{t(`status.method.${m}`)}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={f.from} onChange={(e) => set('from', e.target.value)} aria-label={t('common.from')} />
          <input type="date" className="input" value={f.to} onChange={(e) => set('to', e.target.value)} aria-label={t('common.to')} />
        </div>
      </div>

      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.items.length ? <div className="card"><Empty /></div> : (
        <>
          <TableWrap>
            <thead className="bg-cream"><tr>
              <th className={th}>{t('admin.orders.order')}</th><th className={th}>{t('common.date')}</th><th className={th}>{t('admin.orders.customer')}</th>
              <th className={th}>{t('admin.orders.area')}</th><th className={th}>{t('admin.orders.method')}</th><th className={`${th} text-right`}>{t('common.total')}</th>
              <th className={th}>{t('common.status')}</th><th className={th}>{t('admin.orders.payment')}</th>
            </tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className={trCls}>
                  <td className={td}><Link className="font-semibold text-mauve hover:underline" href={`/admin/orders/${o.id}`}>{o.code}</Link><div className="text-xs text-taupe">{t('admin.orders.items', { n: o.itemCount })}</div></td>
                  <td className={`${td} whitespace-nowrap text-taupe`}>{formatDateTime(o.createdAt, locale)}</td>
                  <td className={td}>{o.customerName}<div className="text-xs text-taupe">{o.customerPhone}</div></td>
                  <td className={td}>{areaLabel(o)}{o.courier && <div className="text-xs text-taupe">🚚 {o.courier}</div>}</td>
                  <td className={td}><MethodBadge method={o.paymentMethod} /></td>
                  <td className={`${td} text-right font-semibold`}>{formatUSD(o.totalCents)}</td>
                  <td className={td}><OrderStatusBadge status={o.status} /></td>
                  <td className={td}><PaymentStatusBadge status={o.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
          <p className="mt-2 text-xs text-taupe">{t('admin.orders.total', { n: data.total })}</p>
        </>
      )}
    </>
  );
}
