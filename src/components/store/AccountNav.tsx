'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LogOut, MapPin, Package, User, LayoutDashboard } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useAuth } from '@/lib/client/auth';

export function AccountNav() {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const items = [
    { href: '/account', label: t('account.nav_profile'), icon: <User size={16} /> },
    { href: '/account/orders', label: t('account.nav_orders'), icon: <Package size={16} /> },
    { href: '/account/addresses', label: t('account.nav_addresses'), icon: <MapPin size={16} /> },
    { href: '/wishlist', label: t('nav.wishlist'), icon: <Heart size={16} /> },
  ];
  return (
    <nav aria-label={t('nav.account')} className="rounded-card bg-white p-3 shadow-card">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={path === i.href ? 'page' : undefined} className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium ${path === i.href ? 'bg-mauve-soft text-mauve' : 'hover:bg-cream-deep'}`}>{i.icon}{i.label}</Link>
          </li>
        ))}
        {user?.isStaff ? <li><Link href="/admin" className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium hover:bg-cream-deep"><LayoutDashboard size={16} />{t('account.nav_admin')}</Link></li> : null}
        <li><button type="button" onClick={async () => { await logout(); router.push('/'); }} className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium text-taupe hover:bg-cream-deep"><LogOut size={16} />{t('nav.logout')}</button></li>
      </ul>
    </nav>
  );
}
