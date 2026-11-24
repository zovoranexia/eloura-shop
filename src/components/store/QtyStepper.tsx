'use client';
import { Minus, Plus } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

export function QtyStepper({ value, onChange, max = 10, min = 1, size = 'md' }: { value: number; onChange: (n: number) => void; max?: number; min?: number; size?: 'sm' | 'md' }) {
  const t = useT();
  const cls = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex items-center rounded-full border border-cream-line bg-white" role="group" aria-label={t('cart.qty')}>
      <button type="button" className={`${cls} grid place-items-center rounded-full text-taupe hover:bg-cream-deep disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t('cart.decrease')}><Minus size={14} /></button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={`${cls} grid place-items-center rounded-full text-taupe hover:bg-cream-deep disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('cart.increase')}><Plus size={14} /></button>
    </div>
  );
}
