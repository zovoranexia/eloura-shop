import { route } from '@/lib/api';
import { prisma } from '@/lib/db';

/** ids of the signed-in customer's wishlist (used to paint the hearts) */
export const GET = route({}, async ({ user }) => {
  if (!user) return { ids: [] };
  const rows = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return { ids: rows.map((r) => r.productId) };
});
