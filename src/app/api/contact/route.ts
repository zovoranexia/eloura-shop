import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';

export const POST = route({ limit: ['contact', 5, 10 * 60_000] }, async (ctx) => {
  const b = await ctx.body(z.object({
    name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(150),
    phone: z.string().trim().max(25).optional().or(z.literal('')), message: z.string().trim().min(5).max(2000),
    website: z.string().max(0).optional(), // honeypot: bots fill it, humans never see it
  }));
  if (b.phone && !normalizePhone(b.phone).valid) throw new AppError(422, 'INVALID_PHONE');
  await prisma.contactMessage.create({ data: { name: b.name, email: b.email, phone: b.phone || null, message: b.message } });
  return { ok: true };
});
