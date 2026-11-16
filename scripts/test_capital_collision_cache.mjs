import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

// No persistent result cache: geometry, bridge callbacks and every live body
// remain authoritative on the next query. Only temporary edge records disappear.
const baselineRevision = '3695a9a7000807567f76cf074cd70e67984894f5';
const sourceURL = new URL('../Games/Capital Drive/simulation.js', import.meta.url);
const source = await readFile(sourceURL, 'utf8');
const baselineSource = execFileSync('git', ['show', `${baselineRevision}:Games/Capital Drive/simulation.js`],
  { cwd: new URL('../', import.meta.url), encoding: 'utf8', maxBuffer: 1024 * 1024 });
const importSource = text => text.replace(/from ['"]([^'"]+)['"]/g, (_, path) => `from ${JSON.stringify(new URL(path, sourceURL).href)}`);
const measuredModule = async text => {
  const measured = importSource(text)
    .replace('query(x, z, radius) {', 'query(x, z, radius) { collisionMetrics.queries++;')
    .replace('function polygonContact(x, z, points, radius) {', 'function polygonContact(x, z, points, radius) { collisionMetrics.polygons++;')
    .replace('return outer.contact(x,z,radius);', 'collisionMetrics.polygons++;return outer.contact(x,z,radius);');
  return import(`data:text/javascript;base64,${Buffer.from(`${measured}\nexport const collisionMetrics={queries:0,polygons:0};`).toString('base64')}`);
};
const { createSimulation: baselineSimulation, collisionMetrics: baselineMetrics } = await measuredModule(baselineSource);
const { createSimulation, collisionMetrics: optimizedMetrics } = await measuredModule(source);
function polygonProbe(text) {
  const project = text.slice(text.indexOf('export function projectSegment'), text.indexOf('class SpatialGrid')).replace('export ', '');
  const contact = text.slice(text.indexOf('function polygonContact'), text.indexOf('function insideRing'));
  return vm.runInNewContext(`const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); let calls=0;
    ${project.replace('const dx =', 'calls++; const dx =')}
    ${contact}
    ({contact: polygonContact, calls:()=>calls})`);
}
const oldProbe = polygonProbe(baselineSource), newProbe = polygonProbe(source);
const plain = value => value === null ? null : { ...value };
for (let i = 0; i < 20000; i++) {
  const sides = 3+i%13, radius = .1+(i%29)/10;
  const points = Array.from({ length: sides }, (_, j) => {
    const a = j/sides*Math.PI*2;
    return [Math.cos(a)*(1+i%5), Math.sin(a)*(1+i%7)];
  });
  if (i%2) points.reverse();
  if (i%7===0) points.splice(1,0,points[0]);
  const x = (i*31%139)/10-7, z = (i*47%131)/10-6.5;
  assert.deepEqual(plain(newProbe.contact(x,z,points,radius)), plain(oldProbe.contact(x,z,points,radius)));
}
for (const points of [[], [[0,0]], [[0,0],[0,0]], [[0,0],[3,0],[3,3],[0,3]]]) {
  for (const [x,z] of [[0,0],[1,1],[3,3],[3.45,3],[4,4]]) {
    assert.deepEqual(plain(newProbe.contact(x,z,points,.45)), plain(oldProbe.contact(x,z,points,.45)));
  }
}
assert(oldProbe.calls()>100000, 'baseline really allocated per-edge projection records');
assert.equal(newProbe.calls(),0, 'optimized polygon path creates no temporary projection records');

const fixture = () => ({ bounds: { minX:-100,maxX:100,minZ:-100,maxZ:100 }, roads:[],
  spawn:{x:-80,z:-80,yaw:0}, buildings:[{id:'live-shape',points:[[4,-4],[8,-4],[8,4],[4,4]]}],
  areas:[{type:'water',points:[[20,-10],[40,-10],[40,10],[20,10]],innerRings:[[[24,-6],[36,-6],[36,6],[24,6]]]}] });
const beforeMap=fixture(), afterMap=fixture();
let bridge=false;
const before=baselineSimulation(beforeMap,{trafficCount:0,isOnBridge:()=>bridge});
const after=createSimulation(afterMap,{trafficCount:0,isOnBridge:()=>bridge});
const compare = pose => {
  const expected=before.canOccupy(pose);
  assert.equal(after.canOccupy(pose),expected);
  return expected;
};
const pose={id:'probe',x:0,z:0,yaw:0,length:4,width:2};
assert(compare(pose));
assert(!compare({...pose,x:4}));
// Same inserted bounds, changed actual edge: no prepared polygon/result survives.
for (const map of [beforeMap,afterMap]) map.buildings[0].points[0][0]=7;
for (let i=0;i<120;i++) compare({...pose,x:3+i/30,z:-3,yaw:i*.21,length:1+i%16,width:.5+i%7/2});
for (const sim of [before,after]) sim.setExternalPeople([{id:'ped:1',x:0,z:0,radius:.35}]);
assert(!compare(pose));
for (const sim of [before,after]) sim.setExternalPeople([{id:'ped:1',x:10,z:0,radius:.35}]);
assert(compare(pose));
const oldCar={id:'external',x:0,z:0,yaw:0,length:4,width:2},newCar={...oldCar};
before.setExternalVehicles([oldCar]);after.setExternalVehicles([newCar]);
assert(!compare(pose));
oldCar.x=newCar.x=15;
assert(compare(pose),'registered external descriptors remain live');
for (const sim of [before,after]) sim.setParkedCars([{id:'parked',x:0,z:0,yaw:.7,modelId:'lantern'}]);
assert(!compare(pose));
for (const sim of [before,after]) sim.parkedCars[0].active=false;
assert(compare(pose),'parked activity mutation stays live');
for (const sim of [before,after]) sim.setParkedCars([{id:'parked',x:15,z:15,yaw:2.1,modelId:'atlas'}]);
assert(compare(pose));
assert(!compare({...pose,x:21}));
bridge=true;
assert(compare({...pose,x:21}),'bridge exemption callback is re-evaluated');
bridge=false;
assert(!compare({...pose,x:21}));
for(let i=0;i<100;i++) compare({...pose,x:22+i*.2,z:0,yaw:i*.43});

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
const terrain=createTerrainSampler(map),options={trafficCount:40,seed:20261112,isOnBridge:terrain.isOnBridge};
const oldSim=baselineSimulation(map,options),newSim=createSimulation(map,options);
const snapshot=sim=>({player:{...sim.player},traffic:sim.traffic.map(({edge,...car})=>({...car,edgeId:edge?.id})),signals:{elapsed:sim.trafficLights.elapsed,colors:sim.trafficLights.approaches.map(item=>[item.id,item.color])}});
assert.deepEqual(snapshot(newSim),snapshot(oldSim));
for(let i=0;i<600;i++) {
  const road=map.roads[i*37%map.roads.length],point=road.points[i%road.points.length];
  const probe={id:'actual-probe',modelId:['lantern','atlas','finch'][i%3],x:point[0]+i%7-3,z:point[1]+i%11-5,yaw:i*.71};
  assert.equal(newSim.canOccupy(probe),oldSim.canOccupy(probe));
  const a={...probe},b={...probe},dx=Math.sin(i)*5,dz=Math.cos(i)*5;
  assert.deepEqual(newSim.moveVehicle(a,dx,dz),oldSim.moveVehicle(b,dx,dz));
  assert.deepEqual(a,b);
  const c={...probe},d={...probe};
  assert.deepEqual(newSim.moveActor(c,dx,dz),oldSim.moveActor(d,dx,dz));
  assert.deepEqual(c,d);
  const end={x:probe.x+Math.cos(i)*30,z:probe.z+Math.sin(i)*30};
  assert.equal(newSim.hasLineOfSight(probe,end),oldSim.hasLineOfSight(probe,end));
}
const replay = sim => {
  const poses=[],start=performance.now();
  for(let frame=0;frame<600;frame++) {
    sim.step(1/60,{throttle:.25,steer:Math.sin(frame/90)*.2});
    if(frame%30===0) poses.push(snapshot(sim));
  }
  return {poses,ms:performance.now()-start};
};
const oldRun=replay(oldSim),newRun=replay(newSim);
assert.deepEqual(newRun.poses,oldRun.poses,'all player/40-car/signal replay snapshots remain identical');
assert.deepEqual(optimizedMetrics,baselineMetrics,'identical grid query and polygon contact counts retain every physical check');
console.log('PASS collision allocation: 20020 exact polygon results, no per-edge projection records, live shape/bridge/person/external/parked changes, 2400 actual-map probes and 600-frame/40-car exact replay.');
console.log(JSON.stringify({measurementOnly:true,baselineRevision,baselineProjectionRecords:oldProbe.calls(),optimizedProjectionRecords:newProbe.calls(),collisionQueries:optimizedMetrics.queries,polygonContacts:optimizedMetrics.polygons,baselineReplayMs:oldRun.ms,optimizedReplayMs:newRun.ms}));
