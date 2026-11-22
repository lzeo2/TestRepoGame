import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';

// Test-only access arranges real bounded adult pools; all shots use production adapters.
async function fixtureModule(name, needle, replacement) {
  const path=new URL(`../Games/Capital Drive/${name}.js`,import.meta.url);
  let source=await readFile(path,'utf8');assert(source.includes(needle));
  source=source.replace(needle,replacement).replace(/from ['"](\.[^'"]+)['"]/g,(_,relative)=>`from '${new URL(relative,path).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const {createPedestrians}=await fixtureModule('pedestrians','return { update, applyVehicleImpacts',`return { fixture(point={}) {
  pool.forEach((p,i)=>Object.assign(p,{x:1000+i,z:1000,health:100,dead:false,deathTime:0,hitCooldown:0,witnessCooldown:0,impactTime:0,impactHeight:0},i===0?{x:10,z:0,...point}:{}));
  rebuildPeopleGrid();
}, update, applyVehicleImpacts`);
const {createStreetDealers}=await fixtureModule('street-dealers','return {services,nearest,',`return {fixture(point={}) {
  people=[{id:'dealer-test',x:10,z:0,health:100,hitCooldown:0,panic:0,...point}];
},services,nearest,`);
const {createRideService}=await fixtureModule('ride-service','return { vehicles, damageVehicle, people,',`return { fixture(point={}) {
  Object.assign(driver,{active:true,x:10,z:0,health:100,hitCooldown:0,...point});
}, vehicles, damageVehicle, people,`);
const map={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},spawn:{x:0,z:-100,yaw:0},buildings:[],landmarks:[],
  roads:[{id:'road',name:'Fixture Street',type:'residential',width:8,points:[[-350,0],[350,0]]}]};
const pedestrians=createPedestrians(new THREE.Scene(),map,()=>4);
const dealers=createStreetDealers({roads:[],buildings:[]},{heightAt:()=>4});
const ride=createRideService(map,createSimulation(map,{trafficCount:0}),{heightAt:()=>4});
const level={x:0,y:5,z:0,dx:1,dy:0,dz:0,range:30,interiorId:null,offenderId:'npc:other'};
const aimed=(target,height)=>{
  const y=target.feetY+height,dy=y-level.y,length=Math.hypot(target.x,dy);
  return {...level,dx:target.x/length,dy:dy/length};
};
for(const [name,pool] of [['pedestrian',pedestrians],['dealer',dealers],['ride',ride]]) {
  pool.fixture();const targets=pool.shotTargets(),target=targets[0];
  assert(Object.isFrozen(targets)&&Object.isFrozen(target),`${name}: immutable detached targets`);
  assert.equal(target.feetY,4.05);assert.equal(target.interiorId,null);assert.equal(target.radius,.36);
  assert(target.height>1.6&&target.height<2.1);assert(!Object.values(target).some(v=>typeof v==='function'));
  const before=pool.snapshot();
  for(const ray of [null,{}, {...level,y:NaN},{...level,dx:Infinity},{...level,range:0},{...level,range:201},{...level,range:5},
    {...level,dx:0,dy:0,dz:0},{...level,dx:2},{...level,interiorId:'other-room'},
    {...level,y:30},{...level,dy:.9,dx:Math.sqrt(.19)},{...level,dz:.3,dx:Math.sqrt(.91)}]) {
    assert.equal(pool.hitByShot(target.id,10,ray).hits,0,`${name}: malformed, sky, lateral or room miss`);
  }
  for(const damage of [NaN,Infinity,0,-1])assert.equal(pool.hitByShot(target.id,damage,level).hits,0);
  assert.equal(pool.hitByShot('old-missing-id',10,level).hits,0);
  assert.deepEqual(pool.snapshot(),before,`${name}: rejected shots preserve health and reactions`);
  // Scoped weapons extend beyond 100m; the shared hitscan limit is 200m.
  for(const range of [101,200]) {
    pool.fixture();const body=pool.shotTargets()[0];
    assert.equal(pool.hitByShot(body.id,10,{...level,range}).hits,1,`${name}: valid extended ray range ${range}`);
  }
  pool.fixture({x:150});const distant=pool.shotTargets()[0],distantBefore=pool.snapshot();
  assert.equal(pool.hitByShot(distant.id,10,{...level,range:101}).hits,0,`${name}: distant body beyond ray endpoint`);
  assert.deepEqual(pool.snapshot(),distantBefore,`${name}: short ray preserves distant body and reactions`);
  assert.equal(pool.hitByShot(distant.id,10,{...level,range:190}).hits,1,`${name}: scoped ray reaches distant live body`);
  for(const height of [.1,target.height-.1]) {
    pool.fixture();const body=pool.shotTargets()[0];
    assert.equal(pool.hitByShot(body.id,10,aimed(body,height)).hits,1,`${name}: aimed feet/shoulder ray`);
    assert.equal(pool.hitByShot(body.id,10,aimed(body,height)).hits,0,`${name}: hit cooldown`);
  }
  pool.fixture();assert.equal(pool.hitByShot(target.id,10000,level).people[0].health,0,`${name}: damage capped at 100`);
  assert.equal(pool.hitByShot(target.id,10,level).hits,0,`${name}: dead body rejects repeated pellets`);
  assert(!pool.shotTargets().some(p=>p.id===target.id),`${name}: defeated adults leave shot candidates`);
  pool.fixture({z:10});assert.equal(pool.hitByShot(target.id,10,level).hits,0,`${name}: old ray rechecks moved live body`);
  pool.fixture();assert.equal(target.health,100,`${name}: old descriptor stays detached`);
}
pedestrians.fixture();pedestrians.drainEvents();const person=pedestrians.shotTargets()[0];
pedestrians.hitByShot(person.id,10,level);
const reports=pedestrians.drainEvents();
assert.equal(reports.filter(e=>e.type==='witness').length,1,'selected victim reports once');
assert.equal(reports[0].offenderId,'npc:other','shot retains offender attribution');
assert.equal(pedestrians.getCrimeTarget(person.id).threatened,false,'firearm cannot grant melee mugging authority');
pedestrians.fixture({impactTime:1,impactHeight:2});const falling=pedestrians.shotTargets()[0];
assert.equal(falling.feetY,6.05);assert.equal(falling.height,.7,'ragdoll exposes its fallen body');
assert.equal(pedestrians.hitByShot(falling.id,10,{...level,y:7.5}).hits,0,'standing ghost above ragdoll is absent');
assert.equal(pedestrians.hitByShot(falling.id,10,{...level,y:6.4}).hits,1,'airborne ragdoll remains hittable at actual height');
pedestrians.dispose();assert.deepEqual(pedestrians.shotTargets(),[]);
assert.equal(pedestrians.hitByShot(person.id,10,level).hits,0,'disposed pool cannot take stale shots');
ride.fixture();ride.reset();assert.deepEqual(ride.shotTargets(),[]);
assert.equal(ride.hitByShot('yoober-driver-npc',10,level).hits,0,'inactive seated driver is not an exterior target');
assert.deepEqual(dealers.drainEvents(),[],'dealer does not invent unattributed witnesses');
console.log('PASS immutable live adult shot targets, terrain, up/down feet/shoulders, strict rays, rooms, sky misses, damage/cooldown/dead guards, stale body checks and ragdoll height');
