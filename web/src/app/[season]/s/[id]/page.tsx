import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WrappedPage } from '@/components/WrappedPage';
import { FIXTURES_ENABLED, getFixture, getShared } from '@/lib/data';
import { isEmpty } from '@/lib/wrapped';

// A shared recap: reached by an unguessable share ID, served without any trace of the address.
type Props = PageProps<'/[season]/s/[id]'>;

const SHARE_ID = /^[0-9a-z]{12}$/;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

async function load({ params, searchParams }: Props) {
  const { season, id } = await params;
  const fixture = FIXTURES_ENABLED ? one((await searchParams).fixture) : undefined;
  if (!fixture && !SHARE_ID.test(id)) notFound();
  const data = fixture ? await getFixture(fixture, true) : await getShared(season, id);
  return { season, id, fixture, data };
}

const ogImage = (season: string, id: string, fixture?: string) => `/api/og/${season}/s/${id}${fixture ? `?fixture=${fixture}` : ''}`;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { season, id, fixture, data } = await load(props);
  if (isEmpty(data)) return { title: 'Gno Wrapped' };
  const title = `${data!.persona?.title ?? 'A season'} · Gno Wrapped`;
  const image = ogImage(season, id, fixture);
  return {
    title,
    robots: { index: false }, // personal recaps stay out of search results
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function Page(props: Props) {
  const { season, id, fixture, data } = await load(props);
  if (isEmpty(data)) notFound();
  return <WrappedPage data={data!} ogSrc={ogImage(season, id, fixture)} key={fixture ?? id} />;
}
