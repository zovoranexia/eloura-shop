import { requirePagePermission } from '@/components/admin/guard';
import { ProductsList } from './ProductsList';

export default async function ProductsPage({ searchParams }: { searchParams: { stock?: string } }) {
  await requirePagePermission('products.view');
  return <ProductsList initialLowStock={searchParams.stock === 'low'} />;
}
