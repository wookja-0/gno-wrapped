import { badgeSvg } from '@/lib/badgeSvg';
import { FIXTURES_ENABLED, getFixture, getShared } from '@/lib/data';
import { limited, limits } from '@/lib/rateLimit';
import { isEmpty, validate } from '@/lib/wrapped';

const SHARE_ID = /^[0-9a-z]{12}$/;

/** The README badge for a share link (see lib/badgeSvg.ts). */
export async function GET(req: Request, { params }: RouteContext<'/[season]/s/[id]/badge.svg'>) {
  const tooMany = limited(req, limits.badge);
  if (tooMany) return tooMany;
  const { season, id } = await params;
  const fixture = FIXTURES_ENABLED ? new URL(req.url).searchParams.get('fixture') : null;
  if (!fixture && !SHARE_ID.test(id)) return new Response('invalid share id', { status: 400 });
  const d = fixture ? await getFixture(fixture, true) : await getShared(season, id);
  if (isEmpty(d)) return new Response('no recap', { status: 404 });
  if (validate(d!).length) return new Response('invalid data', { status: 422 });
  // GitHub's image proxy caches it too; the recap changes slowly enough for an hour.
  return new Response(badgeSvg(d!), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
