import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { findOrderById, markRefunded, orderView } from '@/server/orders';

export const POST = route<{ id: string }>({ perm: 'payments.refund' }, async (ctx) => {
  const { note } = await ctx.body(z.object({ note: z.string().trim().max(500).optional() }));
  const id = Number(ctx.params.id);
  await markRefunded(id, { id: ctx.user!.id, name: ctx.user!.name }, note);
  await audit(ctx, 'order.refund', 'order', id);
  return orderView((await findOrderById(id))!, ctx.locale, { staff: true });
});
