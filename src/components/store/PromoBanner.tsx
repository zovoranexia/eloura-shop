import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getT } from '@/lib/i18n';
import type { StoreBanner } from '@/server/storefront';
import { Botanical } from './Icons';

/** Mid-page promotional banner (managed in the admin CMS, placement PROMO). */
export async function PromoBanner({ banner }: { banner: StoreBanner | undefined }) {
  const { t } = await getT();
  if (!banner) return null;
  return (
    <section className="container-x mt-14" aria-label={banner.badge || t('home.promo_label')}>
      <div className="relative grid overflow-hidden rounded-card bg-gradient-to-r from-[#F4E8E3] via-[#EFD9D3] to-[#E9CFCB] md:grid-cols-[1fr_1.15fr]">
        <div className="relative z-10 flex flex-col items-start gap-3 p-7 md:p-10">
          {banner.badge ? <span className="pill bg-white/70">{banner.badge}</span> : null}
          <h2 className="font-serif text-3xl font-semibold text-mauve md:text-4xl">{banner.title}</h2>
          {banner.highlight ? <p className="font-serif text-2xl font-semibold text-mauve-dark md:text-3xl">{banner.highlight}</p> : null}
          {banner.subtitle ? <p className="max-w-sm text-sm text-espresso/80">{banner.subtitle}</p> : null}
          <Link href={banner.ctaUrl} className="btn-primary mt-2">{banner.ctaLabel || t('hero.cta')} <ArrowRight size={15} /></Link>
        </div>
        <div className="relative min-h-[180px] md:min-h-[230px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center [mask-image:linear-gradient(to_right,transparent,black_28%)]" />
        </div>
        <Botanical className="pointer-events-none absolute -right-4 bottom-0 hidden h-44 w-28 text-mauve/25 md:block" />
      </div>
    </section>
  );
}
