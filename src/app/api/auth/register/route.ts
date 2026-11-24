import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError, conflict } from '@/lib/errors';
import { hashPassword, passwordOk, startSession, loadUser, publicUser } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  phone: z.string().trim().max(25).optional().or(z.literal('')),
  password: z.string().max(128).refine(passwordOk, 'WEAK_PASSWORD'),
});

export const POST = route({ limit: ['register', 8, 60 * 60_000] }, async (ctx) => {
  const b = await ctx.body(schema);
  let phone: string | null = null;
  if (b.phone) {
    const p = normalizePhone(b.phone);
    if (!p.valid) throw new AppError(422, 'INVALID_PHONE');
    phone = p.e164;
  }
  if (await prisma.user.findUnique({ where: { email: b.email } })) throw conflict('EMAIL_TAKEN');
  const role = await prisma.role.findUnique({ where: { key: 'CUSTOMER' } });
  const u = await prisma.user.create({
    data: { email: b.email, name: b.name, phone, passwordHash: await hashPassword(b.password), locale: ctx.locale, roles: role ? { create: { roleId: role.id } } : undefined },
  });
  await startSession(u.id, u.tokenVersion, false);
  return { user: publicUser(await loadUser(u.id)) };
});
