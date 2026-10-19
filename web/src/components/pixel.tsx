import type { CSSProperties } from 'react';
import { type Art, personaBadge, personaOrbit, wordmark } from '@/lib/art';

export function Pixel({ art, style, label }: { art: Art; style?: CSSProperties; label?: string }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${art.cols}, ${art.p}px)`, gridAutoRows: `${art.p}px`, ...style }}
    >
      {art.rows.flat().map((bg, i) => <div key={i} style={{ background: bg }} />)}
    </div>
  );
}

const SPARKLES: [number, number, number][] = [[1, 5, 0.3], [29, 2, 1.4], [30, 27, 0.8], [3, 29, 2.0]]; // grid x, y, delay (s)

/**
 * Persona badge v2. `orbit` adds the hero treatment: a dashed ring and four twinkling sparkles in the
 * persona color around the badge (box grows from 24p to 34p). Motion stops under prefers-reduced-motion.
 */
export function PersonaBadge({ id, p, label, orbit = false, float = false }: { id: string; p: number; label: string; orbit?: boolean; float?: boolean }) {
  const sh = Math.max(1, Math.round(p * 0.75));
  const img = <Pixel art={personaBadge(id, p)} label={label} style={{ filter: `drop-shadow(${sh}px ${sh}px 0 #050A24)` }} />;
  const floating = float ? <div style={{ animation: 'gwFloat 3600ms ease-in-out 900ms infinite' }}>{img}</div> : img;
  if (!orbit) return floating;
  return (
    <div style={{ position: 'relative', width: 34 * p, height: 34 * p, flex: 'none' }}>
      {personaOrbit(id).map((r, i) => (
        <div key={i} aria-hidden style={{ position: 'absolute', left: r.x * p, top: r.y * p, width: r.w * p, height: p, background: r.color, opacity: r.opacity }} />
      ))}
      {SPARKLES.map(([x, y, d], i) => (
        <div key={`s${i}`} aria-hidden style={{ position: 'absolute', left: x * p, top: y * p, width: 3 * p, height: 3 * p, animation: `gwTwinkle ${2.4 + d}s ease-in-out ${d}s infinite` }}>
          <div style={{ position: 'absolute', left: p, top: 0, width: p, height: 3 * p, background: '#F4F6FF' }} />
          <div style={{ position: 'absolute', left: 0, top: p, width: 3 * p, height: p, background: '#F4F6FF' }} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 5 * p, top: 5 * p }}>{floating}</div>
    </div>
  );
}

/** "GNO WRAPPED" pixel wordmark with an offset drop shadow. */
export function Wordmark({ p, twoLines = false }: { p: number; twoLines?: boolean }) {
  const sh = Math.max(1, Math.round(p / 2));
  return (
    <div role="img" aria-label="Gno Wrapped" style={{ display: 'flex', flexDirection: 'column', gap: twoLines ? p * 2 : 0, filter: `drop-shadow(${sh}px ${sh}px 0 #1A2A78)` }}>
      {wordmark(p, { twoLines }).map((line, li) => (
        <div key={li} style={{ display: 'flex', gap: p }}>
          {line.map((L, i) => <Pixel key={i} art={L} />)}
        </div>
      ))}
    </div>
  );
}

export function Pill({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: '#1F6BFF', color: '#FFFFFF', fontFamily: "'Silkscreen', monospace", fontSize: 12, letterSpacing: '0.04em', ...style }}>
      {children}
    </span>
  );
}
