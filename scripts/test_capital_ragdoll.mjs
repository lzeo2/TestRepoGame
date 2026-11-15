import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Execute the actual vendored Three/factory source without repository package changes.
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const threeURL = dataURL(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = dataURL((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const fleetURL = dataURL(await read('../assets/car-arcade/fleet.js'));
const modelsURL = dataURL((await read('../assets/car-arcade/models.js'))
  .replace("'./vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'./vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'./fleet.js'", JSON.stringify(fleetURL)));
const { createCar, disposeCars } = await import(modelsURL);
const actorModelsURL = dataURL(`import { createCar as factory } from ${JSON.stringify(modelsURL)};
  let calls = 0; export function createCar(...args) { calls++; return factory(...args); }
  export const carCreationCount = () => calls;`);
const { carCreationCount } = await import(actorModelsURL);
const personURL = dataURL((await read('../Games/Capital Drive/person-model.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL)));
const { appearanceForPerson, PERSON_MODEL, createPersonGeometries } = await import(personURL);
const actorURL = dataURL((await read('../Games/Capital Drive/actor-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/models.js'", JSON.stringify(actorModelsURL))
  .replace("'./person-model.js'", JSON.stringify(personURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL)));
const { createActorView } = await import(actorURL);
const scene = new THREE.Scene(), terrain = (x, z) => 2 + x * .02 + z * .01;
const view = createActorView(scene, terrain, { policeLimit: 0, policeCars: false });
const root = scene.children[0], actor = root.getObjectByName('Adult player');
const state = { mode: 'foot', health: 100, actor: { x: 4, z: 5, yaw: .3, speed: 0, jumpHeight: 0, impactTime: 0, impactSerial: 0 }, weapon: 'unarmed', police: [], shots: [] };
const step = dt => view.update(state, { dt, focus: state.actor });
const transform = () => { const values = []; actor.traverse(node => values.push([node.name, ...node.position.toArray(), ...node.quaternion.toArray()])); return values; };
const resources = () => [view.stats.geometryCount, view.stats.materialCount, view.stats.meshes, view.stats.triangles];
function minimumClearance() {
  actor.updateMatrixWorld(true);
  const point = new THREE.Vector3(); let result = Infinity;
  actor.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      result = Math.min(result, point.y - terrain(point.x, point.z));
    }
  });
  return result;
}
step(0);
const idle = transform(), budget = resources();
assert.equal(view.stats.ragdoll.phase, 'idle');
assert.equal(view.stats.ragdoll.joints, 11);
state.health = 0; step(.1); assert.equal(view.stats.ragdoll.phase, 'idle', 'unrelated KO cannot start a vehicle ragdoll'); state.health = 100;
assert.equal(carCreationCount(), 0, 'indoor/no-car view allocates no patrol car resources');
assert(minimumClearance() >= 0);
const start = () => Object.assign(state.actor, { impactTime: 2.6, impactDuration: 2.6, impactStrength: .9, impactYaw: 1.3, impactSerial: state.actor.impactSerial + 1, jumpHeight: .6 });
start();
const before = structuredClone(state);
step(1 / 60); assert.deepEqual(state, before, 'presentation never mutates gameplay state');
for (let i = 0; i < 25; i++) { state.actor.impactTime -= 1 / 60; state.actor.jumpHeight = 1; step(1 / 60); }
assert.equal(view.stats.ragdoll.phase, 'airborne');
assert(Math.abs(actor.rotation.x) > 1.1, 'launch visibly tumbles through horizontal rather than an upright hop');
const limbRotations = [];
actor.traverse(node => { if (['Hip', 'Knee', 'Shoulder', 'Elbow'].includes(node.name)) limbRotations.push(node.rotation.toArray().slice(0, 3).map(value => value.toFixed(3)).join(',')); });
assert(new Set(limbRotations).size > 5, 'limbs carry distinct damped inertial responses');
assert(minimumClearance() >= -.001, 'airborne tilted model remains above sampled terrain');
assert.equal(actor.position.x, state.actor.x); assert.equal(actor.position.z, state.actor.z);
const paused = transform(); for (let i = 0; i < 30; i++) step(0);
assert.deepEqual(transform(), paused, 'zero dt freezes every impact transform');
state.actor.jumpHeight = 0;
for (let i = 0; i < 60; i++) { state.actor.impactTime -= 1 / 60; step(1 / 60); }
assert.equal(view.stats.ragdoll.phase, 'fallen');
assert(Math.abs(Math.cos(actor.rotation.x)) < .45, 'grounded player rests horizontally');
assert(minimumClearance() >= -.001, 'all rendered body vertices clear sloped ground after falling');
const fallenTilt = Math.abs(actor.rotation.x);
state.actor.impactTime = .35; step(1 / 60);
assert(Math.abs(actor.rotation.x) < fallenTilt, 'get-up visibly blends the fallen torso back toward standing');
assert.equal(view.stats.ragdoll.phase, 'getting-up');
state.health = 0; step(1 / 60); assert.equal(view.stats.ragdoll.phase, 'fallen', 'KO remains down until gameplay recovery');
state.actor.impactTime = 0; state.actor.impactDuration = 0; state.actor.impactStrength = 0; state.actor.impactYaw = 0; state.recovery = { phase: 'fade-out' };
for (let i = 0; i < 18; i++) step(.1);
assert.equal(view.stats.ragdoll.phase, 'fallen', 'completed launch remains fallen during the existing hospital fade');
assert(Math.abs(Math.cos(actor.rotation.x)) < .45, 'cleared impact DTO does not pop the KO upright');
assert(minimumClearance() >= -.001);
state.health = 100; state.recovery = null; step(0);
assert.deepEqual(transform(), idle, 'health restoration clears the retained medical fall');
start(); state.actor.jumpHeight = 0; state.actor.impactTime = .001; step(.1);
assert(Math.abs(actor.rotation.x) < .01, 'recovery blends back to standing');
state.actor.impactTime = 0; step(0);
assert.deepEqual(transform(), idle, 'ending/resetting impact exactly restores the ordinary idle pose');
start(); step(.1); const capped = transform();
state.actor.impactTime = 0; step(0); start(); step(200);
assert.deepEqual(transform(), capped, 'large dt uses the existing 100ms bounded integration cap');
for (const invalid of [NaN, Infinity, -1]) { step(invalid); assert(transform().flat().filter(value => typeof value === 'number').every(Number.isFinite)); }
state.actor.impactTime = 0; state.actor.jumpHeight = 0; state.mode = 'drive'; step(.1);
assert.equal(view.stats.ragdoll.phase, 'idle', 'mode change clears visual knockdown');
state.mode = 'foot'; step(0); assert.deepEqual(transform(), idle);
assert.deepEqual(resources(), budget, 'impacts reuse all geometry, materials and draw pools');
const owned = new Set(); root.traverse(mesh => { if (mesh.isMesh) owned.add(mesh.geometry); });
let released = 0; for (const geometry of owned) geometry.addEventListener('dispose', () => released++);
view.dispose(); const releasedOnce = released; view.dispose();
assert.equal(released, releasedOnce); assert(released > 0); assert.equal(scene.children.length, 0);
assert(view.stats.disposed); disposeCars();
console.log('PASS 11-joint player ragdoll: actual Three launch/tumble, distinct inertia, sloped ground vertices, lying/get-up/KO/reset, pause, dt cap, finite transforms, no-car ABI, stable resources and idempotent disposal');
