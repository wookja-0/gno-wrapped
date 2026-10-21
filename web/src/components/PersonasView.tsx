'use client';

import Link from 'next/link';
import { achievementIcon, personaColors } from '@/lib/art';
import { ACHIEVEMENT_ORDER, type PersonasData } from '@/lib/wrapped';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { useCopy } from './useLocale';
import { Footer, Nav, Reveal, Starfield } from './web';

/** /personas: every persona, the rule that picks it, and how many addresses got it. */
export function PersonasView({ data, loading }: { data: PersonasData | null; loading?: boolean }) {
  const t = useCopy();
  const list = data?.personas ?? [];
  return (
    <div className="gw-page">
      <Starfield />
      <Nav />
      <main className="gw-main gw-personas">
        <Reveal><Pill>{t.personasPill}</Pill></Reveal>
        <Reveal delay={80}><h1 className="gw-h1">{t.personasTitle}</h1></Reveal>
        <Reveal delay={160}>
          <p className="gw-lede">{t.personasLede}</p>
        </Reveal>
        {loading && <p className="gw-lede">{t.loadingShort}</p>}
        {!loading && !data && <p className="gw-lede">{t.personasUnavailable}</p>}

        <ol className="gw-persona-list">
          {list.map((p, i) => {
            const pct = data && data.addresses ? (p.count / data.addresses) * 100 : 0;
            const c = personaColors(p.id);
            return (
              <Reveal as="li" key={p.id} id={p.id} className="gw-persona-card" delay={(i % 2) * 90}>
                <div className="gw-persona-order gw-pixel-label" style={{ color: c.hi }}>{String(i + 1).padStart(2, '0')}</div>
                <div className="gw-persona-tile" style={{ background: c.deep, borderColor: c.edge }}>
                  <PersonaBadge id={p.id} p={4} label={t.badge(t.personaTitle(p.id, p.title))} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="gw-persona-name">{t.personaTitle(p.id, p.title)}</h2>
                  <p className="gw-persona-line">{t.personaLine(p.id, p.line)}</p>
                  <p className="gw-persona-rule">{t.personaRule(p.rule)}</p>
                  <p className="gw-hint" style={{ marginTop: 8 }}>{p.rankBy ? t.rankedByFull(p.rankBy) : t.noRanking}</p>
                  <div className="gw-persona-share" aria-label={t.ofAddresses(pct)}>
                    <div className="gw-persona-bar"><div style={{ width: `${Math.max(pct, 0.6)}%`, background: c.mid }} /></div>
                    <span>{t.shareOfAddresses(pct, p.count)}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <section id="achievements" aria-label={t.achievementsTitle} style={{ marginTop: 48, scrollMarginTop: 90 }}>
          <Reveal><h2 className="gw-h2">{t.achievementsTitle}</h2></Reveal>
          <Reveal delay={80}><p className="gw-lede">{t.achievementsLede}</p></Reveal>
          <ul className="gw-ach-list" style={{ marginTop: 20 }}>
            {ACHIEVEMENT_ORDER.map((id, i) => {
              const n = data?.achievements?.[id];
              return (
                <Reveal as="li" key={id} className="gw-ach" delay={(i % 3) * 70}>
                  <Pixel art={achievementIcon(id, 4)} />
                  <div style={{ minWidth: 0 }}>
                    <div className="gw-ach-title">{t.achievement(id).title}</div>
                    <div className="gw-ach-text">{t.achievement(id).rule}</div>
                    {data && n !== undefined && (
                      <div className="gw-ach-text" style={{ color: '#A3AED6' }}>{t.achievementShare((n / data.addresses) * 100, n)}</div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </section>

        {data && (
          <p className="gw-hint" style={{ marginTop: 24 }}>{t.personasNote(data.addresses, data.season, data.dataAsOf)}</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 28 }}>
          <Link href="/" className="gw-btn gw-btn-primary gw-btn-lg">{t.findPersona}</Link>
          <Link href="/season" className="gw-ext" style={{ margin: 0 }}>{t.wholeSeason}</Link>
        </div>
      </main>
      <Footer final={data?.final} />
    </div>
  );
}
