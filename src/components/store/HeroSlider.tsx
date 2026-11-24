'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Headset, ShieldCheck, Truck } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import type { StoreBanner } from '@/lib/client/types';

/** Full-width rounded hero: banners come from the database (managed in the admin CMS). Auto-advances, pauses on hover/focus. */
export function HeroSlider({ banners }: { banners: StoreBanner[] }) {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = banners.length;
  const cur = n ? idx % n : 0; // banners can shrink after a refresh while idx points past the end

  const go = useCallback((i: number) => setIdx(((i % n) + n) % n), [n]);
  useEffect(() => {
    if (n < 2 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const h = setInterval(() => setIdx((i) => (i + 1) % n), 6500);
    return () => clearInterval(h);
  }, [n, paused]);

  if (!n) return null;
  const trust = [
    { icon: <Truck size={22} strokeWidth={1.5} />, title: t('hero.trust_delivery_title'), sub: t('hero.trust_delivery_sub') },
    { icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: t('hero.trust_payment_title'), sub: t('hero.trust_payment_sub') },
    { icon: <Headset size={22} strokeWidth={1.5} />, title: t('hero.trust_support_title'), sub: t('hero.trust_support_sub') },
  ];

  return (
    <section
      aria-roledescription="carousel" aria-label={t('hero.label')}
      className="relative overflow-hidden rounded-hero bg-[#EFE4DD] shadow-soft"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current != null) { const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 50) go(cur + (d < 0 ? 1 : -1)); touch.current = null; } }}
    >
      <div className="grid">
        {banners.map((b, i) => {
          const active = i === cur;
          const H = i === 0 ? 'h1' : 'h2';
          return (
            <div key={b.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${n}`} aria-hidden={!active} {...(!active ? { inert: '' as unknown as boolean } : {})}
              className={`col-start-1 row-start-1 grid transition-opacity duration-700 md:block md:h-[470px] ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt="" className="h-[230px] w-full object-cover object-[76%_center] sm:h-[300px] md:absolute md:inset-0 md:h-full" loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} />
              <div className="relative z-10 flex flex-col justify-center gap-4 bg-gradient-to-b from-[#F2E8E2] to-[#EFE4DD] p-6 pb-14 md:w-[54%] md:bg-none md:px-14 md:py-10">
                {b.badge ? <span className="pill w-fit bg-white/70">{b.badge}</span> : null}
                <H className="font-serif text-[2.4rem] font-medium leading-[1.02] md:text-6xl">
                  {b.title}
                  {b.highlight ? <><br /><em className="font-normal italic text-mauve">{b.highlight}</em></> : null}
                </H>
                {b.subtitle ? <p className="max-w-md text-[15px] leading-relaxed text-espresso/80">{b.subtitle}</p> : null}
                <Link href={b.ctaUrl} className="btn-dark w-fit px-6 py-3" tabIndex={active ? 0 : -1}>{b.ctaLabel || t('hero.cta')} <ArrowRight size={16} /></Link>
                <ul className="mt-2 hidden flex-wrap gap-x-7 gap-y-3 md:flex">
                  {trust.map((x) => (
                    <li key={x.title} className="flex items-center gap-2.5 text-espresso/80">
                      <span className="text-mauve">{x.icon}</span>
                      <span className="text-[11px] leading-tight"><span className="block font-semibold text-espresso">{x.title}</span>{x.sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {n > 1 ? (
        <>
          <button type="button" onClick={() => go(cur - 1)} aria-label={t('hero.prev')} className="absolute left-3 top-[115px] z-20 grid h-10 w-10 place-items-center rounded-full bg-white shadow-card hover:bg-cream-deep sm:top-[150px] md:left-4 md:top-1/2 md:-translate-y-1/2"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => go(cur + 1)} aria-label={t('hero.next')} className="absolute right-3 top-[115px] z-20 grid h-10 w-10 place-items-center rounded-full bg-white shadow-card hover:bg-cream-deep sm:top-[150px] md:right-4 md:top-1/2 md:-translate-y-1/2"><ChevronRight size={20} /></button>
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2" role="tablist" aria-label={t('hero.label')}>
            {banners.map((b, i) => (
              <button key={b.id} type="button" role="tab" aria-selected={i === cur} aria-label={t('hero.goto', { n: i + 1 })} onClick={() => go(i)}
                className={`h-2.5 rounded-full transition-all ${i === cur ? 'w-6 bg-mauve' : 'w-2.5 bg-mauve/30 hover:bg-mauve/60'}`} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
