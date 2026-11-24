import { requirePagePermission } from '@/components/admin/guard';
import { Staff } from './Staff';

export default async function StaffPage() {
  await requirePagePermission('staff.manage');
  return <Staff />;
}
