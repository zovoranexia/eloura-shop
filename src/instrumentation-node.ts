/**
 * Node.js-only start-up work (kept out of instrumentation.ts so the edge bundle never sees sharp / prisma).
 * Starts the background job that cancels unpaid orders whose payment deadline expired (stock and coupon usage are released).
 * Single-process: for several app instances move this to a cron.
 */
export async function startJobs() {
  // Fail fast on a missing / weak AUTH_SECRET in production instead of failing on the first login.
  const { env } = await import('@/lib/env');
  void env.authSecret;

  const g = globalThis as unknown as { __ecExpiry?: boolean };
  if (g.__ecExpiry) return;
  g.__ecExpiry = true;

  const { expireStaleOrders } = await import('@/server/orders');
  const run = async () => {
    try {
      const n = await expireStaleOrders();
      if (n) console.log(`[jobs] cancelled ${n} unpaid order(s) past their payment deadline`);
    } catch (e) {
      console.error('[jobs] expiry failed', e);
    }
  };
  setTimeout(run, 30_000).unref?.();
  setInterval(run, 5 * 60_000).unref?.();
}
