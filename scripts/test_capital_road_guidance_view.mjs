import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../Games/Capital Drive/', import.meta.url);
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = dataURL(await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8'));
const THREE = await import(threeURL);
const { createRoadGuidanceView } = await import(dataURL((await readFile(new URL('road-guidance-view.js', base), 'utf8'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))));
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const scene = new THREE.Scene(), heightAt = (x, z) => 10 + x * .02 - z * .03;
const view = createRoadGuidanceView(scene, heightAt), root = scene.children[0];
const resources = root.children.map(mesh => [mesh.geometry, mesh.material, mesh.instanceMatrix.array]);
const route = [[0, 0], [0, -100], [80, -100]];
const original = structuredClone(route);
view.update(route, { x: 0, z: -10, yaw: 0 });
assert.equal(view.stats.visible, 3); assert.equal(view.stats.drawCalls, 2);
assert.equal(view.stats.geometryCount, 2); assert.equal(view.stats.textureCount, 0);
assert(view.stats.triangles < 200 && view.stats.bufferBytes < 20000);
view.stats.arrows.forEach((point, i) => near(point.z, [-22, -34, -46][i]));
for (const point of view.stats.arrows) { near(point.y, heightAt(point.x, point.z) + .45); near(point.yaw, 0); assert(point.pitch > 0); }
const bytes = view.stats.bufferBytes;
view.update(route, { x: 0, z: -20, yaw: 0 });
view.stats.arrows.forEach((point, i) => near(point.z, [-32, -44, -56][i]));
assert.equal(view.stats.compiled, 1, 'stable route reference compiles once');
view.update(route, { x: 0, z: -70, yaw: 0 });
assert(view.stats.arrows.some(point => point.x > 0 && Math.abs(point.yaw + Math.PI / 2) < 1e-6), 'turn markers follow outgoing east road');
view.update(route, { x: 0, z: -86, yaw: 0 });
near(view.stats.arrows[0].yaw, -Math.PI / 2);
view.update(route, { x: 12, z: -100, yaw: -Math.PI / 2 });
assert.equal(view.stats.visible, 3);
assert(view.stats.arrows.every(point => point.x > 12 && point.z === -100), 'outgoing arrows remain physically ahead');
const snapshot = view.stats;
assert.throws(() => { snapshot.arrows[0].x = 900; }, TypeError);
snapshot.arrows.pop(); assert.equal(view.stats.arrows.length, 3, 'samples are detached');
for (let i = 0; i < 100; i++) view.update(route, { x: 12 + i * .1, z: -100, yaw: -Math.PI / 2 });
assert.equal(view.stats.bufferBytes, bytes);
root.children.forEach((mesh, i) => {
  assert.equal(mesh.geometry, resources[i][0]); assert.equal(mesh.material, resources[i][1]); assert.equal(mesh.instanceMatrix.array, resources[i][2]);
  assert(mesh.instanceMatrix.array.every(Number.isFinite)); assert.equal(mesh.instanceMatrix.count, 3);
});
assert.deepEqual(route, original, 'route remains immutable');
for (const [pose, options] of [
  [{ x: 12, z: -100, yaw: -Math.PI / 2 }, { enabled: false }],
  [{ x: NaN, z: 0, yaw: 0 }, {}], [{ x: 0, z: 0, yaw: NaN }, {}],
  [{ x: 12, z: -100, yaw: Math.PI / 2 }, {}],
  [{ x: 12, z: -140, yaw: -Math.PI / 2 }, {}],
  [{ x: 78, z: -100, yaw: -Math.PI / 2 }, {}],
  [{ x: 12, z: -100, yaw: -Math.PI / 2 }, { guidance: { kind: 'arrive' } }],
  [{ x: 12, z: -100, yaw: -Math.PI / 2 }, { guidance: { offRoute: true } }],
]) {
  view.update(route, pose, options); assert.equal(view.stats.visible, 0); assert.equal(view.stats.drawCalls, 0);
}
view.update([[0, 0], [NaN, 2], [0, -100]], { x: 0, z: 0, yaw: 0 }); assert.equal(view.stats.visible, 0);
view.update([], { x: 0, z: 0, yaw: 0 }); assert.equal(view.stats.visible, 0);
view.update([[0, 0]], { x: 0, z: 0, yaw: 0 }); assert.equal(view.stats.visible, 0);
const denied = createRoadGuidanceView(scene, heightAt, { placePoint: () => null });
denied.update(route, { x: 0, z: 0, yaw: 0 }); assert.equal(denied.stats.visible, 0); denied.dispose();
const blocked = createRoadGuidanceView(scene, heightAt, { isClear: () => false });
blocked.update(route, { x: 0, z: 0, yaw: 0 }); assert.equal(blocked.stats.visible, 0); blocked.dispose();
const invalidTerrain = createRoadGuidanceView(scene, () => NaN);
invalidTerrain.update(route, { x: 0, z: 0, yaw: 0 }); assert.equal(invalidTerrain.stats.visible, 0); invalidTerrain.dispose();
const lane = createRoadGuidanceView(scene, () => 27, { laneOffset: 2 });
lane.update(route, { x: -2, z: 0, yaw: 0 });
assert(lane.stats.arrows.every(point => point.x === -2 && point.y === 27.45), 'left lane placement uses bridge/deck height authority'); lane.dispose();

// Exercise the actual offline OSM graph and route finder, through dense vertices
// and road turns rather than only the synthetic straight-road fixtures.
const { buildRoadGraph } = await import(new URL('simulation.js', base));
const { findRoute } = await import(new URL('navigation.js', base));
const map = JSON.parse(await readFile(new URL('data/canberra.json', base)));
const graph = buildRoadGraph(map.roads);
const road = map.roads.find(road => road.name && road.points.length >= 8 && road.type !== 'service');
const actualRoute = findRoute(graph, { x: road.points[0][0], z: road.points[0][1] }, { x: road.points.at(-1)[0], z: road.points.at(-1)[1] });
assert(actualRoute.length >= 2);
let visibleFrames = 0;
for (let i = 0; i < actualRoute.length - 1; i++) {
  const [x, z] = actualRoute[i], [nextX, nextZ] = actualRoute[i + 1];
  const yaw = Math.atan2(x - nextX, z - nextZ);
  const steps = Math.max(1, Math.ceil(Math.hypot(nextX - x, nextZ - z) / 5));
  for (let j = 0; j < steps; j++) {
    const pose = { x: x + (nextX - x) * j / steps, z: z + (nextZ - z) * j / steps, yaw };
    view.update(actualRoute, pose);
    if (view.stats.visible) visibleFrames++;
    for (const point of view.stats.arrows) {
      assert((point.x - pose.x) * -Math.sin(yaw) + (point.z - pose.z) * -Math.cos(yaw) > 3);
      assert(Object.values(point).every(Number.isFinite)); near(point.y, heightAt(point.x, point.z) + .45);
    }
  }
}
assert(visibleFrames > 2, 'actual route renders driving arrows');
let geometries = 0, materials = 0, instances = 0;
for (const mesh of root.children) {
  mesh.geometry.addEventListener('dispose', () => geometries++); mesh.material.addEventListener('dispose', () => materials++); mesh.addEventListener('dispose', () => instances++);
}
view.dispose(); view.dispose(); view.update(route, { x: 0, z: 0, yaw: 0 });
assert.equal(scene.children.length, 0); assert.equal(geometries, 2); assert.equal(materials, 2); assert.equal(instances, 2);
assert(view.stats.disposed); assert.equal(view.stats.visible, 0); assert.equal(view.stats.drawCalls, 0);
console.log(`PASS road guidance view: 12/24/36m pooled driving arrows, turns/motion/left lane/terrain, invalid/off-route/reverse/arrival hiding, ${actualRoute.length}-point OSM route (${visibleFrames} visible frames), two draws, ${bytes} stable bytes, exact disposal`);
