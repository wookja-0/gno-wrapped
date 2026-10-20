import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cacheLife } from 'next/cache';
import type { PersonasData, SeasonData, WrappedData } from './wrapped';

// Backend (api/): GET /v1/{season}/{address} → WrappedData, /v1/{season}/share/{id} → redacted
// WrappedData, /v1/{season}/personas → PersonasData, /v1/{season} → meta.
const API_URL = process.env.WRAPPED_API_URL ?? 'http://localhost:8080';

// Dev/test only: `?fixture=<name>` renders web/fixtures instead of API data.
export const FIXTURES_ENABLED = process.env.WRAPPED_FIXTURES === '1';
const FIXTURE_NAMES = ['full', 'no-builder-no-defi', 'day-one', 'whale', 'newcomer', 'missing-season'];

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`api ${res.status} for ${url}`);
  return (await res.json()) as T;
}

const v1 = (...parts: string[]) => `${API_URL}/v1/${parts.map(encodeURIComponent).join('/')}`;

// The batch follows the chain live, so responses are cached only for seconds.

/** The address's recap, or null when the API has none (→ EmptyState). */
export async function getWrapped(season: string, address: string): Promise<WrappedData | null> {
  'use cache';
  cacheLife('seconds');
  return getJson<WrappedData>(v1(season, address));
}

/** The redacted recap behind a share link, or null. */
export async function getShared(season: string, id: string): Promise<WrappedData | null> {
  'use cache';
  cacheLife('seconds');
  return getJson<WrappedData>(v1(season, 'share', id));
}

export async function getPersonas(season: string): Promise<PersonasData> {
  'use cache';
  cacheLife('minutes');
  return orThrow(await getJson<PersonasData>(v1(season, 'personas')), 'personas.json');
}

/** The whole chain's season for /season; throws (callers show "not available") before the batch has written it. */
export async function getSeasonData(season: string): Promise<SeasonData> {
  'use cache';
  cacheLife('minutes');
  return orThrow(await getJson<SeasonData>(v1(season, 'season')), 'season.json');
}

// A missing season file throws instead of returning null, so it isn't cached: right after a deploy
// (or a data reset) the page recovers as soon as the batch writes the file, not minutes later.
function orThrow<T>(v: T | null, file: string): T {
  if (v === null) throw new Error(`no ${file} from the batch yet`);
  return v;
}

/** dataAsOf and the final flag for screens that have no per-address JSON (EmptyState). */
export async function getSeasonStatus(season: string): Promise<{ dataAsOf: string | null; final: boolean }> {
  'use cache';
  cacheLife('seconds');
  const m = await getJson<{ dataAsOf: string; final?: boolean }>(v1(season));
  return { dataAsOf: m?.dataAsOf ?? null, final: !!m?.final };
}

export async function getFixture(name: string, shared = false): Promise<WrappedData | null> {
  if (!FIXTURES_ENABLED || !FIXTURE_NAMES.includes(name)) return null;
  const d = JSON.parse(await readFile(path.join(process.cwd(), 'fixtures', `${name}.json`), 'utf8')) as WrappedData;
  return shared ? redactFixture(d) : d;
}

/** Dev-only mirror of the batch's redact() (batch/share.go), so share views can be tested on fixtures. */
function redactFixture(d: WrappedData): WrappedData {
  // fixtures abbreviate the owner's namespace ("gno.land/r/g1wrap.../hello"), so mask by prefix too
  const mask = (p: string) => p.split(d.address).join('…').replace(new RegExp(`${d.address.slice(0, 6)}[^/]*`, 'g'), '…');
  return {
    ...d, address: '', shared: true,
    firstTx: d.firstTx && { date: d.firstTx.date, mainnetDay: d.firstTx.mainnetDay },
    arrival: d.arrival && { of: d.arrival.of, tier: d.arrival.tier },
    achievements: d.achievements?.map(({ realms: _, ...a }) => a), // eslint-disable-line @typescript-eslint/no-unused-vars
    calendar: d.calendar && {
      weeks: Array.from({ length: Math.ceil((d.calendar.daily?.length ?? 0) / 7) }, (_, w) => (d.calendar!.daily ?? []).slice(w * 7, w * 7 + 7).filter((n) => n > 0).length),
      activeDays: d.calendar.activeDays, longestStreak: d.calendar.longestStreak,
    },
    topRealms: d.topRealms.map((r) => ({ ...r, path: mask(r.path) })),
    deployedRealms: d.deployedRealms.map(mask),
  };
}
