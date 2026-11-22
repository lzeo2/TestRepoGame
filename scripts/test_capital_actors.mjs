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
const scene = new THREE.Scene(), heightAt = (x, z) => x * .002 + z * .001;
const view = createActorView(scene, heightAt), root = scene.children[0];
const find = name => root.getObjectByName(name);
assert.equal(carCreationCount(), 6, 'default factory creates six bounded outdoor patrol cars');
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
const actorBuffers = [];
find('Adult player').traverse(mesh => { if (mesh.isMesh) actorBuffers.push([mesh.geometry, mesh.geometry.attributes.position.array, mesh.geometry.attributes.color?.array]); });
const policeColors = [...officerTorso.geometry.attributes.color.array];
const heroIds = ['player:student','player:corporate','player:basement'];
assert.equal(new Set(heroIds.map(id => appearanceForPerson(id).shirt)).size,3,'three original adult outfits are distinct');
for (const id of [...heroIds,'player']) {
  const appearance = appearanceForPerson(id);
  assert(view.setPlayerAppearance(id));
  assert.deepEqual(find('Adult player').userData.appearance,appearance);
  assert.equal(verticesWithColor(torsoMesh,appearance.shirt).length,jacketVertices.length,'hero outfit updates every jacket vertex');
  assert(verticesWithColor(find('Head').children.find(object => object.isMesh),appearance.skin).length>0,'hero skin changes with the same identity');
  assert(verticesWithColor(find('Head').children.find(object => object.isMesh),appearance.hair).length>0,'hero hair changes with the same identity');
}
assert(!view.setPlayerAppearance('unrecognised'),'unsupported hero cannot select an arbitrary appearance');
let bufferIndex=0;
find('Adult player').traverse(mesh => { if (mesh.isMesh) {
  const [geometry,positions,colors]=actorBuffers[bufferIndex++];
  assert.equal(mesh.geometry,geometry); assert.equal(mesh.geometry.attributes.position.array,positions); assert.equal(mesh.geometry.attributes.color?.array,colors);
} });
assert.deepEqual([...officerTorso.geometry.attributes.color.array],policeColors,'hero changes preserve police uniforms');
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
assert.equal(view.stats.police, 6, 'police pool bounded despite excess descriptors');
assert.equal(view.stats.shots, 8, 'effects pool bounded despite excess descriptors');
// The two newly authorized patrol slots use the same retained car model. Keep
// the original four-car budget and account only for those two extra instances.
let additionalPatrolDraws=0;
for(const id of [5,6])find(`Generic patrol ${id}`).traverseVisible(object=>{if(object.isMesh)additionalPatrolDraws++;});
assert(view.stats.drawCalls - additionalPatrolDraws <= 50, `four-car equivalent draw budget: ${view.stats.drawCalls}`);
assert(view.stats.triangles < 60000, `triangle budget: ${view.stats.triangles}`);
assert.equal(find('Adult player').position.y, heightAt(2, 3) + .035);
root.updateMatrixWorld(true);
const shoeBounds = new THREE.Box3();
// Pooled, unequipped guns remain hidden children of the player's joints.
find('Adult player').traverseVisible(mesh=>{if(mesh.isMesh)shoeBounds.expandByObject(mesh,true);});
assert(shoeBounds.min.y >= heightAt(2, 3), 'idle shoe soles rest above ground');
const vest = find('Player body armour'), unarmouredDraws = view.stats.drawCalls;
assert.equal(vest.parent, find('Torso'), 'only the playable torso owns the vest');
assert(!vest.visible && !view.stats.armourVisible, 'legacy supplied state leaves the vest hidden');
assert(vest.geometry.index.count / 3 <= 210, 'vest uses one bounded merged mesh');
const vestGeometry = vest.geometry;
state.armour = 42;
view.update(state, { ...options, dt: 0 });
assert(vest.visible && view.stats.armourVisible);
assert.equal(view.stats.drawCalls, unarmouredDraws + 1, 'equipped armour adds one draw');
const hip = find('Hip');
state.actor.crouching=true;
for(let frame=0;frame<12;frame++)view.update(state,options);
assert(hip.rotation.x<-.8&&find('Knee').rotation.x>1.6,'crouch bends the hips and knees');
assert(find('Adult player').position.y<heightAt(2,3)-.3,'the crouched body is lower');
assert(vest.visible && vest.parent.rotation.x < -.1, 'armour follows the crouching torso');
state.actor.crouching=false;
for(let frame=0;frame<12;frame++)view.update(state,options);
state.actor.speed = 5;
view.update(state, options); const walking = hip.rotation.x;
view.update(state, options); assert.notEqual(hip.rotation.x, walking, 'walking articulates hips');
assert(vest.visible && vest.geometry === vestGeometry, 'walking preserves the original torso attachment and buffer');
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
const settlePose = () => { for (let i = 0; i < 40; i++) view.update(state, options); };
state.weapon = 'pistol'; state.aiming = true; state.actor.speed = 0;
view.update(state, options);
assert(find('Pistol').visible);
const shoulders = []; root.traverse(object => { if (object.name === 'Shoulder') shoulders.push(object); });
assert(shoulders[1].rotation.x > 0 && shoulders[1].rotation.x < 1.5, 'entering aim blends the arm rather than snapping to its target');
const enteringAim = transforms();
view.update(state, { ...options, dt: 0 });
assert.deepEqual(transforms(), enteringAim, 'zero dt freezes an unfinished stance transition');
settlePose();
assert(shoulders[1].rotation.x > 1.5, 'settled pistol arm extends toward forward -Z');
root.updateMatrixWorld(true);
const barrelDirection = new THREE.Vector3(0, 0, -1).transformDirection(find('Pistol').matrixWorld);
assert(barrelDirection.y < .2 && barrelDirection.z < -.8, 'aimed barrel points forward, not vertically');
const aimedShoulder = shoulders[1].rotation.x;
state.reloading = 1; view.update(state, options);
assert(shoulders[1].rotation.x < aimedShoulder && shoulders[1].rotation.x > .65, 'reload transition moves toward chest without snapping');
settlePose();
assert(shoulders[1].rotation.x < 1, 'reload brings weapon toward chest');
state.reloading = 0; state.weapon = 'unarmed'; state.attackTimer = .15;
view.update(state, options); settlePose(); assert(shoulders[1].rotation.x > 1.8, 'melee extends striking arm');
state.actor.yaw=0; state.actor.speed=0; state.attackSerial=1;
const elbows=[]; root.traverse(object => { if(object.name==='Elbow') elbows.push(object); });
function fistZ(index) { root.updateMatrixWorld(true); return new THREE.Vector3(0,-.28,0).applyMatrix4(elbows[index].matrixWorld).z; }
state.attackTimer=.3; view.update(state,options); settlePose(); const windup=fistZ(1), windupElbow=elbows[1].rotation.x;
state.attackTimer=.15; view.update(state,options); settlePose(); const extension=fistZ(1);
assert(extension < windup-.10 && elbows[1].rotation.x<windupElbow,'windup extends the actual fist forward and straightens its elbow');
assert(find('Torso').position.z<-.05 && Math.abs(find('Torso').rotation.y)>.15,'strike shifts weight and torso toward the blow');
root.updateMatrixWorld(true);
assert(vest.visible && vest.matrixWorld.equals(find('Torso').matrixWorld), 'the vest inherits the actual animated melee pose');
state.attackTimer=.02; view.update(state,options); settlePose();
assert(fistZ(1)>extension+.15,'recovery retracts the fist');
state.attackTimer=.15; state.attackSerial=2; view.update(state,options); settlePose();
assert(shoulders[0].rotation.x>1.8 && shoulders[1].rotation.x<1,'consecutive authoritative strikes alternate arms');
state.attackTimer=0; view.update(state,options);
assert(find('Torso').position.z < 0, 'ending a strike blends its weight shift back to idle');
settlePose();
assert(Math.abs(find('Torso').position.z)<1e-10 && Math.abs(find('Torso').rotation.y)<1e-10,'settled idle clears strike weight shift');
// Exercise a live timer sequence, rather than only held pose fixtures.
state.attackSerial = 3;
let previousStrike = shoulders[1].rotation.x, peakStrike = 0;
for (let frame = 0; frame < 24; frame++) {
  state.attackTimer = Math.max(0, .3 - frame / 60);
  view.update(state, { ...options, dt: 1 / 60 });
  const angle = shoulders[1].rotation.x;
  assert(Math.abs(angle - previousStrike) < .7, 'live melee joint changes stay continuous through strike and recovery');
  previousStrike = angle; peakStrike = Math.max(peakStrike, angle);
}
assert(peakStrike > 1, 'blending retains a visible strike within the authoritative attack duration');
state.actor.speed = 7;
const stoppedHip = hip.rotation.x;
view.update(state, { ...options, dt: 1 / 60 });
assert(Math.abs(hip.rotation.x - stoppedHip) < .15, 'starting sprint eases in continuous stride');
for (let i = 0; i < 30; i++) view.update(state, { ...options, dt: 1 / 60 });
state.actor.speed = 0;
const runningHip = hip.rotation.x;
view.update(state, { ...options, dt: 1 / 60 });
assert(Math.abs(hip.rotation.x - runningHip) < .3, 'stopping preserves stride phase while fading motion');
settlePose();
assert(Math.abs(hip.rotation.x) < 1e-5, 'stopped gait settles to idle');
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
state.armour = 0;
view.update(state, options); const normalFootDraws = view.stats.drawCalls;
assert(!vest.visible && !view.stats.armourVisible, 'depleted armour disappears on the next update');
assert(normalFootDraws < 20);
state.armour = 16;
state.mode = 'vehicle'; view.update(state, options); assert(!view.stats.playerVisible && !vest.visible);
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
// Lazy indoor views receive only the controller's same-room descriptors and floor height.
const indoorScene = new THREE.Scene(), floorY = 14.25, factoryCalls = carCreationCount();
const indoor = createActorView(indoorScene, () => floorY, { policeLimit: 4, policeCars: false });
const indoorRoot = indoorScene.children[0], indoorFind = name => indoorRoot.getObjectByName(name);
assert.equal(carCreationCount(), factoryCalls, 'car-free indoor view never invokes or allocates factory car resources');
assert(!indoorFind('Generic patrol 1'), 'indoor root contains no patrol car meshes');
assert(!indoorFind('Patrol light bar'), 'indoor root contains no car light resources');
assert(indoor.stats.materialCount <= 19, 'car-free resource bound excludes unused red/blue beacon materials');
assert(indoor.stats.geometryCount < stats.geometryCount && indoor.stats.materialCount < stats.materialCount, 'car-free view omits cloned car geometry/material resources');
const indoorState = {
  mode: 'foot', actor: { x: 0, z: 0, yaw: 0, speed: 0 }, weapon: 'unarmed',
  police: Array.from({ length: 7 }, (_, i) => ({ id: `room-officer-${i}`, mode: 'foot', active: true, health: 100, x: i * 2, z: -4, yaw: 0, speed: 2, aiming: true, shotTimer: .1, car: { x: 0, z: 0, active: true } })),
  shots: [],
};
indoorState.armour = 54;
const indoorBefore = structuredClone(indoorState), indoorOptions = { dt: .03, focus: indoorState.actor };
indoor.update(indoorState, indoorOptions);
assert.deepEqual(indoorState, indoorBefore, 'indoor view does not mutate the supplied same-room officers');
assert(indoorFind('Player body armour').visible && indoor.stats.armourVisible, 'indoor view draws the same equipped vest');
assert.equal(indoor.stats.police, 0, 'car-free view never reports rendered cars');
assert.equal(indoor.stats.officers, 4, 'indoor officers remain bounded independently of the absent car array');
assert.equal(indoor.stats.shots, 0, 'muzzle flashes do not fabricate shot streaks');
const indoorImpact = indoorFind('Non-graphic impacts'), indoorStreak = indoorFind('Brief shot streaks');
assert.equal(indoorImpact.count, 4, 'each firing indoor officer has a pooled muzzle flash');
assert(indoorImpact.visible && !indoorStreak.visible);
assert.equal(indoorFind('Adult player').position.y, floorY + .035, 'indoor actor uses the supplied room floor');
const indoorTorso = indoorFind('Officer torso'), indoorArm = indoorFind('Officer right arm'), indoorLeg = indoorFind('Officer left leg');
assert.deepEqual([...indoorTorso.geometry.attributes.position.array], [...officerTorso.geometry.attributes.position.array], 'indoor officer retains the original shared adult shape');
const gunVertices = verticesWithColor(indoorArm, 0x353a3c);
assert(gunVertices.length > 0, 'indoor right-arm batch contains the actual sidearm');
const aimedArm = new THREE.Matrix4(); indoorArm.getMatrixAt(0, aimedArm);
const muzzle = new THREE.Vector3(0, -.83, -.035).applyMatrix4(aimedArm);
const grip = new THREE.Vector3(0, -.55, -.035).applyMatrix4(aimedArm);
assert(muzzle.z < grip.z - .25 && Math.abs(muzzle.y - grip.y) < .001, 'aimed indoor sidearm points horizontally forward');
const flash = new THREE.Matrix4(); indoorImpact.getMatrixAt(0, flash);
assert(new THREE.Vector3().setFromMatrixPosition(flash).distanceTo(muzzle) < 1e-5, 'muzzle flash follows the actual aimed gun socket');
const indoorStanding = new THREE.Matrix4(); indoorTorso.getMatrixAt(0, indoorStanding);
assert(Math.abs(indoorStanding.elements[13] - floorY - .035) < 1e-5, 'officer feet use the room floor rather than exterior terrain');
const indoorPools = [];
indoorRoot.traverse(object => { if (object.isMesh) indoorPools.push([object, object.geometry, object.material, object.instanceMatrix?.array]); });
const indoorResources = [indoor.stats.geometryCount, indoor.stats.materialCount, indoor.stats.meshes];
indoorLeg.getMatrixAt(0, officerMatrix); const indoorStride = officerMatrix.toArray();
indoor.update(indoorState, indoorOptions); indoorLeg.getMatrixAt(0, officerMatrix);
assert.notDeepEqual(officerMatrix.toArray(), indoorStride, 'car-free officers retain pooled walking animation');
for (const unit of indoorState.police) { unit.aiming = false; unit.shotTimer = 0; unit.speed = 0; }
indoor.update(indoorState, indoorOptions);
indoorArm.getMatrixAt(0, officerMatrix);
assert.notDeepEqual(officerMatrix.toArray(), aimedArm.toArray(), 'clearing aim resets the pooled sidearm pose');
assert(!indoorImpact.visible && indoorImpact.count === 0, 'ending fire clears every indoor muzzle flash');
indoorState.police = [indoorState.police[2]];
indoor.update(indoorState, indoorOptions);
assert.equal(indoor.stats.officers, 1, 'only explicitly supplied same-room officers render');
indoorTorso.getMatrixAt(0, officerMatrix);
assert.equal(officerMatrix.elements[12], 4, 'remaining same-room officer is packed into the first pooled slot');
indoorState.police = []; indoorState.shots = [];
for (let i = 0; i < 20; i++) indoor.update(indoorState, indoorOptions);
assert.equal(indoor.stats.officers, 0); assert.equal(indoor.stats.police, 0);
for (const name of ['Officer torso', 'Officer left leg', 'Officer right leg', 'Officer left arm', 'Officer right arm']) {
  assert(!indoorFind(name).visible && indoorFind(name).count === 0, 'empty room clears officer instance counts and visibility');
}
assert.deepEqual([indoor.stats.geometryCount, indoor.stats.materialCount, indoor.stats.meshes], indoorResources, 'indoor updates do not grow geometry/material pools');
for (const [object, geometry, material, matrix] of indoorPools) {
  assert.equal(object.geometry, geometry); assert.equal(object.material, material); assert.equal(object.instanceMatrix?.array, matrix, 'indoor updates reuse instance buffers');
}
let indoorGeometryDisposals = 0, indoorMaterialDisposals = 0, indoorInstanceDisposals = 0;
const indoorGeometries = new Set(), indoorMaterials = new Set();
for (const [object, geometry, material] of indoorPools) {
  indoorGeometries.add(geometry); indoorMaterials.add(material);
  if (object.isInstancedMesh) object.addEventListener('dispose', () => indoorInstanceDisposals++);
}
for (const geometry of indoorGeometries) geometry.addEventListener('dispose', () => indoorGeometryDisposals++);
for (const material of indoorMaterials) material.addEventListener('dispose', () => indoorMaterialDisposals++);
indoor.dispose(); indoor.dispose(); indoor.update(indoorState, indoorOptions);
assert.equal(indoorScene.children.length, 0);
assert.equal(indoorGeometryDisposals, indoorGeometries.size); assert.equal(indoorMaterialDisposals, indoorMaterials.size);
assert.equal(indoorInstanceDisposals, 7, 'car-free instance GPU resources dispose exactly once');
assert(indoor.stats.disposed && indoor.stats.officers === 0 && indoor.stats.police === 0);
assert.equal(carCreationCount(), factoryCalls, 'car-free update/reset/disposal never touches the shared factory');
const emptyRoomScene = new THREE.Scene();
const emptyRoom = createActorView(emptyRoomScene, () => floorY, { policeLimit: 0, policeCars: false });
emptyRoom.update(indoorBefore, indoorOptions);
assert.equal(emptyRoom.stats.officers, 0); assert.equal(emptyRoom.stats.police, 0);
emptyRoom.dispose(); emptyRoom.dispose(); assert.equal(emptyRoomScene.children.length, 0, 'zero-cap safehouse view cleans up safely');
assert.equal(carCreationCount(), factoryCalls);
disposeCars();
console.log(`PASS shared rounded adult/police identity and proportions, articulation/grounding, aim/reload/melee/jump, bounded outdoor/car-free indoor officers and gun/muzzle pools, pause/culling, finite transforms, disposal; ${stats.meshes} max draws, ${normalFootDraws} normal foot draws, ${stats.triangles} triangles, ${ownedGeometries.size} geometry resources`);
