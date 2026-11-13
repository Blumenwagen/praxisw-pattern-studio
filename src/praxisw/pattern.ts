import { LOGO_PATHS } from './logo';

export const FAMILIES = [
  { id: 'fans', name: 'Petal fans', note: 'Nested curves, like the reference' },
  { id: 'weave', name: 'Leaf weave', note: 'An alternating botanical rhythm' },
  { id: 'bloom', name: 'Four-leaf bloom', note: 'A soft, radial arrangement' },
  { id: 'ribbons', name: 'Leaf ribbons', note: 'Flowing, interlocking sweeps' },
  { id: 'petals', name: 'Petal lattice', note: 'Mirrored petals in an open grid' },
  { id: 'marks', name: 'Logo rhythm', note: 'The complete mark, repeated' },
] as const;
export type Family = typeof FAMILIES[number]['id'];
export type View = 'pattern' | 'card';
export interface Settings {
  family: Family; scale: number; weight: number; nesting: number; turn: number;
  variation: number; seed: number; plum: string; sage: string; paper: string;
  mono: boolean; band: number; side: 'left' | 'right' | 'full'; logoSize: number;
  showLogo: boolean; offsetX: number; offsetY: number;
}
export const DEFAULTS: Settings = {
  family: 'fans', scale: 115, weight: 100, nesting: 2, turn: 0,
  variation: 0, seed: 314, plum: '#69576B', sage: '#93ADA2', paper: '#F5F3EE',
  mono: false, band: 31, side: 'left', logoSize: 23, showLogo: true, offsetX: 0, offsetY: 0,
};
export const PRESETS: {name: string; description: string; patch: Partial<Settings>}[] = [
  { name: 'Petal study', description: 'Bold, nested brand curves', patch: {family: 'fans', scale: 115, weight: 100, nesting: 2, turn: 0, variation: 0} },
  { name: 'Quiet weave', description: 'Airy leaves with a gentle rhythm', patch: {family: 'weave', scale: 95, weight: 74, nesting: 1, turn: 0, variation: 0} },
  { name: 'Garden bloom', description: 'Four leaves, one flowing rosette', patch: {family: 'bloom', scale: 125, weight: 91, nesting: 1, turn: 15, variation: 0} },
  { name: 'Plum ribbons', description: 'A graphic single-colour repeat', patch: {family: 'ribbons', scale: 125, weight: 103, nesting: 1, turn: 0, variation: 0, mono: true} },
  { name: 'Petal lace', description: 'Fine layers for a softer texture', patch: {family: 'fans', scale: 100, weight: 92, nesting: 4, turn: 0, variation: 0} },
  { name: 'Open lattice', description: 'Small petals with room to breathe', patch: {family: 'petals', scale: 110, weight: 82, nesting: 2, turn: 0, variation: 0} },
];
const ranges: Record<string, [number, number]> = {
  scale: [45, 220], weight: [50, 120], nesting: [1, 4], turn: [-180, 180],
  variation: [0, 100], seed: [0, 999999], band: [18, 48], logoSize: [10, 32],
  offsetX: [-100, 100], offsetY: [-100, 100],
};
export function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a Praxis W project JSON file.');
  const s = {...DEFAULTS};
  const v = value as Record<string, unknown>;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (typeof v[key] === 'number' && Number.isFinite(v[key])) Object.assign(s, {[key]: Math.min(max, Math.max(min, v[key]))});
  }
  s.nesting = Math.round(s.nesting); s.seed = Math.round(s.seed);
  if (FAMILIES.some(f => f.id === v.family)) s.family = v.family as Family;
  for (const key of ['plum', 'sage', 'paper'] as const) if (typeof v[key] === 'string' && /^#[0-9a-f]{6}$/i.test(v[key])) s[key] = v[key];
  if (v.side === 'left' || v.side === 'right' || v.side === 'full') s.side = v.side;
  if (typeof v.mono === 'boolean') s.mono = v.mono;
  if (typeof v.showLogo === 'boolean') s.showLogo = v.showLogo;
  return s;
}
const f = (n: number) => Math.round(n * 10000) / 10000;
const mod = (n: number, by: number) => ((n % by) + by) % by;
export function noise(seed: number, x: number, y: number): number {
  let n = Math.imul(seed ^ Math.imul(x + 17, 374761393), 668265263) ^ Math.imul(y + 31, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const shape = (i: number, color: string, transform = '') => `<path d="${LOGO_PATHS[i]}" fill="${color}"${transform ? ` transform="${transform}"` : ''}/>`;
const group = (transform: string, content: string) => `<g transform="${transform}">${content}</g>`;
function leaf(color: string, scale: number, angle: number) {
  return group(`rotate(${f(angle)}) scale(${f(scale)}) translate(-190 -262)`, shape(0, color));
}
function fan(s: Settings, angle: number, scale: number, alternate: boolean) {
  let content = '';
  const step = 2.05 / (s.nesting * 2 + .18);
  for (let n = 0; n < s.nesting * 2; n++) {
    const c = n % 2 ? s.paper : (s.mono || (n / 2 + Number(alternate)) % 2 === 0 ? s.plum : s.sage);
    content += group(`scale(${f(2.05 - n * step)}) translate(-300 -410)`, shape(2, c));
  }
  return group(`rotate(${f(angle)}) scale(${f(scale)})`, content);
}
export function logoMarkup(s: Settings) {
  return shape(0, s.plum) + shape(1, s.sage) + shape(2, s.plum);
}
export interface Geometry { width: number; height: number; content: string }
export function patternGeometry(s: Settings): Geometry {
  const w = s.weight / 100;
  let content = '';
  let width = 480; let height = 480;
  if (s.family === 'fans') {
    width = 512; height = 320;
    for (let row = -2; row < 5; row++) for (let col = -2; col < 4; col++) {
      const x = col * 256 + mod(row, 2) * 128; const y = row * 160;
      // Canonical cell coordinates keep random choices identical on both tile edges.
      const rnd = noise(s.seed, mod(col, 2), mod(row, 2));
      const angle = s.turn + (rnd - .5) * s.variation * .3;
      content += group(`translate(${x} ${y})`, fan(s, angle, w, false));
    }
  } else {
    for (let row = -2; row < 4; row++) for (let col = -2; col < 4; col++) {
      const rnd = noise(s.seed, mod(col, 2), mod(row, 2));
      const odd = mod(col + row, 2) === 1;
      const c = !s.mono && odd ? s.sage : s.plum;
      const angle = s.turn + (rnd - .5) * s.variation;
      const cell = s.family === 'bloom' ? 480 : 240;
      let motif = '';
      if (s.family === 'weave') motif = leaf(c, .8 * w, angle + (odd ? 180 : 0));
      if (s.family === 'ribbons') motif = leaf(c, 1.04 * w, angle + mod(mod(col, 2) + mod(row, 2), 4) * 90);
      // Rosette is one complete tile; repeat colour assignment is independent of outer row.
      if (s.family === 'bloom') {
        const bloomAngle = s.turn + (noise(s.seed, 0, 0) - .5) * s.variation;
        for (let k = 0; k < 4; k++) motif += group(`rotate(${k * 90 + bloomAngle}) translate(0 -115)`, leaf(s.mono || k % 2 ? s.plum : s.sage, .82 * w, 0));
      }
      if (s.family === 'petals') motif = group(`rotate(${f(angle + (odd ? 180 : 0))}) scale(${f(1.3 * w)}) translate(-300 -365)`, shape(2, c));
      if (s.family === 'marks') motif = group(`rotate(${f(angle)}) scale(${f(.43 * w)}) translate(-300 -267)`, logoMarkup(s));
      content += group(`translate(${col * cell + cell / 2} ${row * cell + cell / 2})`, motif);
    }
  }
  return {width, height, content};
}
function root(w: number, h: number, viewBox: string, content: string, title: string, unit = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}${unit}" height="${f(h)}${unit}" viewBox="${viewBox}" role="img" aria-labelledby="art-title"><title id="art-title">${title}</title>${content}</svg>`;
}
export function renderSvg(s: Settings, view: View = 'pattern', bleed = false): string {
  const card = view === 'card';
  const width = card ? 85 : 1080; const height = card ? 55 : 700;
  const b = card && bleed ? 3 : 0;
  const g = patternGeometry(s); const factor = (s.scale / 100) * width / 1080;
  const tileW = g.width * factor; const tileH = g.height * factor;
  const x = s.offsetX * width / 500; const y = s.offsetY * width / 500;
  const defs = `<defs><pattern id="pw-repeat" x="${f(x)}" y="${f(y)}" width="${f(tileW)}" height="${f(tileH)}" patternUnits="userSpaceOnUse" viewBox="0 0 ${g.width} ${g.height}" overflow="hidden"><rect width="${g.width}" height="${g.height}" fill="${s.paper}"/>${g.content}</pattern></defs>`;
  const band = width * s.band / 100;
  const artX = card && s.side === 'right' ? width - band : -b;
  const artW = card && s.side !== 'full' ? band + b : width + 2 * b;
  let content = defs + `<rect x="${-b}" y="${-b}" width="${width + 2 * b}" height="${height + 2 * b}" fill="${s.paper}"/><rect x="${f(artX)}" y="${-b}" width="${f(artW)}" height="${height + 2 * b}" fill="url(#pw-repeat)"/>`;
  if (card && s.showLogo) {
    const cx = s.side === 'left' ? band + (width - band) / 2 : s.side === 'right' ? (width - band) / 2 : width / 2;
    if (s.side === 'full') content += `<rect x="${f(cx - s.logoSize * .8)}" y="${f(height / 2 - s.logoSize * .66)}" width="${f(s.logoSize * 1.6)}" height="${f(s.logoSize * 1.32)}" rx="1" fill="${s.paper}"/>`;
    content += group(`translate(${f(cx)} ${height / 2}) scale(${f(s.logoSize / 440)}) translate(-300 -267)`, logoMarkup(s));
  }
  return root(width + 2 * b, height + 2 * b, `${-b} ${-b} ${width + 2 * b} ${height + 2 * b}`, content, `Praxis W ${s.family} ${card ? 'card, 85 × 55 mm' + (b ? ', 3 mm bleed' : '') : 'pattern'}`, card ? 'mm' : '');
}
export function renderTile(s: Settings) {
  const g = patternGeometry(s);
  const k = s.scale / 100;
  return root(g.width * k, g.height * k, `0 0 ${g.width} ${g.height}`, `<defs><clipPath id="tile-edge"><rect width="${g.width}" height="${g.height}"/></clipPath></defs><g clip-path="url(#tile-edge)"><rect width="${g.width}" height="${g.height}" fill="${s.paper}"/>${g.content}</g>`, `Praxis W seamless ${s.family} tile`);
}
export function shuffled(s: Settings): Settings {
  const seed = (s.seed + 7937) % 1000000;
  const n = (x: number) => noise(seed, x, 37);
  const family = FAMILIES[Math.floor(n(1) * FAMILIES.length)].id;
  return {...s, seed, family, scale: Math.round(80 + n(2) * 75), weight: Math.round(75 + n(3) * 28), nesting: 1 + Math.floor(n(4) * 3), turn: family === 'fans' ? 0 : Math.round(n(5) * 4) * 45, variation: 0};
}
export function serializeProject(s: Settings) {
  return JSON.stringify({format: 'praxisw-pattern', version: 1, settings: s}, null, 2);
}
export function parseProject(raw: string): Settings {
  if (raw.length > 100000) throw new Error('This file is too large. Choose a saved Praxis W project.');
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { throw new Error('This is not a valid JSON project.'); }
  if (data?.format !== 'praxisw-pattern' || data.version !== 1 || !data.settings) throw new Error('Choose a Praxis W project saved by this editor.');
  return normalizeSettings(data.settings);
}
