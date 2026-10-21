'use client';

import Link from 'next/link';
import { achievementIcon } from '@/lib/art';
import { personaIn } from '@/lib/i18n';
import { seasonPill } from '@/lib/summary';
import { combine, fmt, fmtGas, shortAddress, WALLETS_MAX, walletsHref, type Wallet } from '@/lib/wrapped';
import { ActivityCalendar } from './ActivityCalendar';
import { ClockCard } from './HourlyChart';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { SeasonCountdown } from './SeasonCountdown';
import { useCopy } from './useLocale';
import { useHydrated } from './useReducedMotion';
import { WalletForm } from './WalletForm';
import { Card, Footer, Nav, PathText, Reveal, Starfield } from './web';

/**
 * /<season>/wallets/<a>,<b>,…: several of one person's wallets added up (see combine). The link
 * carries the addresses, like a recap's own link; there's no share link for it.
 */
export function CombinedView({ wallets }: { wallets: Wallet[] }) {
  const hydrated = useHydrated();
  const c = useCopy();
  const { total: d, achievements } = combine(wallets)!;
  const season = d.season;
  const addresses = wallets.map((w) => w.address);
  const active = wallets.filter((w) => w.recap).length;
  const without = (a: string) => {
    const rest = addresses.filter((x) => x !== a);
    return rest.length === 1 ? `/${season.id}/${rest[0]}` : walletsHref(season.id, rest);
  };
  const stats = [
    { label: c.statTransactions, value: fmt(d.txCount) },
    { label: c.statActiveDays, value: fmt(d.calendar!.activeDays) },
    { label: c.statStreak, value: c.statDays(d.calendar!.longestStreak) },
    ...(d.firstTx ? [{ label: c.statArrived, value: c.statDay(d.firstTx.mainnetDay) }] : []),
    ...(d.swaps.count ? [{ label: c.statSwaps, value: fmt(d.swaps.count) }] : []),
    ...(d.deployedRealms.length ? [{ label: c.statDeployed, value: fmt(d.deployedRealms.length) }] : []),
    ...(d.gasFeeGnot ? [{ label: c.statGas, value: `${fmtGas(d.gasFeeGnot)} GNOT` }] : []),
  ];

  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav />
      <main className="gw-main">
        <Reveal>
          <div className="gw-pills">
            <Pill>{seasonPill(season)}</Pill>
            {d.final && <Pill style={{ background: '#FF8A3D', color: '#0A0F2E' }}>FINAL</Pill>}
            <SeasonCountdown season={season} final={d.final} />
          </div>
        </Reveal>
        <Reveal delay={80}><h1 className="gw-h1">{c.walletsTitle}</h1></Reveal>
        <Reveal delay={160}><p className="gw-lede">{c.walletsLede(wallets.length, season)}</p></Reveal>

        <Card label={c.walletsLabel} style={{ marginTop: 28 }}>
          <ul className="gw-list gw-wallets">
            {wallets.map(({ address, recap }) => {
              const p = personaIn(c, recap?.persona);
              return (
                <li key={address} className="gw-row">
                  {p ? <PersonaBadge id={p.id} p={3} label={c.badge(p.title)} /> : <span className="gw-wallet-none" aria-hidden="true" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/${season.id}/${address}`} className="gw-mono gw-wallet-addr">{shortAddress(address)}</Link>
                    <div className="gw-hint" style={{ margin: 0 }}>{recap ? `${p?.title} · ${c.transactions(recap.txCount)}` : c.walletNoActivity}</div>
                  </div>
                  <Link href={without(address)} className="gw-visit-close gw-wallet-remove" aria-label={c.removeWallet(shortAddress(address))}>×</Link>
                </li>
              );
            })}
          </ul>
          {wallets.length < WALLETS_MAX && <WalletForm season={season.id} current={addresses} />}
          <p className="gw-hint" style={{ marginTop: 10 }}>{c.addWalletHint(WALLETS_MAX)}</p>
        </Card>

        <section className="gw-stats" aria-label={c.glance} style={{ marginTop: 20, ['--cols' as string]: stats.length <= 4 ? stats.length : stats.length <= 6 ? 3 : 4 }}>
          {stats.map((s, i) => (
            <Reveal key={s.label} className="gw-stat" delay={i * 70}>
              <div className={`gw-stat-value ${s.value.length > 9 ? 'gw-stat-long' : ''}`}>{s.value}</div>
              <div className="gw-stat-label">{s.label}</div>
            </Reveal>
          ))}
        </section>

        <div className="gw-grid">
          <Card label="Calendar" className="gw-span-12">
            <Pill>CALENDAR</Pill>
            <p className="gw-kicker">{c.calendarKicker(false)}</p>
            <ActivityCalendar data={d} wallets={wallets.map((w) => ({ address: w.address, daily: w.recap?.calendar?.daily ?? [] }))} />
          </Card>

          <ClockCard data={d} />

          {d.topRealms.length > 0 && (
            <Card label="Top realms" className={achievements.length ? 'gw-span-7' : 'gw-span-12'}>
              <Pill>TOP REALMS</Pill>
              <p className="gw-kicker">{c.combinedRealms}</p>
              <ol className="gw-list" style={{ marginTop: 16 }}>
                {d.topRealms.map((r, i) => (
                  <li key={r.path} className="gw-row">
                    <span className="gw-pixel-label" style={{ width: 24, fontSize: 14, color: i === 0 ? '#FF8A3D' : '#7DB3FF' }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <PathText path={r.path} max={40} narrowMax={26} className="gw-path-row" />
                      <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700 }}>{r.topFunc}</div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.calls)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {achievements.length > 0 && (
            <Card label={c.achievementsTitle} className={d.topRealms.length ? 'gw-span-5' : 'gw-span-12'}>
              <Pill>ACHIEVEMENTS</Pill>
              <p className="gw-kicker">{c.combinedAchievements}</p>
              <ul className="gw-list" style={{ marginTop: 16 }}>
                {achievements.map((a) => (
                  <li key={a.id} className="gw-row">
                    <Pixel art={achievementIcon(a.id, 3)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="gw-ach-title">{c.achievement(a.id).title}</div>
                      <div className="gw-ach-text">{c.achievementWallets(a.wallets, active)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>
      <Footer dataAsOf={d.dataAsOf} final={d.final} />
    </div>
  );
}
