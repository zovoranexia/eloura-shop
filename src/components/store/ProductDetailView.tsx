'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Truck, Banknote, BadgeCheck, Star } from 'lucide-react';
import { useLocale, useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client/api';
import { useCart } from '@/lib/client/cart';
import { useWishlist } from '@/lib/client/wishlist';
import { useStoreConfig } from '@/lib/client/store-config';
import { formatUSD } from '@/lib/money';
import { formatDate } from '@/lib/time';
import type { ProductDetail } from '@/server/catalog';
import { Price } from './Price';
import { Stars } from './Stars';
import { ProductImage } from './ProductImage';
import { QtyStepper } from './QtyStepper';
import { VariantPicker, useVariantSelection } from './VariantPicker';

type Tab = 'description' | 'shipping' | 'cod' | 'reviews';

function ReviewForm({ productId }: { productId: number }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/account/reviews', { body: { productId, rating, comment: comment || undefined } });
      toast.success(t('product.review_thanks'));
      router.refresh();
    } catch (x) {
      toast.error(errorMessage(t, x));
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-cream-line bg-cream/60 p-5">
      <h3 className="font-serif text-xl">{t('product.write_review')}</h3>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label={t('product.rating')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} onClick={() => setRating(n)} className="p-0.5">
            <Star size={26} className={n <= rating ? 'fill-gold text-gold' : 'text-gold/40'} />
          </button>
        ))}
      </div>
      <label htmlFor="rv-comment" className="label mt-4">{t('product.comment')}</label>
      <textarea id="rv-comment" className="input min-h-24" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="submit" disabled={busy} className="btn-primary mt-3">{t('product.submit_review')}</button>
    </form>
  );
}

export function ProductDetailView({ product, canReview }: { product: ProductDetail; canReview: boolean }) {
  const t = useT();
  const locale = useLocale();
  const cart = useCart();
  const wish = useWishlist();
  const config = useStoreConfig();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('description');
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const sel = useVariantSelection(product.variants);
  const v = sel.selected;
  const liked = wish.has(product.id);
  const inStock = product.variants.some((x) => x.stock > 0);
  const maxQty = Math.max(1, Math.min(config.commerce.maxQtyPerLine, v?.stock ?? 1));
  const unit = v?.priceCents ?? product.priceCents;
  const q = Math.min(qty, maxQty); // switching to a variant with less stock must not leave a larger quantity selected
  const diliPost = config.diliPosts[0];

  function add() {
    if (!v || v.stock < 1) return;
    const already = cart.qtyOf(v.id);
    if (already >= v.stock) { toast.error(t('cart.only_left', { n: v.stock })); return; } // everything in stock is already in the basket
    cart.add(v.id, Math.min(q, v.stock - already));
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'description', label: t('product.tab_description') }, { key: 'shipping', label: t('product.tab_shipping') },
    { key: 'cod', label: t('product.tab_cod') }, { key: 'reviews', label: `${t('product.tab_reviews')} (${product.ratingCount})` },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      {/* gallery */}
      <div className="min-w-0">
        <ProductImage src={product.images[img] ?? null} alt={product.name} className="aspect-[4/4.2] rounded-card shadow-card" cover={false} />
        {product.images.length > 1 ? (
          <ul className="mt-3 flex gap-3">
            {product.images.map((src, i) => (
              <li key={`${i}-${src}`}>
                <button type="button" onClick={() => setImg(i)} aria-label={`${product.name} ${i + 1}`} aria-pressed={i === img} className={`overflow-hidden rounded-xl border-2 ${i === img ? 'border-mauve' : 'border-transparent'}`}>
                  <ProductImage src={src} alt="" className="h-20 w-20" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* buy box */}
      <div className="min-w-0">
        {product.category ? <Link href={`/shop?category=${product.category.slug}`} className="eyebrow hover:underline">{product.category.name}</Link> : null}
        <h1 className="mt-2 text-4xl md:text-5xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {product.rating ? <><Stars value={product.rating} /><button type="button" onClick={() => setTab('reviews')} className="text-xs text-taupe underline">{t('product.reviews_count', { n: product.ratingCount })}</button></> : <span className="text-xs text-taupe">{t('product.no_reviews')}</span>}
          <span className="text-xs text-taupe">SKU {product.variants.find((x) => x.id === v?.id)?.sku ?? product.sku}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Price cents={unit} compareAt={product.compareAtCents} size="lg" />
          {product.discountPercent ? <span className="rounded-full bg-mauve px-2.5 py-1 text-xs font-bold text-white">-{product.discountPercent}%</span> : null}
        </div>

        <div className="mt-6"><VariantPicker sel={sel} /></div>

        <p className={`mt-5 text-sm font-medium ${v && v.stock > 0 ? (v.stock <= 3 ? 'text-mauve' : 'text-emerald-700') : 'text-red-700'}`} role="status">
          {!inStock || !v || v.stock < 1 ? t('product.out_of_stock') : v.stock <= 3 ? t('product.low_stock', { n: v.stock }) : t('product.in_stock')}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <QtyStepper value={q} onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} max={maxQty} />
          <button type="button" onClick={add} disabled={!v || v.stock < 1} className="btn-primary min-w-48 flex-1 !py-3"><ShoppingBag size={17} /> {t('product.add_to_cart')} · {formatUSD(unit * q)}</button>
          <button type="button" onClick={() => wish.toggle(product.id)} aria-pressed={liked} aria-label={liked ? t('product.wishlist_remove') : t('product.wishlist_add')} className="grid h-12 w-12 place-items-center rounded-full border border-cream-line bg-white hover:border-mauve">
            <Heart size={20} className={liked ? 'fill-mauve text-mauve' : ''} />
          </button>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-taupe">
          <li className="flex items-center gap-2"><Truck size={16} className="text-mauve" />{config.diliFreeOverCents ? t('product.perk_delivery', { amount: formatUSD(config.diliFreeOverCents) }) : t('product.perk_delivery_plain')}</li>
          <li className="flex items-center gap-2"><Banknote size={16} className="text-mauve" />{t('product.perk_payments')}</li>
        </ul>
      </div>

      {/* tabs */}
      <div className="min-w-0 lg:col-span-2">
        <div role="tablist" aria-label={product.name} className="flex gap-1 overflow-x-auto border-b border-cream-line">
          {tabs.map((x) => (
            <button key={x.key} type="button" role="tab" id={`tab-${x.key}`} aria-selected={tab === x.key} aria-controls={`panel-${x.key}`} onClick={() => setTab(x.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === x.key ? 'border-mauve text-mauve' : 'border-transparent text-taupe hover:text-espresso'}`}>{x.label}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="rounded-b-card bg-white p-6 shadow-card">
          {tab === 'description' ? <p className="max-w-3xl whitespace-pre-line leading-relaxed text-taupe">{product.description || t('product.no_description')}</p> : null}
          {tab === 'shipping' ? (
            <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-taupe">
              <p>{t('product.shipping_dili', { fee: formatUSD(diliPost?.deliveryFeeCents ?? 0), eta: diliPost?.etaText ?? '1-2' })}</p>
              {config.diliFreeOverCents ? <p>{t('product.shipping_free', { amount: formatUSD(config.diliFreeOverCents) })}</p> : null}
              <p>{t('product.shipping_other')}</p>
              <p>{t('product.shipping_returns', { days: config.store.returnDays })}</p>
            </div>
          ) : null}
          {tab === 'cod' ? (
            <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-taupe">
              <p className="font-medium text-espresso">{t('product.cod_intro')}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t('product.cod_rule_zone')}</li>
                <li>{t('product.cod_rule_phone')}</li>
                <li>{t('product.cod_rule_cash')}</li>
                <li>{t('product.cod_rule_cap', { max: formatUSD(config.commerce.codMaxCents) })}</li>
              </ul>
              <Link href="/page/cod-terms" className="inline-block font-semibold text-mauve underline">{t('product.cod_full_terms')}</Link>
            </div>
          ) : null}
          {tab === 'reviews' ? (
            <div className="max-w-3xl">
              {product.reviews.length ? (
                <ul className="divide-y divide-cream-line">
                  {product.reviews.map((r) => (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-2"><Stars value={r.rating} /><span className="text-sm font-semibold">{r.name}</span>
                        {r.verified ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><BadgeCheck size={14} />{t('product.verified')}</span> : null}
                        <span className="text-xs text-taupe">{formatDate(r.createdAt, locale)}</span></div>
                      {r.comment ? <p className="mt-1.5 text-sm text-taupe">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-taupe">{t('product.no_reviews_yet')}</p>}
              {canReview ? <ReviewForm productId={product.id} /> : <p className="mt-4 text-xs text-taupe">{t('product.review_rule')}</p>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

