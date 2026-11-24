import { requirePagePermission } from '@/components/admin/guard';
import { Coupons } from './Coupons';

export default async function CouponsPage() {
  await requirePagePermission('coupons.manage');
  return <Coupons />;
}
