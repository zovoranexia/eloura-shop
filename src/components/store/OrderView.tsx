'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Clock, Copy, FileText, Info, PackageCheck, Upload } from 'lucide-react';
import { useLocale, useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/client/api';
import { formatUSD } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { normalizePhone } from '@/lib/phone';
import type { OrderView as Order } from '@/server/orders';
import { Field } from './Field';
import { ProductImage } from './ProductImage';

const FLOW_PREPAID = ['PENDING_PAYMENT', 'AWAITING_VERIFICATION', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const FLOW_COD = ['PENDING_CONFIRMATION', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const TONE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800', AWAITING_VERIFICATION: 'bg-sky-100 text-sky-800', PENDING_CONFIRMATION: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800', PACKED: 'bg-indigo-100 text-indigo-800', OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800', DELIVERED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-100 text-red-800',
};

function useCountdown(until: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [until]);
  return left;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}
      className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-white px-2.5 py-1 text-xs font-semibold text-mauve hover:bg-mauve-soft" aria-label={`${t('common.copy')} ${label}`}>
      {done ? <Check size={13} /> : <Copy size={13} />}{done ? t('common.copied') : t('common.copy')}
    </button>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-line py-2.5 text-sm last:border-0">
      <dt className="text-taupe">{label}</dt>
      <dd className="flex items-center gap-2 font-semibold"><span className="break-all">{value}</span>{copy ? <CopyButton value={value} label={label} /> : null}</dd>
    </div>
  );
}

const MAX = 5 * 1024 * 1024;
const OK_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function ProofForm({ order, token, replace }: { order: Order; token?: string; replace?: boolean }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState('');
  const [payerName, setPayerName] = useState(order.customer.name);
  const [paidAt, setPaidAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isAtm = order.paymentMethod === 'ATM_BNCTL';
  const refLabel = order.paymentMethod === 'BANK_BNCTL' ? t('order.proof_ref_bank') : isAtm ? t('order.proof_ref_atm') : t('order.proof_ref_wallet');

  function pick(f: File | null) {
    setErrors((e) => ({ ...e, file: '' }));
    if (!f) return setFile(null);
    if (!OK_TYPES.includes(f.type)) { setFile(null); return setErrors((e) => ({ ...e, file: t('errors.FILE_INVALID') })); }
    if (f.size > MAX) { setFile(null); return setErrors((e) => ({ ...e, file: t('errors.FILE_TOO_LARGE') })); }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!file) er.file = t('errors.PROOF_REQUIRED');
    if (!reference.trim()) er.reference = t('errors.REFERENCE_REQUIRED');
    if (isAtm && !paidAt) er.paidAt = t('errors.TIMESTAMP_REQUIRED');
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set('file', file!);
      form.set('reference', reference.trim());
      if (payerName.trim()) form.set('payerName', payerName.trim());
      if (paidAt) form.set('paidAt', paidAt);
      await api(`/api/orders/${order.code}/proof`, { form, token });
      toast.success(t('order.proof_sent'));
      setFile(null); setReference('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (x) {
      toast.error(errorMessage(t, x));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h3 className="font-serif text-xl">{replace ? t('order.proof_replace') : t('order.proof_title')}</h3>
      <Field id="pf-file" label={t('order.proof_file')} required error={errors.file} hint={t('order.proof_file_hint')}>
        <input ref={fileRef} id="pf-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-dashed border-gold bg-cream p-3 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-mauve file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white" />
      </Field>
      {file ? <p className="flex items-center gap-2 text-xs text-taupe"><FileText size={14} />{file.name} · {(file.size / 1024).toFixed(0)} KB</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pf-ref" label={refLabel} required error={errors.reference}><input id="pf-ref" className={`input ${errors.reference ? 'input-error' : ''}`} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} autoComplete="off" /></Field>
        <Field id="pf-name" label={t('order.proof_payer')}><input id="pf-name" className="input" value={payerName} onChange={(e) => setPayerName(e.target.value)} maxLength={100} /></Field>
        <Field id="pf-at" label={isAtm ? t('order.proof_paid_at') : t('order.proof_paid_at_opt')} required={isAtm} error={errors.paidAt} className="sm:col-span-2" hint={t('order.proof_tz')}>
          <input id="pf-at" type="datetime-local" className={`input ${errors.paidAt ? 'input-error' : ''}`} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </Field>
      </div>
      <button type="submit" disabled={busy} className="btn-primary !px-7"><Upload size={16} />{busy ? t('common.loading') : t('order.proof_submit')}</button>
    </form>
  );
}

export function OrderView({ order, token }: { order: Order; token?: string }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [replace, setReplace] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isCod = order.paymentMethod === 'COD';
  const left = useCountdown(!isCod && order.status === 'PENDING_PAYMENT' ? order.expiresAt : null);
  const flow = isCod ? FLOW_COD : FLOW_PREPAID;
  const idx = flow.indexOf(order.status);
  const cancelled = order.status === 'CANCELLED';
  const canCancel = (order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_CONFIRMATION') && order.paymentStatus !== 'PAID';
  const lastProof = order.proofs[0];
  const rejected = order.status === 'PENDING_PAYMENT' && lastProof?.status === 'REJECTED';
  const pay = order.pay as (Record<string, string> & { key: string; name: string; instructions: string }) | null;
  const wa = normalizePhone(order.customer.phone);

  async function cancel() {
    if (!window.confirm(t('order.cancel_confirm'))) return;
    setCancelling(true);
    try {
      await api(`/api/orders/${order.code}/cancel`, { method: 'POST', body: {}, token });
      toast.success(t('order.cancelled_ok'));
      router.refresh();
    } catch (e) { toast.error(errorMessage(t, e)); } finally { setCancelling(false); }
  }
  const fmtLeft = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`; };

  const eventLabel = (e: Order['events'][number]) => (e.type === 'status' && e.to ? t(`status.order.${e.to}`) : t(`order.event_${e.type}`));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-white p-6 shadow-card">
        <div>
          <p className="eyebrow">{t('order.title')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="font-sans text-2xl font-bold tracking-wide md:text-3xl">{order.code}</h1><CopyButton value={order.code} label={t('order.code')} /></div>
          <p className="mt-1 text-sm text-taupe">{t('order.placed_on', { date: formatDateTime(order.createdAt, locale) })}</p>
        </div>
        <div className="text-right">
          <span className={`badge px-3 py-1.5 text-sm ${TONE[order.status] ?? 'bg-cream-deep'}`}>{t(`status.order.${order.status}`)}</span>
          <p className="mt-2 text-xs text-taupe">{t('status.payment.' + order.paymentStatus)}</p>
        </div>
      </header>

      {/* progress */}
      {!cancelled ? (
        <ol className="grid grid-cols-5 gap-1 rounded-card bg-white p-5 shadow-card sm:grid-cols-6" aria-label={t('order.progress')}>
          {flow.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center" aria-current={i === idx ? 'step' : undefined}>
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i < idx ? 'bg-mauve text-white' : i === idx ? 'bg-espresso text-white ring-4 ring-mauve/20' : 'bg-cream-deep text-taupe'}`}>{i < idx ? <Check size={14} /> : i + 1}</span>
              <span className={`text-[10px] leading-tight sm:text-xs ${i === idx ? 'font-semibold' : 'text-taupe'}`}>{t(`status.order.${s}`)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div role="status" className="flex items-start gap-3 rounded-card border border-red-200 bg-red-50 p-5 text-sm text-red-800"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{t('order.cancelled_title')}</p>{order.paymentStatus === 'REFUND_PENDING' ? <p className="mt-1">{t('order.refund_pending')}</p> : null}</div></div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          {/* payment / COD panel */}
          {isCod && !cancelled ? (
            <section className="space-y-3 rounded-card bg-white p-6 shadow-card" aria-labelledby="cod-h">
              <h2 id="cod-h" className="flex items-center gap-2 font-serif text-2xl"><PackageCheck size={22} className="text-mauve" />{t('order.cod_title')}</h2>
              <p className="text-sm text-taupe">{pay?.instructions}</p>
              <div className="rounded-2xl bg-cream p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-taupe">{t('order.cod_amount')}</p>
                <p className="text-3xl font-bold text-mauve">{formatUSD(order.totalCents)}</p>
                <p className="mt-1 text-xs text-taupe">{t('order.cod_exact')}</p>
              </div>
              {order.status === 'PENDING_CONFIRMATION' ? (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info size={16} className="mt-0.5 shrink-0" />{t('order.cod_confirm_notice', { phone: wa.valid ? wa.display : order.customer.phone })}</p>
              ) : null}
              {order.cod?.courier ? <p className="text-sm">{t('order.cod_courier', { name: order.cod.courier.name })}</p> : null}
              {order.cod?.termsAcceptedAt ? <p className="text-xs text-taupe">{t('order.cod_terms_accepted', { date: formatDateTime(order.cod.termsAcceptedAt, locale) })} · <Link href="/page/cod-terms" className="underline">{t('checkout.cod_terms_link')}</Link></p> : null}
            </section>
          ) : null}

          {!isCod && pay && !cancelled && order.status === 'PENDING_PAYMENT' ? (
            <section className="space-y-5 rounded-card bg-white p-6 shadow-card" aria-labelledby="pay-h">
              <h2 id="pay-h" className="font-serif text-2xl">{t('order.pay_title', { method: pay.name })}</h2>
              {left !== null ? (
                <p role="timer" className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${left === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900'}`}>
                  <Clock size={16} />{left === 0 ? t('order.pay_expired') : t('order.pay_countdown', { time: fmtLeft(left) })}
                  {order.expiresAt ? <span className="ml-auto hidden text-xs font-normal sm:inline">{t('order.pay_deadline', { date: formatDateTime(order.expiresAt, locale) })}</span> : null}
                </p>
              ) : null}
              {rejected ? <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('order.proof_rejected', { note: lastProof?.reviewNote ?? '' })}</p> : null}
              <div className="rounded-2xl bg-cream p-4">
                <p className="text-xs uppercase tracking-wide text-taupe">{t('order.pay_amount')}</p>
                <p className="flex flex-wrap items-center gap-3 text-3xl font-bold text-mauve">{formatUSD(order.totalCents)}<CopyButton value={(order.totalCents / 100).toFixed(2)} label={t('order.pay_amount')} /></p>
                <p className="mt-1 text-xs text-taupe">{t('order.pay_exact')}</p>
              </div>
              <dl>
                {'accountNumber' in pay ? (
                  <>
                    <Row label={t('order.bank')} value={pay.bankName ?? ''} />
                    <Row label={t('order.account_holder')} value={pay.accountHolder ?? ''} />
                    <Row label={t('order.account_number')} value={pay.accountNumber ?? ''} copy />
                    <Row label={t('order.branch')} value={pay.branch ?? ''} />
                    <Row label="SWIFT" value={pay.swift ?? ''} copy />
                  </>
                ) : null}
                {'merchantNumber' in pay ? (
                  <>
                    <Row label={t('order.merchant_name')} value={pay.merchantName ?? ''} />
                    <Row label={t('order.merchant_number')} value={pay.merchantNumber ?? ''} copy />
                  </>
                ) : null}
                <Row label={t('order.pay_reference')} value={order.code} copy />
              </dl>
              {'qrImage' in pay && pay.qrImage ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-cream-line p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pay.qrImage} alt={t('order.qr_alt', { method: pay.name })} className="h-44 w-44 rounded-lg object-contain" />
                  <p className="text-xs text-taupe">{t('order.scan_qr')}</p>
                </div>
              ) : null}
              {('accountNumber' in pay && !pay.accountNumber) || ('merchantNumber' in pay && !pay.merchantNumber && !pay.qrImage) ? (
                <p role="note" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{t('order.demo_warning')}</p>
              ) : null}
              {pay.instructions ? (
                <div>
                  <h3 className="font-serif text-xl">{t('order.how_to_pay')}</h3>
                  <ol className="mt-2 space-y-1.5 text-sm text-taupe">
                    {pay.instructions.split('\n').filter(Boolean).map((l, i) => <li key={i} className="leading-relaxed">{l}</li>)}
                  </ol>
                </div>
              ) : null}
              <hr className="border-cream-line" />
              <ProofForm order={order} token={token} />
            </section>
          ) : null}

          {!isCod && !cancelled && order.status === 'AWAITING_VERIFICATION' ? (
            <section className="space-y-3 rounded-card bg-white p-6 shadow-card">
              <h2 className="font-serif text-2xl">{t('order.verifying_title')}</h2>
              <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900"><Info size={16} className="mt-0.5 shrink-0" />{t('order.verifying_text')}</p>
              {lastProof ? <dl><Row label={t('order.pay_reference')} value={lastProof.reference ?? ''} /><Row label={t('common.date')} value={formatDateTime(lastProof.createdAt, locale)} /></dl> : null}
              {!replace ? <button type="button" onClick={() => setReplace(true)} className="btn-outline btn-sm">{t('order.proof_replace')}</button> : <ProofForm order={order} token={token} replace />}
            </section>
          ) : null}

          {/* timeline */}
          <section className="rounded-card bg-white p-6 shadow-card" aria-labelledby="tl-h">
            <h2 id="tl-h" className="font-serif text-2xl">{t('order.timeline')}</h2>
            <ol className="mt-4 space-y-4 border-l border-cream-line pl-5">
              {[...order.events].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-mauve" />
                  <p className="text-sm font-semibold">{eventLabel(e)}</p>
                  {e.note && e.type === 'payment_rejected' ? <p className="text-xs text-red-700">{e.note}</p> : null}
                  <p className="text-xs text-taupe">{formatDateTime(e.createdAt, locale)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-card bg-white p-6 shadow-card" aria-labelledby="it-h">
            <h2 id="it-h" className="font-serif text-2xl">{t('order.items')}</h2>
            <ul className="mt-4 divide-y divide-cream-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3">
                  <ProductImage src={i.image} alt={i.name} className="h-16 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{i.name}</p><p className="text-xs text-taupe">{[i.color, i.size].filter(Boolean).join(' · ')} · ×{i.qty}</p></div>
                  <span className="text-sm font-semibold">{formatUSD(i.unitPriceCents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-cream-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-taupe">{t('common.subtotal')}</dt><dd>{formatUSD(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 ? <div className="flex justify-between text-mauve"><dt>{t('cart.discount')}{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>-{formatUSD(order.discountCents)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-taupe">{t('cart.shipping')}</dt><dd>{order.shippingCents ? formatUSD(order.shippingCents) : t('common.free')}</dd></div>
              {order.codFeeCents > 0 ? <div className="flex justify-between"><dt className="text-taupe">{t('checkout.cod_fee')}</dt><dd>{formatUSD(order.codFeeCents)}</dd></div> : null}
              <div className="flex items-baseline justify-between border-t border-cream-line pt-3"><dt className="font-semibold">{t('common.total')}</dt><dd className="text-xl font-bold">{formatUSD(order.totalCents)}</dd></div>
            </dl>
          </section>
          <section className="rounded-card bg-white p-6 text-sm shadow-card">
            <h2 className="font-serif text-2xl">{t('order.delivery_to')}</h2>
            <p className="mt-3 font-semibold">{order.customer.name}</p>
            <p>{order.customer.phone}</p>
            <p className="mt-2">{order.address.street}</p>
            <p className="text-taupe">{[order.address.suco, order.address.adminPost?.replace(/_/g, ' '), order.address.municipality].filter(Boolean).join(', ')}</p>
            {order.address.notes ? <p className="mt-1 text-xs text-taupe">{order.address.notes}</p> : null}
            <p className="mt-3 text-xs text-taupe">{t('status.method.' + order.paymentMethod)}</p>
          </section>
          {order.status === 'DELIVERED' ? <p className="rounded-card bg-emerald-50 p-4 text-sm text-emerald-900">{t('order.review_hint')}</p> : null}
          {canCancel ? <button type="button" onClick={cancel} disabled={cancelling} className="btn-outline btn-block">{t('order.cancel_btn')}</button> : null}
        </aside>
      </div>
    </div>
  );
}
