import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { listCustomerAddresses } from '@/server/storefront';
import { AddressManager } from '@/components/store/AddressManager';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('account.nav_addresses'), robots: { index: false } };
}

export default async function AddressesPage() {
  const user = (await getSessionUser())!;
  return <AddressManager addresses={await listCustomerAddresses(user.id)} />;
}
