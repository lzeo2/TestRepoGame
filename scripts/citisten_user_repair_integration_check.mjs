// node --experimental-vm-modules scripts/citisten_user_repair_integration_check.mjs
// Real native/UI/sim/save with declared DOM/world/RAF doubles; no native pixels.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { initialTownPose } from '../Games/Citisten3D/camera.mjs';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { mount } from '../Games/Citisten3D/continue-loop-check.mjs';
import { createSimulation } from '../Games/Citisten3D/sim.mjs';
import { createRiverTerrain } from '../Games/Citisten3D/river-data.mjs';
import { RoadGrid } from '../Games/Citisten3D/roads.mjs';
import { createCityEventEffects } from '../Games/Citisten3D/city-event-effects.mjs';
import { SAVE_KEY } from '../Games/Citisten3D/persistence.mjs';

const mask = terrain => {
  let result = '';
  for (let z = 0; z < terrain.size; z++) for (let x = 0; x < terrain.size; x++) result += terrain.isWater(x, z) ? '1' : '0';
  return result;
};
const memory = new Map([['citisten-tutorial-seen', '1']]);
const page = await mount(memory), { node, action, click, buttonById, speed, inspect, window, frames } = page;
assert(!/<details class="city-map panel"[^>]*\bopen\b/.test(page.root.innerHTML), 'map is available on demand, not another initially expanded panel');
let confirms = 0, allow = true;
window.confirm = text => { confirms++; assert.match(text, /saved town/); return allow; };
const calls = [], setTerrain = window.citisten.world.setTerrain;
window.citisten.world.setTerrain = (...args) => { calls.push(args); return setTerrain(...args); };
const snapshot = () => JSON.stringify(inspect().sim.snapshot());
const close = p => { p.window.dispatchEvent(new Event('pagehide')); assert.equal(p.frames.size, 0); assert.deepEqual(p.errors, []); };

node('ui:#city-seed').value = '1'; action({ mode: 'free' });
assert.equal(confirms, 0, 'first empty-device town needs no destructive confirmation');
assert.equal(inspect().sim.state.terrainSeed, 1); assert.equal(calls.at(-1)[1], 1);
const first = inspect().sim, firstMask = mask(first.terrain);
speed(0); page.step(0); action({ action: 'menu' }); click(buttonById('save-town'));
const bytes = memory.get(SAVE_KEY), before = snapshot(), roads = first.roads.cells, modelsBefore = calls.length;
node('ui:#city-seed').value = '42';
assert.equal(inspect().sim, first); assert.equal(snapshot(), before); assert.equal(memory.get(SAVE_KEY), bytes, 'editing seed is not a world/save mutation');
allow = false; action({ mode: 'free' });
assert.equal(confirms, 1); assert.equal(inspect().sim, first); assert.equal(first.roads.cells, roads);
assert.equal(snapshot(), before); assert.equal(memory.get(SAVE_KEY), bytes); assert.equal(calls.length, modelsBefore);
assert.equal(page.root.querySelector('.city-menu').open, true, 'cancelled start retains menu');
action({ action: 'restart' }); assert.equal(inspect().sim, first); assert.equal(snapshot(), before); assert.equal(memory.get(SAVE_KEY), bytes);
allow = true; action({ mode: 'free' });
assert.equal(inspect().sim.state.terrainSeed, 42); assert.equal(calls.at(-1)[1], 42);
assert.notEqual(mask(inspect().sim.terrain), firstMask); assert.equal(memory.get(SAVE_KEY), bytes, 'accepted new town does not immediately overwrite old slot');
node('ui:#city-seed').value = 'not-a-seed'; action({ action: 'menu' });
const beforeContinueConfirms = confirms; click(buttonById('continue-town'));
assert.equal(confirms, beforeContinueConfirms, 'Continue bypasses new-town confirmation');
assert.equal(inspect().sim.state.terrainSeed, 1); assert.equal(mask(inspect().sim.terrain), firstMask);
assert.equal(calls.at(-1)[1], 1); assert.equal(memory.get(SAVE_KEY), bytes); assert.equal(snapshot(), JSON.stringify(JSON.parse(bytes)));
action({ action: 'menu' }); action({ action: 'restart' });
assert.equal(inspect().sim.state.terrainSeed, 1); assert.equal(mask(inspect().sim.terrain), firstMask);
assert.equal(memory.get(SAVE_KEY), bytes); assert(frames.size <= 1); close(page);
console.log('PASS native seed1/42 visible masks + renderer argument, input-only seed no mutation, cancel start/restart, invalid-seed Continue, restart same map, original save bytes');

// Legacy saved absence must win even over current seed input and native expansion defaults.
const legacy = createSimulation({ size: 200, mode: 'free', seed: 77, terrainLayout: 'legacy-flat' }).snapshot();
const legacyBytes = JSON.stringify(legacy), legacyMemory = new Map([['citisten-tutorial-seen', '1'], [SAVE_KEY, legacyBytes]]);
const oldPage = await mount(legacyMemory); let oldConfirms = 0;
oldPage.window.confirm = () => { oldConfirms++; return false; };
oldPage.node('ui:#city-seed').value = '42'; oldPage.action({ mode: 'free' });
assert.equal(oldConfirms, 1); assert.equal(oldPage.inspect().sim, undefined); assert.equal(legacyMemory.get(SAVE_KEY), legacyBytes);
oldPage.node('ui:#city-seed').value = 'invalid'; oldPage.click(oldPage.buttonById('continue-town'));
assert.equal(oldConfirms, 1); assert.equal(oldPage.inspect().sim.state.terrainLayout, 'legacy-flat');
assert(!Object.hasOwn(oldPage.inspect().sim.state, 'terrainSeed')); assert.equal(legacyMemory.get(SAVE_KEY), legacyBytes);
oldPage.window.confirm = () => true; oldPage.action({ action: 'menu' }); oldPage.action({ action: 'restart' });
assert.equal(oldPage.inspect().sim.state.terrainLayout, 'legacy-flat'); assert(!Object.hasOwn(oldPage.inspect().sim.state, 'terrainSeed'));
assert.equal(legacyMemory.get(SAVE_KEY), legacyBytes); close(oldPage);
console.log('PASS saved-only cancellation, legacy absence/flat map preserved by Continue/restart, no stored-slot rewrite');
const denied = await mount({ get() { throw new Error('Storage denied'); }, set() { throw new Error('Storage denied'); } });
denied.window.confirm = () => assert.fail('storage denial alone cannot gate first town');
denied.action({ mode: 'free' }); assert(denied.inspect().sim, 'first town still works without storage'); close(denied);
console.log('PASS storage-denied first town remains playable without destructive confirmation');

const names = await mount(new Map([['citisten-tutorial-seen', '1']]));
names.action({ mode: 'free' }); names.place('road', 102, 100); names.place('residential', 103, 100);
assert.match(names.node('#feedback').textContent, /^Residential: construction started \(4s\)/);
assert(!names.node('#feedback').textContent.includes('undefined'));
names.place('residential', 103, 100); assert.equal(names.node('#feedback').textContent, 'Choose an empty footprint');
names.action({ action: 'menu' }); const namedBefore = JSON.stringify(names.inspect().sim.snapshot()), namedSim = names.inspect().sim;
names.action({ mode: 'invalid-mode' });
assert.equal(names.inspect().sim, namedSim); assert.equal(JSON.stringify(namedSim.snapshot()), namedBefore, 'invalid mode fails before removing town roads/models');
assert.match(names.root.querySelector('.city-menu-error').textContent, /Unknown mode/); close(names);
console.log('PASS named native construction feedback and actual placement failure reason');

const scene = new THREE.Scene(), grid = new RoadGrid(200), effects = createCityEventEffects(scene, grid), matrix = new THREE.Matrix4();
const flood = scene.children.find(mesh => mesh.name === 'city-event-flood');
function floodY(terrain, x, z) {
  let y = terrain.heightAt(x, z);
  for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) y = Math.max(y, terrain.heightAt(x + dx, z + dz));
  return (terrain.isWater(x, z) ? Math.max(y, terrain.waterHeight) : y) + .035 + .5 * .12;
}
const a = createRiverTerrain(200, 'river-v1', 1), b = createRiverTerrain(200, 'river-v1', 42);
let tile;
for (let z = 0; z < 200 && !tile; z++) for (let x = 0; x < 200; x++) if (Math.abs(floodY(a, x, z) - floodY(b, x, z)) > .15) { tile = { x, z }; break; }
assert(tile, 'different course gives meaningful flood-elevation counterexample');
for (const seed of [1, 42, 0, undefined, 42]) {
  const terrain = createRiverTerrain(200, 'river-v1', seed);
  effects.sync({ terrainLayout: 'river-v1', terrainSeed: seed, time: 0, buildings: [], cityEvents: [], incidents: { active: [{ type: 'flood', remaining: 10, severity: .5, tiles: [tile] }] } });
  assert.equal(flood.count, 1); flood.getMatrixAt(0, matrix);
  assert(Math.abs(matrix.elements[13] - floodY(terrain, tile.x, tile.z)) < 1e-6, `flood follows authoritative seed ${seed}`);
}
effects.dispose();
console.log('PASS incident flood elevations follow1/42/0/legacy seed switches, no layout-only stale cache');
// Wider generated crossings must also fit when camera height reaches its cap.
const oldCameraSource = execFileSync('git', ['show', '017e4a47e6235917ee21c46d221caa230855615f:Games/Citisten3D/camera.mjs'], { encoding: 'utf8' });
const from = oldCameraSource.indexOf('export function initialTownPose'), to = oldCameraSource.indexOf('export function createFreeCamera');
assert(from >= 0 && to > from);
const oldInitialPose = vm.runInNewContext(`(${oldCameraSource.slice(from, to).replace('export ', '')})`);
function projectedPoints(size, seed, width, height, makePose) {
  const roads = new RoadGrid(size), terrain = createRiverTerrain(size, 'river-v1', seed), mid = Math.floor(size / 2);
  const pose = makePose(roads, terrain, width, height), camera = new THREE.PerspectiveCamera(60, width / height, .5, 5000), points = [];
  camera.rotation.order = 'YXZ'; camera.position.set(pose.x, pose.y, pose.z); camera.rotation.set(pose.pitch, pose.yaw, 0); camera.updateMatrixWorld();
  for (let z = mid - 3; z <= mid + 3; z++) {
    const channel = Array.from({ length: size }, (_, x) => x).filter(x => terrain.isWater(x, z) || terrain.isBank(x, z));
    for (const x of [channel[0] - 1, channel.at(-1) + 1, mid + 3]) points.push(roads.center(x, z));
  }
  const hall = roads.center(mid, mid);
  for (const x of [-9, 9]) for (const z of [-7.5, 7.5]) for (const y of [0, 17]) points.push({ x: hall.x + x, y, z: hall.z + z });
  return points.map(p => new THREE.Vector3(p.x, p.y || 0, p.z).project(camera));
}
const oldWide = projectedPoints(200, 4294967295, 390, 844, oldInitialPose);
assert(oldWide.some(p => Math.abs(p.x) >= .84), 'pinned old height cap loses intended8% side margin');
let framingCases = 0;
for (const size of [12, 30, 80, 200]) for (const seed of [0, 1, 2, 42, 4294967295, 0xdeadbeef]) for (const [width, height] of [[1367, 910], [1024, 768], [854, 569], [390, 844]]) {
  const points = projectedPoints(size, seed, width, height, initialTownPose);
  assert(points.every(p => Math.abs(p.x) < .84 && Math.abs(p.y) < 1 && p.z > -1 && p.z < 1), `${size}/${seed}/${width}: seeded crossing/hall fit`);
  framingCases++;
}
console.log(`PASS pinned old margin loss/current seeded framing ${framingCases} cases; height cap retained, no DOM occlusion claim`);
console.log('USER REPAIR INTEGRATION PASS: real native/sim/save/callback routes, incident matrices and seeded framing; CPU DOM/world/RAF doubles, no screenshot/native visual acceptance');
