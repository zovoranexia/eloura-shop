'use client';
import Link from 'next/link';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useCart } from '@/lib/client/cart';
import { useStoreConfig } from '@/lib/client/store-config';
import { isLine } from '@/lib/client/types';
import { formatUSD } from '@/lib/money';
import { ProductImage } from './ProductImage';
import { QtyStepper } from './QtyStepper';
import { CouponBox } from './CouponBox';

export function CartView() {
  const t = useT();
  const cart = useCart();
  const { commerce, diliFreeOverCents } = useStoreConfig();
  const { items, quote } = cart;
  const lines = (quote?.lines ?? []).filter(isLine);
  const sub = quote?.subtotalCents ?? 0;
  const blocked = lines.some((l) => !l.enough || l.stock === 0);

  if (!cart.ready) return <p className="py-20 text-center text-taupe">{t('common.loading')}</p>;
  if (!items.length) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream text-mauve"><ShoppingBag size={28} /></span>
        <p className="mt-4 font-serif text-3xl">{t('cart.empty')}</p>
        <p className="mt-2 text-sm text-taupe">{t('cart.empty_text')}</p>
        <Link href="/shop" className="btn-primary mt-6">{t('cart.empty_cta')}</Link>
      </div>
    );
  }
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <ul className="divide-y divide-cream-line rounded-card bg-white px-5 shadow-card">
        {items.map((it) => {
          const l = lines.find((x) => x.variantId === it.variantId);
          return (
            <li key={it.variantId} className="flex gap-4 py-5">
              <ProductImage src={l?.image ?? null} alt={l?.name ?? ''} className="h-28 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={l ? `/product/${l.slug}` : '#'} className="font-semibold hover:text-mauve">{l?.name ?? '…'}</Link>
                    {l ? <p className="mt-0.5 text-xs text-taupe">{[l.color, l.size].filter(Boolean).join(' · ')} · SKU {l.sku}</p> : null}
                  </div>
                  <button type="button" onClick={() => cart.remove(it.variantId)} aria-label={t('cart.remove')} className="grid h-8 w-8 place-items-center rounded-full text-taupe hover:bg-cream-deep hover:text-red-700"><Trash2 size={16} /></button>
                </div>
                {l && (l.stock === 0 || !l.enough) ? <p className="mt-1 text-xs font-medium text-red-700">{l.stock === 0 ? t('product.out_of_stock') : t('cart.only_left', { n: l.stock })}</p> : null}
                <div className="mt-3 flex items-center justify-between">
                  <QtyStepper value={it.qty} max={l ? Math.min(commerce.maxQtyPerLine, Math.max(l.stock, 1)) : commerce.maxQtyPerLine} onChange={(n) => cart.setQty(it.variantId, n)} />
                  <div className="text-right">
                    <p className="font-bold text-mauve">{l ? formatUSD(l.unitPriceCents * it.qty) : ''}</p>
                    {l && it.qty > 1 ? <p className="text-xs text-taupe">{formatUSD(l.unitPriceCents)} × {it.qty}</p> : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="space-y-4 rounded-card bg-white p-6 shadow-card lg:sticky lg:top-24" aria-label={t('cart.summary')}>
        <h2 className="font-serif text-2xl">{t('cart.summary')}</h2>
        <CouponBox value={cart.coupon} applied={quote?.couponCode ?? null} error={quote?.couponError ?? null} onApply={cart.applyCoupon} onClear={() => cart.applyCoupon('')} />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-taupe">{t('common.subtotal')}</dt><dd className="font-semibold">{formatUSD(sub)}</dd></div>
          {quote && quote.discountCents > 0 ? <div className="flex justify-between text-mauve"><dt>{t('cart.discount')}</dt><dd className="font-semibold">-{formatUSD(quote.discountCents)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-taupe">{t('cart.shipping')}</dt><dd className="text-taupe">{t('cart.shipping_at_checkout_short')}</dd></div>
        </dl>
        {diliFreeOverCents ? (
          <p className="rounded-xl bg-cream px-3 py-2 text-xs text-mauve">
            {sub >= diliFreeOverCents ? t('cart.free_reached') : t('cart.free_hint', { amount: formatUSD(diliFreeOverCents - sub) })}
          </p>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-cream-line pt-4"><span className="font-semibold">{t('common.total')}</span><span className="text-2xl font-bold">{formatUSD(sub - (quote?.discountCents ?? 0))}</span></div>
        <Link href="/checkout" aria-disabled={blocked || cart.quoting} className={`btn-primary btn-block !py-3 ${blocked ? 'pointer-events-none opacity-50' : ''}`}>{t('cart.checkout')}</Link>
        <Link href="/shop" className="btn-ghost btn-block">{t('cart.continue')}</Link>
      </aside>
    </div>
  );
}
