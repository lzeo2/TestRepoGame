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
const peopleURL = dataURL((await read('../Games/Capital Drive/person-model.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)));
const {appearanceForPerson,PERSON_MODEL} = await import(peopleURL);
const { createCar, disposeCars } = await import(modelsURL);
const occupantsURL = dataURL((await read('../Games/Capital Drive/vehicle-occupants-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL))
  .replace("'../../assets/car-arcade/models.js'",JSON.stringify(modelsURL))
  .replace("'../../assets/car-arcade/fleet.js'",JSON.stringify(fleetURL))
  .replace("'./person-model.js'",JSON.stringify(peopleURL)));
const {createVehicleOccupantsView} = await import(occupantsURL);
const {CARS} = await import(fleetURL);
const scene = new THREE.Scene(), heightAt = (x,z) => x*.002+z*.001;
const view = createVehicleOccupantsView(scene,heightAt), root = scene.children[0];
const batches = Object.fromEntries(root.children.map(mesh=>[mesh.name.replace('Vehicle occupant ',''),mesh]));
assert.equal(root.children.length,7,'one bounded batch per shared-model part');
const uniqueGeometry = new Set(root.children.map(mesh=>mesh.geometry));
assert.equal(uniqueGeometry.size,3); assert.equal(new Set(root.children.map(mesh=>mesh.material)).size,1);
for(const [name,mesh] of Object.entries(batches)) {
  assert.equal(mesh.geometry.type,{capsule:'CapsuleGeometry',sphere:'SphereGeometry',box:'BoxGeometry'}[PERSON_MODEL.shapes[name]],`${name} uses pedestrian geometry`);
}
const resources = root.children.map(mesh=>({geometry:mesh.geometry,material:mesh.material,matrix:mesh.instanceMatrix.array,color:mesh.instanceColor.array}));
const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), size = new THREE.Vector3();
const worldBounds = (mesh,index) => { mesh.getMatrixAt(index,matrix); mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox.clone().applyMatrix4(matrix); };
const colorAt = (mesh,index) => { const c=new THREE.Color(); mesh.getColorAt(index,c); return c.toArray(); };
const shade = hex => Array.from(new Float32Array(new THREE.Color(hex).toArray()));
const expectedColors = appearance => ({torso:appearance.shirt,head:appearance.skin,hair:appearance.hair,arms:appearance.shirt,legs:appearance.trousers,shoes:appearance.shoes,hands:appearance.skin});
for (const model of CARS) {
  const car = {id:model.id,modelId:model.id,x:3,z:4,yaw:0,occupied:true,active:true};
  const before = structuredClone(car);
  view.update(.016,{cars:[car],focus:car});
  assert.deepEqual(car,before,'descriptor is not mutated'); assert.equal(view.stats.drivers,1);
  const factory = createCar(model.id), eye = factory.userData.cockpit.eye;
  const scale=Math.min(1,(model.height-eye[1]-.025)/PERSON_MODEL.seatedHeadTop);
  batches.head.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.x-car.x-eye[0])<1e-6 && eye[0]<0,'head shares baked left cockpit seat');
  assert(Math.abs(position.z-car.z-eye[2])<1e-6,'head aligns with model cockpit');
  assert(Math.abs(position.y-heightAt(car.x,car.z)-eye[1]+.015*scale)<1e-6,'head retains shared seated eye offset');
  for(const name of ['head','hair']) {
    const bounds=worldBounds(batches[name],0);
    assert(bounds.max.y < heightAt(car.x,car.z)+model.height-.02,`${model.id} ${name} fits actual roof plane`);
    bounds.getSize(size); assert(size.x>.12 && size.x<.29,'rounded head retains adult proportions');
  }
  car.yaw = Math.PI/2; view.update(0,{cars:[car],focus:car});
  batches.head.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
  assert(Math.abs(position.x-car.x-eye[2])<1e-6 && Math.abs(position.z-car.z+eye[0])<1e-6,'seat rotates with car');
}
// Different event IDs must not replace the actual driver's appearance on exit.
const identity='traffic-person-identity', original=appearanceForPerson(identity);
const car={id:'traffic-car',personId:identity,modelId:'relay',x:0,z:0,yaw:0,occupied:true};
view.update(0,{cars:[car]});
for(const [name,hex] of Object.entries(expectedColors(original))) assert.deepEqual(colorAt(batches[name],0),shade(hex));
const event={id:'exit:traffic-car',personId:identity,x:0,z:0,yaw:0};
assert(view.addExit(event)); assert(!view.addExit(event),'duplicate exit event is ignored');
event.personId='changed-after-claim'; car.personId='player';
view.update(0,{cars:[]});
for(const [name,hex] of Object.entries(expectedColors(original))) assert.deepEqual(colorAt(batches[name],0),shade(hex),'exit appearance captured before claim');
batches.head.getMatrixAt(0,matrix); position.setFromMatrixPosition(matrix);
assert(Math.abs(position.y-(.035+PERSON_MODEL.head.y*original.height))<1e-6,'standing exit preserves personal height');
const stableCar={id:'stable-car',modelId:'relay',x:0,z:0,occupied:true};
view.update(0,{cars:[stableCar]}); const stableColors=Object.fromEntries(Object.entries(batches).map(([name,mesh])=>[name,colorAt(mesh,0)]));
view.update(0,{cars:[{id:'other',modelId:'relay',x:1,z:0,occupied:true},stableCar]});
for(const [name,mesh] of Object.entries(batches)) assert.deepEqual(colorAt(mesh,['arms','legs','shoes','hands'].includes(name)?2:1),stableColors[name],'identity follows car id after list reorder');
const cars = Array.from({length:100},(_,id)=>({id,modelId:'relay',x:id,z:0,yaw:0,occupied:true}));
view.update(.016,{cars,focus:{x:0,z:0}}); assert.equal(view.stats.drivers,64,'driver pool bounded');
assert(new Set(Array.from({length:20},(_,i)=>JSON.stringify(colorAt(batches.torso,i)))).size>1,'individual drivers vary in clothing');
assert(new Set(Array.from({length:20},(_,i)=>JSON.stringify(colorAt(batches.head,i)))).size>1,'individual drivers vary in skin');
assert(new Set(Array.from({length:20},(_,i)=>JSON.stringify(colorAt(batches.hair,i)))).size>1,'individual drivers vary in hair');
view.update(.016,{cars:[{...cars[0],occupied:false},{...cars[1],active:false},{...cars[2],x:NaN}],focus:{x:0,z:0}});
assert.equal(view.stats.drivers,0,'empty, inactive and invalid cars have no driver');
assert(!view.addExit({id:'bad',x:NaN,z:0}));
for(let id=0;id<30;id++) view.addExit({id,x:0,z:0,yaw:.4});
view.update(.05,{cars,focus:{x:0,z:0}});
assert.equal(view.stats.exits,12,'displaced pool bounded'); assert.equal(view.stats.drawCalls,7,'all shared-model adults use seven draws');
assert.equal(view.stats.geometryCount,3); assert.equal(view.stats.materialCount,1);
for(const [name,mesh] of Object.entries(batches)) assert.equal(mesh.count,76*(['arms','legs','shoes','hands'].includes(name)?2:1));
function buffers() { return root.children.map(mesh=>Array.from(mesh.instanceMatrix.array)); }
const beforePause = buffers(); for(let i=0;i<10;i++) view.update(0,{cars,focus:{x:0,z:0}});
assert.deepEqual(buffers(),beforePause,'zero dt freezes displaced walking');
view.update(.1,{cars,focus:{x:0,z:0}}); assert.notDeepEqual(buffers(),beforePause,'displaced adults walk away');
view.update(NaN,{cars:[{x:NaN,z:0,occupied:true}],focus:{x:NaN,z:Infinity}});
for(const buffer of buffers()) assert(buffer.every(Number.isFinite),'finite instance transforms');
view.update(0,{cars,focus:{x:5000,z:5000}}); assert.equal(view.stats.drawCalls,0,'all populations culled at distance');
for(let i=0;i<125;i++) view.update(.1,{cars:[],focus:{x:0,z:0}});
assert.equal(view.stats.exits,0,'displaced adults expire');
for(let id=0;id<400;id++) view.update(0,{cars:[{id:`cache-churn-${id}`,modelId:'relay',x:0,z:0,occupied:true}]});
assert.equal(view.stats.appearanceCount,view.stats.appearanceLimit,'identity cache remains bounded across vehicle churn');
for(const [index,mesh] of root.children.entries()) {
  assert.equal(mesh.geometry,resources[index].geometry); assert.equal(mesh.material,resources[index].material);
  assert.equal(mesh.instanceMatrix.array,resources[index].matrix); assert.equal(mesh.instanceColor.array,resources[index].color);
}
let geometryDisposals=0, materialDisposals=0, instanceDisposals=0;
for(const geometry of uniqueGeometry) geometry.addEventListener('dispose',()=>geometryDisposals++);
for(const mesh of root.children) mesh.addEventListener('dispose',()=>instanceDisposals++);
root.children[0].material.addEventListener('dispose',()=>materialDisposals++);
const borrowed = createCar('relay'); let sharedDisposals=0;
borrowed.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.addEventListener('dispose',()=>sharedDisposals++);});
view.dispose(); view.dispose(); view.update(.1,{cars});
assert.equal(scene.children.length,0); assert.equal(geometryDisposals,3); assert.equal(materialDisposals,1); assert.equal(instanceDisposals,7);
assert.equal(sharedDisposals,0,'shared factory resources remain live'); assert(view.stats.disposed && view.stats.drawCalls===0);
assert(!view.addExit({x:0,z:0}),'disposed view rejects exits');
disposeCars();
console.log('PASS all 16 rounded-model cockpit seats/actual roof planes/rotation, per-person appearance and exit continuity, bounded 64 drivers/12 exits in seven draws/three geometries/one material, pause/culling/expiry/finite transforms, stable buffers and exact disposal');
