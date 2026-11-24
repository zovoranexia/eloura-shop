import { getLocale } from '@/lib/i18n';
import { getSessionUser, publicUser } from '@/lib/auth';
import { getStoreConfig } from '@/server/storefront';
import { StoreConfigProvider } from '@/lib/client/store-config';
import { AuthProvider } from '@/lib/client/auth';
import { CartProvider } from '@/lib/client/cart';
import { WishlistProvider } from '@/lib/client/wishlist';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const [user, config] = await Promise.all([getSessionUser(), getStoreConfig(locale)]);
  return (
    <StoreConfigProvider config={config}>
      <AuthProvider initialUser={publicUser(user)}>
        <CartProvider>
          <WishlistProvider>
            <Header />
            <main id="main" className="min-h-[60vh]">{children}</main>
            <Footer store={config.store} />
            <CartDrawer />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </StoreConfigProvider>
  );
}
