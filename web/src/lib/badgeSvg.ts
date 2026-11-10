import { personaBadge } from './art';
import { ACHIEVEMENT_ORDER, earnedIds, fmt, plural, type WrappedData } from './wrapped';

/**
 * The README badge (/<season>/s/<id>/badge.svg): the pixel persona badge, the season, the persona
 * and two numbers, as a small SVG card. Built from the share view, so no address. Text is in system
 * fonts (GitHub serves README images through its own proxy, without web fonts), so widths are estimates.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function badgeSvg(d: WrappedData): string {
  const n = d.season.id.replace(/^s/i, '');
  const title = d.persona?.title ?? 'Gno Wrapped';
  const top = `GNO WRAPPED · ${d.final ? `SEASON ${n} · FINAL` : `MAINNET SEASON ${n}`}`;
  const bottom = `${fmt(d.txCount)} ${plural(d.txCount, 'transaction', 'transactions')} · ${earnedIds(d).length}/${ACHIEVEMENT_ORDER.length} achievements`;
  const p = 2, x0 = 74; // badge pixel size; where the text starts
  const width = Math.ceil(x0 + Math.max(top.length * 7.1, title.length * 12.2, bottom.length * 6.9) + 16);

  // the badge as horizontal runs of one colour per row (far fewer rects than one per pixel)
  const art = personaBadge(d.persona?.id ?? '', p);
  const rects: string[] = [];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      let w = 1;
      while (x + w < row.length && row[x + w] === row[x]) w++;
      if (row[x] !== 'transparent') rects.push(`<rect x="${x * p}" y="${y * p}" width="${w * p}" height="${p}" fill="${row[x]}"/>`);
      x += w;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="72" viewBox="0 0 ${width} 72" role="img" aria-label="${esc(`Gno Wrapped: ${title}`)}">
<title>${esc(`Gno Wrapped: ${title}, ${bottom}`)}</title>
<rect width="${width}" height="72" rx="12" fill="#0A1030"/>
<rect x="0.5" y="0.5" width="${width - 1}" height="71" rx="11.5" fill="none" stroke="#2A3566"/>
<g transform="translate(12 12)" shape-rendering="crispEdges">${rects.join('')}</g>
<g font-family="Verdana,DejaVu Sans,Geneva,sans-serif">
<text x="${x0}" y="24" font-size="10" letter-spacing="1" fill="#7DB3FF">${esc(top)}</text>
<text x="${x0}" y="45" font-size="19" font-weight="700" fill="#FF8A3D">${esc(title)}</text>
<text x="${x0}" y="61" font-size="11" fill="#C9D3F5">${esc(bottom)}</text>
</g>
</svg>`;
}
