import { FIXTURES_ENABLED, getDay, getFixtureDay } from '@/lib/data';
import { ADDRESS_RE } from '@/lib/wrapped';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The recap calendar's day list, fetched when a day is clicked (the api itself isn't exposed to browsers). */
export async function GET(req: Request, { params }: RouteContext<'/api/day/[season]/[address]/[date]'>) {
  const { season, address: raw, date } = await params;
  const address = raw.toLowerCase();
  if (!/^s\d+$/.test(season) || !ADDRESS_RE.test(address) || !DATE_RE.test(date)) {
    return Response.json({ error: 'invalid season, address or date' }, { status: 400 });
  }
  const fixture = FIXTURES_ENABLED ? new URL(req.url).searchParams.get('fixture') : null;
  try {
    const txs = fixture ? await getFixtureDay(fixture, date) : await getDay(season, address, date);
    return Response.json(txs, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
}
