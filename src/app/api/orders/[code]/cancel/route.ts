import { route } from '@/lib/api';
import { customerCancel, findOrderByCode, orderView } from '@/server/orders';
import { loadOrderFor } from '@/server/order-access';

export const POST = route<{ code: string }>({ limit: ['cancel', 10, 10 * 60_000] }, async (ctx) => {
  const o = await loadOrderFor(ctx);
  await customerCancel(o.code);
  return orderView((await findOrderByCode(o.code))!, ctx.locale);
});
