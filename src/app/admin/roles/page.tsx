import { requirePagePermission } from '@/components/admin/guard';
import { Roles } from './Roles';

export default async function RolesPage() {
  await requirePagePermission({ any: ['roles.manage', 'staff.manage'] });
  return <Roles />;
}
