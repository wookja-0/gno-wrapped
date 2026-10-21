/**
 * Gno Wrapped: data contract + pure display rules.
 * Extracted from the design prototype (Main.dc.html, ShareCardOG.dc.html); the fixtures in
 * web/fixtures cover every rule here.
 *
 * Changes from the design handoff's copy, agreed after checking real data:
 * - fmtGas: values under 0.01 GNOT keep two significant digits (47% of addresses would read "0.00").
 * - GAS_TIERS, SHARE come from CONFIG.
 * - builderCards / PATH_MAX.builder: cap BuilderSlide cards and middle-truncate long paths.
 * - firstTx.hash + gnoscan* links: link the recap out to Gnoscan.
 */
import { CONFIG } from './config';

// ---------- contract (one static JSON per address, rebuilt daily) ----------

export interface Season {
  id: string;     // "s1"
  start: string;  // "YYYY-MM-DD", first day of the season (UTC)
  end: string;    // "YYYY-MM-DD", last day of the season (UTC)
}

export interface TopRealm {
  path: string;     // "gno.land/r/demo/boards"
  topFunc: string;  // most-called function in that realm
  calls: number;
}

export interface Persona {
  id: string;     // "realm-hopper" (data only, never rendered)
  title: string;  // "Realm Hopper"
  line: string;   // one-sentence description
  share?: number; // category personas: share of messages in that category (0–1)
}

export interface WrappedData {
  address: string;                                  // 40-char bech32 "g1…"; "" behind a share link
  shareId?: string;                                 // public share link ID (/<season>/s/<shareId>)
  shared?: boolean;                                 // true = redacted share view: no address in any form
  dataAsOf: string;                                 // required, "YYYY-MM-DD" (UTC): the chain tip's date, or season.end once final
  final?: boolean;                                  // the season is over and every in-season tx is in
  season: Season;                                   // REQUIRED, never fall back silently
  firstTx?: { date: string; mainnetDay: number; hash?: string }; // mainnetDay 1 = launch day; hash is base64
  txCount: number;
  percentile: number;                               // 0–100, "more active than N% of addresses"
  topRealms: TopRealm[];                            // up to 3, sorted by calls desc
  realmCount?: number;                              // distinct realms called
  deployedRealms: string[];
  swaps: { count: number; weekly: number[] };       // weekly[0] = week starting season.start
  gasFeeGnot: number;
  persona?: Persona;
  personaRank?: PersonaRank;                        // rank within the persona; none for First Steps and bots
  calendar?: Calendar;
  arrival?: Arrival;
  achievements?: Achievement[];
  milestones?: Milestone[];
}

/**
 * Activity by day. Owner view: txs per UTC day (daily[0] = season.start). Share view: only active
 * days per season week (a day-by-day pattern can be matched against the chain).
 */
export interface Calendar { daily?: number[]; weeks?: number[]; activeDays: number; longestStreak: number }

/** Mainnet arrival order. `order` is omitted behind a share link (it's a direct lookup into chain data). */
export interface Arrival { order?: number; of: number; tier?: number }
export type AchievementId = 'early' | 'pioneer' | 'streak' | 'triple-threat' | 'gas-saver' | 'validators-friend' | 'century';
/** `realms`: pioneer only, owner view only — up to 3 realms, most-used first. */
export interface Achievement { id: AchievementId; value?: number; realms?: string[] }
export type MilestoneId = 'first-swap' | 'first-collect' | 'first-deploy' | 'tx-100';
export interface Milestone { id: MilestoneId; date: string }

/** Where the address stands among others with the same persona (shown to that address; no public list). */
export interface PersonaRank {
  rank: number;   // 1 = best; ties share a rank
  of: number;     // ranked addresses with this persona
  metric: RankMetric;
  value: number;
}
export type RankMetric = 'deployed' | 'firstTx' | 'realms' | 'defi' | 'collect' | 'play' | 'transfer';

// ---------- validation (show a visible error, never hide a bad field) ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ADDRESS_RE = /^g1[02-9ac-hj-np-z]{38}$/; // bech32 charset, used by the intro's paste field

export const seasonDays = (s: Season) => (Date.parse(s.end) - Date.parse(s.start)) / 864e5 + 1; // 111 for S1

export function seasonWeeks(s: Season): number {
  return Math.ceil(((Date.parse(s.end) - Date.parse(s.start)) / 864e5 + 1) / 7); // 16 for S1
}

/** Empty array = valid. Any error → orange DATA ERROR banner + console.error (prototype), 4xx in the OG route. */
export function validate(d: Partial<WrappedData>): string[] {
  const errs: string[] = [];
  const s = d.season;
  if (!s) errs.push('season is missing (required: { id, start, end })');
  else {
    if (!s.id) errs.push('season.id is missing');
    if (!ISO_DATE.test(s.start || '')) errs.push('season.start must be YYYY-MM-DD');
    if (!ISO_DATE.test(s.end || '')) errs.push('season.end must be YYYY-MM-DD');
    if (!errs.length && d.swaps && Array.isArray(d.swaps.weekly)) {
      const weeks = seasonWeeks(s);
      if (d.swaps.weekly.length !== weeks) errs.push(`swaps.weekly has ${d.swaps.weekly.length} entries; season needs ${weeks}`);
    }
    if (!errs.length && d.calendar?.daily && d.calendar.daily.length !== seasonDays(s)) {
      errs.push(`calendar.daily has ${d.calendar.daily.length} entries; season needs ${seasonDays(s)}`);
    }
  }
  return errs;
}

// ---------- story structure ----------

export type SlideId =
  | 'ArrivalSlide' | 'ActivitySlide' | 'RealmSlide' | 'BuilderSlide'
  | 'DefiSlide' | 'FuelSlide' | 'PersonaSlide' | 'SummaryCard';

/** Hide rules: a slide whose data is empty is skipped entirely (progress bar has one segment per visible slide). */
export function slideIds(d: WrappedData): SlideId[] {
  const ids: SlideId[] = [];
  if (d.firstTx && d.firstTx.date) ids.push('ArrivalSlide');
  if (d.txCount > 0) ids.push('ActivitySlide');
  if (d.topRealms && d.topRealms.length) ids.push('RealmSlide');
  if (d.deployedRealms && d.deployedRealms.length) ids.push('BuilderSlide');
  if (d.swaps && d.swaps.count > 0) ids.push('DefiSlide');
  if (d.gasFeeGnot > 0) ids.push('FuelSlide');
  if (d.persona && d.persona.title) ids.push('PersonaSlide');
  ids.push('SummaryCard');
  return ids;
}

/** JSON missing (404) or txCount 0 → EmptyState instead of the story. */
export const isEmpty = (d: WrappedData | null) => !d || d.txCount === 0;

// ---------- formatting ----------

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US'); // separators kept during count-up too

/**
 * Gas keeps the source's decimals (max 2): 12.4 → "12.4", 1520.75 → "1,520.75".
 * Under 0.01 it keeps two significant digits instead: 0.0011 → "0.0011", 0.0066 → "0.0066".
 */
export function fmtGas(gas: number, value = gas): string {
  const dec = gas > 0 && gas < 0.01
    ? (String(Number(gas.toPrecision(2))).split('.')[1] || '').length
    : Math.min(2, (String(gas).split('.')[1] || '').length);
  return value.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export const shortAddress = (a: string) => a.slice(0, 6) + '…' + a.slice(-4); // g1wrap…qqqq

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso: string): string { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; }
export function fmtShort(iso: string): string { const [, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; }

/** Busiest-week label, e.g. "Oct 24–30" or "Oct 31–Nov 6". Week i starts season.start + 7i days (UTC). */
export function weekRange(i: number, seasonStart: string): string {
  const [y, m, d] = seasonStart.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, d) + i * 7 * 864e5);
  const e = new Date(s.getTime() + 6 * 864e5);
  const left = `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}`;
  const right = s.getUTCMonth() === e.getUTCMonth() ? String(e.getUTCDate()) : `${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}`;
  return `${left}–${right}`;
}

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ---------- copy rules ----------

/** ArrivalSlide: Day 1 gets its own line (orange). */
export const arrivalSub = (mainnetDay: number) =>
  mainnetDay === 1 ? 'You were here from the start.' : 'of mainnet';

/** ActivitySlide: low percentiles get a warmer lead-in before "More active than N% of addresses". */
export const activityLead = (percentile: number) => (percentile < 25 ? 'Just getting warmed up. ' : '');

/** SummaryCard / SummaryExport rank stat. ≥ 90 → "Top N%" (min 1). */
export function summaryRank(percentile: number): { value: string; label: string } {
  return percentile >= 90
    ? { value: `Top ${Math.max(1, 100 - percentile)}%`, label: 'Most active addresses' }
    : { value: `${percentile}%`, label: 'More active than' };
}

export const GAS_TIERS = CONFIG.GAS_TIERS;
export function fuelLine(gas: number): string {
  if (gas >= GAS_TIERS.HIGH_FROM) return 'You kept the validators well fed.';
  if (gas >= GAS_TIERS.MID_FROM) return 'A steady burn. Every block counted.';
  return 'Your wallet barely noticed.';
}
/** "≈0.0097" — two significant digits, no trailing zeros. */
export const gasPerTx = (gas: number, txCount: number) =>
  txCount ? '≈' + String(Number((gas / txCount).toPrecision(2))) : '0';

// ---------- realm paths ----------

/** Middle truncation: "gno.land/r/gnoswap/v1/…long…/router" → "gno.land/r/…/router". null = fits. */
export function truncMid(path: string, max: number): string | null {
  if (!path || path.length <= max) return null;
  const segs = path.split('/');
  let out = segs.slice(0, 2).join('/') + '/…/' + segs[segs.length - 1];
  if (out.length > max) out = out.slice(0, max - 1) + '…';
  return out;
}
/** Max characters before truncating (390px frame): Realm hero 34, top-3 rows 28, SummaryCard 34, Builder card 36. */
export const PATH_MAX = { realmHero: 34, realmRow: 28, summary: 34, builder: 36 };

/** BuilderSlide cards: first CONFIG.BUILDER_MAX_CARDS paths, split into muted prefix + bold name. */
export function builderCards(paths: string[]): { cards: { prefix: string; name: string; full: string }[]; more: number } {
  const cards = paths.slice(0, CONFIG.BUILDER_MAX_CARDS).map((full) => {
    const shown = truncMid(full, PATH_MAX.builder) ?? full;
    const cut = shown.lastIndexOf('/') + 1;
    return { prefix: shown.slice(0, cut), name: shown.slice(cut), full };
  });
  return { cards, more: Math.max(0, paths.length - cards.length) };
}

/** OG card: last path segment that isn't a version, max 12 chars. ".../users/v1" → "users". */
export function realmShortName(path: string): string {
  const segs = String(path || '').split('/').filter((s) => s && !/^v\d+$/i.test(s));
  const name = segs.length ? segs[segs.length - 1] : '';
  return name.length > 12 ? name.slice(0, 11) + '…' : name;
}

/** ShareCardOG rank card (middle of three). */
export function ogRankCard(d: WrappedData): { value: string; label: string } {
  const pct = d.percentile || 0;
  const top = d.topRealms?.[0];
  if (pct >= 90) return { value: `Top ${Math.max(1, 100 - pct)}%`, label: 'of all addresses' };
  if (pct < 25 && top) return { value: realmShortName(top.path), label: `top realm · ${fmt(top.calls)} ${plural(top.calls, 'call', 'calls')}` };
  return { value: `${pct}%`, label: 'of addresses outpaced' };
}

// ---------- type scale ----------

/** ShareCardOG stat value size (285px card interior). */
export const ogValueSize = (v: string) => (v.length <= 5 ? 88 : v.length === 6 ? 80 : v.length === 7 ? 68 : v.length <= 9 ? 56 : 44);
/** ShareCardOG persona title size. */
export const ogPersonaSize = (t: string) => (t.length <= 14 ? 72 : t.length <= 20 ? 64 : 52);

// ---------- motion ----------

export const TIMING = {
  slideMs: 6000,        // auto-advance per slide
  holdToPauseMs: 220,   // press longer than this = pause (no navigation on release)
  tapMaxMovePx: 14,     // tap if released < holdToPauseMs and moved less than this
  swipeMinPx: 40,       // horizontal: left = next, right = previous
  swipeUpMinPx: 50,     // swipe up = next
  countDelayMs: 250,
  countMs: 1300,        // easeOutCubic; skipped (final value at once) under prefers-reduced-motion
  toastMs: 2200,
  loadingMinMs: 2600,   // prototype only; real app: until the JSON resolves
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

// ---------- share ----------

/** Link = SHARE_BASE_URL/<season.id>/<address>. */
export const SHARE = { BASE_URL: CONFIG.SHARE_BASE_URL, HASHTAG: CONFIG.SHARE_HASHTAG };
export const downloadFilename = (d: WrappedData) => CONFIG.DOWNLOAD_FILENAME.replace('{season}', d.season.id);
/**
 * The post for X and Discord: one fact per line so it scans in a feed, only lines the address has
 * data for, and no rank line for low percentiles (it reads as a put-down). Link and hashtag last.
 * Always fits on X: optional lines are dropped from the end (swaps, deployed, arrival) if needed.
 *
 *   My Mainnet Season 1 on gno.land 🎁
 *
 *   🏷️ Persona: DeFi Pilot
 *   📈 1,284 transactions · top 13% of addresses
 *   🚀 Arrived on day 22 of mainnet
 *   🔄 36 swaps on GnoSwap
 *
 *   Unwrap yours 👇
 *   https://…/s1/s/<id>
 *
 *   #GnoWrapped
 */
export function sharePost(d: WrappedData): string {
  const pct = d.percentile || 0;
  const rank = pct >= 50 ? `top ${Math.max(1, 100 - pct)}% of addresses` : pct >= 25 ? `more active than ${pct}% of addresses` : '';
  const day = d.firstTx?.mainnetDay;
  const head = [
    d.persona?.title && `🏷️ Persona: ${d.persona.title}`,
    `📈 ${fmt(d.txCount)} ${plural(d.txCount, 'transaction', 'transactions')}${rank ? ` · ${rank}` : ''}`,
  ];
  // Optional lines, most important first; dropped from the end if the post wouldn't fit on X.
  // arrival day and early tier share a line: "🚀 Arrived on day 22 · one of the first 500"
  const tier = d.arrival?.tier && d.arrival.tier <= 1000 ? `one of the first ${fmt(d.arrival.tier)}` : '';
  const arrived = day ? (day === 1 ? 'Here since day 1' : `Arrived on day ${day}`) : '';
  const optional = [
    arrived ? `🚀 ${arrived}${tier ? ` · ${tier}` : ' of mainnet'}` : tier ? `🚀 ${tier[0].toUpperCase()}${tier.slice(1)} on mainnet` : '',
    d.deployedRealms?.length ? `🛠️ Deployed ${fmt(d.deployedRealms.length)} ${plural(d.deployedRealms.length, 'realm', 'realms')}` : '',
    d.swaps?.count ? `🔄 ${fmt(d.swaps.count)} ${plural(d.swaps.count, 'swap', 'swaps')} on GnoSwap` : '',
  ].filter(Boolean);
  // only a rank worth sharing: the top half
  const rankLine = d.personaRank && rankTopPct(d.personaRank) <= 50 ? `🏅 ${personaRankText(d)} (top ${rankTopPct(d.personaRank)}%)` : '';
  const seasonName = `Mainnet Season ${d.season.id.replace(/^s/i, '')}`;
  const build = (opt: string[]) =>
    [`My ${seasonName} on gno.land${d.final ? ': the final recap' : ''} 🎁`, '', ...[...head, ...opt, rankLine].filter(Boolean), '', 'Unwrap yours 👇', shareLink(d), '', SHARE.HASHTAG].join('\n');
  let post = build(optional);
  for (let n = optional.length - 1; n >= 0 && xLength(post) > X_MAX; n--) post = build(optional.slice(0, n));
  return post;
}

/** X's limit and weighted length: URLs count 23, characters beyond U+10FF count 2, variation selectors 0. */
export const X_MAX = 280;
export function xLength(post: string): number {
  return [...post.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].reduce((n, ch) => {
    const cp = ch.codePointAt(0)!;
    return n + (cp === 0xfe0f ? 0 : cp > 0x10ff ? 2 : 1);
  }, 0);
}

/** Public share link: the unguessable share ID, never the address (falls back for fixtures without one). */
export const shareLink = (d: WrappedData) =>
  `${SHARE.BASE_URL}/${d.season.id}/${d.shareId ? `s/${d.shareId}` : d.address}`;
export const xIntentUrl = (d: WrappedData) => 'https://x.com/intent/tweet?text=' + encodeURIComponent(sharePost(d));

// ---------- explorer links ----------

/** Gnoscan account page. */
export const gnoscanAccount = (address: string) => `${CONFIG.GNOSCAN_URL}/account/${address}`;
/** Gnoscan block page. */
export const gnoscanBlock = (height: number) => `${CONFIG.GNOSCAN_URL}/block/${height}`;
/** Gnoscan tx page. Gnoscan URL-decodes txhash, and base64 hashes contain "/", "+" and "=". */
export const gnoscanTx = (hash: string) => `${CONFIG.GNOSCAN_URL}/transactions/details?txhash=${encodeURIComponent(hash)}`;
/** Gnoscan realm page. Gnoscan reads `path` without decoding it, so plain paths go in as they are. */
export const gnoscanRealm = (path: string) =>
  `${CONFIG.GNOSCAN_URL}/realms/details?path=${/^[\w./-]+$/.test(path) ? path : encodeURIComponent(path)}`;

// ---------- personas ----------

export type PersonaRule =
  | { kind: 'deployed'; min: number }
  | { kind: 'firstDay'; max: number }
  | { kind: 'realms'; min: number }
  | { kind: 'share'; category: 'defi' | 'collect' | 'play'; min: number }
  | { kind: 'transfers'; min: number }
  | { kind: 'fallback' };

/** GET /v1/{season}/personas: the batch's rules (checked in order, first match wins) and counts. */
export interface PersonaInfo extends Persona { rule: PersonaRule; rankBy?: RankMetric; count: number }
export interface PersonasData {
  season: Season; dataAsOf: string; final?: boolean; addresses: number; personas: PersonaInfo[];
  achievements?: Partial<Record<AchievementId, number>>; // how many addresses have each
}

const CATEGORY: Record<string, string> = { defi: 'GnoSwap and wugnot', collect: 'NFT mints and buys', play: 'on-chain games' };
const pctText = (x: number) => `${Math.round(x * 100)}%`;

/** When a persona applies, as shown on /personas. */
export function personaRuleText(r: PersonaRule): string {
  switch (r.kind) {
    case 'deployed': return `Deployed at least ${r.min} realm${r.min === 1 ? '' : 's'} to mainnet.`;
    case 'firstDay': return `First transaction within the first ${r.max} days of mainnet.`;
    case 'realms': return `Called ${r.min} or more different realms.`;
    case 'share': return `At least ${pctText(r.min)} of your moves were ${CATEGORY[r.category]}.`;
    case 'transfers': return `Mostly GNOT transfers, with ${r.min} or more transactions.`;
    case 'fallback': return 'Everyone else: one or two transfers.';
  }
}

/** "Why this persona" line on the recap, from the address's own numbers. */
export function personaWhy(d: WrappedData): string {
  const p = d.persona;
  if (!p) return '';
  const share = p.share ? pctText(p.share) : '';
  switch (p.id) {
    case 'builder': return `You deployed ${fmt(d.deployedRealms.length)} ${plural(d.deployedRealms.length, 'realm', 'realms')} to mainnet.`;
    case 'day-one-explorer': return `Your first transaction landed on day ${d.firstTx?.mainnetDay ?? '?'} of mainnet.`;
    case 'realm-hopper': return `You called ${fmt(d.realmCount ?? d.topRealms.length)} different realms.`;
    case 'defi-pilot': return `${share} of your moves went through GnoSwap and wugnot.`;
    case 'collector': return `${share} of your moves were NFT mints and buys.`;
    case 'player-one': return `${share} of your moves were in on-chain games.`;
    case 'gnot-courier': return `${share} of your moves were GNOT transfers, across ${fmt(d.txCount)} transactions.`;
    case 'first-steps': return `${fmt(d.txCount)} ${plural(d.txCount, 'transaction', 'transactions')}: the first steps.`;
  }
  return '';
}

// ---------- persona rank ----------

const PERSONA_PLURAL: Record<string, string> = {
  builder: 'Builders', 'day-one-explorer': 'Day-One Explorers', 'realm-hopper': 'Realm Hoppers', 'defi-pilot': 'DeFi Pilots',
  collector: 'Collectors', 'player-one': 'Player Ones', 'gnot-courier': 'GNOT Couriers',
};
/** What each persona is ranked by, as a phrase: "ranked by …". */
export const RANK_METRIC: Record<RankMetric, string> = {
  deployed: 'realms deployed', firstTx: 'how early the first transaction landed', realms: 'different realms called',
  defi: 'GnoSwap and wugnot moves', collect: 'NFT mints and buys', play: 'on-chain game moves', transfer: 'GNOT transfers',
};

/** Top share for a rank, at least 1%: #102 of 514 → 20. */
export const rankTopPct = (r: PersonaRank) => Math.max(1, Math.ceil((r.rank / r.of) * 100));

/** "#102 of 514 DeFi Pilots", or null without a rank. */
export function personaRankText(d: WrappedData): string | null {
  const r = d.personaRank, id = d.persona?.id;
  if (!r || !id) return null;
  return `#${fmt(r.rank)} of ${fmt(r.of)} ${PERSONA_PLURAL[id] ?? d.persona!.title}`;
}

// ---------- season countdown ----------

/** Whole UTC days left after today: 0 on the season's last day, null once it's over. */
export function daysLeft(s: Season, now: number): number | null {
  const end = Date.parse(s.end) + 864e5; // exclusive: the day after the last
  const today = Math.floor(now / 864e5) * 864e5; // this UTC day's midnight
  return now >= end ? null : Math.round((end - today) / 864e5) - 1;
}
/** "71 days left in Mainnet Season 1" / "Last day of Mainnet Season 1". */
export function countdownText(s: Season, left: number): string {
  const name = `Mainnet Season ${s.id.replace(/^s/i, '')}`;
  return left === 0 ? `Last day of ${name}` : `${fmt(left)} ${plural(left, 'day', 'days')} left in ${name}`;
}

// ---------- activity calendar ----------

/** Sequential ramp on the dark card: 0 = no activity, 1–4 = more (lighter). OKLab L .29 → .81. */
export const CAL_COLORS = ['#1E2750', '#1F3F99', '#2C63D6', '#3D8BFF', '#9CC2FF'];

/** A day's level 1–4 on a log scale up to the address's busiest day, so one huge day doesn't wash out the rest. */
export function dayLevel(n: number, max: number): number {
  if (n <= 0) return 0;
  if (max <= 1) return 4;
  return 1 + Math.min(3, Math.floor((Math.log(n) / Math.log(max)) * 4));
}
/** Active days in a week (0–7) → level 0–4. */
export const weekLevel = (days: number) => (days <= 0 ? 0 : Math.min(4, Math.ceil((days * 4) / 7)));

export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

export interface CalendarCell { date: string; count: number; level: number; future: boolean }

/** Owner view: one cell per season day, in season weeks (column i = week i, row = day of that week). */
export function calendarDays(d: WrappedData): CalendarCell[] {
  const daily = d.calendar?.daily ?? [];
  const max = Math.max(0, ...daily);
  return daily.map((count, i) => {
    const date = addDays(d.season.start, i);
    return { date, count, level: dayLevel(count, max), future: date > d.dataAsOf };
  });
}

/** Share view: one cell per season week, by active days. `date` is the week's first day. */
export function calendarWeeks(d: WrappedData): CalendarCell[] {
  return (d.calendar?.weeks ?? []).map((days, i) => {
    const date = addDays(d.season.start, i * 7);
    return { date, count: days, level: weekLevel(days), future: date > d.dataAsOf };
  });
}

/** Month labels for the owner grid: the week column where each month's 1st falls (and week 0). */
export function calendarMonths(d: WrappedData): { week: number; label: string }[] {
  const out: { week: number; label: string }[] = [];
  const days = d.calendar?.daily?.length ?? 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(d.season.start, i);
    if (i === 0 || date.endsWith('-01')) {
      const week = Math.floor(i / 7);
      const label = MONTHS[Number(date.slice(5, 7)) - 1];
      if (out.length && out[out.length - 1].week === week) out[out.length - 1].label = label; // the 1st wins
      else out.push({ week, label });
    }
  }
  return out;
}

/** One line of the calendar's day list (GET /v1/{season}/{address}/days/{date}; owner view only). */
export interface DayTx { hash: string; time: string; kind: 'call' | 'send' | 'deploy' | 'run' | 'other'; path?: string; func?: string; msgs?: number }
/** The batch keeps a day's first DAY_TX_CAP txs; the rest are on Gnoscan. */
export const DAY_TX_CAP = 100;

/** What a day-list line says the tx did, from its first message. */
export function dayTxAction(t: DayTx): { action: string; path?: string } {
  switch (t.kind) {
    case 'call': return { action: t.func || 'Call', path: t.path };
    case 'send': return { action: 'Sent GNOT' };
    case 'deploy': return { action: 'Deployed', path: t.path };
    case 'run': return { action: 'Ran a script' };
  }
  return { action: 'Transaction' };
}

/** "12 transactions on Oct 14" / "No activity on Oct 14" / "Oct 14 hasn't happened yet". */
export function dayText(c: CalendarCell): string {
  if (c.future) return `${fmtShort(c.date)} hasn't happened yet`;
  return c.count ? `${fmt(c.count)} ${plural(c.count, 'transaction', 'transactions')} on ${fmtShort(c.date)}` : `No activity on ${fmtShort(c.date)}`;
}
/** "5 of 7 days active, week of Oct 10–16". */
export function weekText(c: CalendarCell, seasonStart: string, i: number): string {
  if (c.future) return `Week of ${weekRange(i, seasonStart)} hasn't happened yet`;
  return `${c.count} of 7 days active, week of ${weekRange(i, seasonStart)}`;
}

// ---------- the whole season (/season) ----------

/** GET /v1/{season}/season: the whole chain's season. Daily series: [0] = season.start (UTC). */
export interface SeasonData {
  season: Season; dataAsOf: string; final?: boolean;
  addresses: number; transactions: number; swaps: number; gasGnot: number; realmsDeployed: number; realmsCalled: number;
  dailyTxs: number[]; dailyArrivals: number[];
  busiestDay?: { date: string; txs: number };
  topRealms: { path: string; addresses: number; calls: number }[];
}

export interface DayValue { date: string; value: number; future: boolean }

/** A daily series as dated cells; days after dataAsOf haven't happened (they keep their slot on the axis). */
export const daySeries = (values: number[], s: Season, dataAsOf: string): DayValue[] =>
  values.map((value, i) => {
    const date = addDays(s.start, i);
    return { date, value, future: date > dataAsOf };
  });

/** Index of the largest value (first one on ties), or -1 for an all-zero series. */
export const peakIndex = (values: number[]) => {
  const max = Math.max(0, ...values);
  return max > 0 ? values.indexOf(max) : -1;
};

// ---------- compare two recaps ----------

/** A share ID from what someone pasted: the ID itself or any link ending in /s/<id>. */
export function parseShareId(input: string): string | null {
  const m = input.trim().toLowerCase().match(/(?:^|\/s\/)([0-9a-z]{12})(?=$|[/?#])/);
  return m ? m[1] : null;
}

export interface CompareRow { label: string; a: string; b: string; ahead: 'a' | 'b' | null }

/** Side-by-side rows for /compare. `ahead` marks the larger number (an earlier day for arrival); ties and gas have none. */
export function compareRows(a: WrappedData, b: WrappedData): CompareRow[] {
  const row = (label: string, va: number, vb: number, show: (n: number) => string, better: 'more' | 'less' | null = 'more'): CompareRow => ({
    label, a: show(va), b: show(vb),
    ahead: !better || va === vb ? null : (better === 'more') === (va > vb) ? 'a' : 'b',
  });
  const days = (n: number) => `${fmt(n)} ${plural(n, 'day', 'days')}`;
  return [
    row('Transactions', a.txCount, b.txCount, fmt),
    row('More active than', a.percentile || 0, b.percentile || 0, (n) => `${n}%`),
    row('Arrived on mainnet', a.firstTx?.mainnetDay ?? 0, b.firstTx?.mainnetDay ?? 0, (n) => `Day ${n}`, 'less'),
    row('Active days', a.calendar?.activeDays ?? 0, b.calendar?.activeDays ?? 0, fmt),
    row('Longest streak', a.calendar?.longestStreak ?? 0, b.calendar?.longestStreak ?? 0, days),
    row('Realms called', a.realmCount ?? a.topRealms.length, b.realmCount ?? b.topRealms.length, fmt),
    row('Swaps on GnoSwap', a.swaps?.count ?? 0, b.swaps?.count ?? 0, fmt),
    row('Realms deployed', a.deployedRealms?.length ?? 0, b.deployedRealms?.length ?? 0, fmt),
    row('Achievements', a.achievements?.length ?? 0, b.achievements?.length ?? 0, fmt),
    row('Gas spent', a.gasFeeGnot || 0, b.gasFeeGnot || 0, (n) => `${fmtGas(n)} GNOT`, null),
  ];
}

// ---------- since your last visit ----------

/** What the recap remembers between visits (in the visitor's own browser only). */
export interface VisitSnapshot {
  txCount: number; swaps: number; gasFeeGnot: number; realms: number; deployed: number; activeDays: number;
  achievements: string[]; persona: string; rank?: number;
}
export const visitSnapshot = (d: WrappedData): VisitSnapshot => ({
  txCount: d.txCount, swaps: d.swaps?.count ?? 0, gasFeeGnot: d.gasFeeGnot ?? 0, realms: d.realmCount ?? d.topRealms.length,
  deployed: d.deployedRealms?.length ?? 0, activeDays: d.calendar?.activeDays ?? 0,
  achievements: (d.achievements ?? []).map((a) => a.id), persona: d.persona?.title ?? '', rank: d.personaRank?.rank,
});

/** What changed since the last visit, one short line each, most important first; [] = nothing new. */
export function visitDiff(prev: VisitSnapshot, d: WrappedData): string[] {
  const cur = visitSnapshot(d);
  const more = (n: number, one: string, many: string) => (n > 0 ? `+${fmt(n)} ${plural(n, one, many)}` : '');
  const gas = Number((cur.gasFeeGnot - prev.gasFeeGnot).toFixed(4));
  const won = cur.achievements.filter((id) => !prev.achievements.includes(id))
    .sort((a, b) => ACHIEVEMENT_ORDER.indexOf(a as AchievementId) - ACHIEVEMENT_ORDER.indexOf(b as AchievementId));
  const out = [
    more(cur.txCount - prev.txCount, 'transaction', 'transactions'),
    ...won.map((id) => `New achievement: ${ACHIEVEMENTS[id as AchievementId]?.title ?? id}`),
    prev.persona && cur.persona && prev.persona !== cur.persona ? `New persona: ${prev.persona} → ${cur.persona}` : '',
    prev.persona === cur.persona && prev.rank && cur.rank && cur.rank < prev.rank ? `Up ${fmt(prev.rank - cur.rank)} in your persona rank: #${fmt(prev.rank)} → #${fmt(cur.rank)}` : '',
    more(cur.swaps - prev.swaps, 'swap', 'swaps'),
    more(cur.realms - prev.realms, 'new realm called', 'new realms called'),
    more(cur.deployed - prev.deployed, 'realm deployed', 'realms deployed'),
    more(cur.activeDays - prev.activeDays, 'active day', 'active days'),
    gas > 0 ? `+${fmtGas(gas)} GNOT in gas` : '',
  ];
  return out.filter(Boolean);
}

// ---------- arrival, achievements, milestones ----------

/** "One of the first 500 on mainnet". */
export const arrivalTierText = (tier: number) => `One of the first ${fmt(tier)} on mainnet`;

/** Owner view: "#4,739 of 5,029 to arrive"; share view: the tier only (or null). */
export function arrivalText(d: WrappedData): string | null {
  const a = d.arrival;
  if (!a) return null;
  if (a.order) return `#${fmt(a.order)} of ${fmt(a.of)} to arrive on mainnet`;
  return a.tier ? arrivalTierText(a.tier) : null;
}

/** Realm Pioneer's paths in a small card: middle-truncated like the realm rows. */
const pioneerPath = (p: string) => truncMid(p, PATH_MAX.realmRow) ?? p;

export const ACHIEVEMENTS: Record<AchievementId, { title: string; rule: string; text: (v?: number, realms?: string[]) => string }> = {
  early: { title: 'Early Arrival', rule: 'Among the first 1,000 addresses to arrive on mainnet.', text: (v) => `${arrivalTierText(v ?? 1000)}.` },
  pioneer: {
    title: 'Realm Pioneer',
    rule: 'Among the first 10 addresses to call a realm that 50 or more addresses use (its deployer doesn\'t count).',
    text: (v = 1, realms) => {
      if (!realms?.length) return `One of the first 10 to call ${v === 1 ? 'a popular realm' : `${fmt(v)} popular realms`}.`;
      return v === 1 ? `One of the first 10 to call ${pioneerPath(realms[0])}.` : `One of the first 10 to call ${fmt(v)} popular realms, including ${pioneerPath(realms[0])}.`;
    },
  },
  streak: { title: 'On a Roll', rule: 'Active 3 or more days in a row (UTC days).', text: (v) => `${fmt(v ?? 3)} days in a row on gno.land.` },
  'triple-threat': { title: 'Triple Threat', rule: 'Used DeFi, NFTs and on-chain games.', text: () => 'DeFi, NFTs and on-chain games: you did all three.' },
  'gas-saver': { title: 'Gas Saver', rule: 'Among the lowest 10% in gas per transaction, with 5+ transactions.', text: () => 'Among the lowest gas per transaction this season.' },
  'validators-friend': { title: "Validators' Friend", rule: 'Among the top 10% in total gas paid.', text: () => 'Among the top 10% in gas paid. The validators thank you.' },
  century: { title: 'Century', rule: '100 or more transactions this season.', text: (v) => `${fmt(v ?? 100)} transactions this season.` },
};
export const ACHIEVEMENT_ORDER: AchievementId[] = ['early', 'pioneer', 'streak', 'triple-threat', 'century', 'validators-friend', 'gas-saver'];

export const MILESTONES: Record<MilestoneId, string> = {
  'first-swap': 'First swap on GnoSwap', 'first-collect': 'First NFT mint or buy', 'first-deploy': 'First realm deployed', 'tx-100': '100th transaction',
};

/** Season timeline: first transaction, then milestones in date order. */
export function timeline(d: WrappedData): { label: string; date: string }[] {
  const items = (d.milestones ?? []).map((m) => ({ label: MILESTONES[m.id] ?? m.id, date: m.date }));
  if (d.firstTx) items.unshift({ label: 'First transaction', date: d.firstTx.date });
  return items.sort((a, b) => a.date.localeCompare(b.date));
}
