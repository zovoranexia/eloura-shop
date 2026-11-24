import { requirePagePermission } from '@/components/admin/guard';
import { ProductEditor } from '../ProductEditor';

export default async function NewProductPage() {
  await requirePagePermission('products.create');
  return <ProductEditor />;
}
