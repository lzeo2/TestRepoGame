// CPU-only observer contract test. No sibling sampler dependency or native/GPU claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createMotionDiagnostic } from '../Games/Citisten3D/motion-diagnostic.mjs';
import { createSimulation } from '../Games/Citisten3D/sim.mjs';

const names = ['camera', 'projection', 'target', 'viewport', 'scene', 'projected', 'shading'];
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function sampleData() {
  return {
    available: true, reasons: [],
    groups: Object.fromEntries(names.map(name => [name, [1, 2, 3]])),
    // Group identities need not have one key per numeric component.
    keys: Object.fromEntries(names.map(name => [name, [`${name}:cohort`]])),
    input: { known: true, held: [], dragging: false, version: 0 },
    render: { frame: 7, calls: 2, triangles: 24, geometries: 3, textures: 4 },
    sim: { time: 4, tick: 16, speed: 0, construction: [{ id: 2, remaining: 9, total: 12 }] },
    coverage: { cohort: 24, constructionCount: 1, context: { lost: null, queried: false } }
  };
}
function harness(read = () => freeze(sampleData()), options = {}) {
  let at = 0, id = 0, reads = 0, finishes = 0;
  const timers = new Map(), finished = [];
  const diagnostic = createMotionDiagnostic({
    readSample() { reads++; return read(reads); }, now: () => at,
    setTimer(fn, delay) { const key = ++id; timers.set(key, { fn, delay }); return key; },
    clearTimer(key) { timers.delete(key); }, ...options,
    onFinish(report) { finishes++; finished.push(report); options.onFinish?.(report); }
  });
  return { diagnostic, timers, finished,
    get reads() { return reads; }, get finishes() { return finishes; },
    at(ms) { at = ms; },
    take(ms) { at = ms; return diagnostic.sample(); },
    fire(ms = 5000) { at = ms; const [key, timer] = timers.entries().next().value; timers.delete(key); timer.fn(); }
  };
}
let cases = 0;
function check(label, run) { run(); cases++; console.log(`PASS ${cases} ${label}`); }
function finishedPair(mutator) {
  const original = sampleData(), changed = clone(original); mutator(changed);
  freeze(original); freeze(changed);
  const before = JSON.stringify([original, changed]);
  const h = harness(n => n === 1 ? original : changed);
  assert(h.diagnostic.start()); h.take(0); h.take(100); h.fire();
  assert.equal(JSON.stringify([original, changed]), before, 'observer never mutates frozen samples');
  return h.diagnostic.report;
}

check('fixed complete cadence, detached reports and first/last observations', () => {
  const value = freeze(sampleData()), before = JSON.stringify(value), h = harness(() => value);
  assert.equal(h.diagnostic.report, null); assert.equal(h.diagnostic.sample(), false);
  assert(h.diagnostic.start()); assert.equal(h.reads, 0, 'start never reads or renders');
  assert.equal(h.diagnostic.start(), false); assert.equal(h.timers.size, 1);
  for (let ms = 0; ms <= 4750; ms += 250) h.take(ms);
  h.fire(); const report = h.diagnostic.report;
  assert.deepEqual(report.observations, ['noRecordedMotionInSampledData']);
  assert.equal(report.partial, false); assert.equal(report.elapsedMs, 5000); assert.equal(report.overrunMs, 0);
  assert.equal(report.sampleCount, 20); assert.equal(report.timing.intervals, 19);
  assert.equal(report.sampleSpanMs, 4750); assert.equal(report.timing.totalIntervalMs, 4750);
  for (const group of Object.values(report.groups)) { assert.equal(group.maxAbsDelta, 0); assert.equal(group.comparisons, 19); }
  assert.deepEqual(report.first.sim, { ...value.sim, constructionObservedCount: 1 });
  assert.equal(report.last.render.frame, 7); assert.equal(h.finishes, 1); assert.equal(h.timers.size, 0);
  report.first.sim.construction[0].remaining = -1; report.reasons.push('mutated');
  h.finished[0].groups.camera.maxAbsDelta = 42;
  assert.equal(h.diagnostic.report.first.sim.construction[0].remaining, 9);
  assert.equal(h.diagnostic.report.groups.camera.maxAbsDelta, 0);
  assert.equal(JSON.stringify(value), before);
});
check('camera easing differs from target movement; input only captures WASD and known fields', () => {
  const camera = finishedPair(s => { s.groups.camera[0] += .5; });
  assert(camera.observations.includes('camerachanged'));
  assert(!camera.observations.includes('input/targetchanged'));
  assert.equal(camera.groups.target.maxAbsDelta, 0);
  assert.equal(camera.groups.camera.maxAbsDelta, .5);
  const moving = finishedPair(s => {
    s.groups.target[0] += 3; s.groups.camera[0] += 1;
    s.input = { known: true, held: ['KeyW', 'KeyA', 'Password', 'KeyX'], dragging: true, version: 1, text: 'not retained' };
  });
  assert(moving.observations.includes('input/targetchanged'));
  assert.deepEqual(moving.input.heldMovementCodes, ['KeyW', 'KeyA']);
  assert.equal(moving.input.draggingObserved, true); assert.equal(moving.last.input.version, 1);
  assert(!JSON.stringify(moving).includes('not retained')); assert(!JSON.stringify(moving).includes('Password'));
  const unknown = finishedPair(s => { s.input = { known: false, held: [], dragging: false, version: 0 }; });
  assert.equal(unknown.last.input.heldMovementCodes, null); assert.equal(unknown.last.input.dragging, null);
  assert(unknown.input.unknownSamples > 0); assert(unknown.partial);
});
for (const [group, category] of [['viewport', 'viewport/projectionchanged'], ['projection', 'viewport/projectionchanged'],
  ['scene', 'sampledscenechanged'], ['shading', 'shadingchanged'], ['projected', 'projectedchanged']]) {
  check(`${group}-only change stays separate`, () => {
    const report = finishedPair(s => { s.groups[group][1] -= 2; });
    assert(report.observations.includes(category)); assert.equal(report.groups[group].maxAbsDelta, 2);
    for (const other of names.filter(n => n !== group)) assert.equal(report.groups[other].maxAbsDelta, 0);
    assert(!report.observations.includes('camerachanged'));
  });
}
check('no callbacks, paused-loop tail and zero render counter remain honest', () => {
  const h = harness(); h.diagnostic.start(); h.fire(5500);
  const r = h.diagnostic.report;
  assert.equal(r.sampleCount, 0); assert.equal(r.first, null); assert.equal(r.sampleSpanMs, null);
  assert.equal(r.elapsedMs, 5500); assert.equal(r.overrunMs, 500); assert(r.partial);
  assert(r.observations.includes('unavailable')); assert(!r.observations.includes('noRecordedMotionInSampledData'));
  const paused = harness(() => { const s = sampleData(); s.render.frame = 0; return freeze(s); });
  paused.diagnostic.start(); for (let ms = 0; ms <= 2000; ms += 100) paused.take(ms); paused.fire();
  assert(paused.diagnostic.report.partial); assert.equal(paused.diagnostic.report.last.render.frame, 0);
  assert.equal(paused.diagnostic.report.sampleCount, 21); assert.equal(paused.reads, 21);
});
check('zero-length/null/nonfinite/malformed groups are unavailable, never zero deltas', () => {
  for (const bad of [[], null, [NaN], [Infinity], ['1'], {}, undefined, new Float32Array([1])]) {
    const report = finishedPair(s => { s.groups.camera = bad; });
    assert.equal(report.groups.camera.unavailableSamples, 1);
    assert.equal(report.groups.camera.comparisons, 0); assert.equal(report.groups.camera.maxAbsDelta, null);
    assert(report.reasons.includes('camera-unavailable')); assert(report.partial);
  }
  for (const bad of [null, [], [1], 'key']) {
    const report = finishedPair(s => { s.keys.scene = bad; });
    assert.equal(report.groups.scene.comparisons, 0); assert(report.reasons.includes('scene-unavailable'));
  }
});
check('changed keys, key count and vector lengths mark coverage, not motion', () => {
  for (const mutate of [s => { s.keys.scene = ['different']; }, s => { s.keys.scene.push('extra'); },
    s => { s.groups.scene.push(99); }, s => { s.groups.scene.pop(); }]) {
    const report = finishedPair(mutate), group = report.groups.scene;
    assert.equal(group.coverageChanged, 1); assert.equal(group.comparisons, 0); assert.equal(group.maxAbsDelta, null);
    assert(!report.observations.includes('sampledscenechanged')); assert(report.partial);
  }
});
check('read faults recover without bridging missing samples; callback failure preserves primary fault', () => {
  const h = harness(n => { if (n === 2) throw new Error('private text must not leak'); return freeze(sampleData()); },
    { onFinish() { throw new Error('UI failure'); } });
  h.diagnostic.start(); h.take(0); h.take(100); h.take(200); h.fire();
  const r = h.diagnostic.report;
  assert.equal(r.readErrors, 1); assert.equal(r.primaryReadFault, 'read-sample-error');
  assert(r.reasons.includes('finish-callback-error')); assert(r.finishCallbackError); assert.equal(r.groups.camera.comparisons, 0);
  assert(!JSON.stringify(r).includes('private text')); assert.equal(h.finishes, 1);
  for (const bad of [null, undefined, 1, []]) {
    const invalid = harness(() => bad); invalid.diagnostic.start(); invalid.take(0); invalid.fire();
    assert.equal(invalid.diagnostic.report.readErrors, 1);
    assert(invalid.diagnostic.report.observations.includes('unavailable'));
  }
  const unavailable = finishedPair(s => { s.available = false; s.reasons = ['cohort missing']; });
  assert.equal(unavailable.unavailableReads, 1); assert(unavailable.reasons.includes('sample-unavailable'));
});
check('360 sample hard cap, bounded JSON and no full vectors retained in report', () => {
  const h = harness(n => {
    const s = sampleData();
    for (const name of names) { s.groups[name] = Array(1024).fill(n); s.keys[name] = ['x'.repeat(96)]; }
    s.coverage = { a: Array(1000).fill({ b: 'q'.repeat(2000) }) };
    s.sim.construction = Array(1000).fill({ id: n, remaining: 5, total: 12 });
    return freeze(s);
  });
  h.diagnostic.start(); for (let ms = 0; ms < 1000; ms++) h.take(ms);
  const r = h.diagnostic.report;
  assert.equal(r.sampleCount, 360); assert.equal(h.reads, 360); assert.equal(r.finishReason, 'sample-cap');
  assert.equal(h.finishes, 1); assert.equal(h.timers.size, 0); assert.equal(r.elapsedMs, 359);
  assert(r.partial); assert(r.reasons.includes('metadata-limit'));
  assert(Buffer.byteLength(JSON.stringify(r)) < 16384);
  assert(!('frames' in r)); assert(!('values' in r.groups.camera));
  console.log(`  bounded report ${Buffer.byteLength(JSON.stringify(r))} bytes for 360 x 7168 numeric components`);
});
check('5000ms boundary, delayed/early timer and no late sample read', () => {
  const h = harness(); h.diagnostic.start(); h.take(4999); assert.equal(h.take(5000), false);
  assert.equal(h.reads, 1); assert.equal(h.diagnostic.report.finishReason, 'deadline'); assert.equal(h.timers.size, 0);
  const late = harness(); late.diagnostic.start(); late.take(100); late.fire(7200);
  assert.equal(late.diagnostic.report.elapsedMs, 7200); assert.equal(late.diagnostic.report.overrunMs, 2200);
  const early = harness(); early.diagnostic.start(); early.fire(4000);
  assert(early.diagnostic.isRunning); assert.equal([...early.timers.values()][0].delay, 1000);
  early.fire(5000); assert.equal(early.finishes, 1);
  let slow;
  slow = harness(() => { slow.at(5100); return freeze(sampleData()); });
  slow.diagnostic.start(); slow.take(4999);
  assert.equal(slow.diagnostic.report.elapsedMs, 5100); assert.equal(slow.diagnostic.report.overrunMs, 100);
  assert.equal(slow.diagnostic.report.timing.observerMaxMs, 101);
  assert.equal(slow.diagnostic.report.finishReason, 'deadline');
});
check('cancel/restart/dispose invalidate stale timers; idle methods require no clock/timers', () => {
  const h = harness(); assert.equal(h.diagnostic.cancel(), false);
  h.diagnostic.start(); const stale = [...h.timers.values()][0].fn;
  h.take(100); assert(h.diagnostic.cancel()); assert.equal(h.diagnostic.cancel(), false);
  assert.equal(h.finishes, 0); assert.equal(h.timers.size, 0); assert.equal(h.diagnostic.report.finishReason, 'cancelled');
  h.at(1000); assert(h.diagnostic.start()); stale(); assert(h.diagnostic.isRunning);
  h.take(1100); h.diagnostic.dispose(); h.diagnostic.dispose();
  assert.equal(h.diagnostic.report.finishReason, 'disposed'); assert.equal(h.diagnostic.start(), false);
  assert.equal(h.diagnostic.sample(), false); assert.equal(h.finishes, 0); assert.equal(h.timers.size, 0);
  stale(); assert.equal(h.finishes, 0);
  const source = fs.readFileSync(new URL('../Games/Citisten3D/motion-diagnostic.mjs', import.meta.url), 'utf8');
  vm.runInNewContext(source.replace('export function', 'function') + `
    const idle = createMotionDiagnostic({ readSample() { throw new Error('not called'); } });
    if (idle.report !== null || idle.cancel() !== false || idle.sample() !== false) throw new Error('idle');
    idle.dispose(); idle.dispose();
    const missingTimer = createMotionDiagnostic({ now: () => 0, readSample: () => null });
    if (missingTimer.start() !== false || missingTimer.report.finishReason !== 'observer-error') throw new Error('timer');
  `, {});
});
check('observer clock/timer failures and numeric overflow never escape to game', () => {
  const clock = harness(undefined, { now() { throw new Error('clock'); } });
  assert.equal(clock.diagnostic.start(), false); assert(clock.diagnostic.report.reasons.includes('clock-unavailable'));
  const cleanup = harness(undefined, { clearTimer() { throw new Error('cleanup'); } });
  cleanup.diagnostic.start(); assert(cleanup.diagnostic.cancel());
  assert(cleanup.diagnostic.report.reasons.includes('timer-cleanup-error'));
  const h = harness(); h.diagnostic.start(); h.take(100); h.take(50);
  assert.equal(h.diagnostic.report.finishReason, 'observer-error'); assert(h.diagnostic.report.reasons.includes('clock-regressed'));
  const overflow = harness(n => { const s = sampleData(); s.groups.camera = [n === 1 ? -Number.MAX_VALUE : Number.MAX_VALUE]; return freeze(s); });
  overflow.diagnostic.start(); overflow.take(0); overflow.take(100); overflow.fire();
  assert.equal(overflow.diagnostic.report.groups.camera.maxAbsDelta, null);
  assert(overflow.diagnostic.report.reasons.includes('camera-delta-overflow'));
});
check('real simulation snapshot invariant under 360 full read-only contract samples', () => {
  const sim = createSimulation({ size: 24, timedConstruction: true, expansionEnabled: true });
  assert(sim.place('power', 2, 2).ok); sim.setSpeed(0);
  const snapshot = sim.snapshot.bind(sim), before = snapshot();
  let forbidden = 0;
  const fail = () => { forbidden++; throw new Error('observer invoked game mutation'); };
  for (const key of ['update', 'setSpeed', 'place', 'save']) sim[key] = fail;
  const world = { render: fail, update: fail, controls: { update: fail, setPose: fail, inputState: freeze({ known: true, held: [], dragging: false, version: 0 }) } };
  let samplerReads = 0;
  const fullReadSampler = () => {
    samplerReads++;
    const s = sampleData(); s.input = world.controls.inputState;
    s.sim = { time: sim.state.time, tick: sim.state.tick, speed: sim.state.speed,
      construction: sim.state.buildings.map(b => ({ id: b.id, remaining: b.constructionRemaining, total: b.constructionTotal })) };
    s.coverage.constructionCount = sim.state.buildings.length;
    return freeze(s);
  };
  const h = harness(fullReadSampler); h.diagnostic.start();
  for (let i = 0; i < 360; i++) h.take(i * 10);
  assert.equal(forbidden, 0); assert.equal(samplerReads, 360); assert.deepEqual(snapshot(), before);
  assert.equal(h.diagnostic.report.first.sim.constructionObservedCount, 2);
  assert.deepEqual(h.diagnostic.report.first.sim, h.diagnostic.report.last.sim);
  assert.equal(before.state.buildings[1].constructionRemaining, 12);
  assert.equal(h.diagnostic.report.last.sim.construction[1].remaining, before.state.buildings[1].constructionRemaining);
});
console.log(`MOTION DIAGNOSTIC PASS: ${cases} cases; CPU observer only, no native/GPU/visual acceptance`);
