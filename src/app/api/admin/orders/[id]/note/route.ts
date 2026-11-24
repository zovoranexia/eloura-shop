import { z } from 'zod';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { addEvent } from '@/server/orders';

/** Internal staff note on the order timeline (never shown to the customer). */
export const POST = route<{ id: string }>({ perm: 'orders.view' }, async (ctx) => {
  const { note } = await ctx.body(z.object({ note: z.string().trim().min(1).max(500) }));
  const id = Number(ctx.params.id);
  if (!(await prisma.order.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
  await addEvent(prisma, id, 'note', { actor: { id: ctx.user!.id, name: ctx.user!.name }, note });
  return { ok: true };
});
