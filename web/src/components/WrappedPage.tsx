'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { achievementIcon, door, pump, rocket } from '@/lib/art';
import { exportVm, seasonPill, summaryStats, validSeason } from '@/lib/summary';
import {
  ACHIEVEMENT_ORDER, ACHIEVEMENTS, activityLead, arrivalSub, arrivalText, builderCards, timeline, downloadFilename, fmt, fmtDate, fmtGas, fmtShort, fuelLine, gasPerTx,
  gnoscanAccount, gnoscanRealm, gnoscanTx, personaRankText, personaWhy, plural, RANK_METRIC, rankTopPct, shareLink, sharePost, shortAddress, slideIds, validate, weekRange, xIntentUrl, type WrappedData,
} from '@/lib/wrapped';
import Link from 'next/link';
import { DiscordIcon, XIcon } from './BrandIcons';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { SummaryExport } from './SummaryExport';
import { useHydrated } from './useReducedMotion';
import { CONFIG } from '@/lib/config';
import { Card, CountUp, DataErrorBanner, EXT, ExtLink, Footer, Icon, Nav, PathText, Reveal, SlashWrap, Starfield } from './web';

const ORANGE = '#FF8A3D';
const LINK = ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'];

/**
 * Season recap as a scrolling web page. Sections follow the handoff's hide rules (slideIds).
 * Two views: the owner's (/<season>/<address>) and a shared one (/<season>/s/<id>, data.shared), which
 * has no address in any form — no address chip, no Gnoscan account or tx links, no links to realm
 * paths the batch masked — and offers "unwrap your own" instead of the share tools.
 */
export function WrappedPage({ data, ogSrc }: { data: WrappedData; ogSrc: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [toast, setToast] = useState('');
  const errors = useMemo(() => validate(data), [data]);
  const season = validSeason(data);
  const show = useMemo(() => new Set(slideIds(data)), [data]);
  const shared = !!data.shared || !data.address;
  const short = shared ? '' : shortAddress(data.address);
  const masked = (path: string) => path.includes('…'); // the batch masks the owner's address in paths
  const persona = data.persona ?? { id: '', title: '', line: '' };
  const link = season ? shareLink(data) : '';
  const pct = data.percentile || 0;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? '' : t)), 2200);
  };
  const copy = (text: string, msg: string) => {
    navigator.clipboard?.writeText(text).then(() => flash(msg), () => flash("Couldn't copy"));
  };
  const download = async () => {
    const node = document.querySelector<HTMLElement>('#gw-summary-export > div');
    if (!node || !season) return;
    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const a = document.createElement('a');
      a.href = await toPng(node, { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true });
      a.download = downloadFilename(data);
      a.click();
      flash('Saved ' + a.download);
    } catch (e) {
      console.error('[Gno Wrapped] download failed', e);
      flash("Couldn't save the image");
    }
  };
  const scrollToShare = () => document.getElementById('share')?.scrollIntoView({ behavior: 'smooth' });

  const weekly = data.swaps?.weekly ?? [];
  const busiestIdx = weekly.indexOf(Math.max(...weekly));
  const gas = data.gasFeeGnot || 0;
  const top = data.topRealms?.[0];
  const builder = builderCards(data.deployedRealms ?? []);
  const stats = summaryStats(data);

  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav short={short || undefined} onShare={scrollToShare} explorer={shared ? undefined : gnoscanAccount(data.address)} />

      <main className="gw-main">
        {/* hero: persona + headline stats */}
        <section className="gw-hero">
          <div className="gw-hero-text">
            <Reveal><Pill>{seasonPill(season)}</Pill></Reveal>
            <Reveal delay={80}><p className="gw-kicker" style={{ marginTop: 22 }}>{shared ? 'Season persona' : 'Your season persona'}</p></Reveal>
            <Reveal delay={160}><h1 className="gw-persona-title">{persona.title}</h1></Reveal>
            <Reveal delay={240}><p className="gw-lede">{persona.line}</p></Reveal>
            <Reveal delay={300}>
              <p className="gw-why">
                <span>{personaWhy(data)}</span>
                <Link href="/personas" target="_blank" rel="noopener" className="gw-ext">How personas work ↗</Link>
              </p>
            </Reveal>
            {data.personaRank && (
              <Reveal delay={360}>
                <p className="gw-rank" aria-label="Persona rank">
                  <span className="gw-rank-pos">{personaRankText(data)}</span>
                  <span className="gw-rank-top">top {rankTopPct(data.personaRank)}%</span>
                  <span className="gw-rank-by">ranked by {RANK_METRIC[data.personaRank.metric]}</span>
                </p>
              </Reveal>
            )}
          </div>
          <Reveal className="gw-hero-badge" delay={200}>
            <PersonaBadge id={persona.id} p={8} label={`${persona.title} badge`} orbit float />
          </Reveal>
        </section>

        <section className="gw-stats" aria-label="Season at a glance" style={{ ['--cols' as string]: stats.length <= 4 ? stats.length : 3 }}>
          {stats.map((s, i) => (
            <Reveal key={s.label} className="gw-stat" delay={i * 70}>
              <div className={`gw-stat-value ${s.value.length > 9 ? 'gw-stat-long' : ''}`}>{s.value}</div>
              <div className="gw-stat-label">{s.label}</div>
            </Reveal>
          ))}
        </section>

        {data.achievements && data.achievements.length > 0 && (
          <Reveal as="section" className="gw-achievements" label="Achievements">
            <div className="gw-achievements-head">
              <h2 className="gw-h3">Achievements</h2>
              <Link href="/personas#achievements" target="_blank" rel="noopener" className="gw-ext" style={{ margin: 0 }}>All achievements ↗</Link>
            </div>
            <ul className="gw-ach-list">
              {[...data.achievements]
                .sort((a, b) => ACHIEVEMENT_ORDER.indexOf(a.id) - ACHIEVEMENT_ORDER.indexOf(b.id))
                .map((a, i) => (
                  <Reveal as="li" key={a.id} className="gw-ach" delay={i * 70}>
                    <Pixel art={achievementIcon(a.id, 4)} />
                    <div style={{ minWidth: 0 }}>
                      <div className="gw-ach-title">{ACHIEVEMENTS[a.id]?.title ?? a.id}</div>
                      <div className="gw-ach-text">{ACHIEVEMENTS[a.id]?.text(a.value)}</div>
                    </div>
                  </Reveal>
                ))}
            </ul>
          </Reveal>
        )}

        <div className="gw-grid">
          {show.has('ArrivalSlide') && data.firstTx && (
            <Card label="Arrival" className="gw-span-6">
              <Pill>ARRIVAL</Pill>
              <p className="gw-kicker">You arrived on {fmtDate(data.firstTx.date)}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div className="gw-pixel-label" style={{ fontSize: 24, color: '#7DB3FF' }}>DAY</div>
                  <CountUp className="gw-hero-num" value={data.firstTx.mainnetDay} format={fmt} />
                </div>
                <Pixel art={rocket} style={{ marginBottom: 8 }} />
              </div>
              <p className="gw-big-line" style={{ color: data.firstTx.mainnetDay === 1 ? ORANGE : undefined }}>{arrivalSub(data.firstTx.mainnetDay)}</p>
              {arrivalText(data) && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{arrivalText(data)}</p>}
              {!shared && data.firstTx.hash && <ExtLink href={gnoscanTx(data.firstTx.hash)}>View your first transaction</ExtLink>}
              {timeline(data).length > 1 && (
                <ol className="gw-timeline" aria-label="Season timeline">
                  {timeline(data).map((t) => (
                    <li key={t.label}><span className="gw-mono">{fmtShort(t.date)}</span><span>{t.label}</span></li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {show.has('ActivitySlide') && (
            <Card label="Activity" className="gw-span-6" delay={120}>
              <Pill>ACTIVITY</Pill>
              <p className="gw-kicker">This season you sent</p>
              <div><CountUp className="gw-hero-num" value={data.txCount} format={fmt} /></div>
              <p className="gw-big-line">{plural(data.txCount, 'transaction', 'transactions')}</p>
              <div role="img" aria-label={`More active than ${pct}% of addresses`} style={{ display: 'flex', gap: 3, marginTop: 18 }}>
                {Array.from({ length: 20 }, (_, i) => {
                  const filled = Math.round(pct / 5);
                  return <div key={i} style={{ flex: 1, height: 16, background: i < filled ? (i === filled - 1 ? ORANGE : '#3D8BFF') : '#1E2750' }} />;
                })}
              </div>
              <div className="gw-axis"><span>Least active</span><span>Most active</span></div>
              <p className="gw-body-strong">{activityLead(pct)}More active than <span style={{ color: ORANGE }}>{pct}%</span> of addresses</p>
            </Card>
          )}

          {show.has('RealmSlide') && top && (
            <Card label="Top realms" className="gw-span-12">
              <Pill>TOP REALMS</Pill>
              <div className="gw-realms">
                <div>
                  <p className="gw-kicker">Your most-called realm</p>
                  <div className="gw-path-line">
                    <PathText path={top.path} max={48} narrowMax={30} className="gw-path-hero" />
                    {!masked(top.path) && <ExtLink href={gnoscanRealm(top.path)} className="gw-ext gw-ext-icon" label={`Open ${top.path} on Gnoscan`} />}
                  </div>
                  <p className="gw-func">{top.topFunc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <CountUp className="gw-hero-num" value={top.calls} format={fmt} />
                    <span className="gw-big-line">{plural(top.calls, 'call', 'calls')}</span>
                  </div>
                </div>
                <ol className="gw-list">
                  {data.topRealms.slice(0, 3).map((r, i) => (
                    <Reveal as="li" key={r.path} className="gw-row" delay={200 + i * 90}>
                      <span className="gw-pixel-label" style={{ width: 24, fontSize: 14, color: i === 0 ? ORANGE : '#7DB3FF' }}>{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="gw-path-line">
                          <PathText path={r.path} max={40} narrowMax={26} className="gw-path-row" />
                          {!masked(r.path) && <ExtLink href={gnoscanRealm(r.path)} className="gw-ext gw-ext-icon" label={`Open ${r.path} on Gnoscan`} />}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700 }}>{r.topFunc}</div>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.calls)}</span>
                    </Reveal>
                  ))}
                </ol>
              </div>
            </Card>
          )}

          {show.has('DefiSlide') && (
            <Card label="DeFi" className="gw-span-7">
              <Pill>DEFI</Pill>
              <p className="gw-kicker">This season you made</p>
              <div><CountUp className="gw-hero-num" value={data.swaps.count} format={fmt} /></div>
              <p className="gw-big-line">{plural(data.swaps.count, 'swap on GnoSwap', 'swaps on GnoSwap')}</p>
              <div role="img" aria-label={`Weekly swaps across ${weekly.length} weeks. Busiest week ${season ? weekRange(busiestIdx, season.start) : '—'} with ${weekly[busiestIdx] ?? 0} swaps.`} className="gw-chart">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 104 }}>
                  {weekly.map((v, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: 3 }}>
                      {Array.from({ length: Math.round((v / Math.max(1, ...weekly)) * 8) }, (_, j) => (
                        <div key={j} style={{ height: 10, background: i === busiestIdx ? ORANGE : '#3D8BFF' }} />
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ height: 2, marginTop: 4, background: '#2A3566' }} />
                <div className="gw-axis gw-mono" style={{ fontSize: 11 }}>
                  <span>{season ? fmtShort(season.start) : '—'}</span><span>Weekly swaps</span><span>{season ? fmtShort(season.end) : '—'}</span>
                </div>
              </div>
              <p className="gw-body-strong">
                Busiest week: <span style={{ color: ORANGE }}>{season ? weekRange(busiestIdx, season.start) : '—'}</span> · {weekly[busiestIdx] ?? 0} {plural(weekly[busiestIdx] ?? 0, 'swap', 'swaps')}
              </p>
              {!shared && (
                <>
                  <ExtLink href={CONFIG.GNOSWAP_PORTFOLIO_URL}>Open your GnoSwap portfolio</ExtLink>
                  <p className="gw-hint">Connect this wallet on GnoSwap to see its positions.</p>
                </>
              )}
            </Card>
          )}

          {show.has('FuelSlide') && (
            <Card label="Fuel" className={show.has('DefiSlide') ? 'gw-span-5' : 'gw-span-6'} delay={120}>
              <Pill>FUEL</Pill>
              <Pixel art={pump} style={{ marginTop: 6 }} />
              <p className="gw-kicker">You burned</p>
              <div><CountUp className="gw-hero-num" value={gas} format={(n) => fmtGas(gas, n)} /></div>
              <p className="gw-big-line">GNOT spent on gas</p>
              <p className="gw-note">That&apos;s about <span style={{ color: ORANGE, fontWeight: 700 }}>{gasPerTx(gas, data.txCount)} GNOT</span> per transaction. {fuelLine(gas)}</p>
            </Card>
          )}

          {show.has('BuilderSlide') && (
            <Card label="Builder" className={show.has('FuelSlide') && !show.has('DefiSlide') ? 'gw-span-6' : 'gw-span-12'}>
              <Pill>BUILDER</Pill>
              <p className="gw-kicker">You deployed</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14 }}>
                <CountUp className="gw-hero-num" value={data.deployedRealms.length} format={fmt} />
                <span className="gw-big-line">{plural(data.deployedRealms.length, 'realm', 'realms')}</span>
              </div>
              <div className="gw-builder-cards">
                {builder.cards.map((b, i) => {
                  const body = (
                    <>
                      <Pixel art={door} />
                      <div className="gw-mono" style={{ minWidth: 0, flex: 1, fontSize: 13, overflowWrap: 'anywhere' }}>
                        <span style={{ color: '#A3AED6' }}><SlashWrap text={b.prefix} /></span><span style={{ fontWeight: 600 }}>{b.name}</span>
                      </div>
                    </>
                  );
                  return (
                    <Reveal key={b.full} delay={200 + i * 90}>
                      {masked(b.full) ? <div className="gw-row">{body}</div> : (
                        <a href={gnoscanRealm(b.full)} target="_blank" rel="noopener noreferrer" title={`${b.full} on Gnoscan`} className="gw-row gw-row-link">
                          {body}<Icon d={EXT} size={14} />
                        </a>
                      )}
                    </Reveal>
                  );
                })}
              </div>
              {builder.more > 0 && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>+{fmt(builder.more)} more</p>}
            </Card>
          )}
        </div>

        {/* share (owner) / get your own (shared view) */}
        {shared ? (
          <Reveal as="section" id="share" className="gw-share" label="Get your own Gno Wrapped">
            <div className="gw-share-text">
              <h2 className="gw-h2">Get your own Gno Wrapped</h2>
              <p className="gw-lede">Someone shared their Mainnet Season {season?.id.replace(/^s/i, '') ?? ''} on gno.land with you. Paste your address or connect Adena to unwrap yours.</p>
              <div className="gw-share-actions">
                <Link className="gw-btn gw-btn-primary" href="/">Unwrap your own</Link>
                <button type="button" className="gw-btn" onClick={() => copy(window.location.href, 'Link copied')}>
                  <Icon d={LINK} size={16} /> Copy link
                </button>
              </div>
            </div>
            {season && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="gw-og-preview" src={ogSrc} width={1200} height={630} alt={`Share card: ${persona.title}, ${fmt(data.txCount)} transactions`} />
            )}
          </Reveal>
        ) : (
          <Reveal as="section" id="share" className="gw-share" label="Share your Wrapped">
            <div className="gw-share-text">
              <h2 className="gw-h2">Share your Wrapped</h2>
              <p className="gw-lede">{persona.title} · {fmt(data.txCount)} {plural(data.txCount, 'transaction', 'transactions')}</p>
              <div className="gw-share-actions">
                <a className="gw-btn gw-btn-x" href={season ? xIntentUrl(data) : undefined} target="_blank" rel="noopener">
                  <XIcon size={16} /> Share to X
                </a>
                <button type="button" className="gw-btn gw-btn-discord" onClick={() => copy(sharePost(data), 'Copied — paste it in Discord')}>
                  <DiscordIcon size={18} /> Copy for Discord
                </button>
                <button type="button" className="gw-btn" onClick={() => copy(link, 'Link copied')}>
                  <Icon d={LINK} size={16} /> Copy link
                </button>
                <button type="button" className="gw-btn" onClick={download}>
                  <Icon d={['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14']} size={16} /> Download image
                </button>
              </div>
              <p className="gw-hint" style={{ marginTop: 12 }}>The link and images never show your address.</p>
            </div>
            {season && (
              // What X and Discord show for the link.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="gw-og-preview" src={ogSrc} width={1200} height={630} alt={`Share card: ${persona.title}, ${fmt(data.txCount)} transactions`} />
            )}
          </Reveal>
        )}
      </main>

      <Footer dataAsOf={data.dataAsOf}>
        <button type="button" className="gw-btn gw-btn-ghost" onClick={() => router.push('/')}>Unwrap another address</button>
      </Footer>

      {/* hidden 1080x1920 capture target for "Download image" (offscreen, not display:none) */}
      {!shared && (
        <div id="gw-summary-export" aria-hidden="true" style={{ position: 'absolute', left: -20000, top: 0, width: 1080, height: 1920, pointerEvents: 'none' }}>
          <SummaryExport vm={exportVm(data)} />
        </div>
      )}

      {toast && <div role="status" className="gw-toast">{toast}</div>}
      {errors.length > 0 && <DataErrorBanner errors={errors} />}
    </div>
  );
}
