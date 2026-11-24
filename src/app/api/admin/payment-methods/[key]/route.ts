import { PaymentMethodKey } from '@prisma/client';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { cleanI18n } from '@/lib/i18n-shared';
import { audit } from '@/lib/audit';
import { methodSchema } from '@/server/admin-content';

export const PUT = route<{ key: string }>({ perm: 'settings.manage' }, async (ctx) => {
  const key = ctx.params.key as PaymentMethodKey;
  if (!Object.values(PaymentMethodKey).includes(key)) throw notFound();
  const b = await ctx.body(methodSchema);
  const c = b.config;
  // only keep the fields that make sense for this method
  const config =
    key === 'BANK_BNCTL' || key === 'ATM_BNCTL' ? { bankName: c.bankName, accountHolder: c.accountHolder, accountNumber: c.accountNumber, branch: c.branch, swift: c.swift }
    : key === 'COD' ? {} : { merchantName: c.merchantName, merchantNumber: c.merchantNumber, qrImage: c.qrImage };
  const m = await prisma.paymentMethodConfig.update({
    where: { key }, data: { enabled: b.enabled, sortOrder: b.sortOrder, name: cleanI18n(b.name), instructions: cleanI18n(b.instructions), config },
  });
  await audit(ctx, 'payment_method.update', 'payment_method', key, { enabled: b.enabled }); // account numbers deliberately not logged
  return m;
});
