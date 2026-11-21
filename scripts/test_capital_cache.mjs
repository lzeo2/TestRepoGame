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
  const version = hash(JSON.stringify(files));
  return { bodies, manifest: { build: version.slice(0, 12), version, files } };
};

const withoutQuery = url => { const result = new URL(url); result.search = ''; return result.href; };
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

function worker(data, { scope = 'https://arcade.test/Games/Capital%20Drive/', storage = new MemoryCaches(), network,
  build = data.manifest.build } = {}) {
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
    importScripts: name => { assert.equal(name, `./cache-manifest.js?capital-build=${build}`); },
  });
  let stamped = false;
  const fixtureSource = source.replace(/(const buildId = ')[a-f0-9]{12}('; \/\/ Generated build ID)/, (_, before, after) => {
    stamped = true;
    return before + build + after;
  });
  assert(stamped, 'production build marker is present');
  vm.runInContext(fixtureSource, context, { filename: 'Capital Drive/service-worker.js' });
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
  async function message(data, clientURL = new URL('index.html', scope).href) {
    let reply;
    await dispatch('message', { data, source: clientURL ? { url: clientURL } : undefined,
      ports: [{ postMessage: message => { reply = structuredClone(message); } }] });
    return reply;
  }
  return { dispatch, requests, storage, scope, claims: () => claims, skips: () => skips,
    describe: (urls, clientURL) => message({ type: 'CAPITAL_CACHE_FILES', urls }, clientURL),
    build: clientURL => message({ type: 'CAPITAL_CACHE_BUILD' }, clientURL),
    get: (path, method = 'GET') => dispatch('fetch', { request: new Request(new URL(path, scope), { method }) }) };
}

const data = fixture();
assert.throws(() => worker(data, { build: '000000000000' }), /manifest does not match/, 'stale manifest rejects worker evaluation');
const first = worker(data);
await first.dispatch('install');
assert.equal(first.requests.length, data.manifest.files.length, 'fresh install fetches complete closure');
assert(first.requests.every(request => request.cache === 'force-cache'), 'first transfer permits existing HTTP cache');
assert.equal(first.skips(), 1, 'the complete verified closure can activate automatically');
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
assert.deepEqual(await first.build(), { type: 'CAPITAL_CACHE_BUILD', build: data.manifest.build }, 'in-scope clients can verify the controller build');
for (const urls of [[], [new URL('unknown.json', first.scope).href], [new URL('script.js', first.scope).href],
  [mapURL + '?other=1'], ['https://other.test/data/map.json'], [mapURL, 'https://other.test/data/map.json']]) {
  assert.equal(await first.describe(urls), undefined, 'unlisted or non-JSON requests get no descriptor');
}
for (const clientURL of ['https://other.test/Games/Capital%20Drive/index.html',
  'https://arcade.test/Games/Another/index.html', 'https://arcade.test/Games/Capital%20Drive-sibling/index.html', null]) {
  assert.equal(await first.describe([mapURL], clientURL), undefined, 'other clients cannot request descriptors');
  assert.equal(await first.build(clientURL), undefined, 'other clients cannot query build status');
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
assert.equal((await first.build()).build, data.manifest.build, 'previous controller only acknowledges its own build');
assert.equal((await updated.build()).build, updatedData.manifest.build, 'active build handshake reports the installed revision');
assert.equal(updated.skips(), 1);
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
  if (withoutQuery(request.url).endsWith('map.json')) return new Response('{"roads":[2]}');
  throw new Error(`Unchanged files should be reused: ${request.url}`);
} });
await assert.rejects(failed.dispatch('install'), /./, 'digest mismatch rejects installation');
assert.deepEqual(await first.storage.keys(), existing, 'failed install removes only incomplete new revision');
assert.equal(failed.skips(), 0, 'failed install cannot activate over the playable version');
assert.equal(failed.requests.filter(request => withoutQuery(request.url).endsWith('map.json')).length, 2, 'stale HTTP data receives one reload retry');
assert.equal(failed.requests.at(-1).cache, 'reload');
const failedHash = failedData.manifest.files.find(file => file.url === 'data/map.json').sha256;
assert.equal(failed.requests.at(-1).url, `${mapURL}?capital-file=${failedHash}`, 'reload retries use the expected content digest');

const stale = worker(data, { network: async (request, bodies) => new Response(request.cache === 'force-cache' ? 'stale' : bodies.get(withoutQuery(request.url))) });
await stale.dispatch('install');
assert.equal(stale.requests.length, data.manifest.files.length * 2, 'stale HTTP responses retry once with reload');
assert.equal(stale.skips(), 1);
assert.equal(await (await stale.get('script.js')).response.text(), data.bodies['script.js']);

const partialStorage = new MemoryCaches();
const playing = worker(data, { storage: partialStorage });
await playing.dispatch('install');
await playing.dispatch('activate');
await partialStorage.open('unrelated-cache');
const partialExisting = await partialStorage.keys();
const partial = worker(data, { storage: partialStorage, network: async (request, bodies) => {
  throw new Error('Offline halfway through installation');
} });
const existingCache = await partialStorage.open((await playing.describe([mapURL])).cacheName);
await existingCache.delete(expectedDescription.files[0].key);
await assert.rejects(partial.dispatch('install'), /./);
assert.equal(partial.skips(), 0);
assert.deepEqual(await partialStorage.keys(), partialExisting, 'a failed same-revision repair cannot delete an active cache');
const freshPartial = worker(failedData, { storage: partialStorage, network: async () => {
  throw new Error('Offline halfway through installation');
} });
await assert.rejects(freshPartial.dispatch('install'), /./);
assert.equal(freshPartial.skips(), 0);
assert.deepEqual(await partialStorage.keys(), partialExisting, 'partial install preserves active and unrelated caches');

const corruptStorage = new MemoryCaches();
const corruptPrevious = worker(data, { storage: corruptStorage });
await corruptPrevious.dispatch('install');
const corruptCache = await corruptStorage.open((await corruptPrevious.describe([mapURL])).cacheName);
await corruptCache.put(expectedDescription.files[0].key, new Response('{"roads":[3]}'));
const repairedInstall = worker(updatedData, { storage: corruptStorage });
await repairedInstall.dispatch('install');
assert(repairedInstall.requests.some(request => request.url === mapURL), 'inherited responses must match their actual bytes');
assert.equal(await (await repairedInstall.get('data/map.json')).response.text(), data.bodies['data/map.json']);

const repair = worker(data);
assert.equal(await (await repair.get('script.js')).response.text(), data.bodies['script.js'], 'cache miss preserves online response');
await repair.get('script.js');
assert.equal(repair.requests.length, 1, 'verified cache miss repairs the current revision');
const mismatch = worker(data, { network: async () => new Response('new server revision') });
await mismatch.get('script.js');
await mismatch.get('script.js');
assert.equal(mismatch.requests.length, 4, 'unverified network fallbacks never repair the revision');
const hashedRepair = worker(data, { network: async (request, bodies) =>
  new Response(request.cache === 'reload' ? bodies.get(withoutQuery(request.url)) : 'stale') });
assert.equal(await (await hashedRepair.get('script.js')).response.text(), data.bodies['script.js'], 'hash URL repairs a stale online response');
await hashedRepair.get('script.js');
assert.equal(hashedRepair.requests.length, 2, 'a repaired content-addressed response is reused');
const deniedStorage = new MemoryCaches();
deniedStorage.denied = true;
const denied = worker(data, { storage: deniedStorage });
assert.equal(await (await denied.get('script.js')).response.text(), data.bodies['script.js'], 'storage denial preserves online play');

const nested = worker(data, { scope: 'https://arcade.test/preview/Games/Capital%20Drive/' });
await nested.dispatch('install');
assert(nested.requests.every(request => request.url.startsWith('https://arcade.test/preview/')), 'relative closure stays inside deployment base');
const nestedDescription = await nested.describe([new URL('data/map.json', nested.scope).href]);
assert(nestedDescription.cacheName.startsWith(`capital-drive-files-v1-${encodeURIComponent(new URL(nested.scope).pathname)}-`), 'descriptors preserve encoded-space deployment prefixes');

// Run the real launcher against browser-shaped controllers and a stub game graph.
const launcherModule = await readFile(new URL('../Games/Capital Drive/cache-launcher.js', import.meta.url), 'utf8');
const launcherURL = new URL('cache-launcher.js', first.scope).href;
const workerURL = new URL('service-worker.js', launcherURL).href;
const moduleSource = launcherModule.replaceAll('export function ', 'function ')
  .replaceAll('import.meta.url', JSON.stringify(launcherURL))
  .replace("import('./script.js')", 'loadGame()');
const tick = () => new Promise(resolve => setImmediate(resolve));
class MemoryChannel {
  constructor() {
    this.port1 = { close() {} };
    this.port2 = { close() {}, postMessage: data => queueMicrotask(() => this.port1.onmessage?.({ data })) };
  }
}
function controller(build, release = send => send()) {
  return {
    scriptURL: workerURL,
    postMessage(data, [port]) {
      assert.deepEqual(structuredClone(data), { type: 'CAPITAL_CACHE_BUILD' });
      release(() => port.postMessage({ type: 'CAPITAL_CACHE_BUILD', build }));
    },
  };
}
function client({ pageBuild = data.manifest.build, active = null, canReload = () => true,
  storage = new Map([['unrelated-session', 'keep']]), blockStorage = false,
  early = false, loadGame = async () => {}, blockWorkers = false } = {}) {
  const workers = new EventTarget(), registration = new EventTarget(), status = { hidden: true, textContent: '' };
  const startPanel = { hidden: false }, start = new EventTarget();
  const loading = { setAttribute(name, value) { this[name] = value; } };
  let reloads = 0, updates = 0, registrations = 0, launches = 0;
  Object.assign(registration, { active, installing: active ? null : new EventTarget(), update: async () => { updates++; } });
  Object.assign(workers, { controller: active, register: async (url, options) => {
    registrations++;
    assert.equal(url.href, workerURL);
    assert.deepEqual(structuredClone(options), { scope: './', updateViaCache: 'none' });
    return registration;
  } });
  const elements = { 'cache-status': status, 'build-version': { textContent: pageBuild }, 'start-button': start, loading };
  if (early) Object.assign(elements, { 'start-panel': startPanel, 'capital-drive-launcher': {} });
  const context = vm.createContext({
    URL, MessageChannel: MemoryChannel, isSecureContext: true,
    navigator: { get serviceWorker() { if (blockWorkers) throw new Error('Denied'); return workers; } },
    document: { getElementById: id => elements[id] },
    setTimeout, clearTimeout, location: { reload: () => { reloads++; } },
    loadGame: () => { launches++; return loadGame(); },
    console: { error() {} },
    sessionStorage: {
      getItem(key) { if (blockStorage) throw new Error('Denied'); return storage.get(key); },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
  });
  vm.runInContext(moduleSource, context, { filename: 'Capital Drive/cache-launcher.js' });
  const finishBoot = () => context.setupGameCache({ canReload });
  if (!early) finishBoot();
  return {
    status, storage, start, startPanel, loading, finishBoot,
    reloads: () => reloads, updates: () => updates, registrations: () => registrations, launches: () => launches,
    claim(worker) {
      registration.installing = null; registration.active = workers.controller = worker;
      workers.dispatchEvent(new Event('controllerchange'));
    },
  };
}

const oldBuild = data.manifest.build, newBuild = updatedData.manifest.build;
let sendBootCheck;
const loadFailure = client({ early: true, active: controller(oldBuild, send => { sendBootCheck = send; }),
  loadGame: async () => { throw new Error('Game module unavailable.'); } });
assert.equal(typeof sendBootCheck, 'function', 'launcher checks an existing controller before loading the game');
assert.equal(loadFailure.launches(), 1, 'game import starts without waiting for the controller reply');
sendBootCheck();
await tick();
assert.equal(loadFailure.registrations(), 0, 'a failed module import never starts a cache install');
assert.match(loadFailure.loading.textContent, /Game module unavailable/);
assert.equal(loadFailure.loading.role, 'alert');
assert.equal(loadFailure.start.disabled, false);
loadFailure.claim(controller(newBuild));
await tick();
assert.equal(loadFailure.reloads(), 1, 'an early watcher can repair a failed mixed-version launch');
assert.equal(loadFailure.registrations(), 0, 'repair uses the completed worker without starting a second install');

const deniedWorkers = client({ early: true, blockWorkers: true });
assert.equal(deniedWorkers.launches(), 1, 'service-worker privacy settings never block the game import');
assert.match(deniedWorkers.status.textContent, /unavailable/);

let sendHandoff;
const handoff = client({ early: true, active: controller(newBuild, send => { sendHandoff = send; }), canReload: () => false });
assert.equal(handoff.registrations(), 0, 'the early watcher downloads nothing during boot');
handoff.finishBoot();
handoff.finishBoot();
sendHandoff();
await tick();
assert.equal(handoff.registrations(), 1, 'successful boot registers once');
assert.equal(handoff.reloads(), 0, 'a pending controller check uses the live guard after handoff');
assert.match(handoff.status.textContent, /Reopen after this session/);

const legacyActive = client({ early: true, active: controller(oldBuild) });
legacyActive.startPanel.hidden = true;
legacyActive.claim(controller(newBuild));
await tick();
assert.equal(legacyActive.reloads(), 0, 'the early guard respects games started by an older module');

const bootstrap = client();
await tick();
assert.match(bootstrap.status.textContent, /Saving game files/);
bootstrap.claim(controller(oldBuild));
await tick();
assert.equal(bootstrap.reloads(), 0, 'a matching first-install claim never reloads the bootstrap page');
assert.match(bootstrap.status.textContent, /Saved for faster starts/);

let started = false, replyLater;
const live = client({ active: controller(oldBuild), canReload: () => !started });
await tick();
assert.equal(live.updates(), 1, 'a cached startup explicitly asks its existing registration to update');
live.claim(controller(newBuild, send => { replyLater = send; }));
started = true; replyLater();
await tick();
assert.equal(live.reloads(), 0, 'controller activation never reloads a game that is already running');
assert.match(live.status.textContent, /Reopen after this session/);
assert.deepEqual([...live.storage], [['unrelated-session', 'keep']], 'gameplay adoption never mutates other session state');

const choose = client({ active: controller(newBuild) });
await tick();
assert.equal(choose.reloads(), 1, 'an idle stale shell reloads on a verified newer controller');
assert.match(choose.status.textContent, /Loading the new build/);
choose.claim(controller(newBuild));
await tick();
assert.equal(choose.reloads(), 1, 'repeat claims cannot schedule another reload in the same document');
const staleReload = client({ active: controller(newBuild), storage: choose.storage });
await tick();
assert.equal(staleReload.reloads(), 0, 'failed shell refresh cannot loop across page loads');
const healthy = client({ pageBuild: newBuild, active: controller(newBuild), storage: choose.storage });
await tick();
assert.equal(healthy.reloads(), 0);
assert.deepEqual([...healthy.storage], [['unrelated-session', 'keep']], 'a matching build clears only its own reload guard');
const deniedReload = client({ active: controller(newBuild), blockStorage: true });
await tick();
assert.equal(deniedReload.reloads(), 0, 'denied storage cannot provoke a reload loop');

let lateReply;
const superseded = client({ active: controller(newBuild, send => { lateReply = send; }) });
superseded.claim(controller(oldBuild));
lateReply();
await tick();
assert.equal(superseded.reloads(), 0, 'late answers from superseded controllers cannot reload the current document');

console.log('Capital Drive response-cache regression passed: verified installation and automatic activation, versioned repair and scope, isolated cleanup, safe startup reload and uninterrupted live play.');
