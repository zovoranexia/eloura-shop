import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

export const GET = route({ perm: 'zones.manage' }, async () =>
  prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { sucos: { orderBy: { name: 'asc' } } } }));
