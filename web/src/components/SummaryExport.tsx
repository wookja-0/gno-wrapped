import { exportPlanet, exportStars, wordmark } from '@/lib/art';
import type { Persona } from '@/lib/wrapped';
import { PersonaBadge, Pixel } from './pixel';

/** Display-ready strings for the 1080x1920 "Download image" frame (built like SummaryCard's). */
export interface SummaryVM {
  seasonPill: string;
  final?: boolean;
  persona: Persona;
  stats: { label: string; value: string }[];
  topRealm: { path: string; detail: string } | null;
  dataAsOf: string;
}

/** Static capture target: no animation, final values only (the handoff's SummaryExport.dc.html). No address: it's made to be shared. */
export function SummaryExport({ vm }: { vm: SummaryVM }) {
  const titleSize = vm.persona.title.length > 14 ? 72 : 92;
  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: '#0A1030', color: '#F4F6FF', fontFamily: "'Archivo', system-ui, sans-serif" }}>
      {exportStars.map((st, i) => (
        <div key={i} aria-hidden="true" style={{ position: 'absolute', left: st.x, top: st.y, width: st.s, height: st.s, background: st.c, opacity: st.o }} />
      ))}
      {exportPlanet.map((r, i) => (
        <div key={i} aria-hidden="true" style={{ position: 'absolute', top: r.top, left: r.left, width: r.w, height: 20, boxSizing: 'border-box', background: r.c, borderLeft: `20px solid ${r.rim}`, borderRight: `20px solid ${r.shade}` }} />
      ))}

      <div style={{ position: 'absolute', top: 140, left: 96, right: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div role="img" aria-label="Gno Wrapped" style={{ display: 'flex', gap: 12, filter: 'drop-shadow(6px 6px 0 #1A2A78)' }}>
          {wordmark(12)[0].map((L, i) => <Pixel key={i} art={L} />)}
        </div>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ padding: '12px 22px', borderRadius: 999, background: '#1F6BFF', color: '#FFFFFF', fontFamily: "'Silkscreen', monospace", fontSize: 26, letterSpacing: '0.04em' }}>{vm.seasonPill}</span>
          {vm.final && <span style={{ padding: '12px 22px', borderRadius: 999, background: '#FF8A3D', color: '#0A0F2E', fontFamily: "'Silkscreen', monospace", fontSize: 26, letterSpacing: '0.04em' }}>FINAL</span>}
        </div>
        <div style={{ marginTop: 44 }}><PersonaBadge id={vm.persona.id} p={12} label={`${vm.persona.title} badge`} /></div>
        <p style={{ margin: '40px 0 0', fontSize: 34, fontWeight: 500, color: '#C9D3F5' }}>Your season persona</p>
        <p style={{ margin: '8px 0 0', fontSize: titleSize, lineHeight: 1.05, fontWeight: 900, letterSpacing: '-0.03em', color: '#FF8A3D' }}>{vm.persona.title}</p>
        <p style={{ margin: '16px 0 0', maxWidth: 820, fontSize: 34, lineHeight: 1.35, color: '#D3DBF7' }}>{vm.persona.line}</p>

        <div style={{ marginTop: 44, width: '100%', display: 'flex', flexWrap: 'wrap', gap: 24, textAlign: 'left' }}>
          {vm.stats.map((s, i) => (
            <div key={i} style={{ width: 432, height: 170, boxSizing: 'border-box', padding: '28px 30px', borderRadius: 28, background: '#10173A', border: '2px solid #2A3566', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: s.value.length <= 7 ? 68 : s.value.length <= 10 ? 56 : 44, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{s.value}</div>
              <div style={{ fontSize: 28, color: '#A3AED6' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {vm.topRealm && (
          <div style={{ marginTop: 24, width: '100%', boxSizing: 'border-box', padding: '28px 30px', borderRadius: 28, background: '#10173A', border: '2px solid #2A3566', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            <div style={{ fontSize: 28, color: '#A3AED6' }}>Top realm</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 30, color: '#9CC2FF', wordBreak: 'break-all' }}>{vm.topRealm.path}</div>
            <div style={{ fontSize: 30, color: '#D3DBF7' }}>{vm.topRealm.detail}</div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: '50%', bottom: 56, transform: 'translateX(-50%)', padding: '18px 36px', borderRadius: 28, background: 'rgba(10,16,48,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 24, color: '#D3DBF7' }}>Data as of {vm.dataAsOf} · Built from public on-chain data</div>
      </div>
    </div>
  );
}
