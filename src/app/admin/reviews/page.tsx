import { requirePagePermission } from '@/components/admin/guard';
import { Reviews } from './Reviews';

export default async function ReviewsPage() {
  await requirePagePermission('reviews.moderate');
  return <Reviews />;
}
