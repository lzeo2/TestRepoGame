import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const fleetURL = url(await read('../assets/car-arcade/fleet.js'));
const THREE = await import(threeURL), { CARS } = await import(fleetURL);
const { createHeadlightsView } = await import(url((await read('../Games/Capital Drive/headlights-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/fleet.js'", JSON.stringify(fleetURL))));
const scene = new THREE.Scene();
let samples = 0;
const heightAt = (x, z) => { samples++; return x * .03 - z * .08; };
const view = createHeadlightsView(scene, { heightAt }), root = scene.children[0], [lamps, ground] = root.children;
const resources = root.children.flatMap(mesh => [mesh, mesh.geometry, mesh.material]);
resources.push(ground.material.map);
const arrays = root.children.map(mesh => mesh.instanceMatrix.array);
let disposals = 0;
for (const resource of resources) resource.addEventListener('dispose', () => disposals++);
assert.equal(view.stats.drawCalls, 0);
assert.equal(root.children.length, 2);
assert(root.children.every(mesh => mesh.isInstancedMesh && !mesh.castShadow));
assert(!root.children.some(mesh => mesh.isLight));
assert.equal(ground.material.depthWrite, false);
assert.equal(ground.material.blending, THREE.AdditiveBlending);
const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
for (const car of CARS) for (const yaw of [0, Math.PI / 2, Math.PI, -.74]) {
  const vehicle = { x: 13, z: -19, yaw, modelId: car.id, active: true };
  const before = structuredClone(vehicle); samples = 0;
  view.update(vehicle, { enabled: true, dt: 0 });
  assert.equal(samples, 67, 'terrain work stays constant per controlled car');
  assert.deepEqual(vehicle, before);
  assert.equal(view.stats.triangles, 36);
  assert.equal(view.stats.drawCalls, 2);
  assert.equal(view.stats.lamps, 2);
  const pose = new THREE.Object3D(), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  pose.position.set(vehicle.x, heightAt(vehicle.x, vehicle.z) + .18, vehicle.z);
  pose.rotation.set(Math.atan2(heightAt(vehicle.x + fx * 2, vehicle.z + fz * 2) - heightAt(vehicle.x - fx * 2, vehicle.z - fz * 2), 4), yaw, 0, 'YXZ'); pose.updateMatrix();
  const inverse = pose.matrix.clone().invert();
  for (let i = 0; i < 2; i++) {
    lamps.getMatrixAt(i, matrix); matrix.decompose(pos, rotation, scale); pos.applyMatrix4(inverse);
    assert(Math.abs(pos.z + car.length / 2 + .014) < .00001, `${car.id} lens at front bumper`);
    assert(Math.abs(pos.x) > car.width * .29 && Math.abs(pos.x) < car.width * .33, `${car.id} paired lamp spacing`);
    assert(pos.y > .5 && pos.y < car.height, `${car.id} lamp body height`);
  }
  for (let i = 0; i < ground.count; i++) {
    ground.getMatrixAt(i, matrix); matrix.decompose(pos, rotation, scale);
    const dx = pos.x - vehicle.x, dz = pos.z - vehicle.z, forward = dx * fx + dz * fz;
    assert(forward > car.length / 2 && forward < car.length / 2 + 19);
    assert(Math.abs(pos.y - heightAt(pos.x, pos.z) - .045) < .00001, 'patch follows sloped ground');
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
    assert(normal.dot(new THREE.Vector3(-.03, 1, .08).normalize()) > .9999, 'patch tilts with both terrain axes');
    assert(scale.x < 3.4 && scale.z < 2.6, 'fixed bounded patches');
  }
  const frozen = arrays.map(array => Array.from(array));
  samples = 0;
  view.update(vehicle, { enabled: true, dt: 0 });
  assert.equal(samples, 0, 'unchanged paused pose skips all terrain and instance work');
  arrays.forEach((array, i) => assert.deepEqual(Array.from(array), frozen[i], 'zero dt does not animate'));
}
const car = { x: 0, z: 0, yaw: 0, modelId: 'lantern' };
for (const [vehicle, options] of [[car, { enabled: false }], [car, { enabled: true, interiorId: 'room' }], [{ ...car, active: false }, { enabled: true }], [null, { enabled: true }], [{ ...car, interiorId: 'room' }, { enabled: true }], [{ ...car, yaw: NaN }, { enabled: true }], [{ ...car, modelId: 'jet' }, { enabled: true }]]) {
  samples = 0; view.update(vehicle, options);
  assert.equal(samples, 0, 'hidden lamps perform no terrain queries');
  assert.equal(view.stats.drawCalls, 0); assert.equal(root.visible, false);
  assert.equal(lamps.count + ground.count, 0);
}
for (let i = 0; i < 100; i++) view.update(car, { enabled: true });
assert.equal(disposals, 0);
root.children.forEach((mesh, i) => { assert.equal(mesh.instanceMatrix.array, arrays[i]); assert.equal(mesh, resources[i * 3]); });
view.dispose(); view.dispose(); view.update(car, { enabled: true });
assert.equal(disposals, resources.length, 'every owned GPU resource disposed exactly once');
assert.equal(scene.children.length, 0); assert.equal(view.stats.drawCalls, 0); assert(view.stats.disposed);
const invalid = createHeadlightsView(scene, { heightAt: () => NaN });
invalid.update(car, { enabled: true }); assert.equal(invalid.stats.drawCalls, 0); invalid.dispose();
console.log('Capital headlights: 16 fleet models, yaw/slope poses, bounded ground patches, hiding, zero-dt stability, pooled resources and exact disposal PASS');
