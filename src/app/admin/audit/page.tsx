import { requirePagePermission } from '@/components/admin/guard';
import { AuditLog } from './AuditLog';

export default async function AuditPage() {
  await requirePagePermission('audit.view');
  return <AuditLog />;
}
