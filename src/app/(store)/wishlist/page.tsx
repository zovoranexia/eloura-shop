import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cardsByIds } from '@/server/catalog';
import { ProductCard } from '@/components/store/ProductCard';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('nav.wishlist'), robots: { index: false } };
}

export default async function WishlistPage() {
  const { t, locale } = await getT();
  const user = await getSessionUser();
  const ids = user ? (await prisma.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { productId: true } })).map((r) => r.productId) : [];
  const items = ids.length ? await cardsByIds(ids, locale) : [];
  return (
    <div className="container-x py-8 md:py-10">
      <h1 className="mb-6 text-4xl md:text-5xl">{t('wishlist.title')}</h1>
      {!user ? (
        <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center shadow-card">
          <p className="font-serif text-2xl">{t('wishlist.login_required')}</p>
          <Link href="/login?next=/wishlist" className="btn-primary mt-5">{t('nav.login')}</Link>
        </div>
      ) : items.length === 0 ? (
        <div className="mx-auto max-w-md rounded-card bg-white p-10 text-center shadow-card">
          <p className="font-serif text-2xl">{t('wishlist.empty')}</p>
          <p className="mt-2 text-sm text-taupe">{t('wishlist.empty_text')}</p>
          <Link href="/shop" className="btn-primary mt-5">{t('cart.empty_cta')}</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>
      )}
    </div>
  );
}
