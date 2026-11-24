'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { useStoreConfig } from './store-config';
import { isLine, type CartItem, type Quote } from './types';

const KEY = 'ec_cart';
const COUPON_KEY = 'ec_coupon';
const MAX_LINES = 30; // same limit as the API schemas

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
  /** Re-run the server quote (e.g. when a page that shows stock opens, or after a failed checkout). */
  refresh: () => void;
};
const Ctx = createContext<CartCtx | null>(null);

/** localStorage is user-editable / may hold a foreign or older shape: keep only positive integer ids, clamp qty to 1..max, drop duplicates. */
function readLocal(max: number): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Map<number, number>();
    for (const i of raw) {
      if (!Number.isInteger(i?.variantId) || i.variantId < 1 || i.variantId > 2_147_483_647 || !Number.isInteger(i?.qty) || i.qty < 1) continue;
      seen.set(i.variantId, Math.min((seen.get(i.variantId) ?? 0) + i.qty, max));
    }
    return [...seen].slice(0, MAX_LINES).map(([variantId, qty]) => ({ variantId, qty }));
  } catch { return []; }
}

function merge(a: CartItem[], b: CartItem[], max: number): CartItem[] {
  const m = new Map<number, number>();
  for (const i of [...a, ...b]) m.set(i.variantId, Math.min((m.get(i.variantId) ?? 0) + i.qty, max));
  return [...m].slice(0, MAX_LINES).map(([variantId, qty]) => ({ variantId, qty }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { commerce } = useStoreConfig();
  const max = Math.max(1, Math.min(commerce.maxQtyPerLine, 50));
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState('');
  const [ready, setReady] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tick, setTick] = useState(0);
  /** id of the user whose server cart has been merged into the local one (the server copy is only written after that merge) */
  const syncedFor = useRef<number | null>(null);
  const [syncedUser, setSyncedUser] = useState<number | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    setItems(readLocal(max));
    try { setCoupon((localStorage.getItem(COUPON_KEY) || '').slice(0, 40)); } catch { /* storage unavailable */ }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // another tab changed the basket / coupon
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(readLocal(max));
      else if (e.key === COUPON_KEY) setCoupon((e.newValue || '').slice(0, 40));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [max]);

  // signed in: merge the guest cart with the server cart once per user; signed out: do not leave the previous account's basket behind
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      if (syncedFor.current !== null) { syncedFor.current = null; setSyncedUser(null); setItems([]); }
      return;
    }
    if (syncedFor.current === user.id) return;
    const uid = user.id;
    syncedFor.current = uid;
    api<{ items: CartItem[] }>('/api/cart')
      .then((r) => {
        if (syncedFor.current !== uid) return;
        setItems((cur) => merge(r.items, cur, max));
        setSyncedUser(uid);
      })
      .catch(() => { /* keep the local cart; never overwrite the server copy we could not read */ });
  }, [ready, user, max]);

  // persist locally + (debounced) to the server once the server cart has been merged
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
    if (!user || syncedUser !== user.id) return;
    const h = setTimeout(() => { api('/api/cart', { method: 'PUT', body: { items } }).catch(() => undefined); }, 600);
    return () => clearTimeout(h);
  }, [items, ready, user, syncedUser]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(COUPON_KEY, coupon); } catch { /* ignore */ }
  }, [coupon, ready]);

  // server-side quote: prices, stock and discounts always come from the server
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!ready) return;
    if (!items.length) { setQuote(null); setQuoting(false); return; }
    const ctrl = new AbortController();
    setQuoting(true);
    const h = setTimeout(async () => {
      try {
        const q = await api<Quote>('/api/cart/quote', { body: { items, coupon: coupon || undefined }, signal: ctrl.signal });
        if (ctrl.signal.aborted) return; // a newer request owns the state now (out-of-order protection)
        setQuote(q);
        // drop lines that no longer exist / are inactive, clamp quantities to available stock (and to the per-line maximum)
        const have = new Map(items.map((i) => [i.variantId, i.qty]));
        const fix: CartItem[] = [];
        for (const l of q.lines) {
          if (!isLine(l) || !l.available) continue;
          fix.push({ variantId: l.variantId, qty: l.stock > 0 ? Math.min(l.qty, l.stock) : l.qty });
        }
        if (fix.length !== items.length || fix.some((f) => have.get(f.variantId) !== f.qty)) setItems(fix);
      } catch {
        if (ctrl.signal.aborted) return;
        /* offline or rejected: keep the previous quote */
      }
      setQuoting(false);
    }, 250);
    return () => { clearTimeout(h); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, coupon, ready, user?.id, tick]);

  const add = useCallback((variantId: number, qty = 1, opts?: { openDrawer?: boolean }) => {
    if (!Number.isInteger(variantId) || variantId < 1 || !Number.isFinite(qty) || qty < 1) return;
    const q = Math.floor(qty);
    setItems((cur) => {
      const found = cur.find((i) => i.variantId === variantId);
      if (found) return cur.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(i.qty + q, max) } : i));
      return [...cur, { variantId, qty: Math.min(q, max) }].slice(0, MAX_LINES);
    });
    if (opts?.openDrawer !== false) setDrawerOpen(true);
  }, [max]);
  const setQty = useCallback((variantId: number, qty: number) => {
    if (!Number.isFinite(qty)) return;
    const q = Math.floor(qty);
    setItems((cur) => (q <= 0 ? cur.filter((i) => i.variantId !== variantId) : cur.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(q, max) } : i))));
  }, [max]);
  const remove = useCallback((variantId: number) => setItems((cur) => cur.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => { setItems([]); setQuote(null); }, []);
  const applyCoupon = useCallback((code: string) => setCoupon(code.trim().toUpperCase()), []);
  const qtyOf = useCallback((variantId: number) => items.find((i) => i.variantId === variantId)?.qty ?? 0, [items]);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const value = useMemo<CartCtx>(() => ({
    items, count: items.reduce((s, i) => s + i.qty, 0), quote, quoting, ready, coupon, drawerOpen, setDrawerOpen, add, setQty, remove, clear, applyCoupon, qtyOf, refresh,
  }), [items, quote, quoting, ready, coupon, drawerOpen, add, setQty, remove, clear, applyCoupon, qtyOf, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside <CartProvider>');
  return c;
}
