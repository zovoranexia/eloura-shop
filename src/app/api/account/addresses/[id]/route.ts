import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/errors';
import { addressSchema, addressData } from '@/server/address';

export const PUT = route<{ id: string }>({ auth: true }, async (ctx) => {
  const b = await ctx.body(addressSchema);
  const id = Number(ctx.params.id), uid = ctx.user!.id;
  if (!(await prisma.address.findFirst({ where: { id, userId: uid }, select: { id: true } }))) throw notFound();
  return prisma.$transaction(async (tx) => {
    if (b.isDefault) await tx.address.updateMany({ where: { userId: uid }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { ...addressData(b), ...(b.isDefault ? { isDefault: true } : {}) } });
  });
});

export const DELETE = route<{ id: string }>({ auth: true }, async (ctx) => {
  await prisma.address.deleteMany({ where: { id: Number(ctx.params.id), userId: ctx.user!.id } });
  return { ok: true };
});
