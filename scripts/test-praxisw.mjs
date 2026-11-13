import { rolldown } from 'rolldown';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(path.join(tmpdir(), 'praxisw-tests-'));
try {
  const bundle = await rolldown({input: 'tests/praxisw.test.ts', platform: 'node', external: ['node:assert/strict']});
  await bundle.write({file: path.join(dir, 'tests.mjs'), format: 'esm'});
  await bundle.close();
  await import(pathToFileURL(path.join(dir, 'tests.mjs')).href);
} finally {await rm(dir, {recursive: true, force: true});}
