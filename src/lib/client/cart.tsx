'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { useStoreConfig } from './store-config';
import { isLine, type CartItem, type Quote } from './types';

const KEY = 'ec_cart';
const COUPON_KEY = 'ec_coupon';

type CartCtx = {
  items: CartItem[];
  count: number;
  quote: Quote | null;
  quoting: boolean;
  ready: boolean;
  coupon: string;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  add: (variantId: number, qty?: number, opts?: { openDrawer?: boolean }) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  applyCoupon: (code: string) => void;
  qtyOf: (variantId: number) => number;
};
const Ctx = createContext<CartCtx | null>(null);

function readLocal(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((i) => Number.isInteger(i?.variantId) && Number.isInteger(i?.qty) && i.qty > 0).slice(0, 30);
  } catch { return []; }
}

function merge(a: CartItem[], b: CartItem[], max: number): CartItem[] {
  const m = new Map<number, number>();
  for (const i of [...a, ...b]) m.set(i.variantId, Math.min((m.get(i.variantId) ?? 0) + i.qty, max));
  return [...m].map(([variantId, qty]) => ({ variantId, qty }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { commerce } = useStoreConfig();
  const max = commerce.maxQtyPerLine;
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState('');
  const [ready, setReady] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const syncedFor = useRef<number | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    setItems(readLocal());
    try { setCoupon(localStorage.getItem(COUPON_KEY) || ''); } catch { /* storage unavailable */ }
    setReady(true);
  }, []);

  // signed in: merge the guest cart with the server cart once per user
  useEffect(() => {
    if (!ready) return;
    if (!user) { syncedFor.current = null; return; }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const r = await api<{ items: CartItem[] }>('/api/cart');
        setItems((cur) => merge(r.items, cur, max));
      } catch { /* keep local cart */ }
    })();
  }, [ready, user, max]);

  // persist locally + (debounced) to the server when signed in
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
    if (!user || syncedFor.current !== user.id) return;
    const h = setTimeout(() => { api('/api/cart', { method: 'PUT', body: { items } }).catch(() => undefined); }, 600);
    return () => clearTimeout(h);
  }, [items, ready, user]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(COUPON_KEY, coupon); } catch { /* ignore */ }
  }, [coupon, ready]);

  // server-side quote: prices, stock and discounts always come from the server
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!ready) return;
    if (!items.length) { setQuote(null); return; }
    const ctrl = new AbortController();
    setQuoting(true);
    const h = setTimeout(async () => {
      try {
        const q = await api<Quote>('/api/cart/quote', { body: { items, coupon: coupon || undefined }, signal: ctrl.signal });
        setQuote(q);
        // drop lines that no longer exist / are inactive, clamp quantities to available stock
        const fix: CartItem[] = [];
        let changed = false;
        for (const l of q.lines) {
          if (!isLine(l) || !l.available) { changed = true; continue; }
          const qty = l.stock > 0 ? Math.min(l.qty, l.stock) : l.qty;
          if (qty !== l.qty) changed = true;
          fix.push({ variantId: l.variantId, qty });
        }
        if (changed) setItems(fix);
      } catch { /* aborted or offline: keep previous quote */ }
      setQuoting(false);
    }, 250);
    return () => { clearTimeout(h); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, coupon, ready, user?.id]);

  const add = useCallback((variantId: number, qty = 1, opts?: { openDrawer?: boolean }) => {
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === variantId);
      if (found) return cur.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(i.qty + qty, max) } : i));
      return [...cur, { variantId, qty: Math.min(qty, max) }].slice(0, 30);
    });
    if (opts?.openDrawer !== false) setDrawerOpen(true);
  }, [max]);
  const setQty = useCallback((variantId: number, qty: number) => {
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.variantId !== variantId) : cur.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(qty, max) } : i))));
  }, [max]);
  const remove = useCallback((variantId: number) => setItems((cur) => cur.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => { setItems([]); setQuote(null); }, []);
  const applyCoupon = useCallback((code: string) => setCoupon(code.trim().toUpperCase()), []);
  const qtyOf = useCallback((variantId: number) => items.find((i) => i.variantId === variantId)?.qty ?? 0, [items]);

  const value = useMemo<CartCtx>(() => ({
    items, count: items.reduce((s, i) => s + i.qty, 0), quote, quoting, ready, coupon, drawerOpen, setDrawerOpen, add, setQty, remove, clear, applyCoupon, qtyOf,
  }), [items, quote, quoting, ready, coupon, drawerOpen, add, setQty, remove, clear, applyCoupon, qtyOf]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside <CartProvider>');
  return c;
}
