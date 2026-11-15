import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../Games/Capital Drive/game-data.js', import.meta.url), 'utf8');
const {loadGameData} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const baseURL = 'https://arcade.test/repo/Games/Capital%20Drive/game-data.js';
const urls = ['canberra', 'addresses', 'road-profiles', 'canberra-north', 'north-terrain', 'traffic-signals', 'airport'].map(name => `./data/${name}.json`);
const resolved = urls.map(url => new URL(url, baseURL).href);
const prefix = `capital-drive-files-v1-${encodeURIComponent(new URL('./', baseURL).pathname)}-`;
const cacheName = prefix + 'a'.repeat(64);
const files = resolved.map(url => ({url, key: `${url}?capital-file=${'b'.repeat(64)}`}));
const descriptor = {type: 'CAPITAL_CACHE_FILES', cacheName, files};

function fixture({reply = descriptor, missing = -1, denied = false, controller = true, unsupported = false, stalledRead = false, badStatus = false} = {}) {
  const fetches = [], reads = [], messages = [], timers = new Map();
  let closes = 0, nextTimer = 0;
  class Channel {
    constructor() {
      this.port1 = {close() { closes++; }};
      this.port2 = {close() { closes++; }, deliver: data => this.port1.onmessage?.({data})};
    }
  }
  const env = {
    baseURL, MessageChannel: Channel,
    serviceWorker: controller ? {controller: {
      scriptURL: new URL('./service-worker.js', baseURL).href,
      postMessage(message, ports) {
        messages.push(message);
        if (!unsupported) ports[0].deliver(structuredClone(reply));
      },
    }} : undefined,
    cacheStorage: {async match(key, options) {
      reads.push({key, ...options});
      if (denied) throw new Error('Storage denied');
      if (stalledRead) return new Promise(() => {});
      const index = files.findIndex(file => file.key === key);
      return index === missing ? undefined : new Response(JSON.stringify({index, cached: true}), {status: badStatus ? 503 : 200});
    }},
    fetch: async url => { fetches.push(url); return new Response(JSON.stringify({url, cached: false})); },
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  };
  return {env, fetches, reads, messages, timers, closes: () => closes,
    expire: () => { for (const callback of timers.values()) callback(); }};
}
async function assertFallback(options = {}, changeEnv = () => {}) {
  const test = fixture(options);
  changeEnv(test.env);
  const responses = await loadGameData(urls, test.env);
  assert.deepEqual(test.fetches, resolved, 'fallback reloads the entire set');
  assert((await Promise.all(responses.map(response => response.json()))).every(data => data.cached === false));
  assert.equal(test.timers.size, 0, 'deadline is cleaned up');
  return test;
}

const warm = fixture();
const responses = await loadGameData(urls, warm.env);
assert.equal(warm.fetches.length, 0, 'warm startup creates no fetch requests');
assert.deepEqual(warm.messages, [{type: 'CAPITAL_CACHE_FILES', urls: resolved}]);
assert.equal(warm.reads.length, 7);
assert(warm.reads.every(read => read.cacheName === cacheName), 'all files use the active revision');
assert.deepEqual(await Promise.all(responses.map(response => response.json())), files.map((_, index) => ({index, cached: true})));
assert.equal(warm.closes(), 2);
assert.equal(warm.timers.size, 0);
await assertFallback({controller: false});
await assertFallback({}, env => { env.cacheStorage = undefined; });
await assertFallback({}, env => { env.MessageChannel = undefined; });
await assertFallback({}, env => { env.serviceWorker.controller.scriptURL = 'https://arcade.test/service-worker.js'; });
await assertFallback({denied: true});
await assertFallback({missing: 3});
await assertFallback({badStatus: true});
await assertFallback({}, env => { env.serviceWorker.controller.postMessage = () => { throw new Error('Worker disconnected'); }; });
for (const reply of [null, {}, {...descriptor, cacheName: 'another-cache'}, {...descriptor, cacheName: prefix + 'short'},
  {...descriptor, files: files.slice(1)}, {...descriptor, files: [...files].reverse()},
  {...descriptor, files: files.map((file, i) => i ? file : {...file, key: file.key + '&other=1'})},
  {...descriptor, files: files.map((file, i) => i ? file : {...file, url: 'https://other.test/data/map.json'})}]) {
  const test = await assertFallback({reply});
  assert.equal(test.reads.length, 0, 'malformed authority cannot select a cache key');
}
for (const options of [{unsupported: true}, {stalledRead: true}]) {
  const test = fixture(options);
  const pending = loadGameData(urls, test.env);
  await Promise.resolve();
  test.expire();
  await pending;
  assert.deepEqual(test.fetches, resolved, 'deadline falls back for either handshake or storage delay');
  assert.equal(test.closes(), 2);
}
const active = fixture();
const loading = loadGameData(urls, active.env);
active.env.serviceWorker.controller = {scriptURL: 'https://other.test/worker.js'};
await loading;
assert(active.reads.every(read => read.cacheName === cacheName), 'a controller change cannot mix selected revisions');
assert(!/localStorage|indexedDB|\.put\(|\.delete\(|caches\.open\(/.test(source), 'loader has no save or cache write API');
console.log('Capital Drive game-data regression passed: warm zero-fetch reads, active revision authority, whole-set fallback, deadlines and usable JSON bodies.');
