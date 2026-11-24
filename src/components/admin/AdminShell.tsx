'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3, Boxes, ClipboardList, CreditCard, FileText, Globe, History, Image as ImageIcon, KeyRound, LayoutDashboard, LogOut, Mail, Menu, MessageSquare,
  Package, Settings, ShieldCheck, Star, Tag, Truck, Users, Wallet, X, UserCog, Banknote, Newspaper, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { AdminUserProvider, type AdminUserInfo } from './AdminUser';
import { api } from '@/lib/client/api';
import { LOCALES, LOCALE_NAME, type Locale } from '@/lib/i18n-shared';
import { cn } from '@/lib/client/cn';

type Item = { href: string; icon: LucideIcon; key: string; perms: string[] }; // `perms`: ANY of
type Group = { key: string; items: Item[] };

const GROUPS: Group[] = [
  { key: 'overview', items: [{ href: '/admin', icon: LayoutDashboard, key: 'dashboard', perms: ['dashboard.view'] }] },
  {
    key: 'sales', items: [
      { href: '/admin/orders', icon: ClipboardList, key: 'orders', perms: ['orders.view'] },
      { href: '/admin/payments', icon: CreditCard, key: 'payments', perms: ['payments.view'] },
      { href: '/admin/cod', icon: Banknote, key: 'cod', perms: ['cod.reconcile'] },
      { href: '/admin/customers', icon: Users, key: 'customers', perms: ['customers.view'] },
    ],
  },
  {
    key: 'catalogue', items: [
      { href: '/admin/products', icon: Package, key: 'products', perms: ['products.view'] },
      { href: '/admin/categories', icon: Boxes, key: 'categories', perms: ['categories.manage'] },
      { href: '/admin/inventory', icon: Wallet, key: 'inventory', perms: ['inventory.update', 'products.view'] },
      { href: '/admin/coupons', icon: Tag, key: 'coupons', perms: ['coupons.manage'] },
      { href: '/admin/reviews', icon: Star, key: 'reviews', perms: ['reviews.moderate'] },
    ],
  },
  {
    key: 'storefront', items: [
      { href: '/admin/banners', icon: ImageIcon, key: 'banners', perms: ['banners.manage'] },
      { href: '/admin/pages', icon: FileText, key: 'pages', perms: ['cms.manage'] },
      { href: '/admin/inquiries', icon: MessageSquare, key: 'inquiries', perms: ['inquiries.manage'] },
      { href: '/admin/newsletter', icon: Newspaper, key: 'newsletter', perms: ['banners.manage', 'reports.export'] },
    ],
  },
  {
    key: 'settings', items: [
      { href: '/admin/zones', icon: Truck, key: 'zones', perms: ['zones.manage'] },
      { href: '/admin/payment-methods', icon: CreditCard, key: 'paymentMethods', perms: ['settings.manage'] },
      { href: '/admin/settings', icon: Settings, key: 'settings', perms: ['settings.manage'] },
      { href: '/admin/reports', icon: BarChart3, key: 'reports', perms: ['reports.view', 'reports.export'] },
    ],
  },
  {
    key: 'access', items: [
      { href: '/admin/staff', icon: UserCog, key: 'staff', perms: ['staff.manage'] },
      { href: '/admin/roles', icon: KeyRound, key: 'roles', perms: ['roles.manage', 'staff.manage'] },
      { href: '/admin/audit', icon: History, key: 'audit', perms: ['audit.view'] },
    ],
  },
];

export function AdminShell({ user, children }: { user: AdminUserInfo; children: ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const have = new Set(user.permissions);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.perms.some((p) => have.has(p))) })).filter((g) => g.items.length);
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));

  async function setLocale(l: Locale) {
    await api('/api/locale', { body: { locale: l } });
    router.refresh();
  }
  async function logout() {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{t(`admin.nav.groups.${g.key}`)}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={active(i.href) ? 'page' : undefined}
                  className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors', active(i.href) ? 'bg-white/15 font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
                  <i.icon size={17} aria-hidden /> {t(`admin.nav.${i.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex flex-col items-center gap-1 px-4 pb-3 pt-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/logo-wordmark-light.png" alt="Eloura Chic" className="h-14 w-auto" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">{t('admin.nav.badge')}</span>
    </Link>
  );

  return (
    <AdminUserProvider user={user}>
      <div className="min-h-screen lg:flex">
        <aside className="no-print hidden w-64 shrink-0 flex-col bg-espresso lg:sticky lg:top-0 lg:flex lg:h-screen">{brand}{nav}</aside>

        {open && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-espresso/60" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-espresso shadow-soft">
              <button type="button" className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10" onClick={() => setOpen(false)} aria-label={t('common.close')}><X size={18} /></button>
              {brand}{nav}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-cream-line bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
            <button type="button" className="rounded-full p-2 text-espresso hover:bg-cream-deep lg:hidden" onClick={() => setOpen(true)} aria-label={t('admin.nav.menu')}><Menu size={20} /></button>
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-xs text-taupe">
              <Globe size={15} aria-hidden /><span className="sr-only">{t('common.language')}</span>
              <select className="rounded-full border border-cream-line bg-white py-1 pl-2 pr-6 text-xs font-semibold text-espresso" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAME[l]}</option>)}
              </select>
            </label>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-taupe"><ShieldCheck size={11} className="text-gold" />{user.roles.map((r) => r.name).join(', ')}</p>
            </div>
            <Link href="/" target="_blank" className="btn-ghost btn-sm hidden md:inline-flex"><Mail size={14} /> {t('admin.nav.viewStore')}</Link>
            <button type="button" className="btn-outline btn-sm" onClick={logout}><LogOut size={14} /> {t('admin.nav.logout')}</button>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AdminUserProvider>
  );
}
