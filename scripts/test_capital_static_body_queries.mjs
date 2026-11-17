import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const baselineRevision='5e1b05444b14cc1cca4a02acce6bd03331429097';
const sourceURL=new URL('../Games/Capital Drive/simulation.js',import.meta.url);
const current=await readFile(sourceURL,'utf8');
const previous=execFileSync('git',['show',`${baselineRevision}:Games/Capital Drive/simulation.js`],{cwd:new URL('../',import.meta.url),encoding:'utf8',maxBuffer:1024*1024});
const load=async source=>{
  source=source.replace(/from ['"]([^'"]+)['"]/g,(_,path)=>`from ${JSON.stringify(new URL(path,sourceURL).href)}`)
    .replace('query(x, z, radius) {','query(x, z, radius) { metrics.queries++;')
    .replace('function physicalContact(index,polygon,x,z,radius){','function physicalContact(index,polygon,x,z,radius){ metrics.contacts++;');
  return import(`data:text/javascript;base64,${Buffer.from(source+'\nexport const metrics={queries:0,contacts:0};').toString('base64')}`);
};
const old=await load(previous), candidate=await load(current);
const rectangle=(x,z,w,h)=>[[x,z],[x+w,z],[x+w,z+h],[x,z+h]];
const fixture=()=>({bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},spawn:{x:-150,z:-150,yaw:0},roads:[],
 buildings:[{id:'building',points:rectangle(4,-8,8,16),innerRings:[rectangle(6,-3,4,6)]},
 {id:'cell-crossing',points:rectangle(-60,45,70,9)}],
 barriers:[{id:'live-barrier',points:rectangle(-15,-15,1,30)}],
 areas:[{type:'water',points:rectangle(20,-30,40,60),innerRings:[rectangle(30,-10,20,20)]}]});
let bridge=false, comparisons=0;
const aMap=fixture(),bMap=fixture();
const options={trafficCount:0,isOnBridge:()=>bridge,vehicleHeightAt:car=>car.y||0};
const a=old.createSimulation(aMap,options),b=candidate.createSimulation(bMap,options);
function compare(pose,options){assert.equal(b.canOccupy(pose,options),a.canOccupy(pose,options));comparisons++;}
const probe={id:'probe',x:0,z:0,yaw:0,length:4,width:2};
assert(b.canOccupy(probe),'clear ground control');
assert(!b.canOccupy({...probe,x:23}),'lake blocks actual body');
assert(b.canOccupy({...probe,x:40}),'water island hole remains open');
assert(!b.canOccupy({...probe,x:30}),'body circle overlaps island boundary');
bridge=true;assert(b.canOccupy({...probe,x:23}),'bridge opens water only');
assert(!b.canOccupy({...probe,x:6}),'bridge never opens building');bridge=false;
for(let i=0;i<1800;i++)compare({...probe,x:(i*17%390)-195,z:(i*31%390)-195,yaw:i*.371,length:1+i%16,width:.5+(i%8)/2});
for(const x of [-200,-199.75,-192,0,4,12,20,30,48,60,199,200])for(const yaw of [0,Math.PI/2,Math.PI/4,-Math.PI/2])compare({...probe,x,z:0,yaw});
for(const invalid of [{x:1e308},{x:-1e308},{z:1e308},{x:NaN},{yaw:Infinity},{length:0},{width:-1}])compare({...probe,...invalid});
// Geometry remains live inside its registered index bounds; no occupancy result is cached.
for(const map of [aMap,bMap])map.barriers[0].points[0][0]=-14.5;
for(let i=0;i<100;i++)compare({...probe,x:-17+i/20,z:0,yaw:i*.17});
for(const enabled of [true,false,true,false]){bridge=enabled;for(let i=0;i<60;i++)compare({...probe,x:19+i/2,z:0,yaw:i*.21});}
for(const sim of [a,b])sim.setExternalPeople([{id:'ped:1',x:0,z:0,radius:.35}]);
compare(probe);for(const sim of [a,b])sim.setExternalPeople([]);compare(probe);
const externalA={id:'bus',x:0,z:0,yaw:0,length:12,width:2.4,y:0},externalB={...externalA};
a.setExternalVehicles([externalA]);b.setExternalVehicles([externalB]);compare(probe);
externalA.y=externalB.y=8;compare(probe);
externalA.x=externalB.x=40;compare(probe);
for(const sim of [a,b])sim.setParkedCars([{id:'ride',x:0,z:0,yaw:1,modelId:'lantern'}]);compare(probe);
for(const sim of [a,b])sim.parkedCars[0].active=false;compare(probe);
for(let i=0;i<80;i++){
 const p={...probe,x:(i*7%100)-50,z:(i*11%100)-50,yaw:i*.37},q={...p};
 assert.deepEqual(b.moveVehicle(p,Math.sin(i)*3,Math.cos(i)*3),a.moveVehicle(q,Math.sin(i)*3,Math.cos(i)*3));assert.deepEqual(p,q);
}
// Clear long-body probes demonstrate query reduction without weakening contact checks.
const beforeOld=old.metrics.queries,beforeNew=candidate.metrics.queries;
for(let i=0;i<20;i++)compare({...probe,x:100,z:100,length:12,width:2.4,yaw:i*.2});
assert(candidate.metrics.queries-beforeNew<(old.metrics.queries-beforeOld)/4);
console.log(`PASS static body queries: ${comparisons} pinned-baseline occupancy probes, exact swept poses, live barriers/bridge/people/external/parked state; queries ${old.metrics.queries} -> ${candidate.metrics.queries}.`);

if(process.argv.includes('--actual')){
  const {applyMapExpansion}=await import('../Games/Capital Drive/map-expansion.js');
  const {applyRoadProfiles}=await import('../Games/Capital Drive/road-network.js');
  const {createTerrainSampler}=await import('../Games/Capital Drive/terrain.js');
  const {createBuses}=await import('../Games/Capital Drive/buses.js');
  const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
  const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
  map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
  const terrain=createTerrainSampler(map),opts={trafficCount:40,seed:20261117,isOnBridge:terrain.isOnBridge,vehicleHeightAt:terrain.vehicleHeightAt};
  const before=old.createSimulation(map,opts),after=candidate.createSimulation(map,opts);
  let actualProbes=0;
  const check=pose=>{assert.equal(after.canOccupy(pose),before.canOccupy(pose));actualProbes++;};
  for(let i=0;i<350;i++){
    const road=map.roads[i*37%map.roads.length],point=road.points[i%road.points.length];
    const pose={id:'actual',x:point[0]+i%9-4,z:point[1]+i%11-5,yaw:i*.71,length:1+i%16,width:.5+i%7/2};
    check(pose);const p={...pose},q={...pose};
    assert.deepEqual(after.moveVehicle(p,Math.sin(i)*3,Math.cos(i)*3),before.moveVehicle(q,Math.sin(i)*3,Math.cos(i)*3));assert.deepEqual(p,q);
  }
  for(const segment of terrain.bridgeSegments.filter((_,i)=>i%5===0)){
    const x=(segment.a[0]+segment.b[0])/2,z=(segment.a[1]+segment.b[1])/2;
    for(const yaw of [0,Math.PI/4,Math.PI/2])check({id:'bridge',x,z,yaw,length:10.6,width:2.45});
  }
  const oldBuses=createBuses(map,before),newBuses=createBuses(map,after);
  const state=sim=>({player:{...sim.player},traffic:sim.traffic.map(({edge,...car})=>({...car,edgeId:edge?.id}))});
  for(let frame=0;frame<180;frame++){
    for(const [sim,buses] of [[before,oldBuses],[after,newBuses]]){
      sim.setExternalVehicles(buses.vehicles);
      sim.setExternalPeople([{id:'ped:1',x:sim.player.x+15,z:sim.player.z,radius:.35}]);
      sim.step(1/60,{throttle:.25,steer:Math.sin(frame/90)*.2});buses.step(1/60);
    }
    assert.deepEqual(state(after),state(before));assert.deepEqual(newBuses.snapshot(),oldBuses.snapshot());
  }
  const {createRideService}=await import('../Games/Capital Drive/ride-service.js');
  const oldRideSim=old.createSimulation(map,{...opts,trafficCount:0}),newRideSim=candidate.createSimulation(map,{...opts,trafficCount:0});
  oldRideSim.player.active=newRideSim.player.active=false;
  const oldRide=createRideService(map,oldRideSim,{pay:()=>true,canPay:()=>true}),newRide=createRideService(map,newRideSim,{pay:()=>true,canPay:()=>true});
  const ctx={pose:{...map.spawn},onFoot:true,sandbox:false,wanted:0};
  assert(oldRide.book('local-hop',ctx).ok);assert(newRide.book('local-hop',ctx).ok);
  for(let frame=0;frame<180;frame++){
    oldRideSim.setExternalVehicles(oldRide.vehicles);newRideSim.setExternalVehicles(newRide.vehicles);
    oldRide.step(1/60,ctx);newRide.step(1/60,ctx);assert.deepEqual(newRide.snapshot(),oldRide.snapshot());
  }
  console.log(`PASS actual static body queries: ${actualProbes} source-road/bridge probes, 350 exact swept poses, 180 exact player/40-car/two-bus and 180 Yoober frames with real terrain bridge callback.`);
}
