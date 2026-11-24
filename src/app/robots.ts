import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/storefront';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/account', '/checkout', '/cart', '/track', '/order/', '/wishlist'] }], sitemap: `${base}/sitemap.xml` };
}
