import { achievementIcon, achievementIconRows, exportStars, personaBadge, personaBadgeRows, type PersonaColors } from '@/lib/art';
import { RARITY_COLORS, type AchievementId, type Rarity } from '@/lib/wrapped';
import { Pixel, PixelFoil } from './pixel';

/** Display-ready strings for the 1080x1350 trading card ("Download card"), in the visitor's language. */
export interface CardVM {
  seasonTag: string; // "SEASON 1" / "SEASON 1 · FINAL"
  persona: { id: string; title: string; line: string };
  colors: PersonaColors;
  personaNote?: string; // "4.5% of addresses got this persona"
  rankNote?: string; // "Top 6% of Realm Hoppers"
  stats: { label: string; value: string }[]; // three
  achievements: { id: AchievementId; rarity?: Rarity }[];
  achievementsLabel: string;
  site: string; // the public host
  dataAsOf: string;
}

/**
 * The recap as a collectible card, 1080x1350 (a 4:5 feed image), for "Download card". Static capture
 * target like SummaryExport: the foil is drawn still. No address and no exact arrival order: it's
 * made to be posted.
 */
export function TradingCard({ vm }: { vm: CardVM }) {
  const c = vm.colors;
  const titleSize = vm.persona.title.length > 14 ? 76 : 92;
  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, overflow: 'hidden', background: '#0A1030', color: '#F4F6FF', fontFamily: "'Archivo', system-ui, sans-serif" }}>
      {exportStars.slice(0, 50).map((st, i) => (
        <div key={i} style={{ position: 'absolute', left: st.x, top: Math.round(st.y * 0.8), width: st.s, height: st.s, background: st.c, opacity: st.o }} />
      ))}

      {/* the card */}
      <div style={{ position: 'absolute', inset: 44, borderRadius: 44, border: `8px solid ${c.mid}`, background: `linear-gradient(160deg, ${c.deep} 0%, #0D1440 58%, #0A1030 100%)`, boxShadow: `0 0 0 4px #050A24, inset 0 0 0 4px ${c.edge}`, overflow: 'hidden' }}>
        {/* a faint holographic sheen over the whole card */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, mixBlendMode: 'screen', background: 'repeating-linear-gradient(115deg, #FF5FA2 0 40px, #FFD166 40px 80px, #5BD15B 80px 120px, #3D8BFF 120px 160px, #9B6BFF 160px 200px)' }} />

        <div style={{ position: 'absolute', top: 34, left: 44, right: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Silkscreen', monospace", fontSize: 30, letterSpacing: '0.06em', color: c.hi }}>GNO WRAPPED</span>
          <span style={{ padding: '10px 20px', borderRadius: 999, background: c.mid, color: '#0A0F2E', fontFamily: "'Silkscreen', monospace", fontSize: 24, letterSpacing: '0.04em' }}>{vm.seasonTag}</span>
        </div>

        {/* the art window: the badge with its foil */}
        <div style={{ position: 'absolute', top: 108, left: 44, right: 44, height: 480, borderRadius: 30, border: `4px solid ${c.edge}`, background: `radial-gradient(circle at 50% 45%, ${c.mid}55 0%, ${c.deep} 62%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', filter: 'drop-shadow(12px 12px 0 #050A24)' }}>
            <Pixel art={personaBadge(vm.persona.id, 16)} />
            <PixelFoil rows={personaBadgeRows(vm.persona.id)} p={16} fx={0.32} />
          </div>
        </div>

        <div style={{ position: 'absolute', top: 618, left: 44, right: 44 }}>
          <div style={{ fontSize: titleSize, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.03em', color: '#FF8A3D' }}>{vm.persona.title}</div>
          <div style={{ marginTop: 14, fontSize: 32, lineHeight: 1.3, color: '#D3DBF7' }}>{vm.persona.line}</div>
          {(vm.rankNote || vm.personaNote) && (
            <div style={{ marginTop: 14, fontSize: 26, color: c.hi }}>{[vm.rankNote, vm.personaNote].filter(Boolean).join(' · ')}</div>
          )}
        </div>

        <div style={{ position: 'absolute', top: 868, left: 44, right: 44, display: 'flex', gap: 18 }}>
          {vm.stats.map((s) => (
            <div key={s.label} style={{ flex: 1, minWidth: 0, padding: '22px 24px', borderRadius: 24, background: 'rgba(10,16,48,0.72)', border: `2px solid ${c.edge}` }}>
              <div style={{ fontSize: s.value.length > 7 ? 46 : 58, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{s.value}</div>
              <div style={{ marginTop: 10, fontSize: 24, color: '#A3AED6', whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 1046, left: 44, right: 44 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {vm.achievements.map((a) => (
              <div key={a.id} style={{ padding: 8, borderRadius: 12, background: '#0A1030', border: `3px solid ${a.rarity ? RARITY_COLORS[a.rarity] : '#2A3566'}` }}>
                <div style={{ position: 'relative' }}>
                  <Pixel art={achievementIcon(a.id, 6)} />
                  {a.rarity === 'legendary' && <PixelFoil rows={achievementIconRows(a.id)} p={6} fx={0.4} />}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 26, color: '#C9D3F5' }}>{vm.achievementsLabel}</div>
        </div>

        <div style={{ position: 'absolute', bottom: 30, left: 44, right: 44, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#A3AED6' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{vm.site}</span>
          <span>{vm.dataAsOf}</span>
        </div>
      </div>
    </div>
  );
}
