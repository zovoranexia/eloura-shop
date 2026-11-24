import { requirePagePermission } from '@/components/admin/guard';
import { PaymentMethods } from './PaymentMethods';

export default async function PaymentMethodsPage() {
  await requirePagePermission('settings.manage');
  return <PaymentMethods />;
}
