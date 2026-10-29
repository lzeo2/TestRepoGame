// node --experimental-vm-modules scripts/citisten_visual_clock_check.mjs
// Old-red/current-green CPU regression; fake DOM/world/render/RAF, actual native clock/loop/sim/save.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { createDayNight, phaseForState } from '../Games/Citisten3D/daynight.mjs';
import { runContinueScenario } from '../Games/Citisten3D/continue-loop-check.mjs';

const oldNative = execFileSync('git', ['show', '017e4a47e6235917ee21c46d221caa230855615f:Games/Citisten3D/native.mjs'], { encoding: 'utf8' });
const distance = (a, b) => Math.abs(THREE.MathUtils.euclideanModulo(a - b + .5, 1) - .5);
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-9, `${why}: ${a} != ${b}`);
const results = [];
for (const repaired of [false, true]) {
  let mounts = 0;
  await runContinueScenario({ nativeSource: repaired ? undefined : oldNative, onMounted(page) {
    if (mounts++) return;
    const world = page.window.citisten.world, originalClock = world.dayNight, scene = new THREE.Scene();
    const clock = createDayNight(scene), approach = clock.approach;
    clock.approach = (phase, dt) => { page.lights.push(dt); return approach(phase, dt); };
    world.dayNight = clock;
    page.window.addEventListener('pagehide', () => clock.dispose(), { once: true });
    const map = page.root.querySelector('.city-map canvas'), getContext = map.getContext;
    map.getContext = (...args) => Object.assign(getContext.apply(map, args), { arc() {}, fill() {} });
    const camera = new THREE.PerspectiveCamera(50, 1.6, .5, 5000);
    camera.position.set(0, 100, 100); world.camera = camera;
    const landmark = new THREE.Object3D(); landmark.position.set(10, 0, 20); scene.add(landmark);
    const snapshot = () => JSON.stringify(page.inspect().sim.snapshot());
    const saved = () => page.context.localStorage.getItem('citisten-save-v1');
    function matrices() {
      camera.updateMatrixWorld(true); landmark.updateMatrixWorld(true);
      return JSON.stringify([camera.matrixWorld.elements, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, landmark.matrixWorld.elements]);
    }
    const light = () => [clock.phase, clock.daylight, clock.lights.sun.intensity, clock.lights.moon.intensity, scene.environmentIntensity, ...scene.background.toArray()];
    let wall = 100000;
    const reset = () => { page.visibility(true); page.visibility(false); };
    const wake = () => page.window.dispatchEvent(page.event('click', page.node('#feedback')));
    function drain(hz) {
      const start = wall, phase = clock.phase; let callbacks = 0;
      page.step(start); near(clock.phase, phase, 'wake dt0');
      const state = snapshot(), bytes = saved(), fixed = matrices();
      while (page.frames.size) {
        assert(++callbacks <= hz * 10, 'finite settling then sleep');
        wall = start + callbacks * 1000 / hz; page.step(wall);
        assert.equal(snapshot(), state); assert.equal(saved(), bytes); assert.equal(matrices(), fixed);
      }
      return { callbacks, elapsedMs: wall - start, phase: clock.phase };
    }
    for (const hz of [60, 120]) {
      clock.setPhase(.5); // Explicit CPU visual setup, not a gameplay/pixel acceptance grant.
      page.action({ mode: 'defense' }); page.speed(0); reset();
      const first = drain(hz), beforeWake = light(), state = snapshot(), bytes = saved();
      near(phaseForState(page.inspect().sim.state), .27, 'defense target');
      if (repaired) {
        near(clock.phase, .27, 'clock settles before native sleeps');
        assert(first.callbacks > 2 * hz && first.elapsedMs < 5000);
      } else {
        near(clock.phase, .34, 'pinned old clock strands');
        assert.equal(first.callbacks, 2 * hz);
      }
      wall += 10000; assert.equal(page.frames.size, 0); assert.deepEqual(light(), beforeWake);
      wake(); const second = drain(hz), afterWake = light();
      if (repaired) afterWake.forEach((v, i) => near(v, beforeWake[i], 'unrelated wake does not change settled shading'));
      else assert.notDeepEqual(afterWake, beforeWake, 'pinned old unrelated wake changes shading');
      near(clock.phase, .27, 'eventual target'); assert.equal(snapshot(), state); assert.equal(saved(), bytes);
      results.push({ repaired, case: `defense-speed0-${hz}Hz`, first, second });
    }
    // Actual native 10x simulation reaches night, then normal pause/Save/Continue.
    // Sparse setup is not a frame-rate measurement; measured settling uses dense60Hz.
    clock.setPhase(.5); page.action({ mode: 'defense' }); page.speed(10); reset();
    page.step(wall); wall += 24000; page.step(wall); assert.equal(page.inspect().sim.state.phase, 'night');
    page.speed(0); page.action({ action: 'menu' }); page.click(page.buttonById('save-town'));
    const bytes = saved(), phase = clock.phase;
    page.click(page.buttonById('continue-town')); near(clock.phase, phase, 'Continue keeps interpolated clock');
    reset(); const first = drain(60), beforeWake = light(), state = snapshot();
    if (repaired) near(clock.phase, 0, 'paused restored night fully settles');
    else assert(distance(clock.phase, 0) > .3, 'old paused night remains stranded');
    wake(); const second = drain(60), afterWake = light();
    if (repaired) afterWake.forEach((v, i) => near(v, beforeWake[i], 'settled night stable across input'));
    else assert.notDeepEqual(afterWake, beforeWake);
    assert.equal(snapshot(), state); assert.equal(saved(), bytes);
    results.push({ repaired, case: 'night-save-Continue-speed0', first, second });

    // Private menu pause also settles without advancing gameplay or saved bytes.
    clock.setPhase(.5); page.action({ action: 'menu' }); reset(); drain(60);
    if (repaired) near(clock.phase, 0, 'private pause settles');
    const prior = clock.phase;
    page.action({ action: 'restart' }); assert.equal(world.dayNight, clock); near(clock.phase, prior, 'restart preserves visual clock identity');
    page.action({ mode: 'free' }); near(clock.phase, prior, 'new mode does not force snap');
    reset(); const startTime = page.inspect().sim.state.time, start = wall;
    page.step(start);
    for (let i = 1; i <= 180; i++) { wall = start + i * 1000 / 60; page.step(wall); }
    assert.equal(page.frames.size, 1); assert(page.inspect().sim.state.time > startTime, 'running sim still owns frames');
    page.speed(0); world.effects.active = true; reset();
    const shotStart = wall; page.step(wall);
    for (let i = 1; i <= 180; i++) { wall = shotStart + i * 1000 / 60; page.step(wall); }
    assert.equal(page.frames.size, 1, 'pending shots retain frames'); world.effects.active = false; drain(60);
    const render = world.render; world.render = dt => { render(dt); camera.position.x += .01; };
    wake(); const cameraStart = wall; page.step(wall);
    for (let i = 1; i <= 180; i++) { wall = cameraStart + i * 1000 / 60; page.step(wall); }
    assert.equal(page.frames.size, 1, 'camera motion retains frames'); world.render = render; drain(60);
    // Restore the original declared world double before the unchanged original
    // Continue scenario. Its sparse timestamps/assertions are NOT relaxed.
    world.dayNight = originalClock; reset();
  } });
}
const scene = new THREE.Scene(), clock = createDayNight(scene);
for (const [from, to] of [[.98, .02], [.02, .98], [.5, 0]]) {
  clock.setPhase(from);
  for (let i = 0; !clock.isSettled(to); i++) { assert(i < 800); clock.approach(to, 1 / 120); }
  near(distance(clock.phase, to), 0, 'shortest circular convergence');
}
clock.dispose();
console.log(JSON.stringify(results, null, 2));
console.log('VISUAL CLOCK REPAIR PASS: pinned old stranded lighting; current60/120Hz/night/private-pause convergence, stable unrelated wakes, unchanged snapshots/save/matrices, eventual sleep, running/shot/camera ownership; original Continue assertions retained');
console.log('LIMIT: CPU doubles, not actual pixels or proof of user shaking/artifact resolution; native Water/Save/Continue remains unpassed');
