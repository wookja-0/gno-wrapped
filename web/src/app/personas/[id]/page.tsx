import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PERSONA_IDS } from '@/lib/art';
import { PERSONA_TITLES } from '@/lib/wrapped';
import { PageShell } from '@/components/PageShell';
import { PersonaDetailLoader } from '@/components/PersonaDetailLoader';

// /personas/<id> as its own page: a shared link, a reload, or a link from outside /personas.
type Props = PageProps<'/personas/[id]'>;

export function generateStaticParams() {
  return PERSONA_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const title = PERSONA_TITLES[id];
  return title ? { title: `${title} · Gno Wrapped`, description: `The ${title} persona on Gno Wrapped: its rule, and how the addresses with it spent Mainnet Season 1.` } : {};
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!PERSONA_IDS.includes(id)) notFound();
  return (
    <PageShell>
      <Suspense fallback={null}>
        <PersonaDetailLoader id={id} />
      </Suspense>
    </PageShell>
  );
}
