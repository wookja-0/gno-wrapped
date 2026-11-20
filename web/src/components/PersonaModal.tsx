'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCopy } from './useLocale';

/**
 * /personas/<id> opened from /personas: the persona over the list, as a modal <dialog> (a bottom sheet
 * on phones). Closing it (×, Esc, a click outside) goes back, so the URL returns to /personas; the
 * same URL loaded directly is the full page instead (app/personas/[id]).
 */
export function PersonaModal({ children }: { children: ReactNode }) {
  const c = useCopy();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden'; // the list behind doesn't scroll
    return () => { html.style.overflow = overflow; };
  }, []);
  const close = () => router.back();
  return (
    <dialog
      ref={ref}
      className="gw-persona-modal"
      aria-labelledby="gw-pd-title" // the persona's name, once PersonaDetail is in
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }} // the backdrop
    >
      <div className="gw-persona-modal-body">
        <button type="button" className="gw-visit-close gw-persona-modal-close" onClick={close} aria-label={c.dismiss}>×</button>
        {children}
      </div>
    </dialog>
  );
}
