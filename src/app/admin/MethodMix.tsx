import { formatUSD } from '@/lib/money';
import { HBars } from '@/components/admin/charts';

const COLORS: Record<string, string> = { BANK_BNCTL: '#7D4E57', ATM_BNCTL: '#9A6B74', TPAY: '#B09365', MOSAN: '#3E3335', COD: '#C98B3A' };

/** Payment-method breakdown: share of paid revenue per method (BNCTL bank vs ATM vs T-Pay vs Mosan vs COD). */
export function MethodMix({ rows, orderLabel, revenueLabel, empty }: {
  rows: { key: string; label: string; orders: number; revenueCents: number }[]; orderLabel: string; revenueLabel: string; empty: string;
}) {
  const total = rows.reduce((s, r) => s + r.revenueCents, 0);
  return (
    <div>
      <HBars empty={empty} rows={rows.map((r) => ({
        label: r.label, value: r.revenueCents || r.orders / 1000, display: formatUSD(r.revenueCents),
        sub: `${r.orders} ${orderLabel}${total ? ` · ${Math.round((r.revenueCents / total) * 100)}%` : ''}`, color: COLORS[r.key],
      }))} />
      {total > 0 && <p className="mt-3 text-[11px] text-taupe">{revenueLabel}: {formatUSD(total)}</p>}
    </div>
  );
}
