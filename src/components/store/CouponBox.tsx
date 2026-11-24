'use client';
import { useEffect, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

/** Coupon field. `applied` is the code the server accepted; `error` an `errors.*` code (COUPON_*). A rejected code can always be removed again. */
export function CouponBox({ value, applied, error, onApply, onClear }: { value: string; applied: string | null; error: string | null; onApply: (code: string) => void; onClear: () => void }) {
  const t = useT();
  const [code, setCode] = useState(value);
  // the stored coupon (value) can change from outside this box (other tab, cleared after an order)
  useEffect(() => { setCode(value); }, [value]);
  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-mauve-soft px-3.5 py-2.5 text-sm text-mauve">
        <span className="inline-flex items-center gap-2 font-semibold"><Tag size={15} />{t('cart.coupon_applied', { code: applied })}</span>
        <button type="button" onClick={() => { setCode(''); onClear(); }} aria-label={t('common.remove')} className="rounded-full p-1 hover:bg-white"><X size={15} /></button>
      </div>
    );
  }
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) onApply(code.trim()); else if (value) onClear(); }} className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">{t('cart.coupon_label')}</label>
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('cart.coupon_label')} maxLength={40} className="input !py-2 uppercase" autoComplete="off" />
        <button type="submit" className="btn-outline btn-sm shrink-0">{t('cart.coupon_apply')}</button>
        {value && error ? <button type="button" onClick={() => { setCode(''); onClear(); }} aria-label={t('common.remove')} className="shrink-0 rounded-full p-2 text-taupe hover:bg-cream-deep"><X size={15} /></button> : null}
      </form>
      {error ? <p role="alert" className="field-error">{t(`errors.${error}`)}</p> : null}
    </div>
  );
}
