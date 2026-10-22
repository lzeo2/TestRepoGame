import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { RoadGrid } from './roads.mjs';
import { createBuildingKit } from './buildings.mjs';
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
assert.deepEqual(grid.path(route[0], route.at(-1)), []);
assert.throws(() => grid.lanePoints(route), RangeError);
pool.dispose();

const kit = createBuildingKit(scene, 2);
assert.equal(kit.types.length, 14);
for (const type of kit.types) {
  const a = kit.spawn(type), b = kit.spawn(type, { x: 10 });
  assert.throws(() => kit.spawn(type), RangeError);
  assert.equal(kit.remove(a), true);
  assert.equal(b.index, 0);
  kit.transform(b, { x: 20, rotation: 1 });
  const m = new THREE.Matrix4(); kit.pools.get(type).mesh.getMatrixAt(0, m);
  assert.equal(m.elements[12], 20);
  assert.throws(() => kit.transform(a), Error);
  assert.equal(kit.remove(a), false);
  assert.throws(() => kit.spawn(type, { x: NaN }), RangeError);
  assert.equal(kit.pools.get(type).mesh.count, 1);
}
assert.throws(() => kit.spawn('missing'), RangeError);
assert.throws(() => kit.spawn('toString'), RangeError);
const camera = { position: new THREE.Vector3(20, 2, 5) };
kit.update(camera, 1);
assert.ok(kit.material.isMeshStandardMaterial);
assert.equal(kit.material.map.image.width, 1024);
assert.ok(kit.material.emissiveIntensity > 1);
for (const p of kit.pools.values()) {
  assert.equal(p.detail.count, 1);
  assert.ok(p.detail.castShadow && p.detail.receiveShadow);
  assert.ok(p.detail.geometry.attributes.lightLevel.array.every(v => v >= 0 && v <= 1));
}
camera.position.set(10000, 400, 10000); kit.update(camera, 0);
for (const p of kit.pools.values()) {
  assert.equal(p.detail.count, 0);
  const matrix = new THREE.Matrix4(); p.mesh.getMatrixAt(0, matrix); assert.equal(matrix.elements[12], 20);
}
const groundAppearance = createGroundMaterial(100), groundGeometry = new THREE.PlaneGeometry(200, 200);
const ground = new THREE.Mesh(groundGeometry, groundAppearance.material);
const ao = createBlockAO(ground, kit, 100, 10); ao.update();
assert.ok(ao.map.image.data.some(v => v < 255));
const staticVersion = kit.version;
kit.transform(kit.pools.get('citizen').handles[0], {x:30}); assert.equal(kit.version, staticVersion);
kit.transform(kit.pools.get('commercial').handles[0], {x:40}); assert.ok(kit.version > staticVersion);
ao.update(); assert.equal(ground.geometry.attributes.uv1.count, ground.geometry.attributes.uv.count);
const water = createWater(scene, 100), offset = water.mesh.material.normalMap.offset.clone();
water.update(.5); assert.ok(!offset.equals(water.mesh.material.normalMap.offset));
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
const effects = createWorldEffects(scene, grid);
assert.throws(() => effects.shot({x: NaN, z: 0}, {x: 0, z: 0}), RangeError);
for (let i = 0; i < 70; i++) effects.shot({x: 95, z: 100}, {x: 100, z: 105});
assert.equal(effects.active, 64);
effects.update(.1); assert.equal(effects.active, 64);
effects.update(.1); assert.equal(effects.active, 0);
effects.dispose(); daylight.dispose(); kit.dispose();
assert.equal(scene.children.length, 0);
console.log('WORLD CHECK PASS: roads/lanes, 14 model types, stable handles, high/low LOD, PBR atlas, block AO, animated water, sky probe/shadows, day/night, bounded FX');
