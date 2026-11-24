import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { hashPassword, verifyPassword, passwordOk, startSession } from '@/lib/auth';

export const POST = route({ auth: true, limit: ['password', 10, 15 * 60_000] }, async (ctx) => {
  const b = await ctx.body(z.object({ current: z.string().min(1).max(128), next: z.string().max(128).refine(passwordOk, 'WEAK_PASSWORD') }));
  const u = await prisma.user.findUniqueOrThrow({ where: { id: ctx.user!.id } });
  if (!(await verifyPassword(b.current, u.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS');
  // bumping tokenVersion signs out every other device; re-issue the cookie for this one
  const next = await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(b.next), tokenVersion: { increment: 1 } } });
  await startSession(next.id, next.tokenVersion, ctx.user!.isStaff);
  return { ok: true };
});
