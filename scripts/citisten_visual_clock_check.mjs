// node --experimental-vm-modules scripts/citisten_visual_clock_check.mjs
// CPU fixture: actual native/UI/tick/scheduler/sim; fake DOM/world/render/RAF.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { createDayNight, phaseForState } from '../Games/Citisten3D/daynight.mjs';
import { runContinueScenario } from '../Games/Citisten3D/continue-loop-check.mjs';

const native = await readFile(new URL('../Games/Citisten3D/native.mjs', import.meta.url), 'utf8');
for (const marker of [
  'if (!paused) sim.update(dt);',
  'world.dayNight.approach(phaseForState(sim.state), Math.min(.25, dt));',
  "return Boolean((sim && !paused && sim.state.speed > 0 && sim.state.phase !== 'lost') || shots || moving);",
  "onRestart: start", 'start(mode, snapshot, snapshot ? undefined : options);'
]) assert.equal(native.split(marker).length, 2, `current native source anchor: ${marker}`);
const startSource = native.slice(native.indexOf('function start('), native.indexOf('function pause('));
assert(!/dayNight\.(setPhase|approach)\(/.test(startSource), 'new town/restart/Continue do not reset visual phase');
const circularDistance = (a, b) => Math.abs(THREE.MathUtils.euclideanModulo(a - b + .5, 1) - .5);
const near = (a, b, message) => assert(Math.abs(a - b) < 1e-9, `${message}: ${a} != ${b}`);
const results = [];
let mounted = 0;
await runContinueScenario({ onMounted(page) {
  const world = page.window.citisten.world, scene = new THREE.Scene();
  const clock = createDayNight(scene);
  // Replace the existing approach stub explicitly with the REAL clock. Preserve
  // the old fixture's light-dt receipts and all original Continue assertions.
  const approach = clock.approach;
  clock.approach = (phase, dt) => { page.lights.push(dt); return approach(phase, dt); };
  world.dayNight = clock;
  const pageIndex = mounted++;
  page.window.addEventListener('pagehide', () => clock.dispose(), { once: true });
  if (pageIndex) return; // Fresh-page original Continue checks remain untouched.
  // Existing fixture never enters combat; its canvas double lacks these two
  // minimap methods. Extend ONLY this fixture, not the original gate/module.
  const mapCanvas = page.root.querySelector('.city-map canvas'), getContext = mapCanvas.getContext;
  mapCanvas.getContext = (...args) => Object.assign(getContext.apply(mapCanvas, args), { arc() {}, fill() {} });

  // Real Three CPU matrices for a fixed fixture camera/object, NOT game pixels.
  const camera = new THREE.PerspectiveCamera(50, 1.6, .5, 5000);
  camera.position.set(0, 100, 100); world.camera = camera;
  const landmark = new THREE.Object3D(); landmark.position.set(10, 0, 20); scene.add(landmark);
  function matrices() {
    camera.updateMatrixWorld(true); landmark.updateMatrixWorld(true);
    return JSON.stringify([camera.matrixWorld.elements, camera.matrixWorldInverse.elements,
      camera.projectionMatrix.elements, landmark.matrixWorld.elements]);
  }
  const snapshot = () => JSON.stringify(page.inspect().sim.snapshot());
  const saved = () => page.context.localStorage.getItem('citisten-save-v1');
  const light = () => ({ phase: clock.phase, daylight: clock.daylight,
    sun: clock.lights.sun.intensity, moon: clock.lights.moon.intensity,
    environment: scene.environmentIntensity, background: scene.background.toArray() });
  let wall = 100000;
  function wake() { page.window.dispatchEvent(page.event('click', page.node('#feedback'))); }
  function resetTimestamp() { page.visibility(true); page.visibility(false); }
  function drain(hz, { freeze = true, maxSeconds = 10 } = {}) {
    const start = wall, phaseBefore = clock.phase; let count = 0;
    page.step(start); // Actual scheduler wake always has dt0.
    near(clock.phase, phaseBefore, 'first wake callback contributes zero visual delta');
    const before = snapshot(), bytes = saved(), fixed = matrices();
    while (page.frames.size) {
      assert(++count <= hz * maxSeconds, 'bounded dense native scheduling');
      wall = start + count * 1000 / hz; page.step(wall);
      if (freeze) { assert.equal(snapshot(), before); assert.equal(saved(), bytes); assert.equal(matrices(), fixed); }
    }
    return { positiveDtCallbacks: count, elapsedMs: wall - start };
  }
  function framesFor(seconds, hz = 60) {
    const start = wall; page.step(start);
    for (let i = 1; i <= seconds * hz; i++) { wall = start + i * 1000 / hz; page.step(wall); }
  }

  for (const hz of [60, 120]) {
    // First .5 is the real constructor default. Second is an explicit CPU setup,
    // not physical native input or a game-state acceptance grant.
    if (hz === 120) clock.setPhase(.5);
    page.action({ mode: 'defense' }); page.speed(0); resetTimestamp();
    near(phaseForState(page.inspect().sim.state), .27, 'new defense target');
    const first = drain(hz), stranded = light();
    assert.equal(first.positiveDtCallbacks, 2 * hz);
    near(stranded.phase, .34, 'two dense seconds move only .16');
    near(circularDistance(stranded.phase, .27), .07, 'unsettled at scheduler sleep');
    const frozen = snapshot(), bytes = saved(), fixed = matrices();
    // No callbacks while asleep: clock stays stranded even as fixture wall moves.
    wall += 10000; assert.equal(page.frames.size, 0); assert.deepEqual(light(), stranded);
    wake(); const second = drain(hz), settled = light();
    near(clock.phase, .27, 'ordinary capture input wake finishes remaining clock');
    assert.notDeepEqual(settled.background, stranded.background);
    assert.equal(snapshot(), frozen); assert.equal(saved(), bytes); assert.equal(matrices(), fixed);
    results.push({ case: `new-defense-speed0-${hz}Hz`, first, stranded, second, settled });
  }

  // Natural production simulation reaches night. The sparse 24s setup is NOT
  // the reproduction interval: all measured idle/wake intervals below are 60Hz.
  clock.setPhase(.5); page.action({ mode: 'defense' }); page.speed(10); resetTimestamp();
  page.step(wall); wall += 24000; page.step(wall);
  assert.equal(page.inspect().sim.state.phase, 'night');
  page.speed(0); page.action({ action: 'menu' }); page.click(page.buttonById('save-town'));
  const nightBytes = saved(), beforeContinue = clock.phase;
  page.click(page.buttonById('continue-town'));
  assert.equal(page.inspect().paused, false); assert.equal(page.inspect().sim.state.speed, 0);
  near(clock.phase, beforeContinue, 'ordinary Continue preserves old world clock');
  resetTimestamp(); const nightFirst = drain(60), nightStranded = light();
  assert(circularDistance(clock.phase, 0) > .3, 'loaded night remains far from night illumination');
  const nightSnapshot = snapshot(), nightMatrices = matrices();
  wake(); const nightSecond = drain(60), nightAfterWake = light();
  assert.notEqual(nightAfterWake.daylight, nightStranded.daylight, 'wake changes whole-scene light inputs');
  assert.equal(snapshot(), nightSnapshot); assert.equal(saved(), nightBytes); assert.equal(matrices(), nightMatrices);
  results.push({ case: 'natural-night-save-Continue-speed0-60Hz', nightFirst, nightStranded, nightSecond, nightAfterWake });

  // Same target and fixed simulation, but private menu pause also approaches.
  page.action({ action: 'menu' }); resetTimestamp();
  const menuBefore = clock.phase; drain(60);
  assert.notEqual(clock.phase, menuBefore, 'private pause does not intentionally freeze visual clock');

  // Ordinary restart/new-mode handlers preserve the same clock object and phase.
  const priorPhase = clock.phase;
  page.action({ action: 'restart' });
  assert.equal(world.dayNight, clock); near(clock.phase, priorPhase, 'restart does not reset phase');
  page.action({ mode: 'free' });
  near(clock.phase, priorPhase, 'new mode does not reset phase');

  // Actual tick busy controls: running simulation, pending shots, camera motion.
  resetTimestamp(); const runningTime = page.inspect().sim.state.time;
  framesFor(3); assert.equal(page.frames.size, 1); assert(page.inspect().sim.state.time > runningTime);
  page.speed(0); world.effects.active = true; resetTimestamp();
  framesFor(3); assert.equal(page.frames.size, 1, 'shots retain callback ownership');
  world.effects.active = false; drain(60);
  const render = world.render;
  world.render = dt => { render(dt); camera.position.x += .01; };
  wake(); framesFor(3); assert.equal(page.frames.size, 1, 'camera movement retains callback ownership');
  world.render = render; drain(60);
  results.push({ case: 'actual-tick-busy-controls', runningSimulation: true, shots: true, movingCamera: true });

  // Counterfactual scheduling predicate ONLY, not a rewritten production tick:
  // retain callbacks while cyclic phase residual exceeds epsilon. Actual native
  // callback, clock and scheduler still execute; no extra RAF owner is created.
  clock.setPhase(.5); page.action({ mode: 'defense' }); page.speed(0); resetTimestamp();
  const realStep = page.step; let callbacks = 0;
  page.step(wall); const frozen = snapshot(), fixed = matrices();
  while (circularDistance(clock.phase, phaseForState(page.inspect().sim.state)) > 1e-9) {
    // A wake during a pending frame resets only the idle deadline, not last/dt.
    // This models the proposed busy criterion, not product input behavior.
    wake(); wall += 1000 / 60; realStep(wall); callbacks++;
    assert(callbacks < 400); assert.equal(snapshot(), frozen); assert.equal(matrices(), fixed);
  }
  near(clock.phase, .27, 'counterfactual residual-aware scheduling settles');
  assert(callbacks > 120); drain(60);
  results.push({ case: 'COUNTERFACTUAL-residual-aware-busy', callbacks, phase: clock.phase });

  // Restore fixture setup before original scenario. No original timestamps,
  // original assertions, 500ms/5s gates, or production source are changed.
  clock.setPhase(.5); resetTimestamp();
} });

// Cyclic clock controls, including the antipodal .5 tie and wrap across midnight.
const scene = new THREE.Scene(), clock = createDayNight(scene);
clock.setPhase(.98); clock.approach(.02, .5); near(clock.phase, .02, 'short wrap forward');
clock.setPhase(.02); clock.approach(.98, .5); near(clock.phase, .98, 'short wrap backward');
clock.setPhase(.5); clock.approach(0, .25); near(clock.phase, .48, 'antipodal .5 tie moves backward');
clock.dispose();
console.log(JSON.stringify({ scope: 'CPU only; fake DOM/world/render/RAF, real native tick/loop/sim/daynight; no pixels', results }, null, 2));
console.log('VISUAL CLOCK PASS: 60/120Hz stranded phase, ordinary wake lighting change with frozen snapshots/save/matrices; natural night Continue; private pause; restart/new mode persistence; 3 busy controls; circular wrap; labelled counterfactual; original Continue assertions intact');
console.log('LIMIT: source bug is NOT established as user shaking/artifact cause; native Water/Save/Continue, pixels and GPU remain UNPASSED');
