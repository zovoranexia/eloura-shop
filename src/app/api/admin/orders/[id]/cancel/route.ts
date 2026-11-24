import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { cancelOrder, findOrderById, orderView } from '@/server/orders';

/** reason: free text; codRefused=true counts a refused COD delivery against the customer (auto-flag threshold in settings). */
export const POST = route<{ id: string }>({ perm: 'orders.cancel' }, async (ctx) => {
  const b = await ctx.body(z.object({ reason: z.string().trim().min(2).max(120), note: z.string().trim().max(500).optional(), codRefused: z.boolean().optional() }));
  const o = await cancelOrder(Number(ctx.params.id), { id: ctx.user!.id, name: ctx.user!.name }, { reason: b.reason, note: b.note, codRefused: b.codRefused });
  await audit(ctx, 'order.cancel', 'order', o.id, { code: o.code, reason: b.reason, codRefused: !!b.codRefused });
  return orderView((await findOrderById(o.id))!, ctx.locale, { staff: true, hideProofs: !ctx.user!.permissions.includes('payments.view') });
});
