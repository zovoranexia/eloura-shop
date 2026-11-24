import { requirePagePermission } from '@/components/admin/guard';
import { OrderDetail } from './OrderDetail';

export default async function OrderPage({ params }: { params: { id: string } }) {
  await requirePagePermission('orders.view');
  return <OrderDetail id={Number(params.id)} />;
}
