'use client';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

/** Floating "Back to top" button: appears after scrolling down, scrolls smoothly (instantly when the user prefers reduced motion). */
export function BackToTop() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShow(window.scrollY > 480));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      cancelAnimationFrame(frame);
    };
  }, []);

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // keyboard / screen-reader users: continue from the top of the page instead of staying on a now-hidden button
    (document.getElementById('main') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={t('common.back_to_top')}
      title={t('common.back_to_top')}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`no-print fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full bg-mauve text-white shadow-soft transition duration-200 hover:bg-mauve-dark focus-visible:outline-offset-4 sm:bottom-6 sm:right-6 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
