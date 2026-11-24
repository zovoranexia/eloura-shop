import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from '@/lib/auth';

/**
 * Server-side page guard. Anonymous / non-staff visitors go to the login page; staff lacking the permission go to /admin/forbidden.
 * `perms` = ALL required; use `{ any: [...] }` when any one of several permissions is enough.
 */
export async function requirePagePermission(perms: string | string[] | { any: string[] }): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !user.isStaff) redirect('/admin/login');
  const have = new Set(user.permissions);
  const ok = typeof perms === 'string' ? have.has(perms) : Array.isArray(perms) ? perms.every((p) => have.has(p)) : perms.any.some((p) => have.has(p));
  if (!ok) redirect('/admin/forbidden');
  return user;
}

export const userCan = (user: SessionUser, perm: string) => user.permissions.includes(perm);
