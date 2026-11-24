'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import type { ProductCard as Card } from '@/lib/client/types';
import { ProductCard } from './ProductCard';

export function FeaturedCarousel({ products, eyebrow, title }: { products: Card[]; eyebrow: string; title: string }) {
  const t = useT();
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: 'smooth' });
  if (!products.length) return null;
  return (
    <section className="container-x mt-14" aria-labelledby="featured-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="featured-title" className="mt-2 text-3xl md:text-4xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/shop?featured=1" className="mr-2 hidden text-sm font-semibold text-mauve hover:underline sm:inline">{t('home.view_all')}</Link>
          <button type="button" onClick={() => scroll(-1)} aria-label={t('common.previous')} className="grid h-10 w-10 place-items-center rounded-full border border-cream-line bg-white hover:bg-cream-deep"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => scroll(1)} aria-label={t('common.next')} className="grid h-10 w-10 place-items-center rounded-full border border-cream-line bg-white hover:bg-cream-deep"><ChevronRight size={18} /></button>
        </div>
      </div>
      <ul ref={track} className="-mx-1 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <li key={p.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-15px)]"><ProductCard product={p} /></li>
        ))}
      </ul>
    </section>
  );
}
