import { requirePagePermission } from '@/components/admin/guard';
import { CustomersList } from './CustomersList';

export default async function CustomersPage() {
  await requirePagePermission('customers.view');
  return <CustomersList />;
}
