import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { RoadGrid } from './roads.mjs';
import { createDayNight } from './daynight.mjs';
import { createRoadPool } from './world.mjs';
import { createWorldEffects } from './world-effects.mjs';
import { createGroundMaterial, createBlockAO, createWater } from './materials.mjs';

const grid = new RoadGrid(200);
assert.equal(grid.worldToCell(-1001, 0), null);
assert.deepEqual(grid.worldToCell(-995, -995), { x: 0, z: 0 });
assert.deepEqual(grid.center(0, 0), { x: -995, y: 0, z: -995 });
assert.equal(grid.worldToCell(1000, 0), null);
assert.throws(() => grid.place({ x: 0, z: 0 }, { x: 200, z: 0 }), RangeError);
assert.equal(grid.cells.size, 0);
const route = grid.place({ x: 95, z: 100 }, { x: 100, z: 105 });
assert.equal(route.length, 11);
assert.deepEqual(grid.findPath(route[0], route.at(-1)), route);
assert.equal(grid.hasRoad(100, 105), true);
const version = grid.version;
grid.set(95, 100);
assert.equal(grid.version, version);
const points = grid.lanePoints(route), reverse = grid.lanePoints([...route].reverse());
for (let i = 1; i < points.length; i++) {
  const a = points[i - 1], b = points[i];
  assert.ok(a.x === b.x || a.z === b.z, 'Lane segment remains cardinal through corner');
  for (let t = 0; t <= 1; t += .1) {
    const cell = grid.worldToCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    assert.ok(grid.has(cell.x, cell.z), 'Lane is inside road occupancy');
  }
}
assert.notEqual(points[0].z, reverse.at(-1).z);
assert.throws(() => grid.lanePoints([route[0], route[2]]), RangeError);
assert.throws(() => grid.lanePoints([route[0], route[1], route[0]]), RangeError);
assert.deepEqual(grid.lanePoints([]), []);
assert.deepEqual(grid.path(route[0], route[0]), [route[0]]);
const scene = new THREE.Scene(), pool = createRoadPool(scene, grid);
pool.sync(); assert.equal(pool.mesh.count, 11);
grid.set(100, 100, false); pool.sync();
assert.equal(pool.mesh.count, 10);
// A restored save can have the same version as the previously rendered city.
const savedVersion = grid.version;
grid.set(100, 100); grid.version = savedVersion;
pool.sync(true); assert.equal(pool.mesh.count, 11);
grid.set(100, 100, false); pool.sync();
assert.deepEqual(grid.path(route[0], route.at(-1)), []);
assert.throws(() => grid.lanePoints(route), RangeError);
pool.dispose();

// Real GLB/handle/motion coverage is in external-model-check.mjs. This fixture
// isolates the AO invalidation policy without browser image decoding.
const pose = { x: 20, z: 0 }, mobilePose = { x: -50, z: 0 };
const kit = { version: 0, pools: new Map([
  ['commercial', { handles: [{ pose }] }],
  ...['citizen', 'zombie', 'car', 'patrol_car', 'utility_car'].map(type => [type, { handles: [{ pose: mobilePose }] }]),
]) };
const camera = { position: new THREE.Vector3(10000, 400, 10000) };
const groundAppearance = createGroundMaterial(100), groundGeometry = new THREE.PlaneGeometry(200, 200);
const ground = new THREE.Mesh(groundGeometry, groundAppearance.material);
const ao = createBlockAO(ground, kit, 100, 10); ao.update();
assert.ok(ao.map.image.data.some(v => v < 255));
const previousAO = ao.map.image.data.slice();
mobilePose.x = 50; kit.version++; ao.update();
assert.deepEqual(ao.map.image.data, previousAO, 'All mobile types excluded from static AO');
pose.x = 40; ao.update();
assert.deepEqual(ao.map.image.data, previousAO, 'Unchanged static version skips bake');
kit.version++; ao.update();
assert.notDeepEqual(ao.map.image.data, previousAO);
assert.equal(ground.geometry.attributes.uv1.count, ground.geometry.attributes.uv.count);
const water = createWater(scene, 100);
assert.equal(water.mesh.position.y, -.4);
water.dispose(); ao.dispose(); groundAppearance.dispose(); groundGeometry.dispose();
const daylight = createDayNight(scene);
assert.equal(daylight.setPhase(.5), 1);
assert.ok(daylight.lights.sun.castShadow && !daylight.lights.moon.castShadow);
assert.ok(daylight.lights.probe.isLightProbe);
daylight.follow(camera);
assert.equal(daylight.lights.sun.shadow.camera.right, 360);
const day = scene.background.clone();
assert.equal(daylight.setPhase(0), 0);
assert.ok(!day.equals(scene.background));
let previous = 0;
for (let phase = 0; phase <= .5; phase += .01) {
  const blend = daylight.setPhase(phase);
  assert.ok(daylight.lights.probe.sh.coefficients.every(v => v.toArray().every(Number.isFinite)), 'Sky SH must never contain nonfinite RGB/vector conversions');
  assert.ok(blend >= previous && blend - previous < .2); previous = blend;
}
assert.equal(daylight.setPhase(1.5), 1);
assert.equal(daylight.setPhase(-.5), 1);
assert.throws(() => daylight.setPhase(NaN), RangeError);
const { sun, moon } = daylight.lights;
const shadowDisposals = [];
function allocateShadow(light, withPass = false) {
  assert.equal(light.shadow.map, null, 'renderer recreation requires a null map');
  assert.equal(light.shadow.mapPass, null);
  assert.deepEqual(light.shadow.mapSize.toArray(), [2048, 2048]);
  for (const key of withPass ? ['map', 'mapPass'] : ['map']) {
    const target = new THREE.WebGLRenderTarget(2048, 2048), disposal = { count: 0 };
    target.addEventListener('dispose', () => { disposal.count++; });
    shadowDisposals.push(disposal); light.shadow[key] = target;
  }
}
allocateShadow(sun);
for (const phase of [.25, .75]) {
  daylight.setPhase(phase);
  assert.ok(sun.castShadow && moon.castShadow, 'mixed dawn/dusk retain both shadows');
  assert.ok(sun.shadow.map);
}
allocateShadow(moon, true);
const moonMap = moon.shadow.map, moonPass = moon.shadow.mapPass;
daylight.setPhase(0); daylight.setPhase(0);
assert.equal(sun.shadow.map, null);
assert.equal(sun.shadow.mapPass, null);
assert.equal(moon.shadow.map, moonMap); assert.equal(moon.shadow.mapPass, moonPass);
assert.deepEqual(shadowDisposals.map(d => d.count), [1, 0, 0]);
daylight.setPhase(.25);
allocateShadow(sun, true);
daylight.setPhase(.75);
assert.ok(sun.shadow.map && moon.shadow.map && sun.castShadow && moon.castShadow);
daylight.setPhase(.5); daylight.setPhase(.5);
assert.equal(moon.shadow.map, null); assert.equal(moon.shadow.mapPass, null);
assert.deepEqual(shadowDisposals.map(d => d.count), [1, 1, 1, 0, 0]);
daylight.setPhase(0); daylight.setPhase(0);
assert.equal(sun.shadow.map, null); assert.equal(sun.shadow.mapPass, null);
assert.ok(shadowDisposals.every(d => d.count === 1), 'inactive targets disposed exactly once');
const effects = createWorldEffects(scene, grid);
assert.throws(() => effects.shot({x: NaN, z: 0}, {x: 0, z: 0}), RangeError);
for (let i = 0; i < 70; i++) effects.shot({x: 95, z: 100}, {x: 100, z: 105});
assert.equal(effects.active, 64);
effects.update(.1); assert.equal(effects.active, 64);
effects.update(.1); assert.equal(effects.active, 0);
effects.dispose(); daylight.dispose();
assert.ok(shadowDisposals.every(d => d.count === 1), 'cleanup never re-disposes released shadows');
assert.equal(scene.children.length, 0);
console.log('WORLD CHECK PASS: roads/lanes, static/mobile block AO invalidation, water height, sky probe/shadows, day/night, bounded FX; GLB/animation/material tests run separately');
