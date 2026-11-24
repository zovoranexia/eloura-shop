import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { CartView } from '@/components/store/CartView';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getT().t('cart.title'), robots: { index: false } };
}

export default function CartPage() {
  const { t } = getT();
  return (
    <div className="container-x py-8 md:py-10">
      <h1 className="mb-6 text-4xl md:text-5xl">{t('cart.title')}</h1>
      <CartView />
    </div>
  );
}
