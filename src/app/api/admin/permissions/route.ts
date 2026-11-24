import { route } from '@/lib/api';
import { PERMISSIONS } from '@/lib/rbac';

export const GET = route({ anyPerm: ['roles.manage', 'staff.manage'] }, async () => PERMISSIONS);
