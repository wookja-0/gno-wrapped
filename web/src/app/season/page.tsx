import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { SeasonView } from '@/components/SeasonView';
import { CONFIG } from '@/lib/config';
import { getSeasonData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'The season · Gno Wrapped',
  description: 'Mainnet Season 1 for all of gno.land: addresses, transactions, busiest days and the most-used realms.',
};

// Live batch output via the api, read at request time (the static shell only has the loading state).
async function Season() {
  await connection();
  const data = await getSeasonData(CONFIG.CURRENT_SEASON.id).catch((e) => {
    console.error('[Gno Wrapped] season unavailable', e);
    return null;
  });
  return <SeasonView data={data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<SeasonView data={null} loading />}>
      <Season />
    </Suspense>
  );
}
