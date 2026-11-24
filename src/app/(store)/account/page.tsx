import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { ProfileForm, PasswordForm } from '@/components/store/ProfileForms';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t('nav.account'), robots: { index: false } };
}

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}
