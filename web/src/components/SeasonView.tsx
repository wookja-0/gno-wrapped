'use client';

import Link from 'next/link';
import { seasonPill } from '@/lib/summary';
import { addDays, fmt, fmtDate, fmtGas, fmtShort, gnoscanRealm, peakIndex, plural, type SeasonData } from '@/lib/wrapped';
import { DailyChart } from './DailyChart';
import { SeasonCountdown } from './SeasonCountdown';
import { Pill } from './pixel';
import { Card, ExtLink, Footer, Nav, PathText, Reveal, Starfield } from './web';

/** /season: the whole chain's Mainnet Season, from the batch's season.json. No address in it. */
export function SeasonView({ data, loading }: { data: SeasonData | null; loading?: boolean }) {
  const n = data?.season.id.replace(/^s/i, '') ?? '1';
  const stats = data ? [
    { label: 'Addresses', value: fmt(data.addresses) },
    { label: 'Transactions', value: fmt(data.transactions) },
    { label: 'Swaps on GnoSwap', value: fmt(data.swaps) },
    { label: 'Realms deployed', value: fmt(data.realmsDeployed) },
    { label: 'GNOT spent on gas', value: fmtGas(data.gasGnot) },
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
        <Reveal delay={80}><h1 className="gw-h1">Mainnet Season {n}, all of gno.land</h1></Reveal>
        <Reveal delay={160}>
          <p className="gw-lede">
            Every address, every realm and every block of the season{data?.final ? '' : ' so far'}: the chain&apos;s own recap,
            built from the same public data as yours.
          </p>
        </Reveal>
        {loading && <p className="gw-lede">Loading…</p>}
        {!loading && !data && <p className="gw-lede">Season data isn&apos;t available right now.</p>}

        {data && (
          <>
            <section className="gw-stats" aria-label="The season in numbers" style={{ ['--cols' as string]: 3, marginTop: 32 }}>
              {stats.map((s, i) => (
                <Reveal key={s.label} className="gw-stat" delay={i * 70}>
                  <div className={`gw-stat-value ${s.value.length > 9 ? 'gw-stat-long' : ''}`}>{s.value}</div>
                  <div className="gw-stat-label">{s.label}</div>
                </Reveal>
              ))}
            </section>

            <div className="gw-grid" style={{ marginTop: 20 }}>
              <Card label="Transactions per day" className="gw-span-12">
                <Pill>TRANSACTIONS</Pill>
                <p className="gw-kicker">Transactions per day</p>
                {data.busiestDay && (
                  <p className="gw-body-strong">
                    Busiest day: <span style={{ color: '#FF8A3D' }}>{fmtDate(data.busiestDay.date)}</span> · {fmt(data.busiestDay.txs)} {plural(data.busiestDay.txs, 'transaction', 'transactions')}
                  </p>
                )}
                <DailyChart label="Transactions per day" values={data.dailyTxs} season={data.season} dataAsOf={data.dataAsOf} unit={['transaction', 'transactions']} />
              </Card>

              <Card label="New addresses per day" className="gw-span-12">
                <Pill>ARRIVALS</Pill>
                <p className="gw-kicker">New addresses per day</p>
                <p className="gw-body-strong">
                  {fmt(data.addresses)} {plural(data.addresses, 'address', 'addresses')} {data.final ? 'this season' : 'so far'}
                  {newcomers >= 0 && <>; the most arrived on <span style={{ color: '#FF8A3D' }}>{fmtShort(addDays(data.season.start, newcomers))}</span> ({fmt(data.dailyArrivals[newcomers])})</>}.
                </p>
                <DailyChart label="New addresses per day" values={data.dailyArrivals} season={data.season} dataAsOf={data.dataAsOf} unit={['new address', 'new addresses']} />
              </Card>

              {data.topRealms.length > 0 && (
                <Card label="Most-used realms" className="gw-span-12">
                  <Pill>REALMS</Pill>
                  <p className="gw-kicker">Most-used realms, by addresses that called them ({fmt(data.realmsCalled)} realms called in all)</p>
                  <ol className="gw-list" style={{ marginTop: 12 }}>
                    {data.topRealms.map((r, i) => (
                      <li key={r.path} className="gw-row">
                        <span className="gw-pixel-label" style={{ width: 24, fontSize: 14, color: i === 0 ? '#FF8A3D' : '#7DB3FF' }}>{String(i + 1).padStart(2, '0')}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="gw-path-line">
                            <PathText path={r.path} max={48} narrowMax={26} className="gw-path-row" />
                            <ExtLink href={gnoscanRealm(r.path)} className="gw-ext gw-ext-icon" label={`Open ${r.path} on Gnoscan`} />
                          </div>
                          <div style={{ marginTop: 2, fontSize: 14, color: '#C9D3F5' }}>{fmt(r.calls)} {plural(r.calls, 'call', 'calls')}</div>
                        </div>
                        <span style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.addresses)}</span>
                          <span style={{ fontSize: 12, color: '#A3AED6' }}>addresses</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>

            <p className="gw-hint" style={{ marginTop: 24 }}>
              Data as of {data.dataAsOf}. Counts are successful transactions; days are UTC. A realm path can contain the
              address of whoever deployed it, as on any explorer.
            </p>
          </>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginTop: 28 }}>
          <Link href="/" className="gw-btn gw-btn-primary gw-btn-lg">Find your recap</Link>
          <Link href="/personas" className="gw-ext" style={{ margin: 0 }}>Personas and achievements →</Link>
        </div>
      </main>
      <Footer final={data?.final} />
    </div>
  );
}
