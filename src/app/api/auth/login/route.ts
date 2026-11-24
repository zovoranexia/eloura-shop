import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { DUMMY_HASH, verifyPassword, startSession, loadUser, publicUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(150), password: z.string().min(1).max(128) });
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

export const POST = route({ limit: ['login', 15, 15 * 60_000] }, async (ctx) => {
  const b = await ctx.body(schema);
  const u = await prisma.user.findUnique({ where: { email: b.email } });
  if (u?.lockedUntil && u.lockedUntil > new Date()) throw new AppError(423, 'ACCOUNT_LOCKED');
  const ok = await verifyPassword(b.password, u ? u.passwordHash : DUMMY_HASH); // constant-time-ish for unknown e-mails
  if (!u || !ok) {
    if (u) {
      const fails = u.failedLogins + 1;
      await prisma.user.update({ where: { id: u.id }, data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails } });
    }
    throw new AppError(401, 'INVALID_CREDENTIALS');
  }
  if (!u.isActive) throw new AppError(403, 'ACCOUNT_DISABLED');
  await prisma.user.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const user = await loadUser(u.id);
  await startSession(u.id, u.tokenVersion, !!user?.isStaff);
  if (user?.isStaff) await audit({ user, ip: ctx.ip, userAgent: ctx.userAgent }, 'auth.login', 'user', u.id);
  return { user: publicUser(user) };
});
