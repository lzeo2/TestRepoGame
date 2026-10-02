import assert from 'node:assert/strict';
import * as api from '../assets/car-arcade/storage.js';

const { loadSave, saveSave } = api;
const drive = 'slipstream-borough-v1';
const garage = 'garage-borough-v1';
const limit = 128 * 1024;
let passed = 0;
function check(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}
function memory(entries = []) {
  const data = new Map(entries);
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}
// Synthetic schema, not either game's progression or a runtime debug interface.
function validate(value) {
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  const fields = Object.getOwnPropertyDescriptors(value);
  assert.deepEqual(Reflect.ownKeys(fields).sort(), ['cash', 'note']);
  for (const field of Object.values(fields)) assert.ok('value' in field);
  assert.ok(Number.isSafeInteger(fields.cash.value) && fields.cash.value >= 0);
  assert.equal(typeof fields.note.value, 'string');
  return { cash: fields.cash.value, note: fields.note.value };
}
const profile = { cash: 800, note: 'starter' };
const initial = JSON.stringify(profile);

check('exact API and missing save', () => {
  assert.deepEqual(Object.keys(api).sort(), ['loadSave', 'saveSave']);
  assert.deepEqual(loadSave(drive, validate, memory()), { state: null, error: null, raw: null });
});
check('round trip, canonical validation before serialization', () => {
  const store = memory();
  const saved = saveSave(drive, profile, validate, null, store);
  assert.deepEqual(saved, { raw: initial, error: null });
  assert.deepEqual(loadSave(drive, validate, store), { state: profile, error: null, raw: initial });
  const canonical = saveSave(drive, profile, () => ({ cash: 9, note: 'canonical' }), initial, store);
  assert.equal(canonical.raw, '{"cash":9,"note":"canonical"}');
});
check('same-read metadata, no second read', () => {
  let reads = 0;
  const loaded = loadSave(drive, validate, { getItem() { assert.equal(++reads, 1); return initial; } });
  assert.deepEqual(loaded, { state: profile, error: null, raw: initial });
  assert.equal(reads, 1);
});
check('corrupt JSON and invalid schema preserve bytes', () => {
  for (const raw of ['{broken', 'null', '[]', '{"cash":-1,"note":"bad"}', '{"cash":1,"note":"x","extra":1}']) {
    const store = memory([[drive, raw]]);
    const loaded = loadSave(drive, validate, store);
    assert.equal(loaded.state, null);
    assert.ok(loaded.error);
    assert.equal(loaded.raw, raw);
    assert.equal(store.getItem(drive), raw);
  }
});
check('stale exact-byte mismatch and omitted token never overwrite', () => {
  const raw = '{ "cash":800,"note":"starter"}';
  const store = memory([[drive, raw]]);
  for (const expected of [initial, null, undefined]) {
    const result = saveSave(drive, profile, validate, expected, store);
    assert.ok(result.error.includes('changed elsewhere'));
    assert.equal(result.raw, raw);
    assert.equal(store.getItem(drive), raw);
  }
});
check('denied read and write getter errors stay inside API', () => {
  const denied = { getItem() { throw new Error('denied'); } };
  assert.ok(loadSave(drive, validate, denied).error);
  assert.deepEqual(saveSave(drive, profile, validate, null, denied), {
    raw: null, error: 'Save storage is unavailable. Reload or explicitly reset before saving.',
  });
  const store = { getItem: () => initial, get setItem() { throw new Error('denied'); } };
  assert.ok(saveSave(drive, profile, validate, initial, store).error);
});
check('default localStorage getter denial is caught', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
    assert.ok(loadSave(drive, validate).error);
    assert.ok(saveSave(drive, profile, validate, null).error);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
check('quota error reports failure and preserves primary bytes', () => {
  const store = memory([[drive, initial]]);
  store.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  const result = saveSave(drive, { cash: 900, note: 'next' }, validate, initial, store);
  assert.ok(result.error.includes('quota'));
  assert.equal(result.raw, initial);
  assert.equal(store.getItem(drive), initial);
});
check('hostile getters and toJSON never execute before validation', () => {
  let calls = 0;
  const store = memory([[drive, initial]]);
  const getter = { get cash() { calls++; throw new Error('getter'); }, note: 'bad' };
  const jsonHook = { ...profile, toJSON() { calls++; throw new Error('hook'); } };
  for (const state of [getter, jsonHook, new Date(), Object.assign(Object.create({}), profile)]) {
    assert.ok(saveSave(drive, state, validate, initial, store).error);
    assert.equal(store.getItem(drive), initial);
  }
  assert.equal(calls, 0);
  assert.ok(saveSave(drive, profile, () => false, initial, store).error);
});
check('UTF-8 byte limit inclusive on save and load', () => {
  const overhead = Buffer.byteLength(JSON.stringify({ cash: 0, note: '' }));
  const boundary = { cash: 0, note: 'x'.repeat(limit - overhead) };
  const store = memory();
  const result = saveSave(drive, boundary, validate, null, store);
  assert.equal(result.error, null);
  assert.equal(Buffer.byteLength(result.raw), limit);
  assert.equal(loadSave(drive, validate, store).error, null);
  for (const note of [boundary.note + 'x', '界'.repeat(50000), '\u{10000}'.repeat(33000)]) {
    const raw = JSON.stringify({ cash: 0, note });
    assert.ok(Buffer.byteLength(raw) > limit);
    assert.ok(saveSave(drive, { cash: 0, note }, validate, result.raw, store).error);
    assert.equal(store.getItem(drive), result.raw);
    const loaded = loadSave(garage, validate, memory([[garage, raw]]));
    assert.ok(loaded.error);
    assert.equal(loaded.raw, raw);
  }
});
check('separate game keys and unrelated origin data', () => {
  const store = memory([['unrelated', 'keep']]);
  assert.equal(saveSave(drive, profile, validate, null, store).error, null);
  const business = { cash: 42, note: 'garage' };
  assert.equal(saveSave(garage, business, validate, null, store).error, null);
  assert.deepEqual(loadSave(drive, validate, store).state, profile);
  assert.deepEqual(loadSave(garage, validate, store).state, business);
  assert.ok(saveSave('unrelated', profile, validate, 'keep', store).error);
  assert.ok(loadSave('unrelated', validate, store).error);
  assert.equal(store.getItem('unrelated'), 'keep');
  assert.equal(store.data.size, 3);
});
console.log(`Storage regression: ${passed}/${passed} passed (synthetic, not gameplay evidence).`);
