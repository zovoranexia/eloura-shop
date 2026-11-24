import { AppError } from './errors';

// In-memory sliding-window limiter (one Node process). For multi-instance deployments swap the Map for Redis.
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) if (!b.hits.length || now - b.hits[b.hits.length - 1] > 15 * 60_000) buckets.delete(k);
  }
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    buckets.set(key, b);
    throw new AppError(429, 'RATE_LIMITED', { retryAfterMs: windowMs - (now - b.hits[0]) });
  }
  b.hits.push(now);
  buckets.set(key, b);
}
