import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

export const GET = route({ perm: 'inquiries.manage' }, async () => prisma.contactMessage.findMany({ orderBy: { id: 'desc' }, take: 200 }));
