'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

/**
 * A card that flips to show its back: click, tap, Enter or Space. A drag that tilts the front (Tilt)
 * doesn't count as a tap. Under reduced motion it flips without turning (globals.css).
 */
export function Flip({ front, back, label }: { front: ReactNode; back: ReactNode; label: string }) {
  const [flipped, setFlipped] = useState(false);
  const from = useRef<[number, number] | null>(null);
  const down = (e: PointerEvent) => { from.current = [e.clientX, e.clientY]; };
  const up = (e: PointerEvent) => {
    const f = from.current;
    from.current = null;
    if (f && Math.hypot(e.clientX - f[0], e.clientY - f[1]) < 8) setFlipped((x) => !x);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setFlipped((x) => !x);
  };
  return (
    <div className="gw-flip" role="button" tabIndex={0} aria-pressed={flipped} aria-label={label} onPointerDown={down} onPointerUp={up} onKeyDown={key}>
      <div className="gw-flip-inner" data-flipped={flipped || undefined}>
        <div className="gw-flip-front" aria-hidden={flipped || undefined}>{front}</div>
        <div className="gw-flip-back" aria-hidden={!flipped || undefined}>{back}</div>
      </div>
    </div>
  );
}
