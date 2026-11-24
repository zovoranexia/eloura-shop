import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { redirect } from 'next/navigation';

export default async function ForbiddenPage() {
  const user = await getSessionUser();
  if (!user || !user.isStaff) redirect('/admin/login');
  const { t } = getT({ admin: true });
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <ShieldAlert className="mx-auto text-mauve" size={44} />
      <h1 className="mt-4 text-4xl font-medium">{t('admin.forbidden.title')}</h1>
      <p className="mt-2 text-taupe">{t('admin.forbidden.text')}</p>
      <Link href="/admin" className="btn-primary mt-6">{t('admin.forbidden.back')}</Link>
    </div>
  );
}
