/**
 * Pixel art and backgrounds, ported from the handoff's {Main,SummaryExport,ShareCardOG}.dc.html.
 * Bitmaps are string rows; each character maps to a palette color ('.' = transparent).
 */

export interface Art {
  cols: number;
  p: number; // pixel size in px
  rows: string[][]; // colors per row; 'transparent' for gaps
}

export function pix(rows: string[], pal: Record<string, string>, p: number): Art {
  return { cols: rows[0].length, p, rows: rows.map((r) => [...r].map((ch) => pal[ch] ?? 'transparent')) };
}

// ---------- wordmark (5x5 font) ----------

const FONT: Record<string, string[]> = {
  G: ['.###.', '#....', '#.###', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  ' ': ['.', '.', '.', '.', '.'],
  '*': ['o', '.', '.', '.', '.'],
};

/** Letters for "GNO WRAPPED*". shadow = every lit pixel in the drop-shadow color (Satori has no filter). */
export function wordmark(p: number, opts: { twoLines?: boolean; shadow?: boolean } = {}): Art[][] {
  const mk = (word: string, color: string) =>
    [...word].map((ch) => pix(FONT[ch], opts.shadow ? { '#': '#1A2A78', o: '#1A2A78' } : { '#': color, o: '#FF8A3D' }, p));
  const gno = mk('GNO', '#4C95FF');
  const wr = [...mk('WRAPPED', '#F4F6FF'), ...mk('*', '#F4F6FF')];
  return opts.twoLines ? [gno, wr] : [[...gno, ...mk(' ', '#000'), ...wr]];
}

// ---------- sprites ----------

export const rocket = pix([
  '....W....', '...WWS...', '..WWWWS..', '..WLBBS..', '..WBBBS..',
  '..WWWWS..', '..WWWWS..', '.fWWWWSf.', 'ffWWWWSff', 'f..ddd..f',
], { W: '#F4F6FF', S: '#B9C3EA', L: '#BFD8FF', B: '#3D8BFF', f: '#1F6BFF', d: '#5A6696' }, 5);


// ---------- persona badges v2 ----------
// 24x24 medallion + 14x14 symbol, from the design canvas page "Persona badges v2".
// Edit a symbol here; the rim, field and 1px outline are computed. H/M/D = persona hi/mid/dark,
// W white, S white shade, O/o orange, Y yellow, N navy.

export interface PersonaColors { hi: string; mid: string; dark: string; deep: string; edge: string }
export const PERSONA_COLORS: Record<string, PersonaColors> = {
  'builder': { hi: '#A9CCFF', mid: '#3D8BFF', dark: '#1F4FC7', deep: '#13235E', edge: '#224796' },
  'day-one-explorer': { hi: '#B3F1FF', mid: '#2FD3FF', dark: '#137FAE', deep: '#0E2B55', edge: '#1A6690' },
  'realm-hopper': { hi: '#D2BEFF', mid: '#9B6BFF', dark: '#5B33C9', deep: '#231A5C', edge: '#4D3695' },
  'defi-pilot': { hi: '#A3F5CF', mid: '#1FCF8F', dark: '#0F7E58', deep: '#0E2E46', edge: '#146660' },
  'collector': { hi: '#FFB8D6', mid: '#FF5FA2', dark: '#B42868', deep: '#2E1A4E', edge: '#77326B' },
  'player-one': { hi: '#DDF7A8', mid: '#A3DE3F', dark: '#5E8F14', deep: '#1B2E45', edge: '#4B6C43' },
  'gnot-courier': { hi: '#FFE7A0', mid: '#F7C23B', dark: '#A67812', deep: '#2C2848', edge: '#735E43' },
  'first-steps': { hi: '#E3E9FF', mid: '#A9B6E6', dark: '#5E6C9E', deep: '#1A2150', edge: '#4C5584' },
};
const UNKNOWN_COLORS: PersonaColors = { hi: '#E3E9FF', mid: '#A9B6E6', dark: '#5E6C9E', deep: '#1A2150', edge: '#3F4980' };

const SYMBOLS: Record<string, string[]> = {
  'builder': [
    '......HH....Y.', '....HHHHHH.YWY',
    '..HHHHHHHHHH..', 'WWHHHHHHHHHHWW',
    'MMWWHHHHHHWWDD', 'MMMMWWHHWWDDDD',
    'MMMMMMWWDDDDDD', 'MMMMMMMDDDDDDD',
    'MMMMMMMDDDDDDD', 'MMMMMMMDDDDDDD',
    'MMMMMMMDDDDDDD', '..MMMMMDDDDD..',
    '....MMMDDD....', '......MD......',
  ],
  'day-one-explorer': [
    '..............', '.SWMMMMMMHH...',
    '.SWMMMWWMMHHH.', '.SWMMWWWMMMMH.',
    '.SWMMMWWMMMMM.', '.SWMMMWWMMMMM.',
    '.SWMMWWWWMMM..', '.SWDDMMMMDD...',
    '.SW...........', '.SW...........',
    '.SW....HH.....', 'HSWHH.HMMH....',
    'MMMMMHMMMMHH..', 'DDDDDDDDDDDDDD',
  ],
  'realm-hopper': [
    '.........HHH..', '....OO..HHMMD.',
    '..O....OHMMMD.', '.O......DMMDD.',
    '.O.......DDD..', '..............',
    '.HHHH.........', 'HHMMMD........',
    'HMMMMMD..O.HH.', 'HMMMMMD.O..MD.',
    'HMMMMDD.......', 'DMMMDDD.......',
    '.DDDDD........', '..............',
  ],
  'defi-pilot': [
    '..............', '..............',
    '.....HHHH.....', '....HMMMMM....',
    'WWW.MMMMWM.WWW', 'SWWWMWWWWWWWWS',
    '.SSWMMMMMMWWS.', '..SSWWWWWMSS..',
    '...SDWMMMDS...', '.....DDDD.....',
    '..............', '..............',
    '..............', '..............',
  ],
  'collector': [
    '..............', '...HHWWHHHH...',
    '..HWWHHMMHHM..', '.HWHHHMMMHMMD.',
    'HHHHHMMMMMMDDD', 'DMMMMMMMMMMMDD',
    '.MHHMMMMMMDDD.', '..MHMMMMMDDD..',
    '...MHMMMDDD...', '....MHMDDD....',
    '.....MMDD.....', '......MD......',
    '..............', '..............',
  ],
  'player-one': [
    '....OOOO......', '...OWOOOO.....',
    '...OOOOoo.....', '....Oooo......',
    '.....SS.......', '.....SS.......',
    '.....SS...Y...', '..HHHHHHHHYYH.',
    '.HHHHHHHHHHHHH', 'MMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMM', 'DDDDDDDDDDDDDD',
    '.DDDDDDDDDDDD.', '..............',
  ],
  'gnot-courier': [
    '..............', '...........WW.',
    '.........WWWW.', '.......WWWWHW.',
    '.....WWWWWHMW.', '...WWWWWWHMMW.',
    '.WWWWWWWHMMD..', '...SSSWHMMD...',
    '......SMMD....', '..M...SMD.....',
    '......SD......', 'M.............',
    '..............', 'H.............',
  ],
  'first-steps': [
    '..............', '..........HHHH',
    '..........MMMD', '..........MMMD',
    '.......HHHMMMD', '.......MMMMMMD',
    '.......MMMMMMD', '....HHHMMMMMMD',
    '....MMMMMMMMMD', '..W.MMMMMMMMMD',
    '.OOOMMMMMMMMMD', '.oooMMMMMMMMMD',
    '.oooMMMMMMMMMD', '.DDDDDDDDDDDDD',
  ],
};
const UNKNOWN_SYMBOL = [
  '..............', '....WWWWWW....',
  '...WW....WW...', '...WW....WW...',
  '.........WW...', '........WW....',
  '.......WW.....', '......WW......',
  '......WW......', '..............',
  '......WW......', '......WW......',
  '..............', '..............',
];
export const PERSONA_IDS = Object.keys(SYMBOLS);

const SIZE = 24;
const MID = 11.5;
const RADIUS = 11.6;
const SYMBOL_AT = 5; // symbol occupies cells 5..18

/** Medallion layer: K outline, h/m/d lit/mid/shaded rim, q groove, g light disc, f field; null outside. */
function frameCell(x: number, y: number): string | null {
  const d = Math.hypot(x - MID, y - MID);
  if (d > RADIUS) return null;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Math.hypot(x + dx - MID, y + dy - MID) > RADIUS)) return 'K';
  if (d > 9.0) {
    const v = (x - MID + (y - MID)) / Math.max(d, 0.01); // < 0 top-left (lit), > 0 bottom-right
    return v < -0.6 ? 'h' : v > 0.6 ? 'd' : 'm';
  }
  if (d > 8.1) return 'q';
  return Math.hypot(x - (MID - 1.5), y - (MID - 1.5)) < 5.5 ? 'g' : 'f';
}

/** 24 rows: medallion with the symbol placed at (5,5) and a 1px dark outline around the symbol. */
function composeBadge(symbol: string[]): string[] {
  const grid: (string | null)[][] = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => frameCell(x, y)));
  const filled = new Set<number>();
  symbol.forEach((row, sy) => [...row].forEach((ch, sx) => {
    if (ch === '.') return;
    grid[sy + SYMBOL_AT][sx + SYMBOL_AT] = ch;
    filled.add((sy + SYMBOL_AT) * SIZE + sx + SYMBOL_AT);
  }));
  for (const i of filled) {
    const x = i % SIZE, y = Math.floor(i / SIZE);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || filled.has(ny * SIZE + nx) || grid[ny][nx] === null) continue;
      grid[ny][nx] = 'K';
    }
  }
  return grid.map((r) => r.map((c) => c ?? '.').join(''));
}

function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0').toUpperCase()).join('');
}

function badgePalette(c: PersonaColors): Record<string, string> {
  return {
    K: '#070B22', W: '#F4F6FF', S: '#C9D3F5', O: '#FF8A3D', o: '#C25A1E', Y: '#FFD166', N: '#121A3D',
    H: c.hi, M: c.mid, D: c.dark, h: c.hi, m: c.mid, d: c.dark, q: '#070B22', f: c.deep, g: mix(c.deep, c.mid, 0.12),
  };
}

const composed = new Map<string, string[]>();
/** The badge's 24 rows of palette keys (memoized). Unknown ids get a neutral "?" badge. */
export function personaBadgeRows(id: string): string[] {
  const key = SYMBOLS[id] ? id : '';
  if (!composed.has(key)) composed.set(key, composeBadge(SYMBOLS[id] ?? UNKNOWN_SYMBOL));
  return composed.get(key)!;
}

export const personaColors = (id: string): PersonaColors => PERSONA_COLORS[id] ?? UNKNOWN_COLORS;

/** 24x24 persona badge; p = pixel size (p 4 = 96 px, 8 = 192 px, 12 = 288 px). */
export function personaBadge(id: string, p: number): Art {
  return pix(personaBadgeRows(id), badgePalette(personaColors(id)), p);
}

/** Neutral badge for a missing or unknown persona. */
export const badge = (p: number) => personaBadge('', p);

/** Symbol rows, for tests. */
export const personaSymbolRows = (id: string) => SYMBOLS[id] ?? [];

/**
 * Hero orbit: 12 dashes on a 1px ring in a 34x34 box (the badge sits at 5,5), as horizontal runs
 * in grid units. Lit top-left like the rim.
 */
export function personaOrbit(id: string): { x: number; y: number; w: number; color: string; opacity: number }[] {
  const c = personaColors(id), n = 34, ctr = 16.5;
  const cell = (x: number, y: number): [string, number] | null => {
    const d = Math.hypot(x - ctr, y - ctr);
    if (d <= 14.7 || d > 15.7) return null;
    const a = Math.atan2(y - ctr, x - ctr);
    if (Math.floor((a + Math.PI) / (Math.PI / 12)) % 2 !== 0) return null;
    return x + y < 2 * ctr ? [c.hi, 0.85] : [c.mid, 0.7];
  };
  const runs: { x: number; y: number; w: number; color: string; opacity: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n;) {
      const v = cell(x, y);
      if (!v) { x++; continue; }
      let w = 1;
      while (x + w < n) { const u = cell(x + w, y); if (!u || u[0] !== v[0] || u[1] !== v[1]) break; w++; }
      runs.push({ x, y, w, color: v[0], opacity: v[1] });
      x += w;
    }
  }
  return runs;
}

export const pump = pix([
  '.WWWWWW...', '.WBBBBW...', '.WBBBBWf..', '.WWWWWW.f.', '.WWWWWW..f',
  '.WWOWWW..f', '.WWWWWW..f', '.WWWWWW.ff', '.WWWWWWff.', 'WWWWWWWW..',
], { W: '#F4F6FF', B: '#3D8BFF', f: '#7DB3FF', O: '#FF8A3D' }, 6);

export const door = pix(['BBBB', 'B..B', 'B..B', 'B.oB', 'B..B'], { B: '#3D8BFF', o: '#FF8A3D' }, 3);

// ---------- backgrounds ----------

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Page background, in % of the viewport. Most stars are faint and static; a few twinkle. */
export const pageStars = (() => {
  const r = rng(11);
  const out: { x: number; y: number; s: number; o: number; c: string; twinkle: boolean; d: string; t: string }[] = [];
  for (let i = 0; i < 90; i++) {
    const x = +(r() * 100).toFixed(2), y = +(r() * 100).toFixed(2);
    const twinkle = r() > 0.8;
    const c = r() > 0.78 ? '#9CC2FF' : '#FFFFFF';
    out.push({ x, y, s: twinkle ? [2, 3, 3, 4][Math.floor(r() * 4)] : 2, o: twinkle ? 0.9 : 0.28, c, twinkle, d: (r() * 4).toFixed(2), t: (2.2 + r() * 3.4).toFixed(2) });
  }
  return out;
})();

/** SummaryExport frame (1080x1920). */
export const exportStars = (() => {
  const r = rng(41);
  const out: { x: number; y: number; s: number; c: string; o: number | string }[] = [];
  for (let i = 0; i < 80; i++) {
    const x = Math.round(r() * 1074), y = Math.round(r() * 1680);
    const s = [3, 3, 4, 5, 6][Math.floor(r() * 5)], c = r() > 0.78 ? '#9CC2FF' : '#FFFFFF', o = (0.45 + r() * 0.55).toFixed(2);
    const behindText = x > 80 && x < 1000 && y > 120;
    out.push({ x, y, s: behindText ? 3 : s, c, o: behindText ? 0.25 : o });
  }
  return out;
})();

/** ShareCardOG (1200x630). */
export const ogStars = (() => {
  const r = rng(29);
  const out: { x: number; y: number; s: number; c: string; o: number | string }[] = [];
  for (let i = 0; i < 70; i++) {
    const x = Math.round(r() * 1196), y = Math.round(r() * 520);
    const s = [2, 2, 3, 3, 4][Math.floor(r() * 5)], c = r() > 0.78 ? '#9CC2FF' : '#FFFFFF', o = (0.45 + r() * 0.55).toFixed(2);
    const behindText = x > 56 && x < 1144 && y > 40 && y < 496;
    out.push({ x, y, s: behindText ? 2 : s, c, o: behindText ? 0.25 : o });
  }
  return out;
})();

export interface PlanetRow { top: number; left: number; w: number; c: string; rim: string; shade: string }

/** Pixel-stepped arc: rows of `step` px from `top` to `bottom`, lit left rim and darker right rim. */
export function planetRows(o: { R: number; cx: number; top: number; bottom: number; step: number; bands: [number, string][]; last: string }): PlanetRow[] {
  const cy = o.top + o.R;
  const rows: PlanetRow[] = [];
  for (let y = o.top; y < o.bottom; y += o.step) {
    const i = (y - o.top) / o.step;
    const dy = y + o.step / 2 - cy;
    const w = Math.round(Math.sqrt(Math.max(0, o.R * o.R - dy * dy)) / o.step) * o.step * 2;
    const c = o.bands.find(([n]) => i < n)?.[1] ?? o.last;
    rows.push({ top: y, left: o.cx - w / 2, w, c, rim: i < 1 ? '#6D97FF' : '#5E8BFF', shade: i < 1 ? '#6D97FF' : '#18338A' });
  }
  return rows;
}

const crater = (rows: string[], p: number, x: number, y: number) => ({ ...pix(rows, { d: '#183585' }, p), x, y });

export const exportPlanet = planetRows({ R: 1100, cx: 540, top: 1764, bottom: 1920, step: 20, bands: [[1, '#6D97FF'], [3, '#2E5BD8'], [6, '#2650C4']], last: '#2045AE' });

export const ogPlanet = {
  rows: planetRows({ R: 900, cx: 600, top: 510, bottom: 630, step: 10, bands: [[1, '#6D97FF'], [3, '#2E5BD8'], [6, '#2650C4'], [9, '#2045AE']], last: '#1A3A97' }),
  craters: [crater(['.dd.', 'dddd', '.dd.'], 8, 470, 548), crater(['..ddd..', '.ddddd.', 'ddddddd'], 8, 690, 574)],
};

// ---------- achievement icons (8x8) ----------

const ACH_PAL = { O: '#FF8A3D', Y: '#FFD166', W: '#F4F6FF', B: '#3D8BFF', P: '#FF5FA2', G: '#5BD15B', R: '#FF5F7A' };
const ACH_ROWS: Record<string, string[]> = {
  early: ['...OO...', '..OOOO..', '.OOOOOO.', 'OOOOOOOO', '.WWWWWW.', '.WW..WW.', '.WW..WW.', '.WWWWWW.'], // house
  streak: ['...O....', '...OO...', '..OOO...', '..OYOO..', '.OOYYOO.', '.OYYYYO.', '.OYYYYO.', '..OOOO..'], // flame
  'triple-threat': ['...BB...', '...BB...', '........', '........', '.OO..PP.', '.OO..PP.', '........', '........'],
  'gas-saver': ['......GG', '....GGGG', '...GGGG.', '..GGGG..', '.GGGG...', '.GG.....', 'G.......', '........'], // leaf
  'validators-friend': ['........', '.RR..RR.', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '...RR...', '........'], // heart
  pioneer: ['.WGGGG..', '.WGGGGG.', '.WGGGG..', '.W......', '.W......', '.W......', '.W......', 'OOOOOOO.'], // planted flag
  century: ['YYYYYYYY', 'Y.YYYY.Y', 'Y.YYYY.Y', '.YYYYYY.', '..YYYY..', '...YY...', '..YYYY..', '.YYYYYY.'], // trophy
};
export const achievementIcon = (id: string, p: number): Art => pix(ACH_ROWS[id] ?? ACH_ROWS.century, ACH_PAL, p);
export const achievementIconRows = (id: string) => ACH_ROWS[id] ?? [];
