import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { PersonasView } from '@/components/PersonasView';
import { CONFIG } from '@/lib/config';
import { getPersonas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Personas · Gno Wrapped',
  description: 'How Gno Wrapped picks your season persona: eight personas, checked in order, from your on-chain activity.',
};

// Counts come from the live batch output via the api, so they're read at request time (the static
// shell only has the loading state), and an unreachable api shows "not available" instead of failing.
async function Personas() {
  await connection();
  const data = await getPersonas(CONFIG.CURRENT_SEASON.id).catch((e) => {
    console.error('[Gno Wrapped] personas unavailable', e);
    return null;
  });
  return <PersonasView data={data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PersonasView data={null} loading />}>
      <Personas />
    </Suspense>
  );
}
