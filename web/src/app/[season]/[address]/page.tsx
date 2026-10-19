import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/StatusScreens';
import { WrappedPage } from '@/components/WrappedPage';
import { FIXTURES_ENABLED, getDataAsOf, getFixture, getWrapped } from '@/lib/data';
import { ADDRESS_RE, isEmpty } from '@/lib/wrapped';

type Props = PageProps<'/[season]/[address]'>;

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

async function load({ params, searchParams }: Props) {
  const { season, address: raw } = await params;
  const address = raw.toLowerCase();
  const fixture = FIXTURES_ENABLED ? one((await searchParams).fixture) : undefined;
  if (!fixture && !ADDRESS_RE.test(address)) notFound();
  const data = fixture ? await getFixture(fixture) : await getWrapped(season, address);
  return { season, address, fixture, data };
}

const ogImage = (season: string, address: string, fixture?: string) => `/api/og/${season}/${address}${fixture ? `?fixture=${fixture}` : ''}`;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { season, address, fixture, data } = await load(props);
  if (isEmpty(data)) return { title: 'Gno Wrapped' };
  const title = `${data!.persona?.title ?? 'My season'} · Gno Wrapped`;
  const image = ogImage(season, address, fixture);
  return {
    title,
    robots: { index: false }, // personal recaps stay out of search results
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function Page(props: Props) {
  const { season, address, fixture, data } = await load(props);
  if (isEmpty(data)) {
    return <EmptyState address={address} dataAsOf={await getDataAsOf(season)} seasonLabel={`Season ${season.replace(/^s/i, '')}`} />;
  }
  // Preview the card a share link shows (its own OG route, no address), not this page's.
  const q = fixture ? `?fixture=${fixture}` : '';
  const ogSrc = data!.shareId ? `/api/og/${season}/s/${data!.shareId}${q}` : ogImage(season, address, fixture);
  return <WrappedPage data={data!} ogSrc={ogSrc} key={fixture ?? address} />;
}
