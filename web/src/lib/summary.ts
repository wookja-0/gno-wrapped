import { COPY, personaIn, type Copy } from './i18n';
import { fmt, fmtGas, fmtShort, validate, type Season, type WrappedData } from './wrapped';
import type { SummaryVM } from '@/components/SummaryExport';

/** The season, or null when validate() rejected it (screens then show the DATA ERROR banner). */
export const validSeason = (d: WrappedData): Season | null =>
  validate(d).some((e) => e.startsWith('season')) ? null : d.season;

export const seasonPill = (s: Season | null) =>
  s ? `MAINNET ${s.id.toUpperCase()} / ${fmtShort(s.start).toUpperCase()} - ${fmtShort(s.end).toUpperCase()}` : 'MAINNET / SEASON MISSING';

/** Summary stats shared by the page's headline row and the 1080x1920 export (hidden with their sections). */
export function summaryStats(d: WrappedData, c: Copy = COPY.en) {
  const rank = c.statRank(d.percentile || 0);
  const stats = [
    { label: c.statTransactions, value: fmt(d.txCount) },
    { label: rank.label, value: rank.value },
    { label: c.statArrived, value: c.statDay(d.firstTx?.mainnetDay ?? '?') },
  ];
  if (d.deployedRealms?.length) stats.push({ label: c.statDeployed, value: fmt(d.deployedRealms.length) });
  if (d.swaps?.count > 0) stats.push({ label: c.statSwaps, value: fmt(d.swaps.count) });
  if (d.gasFeeGnot > 0) stats.push({ label: c.statGas, value: fmtGas(d.gasFeeGnot) + ' GNOT' });
  return stats;
}

export function topRealmDetail(d: WrappedData, c: Copy = COPY.en) {
  const top = d.topRealms?.[0];
  return top ? `${top.topFunc} · ${c.callsCount(top.calls)}` : '';
}

export function exportVm(d: WrappedData, c: Copy = COPY.en): SummaryVM {
  const season = validSeason(d);
  const top = d.topRealms?.[0];
  return {
    seasonPill: seasonPill(season),
    final: d.final,
    persona: personaIn(c, d.persona) ?? { id: '', title: '', line: '' },
    stats: summaryStats(d, c),
    topRealm: top ? { path: top.path, detail: topRealmDetail(d, c) } : null,
    dataAsOf: d.dataAsOf,
    copy: { persona: c.imagePersona, topRealm: c.imageTopRealm, footer: `${c.dataAsOf(d.dataAsOf)}${c.builtFrom}` },
  };
}
