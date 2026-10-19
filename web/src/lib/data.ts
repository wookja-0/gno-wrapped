import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cacheLife } from 'next/cache';
import type { PersonasData, WrappedData } from './wrapped';

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

export async function getPersonas(season: string): Promise<PersonasData | null> {
  'use cache';
  cacheLife('minutes');
  return getJson<PersonasData>(v1(season, 'personas'));
}

/** dataAsOf for screens that have no per-address JSON (EmptyState). */
export async function getDataAsOf(season: string): Promise<string | null> {
  'use cache';
  cacheLife('seconds');
  return (await getJson<{ dataAsOf: string }>(v1(season)))?.dataAsOf ?? null;
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
    topRealms: d.topRealms.map((r) => ({ ...r, path: mask(r.path) })),
    deployedRealms: d.deployedRealms.map(mask),
  };
}
