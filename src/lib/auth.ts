import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { env } from './env';
import { ALL_PERMISSIONS } from './rbac';
import { forbidden, unauthorized } from './errors';

export const SESSION_COOKIE = 'ec_session';
export const CSRF_COOKIE = 'ec_csrf';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  locale: string;
  roles: { key: string; name: string }[];
  roleKeys: string[];
  permissions: string[];
  isStaff: boolean;
  codBlocked: boolean;
};

/* ------------------------------------------------------------------ passwords */
const COST = 12;
export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
/** 8-128 chars with at least one letter and one digit. */
export const passwordOk = (p: unknown): p is string =>
  typeof p === 'string' && p.length >= 8 && p.length <= 128 && /[A-Za-z]/.test(p) && /\d/.test(p);
// Pre-computed hash used to keep login timing constant for unknown e-mails.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-0', COST);

/* ------------------------------------------------------------------ JWT session (HTTP-only cookie) */
const key = () => new TextEncoder().encode(env.authSecret);
const CUSTOMER_TTL = 60 * 60 * 24 * 14; // 14 days
const STAFF_TTL = 60 * 60 * 12; //         staff sessions are shorter: 12 hours

export async function signSession(userId: number, tokenVersion: number, staff: boolean) {
  const ttl = staff ? STAFF_TTL : CUSTOMER_TTL;
  const token = await new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key());
  return { token, ttl };
}

const cookieSecure = () => env.appUrl.startsWith('https://');

export async function startSession(userId: number, tokenVersion: number, staff: boolean) {
  const { token, ttl } = await signSession(userId, tokenVersion, staff);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: cookieSecure(), path: '/', maxAge: ttl });
}
export async function endSession() {
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: cookieSecure(), path: '/', maxAge: 0 });
}

/** The signed-in user for this request (null when anonymous / token revoked / account disabled). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    return await loadUser(id, Number(payload.tv));
  } catch {
    return null;
  }
});

export async function loadUser(id: number, tokenVersion?: number): Promise<SessionUser | null> {
  const u = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: { include: { permissions: true } } } } },
  });
  if (!u || !u.isActive) return null;
  if (tokenVersion !== undefined && u.tokenVersion !== tokenVersion) return null; // revoked
  const roleKeys = u.roles.map((r) => r.role.key);
  const permissions = roleKeys.includes('SUPER_ADMIN')
    ? [...ALL_PERMISSIONS]
    : [...new Set(u.roles.flatMap((r) => r.role.permissions.map((p) => p.permissionKey)))];
  return {
    id: u.id, email: u.email, name: u.name, phone: u.phone, locale: u.locale,
    roles: u.roles.map((r) => ({ key: r.role.key, name: r.role.name })), roleKeys, permissions,
    isStaff: permissions.length > 0, codBlocked: u.codBlocked,
  };
}

export const can = (user: SessionUser | null, perm: string) => !!user && user.permissions.includes(perm);

export function assertPerm(user: SessionUser | null, ...perms: string[]) {
  if (!user) throw unauthorized();
  if (!perms.every((p) => user.permissions.includes(p))) throw forbidden();
}
export function assertAnyPerm(user: SessionUser | null, ...perms: string[]) {
  if (!user) throw unauthorized();
  if (!perms.some((p) => user.permissions.includes(p))) throw forbidden();
}

export const publicUser = (u: SessionUser | null) =>
  u ? { id: u.id, email: u.email, name: u.name, phone: u.phone, locale: u.locale, roles: u.roles, permissions: u.permissions, isStaff: u.isStaff, codBlocked: u.codBlocked } : null;

/** Revoke all JWTs of a user (password reset, role change, deactivation). */
export const revokeSessions = (userId: number) => prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
