import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path,import.meta.url),'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const fleetURL = url(await read('../assets/car-arcade/fleet.js'));
const modelsURL = url((await read('../assets/car-arcade/models.js'))
  .replace("'./vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'./vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'./fleet.js'",JSON.stringify(fleetURL)));
const {createCar,disposeCars} = await import(modelsURL), {CARS} = await import(fleetURL);
const source = await read('../Games/Capital Drive/ride-service-view.js');
const {createRideServiceView} = await import(url(source
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'../../assets/car-arcade/models.js'",JSON.stringify(modelsURL))
  .replace("'../../assets/car-arcade/fleet.js'",JSON.stringify(fleetURL))));
const scene = new THREE.Scene(), heightAt = () => 12;
const view = createRideServiceView(scene,heightAt), root = scene.children[0];
const rideCar = root.getObjectByName('Yoober Lantern'), seated = root.getObjectByName('Seated ride passengers');
const waiting = root.getObjectByName('Waiting fare adult'), matrix = new THREE.Matrix4(), position = new THREE.Vector3();
const car = {id:'yoober',modelId:'lantern',x:3,z:4,yaw:0,speed:5,active:true,color:'#806495'};
const snapshot = {car,passenger:true}, job = {type:'ride',stage:0,target:{x:7,z:8,yaw:.5},passenger:false};
const original = structuredClone({snapshot,job});
view.update(snapshot,{focus:car,job,dt:.016});
assert.deepEqual({snapshot,job},original,'presentation does not mutate gameplay');
assert.equal(view.stats.cars,1); assert.equal(view.stats.playerPassenger,true); assert.equal(view.stats.waiting,1);
assert.equal(view.stats.drawCalls,10); assert.equal(view.stats.batches,3); assert.equal(root.children.length,3);
assert.equal(rideCar.children.filter(mesh=>mesh.name==='Original Yoober split-bar badges').length,1);
waiting.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
assert(Math.abs(position.y-12.035)<1e-5,'waiting adult stands on terrain');
assert.equal(position.x,job.target.x); assert.equal(position.z,job.target.z);
assert(seated.geometry.boundingBox === null); seated.geometry.computeBoundingBox();
for (const model of CARS) {
  const playerCar = {...car,modelId:model.id,yaw:0};
  view.update({car:{...car,active:false},passenger:false},{focus:car,playerCar,job:{...job,stage:1,passenger:true},dt:0});
  assert.equal(view.stats.farePassenger,true); assert.equal(view.stats.waiting,0); assert.equal(view.stats.passengers,1);
  const factory = createCar(model.id), eye = factory.userData.cockpit.eye;
  seated.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.x-playerCar.x+eye[0])<1e-5 && position.x>playerCar.x,'passenger mirrors inherited left driver seat');
  assert(Math.abs(position.z-playerCar.z-eye[2])<1e-5,'passenger shares cockpit fore/aft alignment');
  assert(position.y+seated.geometry.boundingBox.max.y < 12.18+factory.userData.dimensions.height+.02,'head below roof');
  playerCar.yaw = Math.PI/2;
  view.update(null,{focus:car,playerCar,job:{...job,passenger:true}});
  seated.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.x-playerCar.x-eye[2])<1e-5 && Math.abs(position.z-playerCar.z-eye[0])<1e-5,'passenger rotates with car');
}
view.update(snapshot,{focus:car,playerCar:car,job:{...job,passenger:true},dt:.1});
assert.equal(view.stats.passengers,2,'even conflicting supplied roles stay within two seats');
assert.equal(view.stats.waiting,0); assert.equal(view.stats.drawCalls,9);
const wheels = rideCar.userData.wheels, angles = wheels.map(wheel=>wheel.rotation.x);
for (let i=0;i<20;i++) view.update(snapshot,{focus:car,dt:0});
assert.deepEqual(wheels.map(wheel=>wheel.rotation.x),angles,'paused wheels freeze');
view.update(snapshot,{focus:car,dt:.1}); assert.notDeepEqual(wheels.map(wheel=>wheel.rotation.x),angles);
function countNodes() { let nodes=0; root.traverse(()=>nodes++); return nodes; }
const nodes = countNodes(), geometryCount = view.stats.geometryCount, materialCount = view.stats.materialCount;
for (let i=0;i<2000;i++) {
  view.update({car:{...car,id:`booking-${i}`,yaw:i*.01,color:i%2?'#806495':'#a97d42'},passenger:true},{focus:car,job,dt:.016});
  assert.equal(countNodes(),nodes); assert.equal(view.stats.geometryCount,geometryCount); assert.equal(view.stats.materialCount,materialCount);
  assert(view.stats.cars<=1 && view.stats.passengers<=2 && view.stats.waiting<=1 && view.stats.drawCalls<=10);
}
view.update({car:{...car,x:NaN,yaw:Infinity,speed:Infinity},passenger:true},{focus:{x:NaN,z:Infinity},playerCar:{x:NaN,z:0},job:{...job,target:{x:Infinity,z:0}},dt:NaN});
assert.equal(view.stats.drawCalls,0,'invalid inputs never retain visible populations');
root.traverse(object=>{
  if (object.isInstancedMesh) assert(Array.from(object.instanceMatrix.array).every(Number.isFinite));
  assert([...object.position.toArray(),...object.rotation.toArray().slice(0,3)].every(Number.isFinite));
});
view.update(snapshot,{focus:{x:5000,z:5000},job,dt:.1}); assert.equal(view.stats.drawCalls,0,'all roles cull locally');
view.update(null); assert.equal(rideCar.visible,false,'missing booking hides car');
view.update({car:{...car,yaw:NaN,speed:NaN},passenger:true},{focus:car,dt:Infinity});
assert.equal(view.stats.passengers,1,'non-finite optional yaw/dt are safely normalized');
const factory = createCar('lantern',{color:'#806495'}), factoryPaint = factory.children[0].material.color.getHex();
assert.notEqual(factory.children[0].material,rideCar.children[0].material,'paint is privately owned');
assert.notEqual(factory.children[0].geometry,rideCar.children[0].geometry,'geometry is privately owned');
view.update({car:{...car,color:'#ff5500'},passenger:false},{focus:car});
assert.equal(factory.children[0].material.color.getHex(),factoryPaint,'booking paint cannot recolor factory cars');
let geometryDisposals=0, materialDisposals=0, instanceDisposals=0, sharedDisposals=0;
const geometries = new Set(), materials = new Set();
root.traverse(mesh=>{if(mesh.isMesh){geometries.add(mesh.geometry);materials.add(mesh.material);if(mesh.isInstancedMesh)mesh.addEventListener('dispose',()=>instanceDisposals++);}});
for (const geometry of geometries) geometry.addEventListener('dispose',()=>geometryDisposals++);
for (const material of materials) material.addEventListener('dispose',()=>materialDisposals++);
factory.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.addEventListener('dispose',()=>sharedDisposals++);mesh.material.addEventListener('dispose',()=>sharedDisposals++);}});
view.dispose(); view.dispose(); view.update(snapshot,{focus:car,job});
assert.equal(scene.children.length,0); assert.equal(geometryDisposals,geometryCount); assert.equal(materialDisposals,materialCount); assert.equal(instanceDisposals,2);
assert.equal(sharedDisposals,0); assert(view.stats.disposed && view.stats.drawCalls===0 && view.stats.passengers===0);
assert(!/requestAnimationFrame|setInterval|fetch\(|CanvasTexture|TextureLoader|FontLoader|new THREE\..*Light/.test(source),'no extra clocks, loads, textures or lights');
disposeCars();
console.log('PASS Yoober single-car / three-batch limits, all 16 passenger seats and roofs, original badges, waiting/boarding/culling, pause, 2000 booking node/resource stability, finite transforms and isolated exact disposal');
