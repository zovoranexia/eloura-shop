'use client';
import { createContext, useContext, type ReactNode } from 'react';

export type AdminUserInfo = { id: number; name: string; email: string; roles: { key: string; name: string }[]; permissions: string[] };

const Ctx = createContext<AdminUserInfo | null>(null);

export function AdminUserProvider({ user, children }: { user: AdminUserInfo; children: ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

/** Current staff user + `can(permission)` for hiding buttons client-side (the API enforces permissions regardless). */
export function useAdminUser() {
  const u = useContext(Ctx);
  if (!u) throw new Error('useAdminUser must be used inside the admin shell');
  return { user: u, can: (p: string) => u.permissions.includes(p) };
}
