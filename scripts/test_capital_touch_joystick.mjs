import assert from 'node:assert/strict';
import { createTouchJoystick } from '../Games/Capital Drive/touch-joystick.js';

function fixture(options = {}, rect = { left: 10, top: 20, width: 144, height: 144 }) {
  const listeners = new Map(), captures = new Set();
  let writes = 0, transform = '', boundsReads = 0, releaseCount = 0;
  const thumb = { style: {} };
  Object.defineProperty(thumb.style, 'transform', {
    get: () => transform,
    set: value => { writes++; transform = value; },
  });
  const element = {
    style: { touchAction: 'pan-y' },
    querySelector(selector) { assert.equal(selector, '[data-stick-thumb]'); return thumb; },
    getBoundingClientRect() { boundsReads++; return rect; },
    addEventListener(type, fn, settings) { assert.equal(settings.passive, false); listeners.set(type, fn); },
    removeEventListener(type, fn) { assert.equal(listeners.get(type), fn); listeners.delete(type); },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { releaseCount++; captures.delete(id); emit('lostpointercapture', { pointerId: id }); },
  };
  function emit(type, values = {}) {
    const event = { pointerId: 1, button: 0, pointerType: 'touch', clientX: 82, clientY: 92, prevented: false,
      preventDefault() { this.prevented = true; }, ...values };
    listeners.get(type)?.(event);
    return event;
  }
  const joystick = createTouchJoystick(element, options);
  return { joystick, element, thumb, emit, captures, rect, listeners,
    get writes() { return writes; }, get boundsReads() { return boundsReads; }, get releaseCount() { return releaseCount; } };
}

const idle = { x: 0, y: 0, active: false };
function near(actual, expected, message) { assert(Math.abs(actual - expected) < 1e-12, message ?? `${actual} ≈ ${expected}`); }
function neutral(f) { assert.deepEqual(f.joystick.snapshot(), idle); }

const left = fixture(), right = fixture();
neutral(left);
assert.equal(left.element.style.touchAction, 'none');
assert(left.emit('pointerdown').prevented);
assert(left.captures.has(1));
assert.deepEqual(left.joystick.snapshot(), { x: 0, y: 0, active: true });
assert(right.emit('pointerdown', { pointerId: 2, isPrimary: false }).prevented, 'a second touch can own the independent right stick');
left.emit('pointermove', { clientX: 132 });
right.emit('pointermove', { pointerId: 2, clientY: 42 });
assert.deepEqual(left.joystick.snapshot(), { x: 1, y: 0, active: true });
assert.deepEqual(right.joystick.snapshot(), { x: 0, y: -1, active: true });
left.emit('pointerdown', { pointerId: 3 });
for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) left.emit(type, { pointerId: 3 });
assert.deepEqual(left.joystick.snapshot(), { x: 1, y: 0, active: true }, 'other pointers cannot move or cancel the owner');
assert.equal(left.boundsReads, 1, 'geometry is fixed for a gesture');
left.rect.left = 1000;
left.emit('pointermove', { clientX: 107, clientY: 92 });
near(left.joystick.snapshot().x, (.5 - .12) / .88);
left.emit('pointerup');
neutral(left);
assert.equal(left.releaseCount, 1);
assert.equal(right.joystick.snapshot().active, true, 'releasing left leaves right held');
right.emit('pointercancel', { pointerId: 2 });
neutral(right);

const radial = fixture();
radial.emit('pointerdown');
radial.emit('pointermove', { clientX: 85, clientY: 96 });
assert.deepEqual(radial.joystick.snapshot(), { x: 0, y: 0, active: true }, 'radial dead-zone ignores a 5px diagonal');
assert.equal(radial.thumb.style.transform, 'translate(-50%, -50%) translate(3px, 4px)', 'thumb follows real pixel displacement inside dead-zone');
radial.emit('pointermove', { clientX: 97, clientY: 112 });
const half = radial.joystick.snapshot();
near(half.x, .6 * (.5 - .12) / .88);
near(half.y, .8 * (.5 - .12) / .88);
radial.emit('pointermove', { clientX: 382, clientY: 492 });
const full = radial.joystick.snapshot();
near(full.x, .6); near(full.y, .8);
assert(Math.hypot(full.x, full.y) <= 1);
assert.equal(radial.thumb.style.transform, 'translate(-50%, -50%) translate(30px, 40px)');
const painted = radial.writes;
for (let i = 0; i < 100; i++) radial.emit('pointermove', { clientX: 382, clientY: 492 });
assert.equal(radial.writes, painted, 'identical samples do not repaint');
const detached = radial.joystick.snapshot();
detached.x = 99;
near(radial.joystick.snapshot().x, .6, 'snapshots do not expose mutable state');
radial.captures.delete(1);
radial.emit('lostpointercapture');
neutral(radial);
radial.emit('pointerdown');
radial.emit('pointermove', { clientX: 79, clientY: 88 });
assert.deepEqual(radial.joystick.snapshot(), { x: 0, y: 0, active: true }, 'negative dead-zone samples also return positive zero');
for (let dx = -100; dx <= 100; dx += 3) for (let dy = -100; dy <= 100; dy += 3) {
  radial.emit('pointermove', { clientX: 82 + dx, clientY: 92 + dy });
  const value = radial.joystick.snapshot();
  assert(Math.hypot(value.x, value.y) <= 1, 'diagonal output never exceeds unit magnitude through rounding');
}

let enabled = false;
const guarded = fixture({ enabled: () => enabled });
guarded.emit('pointerdown'); neutral(guarded);
enabled = true;
guarded.emit('pointerdown', { button: 2, pointerType: 'mouse' }); neutral(guarded);
guarded.emit('pointerdown', { clientX: 132 });
enabled = false;
guarded.emit('pointermove', { clientX: 130 }); neutral(guarded);
assert.equal(guarded.captures.size, 0, 'pausing during drag releases capture');
enabled = true;
guarded.emit('pointerdown', { clientX: 132 });
guarded.joystick.clear(); neutral(guarded);
assert.equal(guarded.captures.size, 0);
const clearWrites = guarded.writes;
guarded.joystick.clear();
assert.equal(guarded.writes, clearWrites);
guarded.emit('pointerdown', { clientY: 42 });
guarded.joystick.dispose(); neutral(guarded);
assert.equal(guarded.listeners.size, 0);
assert.equal(guarded.captures.size, 0);
assert.equal(guarded.element.style.touchAction, 'pan-y');
guarded.joystick.dispose();
guarded.emit('pointerdown'); neutral(guarded);

for (const rect of [
  { left: 0, top: 0, width: 0, height: 0 },
  { left: 0, top: 0, width: 44, height: 44 },
  { left: NaN, top: 0, width: 144, height: 144 },
  { left: 0, top: 0, width: Infinity, height: 144 },
]) {
  const invalid = fixture({}, rect);
  invalid.emit('pointerdown'); neutral(invalid);
  assert.equal(invalid.captures.size, 0);
}
for (const values of [{ clientX: NaN }, { clientY: Infinity }, { clientX: -Number.MAX_VALUE, clientY: Number.MAX_VALUE }]) {
  const invalid = fixture();
  invalid.emit('pointerdown');
  invalid.emit('pointermove', values);
  const snapshot = invalid.joystick.snapshot();
  assert(Number.isFinite(snapshot.x) && Number.isFinite(snapshot.y));
  assert(Math.hypot(snapshot.x, snapshot.y) <= 1);
}
const captureFailure = fixture();
captureFailure.element.setPointerCapture = () => { throw new Error('Pointer already ended'); };
captureFailure.emit('pointerdown'); neutral(captureFailure);
const noZone = fixture({ deadZone: 0 });
noZone.emit('pointerdown', { clientX: 107 });
near(noZone.joystick.snapshot().x, .5);
console.log('Capital Drive touch joystick regression passed');
