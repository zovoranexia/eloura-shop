'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CreditCard, Landmark, Smartphone, Wallet, Banknote, ShoppingBag } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, centsText, errorMessage, fieldMessage } from '@/lib/client/api';
import { useAuth } from '@/lib/client/auth';
import { useCart } from '@/lib/client/cart';
import { useStoreConfig } from '@/lib/client/store-config';
import { isLine, type CustomerAddress, type MethodOption, type Quote } from '@/lib/client/types';
import { normalizePhone } from '@/lib/phone';
import { formatUSD } from '@/lib/money';
import { Field } from './Field';
import { CouponBox } from './CouponBox';
import { ProductImage } from './ProductImage';

type MethodKey = MethodOption['key'];
type Form = {
  name: string; email: string; phone: string; municipality: string; adminPost: string; suco: string; street: string; addressNotes: string; note: string;
  paymentMethod: MethodKey | ''; acceptCodTerms: boolean;
};
const EMPTY: Form = { name: '', email: '', phone: '', municipality: '', adminPost: '', suco: '', street: '', addressNotes: '', note: '', paymentMethod: '', acceptCodTerms: false };

const ICON: Record<MethodKey, React.ReactNode> = {
  BANK_BNCTL: <Landmark size={20} />, ATM_BNCTL: <CreditCard size={20} />, TPAY: <Smartphone size={20} />, MOSAN: <Wallet size={20} />, COD: <Banknote size={20} />,
};

export function CheckoutFlow({ addresses }: { addresses: CustomerAddress[] }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const cart = useCart();
  const config = useStoreConfig();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false); // a quote request is pending: the figures on screen are not final
  const [recheck, setRecheck] = useState(0);
  const attempt = useRef<{ sig: string; key: string } | null>(null); // idempotency key of the current checkout attempt
  const submitting = useRef(false); // hard guard against a double submit (state updates are asynchronous)

  // prefill from the account (name / e-mail / phone + default saved address)
  useEffect(() => {
    if (prefilled || !user) return;
    const d = addresses.find((a) => a.isDefault) ?? addresses[0];
    setF((cur) => ({
      ...cur, name: cur.name || user.name, email: cur.email || user.email, phone: cur.phone || user.phone || '',
      ...(d && !cur.municipality ? { name: cur.name || d.recipient, phone: cur.phone || d.phone, municipality: d.municipality, adminPost: d.adminPost, suco: d.suco, street: d.street, addressNotes: d.notes } : {}),
    }));
    setPrefilled(true);
  }, [user, addresses, prefilled]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  const post = config.diliPosts.find((p) => p.key === f.adminPost);
  const isDili = f.municipality === 'dili';

  // live quote (prices, discount, delivery fee, COD eligibility) from the server
  const itemsKey = JSON.stringify(cart.items);
  useEffect(() => {
    if (!cart.ready || !cart.items.length) return;
    const ctrl = new AbortController();
    setQuoteBusy(true);
    const h = setTimeout(() => {
      api<Quote>('/api/cart/quote', {
        body: { items: cart.items, municipality: f.municipality || undefined, adminPost: f.adminPost || undefined, suco: f.suco || undefined, street: f.street || undefined, phone: f.phone || undefined, coupon: cart.coupon || undefined },
        signal: ctrl.signal,
      }).then((q) => { if (ctrl.signal.aborted) return; setQuote(q); setQuoteBusy(false); }).catch(() => { if (!ctrl.signal.aborted) setQuoteBusy(false); });
    }, 300);
    return () => { clearTimeout(h); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, f.municipality, f.adminPost, f.suco, f.street, f.phone, cart.coupon, cart.ready, user?.id, recheck]);

  // drop a chosen method that stopped being available (e.g. COD after switching municipality)
  const method = quote?.methods.find((m) => m.key === f.paymentMethod);
  useEffect(() => {
    if (f.paymentMethod && quote && (!method || !method.available)) {
      setF((cur) => ({ ...cur, paymentMethod: '', acceptCodTerms: false }));
      setStep((s) => (s === 3 ? 2 : s)); // the review step is meaningless without a valid method
    }
  }, [quote, method, f.paymentMethod]);

  const lines = (quote?.lines ?? []).filter(isLine);
  const codFee = method?.key === 'COD' ? method.feeCents : 0;
  const total = (quote ? quote.subtotalCents - quote.discountCents + quote.shippingCents : 0) + codFee;
  const stockProblem = (quote?.lines ?? []).some((l) => !isLine(l) || !l.available || !l.enough || l.stock === 0);

  function validateStep1() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'REQUIRED';
    if (!normalizePhone(f.phone).valid) e.phone = 'INVALID_PHONE';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'invalid_string';
    if (!f.municipality) e.municipality = 'REQUIRED';
    if (isDili && !f.adminPost) e.adminPost = 'REQUIRED';
    if (isDili && post && post.sucos.length && !f.suco) e.suco = 'REQUIRED';
    if (f.street.trim().length < 3) e.street = 'REQUIRED';
    setErrors(e);
    return !Object.keys(e).length;
  }
  function validateStep2() {
    const e: Record<string, string> = {};
    if (!f.paymentMethod) e.paymentMethod = 'REQUIRED';
    if (f.paymentMethod === 'COD' && !f.acceptCodTerms) e.acceptCodTerms = 'COD_TERMS_REQUIRED';
    setErrors(e);
    return !Object.keys(e).length;
  }
  function next() {
    if (step === 1 && validateStep1()) { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (step === 2 && validateStep2()) { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  async function place() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const payload = {
          items: cart.items, name: f.name.trim(), email: f.email.trim() || undefined, phone: f.phone.trim(), municipality: f.municipality, adminPost: f.adminPost || undefined,
          suco: f.suco || undefined, street: f.street.trim(), addressNotes: f.addressNotes.trim() || undefined, note: f.note.trim() || undefined,
          paymentMethod: f.paymentMethod, coupon: quote?.couponCode || undefined, acceptCodTerms: f.paymentMethod === 'COD' ? f.acceptCodTerms : undefined,
      };
      // Same payload retried (e.g. after a dropped connection) = same key, so the server never creates a duplicate order.
      const sig = JSON.stringify(payload);
      if (!attempt.current || attempt.current.sig !== sig) attempt.current = { sig, key: crypto.randomUUID() };
      const r = await api<{ code: string; token: string }>('/api/orders', { body: payload, idempotencyKey: attempt.current.key });
      attempt.current = null;
      cart.clear();
      cart.applyCoupon(''); // the coupon was consumed by this order
      router.push(`/order/${r.code}?t=${encodeURIComponent(r.token)}`);
    } catch (e) {
      submitting.current = false;
      setBusy(false);
      setRecheck((n) => n + 1); // prices / stock may be what went wrong: re-quote
      cart.refresh();
      if (e instanceof ApiError) {
        if (e.code === 'VALIDATION') {
          setErrors(e.fields);
          setStep(Object.keys(e.fields).some((k) => ['paymentMethod', 'acceptCodTerms', 'coupon'].includes(k)) ? 2 : 1);
        } else if (e.code.startsWith('COD_') || e.code === 'PAYMENT_METHOD_UNAVAILABLE' || e.code.startsWith('COUPON_')) setStep(2);
        else if (['INVALID_PHONE', 'ZONE_UNAVAILABLE'].includes(e.code)) setStep(1);
      }
      toast.error(errorMessage(t, e));
    }
  }

  const err = (k: string) => fieldMessage(t, errors[k]);
  const steps = [t('checkout.step_contact'), t('checkout.step_delivery'), t('checkout.step_review')];

  if (!cart.ready) return <p className="py-20 text-center text-taupe">{t('common.loading')}</p>;
  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center shadow-card">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cream text-mauve"><ShoppingBag size={28} /></span>
        <p className="mt-4 font-serif text-3xl">{t('cart.empty')}</p>
        <Link href="/shop" className="btn-primary mt-6">{t('cart.empty_cta')}</Link>
      </div>
    );
  }

  const reasonText = (m: MethodOption) => (m.reason ? t(`errors.${m.reason}`, { max: centsText(m.max), min: centsText(m.min) }) : '');

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_390px]">
      <div className="space-y-6">
        <ol className="flex items-center gap-2 text-sm" aria-label={t('checkout.steps')}>
          {steps.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const done = step > n, cur = step === n;
            return (
              <li key={label} className="flex flex-1 items-center gap-2" aria-current={cur ? 'step' : undefined}>
                <button type="button" disabled={!done} onClick={() => setStep(n)} aria-label={label} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-mauve text-white' : cur ? 'bg-espresso text-white' : 'bg-cream-deep text-taupe'}`}>{done ? <Check size={14} /> : n}</button>
                <span className={`hidden font-semibold sm:inline ${cur ? 'text-espresso' : 'text-taupe'}`}>{label}</span>
                {i < 2 ? <span className="h-px flex-1 bg-cream-line" /> : null}
              </li>
            );
          })}
        </ol>

        {/* ---------------- step 1 ---------------- */}
        {step === 1 ? (
          <section className="space-y-6 rounded-card bg-white p-6 shadow-card" aria-labelledby="s1">
            <div>
              <h2 id="s1" className="font-serif text-2xl">{t('checkout.contact_title')}</h2>
              {!user ? <p className="mt-1 text-sm text-taupe">{t('checkout.guest_hint')} <Link href="/login?next=/checkout" className="font-semibold text-mauve underline">{t('nav.login')}</Link></p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-name" label={t('common.name')} required error={err('name')}><input id="co-name" className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={100} /></Field>
              <Field id="co-phone" label={t('checkout.phone')} required error={err('phone')} hint={t('checkout.phone_hint')}><input id="co-phone" className={`input ${errors.phone ? 'input-error' : ''}`} type="tel" inputMode="tel" autoComplete="tel" placeholder="+670 7XXX XXXX" value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={25} /></Field>
              <Field id="co-email" label={t('common.email')} error={err('email')} hint={t('checkout.email_hint')} className="sm:col-span-2"><input id="co-email" className={`input ${errors.email ? 'input-error' : ''}`} type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={150} /></Field>
            </div>

            <h2 className="font-serif text-2xl">{t('checkout.address_title')}</h2>
            {addresses.length > 0 ? (
              <Field id="co-saved" label={t('checkout.saved_addresses')}>
                <select id="co-saved" className="input" defaultValue="" onChange={(e) => {
                  const a = addresses.find((x) => String(x.id) === e.target.value);
                  if (a) setF((cur) => ({ ...cur, name: a.recipient, phone: a.phone, municipality: a.municipality, adminPost: a.adminPost, suco: a.suco, street: a.street, addressNotes: a.notes }));
                }}>
                  <option value="">{t('checkout.choose_saved')}</option>
                  {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || a.recipient} — {a.street}</option>)}
                </select>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-mun" label={t('checkout.municipality')} required error={err('municipality')}>
                <select id="co-mun" className={`input ${errors.municipality ? 'input-error' : ''}`} value={f.municipality} onChange={(e) => setF((cur) => ({ ...cur, municipality: e.target.value, adminPost: '', suco: '', paymentMethod: '', acceptCodTerms: false }))}>
                  <option value="">{t('checkout.select_municipality')}</option>
                  {config.municipalities.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
                </select>
              </Field>
              {isDili ? (
                <Field id="co-post" label={t('checkout.admin_post')} required error={err('adminPost')}>
                  <select id="co-post" className={`input ${errors.adminPost ? 'input-error' : ''}`} value={f.adminPost} onChange={(e) => setF((cur) => ({ ...cur, adminPost: e.target.value, suco: '', paymentMethod: '', acceptCodTerms: false }))}>
                    <option value="">{t('checkout.select_post')}</option>
                    {config.diliPosts.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                </Field>
              ) : null}
              {isDili && post ? (
                <Field id="co-suco" label={t('checkout.suco')} required={post.sucos.length > 0} error={err('suco')}>
                  {post.sucos.length ? (
                    <select id="co-suco" className={`input ${errors.suco ? 'input-error' : ''}`} value={f.suco} onChange={(e) => set('suco', e.target.value)}>
                      <option value="">{t('checkout.select_suco')}</option>
                      {post.sucos.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  ) : <input id="co-suco" className="input" value={f.suco} onChange={(e) => set('suco', e.target.value)} maxLength={80} />}
                </Field>
              ) : null}
              <Field id="co-street" label={t('checkout.street')} required error={err('street')} className="sm:col-span-2"><input id="co-street" className={`input ${errors.street ? 'input-error' : ''}`} autoComplete="street-address" value={f.street} onChange={(e) => set('street', e.target.value)} maxLength={200} placeholder={t('checkout.street_ph')} /></Field>
              <Field id="co-notes" label={t('checkout.address_notes')} className="sm:col-span-2"><input id="co-notes" className="input" value={f.addressNotes} onChange={(e) => set('addressNotes', e.target.value)} maxLength={300} placeholder={t('checkout.address_notes_ph')} /></Field>
              <Field id="co-note" label={t('checkout.order_note')} className="sm:col-span-2"><textarea id="co-note" className="input min-h-20" value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={500} /></Field>
            </div>
            <div className="flex justify-end"><button type="button" onClick={next} className="btn-primary !px-7">{t('common.next')} <ArrowRight size={16} /></button></div>
          </section>
        ) : null}

        {/* ---------------- step 2 ---------------- */}
        {step === 2 ? (
          <section className="space-y-6 rounded-card bg-white p-6 shadow-card" aria-labelledby="s2">
            <h2 id="s2" className="font-serif text-2xl">{t('checkout.delivery_title')}</h2>
            <div className="rounded-2xl bg-cream px-4 py-3 text-sm">
              {quote?.zone ? (
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold">{[quote.zone.name, quote.zone.adminPost ? f.suco : ''].filter(Boolean).join(' · ')}</span>
                  <span className="text-taupe">{quote.shippingCents === 0 ? t('checkout.delivery_free') : t('checkout.delivery_fee', { fee: formatUSD(quote.shippingCents) })}</span>
                  {quote.zone.etaText ? <span className="text-taupe">· {t('checkout.delivery_eta', { eta: quote.zone.etaText })}</span> : null}
                  {quote.zone.freeOverCents && quote.shippingCents > 0 ? <span className="w-full text-xs text-mauve">{t('checkout.delivery_free_over', { amount: formatUSD(quote.zone.freeOverCents) })}</span> : null}
                </p>
              ) : <p className="text-taupe">{t('checkout.delivery_none')}</p>}
            </div>

            <div>
              <h2 className="font-serif text-2xl">{t('checkout.payment_title')}</h2>
              <fieldset className="mt-4 space-y-3" aria-describedby={errors.paymentMethod ? 'pm-err' : undefined}>
                <legend className="sr-only">{t('checkout.payment_title')}</legend>
                {(quote?.methods ?? []).map((m) => (
                  <label key={m.key} className={`flex gap-3 rounded-2xl border p-4 transition ${f.paymentMethod === m.key ? 'border-mauve bg-mauve-soft/50' : 'border-cream-line'} ${m.available ? 'cursor-pointer hover:border-mauve' : 'opacity-70'}`}>
                    <input type="radio" name="pm" value={m.key} disabled={!m.available} checked={f.paymentMethod === m.key} onChange={() => set('paymentMethod', m.key)} className="mt-1 h-4 w-4 accent-[#7D4E57]" />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold"><span className="text-mauve">{ICON[m.key]}</span>{m.name}
                        {m.key === 'COD' && m.available && m.feeCents > 0 ? <span className="badge bg-cream-deep text-taupe">+{formatUSD(m.feeCents)}</span> : null}
                        {m.demo ? <span className="badge bg-amber-100 text-amber-800">{t('checkout.demo_badge')}</span> : null}
                      </span>
                      <span className="mt-1 block text-sm text-taupe">{t(`checkout.method_desc.${m.key}`)}</span>
                      {!m.available ? <span className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700"><AlertCircle size={14} className="mt-px shrink-0" />{reasonText(m)}</span> : null}
                    </span>
                  </label>
                ))}
              </fieldset>
              {errors.paymentMethod ? <p id="pm-err" role="alert" className="field-error">{err('paymentMethod')}</p> : null}
            </div>

            {f.paymentMethod === 'COD' ? (
              <div className="rounded-2xl border border-gold/40 bg-cream p-4">
                <p className="text-sm font-semibold">{t('checkout.cod_box_title')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-taupe">
                  <li>{t('checkout.cod_p1')}</li><li>{t('checkout.cod_p2')}</li><li>{t('checkout.cod_p3', { max: formatUSD(config.commerce.codMaxCents) })}</li><li>{t('checkout.cod_p4')}</li>
                </ul>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
                  <input type="checkbox" checked={f.acceptCodTerms} onChange={(e) => set('acceptCodTerms', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#7D4E57]" aria-describedby={errors.acceptCodTerms ? 'cod-err' : undefined} />
                  <span>{t('checkout.cod_accept')} <Link href="/page/cod-terms" target="_blank" className="font-semibold text-mauve underline">{t('checkout.cod_terms_link')}</Link> *</span>
                </label>
                {errors.acceptCodTerms ? <p id="cod-err" role="alert" className="field-error">{t('errors.COD_TERMS_REQUIRED')}</p> : null}
              </div>
            ) : null}

            <CouponBox value={cart.coupon} applied={quote?.couponCode ?? null} error={quote?.couponError ?? null} onApply={cart.applyCoupon} onClear={() => cart.applyCoupon('')} />

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost"><ArrowLeft size={16} /> {t('common.back')}</button>
              <button type="button" onClick={next} className="btn-primary !px-7" disabled={!quote || quoteBusy}>{t('common.next')} <ArrowRight size={16} /></button>
            </div>
          </section>
        ) : null}

        {/* ---------------- step 3 ---------------- */}
        {step === 3 ? (
          <section className="space-y-6 rounded-card bg-white p-6 shadow-card" aria-labelledby="s3">
            <h2 id="s3" className="font-serif text-2xl">{t('checkout.review_title')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-cream p-4 text-sm">
                <div className="flex items-center justify-between"><h3 className="font-sans text-xs font-bold uppercase tracking-wide text-taupe">{t('checkout.contact_title')}</h3><button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-mauve underline">{t('common.edit')}</button></div>
                <p className="mt-2 font-semibold">{f.name}</p><p>{normalizePhoneDisplay(f.phone)}</p>{f.email ? <p className="text-taupe">{f.email}</p> : null}
              </div>
              <div className="rounded-2xl bg-cream p-4 text-sm">
                <div className="flex items-center justify-between"><h3 className="font-sans text-xs font-bold uppercase tracking-wide text-taupe">{t('checkout.address_title')}</h3><button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-mauve underline">{t('common.edit')}</button></div>
                <p className="mt-2">{f.street}</p>
                <p className="text-taupe">{[f.suco, post?.name, config.municipalities.find((m) => m.key === f.municipality)?.name].filter(Boolean).join(', ')}</p>
                {f.addressNotes ? <p className="mt-1 text-xs text-taupe">{f.addressNotes}</p> : null}
              </div>
              <div className="rounded-2xl bg-cream p-4 text-sm sm:col-span-2">
                <div className="flex items-center justify-between"><h3 className="font-sans text-xs font-bold uppercase tracking-wide text-taupe">{t('checkout.payment_title')}</h3><button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-mauve underline">{t('common.edit')}</button></div>
                <p className="mt-2 flex items-center gap-2 font-semibold"><span className="text-mauve">{f.paymentMethod ? ICON[f.paymentMethod] : null}</span>{method?.name}</p>
                <p className="mt-1 text-xs text-taupe">{f.paymentMethod === 'COD' ? t('checkout.review_cod') : t('checkout.review_manual', { hours: config.commerce.paymentDeadlineHours })}</p>
              </div>
            </div>
            {stockProblem ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t('errors.OUT_OF_STOCK')} <Link href="/cart" className="font-semibold underline">{t('cart.view_cart')}</Link></p> : null}
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="btn-ghost"><ArrowLeft size={16} /> {t('common.back')}</button>
              <button type="button" onClick={place} disabled={busy || quoteBusy || stockProblem || !method} className="btn-primary !px-8 !py-3">{busy ? t('checkout.placing') : `${t('checkout.place_order')} · ${formatUSD(total)}`}</button>
            </div>
          </section>
        ) : null}
      </div>

      {/* ---------------- summary ---------------- */}
      <aside className="space-y-4 rounded-card bg-white p-6 shadow-card lg:sticky lg:top-24" aria-label={t('cart.summary')}>
        <h2 className="font-serif text-2xl">{t('cart.summary')}</h2>
        <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-3">
              <div className="relative"><ProductImage src={l.image} alt={l.name} className="h-16 w-14 rounded-lg" /><span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-espresso px-1 text-[10px] font-bold text-white">{l.qty}</span></div>
              <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-2 font-semibold">{l.name}</p><p className="text-xs text-taupe">{[l.color, l.size].filter(Boolean).join(' · ')}</p></div>
              <span className="text-sm font-semibold">{formatUSD(l.unitPriceCents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-cream-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-taupe">{t('common.subtotal')}</dt><dd className="font-semibold">{formatUSD(quote?.subtotalCents ?? 0)}</dd></div>
          {quote && quote.discountCents > 0 ? <div className="flex justify-between text-mauve"><dt>{t('cart.discount')}{quote.couponCode ? ` (${quote.couponCode})` : ''}</dt><dd className="font-semibold">-{formatUSD(quote.discountCents)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-taupe">{t('cart.shipping')}</dt><dd className="font-semibold">{!quote?.zone ? '—' : quote.shippingCents === 0 ? t('common.free') : formatUSD(quote.shippingCents)}</dd></div>
          {codFee > 0 ? <div className="flex justify-between"><dt className="text-taupe">{t('checkout.cod_fee')}</dt><dd className="font-semibold">{formatUSD(codFee)}</dd></div> : null}
        </dl>
        <div className="flex items-baseline justify-between border-t border-cream-line pt-4"><span className="font-semibold">{t('common.total')}</span><span className="text-2xl font-bold">{formatUSD(total)}</span></div>
        <p className="text-xs text-taupe">{t('checkout.usd_note')}</p>
      </aside>
    </div>
  );
}

function normalizePhoneDisplay(v: string) {
  const p = normalizePhone(v);
  return p.valid ? p.display : v;
}
