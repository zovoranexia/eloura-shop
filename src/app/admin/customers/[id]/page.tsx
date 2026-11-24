import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/components/admin/guard';
import { CustomerDetail } from './CustomerDetail';

export default async function CustomerPage({ params }: { params: { id: string } }) {
  await requirePagePermission('customers.view');
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <CustomerDetail id={id} />;
}
