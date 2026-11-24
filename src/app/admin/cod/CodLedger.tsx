'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Banknote, Check, Download } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, ConfirmModal, Empty, ErrorBox, Loading, PageHeader, Spinner, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';
import { areaLabel } from '@/components/admin/constants';
import { addDays, diliDay, formatDateTime } from '@/lib/time';
import { formatUSD } from '@/lib/money';

type Row = { id: number; code: string; customerName: string; adminPost: string | null; suco: string | null; totalCents: number; collectedCents: number | null; courier: { id: number; name: string } | null; deliveredAt: string | null; reconciledAt: string | null };

export function CodLedger() {
  const { t, locale } = useI18n();
  const { can } = useAdminUser();
  const [tab, setTab] = useState<'0' | '1' | ''>('0');
  const [courier, setCourier] = useState('');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const { busy, run } = useAction();
  const { data, loading, error, reload } = useAdminData<Row[]>('/api/admin/cod', { reconciled: tab });
  const all = useAdminData<Row[]>('/api/admin/cod', { reconciled: '0' });

  const rows = useMemo(() => (data ?? []).filter((r) => !courier || String(r.courier?.id ?? 0) === courier), [data, courier]);
  const couriers = useMemo(() => [...new Map((data ?? []).filter((r) => r.courier).map((r) => [r.courier!.id, r.courier!.name])).entries()], [data]);
  const pendingTotal = (all.data ?? []).reduce((s, r) => s + (r.collectedCents ?? 0), 0);
  const selectable = rows.filter((r) => !r.reconciledAt);
  // only rows that are still visible (courier filter) and not yet reconciled count as selected
  const selRows = selectable.filter((r) => sel.has(r.id));
  const selTotal = selRows.reduce((s, r) => s + (r.collectedCents ?? 0), 0);
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function reconcile() {
    const ids = selRows.map((r) => r.id);
    if (!ids.length) return;
    const r = await run(() => api<{ reconciled: number }>('/api/admin/cod/reconcile', { body: { orderIds: ids } }), t('admin.cod.reconciledDone'));
    if (r) { setSel(new Set()); setConfirm(false); reload(); all.reload(); }
  }

  return (
    <>
      <PageHeader title={t('admin.cod.title')} subtitle={t('admin.cod.subtitle')}
        actions={can('reports.export') ? <a className="btn-outline btn-sm" href={`/api/admin/reports/export?type=cod&from=${addDays(diliDay(), -29)}&to=${diliDay()}`}><Download size={14} /> {t('admin.cod.export')}</a> : undefined} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="label">{t('admin.cod.toReconcile')}</p><p className="font-serif text-4xl font-medium text-mauve">{formatUSD(pendingTotal)}</p><p className="text-xs text-taupe">{t('admin.cod.ordersCount', { n: all.data?.length ?? 0 })}</p></div>
        <div className="card p-5"><p className="label">{t('admin.cod.selected')}</p><p className="font-serif text-4xl font-medium">{formatUSD(selTotal)}</p><p className="text-xs text-taupe">{t('admin.cod.ordersCount', { n: selRows.length })}</p></div>
        <div className="card flex items-center p-5">
          <button type="button" className="btn-primary btn-block" disabled={!selRows.length || busy} onClick={() => setConfirm(true)}>{busy ? <Spinner className="!text-white" /> : <Check size={16} />} {t('admin.cod.reconcileSelected')}</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([['0', 'admin.cod.tabPending'], ['1', 'admin.cod.tabDone'], ['', 'common.all']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setSel(new Set()); }} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', tab === k ? 'bg-mauve text-white' : 'bg-white text-taupe hover:bg-cream-deep')}>{t(label)}</button>
        ))}
        <select className="input ml-auto w-auto" value={courier} onChange={(e) => setCourier(e.target.value)} aria-label={t('admin.orders.courier')}>
          <option value="">{t('admin.cod.allCouriers')}</option>
          {couriers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          <option value="0">{t('admin.orders.noCourier')}</option>
        </select>
      </div>

      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !rows.length ? <div className="card"><Empty text={t('admin.cod.empty')} /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr>
            <th className={th}><input type="checkbox" aria-label={t('common.all')} checked={selectable.length > 0 && selectable.every((r) => sel.has(r.id))}
              onChange={(e) => setSel(e.target.checked ? new Set(selectable.map((r) => r.id)) : new Set())} /></th>
            <th className={th}>{t('admin.orders.order')}</th><th className={th}>{t('admin.cod.delivered')}</th><th className={th}>{t('admin.orders.customer')}</th>
            <th className={th}>{t('admin.orders.area')}</th><th className={th}>{t('admin.orders.courier')}</th><th className={`${th} text-right`}>{t('admin.cod.collected')}</th><th className={th}>{t('common.status')}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={trCls}>
                <td className={td}>{!r.reconciledAt && <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={r.code} />}</td>
                <td className={td}><Link href={`/admin/orders/${r.id}`} className="font-semibold text-mauve hover:underline">{r.code}</Link></td>
                <td className={`${td} whitespace-nowrap text-taupe`}>{formatDateTime(r.deliveredAt, locale)}</td>
                <td className={td}>{r.customerName}</td>
                <td className={td}>{areaLabel({ municipality: 'dili', adminPost: r.adminPost, suco: r.suco })}</td>
                <td className={td}>{r.courier?.name ?? '—'}</td>
                <td className={`${td} text-right font-semibold`}>{formatUSD(r.collectedCents)}</td>
                <td className={td}>{r.reconciledAt ? <Badge tone="green"><Banknote size={12} className="mr-1" />{formatDateTime(r.reconciledAt, locale)}</Badge> : <Badge tone="amber">{t('admin.cod.withCourier')}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <ConfirmModal open={confirm} title={t('admin.cod.reconcileSelected')} text={t('admin.cod.confirmText', { n: selRows.length, total: formatUSD(selTotal) })} busy={busy} onClose={() => setConfirm(false)} onConfirm={reconcile} />
    </>
  );
}
