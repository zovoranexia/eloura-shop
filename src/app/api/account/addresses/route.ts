import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { addressSchema, addressData } from '@/server/address';

export const GET = route({ auth: true }, async ({ user }) =>
  prisma.address.findMany({ where: { userId: user!.id }, orderBy: [{ isDefault: 'desc' }, { id: 'desc' }] }));

export const POST = route({ auth: true }, async (ctx) => {
  const b = await ctx.body(addressSchema);
  const uid = ctx.user!.id;
  const count = await prisma.address.count({ where: { userId: uid } });
  if (count >= 10) throw new AppError(409, 'LIMIT_REACHED');
  const makeDefault = b.isDefault || count === 0;
  return prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: uid }, data: { isDefault: false } });
    return tx.address.create({ data: { userId: uid, ...addressData(b), isDefault: makeDefault } });
  });
});
