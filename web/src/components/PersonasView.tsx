'use client';

import Link from 'next/link';
import { achievementIcon, personaColors } from '@/lib/art';
import { ACHIEVEMENT_ORDER, ACHIEVEMENTS, fmt, personaRuleText, RANK_METRIC, type PersonasData } from '@/lib/wrapped';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { Footer, Nav, Reveal, Starfield } from './web';

/** /personas: every persona, the rule that picks it, and how many addresses got it. */
export function PersonasView({ data, loading }: { data: PersonasData | null; loading?: boolean }) {
  const list = data?.personas ?? [];
  return (
    <div className="gw-page">
      <Starfield />
      <Nav />
      <main className="gw-main gw-personas">
        <Reveal><Pill>SEASON PERSONAS</Pill></Reveal>
        <Reveal delay={80}><h1 className="gw-h1">Eight personas, one per address</h1></Reveal>
        <Reveal delay={160}>
          <p className="gw-lede">
            Your persona isn&apos;t a score or a rank. It&apos;s one label picked from your on-chain activity this season:
            the rules below are checked in order, and the first one that fits is yours.
          </p>
        </Reveal>
        {loading && <p className="gw-lede">Loading…</p>}
        {!loading && !data && <p className="gw-lede">Persona data isn&apos;t available right now.</p>}

        <ol className="gw-persona-list">
          {list.map((p, i) => {
            const pct = data && data.addresses ? (p.count / data.addresses) * 100 : 0;
            const c = personaColors(p.id);
            return (
              <Reveal as="li" key={p.id} id={p.id} className="gw-persona-card" delay={(i % 2) * 90}>
                <div className="gw-persona-order gw-pixel-label" style={{ color: c.hi }}>{String(i + 1).padStart(2, '0')}</div>
                <div className="gw-persona-tile" style={{ background: c.deep, borderColor: c.edge }}>
                  <PersonaBadge id={p.id} p={4} label={`${p.title} badge`} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="gw-persona-name">{p.title}</h2>
                  <p className="gw-persona-line">{p.line}</p>
                  <p className="gw-persona-rule">{personaRuleText(p.rule)}</p>
                  <p className="gw-hint" style={{ marginTop: 8 }}>{p.rankBy ? `Ranked by ${RANK_METRIC[p.rankBy]}.` : 'No ranking: everyone here is just getting started.'}</p>
                  <div className="gw-persona-share" aria-label={`${pct.toFixed(1)}% of addresses`}>
                    <div className="gw-persona-bar"><div style={{ width: `${Math.max(pct, 0.6)}%`, background: c.mid }} /></div>
                    <span>{pct < 1 ? pct.toFixed(1) : Math.round(pct)}% · {fmt(p.count)} addresses</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <section id="achievements" aria-label="Achievements" style={{ marginTop: 48, scrollMarginTop: 90 }}>
          <Reveal><h2 className="gw-h2">Achievements</h2></Reveal>
          <Reveal delay={80}><p className="gw-lede">On top of your persona, collect any of these. They show on your recap when you have them.</p></Reveal>
          <ul className="gw-ach-list" style={{ marginTop: 20 }}>
            {ACHIEVEMENT_ORDER.map((id, i) => {
              const n = data?.achievements?.[id];
              return (
                <Reveal as="li" key={id} className="gw-ach" delay={(i % 3) * 70}>
                  <Pixel art={achievementIcon(id, 4)} />
                  <div style={{ minWidth: 0 }}>
                    <div className="gw-ach-title">{ACHIEVEMENTS[id].title}</div>
                    <div className="gw-ach-text">{ACHIEVEMENTS[id].rule}</div>
                    {data && n !== undefined && (
                      <div className="gw-ach-text" style={{ color: '#A3AED6' }}>{((n / data.addresses) * 100).toFixed(1)}% · {fmt(n)} addresses</div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </section>

        {data && (
          <p className="gw-hint" style={{ marginTop: 24 }}>
            Based on {fmt(data.addresses)} addresses with activity in Mainnet Season {data.season.id.replace(/^s/i, '')}, as of {data.dataAsOf}.
            &quot;Moves&quot; are the messages inside your transactions; wugnot counts as DeFi because it wraps GNOT for GnoSwap.
            Your rank within your persona is shown only on your own recap; there is no public list.
          </p>
        )}
        <div style={{ marginTop: 28 }}>
          <Link href="/" className="gw-btn gw-btn-primary gw-btn-lg">Find your persona</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
