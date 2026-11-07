// Process-local diagnostics only; never imports or runs the five-pilot acceptance fixture.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { retainedRoot } from '../Games/Wings/authoring/retained-host-loader.mjs';
const key = Symbol.for('wings.phase-attribution');
let serial = 0;
export const phaseOf = engine => engine.matchEndedAt === null ? 'combat' : 'postscore';
export function installWingsPhaseProfiler(RoomEngine) {
  assert.equal(globalThis[key], undefined, 'one profiler per process');
  const groups = Object.fromEntries(['combat', 'postscore'].map(p => [p, {
    firstWallMs: null, lastWallMs: null,
    advanceCalls: 0, simSeconds: 0, advanceMs: 0, wireInAdvanceMs: 0, wireOutsideAdvanceMs: 0,
    jsonInAdvanceMs: 0, jsonOutsideAdvanceMs: 0, stringifyCalls: 0,
    snapshotCalls: 0, eventCalls: 0, deliveryCalls: 0, deliveryMs: 0,
  }]));
  const channels = new WeakMap(), pending = new WeakMap(), postCounts = new WeakMap();
  let enabled = false, disposed = false, advance = null, wire = null, jsonDepth = 0;
  let mixedDeliveryCalls = 0, mixedDeliveryMs = 0;
  const stringify = JSON.stringify, saved = new Map();
  const selected = engine => {
    if (!enabled || disposed) return null;
    const phase = phaseOf(engine);
    if (phase === 'postscore' && (postCounts.get(engine) ?? 0) >= 120) return null;
    return groups[phase];
  };
  function begin(sample) { const t = performance.now(); if (sample.firstWallMs === null) sample.firstWallMs = t; return t; }
  function finish(sample) { const t = performance.now(); sample.lastWallMs = t; return t; }
  function wrap(name, measure) {
    const descriptor = Object.getOwnPropertyDescriptor(RoomEngine.prototype, name);
    assert.equal(typeof descriptor?.value, 'function', name); saved.set(name, descriptor);
    Object.defineProperty(RoomEngine.prototype, name, { ...descriptor, value: function (...args) {
      return measure.call(this, descriptor.value, args);
    } });
  }
  wrap('advance', function (actual, args) {
    const sample = selected(this); if (!sample) return Reflect.apply(actual, this, args);
    assert.equal(advance, null, 'ordinary loopback advance must not reenter');
    const before = this.time, context = { engine: this, sample }, start = begin(sample); advance = context;
    if (phaseOf(this) === 'postscore') postCounts.set(this, (postCounts.get(this) ?? 0) + 1);
    try { return Reflect.apply(actual, this, args); }
    finally { sample.advanceMs += finish(sample) - start; sample.advanceCalls++;
      sample.simSeconds += this.time - before; advance = null; }
  });
  for (const [name, count] of [['broadcastSnapshot', 'snapshotCalls'], ['flushEvents', 'eventCalls']]) wrap(name, function (actual, args) {
    if (wire) return Reflect.apply(actual, this, args);
    const inAdvance = advance?.engine === this, sample = inAdvance ? advance.sample : selected(this);
    if (!sample) return Reflect.apply(actual, this, args);
    wire = { engine: this, sample, inAdvance }; const start = begin(sample);
    try { return Reflect.apply(actual, this, args); }
    finally { sample[inAdvance ? 'wireInAdvanceMs' : 'wireOutsideAdvanceMs'] += finish(sample) - start;
      sample[count]++; wire = null; }
  });
  JSON.stringify = function (...args) {
    if (!wire || jsonDepth) return Reflect.apply(stringify, this, args);
    const context = wire, start = performance.now(); jsonDepth++;
    try { return Reflect.apply(stringify, this, args); }
    finally { context.sample[context.inAdvance ? 'jsonInAdvanceMs' : 'jsonOutsideAdvanceMs'] += performance.now() - start;
      context.sample.stringifyCalls++; jsonDepth--; }
  };
  const api = {
    start() { enabled = true; }, stop() { enabled = false; },
    bind(channel, engine) { channels.set(channel, engine); },
    enqueue(channel) {
      const engine = channels.get(channel); if (!engine || disposed) return;
      const sample = wire?.engine === engine ? wire.sample : advance?.engine === engine ? advance.sample : selected(engine);
      let set = pending.get(channel); if (!set) pending.set(channel, set = new Set()); set.add(sample);
    },
    delivery(channel, actual) {
      const set = pending.get(channel); pending.delete(channel);
      if (disposed || !set?.size || (set.size === 1 && set.has(null))) return actual();
      const sample = set.size === 1 ? [...set][0] : null, start = sample ? begin(sample) : performance.now();
      try { return actual(); }
      finally { const elapsed = (sample ? finish(sample) : performance.now()) - start;
        if (sample) { sample.deliveryCalls++; sample.deliveryMs += elapsed; }
        else { mixedDeliveryCalls++; mixedDeliveryMs += elapsed; } }
    },
    snapshot() {
      const spans = Object.fromEntries(Object.entries(groups).map(([p, s]) => [p, { ...s,
        windowMs: s.firstWallMs === null ? null : s.lastWallMs - s.firstWallMs,
        advanceExclusiveMs: s.advanceMs - s.wireInAdvanceMs, wireOtherInAdvanceMs: s.wireInAdvanceMs - s.jsonInAdvanceMs }]));
      return structuredClone({ groups: spans, mixedDeliveryCalls, mixedDeliveryMs,
        postscoreAdvanceCallLimit: 120, postscoreLimitReached: groups.postscore.advanceCalls >= 120,
        limits: 'Wall spans, not CPU self-time. advance contains publication; subtract wireInAdvanceMs for simulation/other advance. JSON spans are children of wire preparation, not extra totals. Delivery includes parse/decode/handlers. Mixed or unsampled batches stay unallocated. Cap limits instrumentation only, never simulation ticks.' });
    },
    dispose() {
      enabled = false; disposed = true; JSON.stringify = stringify;
      for (const [name, descriptor] of saved) Object.defineProperty(RoomEngine.prototype, name, descriptor);
      hook.deregister(); delete globalThis[key];
    },
  };
  globalThis[key] = api;
  const base = new URL('src/sim/loopback.ts', retainedRoot), alias = `${base.href}?phase-attribution=${++serial}`;
  const hook = registerHooks({
    resolve(specifier, context, next) {
      return specifier === base.href ? { url: alias, shortCircuit: true } : next(specifier, context);
    },
    load(url, context, next) {
      if (url !== alias) return next(url, context);
      const result = next(base.href, context); let source = String(result.source);
      const once = (old, replacement) => { assert.equal(source.split(old).length, 2, old); source = source.replace(old, replacement); };
      once('const now = options.now', 'const __phaseChannel = {};\nconst now = options.now');
      const a = source.indexOf('const flush ='), b = source.indexOf('const enqueue =', a); assert(a >= 0 && b > a);
      const raw = source.slice(a, b).replace('const flush =', 'const __phaseRawFlush =');
      source = source.slice(0, a) + raw + 'const flush = ()=>__phaseTap.delivery(__phaseChannel, __phaseRawFlush);\n' + source.slice(b);
      once('outbox.push(text);', '__phaseTap.enqueue(__phaseChannel);\noutbox.push(text);');
      once('options.hostBridge?.beforeStep(engine);', '__phaseTap.bind(__phaseChannel, engine);\noptions.hostBridge?.beforeStep(engine);');
      return { ...result, source: 'const __phaseTap = globalThis[Symbol.for("wings.phase-attribution")];\n' + source };
    },
  });
  return api;
}
