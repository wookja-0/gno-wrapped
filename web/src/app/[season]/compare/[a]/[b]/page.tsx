import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompareView } from '@/components/CompareView';
import { FIXTURES_ENABLED, getFixtureByShareId, getShared } from '@/lib/data';
import { isEmpty } from '@/lib/wrapped';

// Two shared recaps side by side: share IDs only, so the page carries no address either.
type Props = PageProps<'/[season]/compare/[a]/[b]'>;

const SHARE_ID = /^[0-9a-z]{12}$/;

async function shared(season: string, id: string) {
  if (!SHARE_ID.test(id)) return null;
  return (FIXTURES_ENABLED ? await getFixtureByShareId(id) : null) ?? (await getShared(season, id));
}

export const metadata: Metadata = {
  title: 'Two recaps, side by side · Gno Wrapped',
  robots: { index: false },
};

export default async function Page({ params }: Props) {
  const { season, a, b } = await params;
  const [da, db] = await Promise.all([shared(season, a), shared(season, b)]);
  if (isEmpty(da) || isEmpty(db)) notFound();
  return <CompareView a={da!} b={db!} />;
}
