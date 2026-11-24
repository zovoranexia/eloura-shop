import { requirePagePermission } from '@/components/admin/guard';
import { prisma } from '@/lib/db';
import { getLocale, loc } from '@/lib/i18n';
import { getSetting } from '@/server/settings';
import { InventoryTable } from './InventoryTable';

export default async function InventoryPage() {
  const user = await requirePagePermission({ any: ['inventory.update', 'products.view'] });
  const locale = getLocale();
  const [threshold, rows] = await Promise.all([
    getSetting('commerce').then((c) => c.lowStockThreshold),
    prisma.productVariant.findMany({
      where: { product: { isActive: true } }, orderBy: [{ stock: 'asc' }, { id: 'asc' }], take: 1000,
      include: { product: { select: { id: true, name: true, sku: true } } },
    }),
  ]);
  return (
    <InventoryTable
      canEdit={user.permissions.includes('inventory.update')} threshold={threshold}
      rows={rows.map((v) => ({ id: v.id, productId: v.product.id, product: loc(v.product.name, locale), sku: v.sku, size: v.size, color: v.color, stock: v.stock, isActive: v.isActive }))}
    />
  );
}
