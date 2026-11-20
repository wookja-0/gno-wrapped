import { connection } from 'next/server';
import { CONFIG } from '@/lib/config';
import { getPersonasOrFixture } from '@/lib/data';
import { PersonaDetail } from './PersonaDetail';
import { PersonasUnavailable } from './PageShell';

/** Reads /personas data at request time (it follows the live batch) and renders one persona. */
export async function PersonaDetailLoader({ id, modal = false }: { id: string; modal?: boolean }) {
  await connection();
  const data = await getPersonasOrFixture(CONFIG.CURRENT_SEASON.id).catch((e) => {
    console.error('[Gno Wrapped] personas unavailable', e);
    return null;
  });
  return data ? <PersonaDetail data={data} id={id} modal={modal} /> : <PersonasUnavailable />;
}
