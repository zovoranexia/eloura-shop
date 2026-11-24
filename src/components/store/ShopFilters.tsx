'use client';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

type Facets = { sizes: string[]; colors: { name: string; hex: string | null }[]; priceMin: number; priceMax: number };
type Cat = { slug: string; name: string; productCount: number };

/** Faceted filters (category, price in USD, size, colour, on-sale) + sort. State lives in the URL so pages stay shareable. */
export function ShopFilters({ categories, facets, total, children }: { categories: Cat[]; facets: Facets; total: number; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const toDollars = (c: string | null) => (c && Number(c) >= 0 ? String(Number(c) / 100) : '');
  const [min, setMin] = useState(toDollars(sp.get('min')));
  const [max, setMax] = useState(toDollars(sp.get('max')));
  useEffect(() => { setMin(toDollars(sp.get('min'))); setMax(toDollars(sp.get('max'))); }, [sp]);

  function set(patch: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    p.delete('page');
    start(() => router.push(`${path}${p.toString() ? `?${p}` : ''}`, { scroll: false }));
  }
  const cat = sp.get('category'), size = sp.get('size'), color = sp.get('color'), sale = sp.get('sale') === '1';
  const active = [cat, size, color, sale ? '1' : '', sp.get('min'), sp.get('max'), sp.get('q')].filter(Boolean).length;

  const panel = (
    <div className="space-y-7">
      <section>
        <h3 className="label">{t('shop.categories')}</h3>
        <ul className="space-y-1">
          <li><button type="button" onClick={() => set({ category: null })} className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${!cat ? 'bg-mauve-soft font-semibold text-mauve' : 'hover:bg-cream-deep'}`}>{t('shop.all_categories')}</button></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button type="button" onClick={() => set({ category: c.slug })} aria-pressed={cat === c.slug} className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm ${cat === c.slug ? 'bg-mauve-soft font-semibold text-mauve' : 'hover:bg-cream-deep'}`}>
                <span>{c.name}</span><span className="text-xs text-taupe">{c.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="label">{t('shop.price')} (USD)</h3>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const toC = (v: string) => { const n = Number(v.trim().replace(',', '.')); return v.trim() && Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? String(Math.round(n * 100)) : null; }; set({ min: toC(min), max: toC(max) }); }}>
          <input aria-label={t('shop.min')} inputMode="decimal" className="input !px-3 !py-2" placeholder={`${Math.floor(facets.priceMin / 100)}`} value={min} onChange={(e) => setMin(e.target.value)} />
          <span className="text-taupe">–</span>
          <input aria-label={t('shop.max')} inputMode="decimal" className="input !px-3 !py-2" placeholder={`${Math.ceil(facets.priceMax / 100)}`} value={max} onChange={(e) => setMax(e.target.value)} />
          <button type="submit" className="btn-outline btn-sm shrink-0">{t('shop.apply')}</button>
        </form>
      </section>

      {facets.sizes.length ? (
        <section>
          <h3 className="label">{t('product.size')}</h3>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={size === s} onClick={() => set({ size: size === s ? null : s })}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${size === s ? 'border-mauve bg-mauve text-white' : 'border-cream-line bg-white hover:border-mauve'}`}>{s}</button>
            ))}
          </div>
        </section>
      ) : null}

      {facets.colors.length ? (
        <section>
          <h3 className="label">{t('product.color')}</h3>
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => (
              <button key={c.name} type="button" aria-pressed={color === c.name} aria-label={c.name} title={c.name} onClick={() => set({ color: color === c.name ? null : c.name })}
                className={`h-8 w-8 rounded-full border-2 p-0.5 ${color === c.name ? 'border-mauve' : 'border-transparent hover:border-gold'}`}>
                <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.hex || '#ddd' }} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={sale} onChange={(e) => set({ sale: e.target.checked ? '1' : null })} className="h-4 w-4 accent-[#7D4E57]" /> {t('shop.on_sale')}
      </label>

      {active ? <button type="button" onClick={() => { start(() => router.push(path)); setOpen(false); }} className="btn-ghost btn-sm w-full border border-cream-line"><X size={14} /> {t('shop.clear')}</button> : null}
    </div>
  );

  return (
    <div className="flex items-start gap-8">
      <aside className="hidden w-60 shrink-0 lg:block" aria-label={t('shop.filters')}><div className="sticky top-24 rounded-card bg-white p-5 shadow-card">{panel}</div></aside>
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-taupe" aria-live="polite">{pending ? t('common.loading') : t('shop.n_products', { n: total })}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-outline btn-sm lg:hidden"><SlidersHorizontal size={14} /> {t('shop.filters')}{active ? ` (${active})` : ''}</button>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only text-taupe sm:not-sr-only">{t('shop.sort')}</span>
              <select className="input !w-auto !rounded-full !py-2 pr-8" value={sp.get('sort') ?? 'newest'} onChange={(e) => set({ sort: e.target.value === 'newest' ? null : e.target.value })}>
                {['newest', 'price_asc', 'price_desc', 'discount'].map((x) => <option key={x} value={x}>{t(`shop.sort_${x}`)}</option>)}
              </select>
            </label>
          </div>
        </div>
        {open ? <div className="mb-6 rounded-card bg-white p-5 shadow-card lg:hidden">{panel}</div> : null}
        <div className={pending ? 'opacity-60 transition-opacity' : ''}>{children}</div>
      </div>
    </div>
  );
}
