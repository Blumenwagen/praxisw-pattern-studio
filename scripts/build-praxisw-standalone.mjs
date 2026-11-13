import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const result = await build({
  configFile: false, base: './', plugins: [react()],
  build: {outDir: 'dist-studio', assetsInlineLimit: Infinity, cssCodeSplit: false, rollupOptions: {input: 'index.html'}},
});
if (!result) throw new Error('Build failed');
const dir = path.resolve('dist-studio');
let html = await readFile(path.join(dir, 'index.html'), 'utf8');
for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(path.resolve(dir, match[1]), 'utf8');
  if (/\bimport\s.*?from\s*["']\.\//.test(js)) throw new Error('Standalone build has an external JavaScript chunk');
  html = html.replace(match[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(path.resolve(dir, match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const icon = 'data:image/svg+xml;base64,' + (await readFile('public/praxisw-logo.svg')).toString('base64');
html = html.replace('href="./praxisw-logo.svg"', `href="${icon}"`);
// The original editor is a separate app, rather than part of this portable file.
html = html.replaceAll('"./mosaic.html"', '"https://mozayk.design/"');
await mkdir('downloads', {recursive: true});
await writeFile('downloads/praxisw-pattern-studio.html', html);
console.log(`Standalone studio: downloads/praxisw-pattern-studio.html (${Math.round(Buffer.byteLength(html)/1024)} KB)`);
