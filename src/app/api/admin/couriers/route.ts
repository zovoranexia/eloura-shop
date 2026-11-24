import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

/** Staff who can be assigned to Dili deliveries. */
export const GET = route({ anyPerm: ['orders.assign_courier', 'orders.view'] }, async () =>
  (await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { key: { in: ['ORDER_FULFILLMENT', 'STORE_MANAGER', 'SUPER_ADMIN'] } } } } }, orderBy: { name: 'asc' }, select: { id: true, name: true },
  })));
