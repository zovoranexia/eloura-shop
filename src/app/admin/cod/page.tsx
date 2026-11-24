import { requirePagePermission } from '@/components/admin/guard';
import { CodLedger } from './CodLedger';

export default async function CodPage() {
  await requirePagePermission('cod.reconcile');
  return <CodLedger />;
}
