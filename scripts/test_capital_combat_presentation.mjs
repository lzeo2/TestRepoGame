import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Execute the actual vendored Three/factory source without repository package changes.
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const threeURL = dataURL(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = dataURL((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'", JSON.stringify(threeURL)));
const fleetURL = dataURL(await read('../assets/car-arcade/fleet.js'));
const baseModelsURL = dataURL((await read('../assets/car-arcade/models.js'))
  .replace("'./vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'./vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'./fleet.js'", JSON.stringify(fleetURL)));
const modelsURL = dataURL((await read('../Games/Capital Drive/car-model.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'", JSON.stringify(utilsURL))
  .replace("'../../assets/car-arcade/models.js'", JSON.stringify(baseModelsURL)));
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
const borrowed = createCar('relay', { color: '#e5e6df' });
const borrowedBuffers = [];
borrowed.traverse(object => { if (object.isMesh) borrowedBuffers.push([object, [...object.geometry.attributes.position.array], object.material]); });
const scene = new THREE.Scene(), floor = (x,z) => 10 + x*.02 + z*.01;
const view = createActorView(scene, floor), root = scene.children[0];
const find = name => root.getObjectByName(name), streak = find('Brief shot streaks'), impacts = find('Non-graphic impacts');
const state = { mode:'foot', actor:{x:2,z:3,yaw:.4,speed:5,aimPitch:0}, weapon:'carbine', aiming:true,
  attackTimer:0,reloading:0,police:[],shots:[],combatFeedback:{shotSerial:0,recoil:0} };
const options = {dt:1/60,focus:state.actor};
const originalResources = [view.stats.meshes,view.stats.geometryCount,view.stats.materialCount];
const pooled = [];
root.traverse(object => { if (object.isMesh) pooled.push([object,object.geometry,object.material,object.instanceMatrix?.array]); });
const matrix = new THREE.Matrix4();
const close = (actual,expected,message) => assert(actual.distanceTo(expected)<2e-5, `${message}: ${actual.toArray()} / ${expected.toArray()}`);
function assertTrace(shot,start,end) {
  state.shots=[shot]; const before=structuredClone(state); view.update(state,options);
  assert.deepEqual(state,before,'presentation never mutates authoritative state');
  assert.equal(streak.count,1); streak.getMatrixAt(0,matrix);
  close(new THREE.Vector3(0,0,-.5).applyMatrix4(matrix),start,'unit-box rear face follows exact 3D origin');
  close(new THREE.Vector3(0,0,.5).applyMatrix4(matrix),end,'unit-box front face follows exact 3D endpoint');
  assert(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).z-start.distanceTo(end))<2e-5,'true 3D length, including elevation');
  assert.equal(streak.geometry.type,'BoxGeometry','assertions transform the actual rendered geometry');
}
for (const delta of [12,-8]) {
  const start=new THREE.Vector3(2,11.35,3),end=new THREE.Vector3(5,11.35+delta,-6);
  assertTrace({x:start.x,y:start.y,z:start.z,endX:end.x,endY:end.y,endZ:end.z,life:.1,kind:'carbine'},start,end);
}
assertTrace({x:2,y:11,z:3,endX:2,endY:19,endZ:3,life:.1},new THREE.Vector3(2,11,3),new THREE.Vector3(2,19,3));
assertTrace({x:2,z:3,endX:5,endZ:-6,life:.1},new THREE.Vector3(2,floor(2,3)+1.35,3),new THREE.Vector3(5,floor(5,-6)+1.1,-6));
state.shots=[];
for(const pitch of [-.65,0,.7]) {
  state.actor.aimPitch=pitch; view.update(state,options); root.updateMatrixWorld(true);
  const barrel=new THREE.Vector3(0,0,-1).transformDirection(find('Carbine').matrixWorld);
  const direction=new THREE.Vector3(-Math.sin(.4)*Math.cos(pitch),Math.sin(pitch),-Math.cos(.4)*Math.cos(pitch));
  close(barrel,direction,'articulated gun follows positive-up camera pitch');
}
state.aiming=false;state.attackTimer=.15;state.actor.aimPitch=.5;
view.update(state,options);root.updateMatrixWorld(true);
assert(new THREE.Vector3(0,0,-1).transformDirection(find('Carbine').matrixWorld).y>.4,'firing raises gun even without held aim');
state.attackTimer=0;state.aiming=true;state.combatFeedback.recoil=.5;
view.update(state,options);root.updateMatrixWorld(true);
assert(Math.abs(new THREE.Vector3(0,0,-1).transformDirection(find('Carbine').matrixWorld).y-Math.sin(.56))<1e-6,'supplied recoil drives a bounded visual kick');
state.combatFeedback.recoil=0;
const shot={x:2,y:11.35,z:3,endX:2,endY:15,endZ:-8,life:.13,kind:'carbine',shotSerial:1,interiorId:'room-a'};
state.shots=[shot];view.update(state,options);
assert.equal(impacts.count,1,'zero shot serial cannot fabricate a muzzle flash');
state.combatFeedback.shotSerial=1;view.update(state,options);root.updateMatrixWorld(true);
assert.equal(impacts.count,2,'one authoritative shot creates only one pooled player flash');
const weapon=find('Carbine'), geometry=weapon.children[0].geometry;
geometry.computeBoundingBox();
const muzzle=new THREE.Vector3(0,.035,geometry.boundingBox.min.z).applyMatrix4(weapon.matrixWorld);
impacts.getMatrixAt(1,matrix);
close(new THREE.Vector3().setFromMatrixPosition(matrix),muzzle,'flash is on the actual pitched barrel tip');
const flashPaused=matrix.toArray();
for(let i=0;i<10;i++) view.update(state,{...options,dt:0,time:i*1000});
impacts.getMatrixAt(1,matrix);assert.deepEqual(matrix.toArray(),flashPaused,'zero dt cannot advance flash or introduce a wall clock');
view.update(state,{...options,dt:.06});assert.equal(impacts.count,1,'flash expires with supplied active dt despite a repeated shot serial');
state.shots=[];view.update(state,options);assert(!impacts.visible && impacts.count===0,'changing to an empty room clears all effects immediately');
state.shots=[{...shot,shotSerial:2,interiorId:'room-b'}];state.combatFeedback.shotSerial=2;view.update(state,options);
assert.equal(impacts.count,2,'new room can present its own new shot');
state.shots=[];view.update(state,options);state.shots=[{...shot,life:.04}];view.update(state,options);
assert.equal(impacts.count,1,'old room shot cannot restart a flash');
for(const invalid of [{y:NaN},{endY:Infinity},{endX:NaN},{x:Infinity},{endX:1e308},{life:0}]) {
  state.shots=[{...shot,...invalid}]; view.update(state,options); assert.equal(streak.count,0,'invalid or expired shot cannot write a trace matrix');
}
state.shots=Array.from({length:100},(_,i)=>({...shot,endX:2+i*.01,shotSerial:3}));state.combatFeedback.shotSerial=3;
view.update(state,options);assert.equal(streak.count,8,'trace pool keeps the established eight-instance bound');
assert(impacts.count<=16,'impacts plus existing officer/player flashes have a fixed cap');
view.update(state,{...options,focus:{x:5000,z:5000}});
assert(!streak.visible && !impacts.visible,'far traces and player muzzle flash are culled together');
for(let i=0;i<100;i++) { state.actor.aimPitch=i%2?.7:-.7;view.update(state,options); }
assert.deepEqual([view.stats.meshes,view.stats.geometryCount,view.stats.materialCount],originalResources,'aiming and firing cannot grow render resource counts');
for(const [object,geometry,material,array] of pooled) {
  assert.equal(object.geometry,geometry);assert.equal(object.material,material);assert.equal(object.instanceMatrix?.array,array,'pooled matrices retain their buffers');
  if(array) assert([...array].every(Number.isFinite),'all written GPU transforms remain finite');
}
for(const [object,positions,material] of borrowedBuffers) {
  assert.deepEqual([...object.geometry.attributes.position.array],positions,'gun poses preserve borrowed factory geometry');assert.equal(object.material,material);
}
const geometries=new Set(pooled.map(([,geometry])=>geometry)),materials=new Set(pooled.map(([,,material])=>material));
let geometryDisposals=0,materialDisposals=0,instanceDisposals=0;
for(const geometry of geometries) geometry.addEventListener('dispose',()=>geometryDisposals++);
for(const material of materials) material.addEventListener('dispose',()=>materialDisposals++);
for(const [object] of pooled) if(object.isInstancedMesh) object.addEventListener('dispose',()=>instanceDisposals++);
view.dispose();view.dispose();view.update(state,options);
assert.equal(scene.children.length,0);assert.equal(geometryDisposals,geometries.size);assert.equal(materialDisposals,materials.size);assert.equal(instanceDisposals,7);
disposeCars();
console.log('PASS actual Three 3D upward/downward/legacy trace matrices, positive-up aim/fire/recoil rig, authoritative barrel flash/pause/expiry, room/cull clearing, invalid shots, bounded reused resources and disposal');
