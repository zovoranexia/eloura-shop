import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/components/admin/guard';
import { ProductEditor } from '../ProductEditor';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requirePagePermission('products.view');
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <ProductEditor id={id} />;
}
