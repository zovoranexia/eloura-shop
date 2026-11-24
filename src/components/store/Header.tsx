'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, User, X, PackageSearch } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import { useAuth } from '@/lib/client/auth';
import { useCart } from '@/lib/client/cart';
import { useWishlist } from '@/lib/client/wishlist';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV = [
  { href: '/', key: 'nav.home' },
  { href: '/shop', key: 'nav.shop' },
  { href: '/categories', key: 'nav.categories' },
  { href: '/page/about', key: 'nav.about' },
  { href: '/contact', key: 'nav.contact' },
] as const;

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-mauve px-1 text-[10px] font-bold text-white">{n > 99 ? '99+' : n}</span>;
}

export function Header() {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { count, ready, setDrawerOpen } = useCart();
  const wish = useWishlist();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  function search(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  }

  const searchForm = (id: string, cls: string) => (
    <form onSubmit={search} role="search" className={cls}>
      <label htmlFor={id} className="sr-only">{t('nav.search_label')}</label>
      <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.search_placeholder')} className="w-full bg-transparent text-sm outline-none placeholder:text-taupe/70" maxLength={80} />
      <button type="submit" aria-label={t('common.search')} className="text-taupe hover:text-mauve"><Search size={18} /></button>
    </form>
  );

  return (
    <header className="no-print sticky top-0 z-50 bg-white/95 shadow-[0_1px_0_#E8DDD4] backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[90] focus:rounded-full focus:bg-mauve focus:px-4 focus:py-2 focus:text-white">{t('nav.skip')}</a>
      <div className="container-x flex h-[76px] items-center gap-4 lg:gap-8">
        <Logo />
        <nav aria-label={t('nav.main')} className="hidden items-center gap-7 xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined}
              className={`relative whitespace-nowrap py-2 text-sm font-medium transition-colors hover:text-mauve ${active(n.href) ? 'text-mauve after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-mauve' : 'text-espresso'}`}>
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {searchForm('hdr-search', 'hidden h-10 w-[200px] items-center gap-2 rounded-full border border-cream-line bg-cream px-4 md:flex xl:w-[270px]')}
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Link href={user ? '/account' : '/login'} aria-label={user ? t('nav.account') : t('nav.login')} className="relative grid h-10 w-10 place-items-center rounded-full text-espresso hover:bg-cream-deep"><User size={21} /></Link>
          <Link href="/wishlist" aria-label={t('nav.wishlist')} className="relative hidden h-10 w-10 place-items-center rounded-full text-espresso hover:bg-cream-deep sm:grid">
            <Heart size={21} /><Badge n={wish.ids.size} />
          </Link>
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label={`${t('nav.cart')}${ready && count ? ` (${count})` : ''}`} className="relative grid h-10 w-10 place-items-center rounded-full text-espresso hover:bg-cream-deep">
            <ShoppingBag size={21} /><Badge n={ready ? count : 0} />
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-nav" aria-label={t('nav.menu')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream-deep xl:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-cream-line bg-white xl:hidden">
          <div className="container-x space-y-4 py-4">
            {searchForm('hdr-search-m', 'flex h-11 items-center gap-2 rounded-full border border-cream-line bg-cream px-4 md:hidden')}
            <nav aria-label={t('nav.main')} className="grid gap-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`rounded-xl px-3 py-2.5 text-sm font-medium ${active(n.href) ? 'bg-mauve-soft text-mauve' : 'hover:bg-cream-deep'}`}>{t(n.key)}</Link>
              ))}
              <Link href="/wishlist" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-cream-deep">{t('nav.wishlist')} {wish.ids.size ? `(${wish.ids.size})` : ''}</Link>
              <Link href="/track" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-cream-deep"><PackageSearch size={16} />{t('nav.track')}</Link>
              {!user ? <Link href="/register" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-cream-deep">{t('nav.register')}</Link> : null}
            </nav>
            <LanguageSwitcher className="sm:hidden" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
