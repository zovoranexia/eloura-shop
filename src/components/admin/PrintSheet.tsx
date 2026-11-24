import { notFound } from 'next/navigation';
import { requirePagePermission } from './guard';
import { getT } from '@/lib/i18n';
import { findOrderById, orderView } from '@/server/orders';
import { getSetting } from '@/server/settings';
import { formatUSD } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { areaLabel, postName, municipalityName } from './constants';
import { PrintButton } from './PrintButton';

/** Branded A4 print sheet for an order. `kind="invoice"` shows prices; `kind="packing"` is the warehouse / courier slip (no prices, COD cash due highlighted). */
export async function PrintSheet({ id, kind }: { id: number; kind: 'invoice' | 'packing' }) {
  await requirePagePermission(['orders.view', 'invoices.print']);
  const { t, locale } = getT({ admin: true });
  if (!Number.isInteger(id) || id < 1) notFound();
  const raw = await findOrderById(id);
  if (!raw) notFound();
  const o = await orderView(raw, locale, { staff: true });
  const store = await getSetting('store');
  const isCod = o.paymentMethod === 'COD';
  const addr = o.address.municipality === 'dili'
    ? [postName(o.address.adminPost), o.address.suco, 'Dili'].filter(Boolean).join(', ')
    : municipalityName(o.address.municipality);

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="no-print mb-4 flex justify-end"><PrintButton label={t('common.print')} /></div>
      <article className="rounded-card bg-white p-8 shadow-card print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-gold/60 pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/logo-wordmark.png" alt={store.name} className="h-20 w-auto" />
            <p className="mt-1 text-xs text-taupe">{store.address}<br />{store.phone} · {store.email}</p>
          </div>
          <div className="text-right">
            <h1 className="font-serif text-4xl font-medium text-mauve">{kind === 'invoice' ? t('admin.print.invoice') : t('admin.print.packingSlip')}</h1>
            <p className="mt-1 text-lg font-semibold tracking-wide">{o.code}</p>
            <p className="text-xs text-taupe">{formatDateTime(o.createdAt, locale)} (Asia/Dili)</p>
          </div>
        </header>

        <section className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label">{kind === 'invoice' ? t('admin.print.billTo') : t('admin.print.shipTo')}</p>
            <p className="font-semibold">{o.customer.name}</p>
            <p className="text-sm">{o.address.street}</p>
            <p className="text-sm">{addr}</p>
            <p className="text-sm">{o.customer.phone}{o.customer.email ? ` · ${o.customer.email}` : ''}</p>
            {o.address.notes && <p className="mt-1 text-xs italic text-taupe">“{o.address.notes}”</p>}
          </div>
          <div className="text-sm">
            <p className="label">{t('admin.print.details')}</p>
            <p>{t('admin.print.paymentMethod')}: <b>{t(`status.method.${o.paymentMethod}`)}</b></p>
            <p>{t('admin.print.paymentStatus')}: <b>{t(`status.payment.${o.paymentStatus}`)}</b>{o.paidAt ? ` · ${formatDateTime(o.paidAt, locale)}` : ''}</p>
            <p>{t('admin.print.area')}: {areaLabel(o.address)}</p>
            {kind === 'packing' && o.cod?.courier && <p>{t('admin.orders.courier')}: <b>{o.cod.courier.name}</b></p>}
            {kind === 'packing' && o.cod?.courierNote && <p className="text-xs text-taupe">{o.cod.courierNote}</p>}
          </div>
        </section>

        {kind === 'packing' && isCod && (
          <div className="mt-5 rounded-xl border-2 border-dashed border-mauve p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-mauve">{t('admin.print.collectCash')}</p>
            <p className="font-serif text-5xl font-semibold text-mauve">{formatUSD(o.totalCents)}</p>
            <p className="text-xs text-taupe">{t('admin.print.exactCash')}</p>
          </div>
        )}

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-espresso text-left text-[11px] uppercase tracking-wider text-taupe">
              {kind === 'packing' && <th className="w-8 py-2" aria-label="check" />}
              <th className="py-2">{t('admin.print.item')}</th><th className="py-2">SKU</th>
              <th className="py-2 text-right">{t('admin.print.qty')}</th>
              {kind === 'invoice' && <><th className="py-2 text-right">{t('admin.print.unit')}</th><th className="py-2 text-right">{t('common.total')}</th></>}
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-cream-line">
                {kind === 'packing' && <td className="py-2.5"><span className="inline-block h-4 w-4 rounded border border-espresso" /></td>}
                <td className="py-2.5"><b>{i.name}</b><div className="text-xs text-taupe">{[i.size, i.color].filter(Boolean).join(' · ')}</div></td>
                <td className="py-2.5 text-xs text-taupe">{i.sku}</td>
                <td className="py-2.5 text-right font-semibold">{i.qty}</td>
                {kind === 'invoice' && <><td className="py-2.5 text-right">{formatUSD(i.unitPriceCents)}</td><td className="py-2.5 text-right font-semibold">{formatUSD(i.unitPriceCents * i.qty)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>

        {kind === 'invoice' && (
          <dl className="ml-auto mt-5 w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-taupe">{t('common.subtotal')}</dt><dd>{formatUSD(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt className="text-taupe">{t('admin.orders.discount')}{o.couponCode ? ` (${o.couponCode})` : ''}</dt><dd>− {formatUSD(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-taupe">{t('admin.orders.shipping')}</dt><dd>{o.shippingCents ? formatUSD(o.shippingCents) : t('common.free')}</dd></div>
            {o.codFeeCents > 0 && <div className="flex justify-between"><dt className="text-taupe">{t('admin.orders.codFee')}</dt><dd>{formatUSD(o.codFeeCents)}</dd></div>}
            <div className="flex justify-between border-t border-espresso pt-2 font-serif text-2xl font-semibold text-mauve"><dt>{t('common.total')}</dt><dd>{formatUSD(o.totalCents)} <span className="text-xs font-sans">USD</span></dd></div>
          </dl>
        )}

        {o.note && <p className="mt-5 rounded-xl bg-cream p-3 text-sm"><b>{t('admin.orders.customerNote')}:</b> {o.note}</p>}

        <footer className="mt-8 border-t border-gold/60 pt-4 text-center text-xs text-taupe">
          {kind === 'invoice' ? t('admin.print.thanks', { store: store.name }) : t('admin.print.handle')}
          <br />{store.name} · {store.address}
        </footer>
      </article>
    </div>
  );
}
