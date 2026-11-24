/** Only same-site relative paths are accepted as post-login redirects (prevents open redirects). */
export const safeNext = (n: string | null | undefined, fallback = '/account') => (n && /^\/(?!\/)[\w\-/?=&%.#]*$/.test(n) ? n : fallback);
