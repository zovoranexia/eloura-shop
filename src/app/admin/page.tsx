import Link from 'next/link';
import { AlertTriangle, Banknote, Clock, CreditCard, MessageSquare, PackageCheck, RotateCcw, Truck, Wallet } from 'lucide-react';
import { requirePagePermission } from '@/components/admin/guard';
import { ALL_PERMISSIONS } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { dashboard } from '@/server/reports';
import { formatUSD } from '@/lib/money';
import { formatDate } from '@/lib/time';
import { BarLineChart, HBars } from '@/components/admin/charts';
import { Card, PageHeader } from '@/components/admin/ui';
import { MethodMix } from './MethodMix';
import { cn } from '@/lib/client/cn';

export default async function DashboardPage() {
  const user = await requirePagePermission({ any: ALL_PERMISSIONS });
  const { t, locale } = await getT({ admin: true });
  const can = (p: string) => user.permissions.includes(p);
  if (!can('dashboard.view')) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-4xl font-medium">{t('admin.dashboard.welcome', { name: user.name })}</h1>
        <p className="mt-2 text-taupe">{t('admin.dashboard.welcomeText')}</p>
      </div>
    );
  }
  const d = await dashboard(locale);

  const stat = (label: string, value: string, sub?: string) => (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">{label}</p>
      <p className="mt-1 font-serif text-4xl font-medium text-mauve">{value}</p>
      {sub && <p className="mt-1 text-xs text-taupe">{sub}</p>}
    </div>
  );

  const queues: { key: string; n: number; href: string; icon: typeof Clock; perm: string; tone: string; extra?: string }[] = [
    { key: 'awaitingVerification', n: d.awaitingVerification, href: '/admin/payments', icon: CreditCard, perm: 'payments.view', tone: 'text-sky-700' },
    { key: 'codToConfirm', n: d.codToConfirm, href: '/admin/orders?status=PENDING_CONFIRMATION', icon: Clock, perm: 'orders.view', tone: 'text-amber-700' },
    { key: 'toPack', n: d.toPack, href: '/admin/orders?status=PROCESSING', icon: PackageCheck, perm: 'orders.view', tone: 'text-mauve' },
    { key: 'outForDelivery', n: d.outForDelivery, href: '/admin/orders?status=OUT_FOR_DELIVERY', icon: Truck, perm: 'orders.view', tone: 'text-sky-700' },
    { key: 'codCash', n: d.codOrdersToReconcile, href: '/admin/cod', icon: Banknote, perm: 'cod.reconcile', tone: 'text-emerald-700', extra: formatUSD(d.codCashToReconcileCents) },
    { key: 'refunds', n: d.refundsPending, href: '/admin/orders?paymentStatus=REFUND_PENDING', icon: RotateCcw, perm: 'orders.view', tone: 'text-amber-700' },
    { key: 'inquiries', n: d.unreadMessages, href: '/admin/inquiries', icon: MessageSquare, perm: 'inquiries.manage', tone: 'text-mauve' },
  ];

  const statusRows = d.statusCounts.map((s) => ({ label: t(`status.order.${s.status}`), value: s.n, display: String(s.n), color: s.status === 'CANCELLED' ? '#B45309' : s.status === 'DELIVERED' ? '#047857' : '#7D4E57' }));
  const methodRows = d.methodBreakdown
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .map((m) => ({ key: m.method, label: t(`status.method.${m.method}`), orders: m.orders, revenueCents: m.revenueCents }));

  return (
    <>
      <PageHeader title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle', { date: formatDate(new Date(), locale) })} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat(t('admin.dashboard.revenueToday'), formatUSD(d.revenueTodayCents), t('admin.dashboard.ordersToday', { n: d.ordersToday }))}
        {stat(t('admin.dashboard.revenueMonth'), formatUSD(d.revenueMonthCents), t('admin.dashboard.paidOnly'))}
        {stat(t('admin.dashboard.revenue14'), formatUSD(d.revenue14Cents), t('admin.dashboard.last14'))}
        {stat(t('admin.dashboard.newCustomers'), String(d.newCustomers7), t('admin.dashboard.last7'))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={t('admin.dashboard.chartTitle')}
          actions={<span className="flex items-center gap-3 text-xs text-taupe"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-mauve" />{t('admin.dashboard.revenue')}<i className="inline-block h-0.5 w-4 bg-gold" />{t('admin.dashboard.orders')}</span>}>
          <BarLineChart ariaLabel={t('admin.dashboard.chartTitle')} fmt={(v) => formatUSD(v)} data={d.series.map((s) => ({ label: s.date.slice(5), value: s.revenueCents, line: s.orders, title: `${s.date} — ${formatUSD(s.revenueCents)} · ${s.orders} ${t('admin.dashboard.orders')}` }))} />
          <p className="mt-2 text-[11px] text-taupe">{t('admin.dashboard.tzNote')}</p>
        </Card>

        <Card title={t('admin.dashboard.queues')}>
          <ul className="divide-y divide-cream-line">
            {queues.filter((q) => can(q.perm)).map((q) => (
              <li key={q.key}>
                <Link href={q.href} className="flex items-center gap-3 py-2.5 text-sm hover:text-mauve">
                  <q.icon size={18} className={q.tone} aria-hidden />
                  <span className="flex-1">{t(`admin.dashboard.q.${q.key}`)}</span>
                  {q.extra && <span className="text-xs text-taupe">{q.extra}</span>}
                  <span className={cn('min-w-[2rem] rounded-full px-2 py-0.5 text-center text-xs font-bold', q.n > 0 ? 'bg-mauve text-white' : 'bg-cream-deep text-taupe')}>{q.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card title={t('admin.dashboard.byStatus')}><HBars rows={statusRows} empty={t('common.noResults')} /></Card>
        <Card title={t('admin.dashboard.byMethod')}><MethodMix rows={methodRows} orderLabel={t('admin.dashboard.orders')} revenueLabel={t('admin.dashboard.revenue')} empty={t('common.noResults')} /></Card>
        <Card title={t('admin.dashboard.topProducts')}>
          <HBars empty={t('common.noResults')} rows={d.topProducts.map((p) => ({ label: p.name, value: p.qty, display: t('admin.dashboard.units', { n: p.qty }) }))} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" />{t('admin.dashboard.lowStock')}</span>} actions={can('products.view') ? <Link href="/admin/inventory" className="btn-outline btn-sm">{t('admin.dashboard.manageStock')}</Link> : undefined}>
          {d.lowStock.length === 0 ? <p className="py-6 text-center text-sm text-taupe">{t('admin.dashboard.stockOk')}</p> : (
            <ul className="divide-y divide-cream-line text-sm">
              {d.lowStock.map((v) => (
                <li key={v.sku} className="flex items-center gap-3 py-2">
                  <span className="flex-1"><b className="font-semibold">{v.name}</b> <span className="text-taupe">{[v.size, v.color].filter(Boolean).join(' · ')}</span><br /><span className="text-xs text-taupe">{v.sku}</span></span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', v.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800')}>{v.stock === 0 ? t('admin.dashboard.soldOut') : t('admin.dashboard.left', { n: v.stock })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={<span className="flex items-center gap-2"><Wallet size={18} className="text-mauve" />{t('admin.dashboard.monthly')}</span>}>
          {d.monthly.length === 0 ? <p className="py-6 text-center text-sm text-taupe">{t('common.noResults')}</p> : (
            <BarLineChart ariaLabel={t('admin.dashboard.monthly')} height={200} fmt={(v) => formatUSD(v)} data={d.monthly.map((m) => ({ label: m.month, value: m.revenueCents, line: m.orders, title: `${m.month} — ${formatUSD(m.revenueCents)} · ${m.orders}` }))} />
          )}
        </Card>
      </div>
    </>
  );
}
