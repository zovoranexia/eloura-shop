import { requirePagePermission } from '@/components/admin/guard';
import { ORDER_STATUSES, METHODS, PAYMENT_STATUSES } from '@/components/admin/constants';
import { OrdersList } from './OrdersList';

type Param = string | string[] | undefined;
/** Query params may repeat (string[]) or hold junk; only pass values the API understands. */
const one = (v: Param) => (Array.isArray(v) ? v[0] : v) ?? '';
const oneOf = (v: Param, allowed: readonly string[]) => (allowed.includes(one(v)) ? one(v) : '');

export default async function OrdersPage(
  props: { searchParams: Promise<{ status?: Param; paymentStatus?: Param; method?: Param; q?: Param }> }
) {
  const searchParams = await props.searchParams;
  await requirePagePermission('orders.view');
  return <OrdersList initial={{ status: oneOf(searchParams.status, ORDER_STATUSES), paymentStatus: oneOf(searchParams.paymentStatus, PAYMENT_STATUSES), method: oneOf(searchParams.method, METHODS), q: one(searchParams.q) }} />;
}
