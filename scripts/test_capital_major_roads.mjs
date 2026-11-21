import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {roadProfile, roadMarkingOffsets, applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
import {createSimulation, pointOnLane} from '../Games/Capital Drive/simulation.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {POOL_BARRIERS} from '../Games/Capital Drive/landmarks.js';
import {CAMPUS_BARRIERS} from '../Games/Capital Drive/campus.js';
import {BARRIERS as SKATE_BARRIERS} from '../Games/Capital Drive/civic-extras.js';
import {HIGHWAY_BARRIERS} from '../Games/Capital Drive/highway-barriers.js';
const read = name => readFile(new URL(`../Games/Capital Drive/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const map = applyMapExpansion(applyRoadProfiles(await read('canberra.json'), await read('road-profiles.json')), await read('canberra-north.json'));
// Match the runtime's permanent source barriers before admitting ambient cars.
map.barriers = [...POOL_BARRIERS, ...CAMPUS_BARRIERS, ...SKATE_BARRIERS.map(b => {
  const dx=b.b[0]-b.a[0], dz=b.b[1]-b.a[1], length=Math.hypot(dx,dz)||1, nx=-dz/length*b.width/2, nz=dx/length*b.width/2;
  return {...b, points:[[b.a[0]+nx,b.a[1]+nz],[b.b[0]+nx,b.b[1]+nz],[b.b[0]-nx,b.b[1]-nz],[b.a[0]-nx,b.a[1]-nz]]};
}), ...HIGHWAY_BARRIERS];
const hindmarshRails = HIGHWAY_BARRIERS.filter(b => b.roadContext?.name === 'Hindmarsh Drive');
assert(HIGHWAY_BARRIERS.length > 600 && hindmarshRails.length >= 40, 'real-map traffic fixture includes ground-level sourced highway rails');
assert(HIGHWAY_BARRIERS.every(b => b.sourceLayer === '0' && ['no','false','0'].includes(b.sourceBridge)), 'elevated source rails cannot become ground-level phantom walls');
for (const [id, lanes, width] of [['220108364-0',3,11.2],['333933993-0',2,8],['447092623-0',4,14.5]]) {
  const road = map.roads.find(r => r.id === id), profile = roadProfile(road);
  assert.equal(road.name, 'Hindmarsh Drive'); assert.equal(road.oneway, 1); assert.equal(road.speed, 80);
  assert.equal(profile.lanes, lanes); assert.equal(profile.lanesFromSource, true);
  assert.equal(profile.driveWidth, width, 'source lane paint does not enlarge the source carriageway');
  const dividers = roadMarkingOffsets(road);
  assert.equal(dividers.length, lanes - 1);
  for (const offset of dividers) assert(Math.abs(offset) < width / 2);
}
assert.equal(roadProfile({type:'residential',width:7.5,sourceTags:{lanes:'2'}}).driveWidth,7.5);
assert.equal(roadProfile({type:'primary',width:8,sourceTags:{sidewalk:'no'}}).pavementWidth,0);
assert.equal(roadProfile({type:'motorway',width:12}).pavementWidth,0);
assert.equal(roadProfile({type:'primary',width:8,sourceTags:{sidewalk:'left'}}).sidewalkRight,false);
assert.equal(roadProfile({type:'primary',width:8,sourceTags:{sidewalk:'right'}}).sidewalkLeft,false);
assert.deepEqual(roadMarkingOffsets({type:'primary',width:8,oneway:1,sourceTags:{lanes:'1'}}),[]);
// Same bounded pool, densely segmented side streets versus a long major road.
const roads = [{id:'major',type:'primary',oneway:1,width:11.2,speed:80,sourceTags:{lanes:'3'},points:[[-600,80],[600,80]],nodes:[1,2]}];
for(let i=0;i<12;i++) roads.push({id:`local${i}`,type:'residential',oneway:0,width:8,speed:40,
  points:Array.from({length:13},(_,j)=>[-600+j*100,-60-i*22]),nodes:Array.from({length:13},(_,j)=>100+i*20+j)});
const distantRoad={id:'distant-major',type:'primary',oneway:1,width:11.2,speed:80,sourceTags:{lanes:'3'},points:[[10000,10000],[11000,10000]],nodes:[9001,9002]};
roads.push(distantRoad);
const fixture={bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000},roads,buildings:[],spawn:{x:0,z:0,yaw:0}};
const sim=createSimulation(fixture,{seed:17}), repeat=createSimulation(fixture,{seed:17});
assert.equal(sim.traffic.length,40,'major-road population redistributes the existing 40 slots');
assert.deepEqual(sim.traffic,repeat.traffic,'distribution stays deterministic');
const major = sim.traffic.filter(c=>c.active&&c.edge.road.id==='major');
assert(major.length>=8,`major road should populate despite 144 local segments; got ${major.length}`);
assert(sim.traffic.filter(c=>c.active).every(c=>sim.canOccupy(c)),'all admitted models retain full OBB clearance');
const paused=structuredClone(sim.traffic);
for(let i=0;i<10;i++)sim.step(0,{}, {x:1000,z:1000});
assert.deepEqual(sim.traffic,paused,'paused focus cannot refresh or move traffic');
const identities=sim.traffic.slice();
const visible=sim.traffic.filter(c=>Math.hypot(c.x,c.z)<300).map(c=>({car:c,x:c.x,z:c.z}));
sim.step(1/60,{}, {x:0,z:0});
assert(sim.traffic.every((c,i)=>c===identities[i]),'refresh retains original objects and slots');
assert(visible.every(({car,x,z})=>Math.hypot(car.x-x,car.z-z)<1),'refresh never jumps a visible car');
let distantProfileReads=0;
Object.defineProperty(distantRoad,'sourceTags',{get(){distantProfileReads++;return {lanes:'3'};}});
for(let i=0;i<130;i++) sim.step(1/60);
assert.equal(distantProfileReads,0,'recurring population queries never inspect distant road profiles');
// Real source corridor placement exercises lane/profile/collision integration.
const sourceRoad=map.roads.find(r=>r.id==='447092623-0');
const midpoint=sourceRoad.points[Math.floor(sourceRoad.points.length/2)];
const actual=createSimulation({...map,spawn:{x:midpoint[0],z:midpoint[1],yaw:0}},{seed:17});
assert.equal(actual.traffic.length,40);
const hindmarsh=actual.traffic.filter(c=>c.active&&c.edge.road.name==='Hindmarsh Drive');
assert(hindmarsh.length>=4,`actual local major corridor needs moving cars; got ${hindmarsh.length}`);
assert(hindmarsh.every(c=>actual.canOccupy(c)),'actual Hindmarsh source solids preserve whole-body admission');
assert(hindmarsh.every(c=>Math.abs(c.x-pointOnLane(c.edge,c.position).x)<1e-9));
const positions=hindmarsh.map(c=>({x:c.x,z:c.z}));
for(let i=0;i<60;i++)actual.step(1/60, {brake:true});
const moving=hindmarsh.filter((c,i)=>Math.hypot(c.x-positions[i].x,c.z-positions[i].z)>1);
assert(moving.length>=4,'actual Hindmarsh population moves along its legal source lanes');
assert(hindmarsh.every(c => actual.canOccupy(c)), 'whole vehicle bodies remain clear after driving beside source rails');
console.log(`PASS major roads: source Hindmarsh 2/3/4 lanes and unchanged widths; source sidewalk/motorway rules; fixed40 fleet, ${major.length} fixture major cars and ${hindmarsh.length} Hindmarsh cars (${moving.length} moving) with ${HIGHWAY_BARRIERS.length} ground rails/${hindmarshRails.length} Hindmarsh rails; deterministic admission, full bodies, pause, local-only queries and no visible refresh jump`);
