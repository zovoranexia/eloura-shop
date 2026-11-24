import { requirePagePermission } from '@/components/admin/guard';
import { CmsPages } from './CmsPages';

export default async function PagesAdmin() {
  await requirePagePermission('cms.manage');
  return <CmsPages />;
}
