import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { listCategories } from '@/server/catalog';
import { ProductImage } from './ProductImage';

export async function CategoryStrip({ categories }: { categories: Awaited<ReturnType<typeof listCategories>> }) {
  const { t } = getT();
  if (!categories.length) return null;
  return (
    <section className="container-x mt-14" aria-labelledby="cat-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('home.categories_eyebrow')}</p>
          <h2 id="cat-title" className="mt-2 text-2xl sm:text-3xl md:text-4xl">{t('home.categories_title')}</h2>
        </div>
        <Link href="/categories" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-mauve hover:underline sm:text-sm">{t('home.categories_all')} <ArrowRight size={15} /></Link>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:gap-5 lg:grid-cols-6">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/shop?category=${c.slug}`} className="group block text-center">
              <ProductImage src={c.image} alt="" className="aspect-[1.25/1] rounded-card bg-[#FBF0ED] shadow-card transition-shadow group-hover:shadow-soft [&_img]:object-contain [&_img]:p-1.5" cover={false} />
              <span className="mt-2.5 block text-sm font-semibold group-hover:text-mauve">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
