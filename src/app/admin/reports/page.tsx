import { requirePagePermission } from '@/components/admin/guard';
import { getT } from '@/lib/i18n';
import { dashboard } from '@/server/reports';
import { formatUSD } from '@/lib/money';
import { BarLineChart } from '@/components/admin/charts';
import { Card, PageHeader } from '@/components/admin/ui';
import { MethodMix } from '../MethodMix';
import { ExportPanel } from './ExportPanel';
import { addDays, diliDay } from '@/lib/time';

export default async function ReportsPage() {
  const user = await requirePagePermission({ any: ['reports.view', 'reports.export'] });
  const { t, locale } = await getT({ admin: true });
  const canView = user.permissions.includes('reports.view');
  const canExport = user.permissions.includes('reports.export');
  const d = canView ? await dashboard(locale) : null;
  const today = diliDay();
  return (
    <>
      <PageHeader title={t('admin.reports.title')} subtitle={t('admin.reports.subtitle')} />
      {d && (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2" title={t('admin.reports.monthly')}>
            {d.monthly.length ? (
              <BarLineChart ariaLabel={t('admin.reports.monthly')} fmt={(v) => formatUSD(v)} data={d.monthly.map((m) => ({ label: m.month, value: m.revenueCents, line: m.orders, title: `${m.month} — ${formatUSD(m.revenueCents)} · ${m.orders}` }))} />
            ) : <p className="py-8 text-center text-sm text-taupe">{t('common.noResults')}</p>}
            <p className="mt-2 text-[11px] text-taupe">{t('admin.dashboard.tzNote')}</p>
          </Card>
          <Card title={t('admin.dashboard.byMethod')}>
            <MethodMix rows={d.methodBreakdown.map((m) => ({ key: m.method, label: t(`status.method.${m.method}`), orders: m.orders, revenueCents: m.revenueCents }))}
              orderLabel={t('admin.dashboard.orders')} revenueLabel={t('admin.dashboard.revenue')} empty={t('common.noResults')} />
          </Card>
        </div>
      )}
      {canExport && <ExportPanel defaultFrom={addDays(today, -29)} defaultTo={today} />}
    </>
  );
}
