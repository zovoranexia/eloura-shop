import { z } from 'zod';
import { cookies } from 'next/headers';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { LOCALES, LOCALE_COOKIE } from '@/lib/i18n-shared';
import { env } from '@/lib/env';

/** Persists the language in a cookie (and on the user profile when signed in). */
export const POST = route({}, async (ctx) => {
  const { locale } = await ctx.body(z.object({ locale: z.enum(LOCALES) }));
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: env.appUrl.startsWith('https://') });
  if (ctx.user) await prisma.user.update({ where: { id: ctx.user.id }, data: { locale } });
  return { ok: true, locale };
});
