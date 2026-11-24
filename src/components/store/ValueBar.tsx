import { Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { getT } from '@/lib/i18n';
import { formatUSD } from '@/lib/money';
import type { StoreConfig } from '@/server/storefront';

export async function ValueBar({ config }: { config: StoreConfig }) {
  const { t } = await getT();
  const items = [
    { icon: <Truck size={30} strokeWidth={1.3} />, title: t('value.delivery_title'), sub: config.diliFreeOverCents ? t('value.delivery_sub', { amount: formatUSD(config.diliFreeOverCents) }) : t('value.delivery_sub_plain') },
    { icon: <RotateCcw size={30} strokeWidth={1.3} />, title: t('value.returns_title'), sub: t('value.returns_sub', { days: config.store.returnDays }) },
    { icon: <ShieldCheck size={30} strokeWidth={1.3} />, title: t('value.payments_title'), sub: t('value.payments_sub') },
    { icon: <Headset size={30} strokeWidth={1.3} />, title: t('value.support_title'), sub: t('value.support_sub') },
  ];
  return (
    <section className="container-x mt-14" aria-label={t('value.label')}>
      <ul className="grid grid-cols-1 gap-y-6 rounded-card bg-white p-6 shadow-card sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-cream-line">
        {items.map((i) => (
          <li key={i.title} className="flex items-center gap-4 lg:justify-center lg:px-4">
            <span className="text-mauve">{i.icon}</span>
            <span className="text-sm"><span className="block font-semibold">{i.title}</span><span className="text-taupe">{i.sub}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
