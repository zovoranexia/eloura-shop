import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError, forbidden, unauthorized, unprocessable } from './errors';
import { CSRF_COOKIE, getSessionUser, type SessionUser } from './auth';
import { env } from './env';
import { getLocale, type Locale } from './i18n';
import { rateLimit } from './ratelimit';

export type Ctx<P = Record<string, string>> = {
  req: NextRequest;
  params: P;
  user: SessionUser | null;
  ip: string;
  userAgent: string;
  locale: Locale;
  /** Parse + validate the JSON body (max 1 MB). */
  body: <S extends ZodTypeAny>(schema: S) => Promise<z.output<S>>;
  query: <S extends ZodTypeAny>(schema: S) => z.output<S>;
};

type Opts = {
  /** user must be signed in */
  auth?: boolean;
  /** user must hold ALL of these permissions */
  perm?: string | string[];
  /** user must hold ANY of these permissions */
  anyPerm?: string[];
  /** skip CSRF check (default: enforced for POST/PUT/PATCH/DELETE) */
  noCsrf?: boolean;
  /** per-IP rate limit: [bucket name, max requests, window ms] */
  limit?: [string, number, number];
};

export function clientIp(req: NextRequest): string {
  if (env.trustProxy) {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const real = req.headers.get('x-real-ip');
    if (real) return real.trim();
  }
  return 'direct';
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Double-submit CSRF token + Origin check for state-changing requests. */
function checkCsrf(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin) {
    let ok = false;
    try {
      const o = new URL(origin).host;
      const hosts = new Set([req.headers.get('host'), req.headers.get('x-forwarded-host'), new URL(env.appUrl).host]);
      ok = hosts.has(o);
    } catch { /* invalid origin */ }
    if (!ok) throw forbidden('BAD_ORIGIN');
  }
  const header = req.headers.get('x-csrf-token');
  const cookie = cookies().get(CSRF_COOKIE)?.value;
  if (!header || !cookie || header !== cookie) throw forbidden('CSRF');
}

export function route<P = Record<string, string>>(opts: Opts, handler: (ctx: Ctx<P>) => Promise<unknown> | unknown) {
  return async (req: NextRequest, extra: { params: P }): Promise<Response> => {
    try {
      const ip = clientIp(req);
      if (opts.limit) rateLimit(`${opts.limit[0]}:${ip}`, opts.limit[1], opts.limit[2]);
      if (!opts.noCsrf && MUTATING.has(req.method)) checkCsrf(req);

      const user = await getSessionUser();
      if (opts.auth || opts.perm || opts.anyPerm) {
        if (!user) throw unauthorized();
        const perms = opts.perm ? (Array.isArray(opts.perm) ? opts.perm : [opts.perm]) : [];
        if (perms.some((p) => !user.permissions.includes(p))) throw forbidden();
        if (opts.anyPerm && !opts.anyPerm.some((p) => user.permissions.includes(p))) throw forbidden();
      }

      const ctx: Ctx<P> = {
        req, params: extra?.params ?? ({} as P), user, ip, userAgent: (req.headers.get('user-agent') || '').slice(0, 255), locale: getLocale(),
        async body<S extends ZodTypeAny>(schema: S): Promise<z.output<S>> {
          const len = Number(req.headers.get('content-length') || 0);
          if (len > 1_000_000) throw new AppError(413, 'PAYLOAD_TOO_LARGE');
          let raw: unknown;
          try { raw = await req.json(); } catch { throw new AppError(400, 'BAD_JSON'); }
          return parseWith(schema, raw);
        },
        query<S extends ZodTypeAny>(schema: S): z.output<S> {
          return parseWith(schema, Object.fromEntries(req.nextUrl.searchParams));
        },
      };
      const out = await handler(ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      // Next.js control-flow signals (dynamic usage, redirect, not-found) must propagate, never become a 500 response.
      const digest = (e as { digest?: unknown } | null)?.digest;
      if (typeof digest === 'string' && (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_'))) throw e;
      return errorResponse(e);
    }
  };
}

export function parseWith<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw unprocessable('VALIDATION', zodFields(r.error));
}

/** Custom ALL_CAPS messages are stable codes; zod's default prose becomes its issue code (e.g. too_small). */
export function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const i of err.issues) fields[i.path.join('.') || '_'] = /^[A-Z][A-Z0-9_]+$/.test(i.message) ? i.message : i.code;
  return fields;
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    const headers: Record<string, string> = {};
    if (e.status === 429 && e.details && typeof e.details === 'object' && 'retryAfterMs' in e.details) {
      headers['Retry-After'] = String(Math.ceil(Number((e.details as { retryAfterMs: number }).retryAfterMs) / 1000));
    }
    return NextResponse.json({ error: { code: e.code, details: e.details } }, { status: e.status, headers });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return NextResponse.json({ error: { code: 'DUPLICATE', details: e.meta } }, { status: 409 });
    if (e.code === 'P2025') return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (e.code === 'P2003') return NextResponse.json({ error: { code: 'IN_USE' } }, { status: 409 });
  }
  console.error('[api] unhandled error', e);
  return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
}
