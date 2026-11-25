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
const { appearanceForPerson, PERSON_MODEL } = await import(personURL);
const actorURL = dataURL((await read('../Games/Capital Drive/actor-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'./car-model.js'", JSON.stringify(modelsURL))
  .replace("'./person-model.js'", JSON.stringify(personURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL)));
const { createActorView } = await import(actorURL);
const scene = new THREE.Scene();
const view = createActorView(scene, () => 2, { policeLimit: 0 });
const root = scene.children[0], actor = root.getObjectByName('Adult player');
assert.equal(actor.getObjectByName('Head').position.y, PERSON_MODEL.head.y, 'weapon rig retains shared adult head height');
assert.equal(actor.scale.y, appearanceForPerson('player').height, 'weapon rig uses the same identity scale as seated player');
const names = { pistol: 'Pistol', shotgun: 'Shotgun', smg: 'SMG', carbine: 'Carbine', sniper: 'Sniper rifle', rpg: 'RPG launcher' };
const state = { mode: 'foot', actor: { x: 0, z: 0, yaw: 0, speed: 0 }, weapon: 'unarmed', aiming: false, attackTimer: 0, reloading: 0, shots: [] };
const options = { dt: 1 / 60, focus: state.actor };
// Pose fixtures hold authoritative state while the real view samples half a
// second of normal render dt. A single frame now observes a transition.
const settlePose = () => { for (let frame = 0; frame < 30; frame++) view.update(state, options); };
const weapons = Object.fromEntries(Object.entries(names).map(([id, name]) => [id, root.getObjectByName(name)]));
const shoulders = [], elbows = [];
actor.traverse(object => { if (object.name === 'Shoulder') shoulders.push(object); if (object.name === 'Elbow') elbows.push(object); });
const resources = () => [view.stats.meshes, view.stats.geometryCount, view.stats.materialCount, view.stats.triangles];
const initialResources = resources(), bounds = {}, triangles = {};
for (const [id, weapon] of Object.entries(weapons)) {
  assert.equal(weapon.children.length, 1, `${id} merged to one draw`);
  const mesh = weapon.children[0]; mesh.geometry.computeBoundingBox();
  bounds[id] = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  triangles[id] = mesh.geometry.index.count / 3;
  assert([...mesh.geometry.attributes.position.array].every(Number.isFinite));
}
assert(bounds.pistol.z < .3, 'short pistol silhouette');
assert(bounds.shotgun.z > 1 && bounds.carbine.z > 1, 'long barrel and stock silhouettes');
assert(bounds.smg.z > .6 && bounds.smg.z < .8 && bounds.smg.y > .3, 'compact SMG with protruding magazine');
assert.equal(new Set(['pistol', 'shotgun', 'smg', 'carbine'].map(id => triangles[id])).size, 4, 'original authored part counts remain distinct');
assert(Object.values(triangles).every(count => count > 0 && count < 1000), 'each silhouette has a fixed small geometry budget');
assert.equal(new Set(Object.values(bounds).map(size => size.toArray().join(','))).size, Object.keys(names).length, 'distinct weapon bounds');
for (const id of Object.keys(weapons)) {
  state.weapon = id; state.aiming = true;
  state.shots = [{ kind: id, x: 0, z: 0, endX: 2, endZ: -15, life: .1 }];
  const before = structuredClone(state); view.update(state, options); settlePose();
  assert.deepEqual(state, before, 'view does not mutate gameplay');
  assert.equal(view.stats.activeWeapon, id); assert.equal(view.stats.weaponMeshes, Object.keys(names).length);
  assert.equal(view.stats.shots, 1, `${id} trace visible`);
  for (const [other, weapon] of Object.entries(weapons)) assert.equal(weapon.visible, other === id);
  assert(shoulders[1].rotation.x > 1.5 && shoulders[0].rotation.x > 1, `${id} two-arm aim`);
  root.updateMatrixWorld(true);
  const direction = new THREE.Vector3(0, 0, -1).transformDirection(weapons[id].matrixWorld);
  assert(direction.z < -.9 && Math.abs(direction.y) < .15, `${id} aims forward`);
  const weaponBounds = new THREE.Box3().setFromObject(weapons[id]);
  const handPosition = elbows[1].getWorldPosition(new THREE.Vector3());
  assert(weaponBounds.max.y > handPosition.y - .4 && weaponBounds.min.y < handPosition.y + .2, `${id} stays at the articulated hand`);
  const aiming = elbows[1].rotation.x;
  const aimedShoulder = shoulders[1].rotation.x;
  state.reloading = 1; view.update(state, options);
  assert(shoulders[1].rotation.x < aimedShoulder && shoulders[1].rotation.x > .65, `${id} reload eases toward its target`);
  settlePose();
  assert(shoulders[1].rotation.x < 1 && elbows[1].rotation.x > aiming, `${id} reload toward chest`);
  assert(shoulders[0].rotation.z > .5, `${id} support hand comes inward during reload`);
  state.reloading = 0;
}
for (let i = 0; i < 200; i++) {
  state.weapon = Object.keys(weapons)[i % Object.keys(weapons).length]; state.aiming = !!(i % 2); state.actor.speed = i % 7;
  view.update(state, options);
}
assert.deepEqual(resources(), initialResources, 'switching/aim/reload creates no new render resources');
state.actor.speed=0;
for(const personId of ['player:student','player:corporate','player:basement','player']) {
  assert(view.setPlayerAppearance(personId));
  for(const id of Object.keys(weapons)) {
    state.weapon=id; state.aiming=false; view.update(state,options); settlePose(); root.updateMatrixWorld(true);
    assert(new THREE.Box3().setFromObject(weapons[id]).min.y>=2,`${personId} carries ${id} above the ground`);
    state.aiming=true; view.update(state,options); settlePose(); root.updateMatrixWorld(true);
    const direction=new THREE.Vector3(0,0,-1).transformDirection(weapons[id].matrixWorld);
    assert(direction.z<-.9 && Math.abs(direction.y)<.15,`${personId} preserves ${id} forward aim`);
  }
}
assert.deepEqual(resources(),initialResources,'hero changes preserve weapon geometry/material budgets');
state.weapon = 'unarmed'; state.aiming = false; state.attackTimer = .15; state.actor.speed = 0;
view.update(state, options); settlePose();
assert.equal(view.stats.activeWeapon, null);
assert(Object.values(weapons).every(weapon => !weapon.visible));
assert(shoulders[1].rotation.x > 1.8, 'fist strike preserved');
state.weapon = 'unknown'; view.update(state, options);
assert.equal(view.stats.activeWeapon, null);
state.mode = 'vehicle'; view.update(state, options);
assert.equal(view.stats.activeWeapon, null); assert(!actor.visible);
state.mode = 'foot'; state.weapon = 'carbine';
view.update(state, { dt: .1, focus: { x: 5000, z: 5000 } });
const visible = []; root.traverseVisible(object => { if (object.isMesh) visible.push(object.name); });
assert.equal(view.stats.drawCalls, 0, visible.join(',')); assert.equal(view.stats.activeWeapon, null);
state.actor = { x: NaN, z: Infinity, yaw: NaN, speed: NaN }; state.reloading = Infinity;
view.update(state, { dt: NaN, focus: { x: NaN, z: Infinity } });
root.traverse(object => {
  assert([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()].every(Number.isFinite), object.name);
});
const geometries = new Set(), materials = new Set(); let geometryDisposals = 0, materialDisposals = 0;
root.traverse(object => { if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); } });
for (const geometry of geometries) geometry.addEventListener('dispose', () => geometryDisposals++);
for (const material of materials) material.addEventListener('dispose', () => materialDisposals++);
view.dispose(); view.dispose(); view.update(state, options);
assert.equal(geometryDisposals, geometries.size); assert.equal(materialDisposals, materials.size);
assert.equal(view.stats.activeWeapon, null); assert.equal(scene.children.length, 0);
// Police sidearms stay in the existing right-arm batch and reuse the impact pool for muzzle flashes.
const patrolView=createActorView(scene,()=>0,{policeLimit:1});
const patrolRoot=scene.children[0],rightArm=patrolRoot.getObjectByName('Officer right arm');
rightArm.geometry.computeBoundingBox();
assert(rightArm.geometry.boundingBox.min.y<-.8,'readable sidearm barrel extends past the officer hand');
const officer={id:'armed-patrol',x:0,z:0,yaw:0,speed:0,health:100,mode:'foot',aiming:true,shotTimer:.13,
  car:{x:1000,z:1000,active:true,yaw:0}};
const patrolState={mode:'vehicle',actor:{x:0,z:0},weapon:'unarmed',shots:[],police:[officer]};
patrolView.update(patrolState,{dt:1/60,focus:{x:0,z:0}});
const armMatrix=new THREE.Matrix4();rightArm.getMatrixAt(0,armMatrix);
const barrelDirection=new THREE.Vector3(0,-1,0).transformDirection(armMatrix);
assert(barrelDirection.z<-.99,'raised officer sidearm aims horizontally forward');
const pooledImpacts=patrolRoot.getObjectByName('Non-graphic impacts');
assert.equal(pooledImpacts.count,1,'officer muzzle flash reuses the bounded impact pool');
const patrolBudget=[patrolView.stats.meshes,patrolView.stats.geometryCount,patrolView.stats.materialCount];
for(let i=0;i<100;i++){officer.aiming=!!(i%2);officer.shotTimer=i%3?.1:0;patrolView.update(patrolState,{dt:1/60,focus:{x:0,z:0}});}
assert.deepEqual([patrolView.stats.meshes,patrolView.stats.geometryCount,patrolView.stats.materialCount],patrolBudget);
officer.shotTimer=0;patrolView.update(patrolState,{dt:0,focus:{x:0,z:0}});assert.equal(pooledImpacts.count,0);
patrolView.dispose();assert.equal(scene.children.length,0);
disposeCars();
console.log(`PASS six distinct original weapon silhouettes; selected visibility, aim/reload, all shot kinds, fists, finite/cull, bounded resources and exact disposal; ${initialResources.join('/')} meshes/geometries/materials/triangles`);
