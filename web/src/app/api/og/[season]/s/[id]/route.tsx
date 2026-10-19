import { FIXTURES_ENABLED, getFixture, getShared } from '@/lib/data';
import { ogResponse } from '@/lib/ogResponse';

const SHARE_ID = /^[0-9a-z]{12}$/;

export async function GET(req: Request, { params }: RouteContext<'/api/og/[season]/s/[id]'>) {
  const { season, id } = await params;
  const fixture = FIXTURES_ENABLED ? new URL(req.url).searchParams.get('fixture') : null;
  if (!fixture && !SHARE_ID.test(id)) return new Response('invalid share id', { status: 400 });
  return ogResponse(fixture ? await getFixture(fixture, true) : await getShared(season, id));
}
