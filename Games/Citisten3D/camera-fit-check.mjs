import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from './vendor/three.module.js';
import { initialTownPose, createFreeCamera } from './camera.mjs';
import { RoadGrid } from './roads.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { createSimulation } from './sim.mjs';

function cameraAt(pose, width, height) {
  const camera = new THREE.PerspectiveCamera(60, width / height, .5, 5000);
  camera.rotation.order = 'YXZ';
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, 0);
  camera.updateMatrixWorld();
  return camera;
}
function pixel(camera, point, width, height) {
  const p = new THREE.Vector3(point.x, point.y, point.z).project(camera);
  assert(p.z > -1 && p.z < 1, 'inside current Three frustum');
  return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
}
// Source-derived closed HUD bounds, NOT a DOM/pixel acceptance substitute:
// phone Map bottom = h-265; collapsed two-row builder starts near h-114.
// Desktop open Map starts at w-250; top HUD/native/events occupy the upper left.
const viewports = [[1280, 800], [390, 844]];
let fits = 0;
for (const size of Array.from({ length: 189 }, (_, i) => i + 12)) {
  for (const layout of ['river-v1', 'legacy-flat']) {
    const roads = new RoadGrid(size), terrain = createRiverTerrain(size, layout), mid = Math.floor(size / 2);
    const before = JSON.stringify(Array.from({ length: size }, (_, x) => [terrain.isWater(x, mid), terrain.isBank(x, mid), terrain.heightAt(x, mid)]));
    for (const [width, height] of viewports) {
      const pose = initialTownPose(roads, terrain, width, height);
      assert(Object.values(pose).every(Number.isFinite));
      assert(pose.y >= 2 && pose.y <= 400);
      const camera = cameraAt(pose, width, height), points = [];
      // Independently find truly dry endpoints, including the sloped bank, for seven rows.
      if (layout === 'river-v1') for (let z = mid - 3; z <= mid + 3; z++) {
        const channel = Array.from({ length: size }, (_, x) => x).filter(x => terrain.isWater(x, z) || terrain.isBank(x, z));
        const left = channel[0] - 1, right = channel.at(-1) + 1;
        assert(left >= 0 && right < size);
        assert.equal(terrain.heightAt(left, z), 0);
        assert.equal(terrain.heightAt(right, z), 0);
        for (let x = left; x <= right; x++) points.push(roads.center(x, z));
      }
      const hall = roads.center(mid, mid);
      for (const x of [-9, 9]) for (const z of [-7.5, 7.5]) for (const y of [0, 17]) points.push({ x: hall.x + x, y, z: hall.z + z });
      // A six-lot dry road with adjacent start space, outside the 3x3 hall footprint.
      for (let x = mid - 2; x <= mid + 3; x++) for (let z = mid + 2; z <= mid + 4; z++) {
        assert(!terrain.isWater(x, z) && !terrain.isBank(x, z));
        points.push(roads.center(x, z));
      }
      const projected = points.map(point => pixel(camera, point, width, height));
      for (const p of projected) {
        assert(p.x > width * .08 && p.x < width * .92, `${size}/${layout}: side margins`);
        if (width <= 600) assert(p.y > height - 253 && p.y < height - 126, `${size}/${layout}: below closed Map, above collapsed tools: ${p.y}`);
        else assert(p.y > height * .4 && p.y < height * .7 && p.x < width - 266, 'desktop city clear of top HUD, Map and tools');
      }
      if (size === 200 && layout === 'river-v1') console.log(`FIT ${width}x${height}: pose=${JSON.stringify(pose)}; content pixels x=${Math.min(...projected.map(p => p.x)).toFixed(1)}..${Math.max(...projected.map(p => p.x)).toFixed(1)}, y=${Math.min(...projected.map(p => p.y)).toFixed(1)}..${Math.max(...projected.map(p => p.y)).toFixed(1)}`);
      fits++;
    }
    assert.equal(JSON.stringify(Array.from({ length: size }, (_, x) => [terrain.isWater(x, mid), terrain.isBank(x, mid), terrain.heightAt(x, mid)])), before, 'camera does not mutate terrain');
    assert.equal(roads.cells.size, 0, 'camera does not place roads');
  }
}
const roads = new RoadGrid(200), terrain = createRiverTerrain(200);
const oldCamera = cameraAt({ x: -45, y: 215, z: 190, yaw: 0, pitch: -.72 }, 390, 844);
assert(pixel(oldCamera, roads.center(83, 100), 390, 844).x < 0, 'old western dry bank actually fails projection');

// Run F10's read-only composed plan unchanged, with real projection/picking.
// DOM hit-testing remains the browser worker's gate, not this HUD envelope.
const qa = readFileSync(new URL('./river-upgrade-qa.py', import.meta.url), 'utf8');
const compose = vm.runInNewContext(`(${qa.match(/COMPOSE = """([\s\S]*?)"""/)[1]})`);
for (const [width, height] of viewports) {
  const sim = createSimulation({ size: 200, mode: 'free', terrainLayout: 'river-v1', timedConstruction: true, progressionEnabled: true });
  const camera = cameraAt(initialTownPose(sim.roads, sim.terrain, width, height), width, height);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const layout = compose(sim, { roads: sim.roads }, lot => {
    const p = pixel(camera, sim.roads.center(lot.x, lot.z), width, height);
    ray.setFromCamera(new THREE.Vector2(p.x / width * 2 - 1, 1 - p.y / height * 2), camera);
    assert(ray.ray.intersectPlane(plane, hit));
    assert.deepEqual(sim.roads.worldToCell(hit.x, hit.z), { x: lot.x, z: lot.z });
    return p.x > 8 && p.x < width - (width <= 600 ? 8 : 266) &&
      (width <= 600 ? p.y > height - 253 && p.y < height - 126 : p.y > height * .4 && p.y < height * .7);
  });
  assert(layout, 'F10 composed crossing and city fit without any pad input');
  assert.equal(layout.a.z, 103, 'preferred near-hall row fits');
  assert.equal(sim.roads.cells.size, 0, 'planner remains read-only');
  console.log(`F10 PLAN ${width}x${height}: row ${layout.a.z}, lots ${layout.a.x}..${layout.extra.x}; projection/pick PASS, DOM hit-test unverified`);
}

// Exercise the actual native callback, not a second copy of pad math.
const native = readFileSync(new URL('./native.mjs', import.meta.url), 'utf8');
assert(native.includes('setPose(initialTownPose(world.roads, sim.terrain, canvas.clientWidth, canvas.clientHeight, world.camera.fov), true)'));
const callback = native.split("listen(document.querySelector('#camera-pad'), 'click', ")[1].split('\n    });')[0] + '}';
const active = native.match(/const active = .*;/)[0];
const oldWindow = globalThis.window, oldHTMLElement = globalThis.HTMLElement;
globalThis.window = new EventTarget(); globalThis.HTMLElement = class {};
const canvas = new EventTarget(), camera = new THREE.PerspectiveCamera();
const controls = createFreeCamera(camera, canvas, 1000, () => 12);
let wakes = 0;
const context = { world: { controls }, sim: { state: { speed: 0, phase: 'day' } }, paused: false, wake: () => wakes++ };
vm.runInNewContext('const setPose = world.controls.setPose; world.controls.setPose = (...args) => { setPose(...args); wake(); };', context);
const click = vm.runInNewContext(`${active}\n(${callback})`, context);
const press = action => click({ target: { closest: () => ({ dataset: { camera: action } }) } });
for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
  for (const [action, forward, right] of [['forward', 1, 0], ['back', -1, 0], ['left', 0, -1], ['right', 0, 1]]) {
    controls.setPose({ x: 0, y: 100, z: 0, yaw, pitch: -.5 }, true);
    const prior = wakes;
    press(action);
    assert(Math.abs(controls.target.x - (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * 20) < 1e-9);
    assert(Math.abs(controls.target.z - (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * 20) < 1e-9);
    assert.equal(wakes, prior + 1, 'speed-zero pad wakes native loop');
    assert.equal(camera.position.x, 0, 'pad preserves easing rather than snapping');
    controls.update(.1);
    assert(camera.position.distanceTo(new THREE.Vector3(0, 100, 0)) > 0, 'speed-zero camera eases');
  }
}
controls.setPose({ x: 0, y: 390, z: 0, yaw: 0, pitch: -.5 }, true);
press('up'); assert.equal(controls.target.y, 400);
for (let i = 0; i < 30; i++) press('down');
assert.equal(controls.target.y, 14, 'pad retains floor clearance');
press('turn'); assert.equal(controls.target.yaw, Math.PI / 8);
const held = controls.target, prior = wakes;
context.paused = true; press('forward'); assert.deepEqual(controls.target, held);
context.paused = false; context.sim.state.phase = 'lost'; press('forward'); assert.deepEqual(controls.target, held);
context.sim = null; press('forward'); assert.deepEqual(controls.target, held);
assert.equal(wakes, prior, 'inactive pad does not issue poses');
controls.dispose(); globalThis.window = oldWindow; globalThis.HTMLElement = oldHTMLElement;
console.log(`CAMERA FIT CHECK PASS: ${fits} current-Three projections, sizes 12..200, river/legacy, dry crossings/hall/start space; native speed-zero pad/headings/wakes/easing/floor/menu guards`);
