import { requirePagePermission } from '@/components/admin/guard';
import { Inquiries } from './Inquiries';

export default async function InquiriesPage() {
  await requirePagePermission('inquiries.manage');
  return <Inquiries />;
}
