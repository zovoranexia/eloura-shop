'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

/** Accessible modal surface used for the cart drawer (side) and dialogs (center): Esc, focus trap, scroll lock. */
export function Overlay({ open, onClose, title, side = false, children, wide = false }: { open: boolean; onClose: () => void; title: string; side?: boolean; children: ReactNode; wide?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<Element | null>(null);
  // keep the latest onClose without re-running the focus/scroll-lock effect on every parent render (the cart drawer re-renders on each quote)
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    last.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus],input,select,button,a')?.focus(), 30);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      (last.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const panel = side
    ? 'absolute right-0 top-0 flex h-full w-[min(100vw,420px)] flex-col bg-white shadow-soft'
    : `absolute left-1/2 top-1/2 flex max-h-[90vh] w-[94vw] ${wide ? 'max-w-[720px]' : 'max-w-[480px]'} -translate-x-1/2 -translate-y-1/2 flex-col rounded-card bg-white shadow-soft`;
  return (
    <div className="no-print fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-espresso/50" onClick={() => closeRef.current()} />
      <div ref={ref} className={panel}>
        <div className="flex items-center justify-between border-b border-cream-line px-5 py-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button type="button" onClick={() => closeRef.current()} aria-label={t('common.close')} className="rounded-full p-2 text-taupe hover:bg-cream-deep"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
