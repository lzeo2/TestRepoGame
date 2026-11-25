import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const fleetURL=url(await read('../assets/car-arcade/fleet.js')),{CARS}=await import(fleetURL);
const modelsURL=url((await read('../assets/car-arcade/models.js'))
 .replace("'./vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'./vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
 .replace("'./fleet.js'",JSON.stringify(fleetURL)));
const {createCar,disposeCars}=await import(modelsURL);
const personURL=url((await read('../Games/Capital Drive/person-model.js')).replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)));
const {appearanceForPerson,emitPersonParts,PERSON_MODEL}=await import(personURL);
let factoryCalls=0;
const countedModelsURL=url(`import {createCar as factory} from ${JSON.stringify(modelsURL)};
 export const createCar=(...args)=>{globalThis.__crewSeatFactoryCall();return factory(...args);};`);
globalThis.__crewSeatFactoryCall=()=>factoryCalls++;
const {createCampaignScenesView}=await import(url((await read('../Games/Capital Drive/campaign-scenes-view.js'))
 .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
 .replace("'../../assets/car-arcade/models.js'",JSON.stringify(countedModelsURL))
 .replace("'../../assets/car-arcade/fleet.js'",JSON.stringify(fleetURL))
 .replace("'./person-model.js'",JSON.stringify(personURL))));
const scene=new THREE.Scene(),heightAt=(x,z)=>x*.12+z*.18;
const view=createCampaignScenesView(scene,heightAt),root=scene.children[0];
const batches=Object.fromEntries(root.children.map(mesh=>[mesh.name.replace('Meeting ',''),mesh]));
const resources=root.children.map(mesh=>[mesh.geometry,mesh.material,mesh.instanceMatrix.array,mesh.instanceColor.array]);
assert.equal(root.children.length,7);assert.equal(new Set(root.children.map(mesh=>mesh.geometry)).size,3);
assert.equal(new Set(root.children.map(mesh=>mesh.material)).size,1);
const allocatedCalls=factoryCalls;
const identities=['player:corporate','player:basement'];
const crew=model=>identities.map((appearanceId,seatIndex)=>({id:`campaign-ally:${appearanceId.slice(7)}`,appearanceId,
 x:3,z:4,yaw:.7,gesturePhase:1,active:true,armed:true,mode:'passenger',seated:true,carModelId:model,
 vehicleId:'player',vehicleKey:'fixture-car',seatIndex,shot:null}));
const matrix=new THREE.Matrix4(),body=new THREE.Object3D(),seat=new THREE.Object3D(),part=new THREE.Object3D(),expected=new THREE.Matrix4();
const inverseBody=new THREE.Matrix4(),local=new THREE.Matrix4(),point=new THREE.Vector3(),tint=new THREE.Color();
const compare=(actual,wanted,message)=>actual.elements.forEach((value,index)=>assert(Math.abs(value-wanted.elements[index])<2e-6,message));
for(const model of CARS)for(const yaw of [0,.7,Math.PI/2]) {
 const people=crew(model.id).map(person=>({...person,yaw})),before=structuredClone(people);
 view.update(people,people[0]);assert.deepEqual(people,before,'rendering preserves authoritative descriptors');
 assert.equal(view.stats.people,2);assert.equal(view.stats.drawCalls,7);assert.equal(view.stats.maxDrawCalls,7);
 assert.equal(batches.shoes.count,4,'seated crew have two shoes each, without gun, cup or tracer');
 for(const [name,mesh]of Object.entries(batches))assert.equal(mesh.count,['torso','head','hair'].includes(name)?2:4);
 const eye=createCar(model.id).userData.cockpit.eye,fit=Math.min(1,(model.height-eye[1]-.025)/PERSON_MODEL.seatedHeadTop);
 assert(eye[0]>0,'driver sits on the right (right-hand-drive seating, 4069e5d0)');
 body.position.set(3,heightAt(3,4)+.18,4);
 const sin=Math.sin(yaw),cos=Math.cos(yaw);
 body.rotation.set(Math.atan2(heightAt(3-sin*2,4-cos*2)-heightAt(3+sin*2,4+cos*2),4),yaw,0,'YXZ');body.updateMatrix();
 inverseBody.copy(body.matrix).invert();
 for(let personIndex=0;personIndex<2;personIndex++) {
  const person=people[personIndex],appearance=appearanceForPerson(person.appearanceId),indices={};
  seat.position.set(-eye[0],eye[1],eye[2]+(personIndex?Math.min(.78,model.length*.18):0));seat.scale.setScalar(fit);seat.updateMatrix();
  emitPersonParts(appearance,{kind:'driver'},(name,x,y,z,sx,sy,sz,shade,rx=0)=>{
   const ownIndex=indices[name]||0;indices[name]=ownIndex+1;
   const index=personIndex*(['torso','head','hair'].includes(name)?1:2)+ownIndex;
   part.position.set(x,y,z);part.rotation.set(rx,0,0);part.scale.set(sx,sy,sz);part.updateMatrix();
   expected.multiplyMatrices(body.matrix,seat.matrix).multiply(part.matrix);batches[name].getMatrixAt(index,matrix);
   compare(matrix,expected,`${model.id} ${name} uses actual tilted cabin and shared bent seated rig`);
   batches[name].getColorAt(index,tint);
   assert.deepEqual(tint.toArray(),Array.from(new Float32Array(new THREE.Color(shade).toArray())),'person palette stays attached to identity');
  });
  for(const name of ['head','hair']) {
   const mesh=batches[name];mesh.getMatrixAt(personIndex,matrix);local.multiplyMatrices(inverseBody,matrix);
   mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(local);
   assert(bounds.max.y<model.height-.02,'rounded head stays below actual car roof plane');
   assert(bounds.getCenter(point).x<0,'crew sit opposite the right-hand driver');
  }
 }
}
for(let frame=0;frame<200;frame++) {
 const people=crew(CARS[frame%CARS.length].id);if(frame%2)people.reverse();view.update(people,people[0]);
 root.children.forEach((mesh,index)=>{
  assert.equal(mesh.geometry,resources[index][0]);assert.equal(mesh.material,resources[index][1]);
  assert.equal(mesh.instanceMatrix.array,resources[index][2]);assert.equal(mesh.instanceColor.array,resources[index][3]);
  assert(mesh.count<=mesh.instanceMatrix.count);assert([...mesh.instanceMatrix.array].every(Number.isFinite));
 });
 people.forEach((person,index)=>{batches.torso.getColorAt(index,tint);assert.equal(tint.getHex(),appearanceForPerson(person.appearanceId).shirt);});
}
assert.equal(factoryCalls,allocatedCalls,'all cabins are prepared before updates, without frame-time car creation');
const firing=crew('relay').map(person=>({...person,shot:{remaining:.1,from:{x:4.15,z:person.seatIndex?4.65:3.65},to:{x:10,z:4}}}));
view.update(firing,firing[0]);assert.equal(batches.shoes.count,12,'each active seated shot adds a pooled window gun and tracer');
for(let index=0;index<2;index++) {
 const person=firing[index],shot=person.shot,dx=shot.to.x-shot.from.x,dz=shot.to.z-shot.from.z;
 const eye=createCar('relay').userData.cockpit.eye,fit=Math.min(1,(CARS.find(car=>car.id==='relay').height-eye[1]-.025)/PERSON_MODEL.seatedHeadTop);
 const gun=new THREE.Object3D();gun.position.set(shot.from.x,heightAt(person.x,person.z)+.18+eye[1]-.32*fit,shot.from.z);
 gun.rotation.set(0,Math.atan2(-dx,-dz),0);gun.updateMatrix();
 part.position.set(0,0,-.06);part.rotation.set(0,0,0);part.scale.set(.09,.10,.26);part.updateMatrix();
 expected.multiplyMatrices(gun.matrix,part.matrix);batches.shoes.getMatrixAt(index*6+2,matrix);
 compare(matrix,expected,'seated gun follows authoritative world window muzzle and aim');
 batches.shoes.getMatrixAt(index*6+5,matrix);point.setFromMatrixPosition(matrix);
 assert(Math.abs(point.x-(shot.from.x+shot.to.x)/2)<1e-6&&Math.abs(point.z-(shot.from.z+shot.to.z)/2)<1e-6,'window tracer uses actual shot endpoints');
}
view.update(firing.map(person=>({...person,shot:{...person.shot,remaining:0}})));assert.equal(batches.shoes.count,4,'expired shots remove window guns and tracers');
view.update([...crew('relay'),...crew('lantern')]);assert.equal(view.stats.people,2,'population remains capped at two');
const seated=crew('relay');
for(const invalid of [{seatIndex:-1},{seatIndex:2},{carModelId:'missing'},{yaw:NaN},{active:false}]) {
 view.update([{...seated[0],...invalid}]);assert.equal(view.stats.people,0,'invalid seated descriptor is hidden');
}
view.update(seated,{x:1000,z:1000});assert.equal(view.stats.drawCalls,0);
view.update(seated);view.update([]);assert.equal(view.stats.people,0);assert(root.children.every(mesh=>!mesh.visible&&mesh.count===0));
const standing={...seated[0],seated:false,mode:'combat'};view.update([standing]);assert(batches.shoes.count>=5,'standing armed crew keeps existing weapon presentation');
let geometries=0,materials=0,instances=0,borrowedDisposals=0;
new Set(root.children.map(mesh=>mesh.geometry)).forEach(geometry=>geometry.addEventListener('dispose',()=>geometries++));
root.children[0].material.addEventListener('dispose',()=>materials++);root.children.forEach(mesh=>mesh.addEventListener('dispose',()=>instances++));
const borrowed=createCar('relay');borrowed.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.addEventListener('dispose',()=>borrowedDisposals++);});
view.dispose();view.dispose();view.update(seated);
assert.equal(scene.children.length,0);assert.equal(geometries,3);assert.equal(materials,1);assert.equal(instances,7);
assert.equal(borrowedDisposals,0,'view disposal preserves borrowed car factory resources');assert(view.stats.disposed);assert.equal(view.stats.people,0);
delete globalThis.__crewSeatFactoryCall;disposeCars();
console.log('PASS crew seats: all16 actual cockpits, front/rear passenger matrices and terrain pitch, shared bent seated rig, identities, two people/seven stable batches, actual active-shot window guns/tracers, no frame-time car creation, culling/guards and exact disposal');
