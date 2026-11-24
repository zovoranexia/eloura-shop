'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { api, errorMessage } from '@/lib/client/api';
import { useCart } from '@/lib/client/cart';
import { useWishlist } from '@/lib/client/wishlist';
import type { ProductCard as Card } from '@/lib/client/types';
import { useToast } from '@/components/ui/Toast';
import { ProductImage } from './ProductImage';
import { Stars } from './Stars';
import { Price } from './Price';
import { Overlay } from './Overlay';
import { VariantPicker, useVariantSelection, type Variant } from './VariantPicker';
import { formatUSD } from '@/lib/money';

function QuickAdd({ product, variants, onClose }: { product: Card; variants: Variant[]; onClose: () => void }) {
  const t = useT();
  const cart = useCart();
  const sel = useVariantSelection(variants);
  const v = sel.selected;
  return (
    <Overlay open onClose={onClose} title={t('product.quick_add_title')}>
      <div className="space-y-5 overflow-y-auto p-5">
        <div className="flex gap-4">
          <ProductImage src={product.image} alt={product.name} className="h-28 w-24 shrink-0 rounded-xl" />
          <div>
            <p className="font-semibold">{product.name}</p>
            <div className="mt-1"><Price cents={v?.priceCents ?? product.priceCents} compareAt={product.compareAtCents} /></div>
          </div>
        </div>
        <VariantPicker sel={sel} />
        {v && v.stock > 0 && v.stock <= 3 ? <p className="text-xs font-medium text-mauve">{t('product.low_stock', { n: v.stock })}</p> : null}
        <button type="button" className="btn-primary btn-block" disabled={!v || v.stock < 1} onClick={() => { if (v) { cart.add(v.id, 1); onClose(); } }}>
          <ShoppingBag size={16} /> {v && v.stock > 0 ? `${t('product.add_to_cart')} · ${formatUSD(v.priceCents)}` : t('product.out_of_stock')}
        </button>
      </div>
    </Overlay>
  );
}

export function ProductCard({ product }: { product: Card }) {
  const t = useT();
  const cart = useCart();
  const wish = useWishlist();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<Variant[] | null>(null);
  const liked = wish.has(product.id);

  async function addClick() {
    if (!product.inStock) return;
    setBusy(true);
    try {
      const r = await api<{ variants: Variant[] }>(`/api/store/product-options/${product.id}`);
      const inStock = r.variants.filter((v) => v.stock > 0);
      if (r.variants.length === 1 && inStock.length === 1) cart.add(inStock[0].id, 1);
      else setOptions(r.variants);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  const badge = product.discountPercent ? `-${product.discountPercent}%` : product.isNew ? t('product.new') : null;
  return (
    <article className="group flex h-full flex-col rounded-card bg-white p-2.5 shadow-card transition-shadow hover:shadow-soft">
      <div className="relative">
        <Link href={`/product/${product.slug}`} className="block overflow-hidden rounded-[14px]" aria-label={product.name}>
          <ProductImage src={product.image} alt={product.name} className="aspect-[4/3.6] rounded-[14px] transition-transform duration-500 group-hover:scale-[1.03]" cover={false} />
        </Link>
        {badge ? <span className="absolute left-2.5 top-2.5 rounded-full bg-mauve px-2.5 py-1 text-[11px] font-bold text-white">{badge}</span> : null}
        <button type="button" onClick={() => wish.toggle(product.id)} aria-pressed={liked} aria-label={liked ? t('product.wishlist_remove') : t('product.wishlist_add')}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-card hover:bg-white">
          <Heart size={16} className={liked ? 'fill-mauve text-mauve' : 'text-espresso'} />
        </button>
        {!product.inStock ? <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-white/90 py-1 text-center text-xs font-semibold text-taupe">{t('product.out_of_stock')}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-1 pt-3">
        <h3 className="font-sans text-sm font-semibold leading-snug"><Link href={`/product/${product.slug}`} className="hover:text-mauve">{product.name}</Link></h3>
        <div className="flex h-4 items-center gap-1.5 text-[11px] text-taupe">
          {product.ratingCount > 0 && product.rating ? <><Stars value={product.rating} size={12} /><span>({product.ratingCount})</span></> : null}
        </div>
        <Price cents={product.priceCents} compareAt={product.compareAtCents} />
        <button type="button" onClick={addClick} disabled={!product.inStock || busy} className="btn-primary btn-block mt-auto !px-2 !py-2.5 text-[13px] whitespace-nowrap">
          <ShoppingBag size={15} className="hidden sm:block" /> {t('product.add_to_cart')}
        </button>
      </div>
      {options ? <QuickAdd product={product} variants={options} onClose={() => setOptions(null)} /> : null}
    </article>
  );
}
