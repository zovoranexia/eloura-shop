import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const PATCH = route<{ id: string }>({ perm: 'reviews.moderate' }, async (ctx) => {
  const { status } = await ctx.body(z.object({ status: z.enum(['PUBLISHED', 'HIDDEN']) }));
  await prisma.review.update({ where: { id: Number(ctx.params.id) }, data: { status } });
  await audit(ctx, 'review.moderate', 'review', ctx.params.id, { status });
  return { ok: true };
});
