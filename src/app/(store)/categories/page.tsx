import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { listCategories } from '@/server/catalog';
import { ProductImage } from '@/components/store/ProductImage';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getT().t('nav.categories') };
}

export default async function CategoriesPage() {
  const { t, locale } = getT();
  const categories = await listCategories(locale);
  return (
    <div className="container-x py-10">
      <p className="eyebrow">{t('home.categories_eyebrow')}</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{t('home.categories_title')}</h1>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/shop?category=${c.slug}`} className="group block overflow-hidden rounded-card bg-white shadow-card transition-shadow hover:shadow-soft">
              <ProductImage src={c.image} alt="" className="aspect-[1.4/1] bg-[#FBF0ED] [&_img]:object-contain [&_img]:p-3" cover={false} />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-serif text-2xl group-hover:text-mauve">{c.name}</span>
                <span className="text-xs text-taupe">{t('shop.n_products', { n: c.productCount })}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
