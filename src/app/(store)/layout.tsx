import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n';
import { getSessionUser, publicUser } from '@/lib/auth';
import { getStoreConfig, siteUrl } from '@/server/storefront';
import { StoreConfigProvider } from '@/lib/client/store-config';
import { AuthProvider } from '@/lib/client/auth';
import { CartProvider } from '@/lib/client/cart';
import { WishlistProvider } from '@/lib/client/wishlist';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';
import { BackToTop } from '@/components/store/BackToTop';

export const dynamic = 'force-dynamic';

// absolute base for relative og:image / canonical URLs (otherwise Next falls back to http://localhost:3000)
export const metadata: Metadata = { metadataBase: new URL(siteUrl()) };

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const [user, config] = await Promise.all([getSessionUser(), getStoreConfig(locale)]);
  return (
    <StoreConfigProvider config={config}>
      <AuthProvider initialUser={publicUser(user)}>
        <CartProvider>
          <WishlistProvider>
            <Header />
            <main id="main" tabIndex={-1} className="min-h-[60vh] focus:outline-none">{children}</main>
            <Footer store={config.store} paymentMethods={config.paymentLogos} />
            <CartDrawer />
            <BackToTop />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </StoreConfigProvider>
  );
}
