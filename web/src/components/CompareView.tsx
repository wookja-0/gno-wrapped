'use client';

import Link from 'next/link';
import { achievementIcon } from '@/lib/art';
import { seasonPill } from '@/lib/summary';
import { personaIn } from '@/lib/i18n';
import { ACHIEVEMENT_ORDER, CAL_COLORS, compareRows, weekLevel, type WrappedData } from '@/lib/wrapped';
import { CompareForm } from './CompareForm';
import { useCopy } from './useLocale';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { useHydrated } from './useReducedMotion';
import { Footer, Nav, Reveal, Starfield } from './web';

const SIDES = ['A', 'B'] as const;

/**
 * /<season>/compare/<a>/<b>: two shared recaps side by side. Both are share views, so nothing here
 * identifies either address. The larger number in each row (the earlier arrival day) is marked; the
 * mark is a ▲ and bold text, never color alone.
 */
export function CompareView({ a, b }: { a: WrappedData; b: WrappedData }) {
  const hydrated = useHydrated();
  const c = useCopy();
  const rows = compareRows(a, b);
  const both = [a, b];
  const season = a.season;
  const weeks = Math.max(a.calendar?.weeks?.length ?? 0, b.calendar?.weeks?.length ?? 0);

  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav />
      <main className="gw-main gw-personas">
        <Reveal><Pill>{seasonPill(season)}</Pill></Reveal>
        <Reveal delay={80}><h1 className="gw-h1">{c.compareTitle}</h1></Reveal>
        <Reveal delay={160}>
          <p className="gw-lede">{c.compareLede(season)}</p>
        </Reveal>

        <section className="gw-card gw-compare" aria-label={c.comparison} style={{ marginTop: 28 }}>
          <div className="gw-compare-heads">
            <span />
            {both.map((d, i) => { const p = personaIn(c, d.persona); return (
              <div key={SIDES[i]} className="gw-compare-head">
                <span className="gw-pixel-label gw-compare-side">{SIDES[i]}</span>
                <PersonaBadge id={d.persona?.id ?? ''} p={3} label={c.badge(p?.title ?? c.persona)} />
                <span className="gw-compare-persona">{p?.title}</span>
                <Link href={`/${season.id}/s/${d.shareId}`} className="gw-ext" style={{ margin: 0 }}>{c.openRecap}</Link>
              </div>
            ); })}
          </div>

          <table className="gw-compare-table">
            <caption className="gw-sr">{c.compareCaption}</caption>
            <thead><tr><th scope="col"><span className="gw-sr">{c.stat}</span></th><th scope="col">{SIDES[0]}</th><th scope="col">{SIDES[1]}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{c.compareLabel(r.label)}</th>
                  {(['a', 'b'] as const).map((s) => (
                    <td key={s} className={r.ahead === s ? 'gw-compare-ahead' : undefined}>
                      {r[s]}{r.ahead === s && <span className="gw-compare-mark" aria-label={c.ahead}> ▲</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {weeks > 0 && (
            <div className="gw-compare-weeks">
              <p className="gw-kicker" style={{ marginTop: 28 }}>{c.perWeek}</p>
              {both.map((d, i) => (
                <div key={SIDES[i]} className="gw-compare-weekrow">
                  <span className="gw-pixel-label gw-compare-side">{SIDES[i]}</span>
                  <div className="gw-compare-cells" role="img" aria-label={c.recapWeeks(SIDES[i], d.calendar?.weeks ?? [])}>
                    {Array.from({ length: weeks }, (_, w) => {
                      const days = d.calendar?.weeks?.[w] ?? 0;
                      return <i key={w} title={c.weekOf(c.week(w, season.start), days)} style={{ background: CAL_COLORS[weekLevel(days)] }} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="gw-kicker" style={{ marginTop: 28 }}>{c.achievementsTitle}</p>
          <div className="gw-compare-ach">
            {both.map((d, i) => {
              const ids = ACHIEVEMENT_ORDER.filter((id) => d.achievements?.some((x) => x.id === id));
              return (
                <div key={SIDES[i]}>
                  <span className="gw-pixel-label gw-compare-side">{SIDES[i]}</span>
                  {ids.length ? (
                    <ul>
                      {ids.map((id) => (
                        <li key={id}><Pixel art={achievementIcon(id, 3)} />{c.achievement(id).title}</li>
                      ))}
                    </ul>
                  ) : <p className="gw-hint">{c.noneYet}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="gw-card" aria-label={c.compareAnother} style={{ marginTop: 20 }}>
          <h2 className="gw-h3">{c.compareAnother}</h2>
          <p className="gw-hint">{c.compareAnotherHint}</p>
          <CompareForm season={season.id} pair={(other) => [a.shareId!, other]} />
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 28 }}>
          <Link href="/" className="gw-btn gw-btn-primary gw-btn-lg">{c.unwrapOwn}</Link>
        </div>
      </main>
      <Footer dataAsOf={a.dataAsOf} final={a.final} />
    </div>
  );
}
