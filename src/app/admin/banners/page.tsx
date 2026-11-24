import { requirePagePermission } from '@/components/admin/guard';
import { Banners } from './Banners';

export default async function BannersPage() {
  await requirePagePermission('banners.manage');
  return <Banners />;
}
