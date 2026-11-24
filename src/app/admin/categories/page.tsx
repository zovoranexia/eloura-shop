import { requirePagePermission } from '@/components/admin/guard';
import { Categories } from './Categories';

export default async function CategoriesPage() {
  await requirePagePermission('categories.manage');
  return <Categories />;
}
