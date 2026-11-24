'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pagination, TableWrap, td, th, trCls } from '@/components/admin/ui';
import { loc } from '@/lib/i18n-shared';
import { formatUSD } from '@/lib/money';
import { cn } from '@/lib/client/cn';

type Row = { id: number; slug: string; sku: string; name: string; priceCents: number; compareAtCents: number | null; isActive: boolean; isFeatured: boolean; image: string | null; variantCount: number; stock: number; category: string | null };
type Cat = { id: number; name: Record<string, string> };

export function ProductsList({ initialLowStock }: { initialLowStock: boolean }) {
  const { t, locale } = useI18n();
  const { can } = useAdminUser();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [low, setLow] = useState(initialLowStock);
  const [page, setPage] = useState(1);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const cats = useAdminData<Cat[]>('/api/admin/categories', {}, can('categories.manage') || can('products.view'));
  const { data, loading, error } = useAdminData<Paged<Row>>('/api/admin/products', { q, category, status, stock: low ? 'low' : '', page, limit: 20 });

  return (
    <>
      <PageHeader title={t('admin.products.title')} subtitle={t('admin.products.subtitle')}
        actions={can('products.create') ? <Link href="/admin/products/new" className="btn-primary"><Plus size={16} /> {t('admin.products.new')}</Link> : undefined} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input className="input pl-9" value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder={t('admin.products.search')} aria-label={t('common.search')} /></div>
        <select className="input" value={category} onChange={(e) => reset(setCategory)(e.target.value)} aria-label={t('admin.products.category')}>
          <option value="">{t('admin.products.allCategories')}</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label={t('common.status')}>
          <option value="">{t('admin.products.anyStatus')}</option><option value="active">{t('admin.common.active')}</option><option value="inactive">{t('admin.common.inactive')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={low} onChange={(e) => reset(setLow)(e.target.checked)} /> {t('admin.products.lowOnly')}</label>
      </div>
      {error ? <ErrorBox error={error} /> : loading && !data ? <Loading /> : !data?.items.length ? <div className="card"><Empty /></div> : (
        <>
          <TableWrap>
            <thead className="bg-cream"><tr><th className={th} /><th className={th}>{t('admin.products.product')}</th><th className={th}>{t('admin.products.category')}</th><th className={`${th} text-right`}>{t('admin.products.price')}</th><th className={`${th} text-right`}>{t('admin.products.stock')}</th><th className={th}>{t('common.status')}</th></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className={trCls}>
                  <td className={`${td} w-16`}>{p.image ?   <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-cream-deep" />}</td>
                  <td className={td}><Link href={`/admin/products/${p.id}`} className="font-semibold text-mauve hover:underline">{p.name}</Link><div className="text-xs text-taupe">{p.sku} · {t('admin.products.variantsCount', { n: p.variantCount })}</div></td>
                  <td className={td}>{p.category ?? '—'}</td>
                  <td className={`${td} text-right`}><b>{formatUSD(p.priceCents)}</b>{p.compareAtCents && <div className="text-xs text-taupe line-through">{formatUSD(p.compareAtCents)}</div>}</td>
                  <td className={`${td} text-right`}><span className={cn('font-semibold', p.stock === 0 ? 'text-red-700' : p.stock <= 3 ? 'text-amber-700' : '')}>{p.stock}</span></td>
                  <td className={td}><div className="flex flex-wrap gap-1.5">{p.isActive ? <Badge tone="green">{t('admin.common.active')}</Badge> : <Badge>{t('admin.common.inactive')}</Badge>}{p.isFeatured && <Badge tone="mauve"><Star size={11} className="mr-1" />{t('admin.products.featured')}</Badge>}</div></td>
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
