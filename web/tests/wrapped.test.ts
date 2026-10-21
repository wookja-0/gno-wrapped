import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLimiter } from '../src/lib/limiter';
import { achievementIconRows, PERSONA_IDS, personaBadge, personaBadgeRows, personaOrbit, personaSymbolRows } from '../src/lib/art';
import {
  ACHIEVEMENT_ORDER, arrivalText, CAL_COLORS, calendarDays, calendarMonths, builderHeadline, calendarWeeks, storyIds, compareRows, defiLines, governanceLines, realmUseText, successRate, successText, topPairText, countdownText, parseShareId, dayLevel, daysLeft, dayText, dayTxAction, daySeries, peakIndex, seasonDays, visitDiff, visitSnapshot, weekLevel, weekText, builderCards, fmtGas, timeline, gnoscanAccount, gnoscanRealm, gnoscanTx, personaRankText, personaRuleText, personaWhy, rankTopPct, shareLink, sharePost, X_MAX, xLength, fuelLine, gasPerTx, isEmpty, ogRankCard, realmShortName,
  slideIds, summaryRank, truncMid, validate, weekRange, type WrappedData,
} from '../src/lib/wrapped';

const load = (name: string) =>
  JSON.parse(readFileSync(path.join(__dirname, '../fixtures', `${name}.json`), 'utf8')) as WrappedData;
const FIXTURES = ['full', 'no-builder-no-defi', 'day-one', 'whale', 'newcomer', 'missing-season'];

describe('validate', () => {
  it.each(FIXTURES.filter((f) => f !== 'missing-season'))('%s is valid', (f) => {
    expect(validate(load(f))).toEqual([]);
  });
  it('missing-season has exactly 1 error', () => {
    expect(validate(load('missing-season'))).toHaveLength(1);
  });
  it('rejects a weekly array that does not match the season', () => {
    const d = load('full');
    d.swaps.weekly = d.swaps.weekly.slice(1);
    expect(validate(d)).toEqual(['swaps.weekly has 15 entries; season needs 16']);
  });
});

describe('slideIds', () => {
  it('newcomer skips Builder and DeFi', () => {
    expect(slideIds(load('newcomer'))).toEqual(['ArrivalSlide', 'ActivitySlide', 'RealmSlide', 'FuelSlide', 'PersonaSlide', 'SummaryCard']);
  });
  it('no-builder-no-defi skips Builder and DeFi', () => {
    expect(slideIds(load('no-builder-no-defi'))).not.toContain('BuilderSlide');
    expect(slideIds(load('no-builder-no-defi'))).not.toContain('DefiSlide');
  });
  it('full shows every slide', () => {
    expect(slideIds(load('full'))).toHaveLength(8);
  });
  it('JSON 404 and txCount 0 are empty', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty({ ...load('full'), txCount: 0 })).toBe(true);
  });
});

describe('copy rules (acceptance checklist)', () => {
  it('newcomer OG rank card is the top realm', () => {
    expect(ogRankCard(load('newcomer'))).toEqual({ value: 'users', label: 'top realm · 1 call' });
  });
  it('whale: Top 1%, high fuel line, gas, per-tx', () => {
    const w = load('whale');
    expect(summaryRank(w.percentile).value).toBe('Top 1%');
    expect(ogRankCard(w).value).toBe('Top 1%');
    expect(fuelLine(w.gasFeeGnot)).toBe('You kept the validators well fed.');
    expect(fmtGas(w.gasFeeGnot)).toBe('1,520.75');
    expect(gasPerTx(w.gasFeeGnot, w.txCount)).toBe('≈0.032');
  });
  it('full: busiest week Oct 24–30', () => {
    const d = load('full');
    const bi = d.swaps.weekly.indexOf(Math.max(...d.swaps.weekly));
    expect(weekRange(bi, d.season.start)).toBe('Oct 24–30');
  });
  it('full: 87% stays as "N% of addresses outpaced"', () => {
    expect(ogRankCard(load('full'))).toEqual({ value: '87%', label: 'of addresses outpaced' });
  });
  it('realm short names skip versions and cap at 12 chars', () => {
    expect(realmShortName('gno.land/r/gnoland/users/v1')).toBe('users');
    expect(realmShortName('gno.land/r/x/multi_hop_swap_executor')).toBe('multi_hop_s…');
  });
});

describe('changes agreed after checking real data', () => {
  it('gas under 0.01 keeps two significant digits', () => {
    expect(fmtGas(0.0011)).toBe('0.0011');
    expect(fmtGas(0.00657)).toBe('0.0066');
    expect(fmtGas(0.02)).toBe('0.02');
    expect(fmtGas(12.4)).toBe('12.4');
  });
  it('fuel tiers are 1 / 10 GNOT', () => {
    expect(fuelLine(0.96)).toBe('Your wallet barely noticed.');
    expect(fuelLine(1)).toBe('A steady burn. Every block counted.');
    expect(fuelLine(13)).toBe('You kept the validators well fed.');
  });
  it('builder shows 3 cards and counts the rest', () => {
    const paths = Array.from({ length: 308 }, (_, i) => `gno.land/r/g1wrappedrealmsqqqqqqqqqqqqqqqqqqqqqqqqq/realm${i}`);
    const { cards, more } = builderCards(paths);
    expect(cards).toHaveLength(3);
    expect(more).toBe(305);
    expect(cards[0].prefix + cards[0].name).toBe(truncMid(paths[0], 36));
  });
});

describe('gnoscan links', () => {
  it('encodes base64 tx hashes (gnoscan URL-decodes txhash)', () => {
    expect(gnoscanTx('6rc/woCBRr4OkFdEhgfDEVYBPRYRa2uW9vOP4jbZ52g=')).toBe(
      'https://gnoscan.io/transactions/details?txhash=6rc%2FwoCBRr4OkFdEhgfDEVYBPRYRa2uW9vOP4jbZ52g%3D');
  });
  it('keeps realm paths as they are (gnoscan does not decode path)', () => {
    expect(gnoscanRealm('gno.land/r/gnoswap/staker')).toBe('https://gnoscan.io/realms/details?path=gno.land/r/gnoswap/staker');
    expect(gnoscanRealm('gno.land/r/x y')).toBe('https://gnoscan.io/realms/details?path=gno.land%2Fr%2Fx%20y');
  });
  it('account page', () => {
    expect(gnoscanAccount('g1abc')).toBe('https://gnoscan.io/account/g1abc');
  });
});

describe('share post', () => {
  it('full: one fact per line, link and hashtag last (swaps dropped to fit 280)', () => {
    expect(sharePost(load('full'))).toBe([
      'My Mainnet Season 1 on gno.land 🎁',
      '',
      '🏷️ Persona: Realm Hopper',
      '📈 1,284 transactions · top 13% of addresses',
      '🚀 Arrived on day 22 · one of the first 500',
      '🛠️ Deployed 2 realms',
      '🏅 #12 of 221 Realm Hoppers (top 6%)',
      '',
      'Unwrap yours 👇',
      'https://wrapped.example/s1/s/fxfull000000',
      '',
      '#GnoWrapped',
    ].join('\n'));
  });
  it('whale: top rank and day 1', () => {
    const post = sharePost(load('whale'));
    expect(post).toContain('📈 48,210 transactions · top 1% of addresses');
    expect(post).toContain('🚀 Here since day 1 of mainnet');
  });
  it('newcomer: no rank line, no empty sections', () => {
    const post = sharePost(load('newcomer'));
    expect(post).toContain('📈 2 transactions\n');
    expect(post).not.toMatch(/active than|top \d|swaps? on|Deployed/);
  });
  it('fits in a post on X', () => {
    for (const f of FIXTURES.filter((f) => f !== 'missing-season')) expect(xLength(sharePost(load(f))), f).toBeLessThanOrEqual(X_MAX);
  });
  it('drops optional lines rather than going over the limit', () => {
    const d = load('full');
    const huge = sharePost({
      ...d, txCount: 9_999_999, percentile: 99, firstTx: { date: '2026-09-20', mainnetDay: 99 },
      deployedRealms: Array.from({ length: 99_999 }, (_, i) => `gno.land/r/x/r${i}`),
      swaps: { ...d.swaps, count: 9_999_999 },
      persona: { id: 'day-one-explorer', title: 'Day-One Explorer', line: '' },
      personaRank: { rank: 9_999, of: 99_999, metric: 'firstTx', value: 0 },
    });
    expect(xLength(huge)).toBeLessThanOrEqual(X_MAX);
    expect(huge).toContain('🏷️ Persona: Day-One Explorer');
    expect(huge).toContain('🏅 #9,999 of 99,999 Day-One Explorers');
  });
  it('keeps the swaps line when there is room', () => {
    expect(sharePost({ ...load('full'), deployedRealms: [] })).toContain('🔄 36 swaps on GnoSwap');
  });
  it('arrival line without an early tier', () => {
    expect(sharePost({ ...load('full'), arrival: { of: 5029 } })).toContain('🚀 Arrived on day 22 of mainnet');
    expect(sharePost({ ...load('full'), firstTx: { date: '2026-09-12', mainnetDay: 1 } })).toContain('🚀 Here since day 1 · one of the first 500');
  });
  it('mid percentiles say "more active than"', () => {
    expect(sharePost({ ...load('full'), percentile: 40 })).toContain('· more active than 40% of addresses');
  });
  it('never contains the address', () => {
    const d = load('full');
    expect(sharePost(d)).not.toContain(d.address.slice(0, 6));
  });
});

describe('arrival, achievements, timeline', () => {
  it('owner sees the exact order, a share link only the tier', () => {
    const d = load('full');
    expect(arrivalText(d)).toBe('#312 of 5,029 to arrive on mainnet');
    expect(arrivalText({ ...d, arrival: { of: 5029, tier: 500 } })).toBe('One of the first 500 on mainnet');
    expect(arrivalText({ ...d, arrival: { of: 5029 } })).toBeNull();
  });
  it('timeline is in date order, starting with the first tx', () => {
    expect(timeline(load('full')).map((t) => t.label)).toEqual(['First transaction', 'First swap on GnoSwap', 'First realm deployed', '100th transaction']);
  });
  it('every achievement has an 8x8 icon', () => {
    for (const id of ACHIEVEMENT_ORDER) {
      const rows = achievementIconRows(id);
      expect(rows.length, id).toBe(8);
      expect(rows.every((r) => r.length === 8), id).toBe(true);
    }
  });
});

describe('activity calendar', () => {
  it('fixtures are consistent: one entry per season day, summing to txCount', () => {
    for (const name of ['full', 'whale', 'newcomer', 'day-one', 'no-builder-no-defi']) {
      const d = load(name);
      const daily = d.calendar!.daily!;
      expect(daily.length, name).toBe(seasonDays(d.season));
      expect(daily.reduce((a, b) => a + b, 0), name).toBe(d.txCount);
      expect(daily.filter((n) => n > 0).length, name).toBe(d.calendar!.activeDays);
    }
    expect(validate({ ...load('full'), calendar: { daily: [1, 2], activeDays: 2, longestStreak: 2 } })).toEqual(['calendar.daily has 2 entries; season needs 111']);
  });
  it('levels: log scale up to the busiest day; weeks by active days', () => {
    expect([0, 1, 2, 9, 30, 100].map((n) => dayLevel(n, 100))).toEqual([0, 1, 1, 2, 3, 4]);
    expect(dayLevel(1, 1)).toBe(4);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(weekLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
    expect(CAL_COLORS).toHaveLength(5);
  });
  it('days after dataAsOf are in the future; text for each kind of cell', () => {
    const d = load('newcomer'); // dataAsOf 2026-12-30
    const days = calendarDays(d);
    expect(days[0]).toEqual({ date: '2026-09-12', count: 0, level: 0, future: false });
    expect(days.at(-1)).toMatchObject({ date: '2026-12-31', future: true });
    expect(dayText(days[0])).toBe('No activity on Sep 12');
    expect(dayText(days.at(-1)!)).toBe("Dec 31 hasn't happened yet");
    expect(dayText({ date: '2026-10-14', count: 12, level: 3, future: false })).toBe('12 transactions on Oct 14');
  });
  it('month labels sit on the week column of the 1st', () => {
    expect(calendarMonths(load('full'))).toEqual([{ week: 0, label: 'Sep' }, { week: 2, label: 'Oct' }, { week: 7, label: 'Nov' }, { week: 11, label: 'Dec' }]);
  });
  it('day list lines say what the first message did', () => {
    const base = { hash: 'h', time: '09:05' };
    expect(dayTxAction({ ...base, kind: 'call', path: 'gno.land/r/gnoswap/router', func: 'ExactInSwapRoute' })).toEqual({ action: 'ExactInSwapRoute', path: 'gno.land/r/gnoswap/router' });
    expect(dayTxAction({ ...base, kind: 'send' })).toEqual({ action: 'Sent GNOT' });
    expect(dayTxAction({ ...base, kind: 'deploy', path: 'gno.land/r/demo/hello' })).toEqual({ action: 'Deployed', path: 'gno.land/r/demo/hello' });
    expect(dayTxAction({ ...base, kind: 'run' })).toEqual({ action: 'Ran a script' });
    expect(dayTxAction({ ...base, kind: 'other' })).toEqual({ action: 'Transaction' });
  });
  it('share view: weeks only', () => {
    const weeks = calendarWeeks({ ...load('full'), calendar: { weeks: [0, 3, 7], activeDays: 10, longestStreak: 7 } });
    expect(weeks.map((w) => [w.date, w.level])).toEqual([['2026-09-12', 0], ['2026-09-19', 2], ['2026-09-26', 4]]);
    expect(weekText(weeks[1], '2026-09-12', 1)).toBe('3 of 7 days active, week of Sep 19–25');
  });
});

describe('the whole season', () => {
  it('daily series: dated from season.start, future after dataAsOf; peak is the first max', () => {
    const s = { id: 's1', start: '2026-09-12', end: '2026-12-31' };
    expect(daySeries([4, 0, 9], s, '2026-09-13')).toEqual([
      { date: '2026-09-12', value: 4, future: false }, { date: '2026-09-13', value: 0, future: false }, { date: '2026-09-14', value: 9, future: true },
    ]);
    expect(peakIndex([1, 7, 7, 2])).toBe(1);
    expect(peakIndex([0, 0])).toBe(-1);
  });
});

describe('season countdown and the final recap', () => {
  const s = { id: 's1', start: '2026-09-12', end: '2026-12-31' };
  it('counts whole UTC days after today; 0 on the last day; null once over', () => {
    expect(daysLeft(s, Date.parse('2026-10-21T09:00:00Z'))).toBe(71);
    expect(daysLeft(s, Date.parse('2026-12-30T23:59:00Z'))).toBe(1);
    expect(daysLeft(s, Date.parse('2026-12-31T00:00:00Z'))).toBe(0);
    expect(daysLeft(s, Date.parse('2027-01-01T00:00:00Z'))).toBeNull();
    expect(countdownText(s, 71)).toBe('71 days left in Mainnet Season 1');
    expect(countdownText(s, 1)).toBe('1 day left in Mainnet Season 1');
    expect(countdownText(s, 0)).toBe('Last day of Mainnet Season 1');
  });
  it("a final recap's post says so, and still fits on X", () => {
    const post = sharePost({ ...load('whale'), final: true });
    expect(post.split('\n')[0]).toBe('My Mainnet Season 1 on gno.land: the final recap 🎁');
    expect(xLength(post)).toBeLessThanOrEqual(X_MAX);
    expect(sharePost(load('full')).split('\n')[0]).toBe('My Mainnet Season 1 on gno.land 🎁');
  });
});

describe('compare two recaps', () => {
  it('reads a share ID from a link or the ID itself, nothing else', () => {
    expect(parseShareId('https://gnowrapped.wookjin.cloud/s1/s/0502axjyazs8')).toBe('0502axjyazs8');
    expect(parseShareId(' https://x.example/s1/s/0502AXJYAZS8?utm=1 ')).toBe('0502axjyazs8');
    expect(parseShareId('0502axjyazs8')).toBe('0502axjyazs8');
    expect(parseShareId('https://x.example/s1/g1wrappedsampleqqqqqqqqqqqqqqqqqqqqqqqqq')).toBeNull();
    expect(parseShareId('0502axjyazs')).toBeNull();
  });
  it('marks who is ahead: more, or an earlier arrival; gas and ties have no mark', () => {
    const rows = compareRows(load('full'), load('whale'));
    const by = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(by['Transactions']).toEqual({ label: 'Transactions', a: '1,284', b: '48,210', ahead: 'b' });
    expect(by['Arrived on mainnet']).toMatchObject({ a: 'Day 22', b: 'Day 1', ahead: 'b' });
    expect(by['Gas spent'].ahead).toBeNull();
    expect(compareRows(load('full'), load('full')).every((r) => r.ahead === null)).toBe(true);
  });
});

describe('success rate, GnoSwap detail, governance, builder report', () => {
  it('success rate rounds down and has a line for clean records', () => {
    const d = load('full'); // 1,284 ok, 7 failed
    expect(successRate(d)).toBe(99);
    expect(successText(d)).toBe('99% of your transactions went through (7 failed).');
    expect(successText({ ...d, failedTxs: 0 })).toBe('Every one of your transactions went through.');
    expect(successText({ ...d, txCount: 2, failedTxs: 0 })).toBe('');
    expect(successRate({ ...d, txCount: 999, failedTxs: 1 })).toBe(99); // never 100% with a failure
  });
  it('GnoSwap and governance lines list nonzero numbers only', () => {
    const d = load('full');
    expect(defiLines(d).map((l) => `${l.value} ${l.label}`)).toEqual(['3 positions opened', '2 liquidity changes', '5 fee collections', '2 positions staked', '4 rewards claimed']);
    expect(topPairText(d)).toBe('GNOT ↔ GNS · 24 swaps');
    expect(defiLines({ ...d, defi: { staked: 1 } })).toEqual([{ value: '1', label: 'position staked' }]);
    expect(governanceLines(load('whale')).map((l) => `${l.value} ${l.label}`)).toEqual(['3 votes', '1 proposal', '4 GNS delegations']);
    expect(governanceLines(d)).toEqual([]);
  });
  it('builder report: totals and per-realm lines', () => {
    const d = load('full');
    expect(builderHeadline(d)).toBe('Your realms got 340 calls from other addresses.');
    expect(realmUseText({ path: 'x', callers: 12, calls: 340 })).toBe('340 calls from 12 addresses');
    expect(realmUseText({ path: 'x', callers: 0, calls: 0 })).toBe('No one else has called it yet');
    expect(builderHeadline({ ...d, builder: [{ path: 'x', callers: 0, calls: 0 }] })).toBeNull();
  });
});

describe('story mode', () => {
  it('slides follow the data: none for what a recap lacks', () => {
    expect(storyIds(load('full'))).toEqual(['intro', 'arrival', 'activity', 'calendar', 'realm', 'defi', 'builder', 'achievements', 'persona', 'outro']);
    expect(storyIds(load('whale'))).toContain('governance');
    expect(storyIds(load('newcomer'))).not.toContain('builder');
  });
});

describe('rate limiter', () => {
  it('allows max hits per window per key, then says when to retry', () => {
    const l = createLimiter(2, 60_000);
    expect(l.hit('a', 0)).toEqual({ ok: true, retryAfter: 60 });
    expect(l.hit('a', 1_000).ok).toBe(true);
    expect(l.hit('a', 30_000)).toEqual({ ok: false, retryAfter: 30 });
    expect(l.hit('b', 30_000).ok).toBe(true); // another client
    expect(l.hit('a', 60_000).ok).toBe(true); // a new window
  });
});

describe('since your last visit', () => {
  it('nothing new, nothing to say', () => {
    const d = load('full');
    expect(visitDiff(visitSnapshot(d), d)).toEqual([]);
  });
  it('lists what changed, most important first', () => {
    const d = load('full');
    const prev = { ...visitSnapshot(d), txCount: d.txCount - 12, swaps: d.swaps.count - 3, gasFeeGnot: d.gasFeeGnot - 0.42,
      activeDays: d.calendar!.activeDays - 2, achievements: ['early'], rank: 20 };
    expect(visitDiff(prev, d)).toEqual([
      '+12 transactions', 'New achievement: Realm Pioneer', 'New achievement: On a Roll', 'New achievement: Triple Threat',
      'Up 8 in your persona rank: #20 → #12', '+3 swaps', '+2 active days', '+0.42 GNOT in gas',
    ]);
  });
  it('a new persona replaces the rank line', () => {
    const d = load('full');
    expect(visitDiff({ ...visitSnapshot(d), persona: 'GNOT Courier', rank: 900 }, d)).toEqual(['New persona: GNOT Courier → Realm Hopper']);
  });
});

describe('persona rank', () => {
  it('text and top share', () => {
    const d = load('full');
    expect(personaRankText(d)).toBe('#12 of 221 Realm Hoppers');
    expect(rankTopPct({ rank: 102, of: 514, metric: 'defi', value: 17 })).toBe(20);
    expect(rankTopPct({ rank: 1, of: 2417, metric: 'transfer', value: 9 })).toBe(1);
    expect(personaRankText({ ...d, personaRank: undefined })).toBeNull();
  });
  it('the share post only brags about the top half', () => {
    const d = load('full');
    expect(sharePost({ ...d, personaRank: { rank: 110, of: 221, metric: 'realms', value: 8 } })).toContain('🏅 #110 of 221 Realm Hoppers (top 50%)');
    expect(sharePost({ ...d, personaRank: { rank: 120, of: 221, metric: 'realms', value: 8 } })).not.toContain('🏅');
  });
});

describe('personas and share links', () => {
  it('share links use the share id, never the address', () => {
    expect(shareLink(load('full'))).toBe('https://wrapped.example/s1/s/fxfull000000');
  });
  it('explains why, from the address\'s own numbers', () => {
    const d = load('full');
    expect(personaWhy({ ...d, persona: { id: 'defi-pilot', title: 'DeFi Pilot', line: '', share: 0.89 } })).toBe('89% of your moves went through GnoSwap and wugnot.');
    expect(personaWhy({ ...d, persona: { id: 'builder', title: 'Builder', line: '' } })).toBe('You deployed 2 realms to mainnet.');
    expect(personaWhy({ ...d, txCount: 1, persona: { id: 'first-steps', title: 'First Steps', line: '' } })).toBe('1 transaction: the first steps.');
  });
  it('describes each rule', () => {
    expect(personaRuleText({ kind: 'share', category: 'play', min: 0.5 })).toBe('At least 50% of your moves were on-chain games.');
    expect(personaRuleText({ kind: 'firstDay', max: 3 })).toBe('First transaction within the first 3 days of mainnet.');
  });
  it('has 8 badges with 14x14 symbols in a 24x24 medallion', () => {
    expect(PERSONA_IDS).toHaveLength(8);
    for (const id of PERSONA_IDS) {
      const rows = personaSymbolRows(id);
      expect(rows.length, id).toBe(14);
      expect(rows.every((r) => r.length === 14), id).toBe(true);
      const art = personaBadge(id, 1);
      expect([art.cols, art.rows.length], id).toEqual([24, 24]);
      expect(art.rows.flat().every((c) => c === 'transparent' || /^#[0-9A-F]{6}$/i.test(c)), id).toBe(true); // every key has a color
    }
  });
  it('falls back to a neutral badge for an unknown persona', () => {
    expect(personaBadgeRows('nope')).toEqual(personaBadgeRows(''));
    expect(personaBadge('nope', 1).cols).toBe(24);
  });
  it('draws the hero orbit inside its 34x34 box', () => {
    for (const id of PERSONA_IDS) {
      const runs = personaOrbit(id);
      expect(runs.length, id).toBeGreaterThan(10);
      expect(runs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= 34 && r.y < 34), id).toBe(true);
    }
  });
});

// Every address the batch produced must pass the same contract checks the app enforces.
const OUT = path.join(__dirname, '../../data/out/s1');
describe.runIf(existsSync(OUT))('real batch output', () => {
  // vitest still evaluates a skipped describe's body, so read the folder only when it exists
  const all: WrappedData[] = (existsSync(OUT) ? readdirSync(OUT) : [])
    .filter((f) => f.endsWith('.json') && !['meta.json', 'personas.json', 'season.json'].includes(f))
    .flatMap((f) => Object.values(JSON.parse(readFileSync(path.join(OUT, f), 'utf8')) as Record<string, WrappedData>));

  it('has addresses', () => expect(all.length).toBeGreaterThan(0));
  it('every address validates', () => {
    const bad = all.filter((d) => validate(d).length).map((d) => d.address);
    expect(bad).toEqual([]);
  });
  it('no gas renders as zero', () => {
    expect(all.filter((d) => d.gasFeeGnot > 0 && /^0(\.0+)?$/.test(fmtGas(d.gasFeeGnot))).length).toBe(0);
  });
  it('every share post fits on X and has no address', () => {
    const bad = all.filter((d) => xLength(sharePost(d)) > X_MAX || sharePost(d).includes(d.address.slice(0, 6))).map((d) => d.address);
    expect(bad).toEqual([]);
  });
  it('every address has an arrival order', () => {
    expect(all.filter((d) => !d.arrival?.order || d.arrival.order > d.arrival.of).length).toBe(0);
  });
  it('every address has a share id', () => {
    expect(all.filter((d) => !/^[0-9a-z]{12}$/.test(d.shareId ?? '')).length).toBe(0);
  });
  it('every address has its first tx hash', () => {
    expect(all.filter((d) => !d.firstTx?.hash).length).toBe(0);
  });
  it('every story ends with the summary', () => {
    expect(all.every((d) => slideIds(d).at(-1) === 'SummaryCard')).toBe(true);
  });
});
