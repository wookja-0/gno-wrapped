import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CombinedView } from '@/components/CombinedView';
import { EmptyState } from '@/components/StatusScreens';
import { FIXTURES_ENABLED, getFixture, getSeasonStatus, getWrapped } from '@/lib/data';
import { combine, isEmpty, parseAddresses, WALLETS_MAX, type Wallet } from '@/lib/wrapped';

// Several wallets added up: /<season>/wallets/<a>,<b>,… (see combine in lib/wrapped.ts).
type Props = PageProps<'/[season]/wallets/[list]'>;

export const metadata: Metadata = {
  title: 'Your wallets, together · Gno Wrapped',
  robots: { index: false },
};

export default async function Page({ params, searchParams }: Props) {
  const { season, list } = await params;
  const addresses = parseAddresses(decodeURIComponent(list));
  if (!addresses || addresses.length > WALLETS_MAX) notFound();
  if (addresses.length === 1) redirect(`/${season}/${addresses[0]}`);
  // Dev/test only: ?fixture=full,newcomer gives the i-th address the i-th fixture.
  const fixtures = FIXTURES_ENABLED ? (await searchParams).fixture : undefined;
  const names = typeof fixtures === 'string' ? fixtures.split(',') : null;
  const wallets: Wallet[] = await Promise.all(addresses.map(async (address, i): Promise<Wallet> => {
    const recap = names ? (names[i] ? await getFixture(names[i]) : null) : await getWrapped(season, address);
    return { address, recap: isEmpty(recap) ? null : { ...recap!, address } };
  }));
  if (!combine(wallets)) {
    return <EmptyState address={addresses[0]} {...await getSeasonStatus(season)} seasonLabel={`Season ${season.replace(/^s/i, '')}`} />;
  }
  return <CombinedView wallets={wallets} />;
}
