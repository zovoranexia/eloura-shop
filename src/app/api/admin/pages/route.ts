import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

export const GET = route({ perm: 'cms.manage' }, async () => prisma.cmsPage.findMany({ orderBy: { slug: 'asc' } }));
