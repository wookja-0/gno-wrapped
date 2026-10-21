import { FIXTURES_ENABLED, getFixture, getWrapped } from '@/lib/data';
import { ogResponse } from '@/lib/ogResponse';
import { ADDRESS_RE } from '@/lib/wrapped';

export async function GET(req: Request, { params }: RouteContext<'/api/og/[season]/[address]'>) {
  const { season, address: raw } = await params;
  const address = raw.toLowerCase();
  const fixture = FIXTURES_ENABLED ? new URL(req.url).searchParams.get('fixture') : null;
  if (!fixture && !ADDRESS_RE.test(address)) return new Response('invalid address', { status: 400 });
  return ogResponse(fixture ? await getFixture(fixture) : await getWrapped(season, address), req);
}
