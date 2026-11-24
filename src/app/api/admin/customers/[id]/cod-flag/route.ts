import { z } from 'zod';
import { route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { setCodBlock } from '@/server/orders';

/** Flag / unflag a customer for repeated COD refusals. Flagged customers never see Cash on Delivery. */
export const POST = route<{ id: string }>({ perm: 'cod.flag_customers' }, async (ctx) => {
  const b = await ctx.body(z.object({ blocked: z.boolean(), reason: z.string().trim().max(200).optional() }));
  const id = Number(ctx.params.id);
  const u = await setCodBlock(id, b.blocked, b.reason ?? 'Flagged by staff');
  await audit(ctx, b.blocked ? 'cod.flag' : 'cod.unflag', 'user', id, { reason: b.reason });
  return { codBlocked: u.codBlocked, codRefusals: u.codRefusals };
});
