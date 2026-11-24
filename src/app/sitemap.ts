import type { MetadataRoute } from 'next';
import { sitemapEntries, siteUrl } from '@/server/storefront';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { products, categories, pages } = await sitemapEntries();
  return [
    ...['', '/shop', '/categories', '/contact'].map((p) => ({ url: `${base}${p}` })),
    ...pages.map((p) => ({ url: `${base}/page/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt })),
    ...categories.map((c) => ({ url: `${base}/shop?category=${encodeURIComponent(c.slug)}` })),
    ...products.map((p) => ({ url: `${base}/product/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt })),
  ];
}
