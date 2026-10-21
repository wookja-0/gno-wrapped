'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { achievementIcon } from '@/lib/art';
import { personaIn } from '@/lib/i18n';
import { ACHIEVEMENT_ORDER, CAL_COLORS, fmt, storyIds, TIMING, weekLevel, xIntentUrl, type StoryId, type WrappedData } from '@/lib/wrapped';
import { XIcon } from './BrandIcons';
import { useClock } from './HourlyChart';
import { PersonaBadge, Pill, Pixel, Wordmark } from './pixel';
import { useCopy } from './useLocale';
import { PathText } from './web';

/**
 * Story mode: the recap as full-screen vertical cards, Spotify Wrapped style. Tap the right side for
 * the next card and the left for the previous, hold to pause, swipe, or use ←/→/Space and Esc. Each
 * card advances by itself after TIMING.slideMs; the last one stays. Progress runs on a timer (not a
 * CSS animation), so it keeps working under prefers-reduced-motion, where animations are cut short.
 */
export function StoryMode({ data, onClose }: { data: WrappedData; onClose: () => void }) {
  const c = useCopy();
  const ids = storyIds(data);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0); // 0–1 of the current card
  const [paused, setPaused] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0); // ms into the current card, kept across a pause
  const press = useRef<{ x: number; y: number; at: number; held: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const last = ids.length - 1;

  const go = useCallback((n: number) => { elapsed.current = 0; setI(Math.min(last, Math.max(0, n))); setProgress(0); }, [last]);

  // the timer: advance unless paused or on the last card
  useEffect(() => {
    if (paused || i === last) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - prev;
      prev = now;
      const p = elapsed.current / TIMING.slideMs;
      if (p >= 1) return go(i + 1);
      setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, paused, last, go]);

  // modal: focus in, no page scroll behind, focus back on close
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; before?.focus?.(); };
  }, []);

  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowRight' || (e.key === ' ' && !(e.target as HTMLElement).closest('a,button'))) { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  };
  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    const p = { x: e.clientX, y: e.clientY, at: Date.now(), held: false } as NonNullable<typeof press.current>;
    p.timer = setTimeout(() => { p.held = true; setPaused(true); }, TIMING.holdToPauseMs);
    press.current = p;
  };
  const up = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.held) { setPaused(false); return; } // a hold pauses; letting go resumes, without moving
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.abs(dx) >= TIMING.swipeMinPx && Math.abs(dx) > Math.abs(dy)) return go(dx < 0 ? i + 1 : i - 1);
    if (-dy >= TIMING.swipeUpMinPx) return go(i + 1);
    if (Math.hypot(dx, dy) > TIMING.tapMaxMovePx) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    go(e.clientX - rect.left < rect.width / 3 ? i - 1 : i + 1);
  };

  return (
    <div
      ref={dialog}
      className="gw-story"
      role="dialog"
      aria-modal="true"
      aria-label={c.story.label}
      tabIndex={-1}
      onKeyDown={key}
    >
      <div className="gw-story-card" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { press.current = null; setPaused(false); }}>
        <div className="gw-story-bars" aria-hidden="true">
          {ids.map((id, n) => (
            <span key={id}><i style={{ width: `${(n < i ? 1 : n === i ? (i === last ? 1 : progress) : 0) * 100}%` }} /></span>
          ))}
        </div>
        <div className="gw-story-top">
          <span className="gw-pixel-label" aria-live="polite">{i + 1} / {ids.length}{paused ? c.story.paused : ''}</span>
          <button type="button" className="gw-story-close" onClick={onClose} aria-label={c.story.close}>×</button>
        </div>
        <div className="gw-story-body" key={ids[i]}>
          <Slide id={ids[i]} data={data} />
        </div>
        <p className="gw-story-hint" aria-hidden="true">{c.story.hint}</p>
      </div>
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <>
      <div className="gw-story-num">{value}</div>
      <p className="gw-story-label">{label}</p>
    </>
  );
}

function Slide({ id, data: d }: { id: StoryId; data: WrappedData }) {
  const c = useCopy();
  const s = c.story, sh = !!d.shared;
  const persona = personaIn(c, d.persona)!;
  const clock = useClock(d);
  const slides: Record<StoryId, () => ReactNode> = {
    intro: () => (
      <>
        <div className="gw-story-mark"><Wordmark p={6} twoLines /></div>
        <h2 className="gw-story-title">{s.introTitle(sh, d.season)}</h2>
        <p className="gw-story-line">{s.introLine}</p>
      </>
    ),
    arrival: () => (
      <>
        <Pill>ARRIVAL</Pill>
        <p className="gw-story-kicker">{s.arrived(sh, d.firstTx!.date)}</p>
        <Big value={c.statDay(d.firstTx!.mainnetDay)} label={d.firstTx!.mainnetDay === 1 ? s.dayOne : s.ofMainnet} />
        {c.arrivalText(d) && <p className="gw-story-line">{c.arrivalText(d)}</p>}
      </>
    ),
    activity: () => (
      <>
        <Pill>ACTIVITY</Pill>
        <p className="gw-story-kicker">{s.sent(sh)}</p>
        <Big value={fmt(d.txCount)} label={c.txPlural(d.txCount)} />
        <Parts className="gw-story-line" parts={s.moreActive(d.percentile)} />
      </>
    ),
    calendar: () => (
      <>
        <Pill>CALENDAR</Pill>
        <p className="gw-story-kicker">{s.showedUp(sh)}</p>
        <Big value={fmt(d.calendar!.activeDays)} label={s.dayPlural(d.calendar!.activeDays)} />
        <Parts className="gw-story-line" parts={s.streak(d.calendar!.longestStreak)} />
        <WeekBars d={d} />
      </>
    ),
    clock: () => (
      <>
        <Pill>CLOCK</Pill>
        <p className="gw-story-kicker">{s.byTheClock}</p>
        <h2 className="gw-story-persona">{clock.type && c.chronotype(clock.type.id)}</h2>
        {clock.type && <p className="gw-story-line">{c.chronotypeLine(clock.type)}</p>}
        <p className="gw-story-sub">{s.clockSub(clock.peak, clock.tz)}</p>
      </>
    ),
    realm: () => {
      const top = d.topRealms[0];
      return (
        <>
          <Pill>TOP REALM</Pill>
          <p className="gw-story-kicker">{s.topRealm(sh)}</p>
          <PathText path={top.path} max={30} narrowMax={24} className="gw-story-path" />
          <Big value={fmt(top.calls)} label={s.callsMostly(top.calls, top.topFunc)} />
          {c.realmOrderLine(top) && <p className="gw-story-line">{c.realmOrderLine(top)}</p>}
        </>
      );
    },
    defi: () => (
      <>
        <Pill>DEFI</Pill>
        <p className="gw-story-kicker">{s.onGnoSwap(sh)}</p>
        <Big value={fmt(d.swaps?.count ?? 0)} label={s.swapPlural(d.swaps?.count ?? 0)} />
        {c.topPairText(d) && <p className="gw-story-line">{c.favoritePair}<strong>{c.topPairText(d)}</strong></p>}
      </>
    ),
    builder: () => (
      <>
        <Pill>BUILDER</Pill>
        <p className="gw-story-kicker">{s.deployed(sh)}</p>
        <Big value={fmt(d.deployedRealms.length)} label={c.realmPlural(d.deployedRealms.length)} />
        {s.builderLine(d) && <p className="gw-story-line">{s.builderLine(d)}</p>}
      </>
    ),
    governance: () => (
      <>
        <Pill>GOVERNANCE</Pill>
        <p className="gw-story-kicker">{s.hadSay(sh)}</p>
        <ul className="gw-story-list">
          {c.governanceLines(d).map((l) => <li key={l.label}><strong>{l.value}</strong> {l.label}</li>)}
        </ul>
      </>
    ),
    achievements: () => (
      <>
        <Pill>ACHIEVEMENTS</Pill>
        <p className="gw-story-kicker">{s.unlocked(sh)}</p>
        <ul className="gw-story-ach">
          {ACHIEVEMENT_ORDER.filter((a) => d.achievements!.some((x) => x.id === a)).map((a) => (
            <li key={a}><Pixel art={achievementIcon(a, 4)} />{c.achievement(a).title}</li>
          ))}
        </ul>
      </>
    ),
    persona: () => (
      <>
        <p className="gw-story-kicker">{s.persona(sh)}</p>
        <PersonaBadge id={d.persona!.id} p={6} label={c.badge(persona.title)} />
        <h2 className="gw-story-persona">{persona.title}</h2>
        <p className="gw-story-line">{persona.line}</p>
        {!d.shared && <p className="gw-story-sub">{c.personaWhy(d)}</p>}
        {c.personaRankText(d) && <p className="gw-story-sub">{c.personaRankText(d)}</p>}
      </>
    ),
    outro: () => (
      <>
        <h2 className="gw-story-title">{s.outro(sh, d.season, !!d.final)}</h2>
        {d.shared ? (
          <Link className="gw-btn gw-btn-primary gw-btn-lg" href="/">{c.unwrapOwn}</Link>
        ) : (
          <a className="gw-btn gw-btn-x gw-btn-lg" href={xIntentUrl(d, c.sharePost)} target="_blank" rel="noopener"><XIcon size={18} /> {c.shareToX}</a>
        )}
      </>
    ),
  };
  return <>{slides[id]()}</>;
}

function Parts({ parts: [pre, strong, post], className }: { parts: readonly [string, string, string]; className: string }) {
  return <p className={className}>{pre}<strong>{strong}</strong>{post}</p>;
}

function WeekBars({ d }: { d: WrappedData }) {
  const daily = d.calendar?.daily;
  const weeks = d.calendar?.weeks ?? (daily ? Array.from({ length: Math.ceil(daily.length / 7) }, (_, w) => daily.slice(w * 7, w * 7 + 7).filter((x) => x > 0).length) : []);
  return (
    <div className="gw-story-weeks" aria-hidden="true">
      {weeks.map((w, k) => <i key={k} style={{ background: CAL_COLORS[weekLevel(w)] }} />)}
    </div>
  );
}
