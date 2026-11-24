'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Search, XCircle } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { api } from '@/lib/client/api';
import { cn } from '@/lib/client/cn';
import { useAdminData, type Paged } from '@/components/admin/hooks';
import { useAdminUser } from '@/components/admin/AdminUser';
import { Badge, Card, Empty, ErrorBox, Field, Lightbox, Loading, MethodBadge, OrderStatusBadge, PageHeader, Pagination, ProofStatusBadge, Spinner, useAction } from '@/components/admin/ui';
import { areaLabel } from '@/components/admin/constants';
import { formatDateTime } from '@/lib/time';
import { formatUSD } from '@/lib/money';
import type { OrderView } from '@/server/orders';

type Proof = {
  id: number; orderId: number; orderCode: string; customerName: string; customerPhone: string; orderTotalCents: number; method: string; amountCents: number; status: string;
  reference: string | null; payerName: string | null; payerAccount: string | null; paidAt: string | null; hasFile: boolean; fileMime: string | null; reviewNote: string | null; createdAt: string;
};
const TABS = ['SUBMITTED', 'APPROVED', 'REJECTED', 'all'] as const;

export function PaymentCenter({ initialStatus }: { initialStatus: string }) {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<string>(TABS.includes(initialStatus as never) ? initialStatus : 'SUBMITTED');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const list = useAdminData<Paged<Proof>>('/api/admin/payments', { status, page, limit: 30 });

  const items = useMemo(() => (list.data?.items ?? []).filter((p) => !q.trim() || `${p.orderCode} ${p.customerName} ${p.reference ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())), [list.data, q]);
  useEffect(() => { if (items.length && !items.some((p) => p.id === selected)) setSelected(items[0].id); if (!items.length) setSelected(null); }, [items, selected]);
  const current = items.find((p) => p.id === selected) ?? null;

  return (
    <>
      <PageHeader title={t('admin.payments.title')} subtitle={t('admin.payments.subtitle')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((s) => (
          <button key={s} type="button" onClick={() => { setStatus(s); setPage(1); }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', status === s ? 'bg-mauve text-white' : 'bg-white text-taupe hover:bg-cream-deep')}>
            {s === 'all' ? t('common.all') : t(`status.proof.${s}`)}
          </button>
        ))}
        {list.data && status === 'SUBMITTED' && <Badge tone="blue">{t('admin.payments.inQueue', { n: list.data.total })}</Badge>}
      </div>

      {list.error ? <ErrorBox error={list.error} /> : list.loading && !list.data ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div>
            <div className="relative mb-3"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
              <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.payments.search')} aria-label={t('common.search')} /></div>
            <div className="card max-h-[70vh] overflow-y-auto">
              {!items.length ? <Empty text={status === 'SUBMITTED' ? t('admin.payments.queueEmpty') : undefined} /> : (
                <ul>
                  {items.map((p) => {
                    const dup = items.some((o) => o.id !== p.id && o.orderId !== p.orderId && p.reference && o.reference?.toLowerCase() === p.reference.toLowerCase());
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => setSelected(p.id)} className={cn('w-full border-b border-cream-line px-4 py-3 text-left transition-colors last:border-0', p.id === selected ? 'bg-mauve-soft' : 'hover:bg-cream')}>
                          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-mauve">{p.orderCode}</span><span className="font-semibold">{formatUSD(p.amountCents)}</span></div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-taupe"><span>{p.customerName}</span><span>{formatDateTime(p.createdAt, locale)}</span></div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><MethodBadge method={p.method} />{status === 'all' || status !== 'SUBMITTED' ? <ProofStatusBadge status={p.status} /> : null}
                            {dup && <Badge tone="red">{t('admin.payments.duplicate')}</Badge>}{p.amountCents !== p.orderTotalCents && <Badge tone="amber">{t('admin.payments.amountDiffers')}</Badge>}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {list.data && <Pagination page={list.data.page} pages={list.data.pages} onPage={setPage} />}
          </div>

          <div>{current ? <ProofReview key={current.id} proof={current} duplicates={items.filter((o) => o.id !== current.id && o.orderId !== current.orderId && current.reference && o.reference?.toLowerCase() === current.reference.toLowerCase())} onDone={() => list.reload()} /> : <div className="card"><Empty text={t('admin.payments.pick')} /></div>}</div>
        </div>
      )}
    </>
  );
}

function ProofReview({ proof, duplicates, onDone }: { proof: Proof; duplicates: Proof[]; onDone: () => void }) {
  const { t, locale } = useI18n();
  const { can } = useAdminUser();
  const { busy, run } = useAction();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const order = useAdminData<OrderView>(`/api/admin/orders/${proof.orderId}`, {}, can('orders.view'));
  const file = `/api/admin/payments/${proof.id}/view`;
  const isPdf = proof.fileMime === 'application/pdf';
  const match = proof.amountCents === proof.orderTotalCents;
  const canReview = can('payments.verify') && proof.status === 'SUBMITTED';

  const review = async (approve: boolean) => {
    const r = await run(() => api(`/api/admin/payments/${proof.id}/review`, { body: { approve, note: reason.trim() || undefined } }), t(approve ? 'admin.payments.approved' : 'admin.payments.rejected'));
    if (r) { setRejecting(false); setReason(''); onDone(); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title={t('admin.payments.proof')} actions={proof.hasFile ? <a className="btn-ghost btn-sm" href={file} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {t('admin.payments.openFile')}</a> : undefined}>
        {!proof.hasFile ? <Empty text={t('admin.payments.noFile')} /> : isPdf ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gold bg-cream px-6 py-12 text-center">
            <FileText size={44} className="text-mauve" aria-hidden />
            <p className="text-sm text-taupe">{t('admin.payments.pdfHint')}</p>
            <a className="btn-primary" href={file} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {t('admin.payments.openFile')}</a>
          </div>
        ) : (
          <button type="button" onClick={() => setLightbox(file)} className="block w-full overflow-hidden rounded-xl border border-cream-line bg-cream" aria-label={t('admin.payments.zoom')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file} alt={t('admin.payments.proof')} className="mx-auto max-h-[520px] w-auto cursor-zoom-in object-contain" />
          </button>
        )}
        {proof.hasFile && !isPdf && <p className="mt-2 text-center text-xs text-taupe">{t('admin.payments.zoomHint')}</p>}
      </Card>

      <div className="space-y-5">
        <Card title={t('admin.payments.details')} actions={<ProofStatusBadge status={proof.status} />}>
          <dl className="space-y-2 text-sm">
            <Line label={t('admin.orders.order')} value={<Link href={`/admin/orders/${proof.orderId}`} className="font-semibold text-mauve hover:underline">{proof.orderCode}</Link>} />
            <Line label={t('admin.orders.method')} value={<MethodBadge method={proof.method} />} />
            <Line label={t('admin.payments.reference')} value={<span className="font-mono">{proof.reference || '—'}</span>} />
            <Line label={t('admin.payments.payer')} value={[proof.payerName, proof.payerAccount].filter(Boolean).join(' · ') || '—'} />
            <Line label={t('admin.payments.statedTime')} value={proof.paidAt ? formatDateTime(proof.paidAt, locale) : '—'} />
            <Line label={t('admin.payments.submittedAt')} value={formatDateTime(proof.createdAt, locale)} />
            <div className="border-t border-cream-line pt-2">
              <Line label={t('admin.payments.proofAmount')} value={<b>{formatUSD(proof.amountCents)}</b>} />
              <Line label={t('admin.payments.orderTotal')} value={<b>{formatUSD(proof.orderTotalCents)}</b>} />
            </div>
          </dl>
          <div className={cn('mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm', match ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
            {match ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
            {match ? t('admin.payments.amountOk') : t('admin.payments.amountWarn')}
          </div>
          {duplicates.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />{t('admin.payments.duplicateWarn', { codes: duplicates.map((d) => d.orderCode).join(', ') })}
            </div>
          )}
          {proof.reviewNote && <p className="mt-3 rounded-xl bg-cream p-3 text-sm"><b>{t('admin.payments.reviewNote')}:</b> {proof.reviewNote}</p>}
        </Card>

        {can('orders.view') && (
          <Card title={t('admin.payments.orderSummary')}>
            {order.loading ? <Loading /> : order.error ? <ErrorBox error={order.error} /> : order.data && (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2"><OrderStatusBadge status={order.data.status} /></div>
                <ul className="divide-y divide-cream-line">
                  {order.data.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 py-1.5"><span>{i.qty}× {i.name} <span className="text-xs text-taupe">{[i.size, i.color].filter(Boolean).join(' · ')}</span></span><span className="font-medium">{formatUSD(i.unitPriceCents * i.qty)}</span></li>
                  ))}
                </ul>
                <p className="flex justify-between border-t border-cream-line pt-2 text-base font-semibold"><span>{t('common.total')}</span><span className="text-mauve">{formatUSD(order.data.totalCents)}</span></p>
                <p className="text-xs text-taupe">{order.data.customer.name} · {order.data.customer.phone}<br />{areaLabel(order.data.address)}</p>
                {order.data.expiresAt && <p className="text-xs text-amber-700">{t('admin.orders.payBy', { date: formatDateTime(order.data.expiresAt, locale) })}</p>}
              </div>
            )}
          </Card>
        )}

        {canReview && (
          <Card title={t('admin.payments.decision')}>
            {rejecting ? (
              <div className="space-y-3">
                <Field label={t('admin.payments.rejectReason')} hint={t('admin.payments.rejectHint')}>
                  <textarea className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                </Field>
                <div className="flex gap-2">
                  <button type="button" className="btn-danger" disabled={busy || reason.trim().length < 2} onClick={() => review(false)}>{busy ? <Spinner className="!text-white" /> : <XCircle size={16} />} {t('admin.payments.confirmReject')}</button>
                  <button type="button" className="btn-ghost" onClick={() => setRejecting(false)}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label={t('admin.payments.approveNote')}><input className="input" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.payments.approvePlaceholder')} /></Field>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => review(true)}>{busy ? <Spinner className="!text-white" /> : <CheckCircle2 size={16} />} {t('admin.payments.approve')}</button>
                  <button type="button" className="btn-outline !border-red-300 !text-red-700 hover:!bg-red-50" onClick={() => { setReason(''); setRejecting(true); }}><XCircle size={16} /> {t('admin.payments.reject')}</button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-taupe">{label}</dt><dd className="text-right">{value}</dd></div>;
}
