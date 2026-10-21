/** A fixed-window counter per key (kept apart from rateLimit.ts so it can be unit-tested). */
export interface Limiter { hit(key: string, now?: number): { ok: boolean; retryAfter: number } }

/** At most `max` hits per key in each `windowMs` window. */
export function createLimiter(max: number, windowMs = 60_000): Limiter {
  const windows = new Map<string, { n: number; reset: number }>();
  return {
    hit(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || now >= w.reset) {
        if (windows.size > 10_000) for (const [k, v] of windows) if (now >= v.reset) windows.delete(k); // drop expired windows
        w = { n: 0, reset: now + windowMs };
        windows.set(key, w);
      }
      w.n++;
      return { ok: w.n <= max, retryAfter: Math.ceil((w.reset - now) / 1000) };
    },
  };
}
