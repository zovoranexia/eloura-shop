import { z } from 'zod';
import { route } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { audit } from '@/lib/audit';
import { reviewProof } from '@/server/orders';

/** Approve (-> order PROCESSING, payment PAID) or reject (-> order back to PENDING_PAYMENT, reason shown to the customer). */
export const POST = route<{ id: string }>({ perm: 'payments.verify' }, async (ctx) => {
  const b = await ctx.body(z.object({ approve: z.boolean(), note: z.string().trim().max(500).optional() }));
  if (!b.approve && !b.note) throw new AppError(422, 'VALIDATION', { note: 'REQUIRED' });
  const o = await reviewProof(Number(ctx.params.id), { id: ctx.user!.id, name: ctx.user!.name }, b);
  await audit(ctx, b.approve ? 'payment.approve' : 'payment.reject', 'payment', ctx.params.id, { order: o.code, note: b.note });
  return { ok: true, order: { id: o.id, code: o.code, status: o.status, paymentStatus: o.paymentStatus } };
});
