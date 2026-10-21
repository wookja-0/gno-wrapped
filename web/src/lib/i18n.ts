/**
 * Copy in English and Korean. English reuses the display rules in wrapped.ts as they are (their tests
 * pin the wording); Korean has its own versions with the same inputs. Components pick one with
 * useCopy() (components/useLocale.ts). Persona names come from the batch in English, so they're
 * translated here by persona id.
 */
import {
  ACHIEVEMENTS, activityLead, arrivalSub, arrivalText, builderHeadline, countdownText, dayText, dayTxAction, defiLines, fmt, fmtDate,
  fmtGas, fmtShort, fuelLine, governanceLines, MILESTONES, personaRankText, personaRuleText, personaWhy, plural, RANK_METRIC,
  realmUseText, rankTopPct, SHARE, shareLink, sharePost, successText, summaryRank, topPairText, visitDiff, visitSnapshot, weekRange, weekText,
  xLength, X_MAX, ACHIEVEMENT_ORDER, MONTHS, progressText, realmOrderLine, realmOrderText, CHRONOTYPES, chronotypeLine, hourLabel, hourText,
  type AchievementId, type CalendarCell, type Chronotype, type Progress, type DayTx, type MilestoneId, type PersonaRule, type RankMetric, type RealmReport,
  type Season, type VisitSnapshot, type WrappedData,
} from './wrapped';

export type Locale = 'en' | 'ko';
export const LOCALES: Locale[] = ['en', 'ko'];
export const LOCALE_NAMES: Record<Locale, string> = { en: 'EN', ko: '한국어' };

const n = (s: Season) => s.id.replace(/^s/i, '');

const en = {
  // chrome
  viewOnGnoscan: 'View on Gnoscan', share: 'Share', home: 'Gno Wrapped home', language: 'Language',
  dataAsOf: (d: string) => `Data as of ${d} · `, builtFrom: 'Built from public on-chain data', finalResults: 'Final results',
  updatedLive: 'Updated live', source: 'Source', unwrapAnother: 'Unwrap another address', full: 'FULL', short: 'SHORT',
  openOnGnoscan: (what: string) => `Open ${what} on Gnoscan`,
  live: 'LIVE', final: 'FINAL', liveLabel: 'Live season stats', finalLabel: 'Final season stats',
  addresses: (x: number) => `${fmt(x)} addresses`, transactions: (x: number) => `${fmt(x)} transactions`,
  block: (h: number) => `block #${fmt(h)}`, blockOnGnoscan: (h: number) => `Block ${fmt(h)} on Gnoscan`,
  countdown: countdownText,
  date: fmtDate, short_: fmtShort, week: weekRange, month: (m: number) => MONTHS[m], badge: (title: string) => `${title} badge`,

  // intro
  introTitle: (s: Season) => `Your Mainnet Season ${n(s)} on gno.land`,
  introLede: 'Your first season on gno.land mainnet, unwrapped: when you arrived, the realms you called, your swaps, your gas and your persona.',
  connectAdena: 'Connect Adena', orPaste: 'or paste an address', walletAddress: 'Wallet address', unwrap: 'Unwrap',
  trySample: 'Try a sample:', sampleActive: 'Active wallet', sampleEmpty: 'No activity',
  meetPersonas: 'Meet the 8 season personas →', seeSeason: 'See the whole season →',
  errEmpty: 'Paste a g1… address first.', errInvalid: "That doesn't look like a gno.land address. It starts with g1 and is 40 characters long.",
  errNoAdena: 'Adena wallet not found. Install it from adena.app, or paste your address below.',
  errAdenaRead: "Couldn't read an address from Adena. Paste it below instead.", errAdenaCancel: 'Adena connection was cancelled. Try again, or paste your address below.',

  // several wallets
  walletsTitle: 'Your wallets, together', walletsLabel: 'Wallets',
  walletsLede: (x: number, s: Season) => `${fmt(x)} wallets in Mainnet Season ${n(s)}, added up. Personas, ranks and achievements are decided for each wallet, so they stay per wallet.`,
  walletNoActivity: 'No activity this season', removeWallet: (short: string) => `Remove ${short}`,
  addWallet: 'Add a wallet', add: 'Add',
  addWalletHint: (max: number) => `Up to ${max} wallets. This page's link lists their addresses, so share it only if you mean to.`,
  moreWallets: 'More than one wallet?', moreWalletsHint: 'Add another address to see your wallets added up.',
  errWalletDup: 'That wallet is already here.', errWalletsMax: (max: number) => `Up to ${max} wallets at a time.`,
  introSeveral: 'Several wallets? Paste their addresses separated by commas.',
  statActiveDays: 'Active days', statStreak: 'Longest streak', statDays: (x: number) => `${fmt(x)} ${plural(x, 'day', 'days')}`,
  combinedRealms: 'Most-called realms across your wallets', combinedAchievements: 'Achievements, by wallet',
  achievementWallets: (x: number, of: number) => `${fmt(x)} of ${fmt(of)} wallets`,

  // status screens
  loading: 'Counting your blocks…', loadingShort: 'Loading…',
  emptyTitle: 'Your story starts next season.', emptyTx: (label: string) => `${label} transactions`,
  emptyLive: "No on-chain moves from this address yet. Make your first one on gno.land and there'll be something to unwrap.",
  emptyFinal: (label: string) => `This address made no on-chain moves in Mainnet ${label}, which is now over.`,
  emptyLiveNote: 'New activity shows up within a minute.', tryAnother: 'Try another address', ready: 'READY',
  notYet: 'NOT YET', noActivity: 'NO ACTIVITY', seasonLabel: (s: string) => `Season ${s.replace(/^s/i, '')}`,

  // persona copy
  personaTitle: (id: string, fallback: string) => fallback || id,
  personaLine: (id: string, fallback: string) => fallback,
  personaWhy, personaRankText, personaRule: personaRuleText,
  rankedBy: (m: RankMetric) => `ranked by ${RANK_METRIC[m]}`, rankedByFull: (m: RankMetric) => `Ranked by ${RANK_METRIC[m]}.`,
  topPct: (r: Parameters<typeof rankTopPct>[0]) => `top ${rankTopPct(r)}%`,
  noRanking: 'No ranking: everyone here is just getting started.',
  seasonPersona: (shared: boolean) => (shared ? 'Season persona' : 'Your season persona'), howPersonasWork: 'How personas work ↗',
  playStory: (shared: boolean) => (shared ? '▶ Play the story' : '▶ Play your story'),

  // headline stats (page + image download)
  statTransactions: 'Transactions', statArrived: 'Arrived on mainnet', statDay: (x: number | string) => `Day ${x}`,
  statDeployed: 'Realms deployed', statSwaps: 'Swaps on GnoSwap', statGas: 'Gas spent', statRank: summaryRank,
  glance: 'Season at a glance',

  // achievements, arrival, timeline
  achievementsTitle: 'Achievements', allAchievements: 'All achievements ↗',
  achievement: (id: AchievementId) => ACHIEVEMENTS[id],
  milestone: (id: MilestoneId) => MILESTONES[id], firstTransaction: 'First transaction', timelineLabel: 'Season timeline',
  nextUpTitle: 'Next up', nextUpLede: 'Still in reach before the season ends.', progressText: (p: Progress) => progressText(p),
  arrivedOn: (date: string, shared: boolean) => `${shared ? 'They' : 'You'} arrived on ${fmtDate(date)}`,
  day: 'DAY', arrivalSub, arrivalText, viewFirstTx: 'View your first transaction',

  // activity
  sentThisSeason: 'This season you sent', txPlural: (x: number) => plural(x, 'transaction', 'transactions'),
  leastActive: 'Least active', mostActive: 'Most active', activityLead,
  moreActiveThan: (pct: number) => ['More active than ', `${pct}%`, ' of addresses'] as const,

  // calendar and day list
  calendarKicker: (shared: boolean) => (shared ? 'The season, week by week' : 'Your season, day by day'),
  activeDays: (x: number) => plural(x, 'active day', 'active days'),
  streak: (x: number) => `Longest streak: ${fmt(x)} ${plural(x, 'day', 'days')} in a row`,
  perDay: 'Transactions per day', perWeek: 'Active days per week',
  hintDay: 'Hover, or use the arrow keys; click a day for its list', hintWeek: 'Hover a week, or use the arrow keys',
  dayText, weekText, less: 'Less', more: 'More', zeroDays: '0 days', sevenDays: '7 days',
  daysWithTx: (x: number) => `${fmt(x)} ${plural(x, 'day', 'days')} with transactions`,
  activeDaysInAll: (x: number) => `${fmt(x)} active ${plural(x, 'day', 'days')} in all`,
  colDay: 'Day', colWeek: 'Week of', colTransactions: 'Transactions', colActiveDays: 'Active days', ofSeven: (x: number) => `${x} of 7`,
  noActivityYet: 'No activity yet.', chart: 'Chart', table: 'Table', viewOf: (label: string) => `${label}: view`, asTable: (label: string) => `${label} as a table`,
  dayTitle: (date: string, count: number) => [fmtShort(date), `· ${fmt(count)} ${plural(count, 'transaction', 'transactions')}`] as const,
  dayRegion: (date: string) => `Transactions on ${fmtShort(date)}`, closeDay: 'Close the day',
  dayLoadFailed: "Couldn't load this day.", tryAgain: 'Try again', dayTxAction,
  moreMessages: (x: number) => `+${x} more ${plural(x, 'message', 'messages')}`, gnoscan: 'Gnoscan',
  txAt: (time: string) => `Transaction at ${time} on Gnoscan`, moreThatDay: (x: number) => `+${fmt(x)} more that day on Gnoscan`,
  moreThatDayFrom: (x: number, short: string) => `+${fmt(x)} more from ${short} that day on Gnoscan`, fromWallet: (short: string) => `From ${short}`,
  timesUtc: 'Times are UTC.', pages: 'Pages', range: (a: number, b: number, of: number) => `${fmt(a)}–${fmt(b)} of ${fmt(of)}`,
  prevPage: 'Previous page', nextPage: 'Next page', page: (x: number) => `Page ${x}`,

  // time of day
  clockKicker: 'Your day on gno.land', chronotype: (id: Chronotype) => CHRONOTYPES[id],
  chronotypeLine: (t: { from: number; share: number }) => chronotypeLine(t),
  perHour: 'Transactions by hour of day', colHour: 'Hour', hourText, hourLabel, hintHour: 'Hover, or use the arrow keys',
  busiestHour: (h: number) => ['Busiest hour: ', hourLabel(h)] as const,
  clockTz: (tz: string, rounded: boolean) => `Hours in your time zone (${tz})${rounded ? ', to the nearest hour' : ''}.`,

  // realms, DeFi, fuel, builder, governance
  realmOrderText, realmOrderLine, callersNote: 'Callers in order of their first call; the realm\'s deployer and bots aren\'t counted.',
  mostCalledRealm: 'Your most-called realm', callPlural: (x: number) => plural(x, 'call', 'calls'),
  callsCount: (x: number) => `${fmt(x)} ${plural(x, 'call', 'calls')}`,
  madeThisSeason: 'This season you made', swapPlural: (x: number) => plural(x, 'swap on GnoSwap', 'swaps on GnoSwap'),
  weeklySwaps: 'Weekly swaps', busiestWeek: 'Busiest week: ', swapsShort: (x: number) => `${x} ${plural(x, 'swap', 'swaps')}`,
  weeklySwapsLabel: (weeks: number, range: string, x: number) => `Weekly swaps across ${weeks} weeks. Busiest week ${range} with ${x} swaps.`,
  favoritePair: 'Favorite pair: ', topPairText, defiLines, moreOnGnoSwap: 'More on GnoSwap',
  portfolio: 'Open your GnoSwap portfolio', portfolioHint: 'Connect this wallet on GnoSwap to see its positions.',
  burned: 'You burned', gasSpent: 'GNOT spent on gas', perTx: (x: string) => ["That's about ", `${x} GNOT`, ' per transaction. '] as const,
  fuelLine, successText,
  deployed: 'You deployed', realmPlural: (x: number) => plural(x, 'realm', 'realms'), builderHeadline, realmUseText,
  moreRealms: (x: number) => `+${fmt(x)} more`,
  govKicker: "On gno.land's GovDAO and GnoSwap governance you made", governanceLines,

  // share
  shareTitle: 'Share your Wrapped', shareToX: 'Share to X', copyDiscord: 'Copy for Discord', copyLink: 'Copy link',
  downloadImage: 'Download image', shareHint: 'The link and images never show your address.',
  copied: 'Copied — paste it in Discord', linkCopied: 'Link copied', copyFailed: "Couldn't copy", saved: (f: string) => `Saved ${f}`,
  saveFailed: "Couldn't save the image", sharePost,
  getYourOwn: 'Get your own Gno Wrapped', unwrapOwn: 'Unwrap your own',
  sharedLede: (s: Season) => `Someone shared their Mainnet Season ${n(s)} on gno.land with you. Paste your address or connect Adena to unwrap yours.`,
  shareCardAlt: (title: string, x: number) => `Share card: ${title}, ${fmt(x)} transactions`,

  // since your last visit
  sinceVisit: (since: string) => `Since your last visit on ${since}`, sinceVisitRegion: 'Since your last visit', dismiss: 'Dismiss',
  visitDiff: (prev: VisitSnapshot, d: WrappedData) => visitDiff(prev, d), visitDate: (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),

  // compare
  compareFriend: 'Compare with a friend: paste their share link', compareMine: 'Already have yours? Compare it with this one',
  theirLink: 'Their share link', yourLink: 'Your share link', compare: 'Compare',
  compareErr: 'That doesn’t look like a share link. It ends in /s/ and a 12-character ID.',
  compareTitle: 'Two recaps, side by side',
  compareLede: (s: Season) => `Mainnet Season ${n(s)} on gno.land, compared from two share links. Neither address is shown.`,
  openRecap: 'Open recap', compareAnother: 'Compare another', compareAnotherHint: 'Paste another share link to put it next to A.',
  compareCaption: 'Recap A and recap B; ▲ marks the one ahead in each row', stat: 'Stat', ahead: 'ahead', noneYet: 'None yet',
  compareLabel: (label: string) => label, comparison: 'Comparison', persona: 'Persona',
  recapWeeks: (side: string, weeks: number[]) => `Recap ${side}: ${weeks.join(', ')} active days per week`,
  weekOf: (range: string, x: number) => `Week of ${range}: ${x} of 7 days`,

  // personas page
  personasPill: 'SEASON PERSONAS', personasTitle: 'Eight personas, one per address',
  personasLede: "Your persona isn't a score or a rank. It's one label picked from your on-chain activity this season: the rules below are checked in order, and the first one that fits is yours.",
  personasUnavailable: "Persona data isn't available right now.",
  ofAddresses: (pct: number) => `${pct.toFixed(1)}% of addresses`,
  shareOfAddresses: (pct: number, x: number) => `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% · ${fmt(x)} addresses`,
  achievementsLede: 'On top of your persona, collect any of these. They show on your recap when you have them.',
  achievementShare: (pct: number, x: number) => `${pct.toFixed(1)}% · ${fmt(x)} addresses`,
  personasNote: (x: number, s: Season, asOf: string) => `Based on ${fmt(x)} addresses with activity in Mainnet Season ${n(s)}, as of ${asOf}. "Moves" are the messages inside your transactions; wugnot counts as DeFi because it wraps GNOT for GnoSwap. Your rank within your persona is shown only on your own recap; there is no public list.`,
  findPersona: 'Find your persona', wholeSeason: 'The whole season →',

  // season page
  seasonTitle: (s: Season) => `Mainnet Season ${n(s)}, all of gno.land`,
  seasonLede: (final: boolean) => `Every address, every realm and every block of the season${final ? '' : ' so far'}: the chain's own recap, built from the same public data as yours.`,
  seasonUnavailable: "Season data isn't available right now.", inNumbers: 'The season in numbers',
  seasonStats: { addresses: 'Addresses', transactions: 'Transactions', swaps: 'Swaps on GnoSwap', deployed: 'Realms deployed', gas: 'GNOT spent on gas' },
  busiestDay: 'Busiest day: ', newAddresses: 'New addresses per day',
  arrivalsLine: (total: number, final: boolean) => `${fmt(total)} ${plural(total, 'address', 'addresses')} ${final ? 'this season' : 'so far'}`,
  mostArrived: '; the most arrived on ', mostUsedRealms: (x: number) => `Most-used realms, by addresses that called them (${fmt(x)} realms called in all)`,
  addressesWord: 'addresses', seasonNote: (asOf: string) => `Data as of ${asOf}. Counts are successful transactions; days are UTC. A realm path can contain the address of whoever deployed it, as on any explorer.`,
  findRecap: 'Find your recap', personasAndAchievements: 'Personas and achievements →',
  peak: (text: string) => `Peak: ${text}`, nothingYet: 'Nothing yet.', inAll: (x: number, unit: string) => `${fmt(x)} ${unit} in all`,
  unitTx: ['transaction', 'transactions'] as const, unitNewAddress: ['new address', 'new addresses'] as const,
  dayValue: (x: number, unit: readonly [string, string], date: string) => `${fmt(x)} ${plural(x, unit[0], unit[1])} on ${fmtShort(date)}`,
  dayFuture: (date: string) => `${fmtShort(date)} hasn't happened yet`,

  // story
  story: {
    label: 'Season story', close: 'Close the story', paused: ' · PAUSED', hint: 'Tap or → for next · hold to pause',
    introTitle: (shared: boolean, s: Season) => `${shared ? 'A' : 'Your'} Mainnet Season ${n(s)} on gno.land`, introLine: "Let's unwrap it.",
    arrived: (shared: boolean, date: string) => `${shared ? 'They' : 'You'} arrived on ${fmtDate(date)}`,
    dayOne: 'Here from the start.', ofMainnet: 'of mainnet',
    sent: (shared: boolean) => `This season ${shared ? 'they' : 'you'} sent`,
    moreActive: (pct: number) => ['More active than ', `${pct}%`, ' of addresses.'] as const,
    showedUp: (shared: boolean) => `${shared ? 'They' : 'You'} showed up on`, dayPlural: (x: number) => plural(x, 'day', 'days'),
    streak: (x: number) => ['Longest streak: ', `${fmt(x)} ${plural(x, 'day', 'days')}`, ' in a row.'] as const,
    byTheClock: "By the clock, you're", clockSub: (h: number, tz: string) => `Busiest hour: ${hourLabel(h)} (${tz})`,
    topRealm: (shared: boolean) => `${shared ? 'Their' : 'Your'} most-called realm`,
    callsMostly: (x: number, fn: string) => `${plural(x, 'call', 'calls')}, mostly ${fn}`,
    onGnoSwap: (shared: boolean) => `On GnoSwap ${shared ? 'they' : 'you'} made`, swapPlural: (x: number) => plural(x, 'swap', 'swaps'),
    deployed: (shared: boolean) => `${shared ? 'They' : 'You'} deployed`,
    builderLine: (d: WrappedData) => { const h = builderHeadline(d); return h && d.shared ? h.replace('Your', 'Their') : h; },
    hadSay: (shared: boolean) => `${shared ? 'They' : 'You'} had a say`, unlocked: (shared: boolean) => `${shared ? 'They' : 'You'} unlocked`,
    persona: (shared: boolean) => `${shared ? 'Their' : 'Your'} season persona`,
    outro: (shared: boolean, s: Season, final: boolean) => `That's ${shared ? 'their' : 'your'} Mainnet Season ${n(s)}${final ? '' : ' so far'}.`,
  },

  // image download
  imagePersona: 'Your season persona', imageTopRealm: 'Top realm',
};

// English literals widened to string, so the Korean copy can say other things in the same shapes.
type Widen<T> = T extends string ? string
  : T extends readonly [infer A, infer B, infer C] ? readonly [Widen<A>, Widen<B>, Widen<C>]
  : T extends readonly [infer A, infer B] ? readonly [Widen<A>, Widen<B>]
  : T extends (...a: infer P) => infer R ? (...a: P) => Widen<R>
  : T extends object ? { [K in keyof T]: Widen<T[K]> }
  : T;
export type Copy = Widen<typeof en>;

// ---------- Korean ----------

const MON = (iso: string) => Number(iso.slice(5, 7));
const DAY = (iso: string) => Number(iso.slice(8, 10));
const koShort = (iso: string) => `${MON(iso)}월 ${DAY(iso)}일`;
const koDate = (iso: string) => `${iso.slice(0, 4)}년 ${koShort(iso)}`;
function koWeek(i: number, start: string): string {
  const s = new Date(Date.parse(start) + i * 7 * 864e5).toISOString().slice(0, 10);
  const e = new Date(Date.parse(s) + 6 * 864e5).toISOString().slice(0, 10);
  return MON(s) === MON(e) ? `${koShort(s)}–${DAY(e)}일` : `${koShort(s)}–${koShort(e)}`;
}

const KO_PERSONA: Record<string, [string, string]> = {
  builder: ['빌더', '메인넷에 직접 코드를 올렸어요.'],
  'day-one-explorer': ['첫날 탐험가', '지도가 그려지기도 전에 이미 와 있었어요.'],
  'realm-hopper': ['렐름 호퍼', '한 렐름에 오래 머무른 적이 없어요.'],
  'defi-pilot': ['디파이 파일럿', '스왑, 풀, 스테이킹까지. GnoSwap이 본거지였어요.'],
  collector: ['컬렉터', 'gno.land 곳곳에서 민팅하고 사들였어요.'],
  'player-one': ['플레이어 원', '온체인 게임에 가장 많은 무브를 썼어요.'],
  'gnot-courier': ['GNOT 배달부', '지갑 사이로 GNOT을 부지런히 날랐어요.'],
  'first-steps': ['첫걸음', '누구나 처음은 있어요.'],
};
const koTitle = (id: string, fallback: string) => KO_PERSONA[id]?.[0] ?? fallback;
const KO_METRIC: Record<RankMetric, string> = {
  deployed: '배포한 렐름 수', firstTx: '첫 트랜잭션 시점', realms: '호출한 렐름 수', defi: 'GnoSwap·wugnot 무브 수',
  collect: 'NFT 민팅·구매 수', play: '온체인 게임 무브 수', transfer: 'GNOT 전송 수',
};
const KO_CATEGORY: Record<string, string> = { defi: 'GnoSwap과 wugnot', collect: 'NFT 민팅·구매', play: '온체인 게임' };
const pct = (x: number) => `${Math.round(x * 100)}%`;

const KO_ACH: Record<AchievementId, { title: string; rule: string; text: (v?: number, realms?: string[]) => string }> = {
  early: { title: '얼리 어라이벌', rule: '메인넷에 도착한 첫 1,000개 주소 안에 들었어요.', text: (v) => `메인넷 첫 ${fmt(v ?? 1000)}명 안에 들었어요.` },
  pioneer: {
    title: '렐름 개척자', rule: '50개 이상 주소가 쓰는 렐름을 처음 호출한 10명 안에 들었어요(배포자는 제외).',
    text: (v = 1, realms) => (realms?.length ? (v === 1 ? `${realms[0]}을(를) 처음 호출한 10명 중 하나예요.` : `인기 렐름 ${fmt(v)}곳을 처음 호출한 10명 안에 들었어요. ${realms[0]} 포함.`) : `인기 렐름 ${fmt(v)}곳을 처음 호출한 10명 안에 들었어요.`),
  },
  citizen: { title: '시티즌', rule: 'gno.land GovDAO나 GnoSwap 거버넌스 제안에 투표하거나 제안했어요.', text: (v = 1) => `이번 시즌 거버넌스 투표·제안 ${fmt(v)}회.` },
  streak: { title: '온 어 롤', rule: '3일 이상 연속으로 활동했어요(UTC 기준).', text: (v) => `${fmt(v ?? 3)}일 연속 gno.land에서 활동했어요.` },
  'triple-threat': { title: '트리플 스렛', rule: '디파이, NFT, 온체인 게임을 모두 써봤어요.', text: () => '디파이, NFT, 온체인 게임. 셋 다 해봤어요.' },
  'gas-saver': { title: '가스 세이버', rule: '트랜잭션 5회 이상이면서 트랜잭션당 가스가 하위 10%예요.', text: () => '이번 시즌 트랜잭션당 가스가 가장 적은 편이에요.' },
  'validators-friend': { title: '밸리데이터의 친구', rule: '낸 가스 총액이 상위 10%예요.', text: () => '가스 총액 상위 10%. 밸리데이터가 고마워해요.' },
  century: { title: '센추리', rule: '이번 시즌 트랜잭션 100회 이상.', text: (v) => `이번 시즌 트랜잭션 ${fmt(v ?? 100)}회.` },
};
const KO_TRY: Record<NonNullable<Progress['missing']>[number], string> = { defi: '디파이', collect: 'NFT', play: '온체인 게임' };
const KO_CHRONO: Record<Chronotype, string> = { 'night-owl': '올빼미형', 'early-bird': '아침형', afternoon: '오후형', evening: '저녁형' };
const KO_MILESTONE: Record<MilestoneId, string> = { 'first-swap': 'GnoSwap 첫 스왑', 'first-collect': '첫 NFT 민팅·구매', 'first-deploy': '첫 렐름 배포', 'tx-100': '100번째 트랜잭션' };

function koSharePost(d: WrappedData): string {
  // the same lines as the English post, in Korean; X counts Hangul as 2, so check the length too
  const p = d.percentile || 0;
  const rank = p >= 50 ? `주소 중 상위 ${Math.max(1, 100 - p)}%` : p >= 25 ? `주소의 ${p}%보다 활발` : '';
  const day = d.firstTx?.mainnetDay;
  const lines = [
    d.persona?.title && `🏷️ 페르소나: ${koTitle(d.persona.id, d.persona.title)}`,
    `📈 트랜잭션 ${fmt(d.txCount)}회${rank ? ` · ${rank}` : ''}`,
    day ? `🚀 ${day === 1 ? '메인넷 첫날부터' : `메인넷 ${day}일차에 도착`}${d.arrival?.tier && d.arrival.tier <= 1000 ? ` · 첫 ${fmt(d.arrival.tier)}명 안` : ''}` : '',
    d.deployedRealms?.length ? `🛠️ 렐름 ${fmt(d.deployedRealms.length)}개 배포` : '',
    d.swaps?.count ? `🔄 GnoSwap 스왑 ${fmt(d.swaps.count)}회` : '',
  ].filter(Boolean) as string[];
  const link = shareLink(d), tag = SHARE.HASHTAG;
  const head = `나의 메인넷 시즌 ${n(d.season)}, gno.land${d.final ? ' 최종 결산' : ''} 🎁`;
  const build = (body: string[]) => [head, '', ...body, '', '내 것도 열어보기 👇', link, '', tag].join('\n');
  let post = build(lines);
  for (let k = lines.length - 1; k >= 2 && xLength(post) > X_MAX; k--) post = build(lines.slice(0, k)); // optional lines go first
  return post;
}

const ko: Copy = {
  ...en,
  viewOnGnoscan: 'Gnoscan에서 보기', share: '공유', home: 'Gno Wrapped 홈', language: '언어',
  dataAsOf: (d) => `${d} 기준 · `, builtFrom: '공개 온체인 데이터로 만들었어요', finalResults: '최종 결과', updatedLive: '실시간 반영',
  source: '소스', unwrapAnother: '다른 주소 열어보기', full: '전체', short: '줄이기', openOnGnoscan: (w) => `Gnoscan에서 ${w} 열기`,
  liveLabel: '실시간 시즌 통계', finalLabel: '시즌 최종 통계',
  addresses: (x) => `주소 ${fmt(x)}개`, transactions: (x) => `트랜잭션 ${fmt(x)}건`, block: (h) => `블록 #${fmt(h)}`, blockOnGnoscan: (h) => `Gnoscan에서 블록 ${fmt(h)} 보기`,
  countdown: (s, left) => (left === 0 ? `메인넷 시즌 ${n(s)} 마지막 날` : `메인넷 시즌 ${n(s)} 종료까지 ${fmt(left)}일`),
  date: koDate, short_: koShort, week: koWeek, month: (m) => `${m + 1}월`, badge: (t) => `${t} 배지`,

  introTitle: (s) => `gno.land에서 보낸 나의 메인넷 시즌 ${n(s)}`,
  introLede: 'gno.land 메인넷 첫 시즌을 풀어봐요. 언제 도착했는지, 어떤 렐름을 불렀는지, 스왑과 가스, 그리고 나의 페르소나까지.',
  connectAdena: 'Adena 연결', orPaste: '또는 주소 붙여넣기', walletAddress: '지갑 주소', unwrap: '열어보기',
  trySample: '샘플 보기:', sampleActive: '활발한 지갑', sampleEmpty: '활동 없음',
  meetPersonas: '시즌 페르소나 8종 보기 →', seeSeason: '시즌 전체 보기 →',
  errEmpty: '먼저 g1… 주소를 붙여넣어 주세요.', errInvalid: 'gno.land 주소가 아닌 것 같아요. g1으로 시작하는 40자 주소예요.',
  errNoAdena: 'Adena 지갑을 찾지 못했어요. adena.app에서 설치하거나 아래에 주소를 붙여넣어 주세요.',
  errAdenaRead: 'Adena에서 주소를 읽지 못했어요. 아래에 직접 붙여넣어 주세요.', errAdenaCancel: 'Adena 연결이 취소됐어요. 다시 시도하거나 아래에 주소를 붙여넣어 주세요.',

  walletsTitle: '내 지갑 모아보기', walletsLabel: '지갑',
  walletsLede: (x, s) => `메인넷 시즌 ${n(s)}의 지갑 ${fmt(x)}개를 합쳤어요. 페르소나·순위·업적은 지갑마다 따로 정해져서 지갑별로 보여줘요.`,
  walletNoActivity: '이번 시즌 활동 없음', removeWallet: (short) => `${short} 빼기`,
  addWallet: '지갑 추가', add: '추가',
  addWalletHint: (max) => `최대 ${max}개까지. 이 페이지 링크에는 주소들이 들어 있으니 공유할 때 주의하세요.`,
  moreWallets: '지갑이 여러 개인가요?', moreWalletsHint: '다른 주소를 추가하면 지갑들을 합쳐서 볼 수 있어요.',
  errWalletDup: '이미 추가한 지갑이에요.', errWalletsMax: (max) => `한 번에 최대 ${max}개까지예요.`,
  introSeveral: '지갑이 여러 개라면 주소를 쉼표로 구분해 붙여넣으세요.',
  statActiveDays: '활동일', statStreak: '최장 연속', statDays: (x) => `${fmt(x)}일`,
  combinedRealms: '지갑 전체에서 가장 많이 호출한 렐름', combinedAchievements: '지갑별 업적',
  achievementWallets: (x, of) => `지갑 ${fmt(of)}개 중 ${fmt(x)}개`,

  loading: '블록을 세고 있어요…', loadingShort: '불러오는 중…',
  emptyTitle: '이야기는 다음 시즌에 시작돼요.', emptyTx: (label) => `${label} 트랜잭션`,
  emptyLive: '이 주소는 아직 온체인 활동이 없어요. gno.land에서 첫 활동을 하면 열어볼 게 생겨요.',
  emptyFinal: (label) => `이 주소는 메인넷 ${label} 동안 온체인 활동이 없었어요. 시즌은 끝났어요.`,
  emptyLiveNote: '새 활동은 1분 안에 반영돼요.', tryAnother: '다른 주소 넣기', ready: 'READY',
  seasonLabel: (s) => `시즌 ${s.replace(/^s/i, '')}`,

  personaTitle: koTitle,
  personaLine: (id, fallback) => KO_PERSONA[id]?.[1] ?? fallback,
  personaWhy: (d) => {
    const p = d.persona, s = p?.share ? pct(p.share) : '';
    switch (p?.id) {
      case 'builder': return `메인넷에 렐름 ${fmt(d.deployedRealms.length)}개를 배포했어요.`;
      case 'day-one-explorer': return `첫 트랜잭션이 메인넷 ${d.firstTx?.mainnetDay ?? '?'}일차에 있었어요.`;
      case 'realm-hopper': return `서로 다른 렐름 ${fmt(d.realmCount ?? d.topRealms.length)}곳을 호출했어요.`;
      case 'defi-pilot': return `무브의 ${s}가 GnoSwap과 wugnot이었어요.`;
      case 'collector': return `무브의 ${s}가 NFT 민팅·구매였어요.`;
      case 'player-one': return `무브의 ${s}가 온체인 게임이었어요.`;
      case 'gnot-courier': return `트랜잭션 ${fmt(d.txCount)}회 중 무브의 ${s}가 GNOT 전송이었어요.`;
      case 'first-steps': return `트랜잭션 ${fmt(d.txCount)}회, 첫걸음이에요.`;
    }
    return '';
  },
  personaRankText: (d) => (d.personaRank && d.persona ? `${koTitle(d.persona.id, d.persona.title)} ${fmt(d.personaRank.of)}명 중 ${fmt(d.personaRank.rank)}위` : null),
  personaRule: (r: PersonaRule) => {
    switch (r.kind) {
      case 'deployed': return `메인넷에 렐름을 ${r.min}개 이상 배포했어요.`;
      case 'firstDay': return `메인넷 첫 ${r.max}일 안에 첫 트랜잭션을 보냈어요.`;
      case 'realms': return `서로 다른 렐름을 ${r.min}곳 이상 호출했어요.`;
      case 'share': return `무브의 ${pct(r.min)} 이상이 ${KO_CATEGORY[r.category]}였어요.`;
      case 'transfers': return `대부분 GNOT 전송이고, 트랜잭션이 ${r.min}회 이상이에요.`;
      case 'fallback': return '그 밖의 모두: GNOT 전송 한두 번.';
    }
  },
  rankedBy: (m) => `${KO_METRIC[m]} 기준`, rankedByFull: (m) => `${KO_METRIC[m]} 기준으로 순위를 매겨요.`,
  topPct: (r) => `상위 ${rankTopPct(r)}%`, noRanking: '순위 없음: 다들 막 시작했어요.',
  seasonPersona: (shared) => (shared ? '시즌 페르소나' : '나의 시즌 페르소나'), howPersonasWork: '페르소나 기준 보기 ↗',
  playStory: () => '▶ 스토리로 보기',

  statTransactions: '트랜잭션', statArrived: '메인넷 도착', statDay: (x) => `${x}일차`, statDeployed: '배포한 렐름', statSwaps: 'GnoSwap 스왑',
  statGas: '쓴 가스', statRank: (p) => (p >= 90 ? { value: `상위 ${Math.max(1, 100 - p)}%`, label: '가장 활발한 주소' } : { value: `${p}%`, label: '보다 활발해요' }),
  glance: '시즌 한눈에 보기',

  achievementsTitle: '업적', allAchievements: '전체 업적 ↗', achievement: (id) => KO_ACH[id],
  milestone: (id) => KO_MILESTONE[id], firstTransaction: '첫 트랜잭션', timelineLabel: '시즌 타임라인',
  nextUpTitle: '다음 업적', nextUpLede: '시즌이 끝나기 전에 아직 얻을 수 있어요.',
  progressText: (p) => {
    switch (p.id) {
      case 'century': return `트랜잭션 ${fmt(p.have)}/${fmt(p.need)}회. ${fmt(p.need - p.have)}회 남았어요.`;
      case 'streak': return p.have ? `지금까지 ${fmt(p.have)}일 연속. ${fmt(p.need)}일까지 이어가 보세요.` : `${fmt(p.need)}일 연속으로 활동해 보세요(UTC 기준).`;
      case 'triple-threat': return `${p.have}/${p.need} 완료. 남은 것: ${(p.missing ?? []).map((m) => KO_TRY[m]).join(', ')}.`;
      case 'citizen': return 'GovDAO나 GnoSwap 거버넌스 제안에 투표해 보세요.';
    }
  },
  arrivedOn: (date) => `${koDate(date)}에 도착`, day: 'DAY',
  arrivalSub: (day) => (day === 1 ? '처음부터 함께였어요.' : '메인넷 일차'),
  arrivalText: (d) => (d.arrival?.order ? `메인넷 도착 순서 ${fmt(d.arrival.of)}명 중 ${fmt(d.arrival.order)}번째` : d.arrival?.tier ? `메인넷 첫 ${fmt(d.arrival.tier)}명 안` : null),
  viewFirstTx: '첫 트랜잭션 보기',

  sentThisSeason: '이번 시즌 보낸 트랜잭션', txPlural: () => '건', leastActive: '덜 활발', mostActive: '가장 활발',
  activityLead: (p) => (p < 25 ? '이제 막 몸 푸는 중. ' : ''), moreActiveThan: (p) => ['주소의 ', `${p}%`, '보다 활발해요'] as const,

  calendarKicker: (shared) => (shared ? '주별로 본 시즌' : '날짜별로 본 나의 시즌'), activeDays: () => '일 활동',
  streak: (x) => `최장 연속 ${fmt(x)}일`, perDay: '일별 트랜잭션', perWeek: '주별 활동일',
  hintDay: '마우스를 올리거나 방향키로 보고, 날짜를 누르면 목록이 열려요', hintWeek: '마우스를 올리거나 방향키로 보세요',
  dayText: (c: CalendarCell) => (c.future ? `${koShort(c.date)}은 아직이에요` : c.count ? `${koShort(c.date)} 트랜잭션 ${fmt(c.count)}건` : `${koShort(c.date)} 활동 없음`),
  weekText: (c: CalendarCell, start: string, i: number) => (c.future ? `${koWeek(i, start)} 주는 아직이에요` : `${koWeek(i, start)} 주: 7일 중 ${c.count}일 활동`),
  less: '적음', more: '많음', zeroDays: '0일', sevenDays: '7일',
  daysWithTx: (x) => `트랜잭션이 있는 날 ${fmt(x)}일`, activeDaysInAll: (x) => `총 ${fmt(x)}일 활동`,
  colDay: '날짜', colWeek: '주 시작일', colTransactions: '트랜잭션', colActiveDays: '활동일', ofSeven: (x) => `7일 중 ${x}일`,
  noActivityYet: '아직 활동이 없어요.', chart: '차트', table: '표', viewOf: (l) => `${l}: 보기 방식`, asTable: (l) => `${l} 표`,
  dayTitle: (date, count) => [koShort(date), `· 트랜잭션 ${fmt(count)}건`] as const, dayRegion: (date) => `${koShort(date)} 트랜잭션`,
  closeDay: '닫기', dayLoadFailed: '이 날을 불러오지 못했어요.', tryAgain: '다시 시도',
  dayTxAction: (t: DayTx) => (t.kind === 'send' ? { action: 'GNOT 전송' } : t.kind === 'deploy' ? { action: '배포', path: t.path } : t.kind === 'run' ? { action: '스크립트 실행' } : t.kind === 'other' ? { action: '트랜잭션' } : dayTxAction(t)),
  moreMessages: (x) => `메시지 ${x}개 더`, txAt: (time) => `${time} 트랜잭션을 Gnoscan에서 보기`,
  moreThatDay: (x) => `이날 ${fmt(x)}건 더, Gnoscan에서 보기`,
  moreThatDayFrom: (x, short) => `${short}의 이날 ${fmt(x)}건 더, Gnoscan에서 보기`, fromWallet: (short) => `${short}에서 보냄`, timesUtc: '시각은 UTC 기준이에요.', pages: '페이지',
  range: (a, b, of) => `${fmt(of)}건 중 ${fmt(a)}–${fmt(b)}`, prevPage: '이전 페이지', nextPage: '다음 페이지', page: (x) => `${x}페이지`,

  clockKicker: '하루 중 나의 gno.land 시간', chronotype: (id) => KO_CHRONO[id],
  chronotypeLine: (t) => `트랜잭션의 ${Math.round(t.share * 100)}%가 ${hourLabel(t.from)}–${hourLabel(t.from + 6)} 사이에 있었어요.`,
  perHour: '시간대별 트랜잭션', colHour: '시각', hintHour: '마우스를 올리거나 방향키로 보세요',
  hourText: (h, x) => `${hourLabel(h)}–${String(h).padStart(2, '0')}:59 트랜잭션 ${fmt(x)}건`,
  busiestHour: (h) => ['가장 바빴던 시간: ', hourLabel(h)] as const,
  clockTz: (tz, rounded) => `내 시간대(${tz}) 기준${rounded ? ', 시 단위로 맞췄어요' : '이에요'}.`,

  realmOrderText: (r) => (r.callers ? (r.order ? `호출자 ${fmt(r.callers)}명 중 ${fmt(r.order)}번째` : `호출자 ${fmt(r.callers)}명`) : null),
  realmOrderLine: (r) => (r.order && r.callers ? (r.order === 1 ? '이 렐름을 가장 먼저 호출한 주소예요.' : `이 렐름을 호출한 주소 ${fmt(r.callers)}개 중 ${fmt(r.order)}번째였어요.`) : null),
  callersNote: '첫 호출 순서 기준이고, 렐름 배포자와 봇은 세지 않아요.',
  mostCalledRealm: '가장 많이 호출한 렐름', callPlural: () => '회 호출', callsCount: (x) => `${fmt(x)}회 호출`,
  madeThisSeason: '이번 시즌 GnoSwap 스왑', swapPlural: () => '회', weeklySwaps: '주별 스왑', busiestWeek: '가장 바빴던 주: ',
  swapsShort: (x) => `스왑 ${x}회`, weeklySwapsLabel: (w, r, x) => `${w}주 동안의 주별 스왑. 가장 바빴던 주는 ${r}, 스왑 ${x}회.`,
  favoritePair: '가장 많이 쓴 페어: ',
  topPairText: (d) => { const p = d.defi?.topPair; return p ? `${p.tokens[0]} ↔ ${p.tokens[1]} · 스왑 ${fmt(p.swaps)}회` : null; },
  defiLines: (d) => {
    const s = d.defi ?? {};
    return ([[s.positions, '포지션 개설'], [s.liquidityMoves, '유동성 변경'], [s.feesCollected, '수수료 수령'], [s.staked, '포지션 스테이킹'], [s.rewardsClaimed, '보상 수령']] as [number | undefined, string][])
      .filter(([x]) => x).map(([x, label]) => ({ value: `${fmt(x!)}회`, label }));
  },
  moreOnGnoSwap: 'GnoSwap 활동 더 보기', portfolio: 'GnoSwap 포트폴리오 열기', portfolioHint: 'GnoSwap에서 이 지갑을 연결하면 포지션을 볼 수 있어요.',
  burned: '이번 시즌 쓴 가스', gasSpent: 'GNOT', perTx: (x) => ['트랜잭션당 약 ', `${x} GNOT`, '. '] as const,
  fuelLine: (gas) => (gas >= 10 ? '밸리데이터를 든든히 먹여 살렸어요.' : gas >= 1 ? '꾸준히 태웠어요. 블록마다 의미 있었죠.' : '지갑이 거의 눈치채지 못했어요.'),
  successText: (d) => {
    if (!d.failedTxs) return d.txCount >= 5 ? '트랜잭션이 모두 성공했어요.' : '';
    return `트랜잭션의 ${Math.floor((d.txCount / (d.txCount + d.failedTxs)) * 100)}%가 성공했어요(실패 ${fmt(d.failedTxs)}건).`;
  },
  deployed: '배포한 렐름', realmPlural: () => '개',
  builderHeadline: (d) => { const calls = (d.builder ?? []).reduce((x, r) => x + r.calls, 0); return calls ? `다른 주소들이 이 렐름들을 ${fmt(calls)}번 호출했어요.` : null; },
  realmUseText: (r: RealmReport) => (r.calls ? `주소 ${fmt(r.callers)}개가 ${fmt(r.calls)}번 호출` : '아직 다른 주소가 호출한 적 없어요'),
  moreRealms: (x) => `${fmt(x)}개 더`, govKicker: 'gno.land GovDAO와 GnoSwap 거버넌스 참여',
  governanceLines: (d) => {
    const g = d.governance ?? {};
    return ([[g.votes, '투표'], [g.proposals, '제안'], [g.delegations, 'GNS 위임']] as [number | undefined, string][])
      .filter(([x]) => x).map(([x, label]) => ({ value: `${fmt(x!)}회`, label }));
  },

  shareTitle: '나의 Wrapped 공유하기', shareToX: 'X에 공유', copyDiscord: '디스코드용 복사', copyLink: '링크 복사', downloadImage: '이미지 저장',
  shareHint: '링크와 이미지에는 주소가 절대 나오지 않아요.', copied: '복사했어요. 디스코드에 붙여넣으세요', linkCopied: '링크를 복사했어요',
  copyFailed: '복사하지 못했어요', saved: (f) => `${f} 저장했어요`, saveFailed: '이미지를 저장하지 못했어요', sharePost: koSharePost,
  getYourOwn: '나의 Gno Wrapped 만들기', unwrapOwn: '내 것 열어보기',
  sharedLede: (s) => `누군가 gno.land 메인넷 시즌 ${n(s)}을 공유했어요. 주소를 붙여넣거나 Adena를 연결해서 내 것도 열어보세요.`,
  shareCardAlt: (title, x) => `공유 카드: ${title}, 트랜잭션 ${fmt(x)}건`,

  sinceVisit: (since) => `지난 방문(${since}) 이후`, sinceVisitRegion: '지난 방문 이후', dismiss: '닫기',
  visitDiff: (prev, d) => {
    // the same changes as wrapped.ts visitDiff, in Korean
    const cur = visitSnapshot(d);
    const more = (x: number, label: string) => (x > 0 ? `${label} +${fmt(x)}` : '');
    const gas = Number((cur.gasFeeGnot - prev.gasFeeGnot).toFixed(4));
    const won = ACHIEVEMENT_ORDER.filter((id) => cur.achievements.includes(id) && !prev.achievements.includes(id));
    const title = (t: string) => koTitle(d.persona?.id ?? '', t);
    return [
      more(cur.txCount - prev.txCount, '트랜잭션'),
      ...won.map((id) => `새 업적: ${KO_ACH[id].title}`),
      prev.persona && cur.persona && prev.persona !== cur.persona ? `새 페르소나: ${prev.persona} → ${title(cur.persona)}` : '',
      prev.persona === cur.persona && prev.rank && cur.rank && cur.rank < prev.rank ? `페르소나 순위 ${fmt(prev.rank - cur.rank)}계단 상승: ${fmt(prev.rank)}위 → ${fmt(cur.rank)}위` : '',
      more(cur.swaps - prev.swaps, '스왑'),
      more(cur.realms - prev.realms, '새로 호출한 렐름'),
      more(cur.deployed - prev.deployed, '배포한 렐름'),
      more(cur.activeDays - prev.activeDays, '활동일'),
      gas > 0 ? `가스 +${fmtGas(gas)} GNOT` : '',
    ].filter(Boolean);
  },
  visitDate: (iso) => koShort(new Date(iso).toISOString().slice(0, 10)),

  compareFriend: '친구와 비교하기: 친구의 공유 링크를 붙여넣으세요', compareMine: '내 것도 있나요? 이 결과와 비교해 보세요',
  theirLink: '친구의 공유 링크', yourLink: '내 공유 링크', compare: '비교',
  compareErr: '공유 링크가 아닌 것 같아요. /s/ 뒤에 12자 ID가 붙은 주소예요.', compareTitle: '두 결과를 나란히',
  compareLede: (s) => `gno.land 메인넷 시즌 ${n(s)}, 공유 링크 두 개로 비교했어요. 두 주소 모두 드러나지 않아요.`,
  openRecap: '결과 열기', compareAnother: '다른 결과와 비교', compareAnotherHint: '다른 공유 링크를 붙여넣으면 A 옆에 놓여요.',
  compareCaption: '결과 A와 결과 B. ▲는 각 줄에서 앞선 쪽이에요', stat: '항목', ahead: '앞섬', noneYet: '아직 없어요',
  compareLabel: (label) => ({
    Transactions: '트랜잭션', 'More active than': '활동량 백분위', 'Arrived on mainnet': '메인넷 도착', 'Active days': '활동일',
    'Longest streak': '최장 연속', 'Realms called': '호출한 렐름', 'Swaps on GnoSwap': 'GnoSwap 스왑', 'Realms deployed': '배포한 렐름',
    Achievements: '업적', 'Gas spent': '쓴 가스',
  } as Record<string, string>)[label] ?? label,
  weekOf: (range, x) => `${range} 주: 7일 중 ${x}일`, comparison: '비교', persona: '페르소나',
  recapWeeks: (side, weeks) => `결과 ${side}의 주별 활동일: ${weeks.join(', ')}`,

  personasPill: 'SEASON PERSONAS', personasTitle: '주소마다 하나, 페르소나 8종',
  personasLede: '페르소나는 점수나 순위가 아니에요. 이번 시즌 온체인 활동으로 고른 이름표 하나예요. 아래 규칙을 순서대로 확인해서 처음 맞는 것이 내 페르소나예요.',
  personasUnavailable: '지금은 페르소나 데이터를 불러올 수 없어요.',
  ofAddresses: (p) => `주소의 ${p.toFixed(1)}%`,
  shareOfAddresses: (p, x) => `${p < 1 ? p.toFixed(1) : Math.round(p)}% · 주소 ${fmt(x)}개`,
  achievementsLede: '페르소나와 별개로 모을 수 있어요. 얻은 업적은 결과 페이지에 나와요.',
  achievementShare: (p, x) => `${p.toFixed(1)}% · 주소 ${fmt(x)}개`,
  personasNote: (x, s, asOf) => `메인넷 시즌 ${n(s)}에 활동한 주소 ${fmt(x)}개 기준, ${asOf} 데이터예요. "무브"는 트랜잭션 안의 메시지예요. wugnot은 GnoSwap용으로 GNOT을 감싸는 것이라 디파이로 세요. 페르소나 순위는 본인 결과에서만 보이고 공개 목록은 없어요.`,
  findPersona: '내 페르소나 찾기', wholeSeason: '시즌 전체 보기 →',

  seasonTitle: (s) => `메인넷 시즌 ${n(s)}, gno.land 전체`,
  seasonLede: (final) => `시즌${final ? '' : ' 지금까지'}의 모든 주소, 모든 렐름, 모든 블록. 내 결과와 같은 공개 데이터로 만든 체인의 결산이에요.`,
  seasonUnavailable: '지금은 시즌 데이터를 불러올 수 없어요.', inNumbers: '숫자로 본 시즌',
  seasonStats: { addresses: '주소', transactions: '트랜잭션', swaps: 'GnoSwap 스왑', deployed: '배포된 렐름', gas: '쓴 가스(GNOT)' },
  busiestDay: '가장 바빴던 날: ', newAddresses: '일별 신규 주소',
  arrivalsLine: (total, final) => `${final ? '이번 시즌' : '지금까지'} 주소 ${fmt(total)}개`,
  mostArrived: ', 가장 많이 도착한 날은 ', mostUsedRealms: (x) => `가장 많이 쓰인 렐름, 호출한 주소 수 기준(호출된 렐름 총 ${fmt(x)}곳)`,
  addressesWord: '주소', seasonNote: (asOf) => `${asOf} 기준. 성공한 트랜잭션만 세고, 날짜는 UTC 기준이에요. 다른 탐색기처럼 렐름 경로에 배포자 주소가 들어 있을 수 있어요.`,
  findRecap: '내 결과 찾기', personasAndAchievements: '페르소나와 업적 →',
  peak: (t) => `최고: ${t}`, nothingYet: '아직 없어요.', inAll: (x, unit) => `총 ${unit} ${fmt(x)}`,
  unitTx: ['트랜잭션', '트랜잭션'] as const, unitNewAddress: ['신규 주소', '신규 주소'] as const,
  dayValue: (x, unit, date) => `${koShort(date)} ${unit[1]} ${fmt(x)}`, dayFuture: (date) => `${koShort(date)}은 아직이에요`,

  story: {
    label: '시즌 스토리', close: '스토리 닫기', paused: ' · 일시정지', hint: '탭하거나 →로 넘기기 · 길게 눌러 멈추기',
    introTitle: (shared, s) => `gno.land에서 보낸 ${shared ? '' : '나의 '}메인넷 시즌 ${n(s)}`, introLine: '함께 열어봐요.',
    arrived: (_, date) => `${koDate(date)}에 도착`, dayOne: '처음부터 함께였어요.', ofMainnet: '메인넷 일차',
    sent: () => '이번 시즌 보낸 트랜잭션', moreActive: (p) => ['주소의 ', `${p}%`, '보다 활발해요.'] as const,
    showedUp: () => '활동한 날', dayPlural: () => '일',
    streak: (x) => ['최장 연속 ', `${fmt(x)}일`, '.'] as const,
    byTheClock: '시계로 보면 나는', clockSub: (h, tz) => `가장 바빴던 시간: ${hourLabel(h)} (${tz})`,
    topRealm: () => '가장 많이 호출한 렐름', callsMostly: (_, fn) => `회 호출, 주로 ${fn}`,
    onGnoSwap: () => 'GnoSwap에서 한 스왑', swapPlural: () => '회',
    deployed: () => '배포한 렐름', builderLine: (d) => ko.builderHeadline(d),
    hadSay: () => '거버넌스에 참여했어요', unlocked: () => '얻은 업적', persona: (shared) => (shared ? '시즌 페르소나' : '나의 시즌 페르소나'),
    outro: (shared, s, final) => `${final ? '' : '지금까지 '}${shared ? '' : '나의 '}메인넷 시즌 ${n(s)}${'2459'.includes(n(s).slice(-1)) ? '였어요' : '이었어요'}.`, // 이/였: does the number end in a consonant when read
  },

  imagePersona: '나의 시즌 페르소나', imageTopRealm: '가장 많이 호출한 렐름',
};

export const COPY: Record<Locale, Copy> = { en, ko };

/** A persona's title and line in the locale (the batch sends English). */
export const personaIn = (c: Copy, p: { id: string; title: string; line: string } | undefined) =>
  p ? { ...p, title: c.personaTitle(p.id, p.title), line: c.personaLine(p.id, p.line) } : p;

