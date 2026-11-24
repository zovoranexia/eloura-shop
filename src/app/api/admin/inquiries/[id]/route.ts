import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const PATCH = route<{ id: string }>({ perm: 'inquiries.manage' }, async (ctx) => {
  const { isRead } = await ctx.body(z.object({ isRead: z.boolean() }));
  await prisma.contactMessage.update({ where: { id: Number(ctx.params.id) }, data: { isRead } });
  return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'inquiries.manage' }, async (ctx) => {
  await prisma.contactMessage.delete({ where: { id: Number(ctx.params.id) } });
  await audit(ctx, 'inquiry.delete', 'inquiry', ctx.params.id);
  return { ok: true };
});
