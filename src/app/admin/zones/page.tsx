import { requirePagePermission } from '@/components/admin/guard';
import { Zones } from './Zones';

export default async function ZonesPage() {
  await requirePagePermission('zones.manage');
  return <Zones />;
}
