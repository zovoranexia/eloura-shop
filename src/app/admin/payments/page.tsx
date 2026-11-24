import { requirePagePermission } from '@/components/admin/guard';
import { PaymentCenter } from './PaymentCenter';

export default async function PaymentsPage({ searchParams }: { searchParams: { status?: string; order?: string } }) {
  await requirePagePermission('payments.view');
  return <PaymentCenter initialStatus={searchParams.status ?? 'SUBMITTED'} />;
}
