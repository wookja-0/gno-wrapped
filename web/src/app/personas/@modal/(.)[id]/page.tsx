import { Suspense } from 'react';
import { PERSONA_IDS } from '@/lib/art';
import { PersonaDetailLoader } from '@/components/PersonaDetailLoader';
import { PersonaModal } from '@/components/PersonaModal';

// /personas/<id> opened from /personas (a client navigation): the persona as a modal over the list.
// Loaded directly, the same URL renders app/personas/[id] instead.
export function generateStaticParams() {
  return PERSONA_IDS.map((id) => ({ id }));
}

type Params = Promise<{ id: string }>;

// The modal opens at once; the params and the data are read inside Suspense, so the navigation from
// the list doesn't wait on them.
export default function Page({ params }: { params: Params }) {
  return (
    <PersonaModal>
      <Suspense fallback={null}>
        <Persona params={params} />
      </Suspense>
    </PersonaModal>
  );
}

async function Persona({ params }: { params: Params }) {
  const { id } = await params;
  return PERSONA_IDS.includes(id) ? <PersonaDetailLoader id={id} modal /> : null;
}
