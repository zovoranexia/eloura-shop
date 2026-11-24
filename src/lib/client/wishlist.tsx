'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, errorMessage } from './api';
import { useAuth } from './auth';
import { useT } from '@/components/I18nProvider';
import { useToast } from '@/components/ui/Toast';

type Ctx = { ids: Set<number>; has: (id: number) => boolean; toggle: (id: number) => Promise<void> };
const WishCtx = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const toast = useToast();
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    let live = true;
    api<{ ids: number[] }>('/api/account/wishlist').then((r) => { if (live) setIds(new Set(r.ids)); }).catch(() => undefined);
    return () => { live = false; };
  }, [user]);

  const toggle = useCallback(async (id: number) => {
    if (!user) {
      toast.error(t('wishlist.login_required'));
      router.push(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    const had = ids.has(id);
    setIds((s) => { const n = new Set(s); if (had) n.delete(id); else n.add(id); return n; });
    try {
      await api(`/api/account/wishlist/${id}`, { method: had ? 'DELETE' : 'PUT' });
      if (!had) toast.success(t('wishlist.added'));
      router.refresh();
    } catch (e) {
      setIds((s) => { const n = new Set(s); if (had) n.add(id); else n.delete(id); return n; });
      toast.error(errorMessage(t, e));
    }
  }, [user, ids, router, pathname, t, toast]);

  const value = useMemo(() => ({ ids, has: (id: number) => ids.has(id), toggle }), [ids, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist(): Ctx {
  const c = useContext(WishCtx);
  if (!c) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return c;
}
