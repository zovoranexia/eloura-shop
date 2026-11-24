import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { publicUser, loadUser } from '@/lib/auth';
import { LOCALES } from '@/lib/i18n-shared';
import { normalizePhone } from '@/lib/phone';

export const GET = route({}, async ({ user }) => ({ user: publicUser(user) }));

export const PATCH = route({ auth: true }, async (ctx) => {
  const b = await ctx.body(z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(25).optional().or(z.literal('')), locale: z.enum(LOCALES) }));
  let phone: string | null = null;
  if (b.phone) {
    const p = normalizePhone(b.phone);
    if (!p.valid) throw new AppError(422, 'INVALID_PHONE');
    phone = p.e164;
  }
  await prisma.user.update({ where: { id: ctx.user!.id }, data: { name: b.name, phone, locale: b.locale } });
  return { user: publicUser(await loadUser(ctx.user!.id)) };
});
