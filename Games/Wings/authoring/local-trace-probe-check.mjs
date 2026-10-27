// CPU-only fake natives. This is not browser, GPU, loading or gameplay acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../verification/local-trace-probe.js', import.meta.url), 'utf8');
let time = 10, nextId = 71, nativeRequests = 0, stackReads = 0;
const queue = new Map(), intervals = [], nativeCalls = [], abortCalls = [];
const nativeError = new TypeError('native invalid callback'), callbackError = new Error('callback failed');
const marker = { result: true }, receiver = { receiver: true }, badReceiver = { invalid: true };
class FakeAbortController {
  abort() {
    if (!(this instanceof FakeAbortController)) throw nativeError;
    abortCalls.push({ receiver: this, args: [...arguments] });
    return marker;
  }
  get signal() { throw new Error('probe must never read signal'); }
}
const startup = { phase: 'awaiting-terrain', callbacks: 3, completedRenders: 0, worldReady: false,
  worldStats: { pending: 2 }, render: { drawCalls: 0 } };
const game = { state: 'spawn', seq: 0, team: 0, fleet: { hostTick: 30, roots: 1,
  frame: { tick: 10 }, models: [{ id: 'escort', visible: true, position: [1, 2, 3] }] } };
const wings = { startup, stats: { fps: 0.2, drawCalls: 28 }, game };
Object.defineProperty(wings, 'scene', { get() { throw new Error('no resource reads'); } });
class CountingError extends Error {
  constructor() { super(); stackReads++; }
}
const context = vm.createContext({ performance: { now: () => time }, Error: CountingError,
  document: { visibilityState: 'visible', hasFocus: () => true },
  __wings: wings, AbortController: FakeAbortController,
  setInterval(callback, ms) { intervals.push({ callback, ms }); return 42; },
  requestAnimationFrame(callback) {
    nativeCalls.push({ receiver: this, args: [...arguments] });
    if (typeof callback !== 'function' || this === badReceiver) throw nativeError;
    nativeRequests++; const id = nextId++; queue.set(id, callback); return id;
  },
  cancelAnimationFrame(id) {
    nativeCalls.push({ receiver: this, args: [...arguments] });
    if (this === badReceiver) throw nativeError;
    queue.delete(id); return marker;
  },
});
vm.runInContext('window = globalThis', context);
const load = () => vm.runInContext(source, context);
const read = () => JSON.parse(JSON.stringify(context.__wingsDiagnosticTrace.read()));
const fire = (id, ...args) => { const callback = queue.get(id); queue.delete(id); return callback.apply(receiver, args); };
load();
assert.equal(nativeRequests, 0); assert.equal(queue.size, 0);
assert.equal(intervals.length, 1); assert.equal(intervals[0].ms, 1000);
assert.equal(Object.isFrozen(context.__wingsDiagnosticTrace), true);
const wrapped = context.requestAnimationFrame, cancel = context.cancelAnimationFrame, abort = FakeAbortController.prototype.abort;
load();
assert.equal(context.requestAnimationFrame, wrapped); assert.equal(context.cancelAnimationFrame, cancel);
assert.equal(FakeAbortController.prototype.abort, abort); assert.equal(intervals.length, 1);
for (const invalid of [undefined, null, 7, 'callback', {}]) {
  assert.throws(() => wrapped.call(receiver, invalid, 'extra'), error => error === nativeError);
  assert.equal(nativeCalls.at(-1).receiver, receiver); assert.equal(nativeCalls.at(-1).args[0], invalid);
}
assert.equal(queue.size, 0); assert.equal(read().raf.requested, 0);
assert.throws(() => wrapped.call(badReceiver, () => {}), error => error === nativeError);
assert.throws(() => cancel.call(badReceiver, 999), error => error === nativeError);
const id = wrapped.call(receiver, function callback(timestamp, extra) {
  assert.equal(this, receiver); assert.equal(timestamp, 123); assert.equal(extra, 'extra');
  time += 55; return marker;
}, 'registration-extra');
assert.equal(id, 71); assert.equal(nativeCalls.at(-1).receiver, receiver);
assert.equal(nativeCalls.at(-1).args[1], 'registration-extra');
assert.equal(fire(id, 123, 'extra'), marker);
assert.deepEqual(read().raf, { requested: 1, fired: 1, completed: 1, callbackThrows: 0,
  cancelCalls: 1, lastStart: 10, lastEnd: 65, maxCallbackMs: 55 });
assert.equal(read().slowCallbacks[0].durationMs, 55);
const throwing = wrapped(() => { time += 70; throw callbackError; });
assert.throws(() => fire(throwing, 456), error => error === callbackError);
assert.equal(read().raf.callbackThrows, 1); assert.equal(read().raf.completed, 1);
const cancelled = wrapped(() => assert.fail('cancelled callback fired'));
assert.equal(cancel.call(receiver, cancelled, 'cancel-extra'), marker);
assert.equal(queue.has(cancelled), false); assert.equal(nativeCalls.at(-1).receiver, receiver);
assert.deepEqual(nativeCalls.at(-1).args, [cancelled, 'cancel-extra']);
const controller = new FakeAbortController();
const poison = new Proxy({}, { get() { throw new Error('reason property read'); } });
for (const reason of [poison, null, undefined, 'cancel load', 4, false, 3n, Symbol('reason')]) {
  assert.equal(abort.call(controller, reason, 'abort-extra'), marker);
  assert.equal(abortCalls.at(-1).receiver, controller);
  assert.equal(abortCalls.at(-1).args[0], reason); assert.equal(abortCalls.at(-1).args[1], 'abort-extra');
}
assert.equal(read().aborts[0].reasonType, 'object'); assert.equal(read().aborts[0].reason, null);
assert.equal(abort.call(controller), marker); assert.equal(abortCalls.at(-1).args.length, 0);
assert.throws(() => abort.call(receiver), error => error === nativeError);
intervals[0].callback();
let dto = read();
assert.equal(dto.samples[0].startup.worldReady, false); assert.equal(dto.samples[0].startup.worldStats.pending, 2);
assert.equal(dto.samples[0].game.fleet.fcTick, 10); assert.equal(dto.samples[0].game.fleet.hostTick, 30);
assert.deepEqual(dto.samples[0].game.fleet.models[0].position, [1, 2, 3]);
assert.equal('scene' in dto.samples[0], false); assert.equal('assetsReady' in dto.samples[0], false);
dto.samples[0].game.fleet.models[0].position[0] = 999;
assert.equal(read().samples[0].game.fleet.models[0].position[0], 1);
game.fleet.models[0].position[0] = 88;
assert.equal(read().samples[0].game.fleet.models[0].position[0], 1);
// Exhaust all log caps. RAF registration stacks stop at eight, not every frame.
for (let i = 0; i < 80; i++) { const id = wrapped(() => { time += 50; }); fire(id, time); }
assert.equal(stackReads, 8 + 2 + 10); // registrations + cancellations + abort calls
for (let i = 0; i < 40; i++) { cancel(i); abort.call(controller, 'x'.repeat(700)); }
for (let i = 0; i < 130; i++) { time += 1000; intervals[0].callback(); }
dto = read();
for (const [key, cap] of Object.entries({ registrations: 8, slowCallbacks: 64, cancels: 32, aborts: 32, samples: 120 })) {
  assert.equal(dto[key].length, cap, key); assert.ok(dto.dropped[key] > 0, key);
}
assert.equal(dto.dropped.samples, 11); assert.ok(dto.stringTruncations > 0);
assert.ok(dto.aborts.every(record => record.stack.length <= 2048));
assert.ok(dto.cancels.every(record => record.stack.length <= 2048));
assert.equal(stackReads, 8 + 32 + 32);
assert.ok(dto.samples.every((sample, i, all) => i === 0 || sample.time >= all[i - 1].time));
assert.equal(dto.samples.at(-1).visibilityState, 'visible'); assert.equal(dto.samples.at(-1).hasFocus, true);
assert.deepEqual(startup, { phase: 'awaiting-terrain', callbacks: 3, completedRenders: 0, worldReady: false,
  worldStats: { pending: 2 }, render: { drawCalls: 0 } });
game.fleet.models = Array.from({ length: 20 }, () => ({ id: 'x', position: [0, 0, 0] }));
intervals[0].callback();
assert.equal(read().samples.at(-1).game.fleet.models.length, 16); assert.equal(read().dropped.models, 4);
context.__wings = undefined; intervals[0].callback();
assert.equal(read().samples.at(-1).game, null); assert.equal(read().samples.at(-1).startup, null);
vm.runInContext("Object.defineProperty(window, '__wings', { get() { throw new Error('DTO unavailable'); }, configurable: true })", context);
intervals[0].callback(); assert.equal(read().sampleErrors, 1); assert.equal(read().samples.at(-1).error, true);
assert.equal(nativeRequests, 83); assert.equal(queue.size, 0); assert.equal(intervals.length, 1);
assert.doesNotMatch(source, /\b(fetch|requestIdleCallback|WebSocket|gc)\s*\(/);
assert.doesNotMatch(source, /\.signal\b|addEventListener|\.render\s*\(/);
console.log('PASS CPU-only fake-native trace: delegation/errors/IDs/callbacks/abort safety/bounds/clones/idempotency; no browser launched');
