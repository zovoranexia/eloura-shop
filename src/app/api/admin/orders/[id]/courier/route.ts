import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { assignCourier, findOrderById, orderView } from '@/server/orders';

export const POST = route<{ id: string }>({ perm: 'orders.assign_courier' }, async (ctx) => {
  const b = await ctx.body(z.object({ courierId: z.number().int().positive().nullable(), note: z.string().trim().max(300).optional() }));
  const id = Number(ctx.params.id);
  await assignCourier(id, { id: ctx.user!.id, name: ctx.user!.name }, b.courierId, b.note);
  await audit(ctx, 'order.assign_courier', 'order', id, { courierId: b.courierId });
  return orderView((await findOrderById(id))!, ctx.locale, { staff: true, hideProofs: !ctx.user!.permissions.includes('payments.view') });
});
