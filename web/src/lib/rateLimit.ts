import 'server-only';
import { createLimiter, type Limiter } from './limiter';

/**
 * Per-client request limits for the routes that cost the server something (rendering preview cards,
 * day lists, the live ticker). In memory and per process: the site runs one web container.
 */
// Caddy sets X-Forwarded-For to the client's address (it doesn't pass on one the client sent), and
// the web container is reachable only through Caddy.
const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

/** A 429 when the client is over the limit, else null. Off outside production (dev server, e2e tests). */
export function limited(req: Request, limiter: Limiter): Response | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const { ok, retryAfter } = limiter.hit(clientIp(req));
  return ok ? null : new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } });
}

export const limits = {
  og: createLimiter(30), // card renders (cache misses only) per minute
  day: createLimiter(60), // day lists per minute
  live: createLimiter(120), // the ticker polls every 5s, so 12 a minute per open tab
};
