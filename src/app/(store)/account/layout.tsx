import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { AccountNav } from '@/components/store/AccountNav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');
  const { t } = await getT();
  return (
    <div className="container-x py-8 md:py-10">
      <p className="eyebrow">{t('nav.account')}</p>
      <h1 className="mb-6 mt-2 text-4xl md:text-5xl">{t('account.hello', { name: user.name.split(' ')[0] })}</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[250px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
