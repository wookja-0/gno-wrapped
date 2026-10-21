import { fmt, fmtGas, fmtShort, plural, summaryRank, validate, type Season, type WrappedData } from './wrapped';
import type { SummaryVM } from '@/components/SummaryExport';

/** The season, or null when validate() rejected it (screens then show the DATA ERROR banner). */
export const validSeason = (d: WrappedData): Season | null =>
  validate(d).some((e) => e.startsWith('season')) ? null : d.season;

export const seasonPill = (s: Season | null) =>
  s ? `MAINNET ${s.id.toUpperCase()} / ${fmtShort(s.start).toUpperCase()} - ${fmtShort(s.end).toUpperCase()}` : 'MAINNET / SEASON MISSING';

/** Summary stats shared by the page's headline row and the 1080x1920 export (hidden with their sections). */
export function summaryStats(d: WrappedData) {
  const rank = summaryRank(d.percentile || 0);
  const stats = [
    { label: 'Transactions', value: fmt(d.txCount) },
    { label: rank.label, value: rank.value },
    { label: 'Arrived on mainnet', value: 'Day ' + (d.firstTx?.mainnetDay ?? '?') },
  ];
  if (d.deployedRealms?.length) stats.push({ label: 'Realms deployed', value: fmt(d.deployedRealms.length) });
  if (d.swaps?.count > 0) stats.push({ label: 'Swaps on GnoSwap', value: fmt(d.swaps.count) });
  if (d.gasFeeGnot > 0) stats.push({ label: 'Gas spent', value: fmtGas(d.gasFeeGnot) + ' GNOT' });
  return stats;
}

export function topRealmDetail(d: WrappedData) {
  const top = d.topRealms?.[0];
  return top ? `${top.topFunc} · ${fmt(top.calls)} ${plural(top.calls, 'call', 'calls')}` : '';
}

export function exportVm(d: WrappedData): SummaryVM {
  const season = validSeason(d);
  const top = d.topRealms?.[0];
  return {
    seasonPill: seasonPill(season),
    final: d.final,
    persona: d.persona ?? { id: '', title: '', line: '' },
    stats: summaryStats(d),
    topRealm: top ? { path: top.path, detail: topRealmDetail(d) } : null,
    dataAsOf: d.dataAsOf,
  };
}
