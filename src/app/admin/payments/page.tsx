import { requirePagePermission } from '@/components/admin/guard';
import { PaymentCenter } from './PaymentCenter';

export default async function PaymentsPage(props: { searchParams: Promise<{ status?: string; order?: string }> }) {
  const searchParams = await props.searchParams;
  await requirePagePermission('payments.view');
  return <PaymentCenter initialStatus={searchParams.status ?? 'SUBMITTED'} />;
}
