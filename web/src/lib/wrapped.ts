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
  dataAsOf: string;                                 // required, "YYYY-MM-DD" (UTC) of the last rebuild
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
  arrival?: Arrival;
  achievements?: Achievement[];
  milestones?: Milestone[];
}

/** Mainnet arrival order. `order` is omitted behind a share link (it's a direct lookup into chain data). */
export interface Arrival { order?: number; of: number; tier?: number }
export type AchievementId = 'early' | 'streak' | 'triple-threat' | 'gas-saver' | 'validators-friend' | 'century';
export interface Achievement { id: AchievementId; value?: number }
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
    [`My ${seasonName} on gno.land 🎁`, '', ...[...head, ...opt, rankLine].filter(Boolean), '', 'Unwrap yours 👇', shareLink(d), '', SHARE.HASHTAG].join('\n');
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
  season: Season; dataAsOf: string; addresses: number; personas: PersonaInfo[];
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
    case 'fallback': return 'Everyone else: one or two transfers so far.';
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
    case 'first-steps': return `${fmt(d.txCount)} ${plural(d.txCount, 'transaction', 'transactions')} so far: the first steps.`;
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

export const ACHIEVEMENTS: Record<AchievementId, { title: string; rule: string; text: (v?: number) => string }> = {
  early: { title: 'Early Arrival', rule: 'Among the first 1,000 addresses to arrive on mainnet.', text: (v) => `${arrivalTierText(v ?? 1000)}.` },
  streak: { title: 'On a Roll', rule: 'Active 3 or more days in a row (UTC days).', text: (v) => `${fmt(v ?? 3)} days in a row on gno.land.` },
  'triple-threat': { title: 'Triple Threat', rule: 'Used DeFi, NFTs and on-chain games.', text: () => 'DeFi, NFTs and on-chain games: you did all three.' },
  'gas-saver': { title: 'Gas Saver', rule: 'Among the lowest 10% in gas per transaction, with 5+ transactions.', text: () => 'Among the lowest gas per transaction this season.' },
  'validators-friend': { title: "Validators' Friend", rule: 'Among the top 10% in total gas paid.', text: () => 'Among the top 10% in gas paid. The validators thank you.' },
  century: { title: 'Century', rule: '100 or more transactions this season.', text: (v) => `${fmt(v ?? 100)} transactions this season.` },
};
export const ACHIEVEMENT_ORDER: AchievementId[] = ['early', 'streak', 'triple-threat', 'century', 'validators-friend', 'gas-saver'];

export const MILESTONES: Record<MilestoneId, string> = {
  'first-swap': 'First swap on GnoSwap', 'first-collect': 'First NFT mint or buy', 'first-deploy': 'First realm deployed', 'tx-100': '100th transaction',
};

/** Season timeline: first transaction, then milestones in date order. */
export function timeline(d: WrappedData): { label: string; date: string }[] {
  const items = (d.milestones ?? []).map((m) => ({ label: MILESTONES[m.id] ?? m.id, date: m.date }));
  if (d.firstTx) items.unshift({ label: 'First transaction', date: d.firstTx.date });
  return items.sort((a, b) => a.date.localeCompare(b.date));
}
