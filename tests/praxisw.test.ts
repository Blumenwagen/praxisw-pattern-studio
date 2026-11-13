import assert from 'node:assert/strict';
import { DEFAULTS, FAMILIES, normalizeSettings, parseProject, patternGeometry, renderSvg, renderTile, serializeProject, shuffled } from '../src/praxisw/pattern';
import { LOGO_PATHS } from '../src/praxisw/logo';

let checks = 0;
function check(fn: () => void) {fn(); checks++;}
check(() => assert.deepEqual(parseProject(serializeProject(DEFAULTS)), DEFAULTS));
check(() => assert.throws(() => parseProject('{"format":"other","version":1,"settings":{}}')));
check(() => assert.throws(() => parseProject('{bad json')));
check(() => assert.throws(() => parseProject('x'.repeat(100001))));
check(() => assert.throws(() => normalizeSettings(null)));
check(() => {
  const unsafe = normalizeSettings({plum: '"><script>alert(1)</script>', paper: 'url(https://x)', scale: 10000, seed: -5, family: 'other', nesting: 2.5, side: 'elsewhere'});
  assert.equal(unsafe.plum, DEFAULTS.plum); assert.equal(unsafe.paper, DEFAULTS.paper);
  assert.equal(unsafe.scale, 220); assert.equal(unsafe.seed, 0); assert.equal(unsafe.nesting, 3);
  assert.equal(unsafe.family, DEFAULTS.family); assert.equal(unsafe.side, DEFAULTS.side);
});
check(() => {
  const card = renderSvg(DEFAULTS, 'card', true);
  assert.match(card, /width="91mm" height="61mm" viewBox="-3 -3 91 61"/);
  for (const d of LOGO_PATHS) assert.ok(card.includes(`d="${d}"`));
  assert.match(renderSvg(DEFAULTS, 'card'), /width="85mm" height="55mm" viewBox="0 0 85 55"/);
});
check(() => assert.deepEqual(shuffled(DEFAULTS), shuffled(DEFAULTS)));
check(() => {
  const s = shuffled(DEFAULTS); assert.equal(s.plum, DEFAULTS.plum); assert.equal(s.sage, DEFAULTS.sage); assert.equal(s.paper, DEFAULTS.paper); assert.notEqual(s.seed, DEFAULTS.seed);
});
for (const family of FAMILIES) for (const turn of [-180, -45, 0, 90, 180]) {
  check(() => {
    const s = {...DEFAULTS, family: family.id, variation: 100, turn, weight: 120};
    const svg = renderSvg(s); const tile = renderTile(s);
    assert.equal(svg, renderSvg(s), 'SVG export must be deterministic');
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'));
    assert.ok(!svg.includes('<image') && !svg.includes('<script'));
    assert.ok(tile.includes('clip-path="url(#tile-edge)"'));
    for (const d of svg.matchAll(/\bd="([^"]+)"/g)) assert.ok((LOGO_PATHS as readonly string[]).includes(d[1]), 'Every path must come from the logo');
  });
}
// Check that the interior cell instructions repeat across both tile boundaries.
// Compare motifs at x/y shifted by one complete tile, including seeded rotations.
for (const family of FAMILIES) check(() => {
  const g = patternGeometry({...DEFAULTS, family: family.id, variation: 80, turn: 35});
  const cells: {x: number; y: number; content: string}[] = [];
  const re = /<g transform="translate\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)">/g;
  for (const m of g.content.matchAll(re)) {
    const start = m.index! + m[0].length;
    let depth = 1; let end = start;
    const tags = /<g\b[^>]*>|<\/g>/g; tags.lastIndex = start;
    let tag: RegExpExecArray | null;
    while ((tag = tags.exec(g.content))) {depth += tag[0] === '</g>' ? -1 : 1; if (!depth) {end = tag.index; break;}}
    cells.push({x: Number(m[1]), y: Number(m[2]), content: g.content.slice(start, end)});
  }
  let comparisons = 0;
  for (const c of cells) for (const [dx, dy] of [[g.width, 0], [0, g.height]]) {
    const neighbor = cells.find(n => n.x === c.x + dx && n.y === c.y + dy);
    if (neighbor) {assert.equal(c.content, neighbor.content, `${family.id} differs across a repeat boundary`); comparisons++;}
  }
  assert.ok(comparisons > 0, 'At least one repeat must be compared');
});
console.log(`${checks} pattern engine checks passed.`);
