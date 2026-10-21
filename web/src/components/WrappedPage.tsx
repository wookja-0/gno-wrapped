'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { achievementIcon, door, pump, rocket } from '@/lib/art';
import { exportVm, seasonPill, summaryStats, validSeason } from '@/lib/summary';
import {
  ACHIEVEMENT_ORDER, builderCards, nextUp, timeline, downloadFilename, fmt, fmtGas, gasPerTx,
  gnoscanAccount, gnoscanRealm, gnoscanTx, shareLink, shortAddress, slideIds, validate, xIntentUrl, type WrappedData,
} from '@/lib/wrapped';
import { personaIn } from '@/lib/i18n';
import Link from 'next/link';
import { ActivityCalendar } from './ActivityCalendar';
import { CompareForm } from './CompareForm';
import { DiscordIcon, XIcon } from './BrandIcons';
import { ClockCard } from './HourlyChart';
import { PersonaBadge, Pill, Pixel } from './pixel';
import { SeasonCountdown } from './SeasonCountdown';
import { StoryMode } from './StoryMode';
import { SinceLastVisit } from './SinceLastVisit';
import { SummaryExport } from './SummaryExport';
import { WalletForm } from './WalletForm';
import { useCopy } from './useLocale';
import { useHydrated } from './useReducedMotion';
import { CONFIG } from '@/lib/config';
import { Card, CountUp, DataErrorBanner, EXT, ExtLink, Footer, Icon, Nav, PathText, Reveal, SlashWrap, Starfield } from './web';

const ORANGE = '#FF8A3D';
const noop = () => () => {};
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
  const c = useCopy();
  const [toast, setToast] = useState('');
  // story mode: from the hero button, or straight away with ?story in the link (read after hydration)
  const storyInUrl = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).has('story'), () => false);
  const [story, setStory] = useState<boolean | null>(null); // null = not opened or closed yet
  const errors = useMemo(() => validate(data), [data]);
  const season = validSeason(data);
  const show = useMemo(() => new Set(slideIds(data)), [data]);
  const shared = !!data.shared || !data.address;
  const short = shared ? '' : shortAddress(data.address);
  const masked = (path: string) => path.includes('…'); // the batch masks the owner's address in paths
  const persona = personaIn(c, data.persona) ?? { id: '', title: '', line: '' };
  const link = season ? shareLink(data) : '';
  const pct = data.percentile || 0;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? '' : t)), 2200);
  };
  const copy = (text: string, msg: string) => {
    navigator.clipboard?.writeText(text).then(() => flash(msg), () => flash(c.copyFailed));
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
      flash(c.saved(a.download));
    } catch (e) {
      console.error('[Gno Wrapped] download failed', e);
      flash(c.saveFailed);
    }
  };
  const scrollToShare = () => document.getElementById('share')?.scrollIntoView({ behavior: 'smooth' });

  const weekly = data.swaps?.weekly ?? [];
  const busiestIdx = weekly.indexOf(Math.max(...weekly));
  const gas = data.gasFeeGnot || 0;
  const top = data.topRealms?.[0];
  // most-called first when the batch sent the report
  const builder = builderCards(data.builder?.map((r) => r.path) ?? data.deployedRealms ?? []);
  const reportOf = new Map((data.builder ?? []).map((r) => [r.path, r]));
  const defi = c.defiLines(data);
  const pair = c.topPairText(data);
  const gov = c.governanceLines(data);
  const stats = summaryStats(data, c);
  const steps = timeline(data, (id) => c.milestone(id), c.firstTransaction);
  const [activePre, activePct, activePost] = c.moreActiveThan(pct);
  const [perTxPre, perTxValue, perTxPost] = c.perTx(gasPerTx(gas, data.txCount));
  const next = nextUp(data); // owner view of a live season only: the batch leaves it out otherwise

  return (
    <div className="gw-page" data-hydrated={hydrated || undefined}>
      <Starfield />
      <Nav short={short || undefined} onShare={scrollToShare} explorer={shared ? undefined : gnoscanAccount(data.address)} />

      <main className="gw-main">
        {/* hero: persona + headline stats */}
        <section className="gw-hero">
          <div className="gw-hero-text">
            <Reveal>
              <div className="gw-pills">
                <Pill>{seasonPill(season)}</Pill>
                {data.final && <Pill style={{ background: '#FF8A3D', color: '#0A0F2E' }}>FINAL</Pill>}
                {season && <SeasonCountdown season={season} final={data.final} />}
              </div>
            </Reveal>
            <Reveal delay={80}><p className="gw-kicker" style={{ marginTop: 22 }}>{c.seasonPersona(shared)}</p></Reveal>
            <Reveal delay={160}><h1 className="gw-persona-title">{persona.title}</h1></Reveal>
            <Reveal delay={240}><p className="gw-lede">{persona.line}</p></Reveal>
            <Reveal delay={300}>
              <p className="gw-why">
                <span>{c.personaWhy(data)}</span>
                <Link href="/personas" target="_blank" rel="noopener" className="gw-ext">{c.howPersonasWork}</Link>
              </p>
            </Reveal>
            {data.personaRank && (
              <Reveal delay={360}>
                <p className="gw-rank" aria-label="Persona rank">
                  <span className="gw-rank-pos">{c.personaRankText(data)}</span>
                  <span className="gw-rank-top">{c.topPct(data.personaRank)}</span>
                  <span className="gw-rank-by">{c.rankedBy(data.personaRank.metric)}</span>
                </p>
              </Reveal>
            )}
            {season && (
              <Reveal delay={420}>
                <button type="button" className="gw-btn gw-btn-primary gw-story-play" onClick={() => setStory(true)}>
                  {c.playStory(shared)}
                </button>
              </Reveal>
            )}
          </div>
          <Reveal className="gw-hero-badge" delay={200}>
            <PersonaBadge id={persona.id} p={8} label={c.badge(persona.title)} orbit float />
          </Reveal>
        </section>

        {!shared && <SinceLastVisit data={data} />}

        <section className="gw-stats" aria-label={c.glance} style={{ ['--cols' as string]: stats.length <= 4 ? stats.length : 3 }}>
          {stats.map((s, i) => (
            <Reveal key={s.label} className="gw-stat" delay={i * 70}>
              <div className={`gw-stat-value ${s.value.length > 9 ? 'gw-stat-long' : ''}`}>{s.value}</div>
              <div className="gw-stat-label">{s.label}</div>
            </Reveal>
          ))}
        </section>

        {data.achievements && data.achievements.length > 0 && (
          <Reveal as="section" className="gw-achievements" label={c.achievementsTitle}>
            <div className="gw-achievements-head">
              <h2 className="gw-h3">{c.achievementsTitle}</h2>
              <Link href="/personas#achievements" target="_blank" rel="noopener" className="gw-ext" style={{ margin: 0 }}>{c.allAchievements}</Link>
            </div>
            <ul className="gw-ach-list">
              {[...data.achievements]
                .sort((a, b) => ACHIEVEMENT_ORDER.indexOf(a.id) - ACHIEVEMENT_ORDER.indexOf(b.id))
                .map((a, i) => (
                  <Reveal as="li" key={a.id} className="gw-ach" delay={i * 70}>
                    <Pixel art={achievementIcon(a.id, 4)} />
                    <div style={{ minWidth: 0 }}>
                      <div className="gw-ach-title">{c.achievement(a.id)?.title ?? a.id}</div>
                      <div className="gw-ach-text">{c.achievement(a.id)?.text(a.value, a.realms)}</div>
                    </div>
                  </Reveal>
                ))}
            </ul>
          </Reveal>
        )}

        {next.length > 0 && (
          <Reveal as="section" className="gw-achievements" label={c.nextUpTitle}>
            <h2 className="gw-h3">{c.nextUpTitle}</h2>
            <p className="gw-next-lede">{c.nextUpLede}</p>
            <ul className="gw-ach-list">
              {next.map((p, i) => (
                <Reveal as="li" key={p.id} className="gw-ach gw-ach-next" delay={i * 70}>
                  <Pixel art={achievementIcon(p.id, 4)} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="gw-ach-title">{c.achievement(p.id).title}</div>
                    <div className="gw-ach-text">{c.progressText(p)}</div>
                    <div className="gw-progress" role="progressbar" aria-label={c.achievement(p.id).title} aria-valuemin={0} aria-valuemax={p.need} aria-valuenow={p.have}>
                      <i style={{ width: `${(p.have / p.need) * 100}%` }} />
                    </div>
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
              <p className="gw-kicker">{c.arrivedOn(data.firstTx.date, shared)}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div className="gw-pixel-label" style={{ fontSize: 24, color: '#7DB3FF' }}>{c.day}</div>
                  <CountUp className="gw-hero-num" value={data.firstTx.mainnetDay} format={fmt} />
                </div>
                <Pixel art={rocket} style={{ marginBottom: 8 }} />
              </div>
              <p className="gw-big-line" style={{ color: data.firstTx.mainnetDay === 1 ? ORANGE : undefined }}>{c.arrivalSub(data.firstTx.mainnetDay)}</p>
              {c.arrivalText(data) && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{c.arrivalText(data)}</p>}
              {!shared && data.firstTx.hash && <ExtLink href={gnoscanTx(data.firstTx.hash)}>{c.viewFirstTx}</ExtLink>}
              {steps.length > 1 && (
                <ol className="gw-timeline" aria-label={c.timelineLabel}>
                  {steps.map((t) => (
                    <li key={t.label}><span className="gw-mono">{c.short_(t.date)}</span><span>{t.label}</span></li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {show.has('ActivitySlide') && (
            <Card label="Activity" className="gw-span-6" delay={120}>
              <Pill>ACTIVITY</Pill>
              <p className="gw-kicker">{c.sentThisSeason}</p>
              <div><CountUp className="gw-hero-num" value={data.txCount} format={fmt} /></div>
              <p className="gw-big-line">{c.txPlural(data.txCount)}</p>
              <div role="img" aria-label={activePre + activePct + activePost} style={{ display: 'flex', gap: 3, marginTop: 18 }}>
                {Array.from({ length: 20 }, (_, i) => {
                  const filled = Math.round(pct / 5);
                  return <div key={i} style={{ flex: 1, height: 16, background: i < filled ? (i === filled - 1 ? ORANGE : '#3D8BFF') : '#1E2750' }} />;
                })}
              </div>
              <div className="gw-axis"><span>{c.leastActive}</span><span>{c.mostActive}</span></div>
              <p className="gw-body-strong">{c.activityLead(pct)}{activePre}<span style={{ color: ORANGE }}>{activePct}</span>{activePost}</p>
            </Card>
          )}

          {(data.calendar?.daily?.length || data.calendar?.weeks?.length) ? (
            <Card label="Calendar" className="gw-span-12">
              <Pill>CALENDAR</Pill>
              <p className="gw-kicker">{c.calendarKicker(shared)}</p>
              <ActivityCalendar data={data} />
            </Card>
          ) : null}

          <ClockCard data={data} />

          {show.has('RealmSlide') && top && (
            <Card label="Top realms" className="gw-span-12">
              <Pill>TOP REALMS</Pill>
              <div className="gw-realms">
                <div>
                  <p className="gw-kicker">{c.mostCalledRealm}</p>
                  <div className="gw-path-line">
                    <PathText path={top.path} max={48} narrowMax={30} className="gw-path-hero" />
                    {!masked(top.path) && <ExtLink href={gnoscanRealm(top.path)} className="gw-ext gw-ext-icon" label={c.openOnGnoscan(top.path)} />}
                  </div>
                  <p className="gw-func">{top.topFunc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <CountUp className="gw-hero-num" value={top.calls} format={fmt} />
                    <span className="gw-big-line">{c.callPlural(top.calls)}</span>
                  </div>
                  {c.realmOrderLine(top) && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{c.realmOrderLine(top)}</p>}
                </div>
                <ol className="gw-list">
                  {data.topRealms.slice(0, 3).map((r, i) => (
                    <Reveal as="li" key={r.path} className="gw-row" delay={200 + i * 90}>
                      <span className="gw-pixel-label" style={{ width: 24, fontSize: 14, color: i === 0 ? ORANGE : '#7DB3FF' }}>{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="gw-path-line">
                          <PathText path={r.path} max={40} narrowMax={26} className="gw-path-row" />
                          {!masked(r.path) && <ExtLink href={gnoscanRealm(r.path)} className="gw-ext gw-ext-icon" label={c.openOnGnoscan(r.path)} />}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700 }}>
                          {r.topFunc}
                          {c.realmOrderText(r) && <span className="gw-realm-order"> · {c.realmOrderText(r)}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.calls)}</span>
                    </Reveal>
                  ))}
                </ol>
              </div>
              {data.topRealms.some((r) => r.callers) && <p className="gw-hint" style={{ marginTop: 14 }}>{c.callersNote}</p>}
            </Card>
          )}

          {show.has('DefiSlide') && (
            <Card label="DeFi" className="gw-span-7">
              <Pill>DEFI</Pill>
              <p className="gw-kicker">{c.madeThisSeason}</p>
              <div><CountUp className="gw-hero-num" value={data.swaps.count} format={fmt} /></div>
              <p className="gw-big-line">{c.swapPlural(data.swaps.count)}</p>
              <div role="img" aria-label={c.weeklySwapsLabel(weekly.length, season ? c.week(busiestIdx, season.start) : '—', weekly[busiestIdx] ?? 0)} className="gw-chart">
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
                  <span>{season ? c.short_(season.start) : '—'}</span><span>{c.weeklySwaps}</span><span>{season ? c.short_(season.end) : '—'}</span>
                </div>
              </div>
              <p className="gw-body-strong">
                {c.busiestWeek}<span style={{ color: ORANGE }}>{season ? c.week(busiestIdx, season.start) : '—'}</span> · {c.swapsShort(weekly[busiestIdx] ?? 0)}
              </p>
              {(defi.length > 0 || pair) && (
                <div className="gw-defi-more">
                  {pair && <p className="gw-body-strong" style={{ margin: 0 }}>{c.favoritePair}<span style={{ color: ORANGE }}>{pair}</span></p>}
                  {defi.length > 0 && (
                    <ul className="gw-chips" aria-label={c.moreOnGnoSwap}>
                      {defi.map((l) => <li key={l.label}><strong>{l.value}</strong> {l.label}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {!shared && (
                <>
                  <ExtLink href={CONFIG.GNOSWAP_PORTFOLIO_URL}>{c.portfolio}</ExtLink>
                  <p className="gw-hint">{c.portfolioHint}</p>
                </>
              )}
            </Card>
          )}

          {show.has('FuelSlide') && (
            <Card label="Fuel" className={show.has('DefiSlide') ? 'gw-span-5' : 'gw-span-6'} delay={120}>
              <Pill>FUEL</Pill>
              <Pixel art={pump} style={{ marginTop: 6 }} />
              <p className="gw-kicker">{c.burned}</p>
              <div><CountUp className="gw-hero-num" value={gas} format={(n) => fmtGas(gas, n)} /></div>
              <p className="gw-big-line">{c.gasSpent}</p>
              <p className="gw-note">{perTxPre}<span style={{ color: ORANGE, fontWeight: 700 }}>{perTxValue}</span>{perTxPost}{c.fuelLine(gas)}</p>
              {c.successText(data) && <p className="gw-hint" style={{ marginTop: 10 }}>{c.successText(data)}</p>}
            </Card>
          )}

          {show.has('BuilderSlide') && (
            <Card label="Builder" className={show.has('FuelSlide') && !show.has('DefiSlide') ? 'gw-span-6' : 'gw-span-12'}>
              <Pill>BUILDER</Pill>
              <p className="gw-kicker">{c.deployed}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14 }}>
                <CountUp className="gw-hero-num" value={data.deployedRealms.length} format={fmt} />
                <span className="gw-big-line">{c.realmPlural(data.deployedRealms.length)}</span>
              </div>
              {c.builderHeadline(data) && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{c.builderHeadline(data)}</p>}
              <div className="gw-builder-cards">
                {builder.cards.map((b, i) => {
                  const body = (
                    <>
                      <Pixel art={door} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="gw-mono" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
                          <span style={{ color: '#A3AED6' }}><SlashWrap text={b.prefix} /></span><span style={{ fontWeight: 600 }}>{b.name}</span>
                        </div>
                        {reportOf.has(b.full) && <div className="gw-realm-use">{c.realmUseText(reportOf.get(b.full)!)}</div>}
                      </div>
                    </>
                  );
                  return (
                    <Reveal key={b.full} delay={200 + i * 90}>
                      {masked(b.full) ? <div className="gw-row">{body}</div> : (
                        <a href={gnoscanRealm(b.full)} target="_blank" rel="noopener noreferrer" title={c.openOnGnoscan(b.full)} className="gw-row gw-row-link">
                          {body}<Icon d={EXT} size={14} />
                        </a>
                      )}
                    </Reveal>
                  );
                })}
              </div>
              {builder.more > 0 && <p className="gw-body-strong" style={{ color: '#C9D3F5' }}>{c.moreRealms(builder.more)}</p>}
            </Card>
          )}

          {gov.length > 0 && (
            <Card label="Governance" className="gw-span-12">
              <Pill>GOVERNANCE</Pill>
              <p className="gw-kicker">{c.govKicker}</p>
              <ul className="gw-chips gw-chips-lg" aria-label="Governance">
                {gov.map((l) => <li key={l.label}><strong>{l.value}</strong> {l.label}</li>)}
              </ul>
            </Card>
          )}
        </div>

        {!shared && season && (
          <Reveal as="section" className="gw-card" label={c.moreWallets} style={{ marginTop: 20 }}>
            <h2 className="gw-h3">{c.moreWallets}</h2>
            <p className="gw-hint">{c.moreWalletsHint}</p>
            <WalletForm season={season.id} current={[data.address]} />
          </Reveal>
        )}

        {/* share (owner) / get your own (shared view) */}
        {shared ? (
          <Reveal as="section" id="share" className="gw-share" label={c.getYourOwn}>
            <div className="gw-share-text">
              <h2 className="gw-h2">{c.getYourOwn}</h2>
              <p className="gw-lede">{season ? c.sharedLede(season) : ''}</p>
              <div className="gw-share-actions">
                <Link className="gw-btn gw-btn-primary" href="/">{c.unwrapOwn}</Link>
                <button type="button" className="gw-btn" onClick={() => copy(window.location.href, c.linkCopied)}>
                  <Icon d={LINK} size={16} /> {c.copyLink}
                </button>
              </div>
              {season && data.shareId && (
                <CompareForm season={season.id} pair={(mine) => [mine, data.shareId!]} label={c.compareMine} placeholder={c.yourLink} />
              )}
            </div>
            {season && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="gw-og-preview" src={ogSrc} width={1200} height={630} alt={c.shareCardAlt(persona.title, data.txCount)} />
            )}
          </Reveal>
        ) : (
          <Reveal as="section" id="share" className="gw-share" label={c.shareTitle}>
            <div className="gw-share-text">
              <h2 className="gw-h2">{c.shareTitle}</h2>
              <p className="gw-lede">{persona.title} · {c.transactions(data.txCount)}</p>
              <div className="gw-share-actions">
                <a className="gw-btn gw-btn-x" href={season ? xIntentUrl(data, c.sharePost) : undefined} target="_blank" rel="noopener">
                  <XIcon size={16} /> {c.shareToX}
                </a>
                <button type="button" className="gw-btn gw-btn-discord" onClick={() => copy(c.sharePost(data), c.copied)}>
                  <DiscordIcon size={18} /> {c.copyDiscord}
                </button>
                <button type="button" className="gw-btn" onClick={() => copy(link, c.linkCopied)}>
                  <Icon d={LINK} size={16} /> {c.copyLink}
                </button>
                <button type="button" className="gw-btn" onClick={download}>
                  <Icon d={['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14']} size={16} /> {c.downloadImage}
                </button>
              </div>
              <p className="gw-hint" style={{ marginTop: 12 }}>{c.shareHint}</p>
              {season && data.shareId && (
                <CompareForm season={season.id} pair={(theirs) => [data.shareId!, theirs]} label={c.compareFriend} placeholder={c.theirLink} />
              )}
            </div>
            {season && (
              // What X and Discord show for the link.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="gw-og-preview" src={ogSrc} width={1200} height={630} alt={c.shareCardAlt(persona.title, data.txCount)} />
            )}
          </Reveal>
        )}
      </main>

      <Footer dataAsOf={data.dataAsOf} final={data.final}>
        <button type="button" className="gw-btn gw-btn-ghost" onClick={() => router.push('/')}>{c.unwrapAnother}</button>
      </Footer>

      {/* hidden 1080x1920 capture target for "Download image" (offscreen, not display:none) */}
      {!shared && (
        <div id="gw-summary-export" aria-hidden="true" style={{ position: 'absolute', left: -20000, top: 0, width: 1080, height: 1920, pointerEvents: 'none' }}>
          <SummaryExport vm={exportVm(data, c)} />
        </div>
      )}

      {(story ?? storyInUrl) && season && <StoryMode data={data} onClose={() => setStory(false)} />}
      {toast && <div role="status" className="gw-toast">{toast}</div>}
      {errors.length > 0 && <DataErrorBanner errors={errors} />}
    </div>
  );
}
