'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { Badge, Empty, PageHeader, TableWrap, td, th, trCls, useAction } from '@/components/admin/ui';

type Row = { id: number; productId: number; product: string; sku: string; size: string | null; color: string | null; stock: number; isActive: boolean };

export function InventoryTable({ rows: initial, canEdit, threshold }: { rows: Row[]; canEdit: boolean; threshold: number }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [lowOnly, setLowOnly] = useState(true);
  const [q, setQ] = useState('');
  const { busy, run } = useAction();

  const shown = rows.filter((r) => (!lowOnly || r.stock <= threshold) && (!q.trim() || `${r.product} ${r.sku} ${r.size ?? ''} ${r.color ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  async function save(r: Row) {
    const stock = draft[r.id];
    if (stock === undefined) return;
    const out = await run(() => api<{ stock: number }>('/api/admin/inventory', { body: { variantId: r.id, stock } }), t('common.saved'));
    if (out) { setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, stock: out.stock } : x))); setDraft((d) => { const n = { ...d }; delete n[r.id]; return n; }); }
  }

  return (
    <>
      <PageHeader title={t('admin.inventory.title')} subtitle={t('admin.inventory.subtitle', { n: threshold })} />
      <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
        <div className="relative min-w-[240px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.products.search')} aria-label={t('common.search')} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> {t('admin.products.lowOnly')}</label>
      </div>
      {!shown.length ? <div className="card"><Empty text={lowOnly ? t('admin.dashboard.stockOk') : undefined} /></div> : (
        <TableWrap>
          <thead className="bg-cream"><tr><th className={th}>{t('admin.products.product')}</th><th className={th}>SKU</th><th className={th}>{t('admin.products.variant')}</th><th className={th}>{t('admin.products.stock')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
          <tbody>
            {shown.map((r) => {
              const dirty = draft[r.id] !== undefined && draft[r.id] !== r.stock;
              return (
                <tr key={r.id} className={trCls}>
                  <td className={td}><Link href={`/admin/products/${r.productId}`} className="font-semibold text-mauve hover:underline">{r.product}</Link></td>
                  <td className={`${td} font-mono text-xs text-taupe`}>{r.sku}</td>
                  <td className={td}>{[r.size, r.color].filter(Boolean).join(' · ') || '—'}</td>
                  <td className={td}>
                    {canEdit ? <input type="number" min={0} className={cn('input w-24', dirty && 'border-mauve')} value={draft[r.id] ?? r.stock} onChange={(e) => setDraft({ ...draft, [r.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} aria-label={r.sku} /> : <b>{r.stock}</b>}
                  </td>
                  <td className={td}>{r.stock === 0 ? <Badge tone="red">{t('admin.dashboard.soldOut')}</Badge> : r.stock <= threshold ? <Badge tone="amber">{t('admin.dashboard.left', { n: r.stock })}</Badge> : <Badge tone="green">{t('admin.inventory.ok')}</Badge>}{!r.isActive && <Badge className="ml-1.5">{t('admin.common.inactive')}</Badge>}</td>
                  <td className={`${td} text-right`}>{canEdit && dirty && <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => save(r)}><Check size={14} /> {t('common.save')}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
