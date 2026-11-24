'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, Check, FileText, MessageCircle, Package, Printer, RotateCcw, Send, Truck, X } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { useAdminData } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import {
  Badge, Card, ConfirmModal, ErrorBox, Field, Loading, MethodBadge, Modal, OrderStatusBadge, PageHeader, PaymentStatusBadge, ProofStatusBadge, Spinner, useAction,
} from '@/components/admin/ui';
import { CANCEL_REASONS, WA_GENERIC, WA_MESSAGES, areaLabel, municipalityName, postName } from '@/components/admin/constants';
import { formatDateTime } from '@/lib/time';
import { formatUSD } from '@/lib/money';
import { normalizePhone } from '@/lib/phone';
import type { OrderView } from '@/server/orders';

const NEXT_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: 'confirmCod', PROCESSING: 'markPacked', PACKED: 'sendOut', OUT_FOR_DELIVERY: 'markDelivered',
};

export function OrderDetail({ id }: { id: number }) {
  const { t, locale } = useI18n();
  const { can } = useAdminUser();
  const { data: order, loading, error, setData } = useAdminData<OrderView>(`/api/admin/orders/${id}`);
  const couriers = useAdminData<{ id: number; name: string }[]>('/api/admin/couriers', {}, can('orders.assign_courier'));
  const { busy, run } = useAction();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [note, setNote] = useState('');
  const [courierId, setCourierId] = useState<string>('');
  const [courierNote, setCourierNote] = useState('');
  const [storeName, setStoreName] = useState('Eloura Chic');

  const assignedCourierId = order?.cod?.courier?.id ?? null;
  const assignedCourierNote = order?.cod?.courierNote ?? '';
  useEffect(() => { setCourierId(assignedCourierId ? String(assignedCourierId) : ''); }, [assignedCourierId]);
  useEffect(() => { setCourierNote(assignedCourierNote); }, [assignedCourierNote]);
  useEffect(() => { fetch('/api/config').then((r) => r.json()).then((c) => c?.store?.name && setStoreName(c.store.name)).catch(() => undefined); }, []);

  if (error) return <ErrorBox error={error} />;
  if (loading || !order) return <Loading />;

  const isCod = order.paymentMethod === 'COD';
  const nextKey = NEXT_LABEL[order.status];
  const canAdvance = can('orders.update_status') && !!nextKey && !(order.status === 'PENDING_CONFIRMATION' && !isCod);
  const needsCourier = isCod && order.status === 'PACKED' && !order.cod?.courier;
  const phone = normalizePhone(order.customer.phone);
  const confirmingCod = isCod && order.status === 'PENDING_CONFIRMATION';
  const waTexts = confirmingCod ? WA_MESSAGES : WA_GENERIC;
  const wa = phone.valid ? `https://wa.me/${phone.wa}?text=${encodeURIComponent((waTexts[order.locale] ?? waTexts.en)({ name: order.customer.name, code: order.code, total: formatUSD(order.totalCents), store: storeName }))}` : null;
  const reasonLabel = (n?: string | null) => {
    if (!n) return '';
    const [code, ...rest] = n.split(' - ');
    return (CANCEL_REASONS as readonly string[]).includes(code) || code === 'PAYMENT_DEADLINE_EXPIRED' ? [t(`admin.orders.reasons.${code}`), ...rest].join(' — ') : n;
  };

  const act = (path: string, body: unknown, msg = '') => run(async () => { const v = await api<OrderView>(`/api/admin/orders/${id}${path}`, { body }); setData(v); return v; }, msg);

  return (
    <>
      <PageHeader
        title={order.code}
        subtitle={t('admin.orders.placedOn', { date: formatDateTime(order.createdAt, locale) })}
        actions={<>
          <Link href="/admin/orders" className="btn-ghost btn-sm"><ArrowLeft size={14} /> {t('common.back')}</Link>
          {can('invoices.print') && <>
            <Link href={`/admin/orders/${id}/invoice`} target="_blank" className="btn-outline btn-sm"><Printer size={14} /> {t('admin.orders.invoice')}</Link>
            <Link href={`/admin/orders/${id}/packing-slip`} target="_blank" className="btn-outline btn-sm"><Package size={14} /> {t('admin.orders.packingSlip')}</Link>
          </>}
        </>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /><MethodBadge method={order.paymentMethod} />
        {order.expiresAt && order.status === 'PENDING_PAYMENT' && <Badge tone="amber">{t('admin.orders.payBy', { date: formatDateTime(order.expiresAt, locale) })}</Badge>}
        {order.cancelReason && <Badge tone="red">{reasonLabel(order.cancelReason)}</Badge>}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card title={t('admin.orders.itemsTitle')} pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id} className="border-b border-cream-line last:border-0">
                      <td className="w-16 p-3">{i.image ?   <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-cream-deep" />}</td>
                      <td className="p-3"><p className="font-semibold">{i.name}</p><p className="text-xs text-taupe">{i.sku}{i.size ? ` · ${i.size}` : ''}{i.color ? ` · ${i.color}` : ''}</p></td>
                      <td className="p-3 text-right text-taupe">{formatUSD(i.unitPriceCents)} × {i.qty}</td>
                      <td className="p-3 text-right font-semibold">{formatUSD(i.unitPriceCents * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-1.5 border-t border-cream-line bg-cream/60 p-5 text-sm">
              <Row label={t('common.subtotal')} value={formatUSD(order.subtotalCents)} />
              {order.discountCents > 0 && <Row label={`${t('admin.orders.discount')}${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`− ${formatUSD(order.discountCents)}`} />}
              <Row label={t('admin.orders.shipping')} value={order.shippingCents ? formatUSD(order.shippingCents) : t('common.free')} />
              {order.codFeeCents > 0 && <Row label={t('admin.orders.codFee')} value={formatUSD(order.codFeeCents)} />}
              <div className="flex justify-between border-t border-cream-line pt-2 font-serif text-2xl font-semibold text-mauve"><dt>{t('common.total')}</dt><dd>{formatUSD(order.totalCents)}</dd></div>
            </dl>
          </Card>

          {order.proofs.length > 0 && can('payments.view') && (
            <Card title={t('admin.orders.proofs')} actions={<Link href="/admin/payments?status=all" className="btn-outline btn-sm"><FileText size={14} /> {t('admin.orders.openPayments')}</Link>}>
              <ul className="divide-y divide-cream-line text-sm">
                {order.proofs.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="font-medium">{p.reference || '—'} <span className="text-taupe">· {formatUSD(p.amountCents)}</span></p>
                      <p className="text-xs text-taupe">{formatDateTime(p.createdAt, locale)}{p.payerName ? ` · ${p.payerName}` : ''}{p.reviewNote ? ` · “${p.reviewNote}”` : ''}</p>
                    </div>
                    <ProofStatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title={t('admin.orders.timeline')}>
            <ol className="relative ml-2 space-y-4 border-l border-gold/60 pl-5">
              {[...order.events].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-mauve ring-4 ring-white" />
                  <p className="text-sm font-semibold">
                    {t(`admin.orders.events.${e.type}`)}
                    {e.to && <span className="ml-2 font-normal text-taupe">{e.from ? `${t(`status.order.${e.from}`)} → ` : ''}{t(`status.order.${e.to}`)}</span>}
                  </p>
                  <p className="text-xs text-taupe">{formatDateTime(e.createdAt, locale)} · {e.actor === 'customer' ? t('admin.orders.byCustomer') : e.actor === 'system' ? t('admin.orders.bySystem') : e.actor}</p>
                  {e.note && !(e.type === 'courier_assigned' && /^\d*$/.test(e.note)) && <p className="mt-0.5 text-sm text-espresso-soft">{e.type === 'created' ? t(`status.method.${e.note}`) : reasonLabel(e.note)}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {(canAdvance || can('orders.cancel') || (can('payments.refund') && order.paymentStatus === 'REFUND_PENDING')) && (
            <Card title={t('admin.orders.actions')}>
              <div className="space-y-3">
                {canAdvance && (
                  <>
                    <button type="button" className="btn-primary btn-block" disabled={busy || needsCourier} onClick={() => (nextKey === 'markDelivered' && isCod ? setDeliverOpen(true) : act('/advance', {}, t('admin.orders.updated')))}>
                      {busy ? <Spinner className="!text-white" /> : <Check size={16} />}
                      {t(`admin.orders.next.${nextKey}`)}{nextKey === 'markDelivered' && isCod ? ` · ${formatUSD(order.totalCents)}` : ''}
                    </button>
                    {needsCourier && <p className="text-xs text-amber-700">{t('admin.orders.courierFirst')}</p>}
                    {nextKey === 'markDelivered' && isCod && <p className="text-xs text-taupe">{t('admin.orders.codCollectHint')}</p>}
                  </>
                )}
                {!canAdvance && !isCod && (order.status === 'PENDING_PAYMENT' || order.status === 'AWAITING_VERIFICATION') && <p className="rounded-xl bg-cream p-3 text-xs text-taupe">{t('admin.orders.awaitPaymentHint')}</p>}
                {can('orders.cancel') && ['PENDING_PAYMENT', 'AWAITING_VERIFICATION', 'PENDING_CONFIRMATION', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                  <button type="button" className="btn-outline btn-block !border-red-300 !text-red-700 hover:!bg-red-50" onClick={() => setCancelOpen(true)}><X size={16} /> {t('admin.orders.cancelOrder')}</button>
                )}
                {can('payments.refund') && order.paymentStatus === 'REFUND_PENDING' && (
                  <button type="button" className="btn-dark btn-block" onClick={() => setRefundOpen(true)}><RotateCcw size={16} /> {t('admin.orders.markRefunded')}</button>
                )}
              </div>
            </Card>
          )}

          <Card title={t('admin.orders.customer')}>
            <p className="font-semibold">{order.customer.name}</p>
            <p className="text-sm text-taupe">{order.customer.phone}{order.customer.email ? ` · ${order.customer.email}` : ''}</p>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-3"><MessageCircle size={14} /> {t(confirmingCod ? 'admin.orders.confirmWhatsApp' : 'admin.orders.whatsApp')}</a>}
            <div className="mt-4 border-t border-cream-line pt-3 text-sm">
              <p className="label">{t('admin.orders.deliverTo')}</p>
              <p>{order.address.street}</p>
              <p className="text-taupe">{order.address.municipality === 'dili' ? [postName(order.address.adminPost), order.address.suco, 'Dili'].filter(Boolean).join(', ') : municipalityName(order.address.municipality)}</p>
              {order.address.notes && <p className="mt-1 text-xs text-taupe">“{order.address.notes}”</p>}
              <p className="mt-2 text-xs text-taupe">{areaLabel(order.address)}</p>
            </div>
            {order.note && <div className="mt-3 rounded-xl bg-cream p-3 text-sm"><p className="label">{t('admin.orders.customerNote')}</p>{order.note}</div>}
          </Card>

          {isCod && order.cod && (
            <Card title={<span className="flex items-center gap-2"><Banknote size={18} className="text-amber-600" />{t('admin.orders.codPanel')}</span>}>
              <dl className="space-y-2 text-sm">
                <Row label={t('admin.orders.termsAccepted')} value={order.cod.termsAcceptedAt ? `${formatDateTime(order.cod.termsAcceptedAt, locale)} (${order.cod.termsVersion})` : '—'} />
                <Row label={t('admin.orders.cashDue')} value={formatUSD(order.totalCents)} />
                <Row label={t('admin.orders.collected')} value={order.cod.collectedAt ? `${formatUSD(order.cod.collectedCents)} · ${formatDateTime(order.cod.collectedAt, locale)}` : '—'} />
                <Row label={t('admin.orders.reconciled')} value={order.cod.reconciledAt ? formatDateTime(order.cod.reconciledAt, locale) : '—'} />
              </dl>
              {can('orders.assign_courier') && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
                <div className="mt-4 space-y-2 border-t border-cream-line pt-3">
                  <Field label={<span className="flex items-center gap-1"><Truck size={13} /> {t('admin.orders.courier')}</span>}>
                    <select className="input" value={courierId} onChange={(e) => setCourierId(e.target.value)}>
                      <option value="">{t('admin.orders.noCourier')}</option>
                      {couriers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <input className="input" placeholder={t('admin.orders.courierNote')} value={courierNote} onChange={(e) => setCourierNote(e.target.value)} maxLength={300} />
                  <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => act('/courier', { courierId: courierId ? Number(courierId) : null, note: courierNote || undefined }, t('admin.orders.updated'))}>{t('admin.orders.saveCourier')}</button>
                </div>
              )}
              {!can('orders.assign_courier') && order.cod.courier && <p className="mt-3 text-sm"><Truck size={13} className="mr-1 inline" />{order.cod.courier.name}</p>}
            </Card>
          )}

          <Card title={t('admin.orders.internalNotes')}>
            {can('orders.view') && (
              <form className="flex gap-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                const ok = await run(async () => { await api(`/api/admin/orders/${id}/note`, { body: { note } }); return api<OrderView>(`/api/admin/orders/${id}`); });
                if (ok) { setData(ok); setNote(''); }
              }}>
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('admin.orders.notePlaceholder')} />
                <button type="submit" className="btn-primary btn-sm" disabled={busy || !note.trim()} aria-label={t('common.send')}><Send size={14} /></button>
              </form>
            )}
            <p className="mt-2 text-xs text-taupe">{t('admin.orders.noteHint')}</p>
          </Card>
        </div>
      </div>

      <CancelModal open={cancelOpen} isCod={isCod} refusable={isCod && order.status === 'OUT_FOR_DELIVERY'} busy={busy} onClose={() => setCancelOpen(false)}
        onSubmit={async (b) => { const r = await act('/cancel', b, t('admin.orders.updated')); if (r) setCancelOpen(false); }} />
      <ConfirmModal open={deliverOpen} title={t('admin.orders.next.markDelivered')} text={`${t('admin.orders.codCollectHint')} ${formatUSD(order.totalCents)}`} busy={busy}
        onClose={() => setDeliverOpen(false)} onConfirm={async () => { const r = await act('/advance', {}, t('admin.orders.updated')); if (r) setDeliverOpen(false); }} />
      <ConfirmModal open={refundOpen} title={t('admin.orders.markRefunded')} text={t('admin.orders.refundText', { total: formatUSD(order.totalCents) })} busy={busy}
        onClose={() => setRefundOpen(false)} onConfirm={async () => { const r = await act('/refund', {}, t('admin.orders.updated')); if (r) setRefundOpen(false); }} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-taupe">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function CancelModal({ open, isCod, refusable, busy, onClose, onSubmit }: {
  open: boolean; isCod: boolean; refusable: boolean; busy: boolean; onClose: () => void; onSubmit: (b: { reason: string; note?: string; codRefused?: boolean }) => void;
}) {
  const { t } = useI18n();
  // A refused-at-the-door cancellation counts against the customer (auto COD block), so it is only pre-selected while the order is out for delivery.
  const [reason, setReason] = useState<string>(refusable ? 'COD_REFUSED' : 'CUSTOMER_REQUEST');
  const [text, setText] = useState('');
  const [refused, setRefused] = useState(refusable);
  useEffect(() => { if (open) { setReason(refusable ? 'COD_REFUSED' : 'CUSTOMER_REQUEST'); setRefused(refusable); setText(''); } }, [open, refusable]);
  return (
    <Modal open={open} onClose={onClose} title={t('admin.orders.cancelOrder')} size="sm"
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn-danger" disabled={busy} onClick={() => onSubmit({ reason, note: text || undefined, codRefused: isCod && refused ? true : undefined })}>{busy && <Spinner className="!text-white" />}{t('admin.orders.cancelOrder')}</button></>}>
      <div className="space-y-3">
        <p className="text-sm text-taupe">{t('admin.orders.cancelText')}</p>
        <Field label={t('admin.orders.reason')}>
          <select className="input" value={reason} onChange={(e) => { setReason(e.target.value); setRefused(e.target.value === 'COD_REFUSED'); }}>
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{t(`admin.orders.reasons.${r}`)}</option>)}
          </select>
        </Field>
        <Field label={t('common.note')}><input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} /></Field>
        {isCod && (
          <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={refused} onChange={(e) => setRefused(e.target.checked)} />
            <span><b>{t('admin.orders.codRefused')}</b><br /><span className="text-xs text-taupe">{t('admin.orders.codRefusedHint')}</span></span>
          </label>
        )}
      </div>
    </Modal>
  );
}

