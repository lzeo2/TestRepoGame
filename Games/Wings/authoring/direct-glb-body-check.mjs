// CPU-only real Response/internal-slot fixture. Native mechanism remains unproven.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../verification/direct-glb-body-probe.js', import.meta.url), 'utf8');
const bytes = Uint8Array.of(0, 255, 128, 1, 71, 76, 66, 0);
const response = url => Object.defineProperty(new Response(bytes, {
  status: 206, headers: { 'content-type': 'application/octet-stream', 'x-probe': 'unchanged' }
}), 'url', { value: url });
function fixture(code = source) {
  let result, thrown, calls = 0, receiver, args;
  const window = { fetch: function () {
    calls++; receiver = this; args = [...arguments];
    if (thrown) throw thrown;
    return result;
  } };
  for (const name of ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'setInterval',
    'document', 'localStorage', 'AbortController']) {
    Object.defineProperty(window, name, { get() { throw Error(`Forbidden access: ${name}`); } });
  }
  const keys = Object.getOwnPropertyNames(window);
  const context = vm.createContext({ window });
  vm.runInContext(code, context);
  assert.deepEqual(Object.getOwnPropertyNames(window), [...keys, '__wingsDirectBodyTrace']);
  const fetch = window.fetch, api = window.__wingsDirectBodyTrace;
  assert.ok(Object.isFrozen(api));
  vm.runInContext(code, context);
  assert.equal(window.fetch, fetch);
  assert.equal(window.__wingsDirectBodyTrace, api);
  return { window, api, set(value) { result = value; }, throw(value) { thrown = value; },
    get calls() { return calls; }, get receiver() { return receiver; }, get args() { return args; } };
}
const f = fixture();
const input = new Proxy({}, { get() { throw Error('Input inspected'); } });
const options = new Proxy({}, { get() { throw Error('Options inspected'); } });
const receiver = {};
for (const url of ['https://fixture.invalid/a.GLB', 'https://fixture.invalid/b.glb?q=1',
  'https://fixture.invalid/c.glb#fragment']) {
  const r = response(url), headers = r.headers, arrayBuffer = r.arrayBuffer;
  f.set(Promise.resolve(r));
  assert.equal(await Reflect.apply(f.window.fetch, receiver, [input, options]), r);
  assert.equal(f.receiver, receiver);
  assert.deepEqual(f.args, [input, options]);
  assert.equal(r.url, url);
  assert.equal(r.status, 206);
  assert.equal(r.headers, headers);
  assert.equal(r.headers.get('x-probe'), 'unchanged');
  assert.equal(r.arrayBuffer, arrayBuffer);
  assert.equal(r.body, undefined);
  assert.equal(Object.getOwnPropertyDescriptor(r, 'body').configurable, true);
  assert.equal(r.bodyUsed, false);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), bytes);
  assert.equal(r.bodyUsed, true);
}
const json = response('https://fixture.invalid/path.json');
const body = json.body, getter = Object.getOwnPropertyDescriptor(Response.prototype, 'body').get;
f.set(Promise.resolve(json));
assert.equal(await f.window.fetch(input), json);
assert.equal(json.body, body);
assert.equal(Object.hasOwn(json, 'body'), false);
assert.equal(Object.getOwnPropertyDescriptor(Response.prototype, 'body').get, getter);
assert.equal(json.bodyUsed, false);
assert.deepEqual(new Uint8Array(await json.arrayBuffer()), bytes);
const rejected = new Error('original rejection');
f.set(Promise.reject(rejected));
await assert.rejects(f.window.fetch(input), error => error === rejected);
const sync = new Error('original synchronous throw');
f.throw(sync);
assert.throws(() => f.window.fetch(input), error => error === sync);
assert.equal(f.calls, 6);
assert.equal(f.api.read().glbResponses, 3);
assert.equal(f.api.read().otherResponses, 1);

const bounded = fixture();
for (let i = 0; i < 40; i++) {
  const r = response(`https://fixture.invalid/${i}.glb?${'x'.repeat(3000)}`);
  bounded.set(Promise.resolve(r));
  await bounded.window.fetch();
}
let dto = bounded.api.read();
assert.equal(dto.glbResponses, 40);
assert.equal(dto.urls.length, 32);
assert.ok(dto.urls.every(url => url.length === 2048));
assert.equal(dto.dropped, 8);
dto.urls[0] = 'mutated'; dto.urls.push('extra'); dto.glbResponses = -1;
assert.equal(bounded.api.read().urls.length, 32);
assert.notEqual(bounded.api.read().urls[0], 'mutated');
assert.equal(bounded.api.read().glbResponses, 40);
assert.deepEqual(Object.keys(dto).sort(),
  ['mode', 'glbResponses', 'otherResponses', 'overrideErrors', 'urls', 'dropped'].sort());
const locked = Object.preventExtensions(response('https://fixture.invalid/locked.glb'));
const lockedBody = locked.body;
bounded.set(Promise.resolve(locked));
assert.equal(await bounded.window.fetch(), locked);
assert.equal(locked.body, lockedBody);
assert.equal(Object.hasOwn(locked, 'body'), false);
assert.equal(bounded.api.read().overrideErrors, 1);
assert.deepEqual(new Uint8Array(await locked.arrayBuffer()), bytes);
// Seed counters near the real ceiling in the fixture only, not the shipped probe.
const saturated = fixture(source.replace(/(glbResponses|otherResponses|overrideErrors|dropped): 0/g,
  '$1: Number.MAX_SAFE_INTEGER - 1'));
for (let i = 0; i < 35; i++) {
  saturated.set(Promise.resolve(locked)); await saturated.window.fetch();
  saturated.set(Promise.resolve(response('https://fixture.invalid/other.json')));
  await saturated.window.fetch();
}
dto = saturated.api.read();
for (const key of ['glbResponses', 'otherResponses', 'overrideErrors', 'dropped'])
  assert.equal(dto[key], Number.MAX_SAFE_INTEGER);
console.log('PASS CPU-only direct GLB body: delegation, binary/internal slots, untouched JSON, errors, idempotence, bounded DTO; native mechanism unproven');
