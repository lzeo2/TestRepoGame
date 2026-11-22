import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {CARS as ORIGINAL_CARS,CAPITAL_CARS as CARS,CAPITAL_BY_ID as BY_ID,TRAFFIC_CAR_IDS} from '../assets/car-arcade/fleet.js';
import {createCar,disposeCars} from '../assets/car-arcade/models.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
const originalIds='bricklet pip parcel finch lantern comet orchard pebble dockside horizon morrow gravel relay tempest atlas sunray'.split(' ');
assert.equal(ORIGINAL_CARS.length,16,'shared arcade catalog remains exactly sixteen');
assert.deepEqual(CARS.slice(0,16).map(c=>c.id),originalIds,'old saved IDs and positions preserved');
assert.deepEqual(CARS.slice(16).map(c=>c.id),['flux','rill','gather']);
assert.equal(new Set(CARS.map(c=>c.id)).size,19);
assert(Object.isFrozen(TRAFFIC_CAR_IDS));assert.equal(TRAFFIC_CAR_IDS.length,9);
const signatures=new Set();let total=0;
for(const id of ['flux','rill','gather']){
 const car=BY_ID[id],a=createCar(id),b=createCar(id);a.updateMatrixWorld(true);
 assert.equal(a.children.length,7);assert.equal(a.userData.wheels.length,4);assert(a.userData.triangles<7000);
 const bounds=new THREE.Box3().setFromObject(a),size=bounds.getSize(new THREE.Vector3());
 assert(Math.abs(bounds.min.y)<1e-6);assert(Math.abs(size.y-car.height)<.16);
 assert(Math.abs(size.x-car.width)<.16&&Math.abs(size.z-car.length)<.16);
 for(let i=0;i<a.children.length;i++){assert.equal(a.children[i].geometry,b.children[i].geometry);assert.equal(a.children[i].material,b.children[i].material);}
 const array=a.children[0].geometry.attributes.position.array;
 signatures.add(createHash('sha256').update(Buffer.from(array.buffer)).digest('hex'));
 const ray=new THREE.Raycaster(new THREE.Vector3(...a.userData.cockpit.eye),new THREE.Vector3(0,0,-1),.035,car.length);
 const hits=ray.intersectObject(a,true);assert.equal(hits[0].object.name,'glazing',id+' cockpit reaches windshield first');
 total+=a.userData.triangles;
}
assert.equal(signatures.size,3,'three distinct authored body silhouettes');
const roads=Array.from({length:9},(_,i)=>({id:'road-'+i,type:'residential',width:8,points:Array.from({length:21},(_,j)=>[-500+j*50,-400+i*100])}));
const sim=createSimulation({bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},spawn:{x:0,z:0},roads,areas:[],buildings:[],landmarks:[]},{trafficCount:40});
for(const id of TRAFFIC_CAR_IDS)assert(sim.traffic.some(car=>car.modelId===id),'shared AI mix includes '+id);
disposeCars();console.log(`PASS vehicle variety: 16 saved IDs unchanged, 3 original silhouettes/${total} triangles, shared cached resources/cockpit clearance and 9-model AI traffic mix`);
