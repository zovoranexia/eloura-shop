import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getT } from '@/lib/i18n';
import { listCategories, listProducts } from '@/server/catalog';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopFilters } from '@/components/store/ShopFilters';

type SP = Record<string, string | string[] | undefined>;

// Every field degrades to "no filter" instead of throwing: a hand-edited URL must never produce a 500 page.
const MAX_CENTS = 100_000_000; // keeps Prisma's 32-bit Int comparisons safe
const schema = z.object({
  category: z.string().max(80).optional().catch(undefined), q: z.string().transform((s) => s.trim().slice(0, 80)).optional().catch(undefined),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'discount']).catch('newest'),
  sale: z.literal('1').optional().catch(undefined), featured: z.literal('1').optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(MAX_CENTS).optional().catch(undefined), max: z.coerce.number().int().min(0).max(MAX_CENTS).optional().catch(undefined),
  size: z.string().max(20).optional().catch(undefined), color: z.string().max(40).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
});
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { t, locale } = getT();
  const cat = first(searchParams.category);
  if (cat) {
    const c = (await listCategories(locale)).find((x) => x.slug === cat);
    if (c) return { title: c.name };
  }
  return { title: t('nav.shop') };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const { t, locale } = getT();
  const f = schema.parse(Object.fromEntries(Object.entries(searchParams).map(([k, v]) => [k, first(v)])));
  const [categories, result] = await Promise.all([
    listCategories(locale),
    listProducts({ category: f.category, q: f.q, sort: f.sort, sale: !!f.sale, featured: !!f.featured, min: f.min, max: f.max, size: f.size, color: f.color, page: f.page, limit: 12 }, locale),
  ]);
  const current = categories.find((c) => c.slug === f.category);
  const title = f.q ? t('shop.results_for', { q: f.q }) : current ? current.name : f.sale ? t('shop.on_sale') : t('shop.all_products');

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) { const x = first(v); if (x && k !== 'page') q.set(k, x); }
    if (p > 1) q.set('page', String(p));
    return `/shop${q.toString() ? `?${q}` : ''}`;
  };
  // out-of-range page (shared link after the catalogue shrank, hand-edited URL): go to the last real page instead of an empty list
  if (f.page > result.pages) redirect(pageHref(result.pages));

  return (
    <div className="container-x py-8 md:py-10">
      <nav aria-label={t('common.breadcrumb')} className="mb-3 text-xs text-taupe">
        <Link href="/" className="hover:text-mauve">{t('nav.home')}</Link> / <Link href="/shop" className="hover:text-mauve">{t('nav.shop')}</Link>{current ? <> / <span className="text-espresso">{current.name}</span></> : null}
      </nav>
      <h1 className="mb-6 text-4xl md:text-5xl">{title}</h1>
      <ShopFilters categories={categories.map((c) => ({ slug: c.slug, name: c.name, productCount: c.productCount }))} facets={result.facets} total={result.total}>
        {result.items.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {result.items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
          </ul>
        ) : (
          <div className="rounded-card bg-white p-12 text-center shadow-card">
            <p className="font-serif text-2xl">{t('shop.no_results')}</p>
            <p className="mt-2 text-sm text-taupe">{t('shop.no_results_text')}</p>
            <Link href="/shop" className="btn-primary mt-5">{t('shop.clear')}</Link>
          </div>
        )}
        {result.pages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t('common.pagination')}>
            {f.page > 1 ? <Link href={pageHref(f.page - 1)} className="btn-outline btn-sm">{t('common.previous')}</Link> : null}
            <span className="px-3 text-sm text-taupe">{t('common.page', { page: result.page, pages: result.pages })}</span>
            {f.page < result.pages ? <Link href={pageHref(f.page + 1)} className="btn-outline btn-sm">{t('common.next')}</Link> : null}
          </nav>
        ) : null}
      </ShopFilters>
    </div>
  );
}
