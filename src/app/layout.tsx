import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getDictionary, getFallbackDictionary, getLocale } from '@/lib/i18n';
import { I18nProvider } from '@/components/I18nProvider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: { default: 'Eloura Chic — Fashion & Accessories', template: '%s · Eloura Chic' },
  description: 'Eloura Chic: moda & asesóriu feminina iha Dili, Timor-Leste. Fashion & accessories boutique in Dili, Timor-Leste.',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  applicationName: 'Eloura Chic',
};
export const viewport: Viewport = { themeColor: '#7D4E57', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === 'tet' ? 'tet' : locale}>
      <body>
        <I18nProvider locale={locale} dict={getDictionary(locale)} fallback={getFallbackDictionary()}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
