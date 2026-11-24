import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

export const POST = route({ limit: ['newsletter', 6, 10 * 60_000] }, async (ctx) => {
  const { email } = await ctx.body(z.object({ email: z.string().trim().toLowerCase().email().max(150) }));
  await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email, locale: ctx.locale } });
  return { ok: true };
});
