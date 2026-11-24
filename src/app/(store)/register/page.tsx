import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { getSessionUser } from '@/lib/auth';
import { RegisterForm } from '@/components/store/AuthForms';
import { safeNext } from '@/lib/client/safe-next';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('auth.register_title'), robots: { index: false } };
}

export default async function RegisterPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  const { t } = await getT();
  if (await getSessionUser()) redirect(safeNext(searchParams.next));
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-md rounded-card bg-white p-8 shadow-card">
        <h1 className="text-4xl">{t('auth.register_title')}</h1>
        <p className="mb-6 mt-2 text-sm text-taupe">{t('auth.register_subtitle')}</p>
        <RegisterForm next={searchParams.next} />
      </div>
    </div>
  );
}
