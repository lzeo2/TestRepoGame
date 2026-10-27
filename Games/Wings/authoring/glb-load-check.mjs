// Actual transport helper, CPU-only. No browser, texture decoding or native acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use existing exact external tools');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const src = resolve(root, 'Games/Wings/source/games/wings/src');
const helper = readFileSync(resolve(src, 'render/glb.ts'), 'utf8');
assert.doesNotMatch(helper, /\.body\b|defineProperty|ReadableStream|globalThis|\.loadAsync\(/);
for (const [file, route, imported] of [
  ['render/aircraft.ts', 'loadGlb(l, joinUrl(baseUrl, VEHICLES[kind].model))', './glb'],
  ['render/world/ships.ts', 'loadGlb(loader, base + SHIP_SPECS[kind].model)', '../glb'],
  ['ui/local-factions.ts', 'loadGlb(loader, url)', '../render/glb'],
]) {
  const source = readFileSync(resolve(src, file), 'utf8');
  assert(source.includes(route), file);
  assert(source.includes(`import { loadGlb } from "${imported}"`), file);
  assert.doesNotMatch(source, /\.loadAsync\(/, file);
}
const aliases = { name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
    const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports)) {
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    }
    if (target && typeof target === 'object') target = target.import;
    assert.equal(typeof target, 'string', key);
    return { path: resolve(three, target) };
  });
} };
const result = await build({ entryPoints: [resolve(src, 'render/glb.ts')], bundle: true,
  platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none', plugins: [aliases] });
const { loadGlb } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const oldFetch = globalThis.fetch;
const bytes = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0, 255]).buffer;
let parses = 0, reads = 0;
const parsed = { scene: {} };
const loader = { async parseAsync(...args) {
  parses++;
  assert.equal(args.length, 2);
  assert.equal(args[0], bytes, 'pass exact native ArrayBuffer, not a copy');
  assert.equal(args[1], '../models/');
  return parsed;
} };
const url = '../models/aircraft.glb?cache=1';
function response(status) {
  return { status, statusText: 'fixture', url,
    get body() { throw new Error('must not inspect custom-stream body'); },
    async arrayBuffer() { reads++; assert.equal(this.status, status); return bytes; },
  };
}
try {
  for (const status of [200, 0]) {
    const reply = response(status), body = Object.getOwnPropertyDescriptor(reply, 'body');
    globalThis.fetch = async (...args) => { assert.deepEqual(args, [url]); return reply; };
    assert.equal(await loadGlb(loader, url), parsed);
    assert.deepEqual(Object.getOwnPropertyDescriptor(reply, 'body'), body, 'no response property override');
  }
  assert.equal(parses, 2); assert.equal(reads, 2);
  console.log('PASS actual helper: exact bytes/base, fetch defaults, HTTP 200/0, no body reads/overrides');
  for (const status of [201, 204, 304, 400, 401, 404, 500]) {
    globalThis.fetch = async () => response(status);
    await assert.rejects(loadGlb(loader, url), new RegExp(`responded with ${status}: fixture`));
  }
  assert.equal(parses, 2); assert.equal(reads, 2);
  for (const boundary of ['network', 'body', 'parse']) {
    const error = new Error(`${boundary} failure`);
    globalThis.fetch = async () => {
      if (boundary === 'network') throw error;
      const reply = response(200);
      if (boundary === 'body') reply.arrayBuffer = async () => { throw error; };
      return reply;
    };
    const failingLoader = { async parseAsync() { assert.equal(boundary, 'parse'); throw error; } };
    await assert.rejects(loadGlb(failingLoader, url), value => value === error);
  }
  console.log('PASS HTTP rejection before body/parse; network/body/parse errors propagate unchanged');
} finally { globalThis.fetch = oldFetch; }
console.log('PASS all 3 existing GLTFLoader call routes use actual loadGlb helper');
const app = await build({ entryPoints: [resolve(src, 'main.ts')], bundle: true, platform: 'browser',
  format: 'esm', write: false, outdir: '.tmp/wings-glb-check', minify: true, legalComments: 'none',
  define: { 'import.meta.env.BASE_URL': '"./"', 'import.meta.env.DEV': 'false' }, plugins: [aliases] });
assert(app.outputFiles.length > 0);
console.log('PASS actual main.ts esbuild bundle write:false (no runtime artifacts written)');
