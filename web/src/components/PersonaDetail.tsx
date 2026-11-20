'use client';

import Link from 'next/link';
import { achievementIcon, personaColors } from '@/lib/art';
import {
  ACHIEVEMENT_ORDER, bucketLabel, chronotype, fmt, localHours, rarityOf, sharePct, tzShift, type AchievementId, type PersonasData,
} from '@/lib/wrapped';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { Tilt } from './Tilt';
import { useCopy } from './useLocale';
import { useTzOffset } from './useReducedMotion';
import { PathText } from './web';

/**
 * One persona in detail: its rule and place in the order, how many have it, and how they used the
 * season (aggregates from the batch). Shown as the modal over /personas and as the /personas/<id> page.
 * `modal`: links to other personas replace the entry, so Back still closes the modal.
 */
export function PersonaDetail({ data, id, modal = false }: { data: PersonasData; id: string; modal?: boolean }) {
  const c = useCopy();
  const offset = useTzOffset();
  const list = data.personas;
  const i = list.findIndex((p) => p.id === id);
  const p = list[i];
  if (!p) return null;
  const col = personaColors(id);
  const title = c.personaTitle(id, p.title);
  const share = data.addresses ? p.count / data.addresses : 0;
  const tier = rarityOf(share);
  const s = p.stats;
  const clock = s ? chronotype(localHours(s.hours, tzShift(offset))) : null;
  const held = s?.achievements
    ? ACHIEVEMENT_ORDER.filter((a) => s.achievements![a]).map((a) => ({ id: a as AchievementId, n: s.achievements![a]! })).sort((x, y) => y.n - x.n)
    : [];
  const maxBucket = Math.max(1, ...(s?.rank?.buckets.map((b) => b.count) ?? [1]));
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];

  return (
    <article className="gw-pd" style={{ ['--ph' as string]: col.hi, ['--pm' as string]: col.mid, ['--pd' as string]: col.deep, ['--pe' as string]: col.edge }}>
      <div className="gw-pd-top">
        {!modal && <Link href="/personas" className="gw-ext" style={{ margin: 0 }}>{c.allPersonas}</Link>}
        <span className="gw-pixel-label gw-pd-order">{c.personaOf(i + 1, list.length)}</span>
      </div>

      <header className="gw-pd-head">
        <div className="gw-pd-badge">
          <Tilt shape="badge" max={16} touch>
            <PersonaBadge id={id} p={6} label={c.badge(title)} foil />
          </Tilt>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="gw-pd-title" id="gw-pd-title">{title}</h1>
          <p className="gw-pd-line">{c.personaLine(id, p.line)}</p>
          <div className="gw-pd-rule">{c.personaRule(p.rule)}</div>
          <p className="gw-pd-meta">
            {c.personaOrder(i)} {p.rankBy ? c.rankedByFull(p.rankBy) : c.noRanking(id)}
          </p>
          <p className="gw-pd-share">
            <Pill style={{ background: 'var(--pm)', color: '#0A0F2E' }}>{c.rarity(tier)}</Pill>
            <span>{c.shareOfAddresses(share * 100, p.count)}</span>
          </p>
        </div>
      </header>

      {s ? (
        <section className="gw-pd-section" aria-label={c.statsTitle(id, p.title)}>
          <h2 className="gw-h3">{c.statsTitle(id, p.title)}</h2>
          <div className="gw-pd-tiles">
            <div className="gw-stat"><div className="gw-stat-value">{fmt(s.medianTxs)}</div><div className="gw-stat-label">{c.medianTxs}</div></div>
            <div className="gw-stat"><div className="gw-stat-value">{fmt(s.medianDays)}</div><div className="gw-stat-label">{c.medianDays}</div></div>
            {clock && <div className="gw-stat"><div className="gw-stat-value gw-stat-long">{c.chronotype(clock.id)}</div><div className="gw-stat-label">{c.busiestTime}</div></div>}
          </div>

          {s.topRealms && s.topRealms.length > 0 && (
            <>
              <h3 className="gw-pd-sub">{c.realmsTheyUsed}</h3>
              <ol className="gw-list">
                {s.topRealms.map((r, k) => (
                  <li key={r.path} className="gw-row">
                    <span className="gw-pixel-label" style={{ width: 24, fontSize: 13, color: k === 0 ? '#FF8A3D' : '#7DB3FF' }}>{String(k + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><PathText path={r.path} max={44} narrowMax={24} className="gw-path-row" /></div>
                    <span className="gw-pd-count">{c.ofThem(r.addresses)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {held.length > 0 && (
            <>
              <h3 className="gw-pd-sub">{c.achievementsTheyHold}</h3>
              <ul className="gw-pd-held">
                {held.map((a) => (
                  <li key={a.id}>
                    <Pixel art={achievementIcon(a.id, 3)} />
                    <span className="gw-pd-held-name">{c.achievement(a.id).title}</span>
                    <span className="gw-pd-bar"><i style={{ width: `${(a.n / s.addresses) * 100}%` }} /></span>
                    <span className="gw-pd-count">{c.heldBy(sharePct(a.n / s.addresses))}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {s.rank && p.rankBy && (
            <>
              <h3 className="gw-pd-sub">{c.rankedByFull(p.rankBy)}</h3>
              <ul className="gw-pd-spread" aria-label={c.rankedByFull(p.rankBy)}>
                {s.rank.buckets.map((b) => (
                  <li key={b.from}>
                    <span className="gw-mono gw-pd-bucket">{bucketLabel(b)}</span>
                    <span className="gw-pd-bar"><i style={{ width: b.few ? '2%' : `${(b.count / maxBucket) * 100}%` }} /></span>
                    <span className="gw-pd-count">{b.few ? c.fewerThan5 : c.ofThem(b.count)}</span>
                  </li>
                ))}
              </ul>
              <p className="gw-body-strong" style={{ color: 'var(--ph)' }}>{c.top10Line(s.rank.top10, p.rankBy)}</p>
            </>
          )}
          <p className="gw-hint" style={{ marginTop: 16 }}>{c.smallGroups}</p>
        </section>
      ) : <p className="gw-hint">{c.personaStatsNone}</p>}

      <nav className="gw-pd-nav" aria-label={c.allPersonas}>
        <Link href={`/personas/${prev.id}`} replace={modal} scroll={!modal} className="gw-btn" aria-label={`${c.prevPersona}: ${c.personaTitle(prev.id, prev.title)}`}>← {c.personaTitle(prev.id, prev.title)}</Link>
        <Link href="/" className="gw-btn gw-btn-primary">{c.introPickCta}</Link>
        <Link href={`/personas/${next.id}`} replace={modal} scroll={!modal} className="gw-btn" aria-label={`${c.nextPersona}: ${c.personaTitle(next.id, next.title)}`}>{c.personaTitle(next.id, next.title)} →</Link>
      </nav>
    </article>
  );
}
