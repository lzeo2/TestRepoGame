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
const personURL = dataURL((await read('../Games/Capital Drive/person-model.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL)));
const { appearanceForPerson, PERSON_MODEL, createPersonGeometries } = await import(personURL);
const actorURL = dataURL((await read('../Games/Capital Drive/actor-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/models.js'", JSON.stringify(modelsURL))
  .replace("'./person-model.js'", JSON.stringify(personURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL)));
const { createActorView } = await import(actorURL);
const scene = new THREE.Scene(), heightAt = (x, z) => x * .002 + z * .001;
const view = createActorView(scene, heightAt), root = scene.children[0];
const find = name => root.getObjectByName(name);
// Compare rendered merged vertices with the same rounded torso used by civilians.
const playerAppearance = appearanceForPerson('player'), officerAppearance = appearanceForPerson('police');
const torsoMesh = find('Torso').children.find(object => object.isMesh);
function verticesWithColor(mesh, hex) {
  const expected = new THREE.Color(hex), positions = mesh.geometry.attributes.position, colors = mesh.geometry.attributes.color;
  const result = [];
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(colors.getX(i) - expected.r) < 1e-6 && Math.abs(colors.getY(i) - expected.g) < 1e-6 && Math.abs(colors.getZ(i) - expected.b) < 1e-6) {
      result.push(positions.getX(i), positions.getY(i), positions.getZ(i));
    }
  }
  return result;
}
const sharedShapes = createPersonGeometries(), torso = PERSON_MODEL.torso;
const expectedTorso = sharedShapes.capsule.clone().scale(torso.sx, torso.sy, torso.sz).translate(torso.x, torso.y, torso.z);
const jacketVertices = verticesWithColor(torsoMesh, playerAppearance.shirt);
assert.equal(jacketVertices.length, expectedTorso.attributes.position.array.length, 'player jacket uses the shared capsule, not a box shell');
for (let i = 0; i < jacketVertices.length; i++) assert(Math.abs(jacketVertices[i] - expectedTorso.attributes.position.array[i]) < 1e-6, 'player torso shares civilian proportions');
expectedTorso.dispose(); Object.values(sharedShapes).forEach(geometry => geometry.dispose());
assert.equal(find('Head').position.y, PERSON_MODEL.head.y, 'player head uses civilian standing height');
assert.deepEqual(find('Adult player').scale.toArray(), Array(3).fill(playerAppearance.height), 'standing player retains shared identity height');
assert(verticesWithColor(find('Head').children.find(object => object.isMesh), playerAppearance.hair).length > 0, 'shared player hair color survives batching');
for (const name of ['Hip', 'Shoulder']) assert.equal(find(name).children.find(object => object.isMesh).geometry.type, 'CapsuleGeometry', `${name} retains rounded articulated limb`);
const officerTorso = find('Officer torso');
for (const hex of [officerAppearance.shirt, officerAppearance.trousers, officerAppearance.skin, officerAppearance.hair]) {
  assert(verticesWithColor(officerTorso, hex).length > 0, 'officer identity palette survives instanced batching');
}
const state = {
  mode: 'foot', actor: { x: 2, z: 3, yaw: .3, speed: 0, jumpHeight: 0 },
  weapon: 'unarmed', aiming: false, attackTimer: 0, reloading: 0,
  police: Array.from({ length: 8 }, (_, i) => ({ x: i * 9, z: -12, yaw: 1, health: 100 })),
  shots: Array.from({ length: 20 }, (_, i) => ({ x: 2, z: 3, endX: 4 + i, endZ: -3, life: .1 })),
};
const objective = { x: 20, z: 10 }, options = { dt: 1 / 30, focus: state.actor, objective };
const stateBefore = structuredClone(state);
view.update(state, options);
assert.deepEqual(state, stateBefore, 'adapter never mutates gameplay');
assert(view.stats.playerVisible && view.stats.objectiveVisible);
assert.equal(view.stats.police, 4, 'police pool bounded despite excess descriptors');
assert.equal(view.stats.shots, 8, 'effects pool bounded despite excess descriptors');
assert(view.stats.drawCalls <= 50, `draw budget: ${view.stats.drawCalls}`);
assert(view.stats.triangles < 60000, `triangle budget: ${view.stats.triangles}`);
assert.equal(find('Adult player').position.y, heightAt(2, 3) + .035);
root.updateMatrixWorld(true);
const shoeBounds = new THREE.Box3().setFromObject(find('Adult player'));
assert(shoeBounds.min.y >= heightAt(2, 3), 'idle shoe soles rest above ground');
const hip = find('Hip');
state.actor.speed = 5;
view.update(state, options); const walking = hip.rotation.x;
view.update(state, options); assert.notEqual(hip.rotation.x, walking, 'walking articulates hips');
function transforms() {
  const result = [];
  root.traverse(object => result.push([object.name, ...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray(), object.visible]));
  return result;
}
const paused = transforms();
const pausedBuffers = [];
root.traverse(object => { if (object.isMesh) pausedBuffers.push([...(object.geometry.attributes.color?.array || []), ...(object.instanceMatrix?.array || [])]); });
for (let i = 0; i < 20; i++) view.update(state, { ...options, dt: 0, time: i * 100 });
assert.deepEqual(transforms(), paused, 'zero dt freezes all rendered animation regardless of external time');
const afterPausedBuffers = [];
root.traverse(object => { if (object.isMesh) afterPausedBuffers.push([...(object.geometry.attributes.color?.array || []), ...(object.instanceMatrix?.array || [])]); });
assert.deepEqual(afterPausedBuffers, pausedBuffers, 'pause freezes light colors and effect instance buffers');
state.weapon = 'pistol'; state.aiming = true; state.actor.speed = 0;
view.update(state, options);
assert(find('Pistol').visible);
const shoulders = []; root.traverse(object => { if (object.name === 'Shoulder') shoulders.push(object); });
assert(shoulders[1].rotation.x > 1.5, 'pistol arm extends toward forward -Z');
root.updateMatrixWorld(true);
const barrelDirection = new THREE.Vector3(0, 0, -1).transformDirection(find('Pistol').matrixWorld);
assert(barrelDirection.y < .2 && barrelDirection.z < -.8, 'aimed barrel points forward, not vertically');
state.reloading = 1; view.update(state, options);
assert(shoulders[1].rotation.x < 1, 'reload brings weapon toward chest');
state.reloading = 0; state.weapon = 'unarmed'; state.attackTimer = .15;
view.update(state, options); assert(shoulders[1].rotation.x > 1.8, 'melee extends striking arm');
state.actor.jumpHeight = .8; view.update(state, options);
assert(Math.abs(find('Adult player').position.y - heightAt(2, 3) - .835) < 1e-10, 'jump lift follows simulation');
state.police = Array.from({length:4},(_,i) => ({mode:'foot',active:true,health:100,x:i*2,z:4,yaw:.5,speed:2,car:{x:i*9,z:-12,yaw:1,active:true}}));
view.update(state,options);
assert.equal(view.stats.officers,4,'four foot officers remain visible');
assert.equal(view.stats.police,4,'parked patrol cars remain visible after dismount');
assert.equal(find('Generic patrol 1').position.z,-12,'patrol uses car pose rather than officer pose');
assert(view.stats.drawCalls <= 55,'instanced officers add at most five draws');
const officerLeg = find('Officer left leg'), officerMatrix = new THREE.Matrix4();
officerLeg.getMatrixAt(0,officerMatrix); const officerPose = officerMatrix.toArray();
view.update(state,options); officerLeg.getMatrixAt(0,officerMatrix);
assert.notDeepEqual(officerMatrix.toArray(),officerPose,'walking officer legs animate');
state.police[0].car.x = 5000; state.police[0].car.z = 5000;
view.update(state,options); assert.equal(view.stats.police,3); assert.equal(view.stats.officers,4,'car and officer cull independently');
state.police = []; state.shots = [];
view.update(state, options); const normalFootDraws = view.stats.drawCalls;
assert(normalFootDraws < 20);
state.mode = 'vehicle'; view.update(state, options); assert(!view.stats.playerVisible);
view.update(state, { dt: .03, focus: { x: 5000, z: 5000 }, objective });
assert.equal(view.stats.drawCalls, 0, 'far police, effects and objective are culled');
state.actor = { x: NaN, z: Infinity, yaw: NaN, speed: Infinity, jumpHeight: NaN };
state.police[0] = { x: NaN, z: 0 }; state.shots[0] = { x: 0, z: 0, endX: NaN, endZ: 0, life: .1 };
view.update(state, { dt: NaN, focus: { x: NaN, z: Infinity }, objective: { x: NaN, z: 2 } });
for (const transform of transforms()) assert(transform.slice(1, -1).every(Number.isFinite), `finite transform: ${transform[0]}`);
const ownedGeometries = new Set(), ownedMaterials = new Set();
root.traverse(object => { if (object.isMesh) { ownedGeometries.add(object.geometry); ownedMaterials.add(object.material); } });
let geometryDisposals = 0, materialDisposals = 0, instanceDisposals = 0;
root.traverse(object => { if (object.isInstancedMesh) object.addEventListener('dispose', () => instanceDisposals++); });
for (const geometry of ownedGeometries) geometry.addEventListener('dispose', () => geometryDisposals++);
for (const material of ownedMaterials) material.addEventListener('dispose', () => materialDisposals++);
const borrowed = createCar('relay', { color: '#e5e6df' }); let borrowedDisposals = 0;
borrowed.traverse(object => { if (object.isMesh) object.geometry.addEventListener('dispose', () => borrowedDisposals++); });
const stats = view.stats;
view.dispose(); view.dispose(); view.update(state, options);
assert.equal(scene.children.length, 0);
assert.equal(geometryDisposals, ownedGeometries.size, 'all owned geometry disposed exactly once');
assert.equal(materialDisposals, ownedMaterials.size, 'all owned materials disposed exactly once');
assert.equal(instanceDisposals, 7, 'instance GPU buffers released exactly once');
assert.equal(borrowedDisposals, 0, 'view disposal preserves shared factory cars');
assert(view.stats.disposed && view.stats.drawCalls === 0);
disposeCars();
console.log(`PASS shared rounded adult/police identity and proportions, articulation/grounding, aim/reload/melee/jump, bounded police/effects, pause/culling, finite transforms, disposal; ${stats.meshes} max draws, ${normalFootDraws} normal foot draws, ${stats.triangles} triangles, ${ownedGeometries.size} geometry resources`);
