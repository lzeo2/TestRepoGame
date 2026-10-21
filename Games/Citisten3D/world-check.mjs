import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import { RoadGrid } from './roads.mjs';
import { createBuildingKit } from './buildings.mjs';
import { createDayNight } from './daynight.mjs';
import { createRoadPool } from './world.mjs';

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
const daylight = createDayNight(scene);
assert.equal(daylight.setPhase(.5), 1);
const day = scene.background.clone();
assert.equal(daylight.setPhase(0), 0);
assert.ok(!day.equals(scene.background));
let previous = 0;
for (let phase = 0; phase <= .5; phase += .01) {
  const blend = daylight.setPhase(phase);
  assert.ok(blend >= previous && blend - previous < .2); previous = blend;
}
assert.equal(daylight.setPhase(1.5), 1);
assert.equal(daylight.setPhase(-.5), 1);
assert.throws(() => daylight.setPhase(NaN), RangeError);
daylight.dispose(); kit.dispose();
assert.equal(scene.children.length, 0);
console.log('WORLD CHECK PASS: road edits/routes/lanes/pool, 14 model types, transforms/removal, day/night interpolation');
