'use client';

import type { ReactNode } from 'react';
import { useCopy } from './useLocale';
import { useHydrated } from './useReducedMotion';
import { Footer, Nav, Starfield } from './web';

/** The frame of a plain page (stars, top bar, footer) for server-rendered content. */
export function PageShell({ children, className = 'gw-main gw-personas' }: { children: ReactNode; className?: string }) {
  const hydrated = useHydrated();
  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav />
      <main className={className}>{children}</main>
      <Footer />
    </div>
  );
}

export function PersonasUnavailable() {
  const c = useCopy();
  return <p className="gw-lede">{c.personasUnavailable}</p>;
}
