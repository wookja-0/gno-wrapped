'use client';

import Link from 'next/link';
import { seasonPill } from '@/lib/summary';
import { addDays, fmt, fmtGas, gnoscanRealm, peakIndex, type SeasonData } from '@/lib/wrapped';
import { DailyChart } from './DailyChart';
import { useCopy } from './useLocale';
import { SeasonCountdown } from './SeasonCountdown';
import { Pill } from './pixel';
import { Card, ExtLink, Footer, Nav, PathText, Reveal, Starfield } from './web';

/** /season: the whole chain's Mainnet Season, from the batch's season.json. No address in it. */
export function SeasonView({ data, loading }: { data: SeasonData | null; loading?: boolean }) {
  const c = useCopy();
  const l = c.seasonStats;
  const stats = data ? [
    { label: l.addresses, value: fmt(data.addresses) },
    { label: l.transactions, value: fmt(data.transactions) },
    { label: l.swaps, value: fmt(data.swaps) },
    { label: l.deployed, value: fmt(data.realmsDeployed) },
    { label: l.gas, value: fmtGas(data.gasGnot) },
  ] : [];
  const newcomers = data ? peakIndex(data.dailyArrivals) : -1; // the day the most addresses arrived
  return (
    <div className="gw-page">
      <Starfield />
      <Nav />
      <main className="gw-main gw-personas">
        <Reveal>
          <div className="gw-pills">
            <Pill>{data ? seasonPill(data.season) : 'MAINNET SEASON'}</Pill>
            {data?.final && <Pill style={{ background: '#FF8A3D', color: '#0A0F2E' }}>FINAL</Pill>}
            {data && <SeasonCountdown season={data.season} final={data.final} />}
          </div>
        </Reveal>
        <Reveal delay={80}><h1 className="gw-h1">{c.seasonTitle(data?.season ?? { id: 's1', start: '', end: '' })}</h1></Reveal>
        <Reveal delay={160}>
          <p className="gw-lede">{c.seasonLede(!!data?.final)}</p>
        </Reveal>
        {loading && <p className="gw-lede">{c.loadingShort}</p>}
        {!loading && !data && <p className="gw-lede">{c.seasonUnavailable}</p>}

        {data && (
          <>
            <section className="gw-stats" aria-label={c.inNumbers} style={{ ['--cols' as string]: 3, marginTop: 32 }}>
              {stats.map((s, i) => (
                <Reveal key={s.label} className="gw-stat" delay={i * 70}>
                  <div className={`gw-stat-value ${s.value.length > 9 ? 'gw-stat-long' : ''}`}>{s.value}</div>
                  <div className="gw-stat-label">{s.label}</div>
                </Reveal>
              ))}
            </section>

            <div className="gw-grid" style={{ marginTop: 20 }}>
              <Card label={c.perDay} className="gw-span-12">
                <Pill>TRANSACTIONS</Pill>
                <p className="gw-kicker">{c.perDay}</p>
                {data.busiestDay && (
                  <p className="gw-body-strong">
                    {c.busiestDay}<span style={{ color: '#FF8A3D' }}>{c.date(data.busiestDay.date)}</span> · {c.transactions(data.busiestDay.txs)}
                  </p>
                )}
                <DailyChart label={c.perDay} values={data.dailyTxs} season={data.season} dataAsOf={data.dataAsOf} unit={c.unitTx} />
              </Card>

              <Card label={c.newAddresses} className="gw-span-12">
                <Pill>ARRIVALS</Pill>
                <p className="gw-kicker">{c.newAddresses}</p>
                <p className="gw-body-strong">
                  {c.arrivalsLine(data.addresses, !!data.final)}
                  {newcomers >= 0 && <>{c.mostArrived}<span style={{ color: '#FF8A3D' }}>{c.short_(addDays(data.season.start, newcomers))}</span> ({fmt(data.dailyArrivals[newcomers])})</>}.
                </p>
                <DailyChart label={c.newAddresses} values={data.dailyArrivals} season={data.season} dataAsOf={data.dataAsOf} unit={c.unitNewAddress} />
              </Card>

              {data.topRealms.length > 0 && (
                <Card label={c.mostUsedRealms(data.realmsCalled)} className="gw-span-12">
                  <Pill>REALMS</Pill>
                  <p className="gw-kicker">{c.mostUsedRealms(data.realmsCalled)}</p>
                  <ol className="gw-list" style={{ marginTop: 12 }}>
                    {data.topRealms.map((r, i) => (
                      <li key={r.path} className="gw-row">
                        <span className="gw-pixel-label" style={{ width: 24, fontSize: 14, color: i === 0 ? '#FF8A3D' : '#7DB3FF' }}>{String(i + 1).padStart(2, '0')}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="gw-path-line">
                            <PathText path={r.path} max={48} narrowMax={26} className="gw-path-row" />
                            <ExtLink href={gnoscanRealm(r.path)} className="gw-ext gw-ext-icon" label={c.openOnGnoscan(r.path)} />
                          </div>
                          <div style={{ marginTop: 2, fontSize: 14, color: '#C9D3F5' }}>{c.callsCount(r.calls)}</div>
                        </div>
                        <span style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.addresses)}</span>
                          <span style={{ fontSize: 12, color: '#A3AED6' }}>{c.addressesWord}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>

            <p className="gw-hint" style={{ marginTop: 24 }}>{c.seasonNote(data.dataAsOf)}</p>
          </>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 28 }}>
          <Link href="/" className="gw-btn gw-btn-primary gw-btn-lg">{c.findRecap}</Link>
          <Link href="/personas" className="gw-ext" style={{ margin: 0 }}>{c.personasAndAchievements}</Link>
        </div>
      </main>
      <Footer final={data?.final} />
    </div>
  );
}
