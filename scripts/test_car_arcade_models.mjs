import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { CARS, BY_ID } from '../assets/car-arcade/fleet.js';
import { createCar, disposeCars } from '../assets/car-arcade/models.js';

const ids = 'bricklet pip parcel finch lantern comet orchard pebble dockside horizon morrow gravel relay tempest atlas sunray'.split(' ');
const names = ['Bricklet80','Pip Borough','Parcel Cub','Finch Sport','Lantern Saloon','Comet Coupe','Orchard Wagon','Pebble Rally','Dockside Van','Horizon GT','Morrow Roadster','Gravel Scout','Relay Touring','Tempest Sprint','Atlas Utility','Sunray Halo'];
assert.deepEqual(CARS.map(c=>c.id),ids);
assert.deepEqual(CARS.map(c=>c.name),names);
assert.deepEqual(CARS.map(c=>c.price),[0,900,1500,2200,3200,4800,6200,8200,10500,15000,22000,30000,42000,60000,90000,160000]);
assert(Object.isFrozen(CARS) && Object.isFrozen(BY_ID));
assert.equal(Object.getPrototypeOf(BY_ID),null);
const signatures = new Set(), normalized = new Set(), rows = [];
// Inspected cached profiles: cowl, roof start/end, belt, roof half-width factor.
const cabins = [[-.23,-.18,.20,.56,.85],[-.28,-.17,.24,.52,.77],[-.30,-.22,.32,.49,.91],[-.19,-.06,.15,.56,.76],[-.23,-.13,.17,.54,.82],[-.16,-.01,.13,.55,.72],[-.27,-.15,.33,.52,.88],[-.28,-.17,.20,.53,.79],[-.39,-.31,.36,.48,.94],[-.12,.01,.19,.56,.75],[-.13,-.04,.12,.61,.72],[-.26,-.17,.26,.53,.84],[-.26,-.08,.21,.55,.79],[-.14,.02,.16,.58,.70],[-.29,-.20,.04,.52,.89],[-.20,-.02,.17,.57,.65]];
const previousCockpits = new Map();
const retained = new Set(), disposed = new Map();
function track(resource) {
  if (retained.has(resource)) return;
  retained.add(resource); disposed.set(resource,0);
  resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));
}
for (let cycle = 0; cycle < 3; cycle++) {
  const fingerprint = createHash('sha256');
  for (const car of CARS) {
    assert(Object.isFrozen(car)); assert.equal(BY_ID[car.id],car);
    assert.deepEqual(Object.keys(car),'id name price speed acceleration handling toughness style color length width height'.split(' '));
    for (const [key,min,max] of [['speed',20,65],['acceleration',5,13],['handling',2,5],['toughness',80,160],['length',3.2,5.4],['width',1.6,2.4],['height',1.2,2.1]]) assert(car[key]>=min && car[key]<=max,`${car.id} ${key}`);
    assert(['compact','sport','utility','touring'].includes(car.style));
    const a = createCar(car.id), b = createCar(car.id), tinted = createCar(car.id,{color:'#123456'});
    assert(a instanceof THREE.Group); assert.equal(a.name,car.id);
    assert.equal(a.userData.carId,car.id); assert.equal(a.userData.wheels.length,4);
    assert(Object.isFrozen(a.userData) && Object.isFrozen(a.userData.dimensions) && Object.isFrozen(a.userData.profile));
    assert.equal(a.userData.profile.forward,'-Z'); assert.equal(a.userData.profile.wheelAxis,'X');
    assert.deepEqual(Object.keys(a.userData).sort(), ['carId','cockpit','dimensions','drawCalls','profile','triangles','wheels']);
    const cockpit = a.userData.cockpit, {eye,target} = cockpit;
    assert.deepEqual(Object.keys(cockpit), ['eye','target']);
    for (const value of [cockpit,eye,target]) assert(Object.isFrozen(value));
    for (const v of [eye,target]) assert(Array.isArray(v) && v.length === 3 && v.every(Number.isFinite));
    assert.throws(()=>{eye[0]=0;},TypeError);
    assert.throws(()=>{target[1]=0;},TypeError);
    assert.throws(()=>{cockpit.eye=[];},TypeError);
    assert.equal(cockpit,b.userData.cockpit); assert.equal(cockpit,tinted.userData.cockpit);
    if (cycle) {
      assert.notEqual(cockpit,previousCockpits.get(car.id));
      assert.deepEqual(cockpit,previousCockpits.get(car.id));
    }
    previousCockpits.set(car.id,cockpit);
    const [cowl,rf,rr,belt,roofWidth] = cabins[ids.indexOf(car.id)];
    const w=car.width/2, l=car.length, h=car.height, y=h*belt;
    assert.equal(eye[0],-w*.4); assert(Math.abs(eye[0])<w*roofWidth*.92);
    assert(eye[1]>y+.11 && eye[1]<h-.09, `${car.id}: above dashboard/belt, below roof`);
    assert(eye[2]>rf*l && eye[2]<rr*l, `${car.id}: inside cabin length`);
    assert(eye[2]>cowl*l+.25+.133 && eye[2]<l*.15-.07 && eye[2]<l*.16-.04, `${car.id}: behind steering, ahead of seat back/headrest`);
    assert(Math.abs(eye[2]-l*.07)<.195, `${car.id}: above front seat cushion`);
    assert.equal(target[0],eye[0]); assert.equal(target[1],eye[1]); assert(target[2]<-l/2);
    // Actual merged glazing, not just nominal dimensions: level -Z ray exits
    // through the windshield, with no opaque cabin surface in front of it.
    a.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(...eye),new THREE.Vector3(0,0,-1));
    const windshield = ray.intersectObject(a.getObjectByName('glazing'),false)[0];
    assert(windshield && windshield.point.z>cowl*l-.02 && windshield.point.z<rf*l+.02, `${car.id}: actual windshield`);
    for (const name of ['body','trim-interior']) {
      const obstruction=ray.intersectObject(a.getObjectByName(name),false)[0];
      assert(!obstruction || obstruction.distance>windshield.distance, `${car.id}: clear forward sightline`);
    }
    let count = 0, draws = 0;
    a.traverse(mesh=>{
      if (!mesh.isMesh) return;
      for (const attr of [mesh.geometry.index,...Object.values(mesh.geometry.attributes)]) fingerprint.update(Buffer.from(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));
      fingerprint.update(JSON.stringify([mesh.name,mesh.position.toArray(),mesh.rotation.toArray(),mesh.material.color.toArray(),mesh.material.opacity,mesh.material.side]));
      track(mesh.geometry); track(mesh.material); draws++;
      assert.equal(mesh.geometry.groups.length,0);
      assert(mesh.geometry.index); count+=mesh.geometry.index.count/3;
      for (const attribute of Object.values(mesh.geometry.attributes)) for (const n of attribute.array) assert(Number.isFinite(n));
      for (const n of mesh.geometry.index.array) assert(n<mesh.geometry.attributes.position.count);
    });
    for (let i = 0; i < a.children.length; i++) {
      assert.notEqual(a.children[i],b.children[i]);
      assert.equal(a.children[i].geometry,b.children[i].geometry);
      assert.equal(a.children[i].geometry,tinted.children[i].geometry);
      assert.equal(a.children[i].material,b.children[i].material);
      track(tinted.children[i].material);
    }
    assert.notEqual(a.children[0].material,tinted.children[0].material);
    assert.equal(tinted.children[0].material.color.getHex(),0x123456);
    assert.equal(count,a.userData.triangles); assert(count>=2500 && count<=8000,`${car.id}: ${count}`);
    assert.equal(draws,a.userData.drawCalls); assert.equal(draws,7);
    assert.equal(new Set(a.children.map(mesh=>mesh.geometry)).size,4);
    const bounds = new THREE.Box3().setFromObject(a), size = bounds.getSize(new THREE.Vector3());
    assert(Math.abs(bounds.min.y)<1e-7,`${car.id} ground ${bounds.min.y}`);
    for (const wheel of a.userData.wheels) {
      assert(Math.abs(new THREE.Box3().setFromObject(wheel).min.y)<1e-7);
      assert.equal(wheel.position.y,a.userData.profile.axleHeight);
    }
    for (const [key,actual] of [['width',size.x],['height',size.y],['length',size.z]]) {
      assert.equal(a.userData.dimensions[key],actual);
      assert(Math.abs(actual-car[key])<.16,`${car.id} ${key}: ${actual}`);
    }
    assert(a.userData.wheels[0].position.z<0 && a.userData.wheels[2].position.z>0);
    const bodyPosition=a.children[0].geometry.attributes.position.array;
    const before = bodyPosition.slice();
    a.rotation.y=1.2; a.userData.wheels[0].rotation.x=.8;
    assert.equal(b.userData.wheels[0].rotation.x,0); assert.deepEqual(bodyPosition,before);
    if (cycle===0) {
      signatures.add(createHash('sha256').update(Buffer.from(bodyPosition.buffer)).digest('hex'));
      // Remove scale from the test, so unique dimensions alone cannot pass.
      const profile = Array.from(bodyPosition,(n,i)=>Math.round(n/[car.width,car.height,car.length][i%3]*10000));
      normalized.add(JSON.stringify(profile));
      rows.push({id:car.id,triangles:count,draws,width:+size.x.toFixed(3),height:+size.y.toFixed(3),length:+size.z.toFixed(3)});
    }
  }
  assert.equal(fingerprint.digest('hex'),'e74179a90ad7f865ae30dc7346c2da08968c56a01adfe958e0a8f91641966128','Unchanged base16 geometry/material/transform fingerprint');
  assert.equal(retained.size,(cycle+1)*83,'No additional GPU resources');
  disposeCars(); disposeCars();
  for (const resource of retained) assert.equal(disposed.get(resource),1,'Each cached resource disposed exactly once');
}
assert.equal(signatures.size,16); assert.equal(normalized.size,16);
for (const id of ['__proto__','constructor','toString','',null,5,{},Symbol('car')]) assert.throws(()=>createCar(id),RangeError);
let getterCalls=0;
for (const options of [null,[],{color:null},{color:NaN},{color:-1},{color:0x1000000},{color:'red'},{color:'#123'},{color:'url(https://invalid)'},{color:{}},{extra:true},{get color(){getterCalls++; return '#ffffff';}},Object.create({color:'#ffffff'})]) assert.throws(()=>createCar('pip',options),TypeError);
assert.equal(getterCalls,0);
const numeric=createCar('pip',{color:0x123456}), text=createCar('pip',{color:'#123456'});
assert.equal(numeric.children[0].material,text.children[0].material);
assert.notEqual(numeric.children[0].geometry,[...retained][0]);
disposeCars();
console.table(rows);
console.log(`PASS: 16 distinct normalized prototypes, 3 all-car disposal cycles, ${retained.size} resources each disposed once; finite buffers, sharing, metadata, hostile inputs.`);
