import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { listCustomerAddresses } from '@/server/storefront';
import { CheckoutFlow } from '@/components/store/CheckoutFlow';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('checkout.title'), robots: { index: false } };
}

export default async function CheckoutPage() {
  const { t } = await getT();
  const user = await getSessionUser();
  const addresses = user ? await listCustomerAddresses(user.id) : [];
  return (
    <div className="container-x py-8 md:py-10">
      <h1 className="mb-6 text-4xl md:text-5xl">{t('checkout.title')}</h1>
      <CheckoutFlow addresses={addresses} />
    </div>
  );
}
