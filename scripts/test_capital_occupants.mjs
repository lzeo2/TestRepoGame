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
const occupantsURL = dataURL((await read('../Games/Capital Drive/vehicle-occupants-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL))
  .replace("'../../assets/car-arcade/models.js'",JSON.stringify(modelsURL))
  .replace("'../../assets/car-arcade/fleet.js'",JSON.stringify(fleetURL)));
const {createVehicleOccupantsView} = await import(occupantsURL);
const {CARS} = await import(fleetURL);
const scene = new THREE.Scene(), heightAt = (x,z) => x*.002+z*.001;
const view = createVehicleOccupantsView(scene,heightAt), root = scene.children[0];
const drivers = root.getObjectByName('Seated adult drivers');
const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
for (const model of CARS) {
  const car = {id:model.id,modelId:model.id,x:3,z:4,yaw:0,occupied:true,active:true};
  const before = structuredClone(car);
  view.update(.016,{cars:[car],focus:car});
  assert.deepEqual(car,before,'descriptor is not mutated');
  assert.equal(view.stats.drivers,1);
  drivers.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  const factory = createCar(model.id), eye = factory.userData.cockpit.eye;
  assert(Math.abs(position.x-car.x-eye[0])<1e-6 && eye[0]<0,'driver shares baked left cockpit seat');
  assert(Math.abs(position.z-car.z-eye[2])<1e-6,'head aligns with model cockpit');
  const headTop = position.y+.14;
  assert(headTop < heightAt(car.x,car.z)+factory.userData.dimensions.height+.02,'head stays inside roof envelope');
  car.yaw = Math.PI/2; view.update(0,{cars:[car],focus:car});
  drivers.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.x-car.x-eye[2])<1e-6 && Math.abs(position.z-car.z+eye[0])<1e-6,'seat rotates with car');
}
const cars = Array.from({length:100},(_,id)=>({id,modelId:'relay',x:id,z:0,yaw:0,occupied:true}));
view.update(.016,{cars,focus:{x:0,z:0}}); assert.equal(view.stats.drivers,64,'driver pool bounded');
view.update(.016,{cars:[{...cars[0],occupied:false},{...cars[1],active:false},{...cars[2],x:NaN}],focus:{x:0,z:0}});
assert.equal(view.stats.drivers,0,'empty, inactive and invalid cars have no driver');
assert(view.addExit({id:'first',x:0,z:0,yaw:0}));
assert(!view.addExit({id:'first',x:0,z:0,yaw:0}),'duplicate exit event is ignored');
assert(!view.addExit({id:'bad',x:NaN,z:0}));
for(let id=0;id<30;id++) view.addExit({id,x:0,z:0,yaw:.4});
view.update(.05,{cars,focus:{x:0,z:0}});
assert.equal(view.stats.exits,12,'displaced pool bounded'); assert.equal(view.stats.drawCalls,4,'all adults use four draws');
function buffers() { return root.children.map(mesh=>Array.from(mesh.instanceMatrix.array)); }
const beforePause = buffers(); for(let i=0;i<10;i++) view.update(0,{cars,focus:{x:0,z:0}});
assert.deepEqual(buffers(),beforePause,'zero dt freezes displaced walking');
view.update(.1,{cars,focus:{x:0,z:0}}); assert.notDeepEqual(buffers(),beforePause,'displaced adults walk away');
view.update(NaN,{cars:[{x:NaN,z:0,occupied:true}],focus:{x:NaN,z:Infinity}});
for(const buffer of buffers()) assert(buffer.every(Number.isFinite),'finite instance transforms');
view.update(0,{cars,focus:{x:5000,z:5000}}); assert.equal(view.stats.drawCalls,0,'all populations culled at distance');
for(let i=0;i<125;i++) view.update(.1,{cars:[],focus:{x:0,z:0}});
assert.equal(view.stats.exits,0,'displaced adults expire');
let geometryDisposals=0, materialDisposals=0, instanceDisposals=0;
for(const mesh of root.children) { mesh.geometry.addEventListener('dispose',()=>geometryDisposals++); mesh.addEventListener('dispose',()=>instanceDisposals++); }
root.children[0].material.addEventListener('dispose',()=>materialDisposals++);
const borrowed = createCar('relay'); let sharedDisposals=0;
borrowed.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.addEventListener('dispose',()=>sharedDisposals++);});
view.dispose(); view.dispose(); view.update(.1,{cars});
assert.equal(scene.children.length,0); assert.equal(geometryDisposals,4); assert.equal(materialDisposals,1); assert.equal(instanceDisposals,4);
assert.equal(sharedDisposals,0,'shared factory resources remain live'); assert(view.stats.disposed && view.stats.drawCalls===0);
disposeCars();
console.log('PASS all 16 model cockpit seats/roof envelopes/rotation, occupancy/culling, bounded 64 drivers and 12 animated exits in four draws, pause/expiry/finite transforms and exact disposal');
