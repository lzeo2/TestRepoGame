import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createLightRailView } from '../Games/Capital Drive/light-rail-view.js';

const scene = new THREE.Scene();
const ground = (_x, z) => 18 + z * .025;
const routes = [-2.6, 2.6].map(x => ({ points: [[x, 184], [x, 0], [x, -160]] }));
routes.push({ points: [[-2.6, 0], [-2.6, 184]] });
const stops = [{ id: 'alinga', name: 'Alinga Street', x: 0, z: 0, yaw: 0, side: 1, platformWidth: 1.8 }];
const view = createLightRailView(scene, { routes, stops }, ground);
const [track, fleet] = scene.children;
const focus = { x: 0, z: 0 };
const tram = { id: 'capital-link-west', x: -2.6, z: 0, y: 18, yaw: 0, width: 2.62, length: 26.4, active: true };
const matrix = new THREE.Matrix4();
const cube = new THREE.Box3(new THREE.Vector3(-.5, -.5, -.5), new THREE.Vector3(.5, .5, .5));
function bounds(mesh) {
  const result = new THREE.Box3();
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix);
    assert(matrix.elements.every(Number.isFinite), 'pooled matrices remain finite');
    result.union(cube.clone().applyMatrix4(matrix));
  }
  return result;
}

view.update([tram], focus);
assert.equal(view.stats.drawCalls, 2);
assert.equal(view.stats.trains, 1);
assert.equal(view.stats.stops, 1);
assert.equal(view.stats.trackSections, 86, 'both rails render once even when a turnback retraces a segment');
assert.equal(view.stats.triangles, (track.count + fleet.count) * 12);
assert.equal(track.geometry, fleet.geometry);
assert.equal(track.material, fleet.material);
const hull = bounds(fleet), hullSize = hull.getSize(new THREE.Vector3());
bounds(track);
assert(hull.min.y >= tram.y && hullSize.x < 2.9 && hullSize.z > 26 && hullSize.z < 27);
assert(hull.max.y > tram.y + 4, 'raised pantograph distinguishes the tram from a bus');
track.getMatrixAt(0, matrix);
assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x - 1.8) < 1e-5, 'platform footprint fits the island gap');
const trackVersion = track.instanceMatrix.version, fleetVersion = fleet.instanceMatrix.version;
const fleetColorVersion = fleet.instanceColor.version;
view.update([{ ...tram }], { x: 4, z: 0 });
assert.equal(track.instanceMatrix.version, trackVersion, 'stationary nearby frames do not upload track');
assert.equal(fleet.instanceMatrix.version, fleetVersion, 'unchanged tram pose does not upload');

const closed = fleet.instanceMatrix.array.slice();
view.update([{ ...tram, doorsOpen: true, doorSide: 1 }], focus);
let sliders = 0;
for (let index = 0; index < fleet.count; index++) {
  fleet.getMatrixAt(index, matrix);
  if (Math.abs(matrix.elements[14] - closed[index * 16 + 14]) < .01) continue;
  sliders++;
  assert(matrix.elements[12] > tram.x, 'only platform-facing door leaves move');
}
assert.equal(sliders, 18);
assert.equal(fleet.instanceColor.version, fleetColorVersion, 'moving parts reuse their baked color buffer');

view.update([tram, ...Array.from({ length: 5 }, (_, index) => ({ ...tram, id: `return-${index}`, x: 2.6, z: -50 * index, y: ground(2.6, -50 * index), yaw: Math.PI }))], focus);
assert.equal(view.stats.trains, 5, 'the shared draw covers all scheduled and spare trains with a bounded pool');
assert(fleet.count <= view.stats.trainCapacity && track.count <= view.stats.trackCapacity);
view.update([tram], { x: 1500, z: 1500 });
assert.equal(view.stats.drawCalls, 0);
view.update([{ ...tram, x: NaN }, null], focus);
assert.equal(view.stats.trains, 0);
assert.equal(view.stats.drawCalls, 1, 'invalid moving art cannot hide valid terrain art');

const disposed = [];
track.geometry.addEventListener('dispose', () => disposed.push('geometry'));
track.material.addEventListener('dispose', () => disposed.push('material'));
view.dispose(); view.dispose(); view.update([tram], focus);
assert.deepEqual(disposed, ['geometry', 'material']);
assert.equal(scene.children.length, 0);
assert.equal(view.stats.drawCalls, 0);
assert(view.stats.disposed);

const tightScene = new THREE.Scene();
const tightView = createLightRailView(tightScene, { stops: [{ ...stops[0], trackGap: 3.1 }] }, () => 0);
tightView.update([], focus);
const [tight] = tightScene.children;
const signSide = [0, 0], signCenterX = .28 / 2.86 * 1.05;
for (let index = 0; index < tight.count; index++) {
  tight.getMatrixAt(index, matrix);
  const scale = new THREE.Vector3().setFromMatrixScale(matrix);
  assert(scale.y < 1.9 || scale.z < 2, 'tight islands have open shelters at eye height');
  if (matrix.elements[13] > 2.14 && scale.z < .09) signSide[Number(matrix.elements[12] > signCenterX)]++;
}
assert(signSide[0] > 0 && signSide[0] === signSide[1], 'platform signs have lettering on both faces');
tightView.dispose();
console.log('PASS light rail view: paired contour track, compact island stop, platform-side doors, fixed two-draw pool and cleanup');
