import type { ReactNode } from 'react';

// /personas and /personas/<id>, with the @modal slot: a persona opened from the list shows over it.
export default function Layout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
