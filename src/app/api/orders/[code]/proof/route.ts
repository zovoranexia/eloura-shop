import { route } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { findOrderByCode, orderView, submitProof } from '@/server/orders';
import { loadOrderFor } from '@/server/order-access';
import { parseDiliLocal } from '@/lib/time';

/** Customer uploads payment evidence (multipart: file, reference, payerName?, payerAccount?, paidAt? "YYYY-MM-DDTHH:mm" Dili time). */
export const POST = route<{ code: string }>({ limit: ['proof', 10, 10 * 60_000] }, async (ctx) => {
  const order = await loadOrderFor(ctx);
  let form: FormData;
  try { form = await ctx.req.formData(); } catch { throw new AppError(400, 'BAD_FORM'); }
  const str = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const file = form.get('file');
  const paidRaw = str('paidAt', 20);
  await submitProof(order.id, {
    reference: str('reference', 80), payerName: str('payerName', 100), payerAccount: str('payerAccount', 60),
    paidAt: paidRaw ? parseDiliLocal(paidRaw) : null, file: file instanceof File ? file : null,
  });
  return orderView((await findOrderByCode(order.code))!, ctx.locale);
});
