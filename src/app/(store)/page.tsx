import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { featuredProducts, listCategories } from '@/server/catalog';
import { getBanners, getStoreConfig } from '@/server/storefront';
import { HeroSlider } from '@/components/store/HeroSlider';
import { CategoryStrip } from '@/components/store/CategoryStrip';
import { FeaturedCarousel } from '@/components/store/FeaturedCarousel';
import { PromoBanner } from '@/components/store/PromoBanner';
import { ValueBar } from '@/components/store/ValueBar';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { absolute: t('home.meta_title') }, description: t('home.meta_description') };
}

export default async function HomePage() {
  const { t, locale } = await getT();
  const [hero, promo, categories, featured, config] = await Promise.all([
    getBanners('HERO', locale), getBanners('PROMO', locale), listCategories(locale), featuredProducts(locale, 8), getStoreConfig(locale),
  ]);
  return (
    <>
      <div className="container-x mt-4"><HeroSlider banners={hero} /></div>
      <CategoryStrip categories={categories} />
      <FeaturedCarousel products={featured} eyebrow={t('home.featured_eyebrow')} title={t('home.featured_title')} />
      <PromoBanner banner={promo[0]} />
      <ValueBar config={config} />
    </>
  );
}
