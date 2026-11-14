import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRoadGraph } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { createTrafficLights } from '../Games/Capital Drive/traffic-lights.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const { createTrafficLightsView } = await import(url((await read('../Games/Capital Drive/traffic-lights-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))));

const scene = new THREE.Scene();
const heightAt = (x, z) => x === 77 ? NaN : x * .01 + z * .02;
const view = createTrafficLightsView(scene, heightAt), root = scene.children[0];
const body = root.children[0], dim = root.children[1];
const active = Object.fromEntries(['red', 'amber', 'green'].map(aspect => [aspect, root.children.find(mesh => mesh.userData.aspect === aspect)]));
assert.equal(root.children.length, 5); assert.equal(view.stats.drawCalls, 0);
assert.equal(view.stats.geometries, 3); assert.equal(view.stats.materials, 5);
assert(root.children.every(mesh => mesh.isInstancedMesh && mesh.instanceMatrix.count === 96));
assert(!root.children.some(mesh => mesh.isLight), 'no per-head lights');
const resources = root.children.map(mesh => [mesh.geometry, mesh.material, mesh.instanceMatrix.array]);
const heads = ['red', 'amber', 'green'].map((color, i) => ({ id: `test:${i}`, x: i * 5, z: i * -2, yaw: i * .7, color }));
const snapshot = structuredClone(heads);
view.update(heads, { x: 0, z: 0 });
assert.equal(view.stats.visible, 3); assert.equal(view.stats.drawCalls, 5);
assert.deepEqual([view.stats.red, view.stats.amber, view.stats.green], [1, 1, 1]);
assert.equal(body.count, 3); assert.equal(dim.count, 3);
const matrix = new THREE.Matrix4(), expected = new THREE.Object3D(), position = new THREE.Vector3();
for (const [i, head] of heads.entries()) {
  body.getMatrixAt(i, matrix);
  expected.position.set(head.x, heightAt(head.x, head.z), head.z); expected.rotation.set(0, head.yaw, 0); expected.updateMatrix();
  assert(matrix.elements.every((value, j) => Math.abs(value - expected.matrix.elements[j]) < .000001), 'head shares exact finite terrain/yaw pose');
  active[head.color].getMatrixAt(0, matrix);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(matrix);
  assert(normal.dot(new THREE.Vector3(-Math.sin(head.yaw), 0, -Math.cos(head.yaw))) < -.999999, 'lenses face incoming drivers');
  position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.y - heightAt(head.x, head.z) - { red: 4.25, amber: 3.7, green: 3.15 }[head.color]) < .000001);
  assert(active[head.color].material.isMeshBasicMaterial); assert.equal(active[head.color].material.toneMapped, false);
}
assert(active.red.material.color.r > active.red.material.color.g * 5);
assert(active.amber.material.color.r > active.amber.material.color.g && active.amber.material.color.g > active.amber.material.color.b * 5);
assert(active.green.material.color.g > active.green.material.color.r * 5);
assert.deepEqual(heads, snapshot, 'view does not change authoritative head state');
heads[0].color = 'green'; view.update(heads, { x: 0, z: 0 });
assert.deepEqual([view.stats.red, view.stats.amber, view.stats.green], [0, 1, 2]);
assert.equal(active.red.count, 0); assert.equal(active.green.count, 2); assert.equal(view.stats.drawCalls, 4);
for (let i = 0; i < 10; i++) view.update(heads, { x: 0, z: 0 });
assert.deepEqual(heads[0], { ...snapshot[0], color: 'green' }, 'render updates contain no independent phase clock');

const crowded = Array.from({ length: 512 }, (_, i) => ({ id: `crowded:${i}`, x: 300 - i / 2, z: 0, yaw: 0, color: 'red' }));
view.update(crowded, { x: 0, z: 0 });
assert.equal(view.stats.sourceHeads, 512); assert.equal(view.stats.visible, 96); assert.equal(view.stats.red, 96);
assert.equal(view.stats.drawCalls, 3);
body.getMatrixAt(0, matrix); assert(Math.abs(matrix.elements[12] - 44.5) < .000001, 'nearest selected even when source order is far-first');
body.getMatrixAt(95, matrix); assert(Math.abs(matrix.elements[12] - 92.5) < .000001, 'invalid terrain excluded before nearest cap');
const invalid = [
  { ...heads[0], x: NaN }, { ...heads[0], z: Infinity }, { ...heads[0], yaw: NaN },
  { ...heads[0], color: 'blue' }, { ...heads[0], x: 77 }, { ...heads[0], x: 350.01 }, null
];
view.update(invalid, { x: 0, z: 0 }); assert.equal(view.stats.visible, 0); assert.equal(view.stats.drawCalls, 0);
view.update(heads, { x: NaN, z: 0 }); assert.equal(view.stats.visible, 0);
view.update(null, { x: 0, z: 0 }); assert.equal(view.stats.visible, 0);
view.update([{ ...heads[0], x: 350, z: 0 }], { x: 0, z: 0 }); assert.equal(view.stats.visible, 1, '350m edge is inclusive');
root.children.forEach((mesh, i) => {
  assert.equal(mesh.geometry, resources[i][0]); assert.equal(mesh.material, resources[i][1]); assert.equal(mesh.instanceMatrix.array, resources[i][2]);
  assert(mesh.instanceMatrix.array.every(Number.isFinite), 'invalid poses never enter GPU buffers');
});

// Consume the actual signal state owner and the pinned base+north road graph.
const json = async name => JSON.parse(await read(`../Games/Capital Drive/data/${name}`));
const map = applyMapExpansion(await json('canberra.json'), await json('canberra-north.json'));
const lights = createTrafficLights(map, buildRoadGraph(map.roads), await json('traffic-signals.json'));
assert(lights.heads.length > 100);
const focus = lights.heads[0], before = structuredClone(lights.heads);
view.update(lights.heads, focus); assert(view.stats.visible > 0 && view.stats.visible <= 96);
const countColors = () => {
  const visible = lights.heads.filter(head => Math.hypot(head.x - focus.x, head.z - focus.z) <= 350 && Number.isFinite(heightAt(head.x, head.z)))
    .sort((a, b) => (a.x - focus.x) ** 2 + (a.z - focus.z) ** 2 - (b.x - focus.x) ** 2 - (b.z - focus.z) ** 2).slice(0, 96);
  return ['red', 'amber', 'green'].map(color => visible.filter(head => head.color === color).length);
};
const counts = countColors();
assert.deepEqual([view.stats.red, view.stats.amber, view.stats.green], counts);
assert.deepEqual(lights.heads, before, 'real source descriptors are read-only to rendering');
lights.step(lights.timing.green + .1); view.update(lights.heads, focus);
assert(view.stats.amber > 0, 'actual supplied-dt state changes are reflected by active amber batches');
assert.deepEqual([view.stats.red, view.stats.amber, view.stats.green], countColors());
const paused = structuredClone(lights.heads); lights.step(0); lights.step(NaN); lights.step(Infinity);
view.update(lights.heads, focus); assert.deepEqual(lights.heads, paused, 'invalid and paused dt remain state-owner concerns');

let geometryDisposals = 0, materialDisposals = 0, instanceDisposals = 0;
for (const geometry of new Set(root.children.map(mesh => mesh.geometry))) geometry.addEventListener('dispose', () => geometryDisposals++);
for (const material of new Set(root.children.map(mesh => mesh.material))) material.addEventListener('dispose', () => materialDisposals++);
root.children.forEach(mesh => mesh.addEventListener('dispose', () => instanceDisposals++));
view.dispose(); view.dispose(); view.update(heads, focus);
assert.equal(scene.children.length, 0); assert.equal(geometryDisposals, 3); assert.equal(materialDisposals, 5); assert.equal(instanceDisposals, 5);
assert(view.stats.disposed); assert.equal(view.stats.visible, 0); assert.equal(view.stats.drawCalls, 0);
console.log(`PASS signals view: ${lights.heads.length} actual source heads; nearest96/350m, five pooled draws, correct red/amber/green facing and heights, finite poses, no phase clock, stable buffers and exact disposal`);
