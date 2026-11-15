import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

// Run the production worker with browser-shaped storage/events and tiny files.
// This checks response-cache authority, not native play or browser persistence.
const source = await readFile(new URL('../Games/Capital Drive/service-worker.js', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const fixture = (changes = {}) => {
  const bodies = { 'index.html': '<title>Capital fixture</title>', 'script.js': 'export const ready=true;',
    'data/map.json': '{"roads":[]}', '../../assets/model.js': 'export const model=1;', ...changes };
  const files = Object.entries(bodies).map(([url, body]) => ({ url, sha256: hash(body), bytes: Buffer.byteLength(body) }));
  return { bodies, manifest: { version: hash(JSON.stringify(files)), files } };
};

class MemoryCaches {
  stores = new Map();
  denied = false;
  async open(name) {
    if (this.denied) throw new Error('Storage denied');
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    const entries = this.stores.get(name);
    const key = input => new URL(typeof input === 'string' ? input : input.url).href;
    return {
      match: async input => entries.get(key(input))?.clone(),
      put: async (input, response) => { entries.set(key(input), response.clone()); },
      keys: async () => [...entries.keys()].map(url => new Request(url)),
      delete: async input => entries.delete(key(input)),
    };
  }
  async keys() { if (this.denied) throw new Error('Storage denied'); return [...this.stores.keys()]; }
  async delete(name) { if (this.denied) throw new Error('Storage denied'); return this.stores.delete(name); }
}

function worker(data, { scope = 'https://arcade.test/Games/Capital%20Drive/', storage = new MemoryCaches(), network } = {}) {
  const listeners = new Map(), requests = [];
  let claims = 0, skips = 0;
  const bodyByURL = new Map(Object.entries(data.bodies).map(([url, body]) => [new URL(url, scope).href, body]));
  const fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const request = { url, cache: init.cache ?? input.cache, method: init.method ?? input.method ?? 'GET' };
    requests.push(request);
    if (network) return network(request, bodyByURL);
    if (!bodyByURL.has(url)) throw new Error(`Unexpected network request: ${url}`);
    return new Response(bodyByURL.get(url), { headers: { 'Content-Type': 'text/plain' } });
  };
  const self = {
    registration: { scope }, location: new URL('service-worker.js', scope),
    CAPITAL_CACHE_MANIFEST: structuredClone(data.manifest), crypto: webcrypto,
    clients: { claim: async () => { claims++; } },
    skipWaiting: async () => { skips++; },
    addEventListener: (name, callback) => { listeners.set(name, callback); },
  };
  const context = vm.createContext({ self, caches: storage, fetch, crypto: webcrypto,
    URL, Request, Response, Headers, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
    console, setTimeout, clearTimeout,
    importScripts: name => { assert.equal(name, './cache-manifest.js'); },
  });
  vm.runInContext(source, context, { filename: 'Capital Drive/service-worker.js' });
  async function dispatch(type, fields = {}) {
    const pending = [];
    let response;
    listeners.get(type)?.({ ...fields, waitUntil: promise => pending.push(Promise.resolve(promise)),
      respondWith: promise => { assert.equal(response, undefined, 'one response per request'); response = Promise.resolve(promise); } });
    const result = response ? { intercepted: true, response: await response } : { intercepted: false };
    const settled = await Promise.allSettled(pending);
    for (const result of settled) if (result.status === 'rejected') throw result.reason;
    return result;
  }
  return { dispatch, requests, storage, scope, claims: () => claims, skips: () => skips,
    describe: async (urls, clientURL = new URL('index.html', scope).href) => {
      let reply;
      await dispatch('message', { data: { type: 'CAPITAL_CACHE_FILES', urls }, source: { url: clientURL },
        ports: [{ postMessage: message => { reply = structuredClone(message); } }] });
      return reply;
    },
    get: (path, method = 'GET') => dispatch('fetch', { request: new Request(new URL(path, scope), { method }) }) };
}

const data = fixture();
const first = worker(data);
await first.dispatch('install');
assert.equal(first.requests.length, data.manifest.files.length, 'fresh install fetches complete closure');
assert(first.requests.every(request => request.cache === 'force-cache'), 'first transfer permits existing HTTP cache');
assert.equal(first.skips(), 0, 'install cannot force activation over a running session');
await first.dispatch('activate');
assert.equal(first.claims(), 1, 'default activation claims game clients');
const installedName = (await first.storage.keys())[0];
assert.equal(installedName, `capital-drive-files-v1-${encodeURIComponent(new URL(first.scope).pathname)}-${data.manifest.version}`);
const mapURL = new URL('data/map.json', first.scope).href;
const mapFile = data.manifest.files.find(file => file.url === 'data/map.json');
const expectedDescription = { type: 'CAPITAL_CACHE_FILES', cacheName: installedName,
  files: [{ url: mapURL, key: `${mapURL}?capital-file=${mapFile.sha256}` }] };
const storedKeys = [...first.storage.stores].map(([name, values]) => [name, [...values.keys()]]);
assert.deepEqual(await first.describe([mapURL]), expectedDescription, 'active worker supplies only its own content-addressed descriptor');
for (const urls of [[], [new URL('unknown.json', first.scope).href], [new URL('script.js', first.scope).href],
  [mapURL + '?other=1'], ['https://other.test/data/map.json'], [mapURL, 'https://other.test/data/map.json']]) {
  assert.equal(await first.describe(urls), undefined, 'unlisted or non-JSON requests get no descriptor');
}
for (const clientURL of ['https://other.test/Games/Capital%20Drive/index.html',
  'https://arcade.test/Games/Another/index.html', 'https://arcade.test/Games/Capital%20Drive-sibling/index.html']) {
  assert.equal(await first.describe([mapURL], clientURL), undefined, 'other clients cannot request descriptors');
}
assert.deepEqual([...first.storage.stores].map(([name, values]) => [name, [...values.keys()]]), storedKeys, 'descriptors never mutate CacheStorage');
assert.equal(first.requests.length, data.manifest.files.length, 'descriptors never fetch files');
for (const file of data.manifest.files) {
  const response = await first.get(file.url);
  assert.equal(response.intercepted, true);
  assert.equal(await response.response.text(), data.bodies[file.url]);
}
assert.equal(first.requests.length, data.manifest.files.length, 'repeat requests use installed files');

for (const [path, method] of [['script.js', 'POST'], ['unknown.js', 'GET'], ['script.js?other=1', 'GET'], ['https://other.test/script.js', 'GET']]) {
  assert.equal((await first.get(path, method)).intercepted, false, `${method} ${path} bypasses game cache`);
}
for (const path of ['./', './?campaign=1', 'index.html?campaign=1']) {
  const navigation = await first.dispatch('fetch', { request: { url: new URL(path, first.scope).href, method: 'GET', mode: 'navigate' } });
  assert.equal(navigation.intercepted, true, 'directory/index navigations share the cached shell');
  assert.equal(await navigation.response.text(), data.bodies['index.html']);
}

const updatedData = fixture({ 'script.js': 'export const ready=2;' });
const updated = worker(updatedData, { storage: first.storage });
await updated.dispatch('install');
assert.deepEqual(await first.describe([mapURL]), expectedDescription, 'waiting installation cannot change the active worker descriptor');
assert.notEqual((await updated.describe([mapURL])).cacheName, installedName, 'each worker retains its own manifest revision');
assert.deepEqual(updated.requests.map(request => request.url), [new URL('script.js', first.scope).href], 'unchanged digest keys reuse prior complete files');
assert((await first.storage.keys()).includes(installedName), 'install preserves previous playable revision');
await first.storage.open('another-game-offline');
await first.storage.open(`capital-drive-files-v1-${encodeURIComponent('/another/Games/Capital%20Drive/')}-other`);
await updated.dispatch('activate');
const names = await first.storage.keys();
assert(!names.includes(installedName), 'activation removes own obsolete revision');
assert(names.includes('another-game-offline'), 'activation preserves another game cache');
assert(names.some(name => name.endsWith('-other')), 'activation preserves another base path');

const failedData = fixture({ 'data/map.json': '{"roads":[1]}' });
const existing = [...names];
const failed = worker(failedData, { storage: first.storage, network: async request => {
  if (request.url.endsWith('map.json')) return new Response('{"roads":[2]}');
  throw new Error(`Unchanged files should be reused: ${request.url}`);
} });
await assert.rejects(failed.dispatch('install'), /./, 'digest mismatch rejects installation');
assert.deepEqual(await first.storage.keys(), existing, 'failed install removes only incomplete new revision');
assert.equal(failed.requests.filter(request => request.url.endsWith('map.json')).length, 2, 'stale HTTP data receives one reload retry');
assert.equal(failed.requests.at(-1).cache, 'reload');

const stale = worker(data, { network: async (request, bodies) => new Response(request.cache === 'force-cache' ? 'stale' : bodies.get(request.url)) });
await stale.dispatch('install');
assert.equal(stale.requests.length, data.manifest.files.length * 2, 'stale HTTP responses retry once with reload');
assert.equal(await (await stale.get('script.js')).response.text(), data.bodies['script.js']);

const partialStorage = new MemoryCaches();
await partialStorage.open('unrelated-cache');
const partial = worker(data, { storage: partialStorage, network: async (request, bodies) => {
  if (request.url.endsWith('map.json')) throw new Error('Offline halfway through installation');
  return new Response(bodies.get(request.url));
} });
await assert.rejects(partial.dispatch('install'), /./);
assert.deepEqual(await partialStorage.keys(), ['unrelated-cache'], 'partial install never leaves an advertised complete revision');

const repair = worker(data);
assert.equal(await (await repair.get('script.js')).response.text(), data.bodies['script.js'], 'cache miss preserves online response');
await repair.get('script.js');
assert.equal(repair.requests.length, 1, 'verified cache miss repairs the current revision');
const mismatch = worker(data, { network: async () => new Response('new server revision') });
await mismatch.get('script.js');
await mismatch.get('script.js');
assert.equal(mismatch.requests.length, 2, 'unverified network fallback is never cached as the current revision');
const deniedStorage = new MemoryCaches();
deniedStorage.denied = true;
const denied = worker(data, { storage: deniedStorage });
assert.equal(await (await denied.get('script.js')).response.text(), data.bodies['script.js'], 'storage denial preserves online play');

const nested = worker(data, { scope: 'https://arcade.test/preview/Games/Capital%20Drive/' });
await nested.dispatch('install');
assert(nested.requests.every(request => request.url.startsWith('https://arcade.test/preview/')), 'relative closure stays inside deployment base');
const nestedDescription = await nested.describe([new URL('data/map.json', nested.scope).href]);
assert(nestedDescription.cacheName.startsWith(`capital-drive-files-v1-${encodeURIComponent(new URL(nested.scope).pathname)}-`), 'descriptors preserve encoded-space deployment prefixes');

console.log('Capital Drive response-cache regression passed: install integrity, revision reuse, read-only active descriptors, exact request authority, isolated cleanup and deployment base.');
