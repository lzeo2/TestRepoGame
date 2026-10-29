import assert from 'node:assert/strict';
import { CameraBob } from './camera-bob.mjs';

const rates = [30, 60, 120];
const near = (a, b, tolerance = 1e-12) => assert.ok(Math.abs(a - b) <= tolerance,
  `${a} != ${b} (tolerance ${tolerance})`);
const step = (bob, fps, values = {}) => bob.sample({dt: 1 / fps, grounded: true, ...values});
let groups = 0;

// Common times are compared directly, not just aggregate peak magnitudes.
const traces = rates.map(fps => {
  const bob = new CameraBob(), trace = [];
  for (let i = 1; i <= fps * 3; i++) {
    const offset = step(bob, fps, {distance: 7 / fps});
    assert.ok(Math.abs(offset) <= 0.012);
    if (i % (fps / 30) === 0) trace.push(offset);
  }
  assert.ok(Math.max(...trace.map(Math.abs)) > 0.009);
  for (let i = 1; i <= fps; i++) {
    const offset = step(bob, fps, {distance: 0, speed: 100});
    if (i % (fps / 30) === 0) trace.push(offset);
    if (i >= fps / 4) assert.equal(offset, 0);
  }
  assert.equal(bob.phase, 0);
  for (let i = 0; i < fps * 10; i++) assert.equal(step(bob, fps), 0);
  return trace;
});
for (const trace of traces) trace.forEach((offset, i) => near(offset, traces[0][i]));
console.log('PASS 30/60/120 Hz movement/rest: common-time offsets agree within 1e-12; exact stable zero after .25s');
groups++;

for (const fps of rates) {
  // Aim, air (also the caller's zipline gate), off and reduced motion suppress
  // even a live nonzero sample and do not accumulate hidden travel/phase.
  for (const gate of [{aiming: true}, {grounded: false}, {enabled: false}, {reducedMotion: true}]) {
    const bob = new CameraBob();
    for (let i = 0; i < fps / 4; i++) step(bob, fps, {speed: 7});
    assert.ok(Math.abs(bob.offset) > 0.001);
    for (let i = 0; i < fps * 2; i++) {
      assert.equal(step(bob, fps, {speed: 12, ...gate}), 0);
      assert.equal(bob.phase, 0);
    }
    const fresh = new CameraBob();
    for (let i = 0; i < fps; i++) near(step(bob, fps, {speed: 7}), step(fresh, fps, {speed: 7}));
    assert.equal(bob.sample({dt: 0, grounded: true, ...gate}), 0);
  }
}
console.log('PASS 30/60/120 Hz aim/air/zipline-gate/off/reduced-motion: immediate zero, no hidden phase, clean re-entry');
groups++;

for (const fps of rates) {
  const bob = new CameraBob();
  for (let i = 0; i < fps / 4; i++) step(bob, fps, {speed: 7});
  const before = bob.offset, phase = bob.phase;
  let previous = Math.abs(before);
  for (let i = 0; i < fps; i++) {
    const offset = step(bob, fps, {distance: 0});
    assert.ok(Math.abs(offset) <= previous + 1e-15);
    if (offset !== 0) {
      assert.equal(Math.sign(offset), Math.sign(before));
      assert.equal(bob.phase, phase);
    }
    previous = Math.abs(offset);
  }
  assert.equal(bob.offset, 0);
  // Long rest has no effect on the next gait, not even a wall-clock phase.
  for (let i = 0; i < 10000; i++) step(bob, fps);
  const fresh = new CameraBob();
  near(step(bob, fps, {speed: 7}), step(fresh, fps, {speed: 7}));
}
console.log('PASS stop settling: monotonic, phase frozen, no sign reversal; long idle does not advance gait');
groups++;

for (const fps of rates) {
  const byDistance = new CameraBob(), bySpeed = new CameraBob();
  for (let i = 0; i < fps * 3; i++) {
    near(step(byDistance, fps, {distance: 5 / fps}), step(bySpeed, fps, {speed: 5}));
  }
  const slow = new CameraBob(), fast = new CameraBob();
  // Same travelled distance at different speeds has the same phase, not time.
  for (let i = 0; i < fps; i++) step(slow, fps, {speed: 2});
  for (let i = 0; i < fps / 2; i++) step(fast, fps, {speed: 4});
  near(slow.phase, fast.phase);
  const halfAmplitude = new CameraBob(), fullAmplitude = new CameraBob();
  const half = halfAmplitude.sample({dt: 1.25, distance: 5, grounded: true});
  const full = fullAmplitude.sample({dt: 0.625, distance: 5, grounded: true});
  near(full, 2 * half);
  near(full, 0.012);
  const saturated = new CameraBob();
  for (let i = 0; i < fps * 10; i++) assert.ok(Math.abs(step(saturated, fps, {speed: 100})) <= 0.012);
}
console.log('PASS distance authority/speed fallback, travel-linked phase, speed-scaled and capped amplitude');
groups++;

for (const fps of rates) {
  const bob = new CameraBob();
  let reference;
  for (let cycle = 0; cycle < 1000; cycle++) {
    for (let i = 0; i < fps / 2; i++) {
      const offset = step(bob, fps, {speed: 7});
      assert.ok(Number.isFinite(offset) && Math.abs(offset) <= 0.012);
    }
    if (reference === undefined) reference = bob.offset;
    near(bob.offset, reference);
    for (let i = 0; i < fps / 2; i++) step(bob, fps);
    assert.equal(bob.offset, 0);
  }
}
console.log('PASS 1000 move/rest cycles at each rate: no cumulative growth or residual drift');
groups++;

{
  const bob = new CameraBob();
  const input = Object.freeze({dt: 0.25, distance: 1, grounded: true});
  const offset = bob.sample(input), phase = bob.phase;
  for (const dt of [0, -1, NaN, Infinity, undefined]) {
    assert.equal(bob.sample({dt, distance: 100, grounded: true}), offset);
    assert.equal(bob.phase, phase);
  }
  for (const distance of [-1, NaN, Infinity]) {
    assert.equal(bob.sample({dt: 1, distance, grounded: true}), 0);
  }
  bob.sample(input);
  assert.equal(bob.sample({dt: 0, enabled: false, grounded: true}), 0);
  bob.sample(input);
  assert.equal(bob.reset(), 0);
  assert.equal(bob.offset, 0);
  assert.equal(bob.phase, 0);
  assert.equal(bob.sample(), 0);
  assert.ok(Number.isFinite(bob.sample({dt: 1, distance: Number.MAX_VALUE, grounded: true})));
}
console.log('PASS immutable input, zero/invalid dt, malformed travel, explicit reset, huge finite travel');
groups++;
console.log(`camera-bob-test: ${groups} groups passed (numeric CPU contract only, no native-feel claim)`);
