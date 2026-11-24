'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useCart } from '@/lib/client/cart';
import { useStoreConfig } from '@/lib/client/store-config';
import { isLine } from '@/lib/client/types';
import { formatUSD } from '@/lib/money';
import { Overlay } from './Overlay';
import { QtyStepper } from './QtyStepper';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const t = useT();
  const { drawerOpen, setDrawerOpen, items, quote, setQty, remove, quoting, refresh } = useCart();
  const { commerce, diliFreeOverCents } = useStoreConfig();
  const close = () => setDrawerOpen(false);
  // stock / prices may have changed since the last quote
  useEffect(() => { if (drawerOpen) refresh(); }, [drawerOpen, refresh]);
  const lines = (quote?.lines ?? []).filter(isLine);
  const sub = quote?.subtotalCents ?? 0;
  const hint = diliFreeOverCents && sub < diliFreeOverCents ? t('cart.free_hint', { amount: formatUSD(diliFreeOverCents - sub) }) : diliFreeOverCents && sub >= diliFreeOverCents ? t('cart.free_reached') : null;
  const blocked = lines.some((l) => !l.enough || l.stock === 0);

  return (
    <Overlay open={drawerOpen} onClose={close} title={t('cart.drawer_title')} side>
      {!items.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-cream text-mauve"><ShoppingBag size={28} /></span>
          <p className="font-serif text-2xl">{t('cart.empty')}</p>
          <p className="text-sm text-taupe">{t('cart.empty_text')}</p>
          <Link href="/shop" onClick={close} className="btn-primary">{t('cart.empty_cta')}</Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-cream-line overflow-y-auto px-5">
            {items.map((it) => {
              const l = lines.find((x) => x.variantId === it.variantId);
              return (
                <li key={it.variantId} className="flex gap-3 py-4">
                  <ProductImage src={l?.image ?? null} alt={l?.name ?? ''} className="h-24 w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Link href={l ? `/product/${l.slug}` : '#'} onClick={close} className="line-clamp-2 text-sm font-semibold hover:text-mauve">{l?.name ?? '…'}</Link>
                    {l ? <p className="mt-0.5 text-xs text-taupe">{[l.color, l.size].filter(Boolean).join(' · ')}</p> : null}
                    {l && (l.stock === 0 || !l.enough) ? <p className="mt-1 text-xs font-medium text-red-700">{l.stock === 0 ? t('product.out_of_stock') : t('cart.only_left', { n: l.stock })}</p> : null}
                    <div className="mt-2 flex items-center justify-between">
                      <QtyStepper size="sm" value={it.qty} max={l ? Math.min(commerce.maxQtyPerLine, Math.max(l.stock, 1)) : commerce.maxQtyPerLine} onChange={(n) => setQty(it.variantId, n)} />
                      <span className="text-sm font-bold text-mauve">{l ? formatUSD(l.unitPriceCents * it.qty) : ''}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(it.variantId)} aria-label={t('cart.remove')} className="h-8 w-8 shrink-0 place-items-center rounded-full text-taupe hover:bg-cream-deep hover:text-red-700 grid"><Trash2 size={16} /></button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-3 border-t border-cream-line bg-cream/60 p-5">
            {hint ? <p className="rounded-xl bg-white px-3 py-2 text-xs text-mauve">{hint}</p> : null}
            <div className="flex items-center justify-between text-sm">
              <span className="text-taupe">{t('common.subtotal')}</span>
              <span className={`text-lg font-bold ${quoting ? 'opacity-50' : ''}`}>{formatUSD(sub)}</span>
            </div>
            <p className="text-xs text-taupe">{t('cart.shipping_at_checkout')}</p>
            <Link href="/checkout" onClick={(e) => { if (blocked) e.preventDefault(); else close(); }} aria-disabled={blocked} tabIndex={blocked ? -1 : undefined} className={`btn-primary btn-block ${blocked ? 'pointer-events-none opacity-50' : ''}`}>{t('cart.checkout')}</Link>
            <Link href="/cart" onClick={close} className="btn-ghost btn-block">{t('cart.view_cart')}</Link>
          </div>
        </>
      )}
    </Overlay>
  );
}
