import { requirePagePermission } from '@/components/admin/guard';
import { CustomerDetail } from './CustomerDetail';

export default async function CustomerPage({ params }: { params: { id: string } }) {
  await requirePagePermission('customers.view');
  return <CustomerDetail id={Number(params.id)} />;
}
