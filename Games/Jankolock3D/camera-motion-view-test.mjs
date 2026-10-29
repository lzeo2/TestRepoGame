import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import * as THREE from './vendor/three.module.js';
import {CameraMotionView} from './camera-motion-view.mjs';

const near = (a, b, tolerance = 1e-11) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const snapshot = camera => JSON.stringify({
  json: camera.toJSON(), position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
  rotation: camera.rotation.toArray(), matrix: camera.matrix.toArray(), world: camera.matrixWorld.toArray(),
  inverse: camera.matrixWorldInverse.toArray(), projection: camera.projectionMatrix.toArray(),
  projectionInverse: camera.projectionMatrixInverse.toArray(), dirty: camera.matrixWorldNeedsUpdate
});
const logical = new THREE.PerspectiveCamera(70, 1.7, .1, 1400);
logical.rotation.order = 'YXZ'; logical.position.set(12, 4, -8); logical.lookAt(3, 2, -40);
logical.add(new THREE.Object3D()); logical.updateMatrixWorld(true);
const motion = new CameraMotionView(logical), persistent = motion.camera;
assert.equal(persistent.children.length, 0);
for (const key of ['position', 'quaternion', 'matrix', 'matrixWorld', 'matrixWorldInverse', 'projectionMatrix', 'projectionMatrixInverse']) {
  assert.notEqual(persistent[key], logical[key]);
}
const sight = new THREE.Vector3(), ray = new THREE.Raycaster();
let before, rayBefore;
function sample(options) {
  sight.set(0, 0, -35).applyMatrix4(logical.matrixWorld);
  ray.setFromCamera(new THREE.Vector2(), logical);
  before = snapshot(logical); rayBefore = ray.ray.clone();
  const sightBefore = sight.toArray();
  const view = motion.sample(sight, options);
  assert.equal(view, persistent);
  assert.equal(snapshot(logical), before);
  assert.deepEqual(sight.toArray(), sightBefore);
  assert.ok(ray.ray.equals(rayBefore));
  assert.deepEqual(view.projectionMatrix.toArray(), logical.projectionMatrix.toArray());
  assert.deepEqual(view.projectionMatrixInverse.toArray(), logical.projectionMatrixInverse.toArray());
  near(view.position.y - logical.position.y, motion.bob.offset);
  near(view.position.x, logical.position.x); near(view.position.z, logical.position.z);
  assert.ok(Math.abs(motion.bob.offset) <= .012);
  const projected = sight.clone().project(view);
  near(projected.x, 0); near(projected.y, 0);
  if (motion.bob.offset === 0) {
    // three.js derives Euler angles from the copied quaternion with roundoff.
    // Position/quaternion and both matrices must still be byte-for-byte equal.
    assert.equal(view.rotation.order, logical.rotation.order);
    for (const key of ['position', 'quaternion', 'matrix', 'matrixWorld', 'matrixWorldInverse']) {
      assert.deepEqual(view[key].toArray(), logical[key].toArray());
    }
  }
  return motion.bob.offset;
}
for (const fps of [30, 60, 120]) {
  motion.reset();
  let peak = 0;
  for (let i = 0; i < fps * 2; i++) {
    // Follow moving logical poses and a resized projection without writing either back.
    logical.position.x += 1 / fps;
    logical.rotation.y += .1 / fps;
    logical.aspect = 1.7 + i / 1000; logical.updateProjectionMatrix(); logical.updateMatrixWorld(true);
    peak = Math.max(peak, Math.abs(sample({dt: 1 / fps, distance: 7 / fps, grounded: true})));
  }
  assert.ok(peak > .009);
  for (let i = 0; i < fps; i++) sample({dt: 1 / fps, distance: 0, grounded: true});
  assert.equal(motion.bob.offset, 0);
  for (const gate of [{aiming: true}, {grounded: false}, {zipping: true}, {enabled: false}, {reducedMotion: true}]) {
    assert.notEqual(sample({dt: .25, distance: 1, grounded: true}), 0);
    assert.equal(sample({dt: 1 / fps, distance: 7 / fps, grounded: true, ...gate}), 0);
  }
  for (let cycle = 0; cycle < 100; cycle++) {
    sample({dt: .25, distance: 1, grounded: true});
    assert.equal(sample({dt: .25, distance: 0, grounded: true}), 0);
  }
}
console.log('PASS camera view: 30/60/120Hz movement/rest, aim/air/zip/off/reduced-motion suppression, bounded absolute offset and no drift');
sample({dt: .25, distance: 1, grounded: true});
assert.equal(motion.reset(), persistent); assert.equal(motion.bob.offset, 0);
assert.deepEqual(persistent.position.toArray(), logical.position.toArray());
assert.deepEqual(persistent.quaternion.toArray(), logical.quaternion.toArray());
for(const closePoint of [logical.position.clone(),logical.position.clone().add(new THREE.Vector3(0,0,-.05)),new THREE.Vector3(NaN,0,0)]) {
  const view=motion.sample(closePoint,{dt:.25,distance:1,grounded:true});
  assert.deepEqual(view.position.toArray(),logical.position.toArray(),'near/invalid focus cannot displace the view');
  assert.deepEqual(view.quaternion.toArray(),logical.quaternion.toArray(),'near focus cannot flip the view');
  assert.equal(motion.bob.offset,0);
}
let sightReads=0;
const lazySight=()=>{sightReads++;return sight;};
motion.sample(lazySight,{dt:.25,distance:1,grounded:true});assert.equal(sightReads,1);
motion.sample(lazySight,{dt:.25,distance:0,grounded:true});assert.equal(sightReads,1,'rest does not trace a cosmetic sight ray');
motion.sample(lazySight,{dt:.25,distance:1,grounded:true,enabled:false});assert.equal(sightReads,1);
motion.dispose(); motion.dispose();
assert.throws(() => motion.sample(sight, {dt: .25, distance: 1, grounded: true}), /disposed/);
assert.equal(snapshot(logical), before);
assert.equal(logical.children.length, 1);
console.log('PASS camera isolation: logical pose/ray/projection untouched, supplied sightpoint projects to center, persistent clone, reset and idempotent disposal');
assert.match(readFileSync(new URL('./integration.css', import.meta.url), 'utf8'), /button\{[^}]*min-height:44px;min-width:44px/);
process.stdout.write(execFileSync(process.execPath, [new URL('./integration-ui.mjs', import.meta.url).pathname, '--self-test'], {encoding: 'utf8'}));
console.log('camera-motion-view-test: all CPU checks passed; parent wiring and native feel not verified.');
