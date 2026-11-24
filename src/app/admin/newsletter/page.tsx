import { requirePagePermission } from '@/components/admin/guard';
import { NewsletterList } from './NewsletterList';

export default async function NewsletterPage() {
  await requirePagePermission({ any: ['banners.manage', 'reports.export'] });
  return <NewsletterList />;
}
