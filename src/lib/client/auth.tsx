'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { PublicUser } from './types';

type AuthCtx = {
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: { name: string; email: string; phone?: string; password: string }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
};
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: PublicUser | null; children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(initialUser);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ user: PublicUser }>('/api/auth/login', { body: { email, password } });
    setUser(r.user);
    router.refresh();
    return r.user;
  }, [router]);

  const register = useCallback(async (input: { name: string; email: string; phone?: string; password: string }) => {
    const r = await api<{ user: PublicUser }>('/api/auth/register', { body: input });
    setUser(r.user);
    router.refresh();
    return r.user;
  }, [router]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ user, login, register, logout, setUser }), [user, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
