/**
 * In-memory sliding-window rate limiter (Edge-safe).
 * For multi-instance production, add Upstash or similar; this still caps abuse per instance.
 */
const buckets = new Map<string, number[]>();

function prune(ts: number[], now: number, windowMs: number) {
  return ts.filter((t) => now - t < windowMs);
}

export type TakeTokenResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * @returns ok: true if request is allowed; ok: false if rate limited.
 */
export function takeToken(key: string, max: number, windowMs: number): TakeTokenResult {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const windowed = prune(prev, now, windowMs);
  if (windowed.length >= max) {
    const oldest = windowed[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(key, windowed);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  windowed.push(now);
  buckets.set(key, windowed);
  return { ok: true };
}
