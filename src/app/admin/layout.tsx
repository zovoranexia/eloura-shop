import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { getDictionary, getFallbackDictionary, getLocale } from '@/lib/i18n';
import { I18nProvider } from '@/components/I18nProvider';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · Eloura Chic' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Admin frame. Signed-in staff get the sidebar shell; everyone else gets the bare children (the login page).
 * Each page additionally enforces its permission through requirePagePermission() and the API checks every call again.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const locale = await getLocale();
  const shell = user?.isStaff
    ? { id: user.id, name: user.name, email: user.email, roles: user.roles, permissions: user.permissions }
    : null;
  return (
    <I18nProvider locale={locale} dict={getDictionary(locale, { admin: true })} fallback={getFallbackDictionary({ admin: true })}>
      {shell ? <AdminShell user={shell}>{children}</AdminShell> : children}
    </I18nProvider>
  );
}
