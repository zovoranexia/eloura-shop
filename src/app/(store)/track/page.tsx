import type { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { TrackForm } from '@/components/store/TrackForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('track.title'), robots: { index: false } };
}

export default async function TrackPage() {
  const { t } = await getT();
  const user = await getSessionUser();
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-lg rounded-card bg-white p-8 shadow-card">
        <p className="eyebrow">{t('nav.track')}</p>
        <h1 className="mt-2 text-4xl">{t('track.title')}</h1>
        <p className="mb-6 mt-2 text-sm text-taupe">{t('track.subtitle')}</p>
        <TrackForm />
        <p className="mt-6 text-center text-sm text-taupe">
          {user ? <Link href="/account/orders" className="font-semibold text-mauve underline">{t('track.my_orders')}</Link> : <>{t('track.or_login')} <Link href="/login?next=/account/orders" className="font-semibold text-mauve underline">{t('nav.login')}</Link></>}
        </p>
      </div>
    </div>
  );
}
