import Link from 'next/link';
import { getT } from '@/lib/i18n';

export default function NotFound() {
  const { t } = getT();
  return (
    <div className="container-x py-20 text-center">
      <p className="font-serif text-8xl text-gold">404</p>
      <h1 className="mt-2 text-4xl">{t('notfound.title')}</h1>
      <p className="mx-auto mt-3 max-w-md text-taupe">{t('notfound.text')}</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-primary">{t('nav.home')}</Link><Link href="/shop" className="btn-outline">{t('nav.shop')}</Link></div>
    </div>
  );
}
