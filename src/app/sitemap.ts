import type { MetadataRoute } from 'next';
import { sitemapEntries } from '@/server/storefront';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const { products, categories } = await sitemapEntries();
  return [
    ...['', '/shop', '/categories', '/contact', '/page/about', '/page/cod-terms', '/page/shipping-returns', '/page/privacy', '/page/terms'].map((p) => ({ url: `${base}${p}` })),
    ...categories.map((c) => ({ url: `${base}/shop?category=${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
