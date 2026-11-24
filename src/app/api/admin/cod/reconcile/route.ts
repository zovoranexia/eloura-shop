import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { reconcileCod } from '@/server/orders';

/** Finance confirms the courier handed over the cash for these delivered COD orders. */
export const POST = route({ perm: 'cod.reconcile' }, async (ctx) => {
  const { orderIds } = await ctx.body(z.object({ orderIds: z.array(z.number().int().positive()).min(1).max(200) }));
  const n = await reconcileCod(orderIds, { id: ctx.user!.id, name: ctx.user!.name });
  await audit(ctx, 'cod.reconcile', 'order', null, { orderIds, reconciled: n });
  return { ok: true, reconciled: n };
});
