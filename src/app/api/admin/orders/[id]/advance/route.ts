import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { advanceOrder, findOrderById, orderView } from '@/server/orders';

/** Moves the order one step: COD confirmed -> PROCESSING -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED (COD: records the cash collected). */
export const POST = route<{ id: string }>({ perm: 'orders.update_status' }, async (ctx) => {
  const b = await ctx.body(z.object({ note: z.string().trim().max(500).optional(), collectedCents: z.number().int().min(0).optional() }));
  const o = await advanceOrder(Number(ctx.params.id), { id: ctx.user!.id, name: ctx.user!.name }, b);
  await audit(ctx, `order.${o.status.toLowerCase()}`, 'order', o.id, { code: o.code });
  return orderView((await findOrderById(o.id))!, ctx.locale, { staff: true, hideProofs: !ctx.user!.permissions.includes('payments.view') });
});
