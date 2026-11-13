import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const fleetURL = url(await read('../assets/car-arcade/fleet.js'));
const factoryURL = url((await read('../assets/car-arcade/models.js'))
  .replace("'./vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'./vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'./fleet.js'", JSON.stringify(fleetURL)));
const { createCar, disposeCars } = await import(factoryURL);
const { createTrafficView } = await import(url((await read('../Games/Capital Drive/traffic-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'../../assets/car-arcade/models.js'", JSON.stringify(factoryURL))));
const models = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];
const colors = [0xd4d7d3, 0x777e84, 0x274d79, 0xa4463b, 0xd1c8b4, 0x555952, 0xc5b86e];
const traffic = Array.from({ length: 40 }, (_, i) => ({ id: `traffic:${i}`, modelId: models[i % 6], color: colors[i % 7], x: i, z: i * .2, yaw: i * .1, active: true }));
const scene = new THREE.Scene(), heightAt = (x, z) => x * .02 + z * .01;
const originals = models.map(id => createCar(id, { color: '#ffffff' }));
const sharedGeometries = new Set(originals.flatMap(car => car.children.map(mesh => mesh.geometry)));
const sharedMaterials = new Set(originals.flatMap(car => car.children.map(mesh => mesh.material)));
let sharedDisposals = 0;
for (const resource of [...sharedGeometries, ...sharedMaterials]) resource.addEventListener('dispose', () => sharedDisposals++);
const sourceAttributes = [...sharedGeometries].map(geometry => Array.from(geometry.attributes.position.array));
const originalSnapshot = structuredClone(traffic);
const view = createTrafficView(scene, heightAt, traffic), root = scene.children[0];
assert.equal(root.children.length, 19); assert.equal(view.stats.drawCalls, 0);
const resources = root.children.map(mesh => [mesh.geometry, mesh.material, mesh.instanceMatrix.array, mesh.instanceColor?.array]);
for (const mesh of root.children) { assert.equal(mesh.instanceMatrix.count, 56); assert(!sharedGeometries.has(mesh.geometry)); assert(!sharedMaterials.has(mesh.material)); }
for (const [i, id] of models.entries()) {
  const meshes = root.children.filter(mesh => mesh.name.startsWith(`${id} `));
  const actualBounds = new THREE.Box3();
  let triangles = 0;
  for (const mesh of meshes) { mesh.geometry.computeBoundingBox(); actualBounds.union(mesh.geometry.boundingBox); triangles += mesh.geometry.index.count / 3; }
  const expectedBounds = new THREE.Box3().setFromObject(originals[i]);
  const colorHistogram = list => {
    const result = new Map();
    for (const mesh of list) {
      const values = mesh.geometry.attributes.color.array;
      for (let j = 0; j < values.length; j += 3) {
        const key = `${values[j]},${values[j + 1]},${values[j + 2]}`;
        result.set(key, (result.get(key) || 0) + 1);
      }
    }
    return [...result].sort((a, b) => a[0].localeCompare(b[0]));
  };
  assert.deepEqual(colorHistogram(meshes), colorHistogram(originals[i].children), `${id} trim upholstery lamps and wheel colors retained`);
  assert(actualBounds.min.distanceTo(expectedBounds.min) < .00001, `${id} lower silhouette exact`);
  assert(actualBounds.max.distanceTo(expectedBounds.max) < .00001, `${id} upper silhouette exact`);
  assert.equal(triangles, originals[i].userData.triangles, `${id} all authored triangles retained`);
  const glass = meshes.find(mesh => mesh.name.endsWith('glazing'));
  assert.equal(glass.material.opacity, .38); assert(glass.material.transparent); assert.equal(glass.material.depthWrite, false);
  assert(glass.material.forceSinglePass, 'transparent glass keeps seated driver visible with one pass');
  assert(originals[i].userData.cockpit.eye[0] < 0, 'source left-side cockpit unchanged');
}
view.update({ x: 0, z: 0 });
assert.equal(view.stats.visible, 40); assert.equal(view.stats.drawCalls, 19); assert.equal(view.stats.sourceDrawCalls, 320);
assert.equal(view.stats.geometries, 19); assert.equal(view.stats.materials, 4);
for (const id of models) {
  const paint = root.children.find(mesh => mesh.name === `${id} body`), matching = traffic.filter(car => car.modelId === id);
  assert.equal(paint.count, matching.length);
  matching.forEach((car, i) => { const actual = new THREE.Color(); paint.getColorAt(i, actual); const expected = new THREE.Color(car.color); assert(Math.abs(actual.r - expected.r) + Math.abs(actual.g - expected.g) + Math.abs(actual.b - expected.b) < .000001); });
}
const matrix = new THREE.Matrix4(); root.children[0].getMatrixAt(0, matrix);
assert(Math.abs(matrix.elements[13] - .18) < .000001);
const expectedPose = new THREE.Object3D();
expectedPose.position.set(0, .18, 0); expectedPose.rotation.set(Math.atan2(-.04, 4), 0, 0, 'YXZ'); expectedPose.updateMatrix();
assert(matrix.elements.every((value, i) => Math.abs(value - expectedPose.matrix.elements[i]) < .000001), 'terrain pitch uses controller convention');
assert.deepEqual(traffic, originalSnapshot, 'renderer owns no simulation state');
traffic[0].active = false; view.update({ x: 0, z: 0 }); assert.equal(view.stats.visible, 39, 'claimed vehicle immediately hidden');
traffic[0].active = true; traffic[0].x = 250; traffic[0].z = 0;
view.update({ x: 0, z: 0 }); assert.equal(view.stats.visible, 39);
view.update({ x: 0, z: 0 }, { lowGraphics: false }); assert.equal(view.stats.visible, 40);
traffic[0].yaw = NaN; view.update({ x: 0, z: 0 }, { lowGraphics: false }); assert.equal(view.stats.visible, 39);
view.update({ x: NaN, z: Infinity }); assert.equal(view.stats.visible, 0); assert.equal(view.stats.drawCalls, 0);
view.update({ x: 10000, z: 10000 }); assert.equal(view.stats.visible, 0);
traffic[0] = originalSnapshot[0];
for (let i = 40; i < 80; i++) traffic.push({ ...originalSnapshot[i % 40], id: `extra:${i}`, modelId: 'lantern' });
for (let i = 0; i < 10; i++) view.update({ x: 0, z: 0 });
assert.equal(view.stats.visible, 56, 'hard instance bound');
root.children.forEach((mesh, i) => {
  assert.equal(mesh.geometry, resources[i][0]); assert.equal(mesh.material, resources[i][1]);
  assert.equal(mesh.instanceMatrix.array, resources[i][2]); assert.equal(mesh.instanceColor?.array, resources[i][3]);
  assert(mesh.instanceMatrix.array.every(Number.isFinite));
});
assert.equal(sharedDisposals, 0);
[...sharedGeometries].forEach((geometry, i) => assert.deepEqual(Array.from(geometry.attributes.position.array), sourceAttributes[i]));
let geometryDisposals = 0, materialDisposals = 0, instanceDisposals = 0, textureDisposals = 0;
for (const mesh of root.children) { mesh.geometry.addEventListener('dispose', () => geometryDisposals++); mesh.addEventListener('dispose', () => instanceDisposals++); }
for (const material of new Set(root.children.map(mesh => mesh.material))) material.addEventListener('dispose', () => materialDisposals++);
root.children.at(-1).material.map.addEventListener('dispose', () => textureDisposals++);
view.dispose(); view.dispose(); view.update({ x: 0, z: 0 });
assert.equal(scene.children.length, 0); assert.equal(geometryDisposals, 19); assert.equal(materialDisposals, 4); assert.equal(instanceDisposals, 19); assert.equal(textureDisposals, 1); assert.equal(sharedDisposals, 0);
assert(view.stats.disposed); assert.equal(view.stats.drawCalls, 0);
console.log(`PASS traffic: 40 authored cars 320 draws -> 19 draws (94.1% reduction); six exact silhouettes, ${sharedGeometries.size} factory geometries -> 19 owned templates; ${view.stats.templateTriangles} template triangles; paints/glass/cockpit, terrain, claim hiding, 220/300m culling, 56 capacity, stable buffers and exact disposal`);
disposeCars();
