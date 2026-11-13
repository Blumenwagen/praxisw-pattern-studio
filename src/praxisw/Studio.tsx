import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DEFAULTS, FAMILIES, PRESETS, normalizeSettings, parseProject, renderSvg, renderTile, serializeProject, shuffled } from './pattern';
import type { Settings, View } from './pattern';
import logoUrl from './logo.svg?url';

type Favorite = {id: number; name: string; settings: Settings};
type History = {past: Settings[]; present: Settings; future: Settings[]};
const STORAGE = 'praxisw-studio-v1';
const SAVED = 'praxisw-favorites-v1';
function readInitial() {
  try { const saved = localStorage.getItem(STORAGE); return saved ? normalizeSettings(JSON.parse(saved)) : DEFAULTS; } catch { return DEFAULTS; }
}
function readFavorites(): Favorite[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED) || '[]');
    if (!Array.isArray(v)) return [];
    return v.slice(0, 12).filter(e => typeof e?.name === 'string' && typeof e?.id === 'number').map(e => ({id: e.id, name: e.name.slice(0, 60), settings: normalizeSettings(e.settings)}));
  } catch { return []; }
}
function Icon({name}: {name: 'shuffle' | 'download' | 'undo' | 'redo' | 'save' | 'open' | 'check' | 'close'}) {
  const paths: Record<string, ReactNode> = {
    shuffle: <><path d="m3 5 3 0 12 14h3M18 16l3 3-3 3M3 19h3L18 5h3M18 2l3 3-3 3"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    undo: <><path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 7 7v3"/></>,
    redo: <><path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0-7 7v3"/></>,
    save: <><path d="M5 3h14v19l-7-4-7 4z"/></>,
    open: <><path d="M3 8V4h7l3 4h8l-3 13H3V8h18"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Art({svg, className = ''}: {svg: string; className?: string}) {
  const prefix = 'pw' + useId().replace(/[^a-z0-9]/gi, '') + '-';
  const unique = svg.replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`).replace(/aria-labelledby="([^"]+)"/g, (_, id) => `aria-labelledby="${prefix}${id}"`);
  return <div className={`art ${className}`} dangerouslySetInnerHTML={{__html: unique}} />;
}
function Range({label, value, min, max, unit = '', step = 1, onChange}: {label: string; value: number; min: number; max: number; unit?: string; step?: number; onChange: (n: number) => void}) {
  return <label className="range"><span>{label}<output>{value}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{'--progress': `${(value - min) / (max - min) * 100}%`} as CSSProperties}/></label>;
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function png(svg: string, card: boolean) {
  const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = Math.round(2400 * (card ? 55 / 85 : 700 / 1080));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PNG export is unavailable in this browser. SVG export is still available.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed. Try SVG export.')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
export default function Studio() {
  const [history, setHistory] = useState<History>(() => ({past: [], present: readInitial(), future: []}));
  const s = history.present;
  const [view, setView] = useState<View>('card');
  const [favorites, setFavorites] = useState<Favorite[]>(readFavorites);
  const [exportType, setExportType] = useState('card');
  const [bleed, setBleed] = useState(true);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function notify(message: string) { setNotice(message); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 5000); }
  function update(patch: Partial<Settings>) {
    setHistory(h => {const next = normalizeSettings({...h.present, ...patch}); if (JSON.stringify(next) === JSON.stringify(h.present)) return h; return {past: [...h.past.slice(-79), h.present], present: next, future: []};});
  }
  function undo() {setHistory(h => h.past.length ? {past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future]} : h);}
  function redo() {setHistory(h => h.future.length ? {past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1)} : h);}
  useEffect(() => {try {localStorage.setItem(STORAGE, JSON.stringify(s));} catch { /* Project download remains available. */ }}, [s]);
  useEffect(() => {try {localStorage.setItem(SAVED, JSON.stringify(favorites));} catch {notify('Browser storage is full. Download a project to keep this design.');}}, [favorites]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const artwork = useMemo(() => renderSvg(s, view), [s, view]);
  const familyName = FAMILIES.find(f => f.id === s.family)!.name;
  async function exportArtwork() {
    setBusy(true);
    try {
      const filename = `praxisw-${s.family}-${s.seed}`;
      if (exportType === 'project') download(new Blob([serializeProject(s)], {type: 'application/json'}), `${filename}.pwpattern.json`);
      else if (exportType === 'png') download(await png(artwork, view === 'card'), `${filename}-${view}.png`);
      else {
        const svg = exportType === 'tile' ? renderTile(s) : renderSvg(s, exportType === 'card' ? 'card' : 'pattern', exportType === 'card' && bleed);
        download(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}), `${filename}-${exportType}${exportType === 'card' && bleed ? '-3mm-bleed' : ''}.svg`);
      }
      notify('Download ready.');
    } catch (e) {notify(e instanceof Error ? e.message : 'Export failed. Please try again.');}
    finally {setBusy(false);}
  }
  async function loadFile(file?: File) {
    if (!file) return;
    try {if (file.size > 100000) throw new Error('Choose a project smaller than 100 KB.'); update(parseProject(await file.text())); notify('Project opened.');}
    catch (e) {notify(e instanceof Error ? e.message : 'Could not open this project.');}
    if (fileRef.current) fileRef.current.value = '';
  }
  function saveFavorite() {
    if (favorites.length >= 12) {notify('Your shelf holds 12 designs. Remove one to make room.'); return;}
    setFavorites(f => [...f, {id: Date.now(), name: `${familyName} ${f.length + 1}`, settings: {...s}}]); notify('Saved to your shelf on this device.');
  }
  return <div className="studio" id="studio">
    <header className="topbar">
      <a href="#studio" className="identity" aria-label="Praxis W pattern studio"><img src={logoUrl} alt=""/><span>praxis w<span className="identity-sub">Pattern studio</span></span></a>
      <div className="header-note">A little structure. A lot of possibility.</div>
      <div className="top-actions"><button className="text-button" onClick={() => fileRef.current?.click()}><Icon name="open"/><span>Open project</span></button><button className="help-button" aria-label="How to use this studio" onClick={() => setShowHelp(v => !v)} aria-expanded={showHelp}>?</button></div>
    </header>
    {showHelp && <aside className="help-panel"><div><strong>Start with a shape. Make it yours.</strong><button className="icon-button" onClick={() => setShowHelp(false)} aria-label="Close help"><Icon name="close"/></button></div><p>Choose a pattern family or a study below the canvas. Adjust the scale and colours, then use Card to see the result at 85 × 55 mm.</p><p>Save favourites on this device. Download a project to keep editable settings, a seamless tile to repeat elsewhere, or a card SVG with 3 mm bleed.</p><p>The shapes come directly from your supplied logo. All SVG exports stay vector. Print colours are sRGB; your printer can convert them to the required profile.</p><a href="./mosaic.html">Open the original Mozayk editor</a></aside>}
    <input ref={fileRef} type="file" accept=".json,.pwpattern.json,application/json" hidden onChange={e => void loadFile(e.target.files?.[0])}/>
    <div className="workspace">
      <aside className="toolbox" aria-label="Pattern controls">
        <section><div className="section-heading"><h2>Shape language</h2><span>From your logo</span></div>
          <div className="family-grid">{FAMILIES.map(f => <button key={f.id} className={`family ${s.family === f.id ? 'selected' : ''}`} onClick={() => update({family: f.id, turn: 0, variation: 0})} aria-pressed={s.family === f.id} title={f.note}>
            <Art svg={renderSvg({...DEFAULTS, family: f.id, scale: 100})}/><span>{f.name}</span>{s.family === f.id && <span className="selected-check"><Icon name="check"/></span>}
          </button>)}</div>
        </section>
        <section><h2>Find the rhythm</h2>
          <Range label="Pattern scale" value={s.scale} min={45} max={220} unit="%" onChange={scale => update({scale})}/>
          <Range label="Shape size" value={s.weight} min={50} max={120} unit="%" onChange={weight => update({weight})}/>
          {s.family === 'fans' && <Range label="Layers" value={s.nesting} min={1} max={4} onChange={nesting => update({nesting})}/>}
          <Range label="Turn shapes" value={s.turn} min={-180} max={180} step={5} unit="°" onChange={turn => update({turn})}/>
          <Range label="Variation" value={s.variation} min={0} max={100} unit="%" onChange={variation => update({variation})}/>
        </section>
        <section><div className="section-heading"><h2>Colour story</h2><button className="subtle" onClick={() => update({plum: DEFAULTS.plum, sage: DEFAULTS.sage, paper: DEFAULTS.paper, mono: false})}>Reset</button></div>
          <div className="color-row">{(['plum', 'sage', 'paper'] as const).map((k, i) => <label key={k} className="color-input"><input type="color" aria-label={['Plum colour', 'Eucalyptus colour', 'Paper colour'][i]} value={s[k]} onChange={e => update({[k]: e.target.value})}/><span>{['Plum', 'Eucalyptus', 'Paper'][i]}</span><small>{s[k]}</small></label>)}</div>
          <label className="check-row"><input type="checkbox" checked={s.mono} onChange={e => update({mono: e.target.checked})}/>Single-colour pattern</label>
          <div className="palette-options"><button onClick={() => update({plum: DEFAULTS.plum, sage: DEFAULTS.sage, paper: DEFAULTS.paper, mono: false})}>Original</button><button onClick={() => update({plum: '#F5F3EE', sage: '#93ADA2', paper: '#69576B', mono: false})}>After dark</button><button onClick={() => update({plum: '#526E63', sage: '#93ADA2', paper: '#F5F3EE', mono: true})}>Botanical</button></div>
        </section>
        <section><div className="section-heading"><h2>On the card</h2><span>85 × 55 mm</span></div>
          <div className="segmented" aria-label="Pattern placement">{(['left', 'right', 'full'] as const).map(side => <button key={side} onClick={() => {update({side}); setView('card');}} aria-pressed={s.side === side}>{side === 'full' ? 'All over' : side === 'left' ? 'Left edge' : 'Right edge'}</button>)}</div>
          {s.side !== 'full' && <Range label="Pattern band" value={s.band} min={18} max={48} unit="%" onChange={band => update({band})}/>}
          <Range label="Logo width" value={s.logoSize} min={10} max={32} unit=" mm" onChange={logoSize => update({logoSize})}/>
          <Range label="Crop across" value={s.offsetX} min={-100} max={100} onChange={offsetX => update({offsetX})}/>
          <Range label="Crop down" value={s.offsetY} min={-100} max={100} onChange={offsetY => update({offsetY})}/>
          <label className="check-row"><input type="checkbox" checked={s.showLogo} onChange={e => update({showLogo: e.target.checked})}/>Show original logo</label>
        </section>
        <footer className="toolbox-footer">Your artwork stays on this device.<br/><a href="https://github.com/Blumenwagen/praxisw-pattern-studio" target="_blank" rel="noreferrer">A personal fork of Mozayk</a></footer>
      </aside>
      <main className="main-work">
        <div className="canvas-toolbar"><div className="view-tabs" aria-label="Preview mode">{(['pattern', 'card'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'pattern' ? 'Pattern' : 'Card'}</button>)}</div><div className="history-tools"><button className="icon-button" onClick={undo} disabled={!history.past.length} aria-label="Undo"><Icon name="undo"/></button><button className="icon-button" onClick={redo} disabled={!history.future.length} aria-label="Redo"><Icon name="redo"/></button><span className="toolbar-rule"/><button className="text-button" onClick={saveFavorite}><Icon name="save"/><span>Keep this</span></button><button className="shuffle-button" onClick={() => update(shuffled(s))}><Icon name="shuffle"/><span>Explore</span></button></div></div>
        <div className={`canvas-stage ${view}`}><Art svg={artwork} className="main-art"/><div className="stage-caption"><span>{familyName}</span><span>{view === 'card' ? '85 × 55 mm · Trim preview' : 'Continuous vector repeat'}</span></div></div>
        <div className="export-bar"><div><strong>Make something with it</strong><span>{exportType === 'tile' ? 'Tiles join edge to edge. Crop position is not baked into the tile.' : exportType === 'card' ? (bleed ? '91 × 61 mm including 3 mm bleed. No crop marks.' : '85 × 55 mm trim size, without bleed.') : exportType === 'project' ? 'Save editable settings to open again later.' : exportType === 'png' ? `Current ${view} preview at 2400 px wide.` : 'Editable vector artwork, 1080 × 700.'}</span></div>
          <div className="export-controls"><label className="sr-only" htmlFor="export-format">Download format</label><select id="export-format" value={exportType} onChange={e => setExportType(e.target.value)}><option value="card">Card SVG</option><option value="pattern">Pattern SVG</option><option value="tile">Seamless tile SVG</option><option value="png">Preview PNG</option><option value="project">Editable project</option></select>{exportType === 'card' && <label className="bleed-label"><input type="checkbox" checked={bleed} onChange={e => setBleed(e.target.checked)}/>3 mm bleed</label>}<button className="download-button" onClick={() => void exportArtwork()} disabled={busy}><Icon name="download"/>{busy ? 'Preparing…' : 'Download'}</button></div>
        </div>
        <section className="studies"><div className="section-heading"><h2>A few starting points</h2><span>Try one, then make it yours</span></div><div className="preset-row">{PRESETS.map(p => <button className="preset" key={p.name} onClick={() => update({...DEFAULTS, ...p.patch, plum: s.plum, sage: s.sage, paper: s.paper})} title={p.description}><Art svg={renderSvg({...DEFAULTS, ...p.patch, plum: s.plum, sage: s.sage, paper: s.paper})}/><strong>{p.name}</strong></button>)}</div></section>
        {favorites.length > 0 && <section className="favorites"><div className="section-heading"><h2>Your shelf</h2><span>{favorites.length} / 12 saved on this device</span></div><div className="favorite-row">{favorites.map(item => <div className="favorite" key={item.id}><button className="favorite-art" onClick={() => update(item.settings)} aria-label={`Restore ${item.name}`}><Art svg={renderSvg(item.settings, 'card')}/><span>{item.name}</span></button><button className="remove-favorite" onClick={() => setFavorites(v => v.filter(e => e.id !== item.id))} aria-label={`Remove ${item.name}`}><Icon name="close"/></button></div>)}</div></section>}
      </main>
    </div>
    <div className={`notice ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div>
  </div>;
}
