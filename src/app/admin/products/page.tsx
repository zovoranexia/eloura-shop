import { requirePagePermission } from '@/components/admin/guard';
import { ProductsList } from './ProductsList';

export default async function ProductsPage(props: { searchParams: Promise<{ stock?: string }> }) {
  const searchParams = await props.searchParams;
  await requirePagePermission('products.view');
  return <ProductsList initialLowStock={searchParams.stock === 'low'} />;
}
