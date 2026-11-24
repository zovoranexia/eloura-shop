import { route } from '@/lib/api';
import { orderView } from '@/server/orders';
import { loadOrderFor } from '@/server/order-access';

export const GET = route<{ code: string }>({}, async (ctx) => {
  const o = await loadOrderFor(ctx);
  return orderView(o, ctx.locale);
});
