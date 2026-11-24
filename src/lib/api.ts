import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError, forbidden, notFound, unauthorized, unprocessable } from './errors';
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
  /** Multipart body (uploads). Requires Content-Length and caps it at ~6 MB so a client cannot stream unbounded data into memory. */
  form: () => Promise<FormData>;
  /** Parse + validate the JSON body (max 1 MB, enforced while streaming, also for chunked bodies). */
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
const MAX_JSON_BYTES = 1_000_000;
const MAX_FORM_BYTES = 6 * 1024 * 1024; // 5 MB file + form overhead

/** Reads the request body but aborts as soon as `max` bytes are exceeded (works without a Content-Length header). */
async function readBodyCapped(req: NextRequest, max: number): Promise<Uint8Array> {
  if (Number(req.headers.get('content-length') || 0) > max) throw new AppError(413, 'PAYLOAD_TOO_LARGE');
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel().catch(() => undefined); throw new AppError(413, 'PAYLOAD_TOO_LARGE'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

/** Double-submit CSRF token + Origin check for state-changing requests. */
async function checkCsrf(req: NextRequest) {
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
  const cookie = (await cookies()).get(CSRF_COOKIE)?.value;
  if (!header || !cookie || header !== cookie) throw forbidden('CSRF');
}

export function route<P = Record<string, string>>(opts: Opts, handler: (ctx: Ctx<P>) => Promise<unknown> | unknown) {
  return async (req: NextRequest, extra: { params: Promise<P> }): Promise<Response> => {
    try {
      const params = ((await extra?.params) ?? {}) as P;
      const ip = clientIp(req);
      if (opts.limit) rateLimit(`${opts.limit[0]}:${ip}`, opts.limit[1], opts.limit[2]);
      if (!opts.noCsrf && MUTATING.has(req.method)) await checkCsrf(req);

      // Numeric path ids must be plain digits ("abc", "1.5", "1e3" are 404, never silently coerced).
      for (const k of ['id', 'productId']) {
        const v = (params as Record<string, string | string[] | undefined>)[k];
        if (v !== undefined && !(typeof v === 'string' && /^\d{1,10}$/.test(v))) throw notFound();
      }

      const user = await getSessionUser();
      if (opts.auth || opts.perm || opts.anyPerm) {
        if (!user) throw unauthorized();
        const perms = opts.perm ? (Array.isArray(opts.perm) ? opts.perm : [opts.perm]) : [];
        if (perms.some((p) => !user.permissions.includes(p))) throw forbidden();
        if (opts.anyPerm && !opts.anyPerm.some((p) => user.permissions.includes(p))) throw forbidden();
      }

      const ctx: Ctx<P> = {
        req, params, user, ip, userAgent: (req.headers.get('user-agent') || '').slice(0, 255), locale: await getLocale(),
        async body<S extends ZodTypeAny>(schema: S): Promise<z.output<S>> {
          let raw: unknown;
          try { raw = JSON.parse(new TextDecoder().decode(await readBodyCapped(req, MAX_JSON_BYTES))); } catch (e) {
            if (e instanceof AppError) throw e;
            throw new AppError(400, 'BAD_JSON');
          }
          return parseWith(schema, raw);
        },
        async form() {
          const len = Number(req.headers.get('content-length'));
          if (!Number.isFinite(len) || len <= 0 || len > MAX_FORM_BYTES) throw new AppError(413, 'PAYLOAD_TOO_LARGE');
          try { return await req.formData(); } catch { throw new AppError(400, 'BAD_FORM'); }
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
  if (e instanceof Prisma.PrismaClientValidationError) return NextResponse.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 });
  console.error('[api] unhandled error', e);
  return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
}
