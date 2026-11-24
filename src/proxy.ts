import { NextResponse, type NextRequest } from 'next/server';

const CSRF_COOKIE = 'ec_csrf';
const SESSION_COOKIE = 'ec_session';

/**
 * 1. Issues the CSRF double-submit cookie (readable by JS so the client can echo it in `x-csrf-token`).
 * 2. Coarse gate for /admin (Next 16 "proxy", formerly middleware): no session cookie -> login page. Real authorisation (JWT + permissions) happens server-side in
 *    the admin layout / pages and in every API route; this just avoids rendering admin shells for anonymous visitors.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !req.cookies.get(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), {
      path: '/', sameSite: 'lax', httpOnly: false, secure: (process.env.APP_URL || '').startsWith('https://'),
    });
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.png|images/|media/).*)'] };
