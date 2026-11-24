import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { normalizePhone } from '@/lib/phone';

/** Guest order lookup: order code + the phone number or e-mail used at checkout. */
export const POST = route({ limit: ['track', 15, 15 * 60_000] }, async (ctx) => {
  const b = await ctx.body(z.object({ code: z.string().trim().min(6).max(30), contact: z.string().trim().min(5).max(150) }));
  const o = await prisma.order.findUnique({ where: { code: b.code.toUpperCase() } });
  const phone = normalizePhone(b.contact);
  const match = o && ((phone.valid && o.customerPhone === phone.e164) || (o.customerEmail && o.customerEmail.toLowerCase() === b.contact.toLowerCase()));
  if (!o || !match) throw notFound('ORDER_NOT_FOUND');
  return { code: o.code, token: o.accessToken };
});
