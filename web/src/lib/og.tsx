import type { ReactElement } from 'react';
import { type Art, ogPlanet, ogStars, wordmark } from './art';
import { fmt, ogPersonaSize, ogRankCard, ogValueSize, plural, type WrappedData } from './wrapped';

/**
 * ShareCardOG (1200x630) for Satori, ported from the handoff's ShareCardOG.dc.html.
 * Satori rules: every container is display:flex, no grid / filter / blend modes / images,
 * no font shorthand. Sized for ~500px display, so no text under 26px.
 * No address in any form: the card is what share links preview (the short form alone identifies an address).
 */
export function ShareCardOG({ d }: { d: WrappedData }): ReactElement {
  const p = 10, sh = 5;
  const stats = [
    { value: fmt(d.txCount), label: plural(d.txCount, 'transaction', 'transactions') },
    ogRankCard(d),
    { value: 'Day ' + (d.firstTx ? d.firstTx.mainnetDay : '?'), label: 'arrived on mainnet' },
  ];
  const title = d.persona?.title ?? '';
  return (
    <div style={{ display: 'flex', position: 'relative', width: 1200, height: 630, overflow: 'hidden', background: '#0A1030', color: '#F4F6FF', fontFamily: 'Archivo' }}>
      {ogStars.map((st, i) => (
        <div key={i} style={{ display: 'flex', position: 'absolute', left: st.x, top: st.y, width: st.s, height: st.s, background: st.c, opacity: Number(st.o) }} />
      ))}
      {ogPlanet.rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', position: 'absolute', top: r.top, left: r.left, width: r.w, height: 10, background: r.c, borderLeft: `10px solid ${r.rim}`, borderRight: `10px solid ${r.shade}` }} />
      ))}
      {ogPlanet.craters.map((cr, i) => <Grid key={i} art={cr} style={{ position: 'absolute', left: cr.x, top: cr.y }} />)}

      <div style={{ display: 'flex', position: 'absolute', top: 52, left: 64, right: 64, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          <div style={{ display: 'flex', position: 'absolute', top: sh, left: sh, gap: p }}>
            {wordmark(p, { shadow: true })[0].map((L, i) => <Grid key={i} art={L} />)}
          </div>
          <div style={{ display: 'flex', position: 'relative', gap: p }}>
            {wordmark(p)[0].map((L, i) => <Grid key={i} art={L} />)}
          </div>
        </div>
        {/* the final recap says so, in the same width: "SEASON 1 · FINAL" is as long as "MAINNET SEASON 1" */}
        <div style={{ display: 'flex', padding: '10px 18px', borderRadius: 999, background: d.final ? '#FF8A3D' : '#1F6BFF', color: d.final ? '#0A0F2E' : '#FFFFFF', fontFamily: 'Silkscreen', fontSize: 26, letterSpacing: '0.04em' }}>
          {d.final ? `SEASON ${d.season.id.replace(/^s/i, '').toUpperCase()} · FINAL` : 'MAINNET SEASON ' + d.season.id.replace(/^s/i, '').toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', top: 160, left: 64, right: 64, fontSize: ogPersonaSize(title), lineHeight: 1, fontWeight: 900, letterSpacing: '-0.03em', color: '#FF8A3D', whiteSpace: 'nowrap' }}>{title}</div>

      <div style={{ display: 'flex', position: 'absolute', top: 296, left: 64, right: 64, gap: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, minWidth: 0, height: 190, padding: '26px 28px', borderRadius: 24, background: '#10173A', border: '2px solid #2A3566' }}>
            <div style={{ display: 'flex', fontSize: ogValueSize(s.value), lineHeight: 1, fontWeight: 900, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}>{s.value}</div>
            <div style={{ display: 'flex', marginTop: 'auto', fontSize: 28, lineHeight: 1.1, fontWeight: 500, color: '#C9D3F5', whiteSpace: 'nowrap' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Grid({ art, style }: { art: Art; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {art.rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex' }}>
          {row.map((bg, ci) => <div key={ci} style={{ display: 'flex', width: art.p, height: art.p, background: bg }} />)}
        </div>
      ))}
    </div>
  );
}
