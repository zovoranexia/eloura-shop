import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { listCustomerOrders } from '@/server/storefront';
import { formatUSD } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { ProductImage } from '@/components/store/ProductImage';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('account.nav_orders'), robots: { index: false } };
}

const TONE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800', AWAITING_VERIFICATION: 'bg-sky-100 text-sky-800', PENDING_CONFIRMATION: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800', PACKED: 'bg-indigo-100 text-indigo-800', OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800', DELIVERED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-red-100 text-red-800',
};

export default async function OrdersPage() {
  const { t, locale } = await getT();
  const user = (await getSessionUser())!;
  const orders = await listCustomerOrders(user.id, locale);
  if (!orders.length) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="font-serif text-2xl">{t('account.orders_empty')}</p>
        <Link href="/shop" className="btn-primary mt-5">{t('cart.empty_cta')}</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="rounded-card bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold tracking-wide">{o.code}</p>
              <p className="text-xs text-taupe">{formatDateTime(o.createdAt, locale)} · {t('status.method.' + o.paymentMethod)}</p>
            </div>
            <span className={`badge ${TONE[o.status] ?? 'bg-cream-deep'}`}>{t('status.order.' + o.status)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <ul className="flex -space-x-2">
              {o.items.map((i, k) => <li key={k}><ProductImage src={i.image} alt={i.name} className="h-14 w-12 rounded-lg ring-2 ring-white" /></li>)}
              {o.itemCount > o.items.length ? <li className="grid h-14 w-12 place-items-center rounded-lg bg-cream-deep text-xs font-semibold ring-2 ring-white">+{o.itemCount - o.items.length}</li> : null}
            </ul>
            <div className="text-right"><p className="text-xs text-taupe">{t('account.items_count', { n: o.itemCount })}</p><p className="text-lg font-bold">{formatUSD(o.totalCents)}</p></div>
          </div>
          <div className="mt-4 flex justify-end"><Link href={`/order/${o.code}`} className="btn-outline btn-sm">{o.status === 'PENDING_PAYMENT' ? t('account.pay_now') : t('account.view_order')}</Link></div>
        </li>
      ))}
    </ul>
  );
}
