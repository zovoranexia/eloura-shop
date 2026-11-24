'use client';

export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
  /** field -> error code map for 422 VALIDATION responses */
  get fields(): Record<string, string> {
    return this.code === 'VALIDATION' && this.details ? (this.details as Record<string, string>) : {};
  }
}

const readCookie = (name: string) => (typeof document === 'undefined' ? '' : (document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1] ?? ''));

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; form?: FormData; token?: string; signal?: AbortSignal };

/**
 * Calls our JSON API. Adds the CSRF double-submit header, sends cookies, throws ApiError(code) on failure.
 * Pass `form` for multipart uploads (do NOT set Content-Type yourself).
 */
export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET');
  const headers: Record<string, string> = {};
  if (method !== 'GET') headers['x-csrf-token'] = decodeURIComponent(readCookie('ec_csrf'));
  if (opts.token) headers['x-order-token'] = opts.token;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, credentials: 'same-origin', signal: opts.signal });
  } catch {
    throw new ApiError(0, 'NETWORK');
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; details?: Record<string, unknown> } } | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.details);
  }
  return data as T;
}

/** Human message for an ApiError using the `errors.*` dictionary. */
export function errorMessage(t: (k: string, v?: Record<string, string | number>) => string, e: unknown): string {
  if (e instanceof ApiError) {
    const key = `errors.${e.code}`;
    const msg = t(key, { max: Number(e.details?.max ?? 0) / 100, min: Number(e.details?.min ?? 0) / 100 });
    return msg === key ? t('errors.INTERNAL') : msg;
  }
  return t('errors.INTERNAL');
}

/** Message for a field-level error code (REQUIRED, too_small, ...). Falls back to the generic invalid-field text. */
export function fieldMessage(t: (k: string) => string, code?: string): string | undefined {
  if (!code) return undefined;
  const key = `errors.field.${code}`;
  const msg = t(key);
  return msg === key ? t('errors.field.INVALID') : msg;
}
