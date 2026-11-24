import { requirePagePermission } from '@/components/admin/guard';
import { OrdersList } from './OrdersList';

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string; paymentStatus?: string; method?: string; q?: string } }) {
  await requirePagePermission('orders.view');
  return <OrdersList initial={{ status: searchParams.status ?? '', paymentStatus: searchParams.paymentStatus ?? '', method: searchParams.method ?? '', q: searchParams.q ?? '' }} />;
}
