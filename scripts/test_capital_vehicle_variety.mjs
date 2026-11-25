import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {CARS as ORIGINAL_CARS,CAPITAL_CARS as CARS,CAPITAL_BY_ID as BY_ID,TRAFFIC_CAR_IDS} from '../assets/car-arcade/fleet.js';
import {createCar,disposeCars} from '../assets/car-arcade/models.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
const originalIds='bricklet pip parcel finch lantern comet orchard pebble dockside horizon morrow gravel relay tempest atlas sunray'.split(' ');
assert.equal(ORIGINAL_CARS.length,16,'shared arcade catalog remains exactly sixteen');
assert.deepEqual(CARS.slice(0,16).map(c=>c.id),originalIds,'old saved IDs and positions preserved');
assert.deepEqual(CARS.slice(16).map(c=>c.id),['flux','rill','gather','banksia','swiftlet','courier','wattle']);
assert.equal(new Set(CARS.map(c=>c.id)).size,23);
assert(Object.isFrozen(TRAFFIC_CAR_IDS));assert.equal(TRAFFIC_CAR_IDS.length,13);
const signatures=new Set(),normalized=new Set();let total=0;
for(const id of ['flux','rill','gather','banksia','swiftlet','courier','wattle']){
 const car=BY_ID[id],a=createCar(id),b=createCar(id);a.updateMatrixWorld(true);
 assert.equal(a.userData.drawCalls,7);assert.equal(a.children.length,7);assert.equal(a.userData.wheels.length,4);assert(a.userData.triangles<7000);
 const bounds=new THREE.Box3().setFromObject(a),size=bounds.getSize(new THREE.Vector3());
 assert(Math.abs(bounds.min.y)<1e-6);assert(Math.abs(size.y-car.height)<.16);
 assert(Math.abs(size.x-car.width)<.16&&Math.abs(size.z-car.length)<.16);
 for(let i=0;i<a.children.length;i++){assert.equal(a.children[i].geometry,b.children[i].geometry);assert.equal(a.children[i].material,b.children[i].material);}
 const array=a.children[0].geometry.attributes.position.array;
 signatures.add(createHash('sha256').update(Buffer.from(array.buffer)).digest('hex'));
 normalized.add(JSON.stringify(Array.from(array,(n,i)=>Math.round(n/[car.width,car.height,car.length][i%3]*10000))));
 const ray=new THREE.Raycaster(new THREE.Vector3(...a.userData.cockpit.eye),new THREE.Vector3(0,0,-1),.035,car.length);
 const hits=ray.intersectObject(a,true);assert.equal(hits[0].object.name,'glazing',id+' cockpit reaches windshield first');
 total+=a.userData.triangles;
}
assert.equal(signatures.size,7,'seven distinct authored body silhouettes');
assert.equal(normalized.size,7,'distinct silhouettes after removing model dimensions');
const roads=Array.from({length:9},(_,i)=>({id:'road-'+i,type:'residential',width:8,points:Array.from({length:21},(_,j)=>[-500+j*50,-400+i*100])}));
const sim=createSimulation({bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},spawn:{x:0,z:0},roads,areas:[],buildings:[],landmarks:[]},{trafficCount:40});
for(const id of TRAFFIC_CAR_IDS)assert(sim.traffic.some(car=>car.modelId===id),'shared AI mix includes '+id);
for(const id of ['banksia','swiftlet','courier','wattle']){
 const spec=BY_ID[id],traffic=sim.traffic.find(car=>car.modelId===id);
 traffic.speed=0;assert(sim.claimVehicle(traffic.id).ok,'ordinary stopped traffic can be claimed');
 assert.equal(sim.player.modelId,id);sim.setPlayerVehicle({modelId:id});
 assert.equal(sim.player.modelId,id,'new car available through ordinary vehicle installer');
 const pose={x:0,z:0,yaw:0};
 sim.setParkedCars([{id:'new-body',...pose,modelId:id}]);
 assert(!sim.canOccupy({...pose,x:spec.width*.4},{length:3.3,width:1.7}),'new model hull blocks overlap');
 sim.setParkedCars([]);
}
assert.equal(new Set(['banksia','swiftlet','courier','wattle'].map(id=>[BY_ID[id].speed,BY_ID[id].acceleration,BY_ID[id].handling].join('/'))).size,4,'four handling tunes');
const garageMap={spawn:{x:0,z:0}},garage=createProgression(garageMap,{version:1,cash:20000,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:100,stored:false}],completedJobs:[]});
garage.update(0,{pose:{x:garage.garage.x,z:garage.garage.z,yaw:0,speed:0},onFoot:false,wanted:0,vehicleHealth:100,respawnSerial:0,vehicle:{modelId:'lantern',stolen:false},sandbox:false,recovering:false});
for(const [id,name,price] of [['banksia','Banksia Cross',2400],['swiftlet','Swiftlet City',1100],['courier','Courier Highroof',2000],['wattle','Wattle Hybrid',3500]]){
 const offer=garage.garage.vehicles.find(car=>car.id===id);assert.equal(offer.name,name);assert.equal(offer.price,price);
 const cash=garage.state.cash;assert(garage.buyVehicle(id).ok);assert.equal(garage.state.cash,cash-price);
}
const saved=garage.serialize();assert.deepEqual(createProgression(garageMap,saved).serialize(),saved,'new garage vehicles survive save and reload');
disposeCars();console.log(`PASS vehicle variety: 16 saved IDs unchanged, 7 original silhouettes/${total} triangles, shared cached resources/cockpit clearance and 13-model AI traffic mix`);
