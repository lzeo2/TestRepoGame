// CPU fixture: real Three/controller/loop, fake input and RAF. No renderer/native acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { createFreeCamera } from '../Games/Citisten3D/camera.mjs';
import { createNativeLoop } from '../Games/Citisten3D/native-loop.mjs';
import { createLandscape } from '../Games/Citisten3D/terrain.mjs';

const prior = { window: globalThis.window, HTMLElement: globalThis.HTMLElement };
globalThis.HTMLElement = class { constructor(tagName = 'CANVAS') { this.tagName = tagName; } };
const land = createLandscape(new THREE.Scene(), 1000);
const dts = [0, 1 / 120, 1 / 60, .1, .25];
const pose = { x: 5, y: 215, z: 180, yaw: .4, pitch: -.72 };
const maxDelta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
function event(target, name, fields = {}) {
  const e = new Event(name, { cancelable: true });
  for (const [key, value] of Object.entries({ target: new HTMLElement(), ...fields })) Object.defineProperty(e, key, { value });
  target.dispatchEvent(e);
}
function fixture() {
  const window = globalThis.window = new EventTarget(), canvas = new EventTarget();
  const captured = new Set();
  canvas.clientHeight = 900;
  canvas.setPointerCapture = id => captured.add(id);
  const camera = new THREE.PerspectiveCamera(60, 1440 / 900, .5, 5000);
  const controls = createFreeCamera(camera, canvas, land.edge - 2, land.floorHeight);
  function snapshot() {
    camera.updateMatrixWorld(true);
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      world: [...camera.matrixWorld.elements], view: [...camera.matrixWorldInverse.elements],
      projection: [...camera.projectionMatrix.elements] };
  }
  function step(dt) {
    controls.update(dt);
    const s = snapshot();
    assert(Object.values(s).flat().every(Number.isFinite));
    assert(camera.position.y >= land.floorHeight(camera.position.x, camera.position.z, 1) + 2 - 1e-9);
    return s;
  }
  return { window, canvas, camera, controls, snapshot, step, captured };
}
function measure(samples) {
  const result = { samples: samples.length, maxDelta: {}, reversals: 0 };
  for (const key of Object.keys(samples[0])) result.maxDelta[key] = Math.max(0, ...samples.slice(1).map((s, i) => maxDelta(s[key], samples[i][key])));
  for (let axis = 0; axis < 3; axis++) {
    let sign = 0;
    for (let i = 1; i < samples.length; i++) {
      const v = samples[i].position[axis] - samples[i - 1].position[axis];
      if (Math.abs(v) <= 1e-10) continue;
      if (sign && Math.sign(v) !== sign) result.reversals++;
      sign = Math.sign(v);
    }
  }
  result.digest = createHash('sha256').update(JSON.stringify(samples)).digest('hex');
  return result;
}
const reports = [];
try {
  // Every requested dt alone, then alternating. Snapped no-input poses must not move.
  for (const sequence of [...dts.map(dt => [dt]), dts]) {
    const f = fixture(); f.controls.setPose(pose, true);
    const samples = [f.snapshot()];
    for (let i = 0; i < 600; i++) samples.push(f.step(sequence[i % sequence.length]));
    const m = measure(samples);
    assert(Object.values(m.maxDelta).every(v => v <= 1e-12), 'snapped idle matrices remain fixed');
    assert.equal(m.reversals, 0);
    reports.push({ case: `snap ${sequence.join(',')}`, ...m, before: samples[0], after: samples.at(-1) }); f.controls.dispose();
  }
  for (const sequence of [[1 / 60], dts]) {
    const f = fixture(); f.controls.setPose(pose, true);
    const destination = { x: 85, y: 90, z: 40, yaw: .9, pitch: -.4 };
    f.controls.setPose(destination);
    const samples = [f.snapshot()]; let previous = Infinity, previousAngle = Infinity;
    const destinationQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(destination.pitch, destination.yaw, 0, 'YXZ'));
    for (let i = 0; i < 900; i++) {
      samples.push(f.step(sequence[i % sequence.length]));
      const error = f.camera.position.distanceTo(new THREE.Vector3(destination.x, destination.y, destination.z));
      assert(error <= previous + 1e-12, 'unsnapped settling never reverses position error'); previous = error;
      const angle = f.camera.quaternion.angleTo(destinationQuaternion);
      assert(angle <= previousAngle + 1e-7, 'quaternion angular error settles, allowing acos roundoff'); previousAngle = angle;
    }
    assert(previous < 1e-10); assert(previousAngle < 1e-7);
    const m = measure(samples); assert.equal(m.reversals, 0);
    reports.push({ case: `settle ${sequence.join(',')}`, finalPositionError: previous, finalAngularError: previousAngle,
      ...m, before: samples[0], after: samples.at(-1) }); f.controls.dispose();
  }
  // Constructor has a one-time pitch assignment even at dt=0, not a periodic shake.
  {
    const f = fixture(), before = f.snapshot(), after = f.step(0);
    assert(maxDelta(before.world, after.world) > .1);
    assert.deepEqual(after, f.step(0));
    reports.push({ case: 'constructor first dt0', delta: measure([before, after]).maxDelta, after: { position: after.position, quaternion: after.quaternion } });
    f.controls.dispose();
  }
  // Explicit fake DOM hierarchy: standard capture -> target -> bubble, not browser proof.
  {
    class Node extends HTMLElement {
      constructor(tag, parent = null) { super(tag); this.parent = parent; this.listeners = []; }
      addEventListener(name, fn, options) { this.listeners.push({ name, fn, capture: options === true || !!options?.capture }); }
      removeEventListener(name, fn, options) {
        const capture = options === true || !!options?.capture;
        this.listeners = this.listeners.filter(l => l.name !== name || l.fn !== fn || l.capture !== capture);
      }
      dispatch(name, code) {
        const path = []; for (let node = this; node; node = node.parent) path.push(node);
        const e = { target: this, code, defaultPrevented: false, stopped: false,
          preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
        for (const [nodes, capture] of [[path.toReversed(), true], [path, false]]) {
          for (const node of nodes) {
            for (const l of node.listeners) if (l.name === name && l.capture === capture) l.fn(e);
            if (e.stopped) return e;
          }
        }
        return e;
      }
    }
    const window = globalThis.window = new Node('WINDOW'), document = new Node('DOCUMENT', window);
    const canvas = new Node('CANVAS', document), panel = new Node('SECTION', document), input = new Node('INPUT', panel);
    const camera = new THREE.PerspectiveCamera(60, 2, .5, 5000), controls = createFreeCamera(camera, canvas);
    panel.addEventListener('keyup', e => e.stopPropagation());
    controls.setPose(pose, true);
    canvas.dispatch('keydown', 'KeyW'); const before = controls.target; controls.update(1 / 60);
    assert.notDeepEqual(controls.target, before, 'canvas keydown reaches real controller');
    const release = input.dispatch('keyup', 'KeyW'), stopped = controls.target;
    for (let i = 0; i < 180; i++) controls.update(1 / 60);
    assert.deepEqual(controls.target, stopped, 'stopped editable keyup clears held camera key in capture');
    assert.equal(release.defaultPrevented, false, 'camera does not cancel editable keyup');
    input.dispatch('keydown', 'KeyW'); controls.update(1 / 60);
    assert.deepEqual(controls.target, stopped, 'editable keydown remains ignored');
    assert.equal(window.listeners.filter(l => l.name === 'keyup' && l.capture).length, 1);
    controls.dispose(); assert.equal(window.listeners.length, 0, 'dispose removes capture listener with matching options');
    assert.equal(canvas.listeners.length, 0);
    reports.push({ case: 'stopped keyup fake capture/bubble hierarchy', targetDrift: 0, captureListenerDisposed: true });
  }
  function inputReplay() {
    const f = fixture(); f.controls.setPose(pose, true); const samples = [f.snapshot()];
    const run = n => { for (let i = 0; i < n; i++) samples.push(f.step(dts[i % dts.length])); };
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
      const before = f.controls.target;
      event(f.window, 'keydown', { code }); run(30); event(f.window, 'keyup', { code });
      assert.notDeepEqual(f.controls.target, before, `${code} moves target`); run(180);
    }
    const stopped = f.controls.target;
    event(f.window, 'keydown', { code: 'KeyW', target: new HTMLElement('INPUT') }); run(10);
    assert.deepEqual(f.controls.target, stopped, 'editable keydown ignored');
    event(f.window, 'keydown', { code: 'KeyW' }); run(10);
    event(f.window, 'keyup', { code: 'KeyW', target: new HTMLElement('INPUT') });
    const releasedOverEditable = f.controls.target; run(180);
    assert.deepEqual(f.controls.target, releasedOverEditable, 'delivered editable keyup clears a previously held key');
    event(f.window, 'keydown', { code: 'KeyW' }); run(10); event(f.window, 'blur');
    const blurred = f.controls.target; run(180); assert.deepEqual(f.controls.target, blurred, 'blur clears held key');
    event(f.canvas, 'pointerdown', { button: 2, pointerId: 7, clientX: 10, clientY: 10 });
    assert(f.captured.has(7));
    event(f.canvas, 'pointermove', { pointerId: 7, clientX: 70, clientY: 30 }); run(30);
    event(f.canvas, 'pointercancel', { pointerId: 7 }); const cancelled = f.controls.target;
    event(f.canvas, 'pointermove', { pointerId: 7, clientX: 1000, clientY: 900 }); run(180);
    assert.deepEqual(f.controls.target, cancelled, 'pointercancel stops look');
    for (const name of ['pointerup', 'lostpointercapture', 'blur']) {
      event(f.canvas, 'pointerdown', { button: 2, pointerId: 8, clientX: 0, clientY: 0 });
      event(name === 'blur' ? f.window : f.canvas, name, { pointerId: 8 });
      const p = f.controls.target;
      event(f.canvas, 'pointermove', { pointerId: 8, clientX: 200, clientY: 200 });
      assert.deepEqual(f.controls.target, p);
    }
    for (const deltaMode of [0, 1, 2]) {
      event(f.canvas, 'wheel', { deltaY: -3, deltaMode }); run(90);
      event(f.canvas, 'wheel', { deltaY: 3, deltaMode }); run(90);
    }
    // Mirrors world.render's projection resize, without calling world/render/GPU.
    for (const aspect of [390 / 844, 1440 / 900, 390 / 844]) {
      f.camera.aspect = aspect; f.camera.updateProjectionMatrix(); samples.push(f.snapshot()); run(30);
    }
    run(600); const tail = samples.slice(-120), m = measure(tail);
    assert(Object.values(m.maxDelta).every(v => v <= 1e-10), 'input settles back to fixed matrices');
    const result = { samples, before: samples[0], after: samples.at(-1), tail: m };
    f.controls.dispose(); return result;
  }
  const first = inputReplay(), second = inputReplay();
  assert.deepEqual(first, second, 'same input/dt sequence is exactly reproducible');
  reports.push({ case: 'W A S D keyup editable blur look cancel wheel resize twice', ...measure(first.samples), tail: first.tail,
    before: first.before, after: first.after });
  // Continuous pointer yaw crosses pi without wrapping the interpolator backwards.
  {
    const f = fixture(); f.controls.setPose({ ...pose, yaw: Math.PI - .01 }, true);
    event(f.canvas, 'pointerdown', { button: 2, pointerId: 9, clientX: 0, clientY: 0 });
    event(f.canvas, 'pointermove', { pointerId: 9, clientX: -20, clientY: 0 });
    event(f.canvas, 'pointerup', { pointerId: 9 });
    const samples = [f.snapshot()]; let error = Infinity;
    for (let i = 0; i < 600; i++) {
      samples.push(f.step(dts[i % dts.length]));
      const next = Math.abs(f.controls.target.yaw - f.camera.rotation.y);
      assert(next <= error + 1e-12, 'yaw crossing pi settles monotonically'); error = next;
    }
    assert(error < 1e-12);
    reports.push({ case: 'pointer yaw crosses pi', ...measure(samples), finalYawError: error });
    const target = f.controls.target, version = f.controls.inputVersion;
    f.controls.dispose();
    event(f.window, 'keydown', { code: 'KeyW' }); event(f.canvas, 'wheel', { deltaY: 100 });
    event(f.canvas, 'pointermove', { pointerId: 9, clientX: 500, clientY: 500 });
    assert.deepEqual(f.controls.target, target); assert.equal(f.controls.inputVersion, version, 'dispose removes input listeners');
  }
  // Actual landscape clearance, snap and easing near a narrow rendered feature.
  {
    const f = fixture(), obstacle = land.features[0];
    f.controls.setPose({ x: obstacle.x - obstacle.w / 2 - 3, y: 2, z: obstacle.z, yaw: 0, pitch: -.4 }, true);
    f.controls.setPose({ x: obstacle.x, y: 2, z: obstacle.z });
    const samples = [f.snapshot()];
    for (let i = 0; i < 600; i++) samples.push(f.step(dts[i % dts.length]));
    reports.push({ case: 'actual near-floor feature', ...measure(samples), tail: measure(samples.slice(-120)),
      clearance: f.camera.position.y - land.floorHeight(f.camera.position.x, f.camera.position.z, 1) });
    f.controls.dispose();
  }
  // Real scheduler + real controller. This is a CPU callback fixture, not native bootstrap.
  {
    const f = fixture(), frames = new Map(), samples = [], deltas = [];
    let id = 0, now = 0, hidden = false, busy = false, inFlightWake = false, stopInFlight = false, fail = false;
    const error = new Error('fixture update');
    const loop = createNativeLoop({ requestFrame(fn) { frames.set(++id, fn); return id; },
      cancelFrame(id) { frames.delete(id); }, isHidden: () => hidden,
      update(dt) {
        deltas.push(dt);
        if (inFlightWake) { loop.wake(); loop.wake(); assert.equal(frames.size, 0); }
        if (stopInFlight) loop.stop();
        if (fail) throw error;
        samples.push(f.step(Math.min(.25, dt))); return busy;
      } });
    function step(ms) {
      now += ms; assert.equal(frames.size, 1); const [key, fn] = frames.entries().next().value;
      frames.delete(key); fn(now); assert(frames.size <= 1, 'one pending owner');
    }
    f.controls.setPose(pose, true);
    hidden = true; loop.wake(); assert.equal(frames.size, 0);
    hidden = false; loop.wake(); loop.wake(); step(0); step(1000); step(1000); assert.equal(frames.size, 0);
    loop.wake(); step(5000); assert.equal(deltas.at(-1), 0);
    busy = true; inFlightWake = true; step(5000); assert.equal(deltas.at(-1), 5, 'full simulation delta not render-clamped');
    for (let i = 0; i < 60; i++) { loop.wake(); loop.wake(); step(dts[i % dts.length] * 1000); }
    hidden = true; loop.suspend(); loop.wake(); assert.equal(frames.size, 0);
    hidden = false; loop.wake(); step(50000); assert.equal(deltas.at(-1), 0);
    hidden = true; const count = samples.length; step(1000); assert.equal(samples.length, count);
    hidden = false; fail = true; loop.wake(); assert.throws(() => step(1000), e => e === error); assert.equal(frames.size, 0);
    fail = false; loop.wake(); step(1000); assert.equal(deltas.at(-1), 0);
    stopInFlight = true; step(16); loop.wake(); assert.equal(frames.size, 0);
    const m = measure(samples); assert(Object.values(m.maxDelta).every(v => v <= 1e-12));
    reports.push({ case: 'actual loop pending/inflight wakes pause sleep hidden skip error stop', ...m, deltas });
    f.controls.dispose();
  }
  console.log(JSON.stringify(reports, null, 2));
  console.log('CAMERA STABILITY PASS: real Three world/view/projection matrices; CPU fixture only; no shaking root cause reproduced');
} finally {
  land.dispose();
  for (const [key, value] of Object.entries(prior)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
}
