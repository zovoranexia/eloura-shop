import { requirePagePermission } from '@/components/admin/guard';
import { ProductEditor } from '../ProductEditor';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requirePagePermission('products.view');
  return <ProductEditor id={Number(params.id)} />;
}
