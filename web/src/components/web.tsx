'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { pageStars, planetRows } from '@/lib/art';
import { easeOutCubic, TIMING, truncMid } from '@/lib/wrapped';
import { CONFIG } from '@/lib/config';
import { GitHubIcon } from './BrandIcons';
import { EcosystemLinks } from './EcosystemLinks';
import { LangToggle } from './LangToggle';
import { useCopy } from './useLocale';
import { Wordmark } from './pixel';
import { useNarrow, useReducedMotion } from './useReducedMotion';

/** Fixed starfield behind the page. Stars are faint so they never read as punctuation. */
export function Starfield() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className="gw-stars">
      {pageStars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: s.c, opacity: s.o,
          animation: reduced || !s.twinkle ? 'none' : `gwTwinkle ${s.t}s ease-in-out ${s.d}s infinite`,
        }} />
      ))}
    </div>
  );
}

const PLANET = planetRows({ R: 2000, cx: 600, top: 0, bottom: 120, step: 10, bands: [[1, '#6D97FF'], [3, '#2E5BD8'], [6, '#2650C4'], [9, '#2045AE']], last: '#1A3A97' });

/** Pixel planet across the page footer (scales with the viewport width). */
export function Planet() {
  return (
    <svg aria-hidden="true" className="gw-planet" viewBox="0 0 1200 120" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
      {PLANET.map((r, i) => (
        <g key={i}>
          <rect x={r.left} y={r.top} width={r.w} height={10} fill={r.c} />
          <rect x={r.left} y={r.top} width={10} height={10} fill={r.rim} />
          <rect x={r.left + r.w - 10} y={r.top} width={10} height={10} fill={r.shade} />
        </g>
      ))}
    </svg>
  );
}

export const EXT = ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'];

/** Link that opens another site (Gnoscan, GnoSwap) in a new tab. */
export function ExtLink({ href, children, className = 'gw-ext', label }: { href: string; children?: ReactNode; className?: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label} title={label}>
      {children}<Icon d={EXT} size={14} />
    </a>
  );
}

export function Nav({ short, onShare, explorer }: { short?: string; onShare?: () => void; explorer?: string }) {
  const c = useCopy();
  return (
    <header className="gw-nav">
      <Link href="/" aria-label={c.home} style={{ display: 'flex' }}><Wordmark p={3} /></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LangToggle />
        {short && <span className="gw-chip">{short}</span>}
        {explorer && <ExtLink href={explorer} className="gw-btn gw-btn-ghost gw-nav-ext"><span className="gw-nav-ext-text">{c.viewOnGnoscan}</span></ExtLink>}
        {onShare && (
          <button type="button" className="gw-btn gw-btn-ghost gw-nav-share" onClick={onShare} aria-label={c.share}>
            <Icon d={['M12 3v12', 'M7 8l5-5 5 5', 'M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5']} size={16} />
            <span className="gw-nav-share-text">{c.share}</span>
          </button>
        )}
      </div>
    </header>
  );
}

/** Hero number size by the final string's length, so it fits its card and never jumps while counting. */
export function heroFont(final: string): string {
  const n = final.length;
  return n <= 4 ? 'clamp(72px, 9vw, 128px)' : n <= 6 ? 'clamp(56px, 7vw, 104px)' : 'clamp(40px, 4.6vw, 72px)';
}

/** Calls back once when the element first scrolls into view. */
function useInView<T extends Element>(onEnter: () => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onEnter);
  useEffect(() => { cb.current = onEnter; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb.current(); }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/**
 * Scroll reveal: starts lowered and transparent, rises in once when it scrolls into view.
 * Hidden only when JS runs (html.gw-js, set before first paint); reduced motion shows it at once.
 * `delay` (ms) staggers siblings.
 */
export function Reveal({ children, className = '', style, delay = 0, as: Tag = 'div', label, id }: {
  children: ReactNode; className?: string; style?: CSSProperties; delay?: number; as?: 'div' | 'section' | 'li'; label?: string; id?: string;
}) {
  const [shown, setShown] = useState(false);
  const ref = useInView<HTMLElement>(() => setShown(true));
  return (
    <Tag ref={ref as never} id={id} aria-label={label} className={`gw-reveal ${shown ? 'gw-in' : ''} ${className}`} style={{ ['--d' as string]: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

export function Card({ children, className = '', style, label, delay }: { children: ReactNode; className?: string; style?: CSSProperties; label?: string; delay?: number }) {
  return <Reveal as="section" label={label} className={`gw-card ${className}`} style={style} delay={delay}>{children}</Reveal>;
}

/**
 * Number that counts up from 0 when it scrolls into view (250ms delay, 1300ms easeOutCubic).
 * Server and first client render show the final value; reduced motion never animates.
 */
export function CountUp({ value, format, style, className }: { value: number; format: (n: number) => string; style?: CSSProperties; className?: string }) {
  const final = format(value);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);
  const ref = useInView<HTMLSpanElement>(() => {
    if (reduced) return;
    const start = performance.now() + TIMING.countDelayMs;
    const step = (now: number) => {
      const x = Math.min(1, Math.max(0, (now - start) / TIMING.countMs));
      setShown(value * easeOutCubic(x));
      if (x < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums', ...(className?.includes('gw-hero-num') ? { fontSize: heroFont(final) } : {}), ...style }}>{shown === null ? final : format(shown)}</span>;
}

/** Path text that wraps only after '/' (never mid-segment unless one segment is wider than the box). */
export function SlashWrap({ text }: { text: string }) {
  const parts = text.split('/');
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <>/<wbr /></>}</span>)}</>;
}

/** Realm path: middle-truncated with a FULL/SHORT toggle when longer than `max` (`narrowMax` on phones). */
export function PathText({ path, max, narrowMax = max, className = '' }: { path: string; max: number; narrowMax?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const short = truncMid(path, useNarrow() ? narrowMax : max);
  if (!short) return <span className={`gw-path ${className}`}><SlashWrap text={path} /></span>;
  return (
    <button type="button" className={`gw-path gw-path-toggle ${className}`} aria-expanded={open} title={path} onClick={() => setOpen(!open)}>
      <span><SlashWrap text={open ? path : short} /></span>
      <span aria-hidden="true" className="gw-path-hint">{open ? 'SHORT' : 'FULL'}</span>
    </button>
  );
}

export function Icon({ d, size }: { d: string[]; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((p) => <path key={p} d={p} />)}
    </svg>
  );
}

export function DataErrorBanner({ errors }: { errors: string[] }) {
  return (
    <div role="alert" className="gw-data-error">
      <span className="gw-pixel-label" style={{ color: '#FF8A3D' }}>DATA ERROR</span>
      {errors.map((m) => <span key={m} className="gw-mono" style={{ color: '#FFE1CC', fontSize: 12 }}>{m}</span>)}
    </div>
  );
}

/** `final`: the season is over, so the data no longer changes. */
export function Footer({ dataAsOf, final, children }: { dataAsOf?: string | null; final?: boolean; children?: ReactNode }) {
  const c = useCopy();
  return (
    <footer className={children ? 'gw-footer gw-footer-action' : 'gw-footer'}>
      <div className="gw-footer-text">
        {children}
        <p>
          {dataAsOf ? c.dataAsOf(dataAsOf) : ''}{c.builtFrom} · {final ? c.finalResults : c.updatedLive} ·{' '}
          <a className="gw-source" href={CONFIG.REPO_URL} target="_blank" rel="noopener noreferrer"><GitHubIcon size={14} />{c.source}</a>
        </p>
        <EcosystemLinks />
      </div>
      <Planet />
    </footer>
  );
}
