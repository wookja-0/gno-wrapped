'use client';

import { useSyncExternalStore } from 'react';
import { countdownText, daysLeft, type Season } from '@/lib/wrapped';

const noop = () => () => {};

/**
 * "71 days left in Mainnet Season 1" next to the season pill. Read from the visitor's clock after
 * hydration (the server renders nothing), so the day count never mismatches; hidden once the season
 * is final or over.
 */
export function SeasonCountdown({ season, final }: { season: Season; final?: boolean }) {
  const left = useSyncExternalStore(noop, () => daysLeft(season, Date.now()), () => null);
  if (final || left === null) return null;
  return <span className="gw-countdown">{countdownText(season, left)}</span>;
}
