'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';

type Params = Record<string, string | number | boolean | undefined | null>;

export function buildUrl(path: string, params: Params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/** GET a list/detail endpoint, re-fetching when the params change. `enabled=false` skips the request. */
export function useAdminData<T>(path: string, params: Params = {}, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const url = buildUrl(path, params);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const d = await api<T>(url);
      if (n === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (n === seq.current) setError(e);
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => { if (enabled) void load(); }, [load, enabled]);
  return { data, loading, error, reload: load, setData };
}

export type Paged<T> = { items: T[]; total: number; page: number; pages: number };
