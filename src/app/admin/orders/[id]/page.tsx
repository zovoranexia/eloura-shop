import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/components/admin/guard';
import { OrderDetail } from './OrderDetail';

export default async function OrderPage({ params }: { params: { id: string } }) {
  await requirePagePermission('orders.view');
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <OrderDetail id={id} />;
}
