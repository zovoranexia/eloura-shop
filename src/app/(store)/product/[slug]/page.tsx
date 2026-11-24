import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { productDetail } from '@/server/catalog';
import { ProductDetailView } from '@/components/store/ProductDetailView';
import { ProductCard } from '@/components/store/ProductCard';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = getT();
  const p = await productDetail(params.slug, locale);
  if (!p) return {};
  const desc = p.description.slice(0, 155);
  return { title: p.name, description: desc, openGraph: { title: p.name, description: desc, images: p.images[0] ? [p.images[0]] : [] } };
}

export default async function ProductPage({ params }: Props) {
  const { t, locale } = getT();
  const user = await getSessionUser();
  const p = await productDetail(params.slug, locale, user?.id);
  if (!p) notFound();

  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, sku: p.sku, image: p.images,
    offers: { '@type': 'Offer', priceCurrency: 'USD', price: (p.priceCents / 100).toFixed(2), availability: p.variants.some((v) => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(p.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.ratingCount } } : {}),
  };
  return (
    <div className="container-x py-8 md:py-10">
      <nav aria-label="breadcrumb" className="mb-5 text-xs text-taupe">
        <Link href="/" className="hover:text-mauve">{t('nav.home')}</Link> / <Link href="/shop" className="hover:text-mauve">{t('nav.shop')}</Link>
        {p.category ? <> / <Link href={`/shop?category=${p.category.slug}`} className="hover:text-mauve">{p.category.name}</Link></> : null} / <span className="text-espresso">{p.name}</span>
      </nav>
      <ProductDetailView product={p} canReview={p.canReview} />
      {p.related.length ? (
        <section className="mt-16" aria-labelledby="rel">
          <h2 id="rel" className="text-3xl">{t('product.related')}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{p.related.map((r) => <li key={r.id}><ProductCard product={r} /></li>)}</ul>
        </section>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </div>
  );
}
