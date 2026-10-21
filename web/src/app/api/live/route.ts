import { CONFIG } from '@/lib/config';
import { limited, limits } from '@/lib/rateLimit';

const API_URL = process.env.WRAPPED_API_URL ?? 'http://localhost:8080';

/** Live season counters for the intro ticker (the api itself isn't exposed to browsers). */
export async function GET(req: Request) {
  const tooMany = limited(req, limits.live);
  if (tooMany) return tooMany;
  try {
    const res = await fetch(`${API_URL}/v1/${CONFIG.CURRENT_SEASON.id}`, { cache: 'no-store' });
    if (!res.ok) return Response.json({ error: 'unavailable' }, { status: 503 });
    const m = (await res.json()) as { addresses: number; transactions: number; fetchedToHeight: number; updatedAt?: string; final?: boolean };
    return Response.json(
      { addresses: m.addresses, transactions: m.transactions, height: m.fetchedToHeight, updatedAt: m.updatedAt ?? null, final: !!m.final },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
}
