import { route } from '@/lib/api';
import { notFound } from '@/lib/errors';
import { findOrderById, orderView } from '@/server/orders';

export const GET = route<{ id: string }>({ perm: 'orders.view' }, async (ctx) => {
  const o = await findOrderById(Number(ctx.params.id));
  if (!o) throw notFound();
  return orderView(o, ctx.locale, { staff: true, hideProofs: !ctx.user!.permissions.includes('payments.view') });
});
