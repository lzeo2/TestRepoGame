import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createNeighbourhoodDetails} from '../Games/Capital Drive/neighbourhood.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';

const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const center=barrier=>({x:barrier.points.reduce((sum,p)=>sum+p[0],0)/4,z:barrier.points.reduce((sum,p)=>sum+p[1],0)/4});
const house={id:'fixture-house',type:'house',points:[[-6,20],[6,20],[6,32],[-6,32]]};
const fixture={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},spawn:{x:0,z:0},roads:[{id:'road',type:'residential',points:[[-90,0],[90,0]]}],buildings:[house],areas:[],landmarks:[]};
const scene=new THREE.Scene(),heightAt=(x,z)=>x*.015+z*.025;
const details=createNeighbourhoodDetails(scene,fixture,heightAt,{lowGraphics:true});
assert.equal(details.stats.backyards,1);assert.equal(details.stats.lawns,1);assert.equal(details.stats.rearGates,1);assert.equal(details.stats.clotheslines,1);
assert.equal(details.entries.length,1);assert(Math.abs(details.entries[0].z-19.84)<1e-6,'front door remains at the actual existing facade');
assert.equal(details.backyardBarriers.length,4);assert(Object.isFrozen(details.backyardBarriers));
let vertices=[];scene.traverse(mesh=>{if(mesh.name==='Neighbourhood garden')vertices.push(...mesh.geometry.attributes.position.array);});
for(const barrier of details.backyardBarriers) {
 assert(Object.isFrozen(barrier)&&Object.isFrozen(barrier.points)&&barrier.points.every(Object.isFrozen));
 assert.equal(barrier.buildingId,house.id);
 for(const [x,z]of barrier.points) {
  assert(z>32.5,'yard remains behind the farthest house edge, away from its road and door');
  assert(vertices.some((value,index)=>index%3===0&&Math.abs(value-x)<1e-5&&Math.abs(vertices[index+2]-z)<1e-5),'every collision fence corner is present in rendered geometry');
 }
}
function checkGates(barriers,simulation) {
 for(let index=0;index<barriers.length;index+=4) {
  const a=center(barriers[index]),b=center(barriers[index+2]),distance=Math.hypot(b.x-a.x,b.z-a.z);
  const tx=(b.x-a.x)/distance,tz=(b.z-a.z)/distance,nx=-tz,nz=tx;
  const middle={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
  const walk=simulation.moveActor({id:'player',x:middle.x-nx*.5,z:middle.z-nz*.5},nx,nz,.35);
  assert(!walk.blocked&&Math.abs(walk.distance-1)<1e-6,`real rear gate permits a normal adult sweep ${barriers[index].id} ${JSON.stringify(walk)} ${JSON.stringify(middle)}`);
  const fence=simulation.moveActor({id:'player',x:a.x-nx,z:a.z-nz},nx*2,nz*2,.35);
  assert(fence.blocked&&fence.distance<1,'adjacent visible fence blocks the same sweep');
 }
}
checkGates(details.backyardBarriers,createSimulation({...fixture,buildings:[],barriers:details.backyardBarriers},{trafficCount:0}));
const protectedYard=createNeighbourhoodDetails(new THREE.Scene(),{...fixture,areas:[{type:'park',points:[[-20,33],[20,33],[20,45],[-20,45]]}]},heightAt,{lowGraphics:true});
assert.equal(protectedYard.backyardBarriers.length,0,'public rear park never receives fences or a private lawn');protectedYard.dispose();details.dispose();

const map=applyMapExpansion(await json('canberra'),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
const before=digest(map),terrain=createTerrainSampler(map).heightAt;
const fullScene=new THREE.Scene(),full=createNeighbourhoodDetails(fullScene,map,terrain,{lowGraphics:true});
const entries=full.entries,barriers=full.backyardBarriers,sourceStats=full.sourceStats,fullBytes=full.stats.residentBytes;
assert(sourceStats.backyards>100&&sourceStats.backyards<=650);assert(sourceStats.backyardTriangles<=60000);
assert.equal(sourceStats.lawns,sourceStats.backyards);assert.equal(sourceStats.rearGates,sourceStats.backyards);
assert(sourceStats.clotheslines>20);assert.equal(barriers.length,sourceStats.backyards*4);assert(barriers.length<=2600);
const buildings=new Set(map.buildings.map(building=>building.id));
assert(barriers.every(barrier=>buildings.has(barrier.buildingId)&&barrier.points.every(point=>point.every(Number.isFinite))));
const physical=createSimulation({...map,buildings:[],areas:[],barriers},{trafficCount:0});checkGates(barriers,physical);
const baseSim=createSimulation(map,{trafficCount:0}),yardSim=createSimulation({...map,barriers:[...(map.barriers||[]),...barriers]},{trafficCount:0});
const yardIds=new Set(barriers.map(barrier=>barrier.buildingId));
for(const door of entries.filter(entry=>yardIds.has(entry.buildingId))) {
 const approach={x:door.x-door.nx*1.5,z:door.z-door.nz*1.5,yaw:0},body={length:.7,width:.7};
 assert.equal(yardSim.canOccupy(approach,body),baseSim.canOccupy(approach,body),'backyard fences never cut a source house front entry');
}
function hashes(target) {
 return new Map(target.children[0].children.map(group=>{
  const hash=createHash('sha256');group.traverse(mesh=>{if(mesh.isMesh){hash.update(mesh.name);for(const [name,attribute]of Object.entries(mesh.geometry.attributes))hash.update(name).update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}});
  return [group.name,hash.digest('hex')];
 }));
}
const expected=hashes(fullScene);full.dispose();
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const standard=createNeighbourhoodDetails(new THREE.Scene(),map,terrain,{streaming:true});
assert.deepEqual(standard.entries,entries);assert.deepEqual(standard.backyardBarriers,barriers,'Low and Standard preserve identical physical yard admission');
assert(standard.sourceStats.backyardTriangles<=60000);standard.dispose();delete globalThis.document;
const streamedScene=new THREE.Scene(),streamed=createNeighbourhoodDetails(streamedScene,map,terrain,{lowGraphics:true,streaming:true});
assert.deepEqual(streamed.entries,entries);assert.deepEqual(streamed.backyardBarriers,barriers,'geometry eviction cannot change physical boundaries');
const poses=[map.spawn,...['redhill','narrabundah','canberra-centre'].map(id=>map.landmarks.find(place=>place.id===id)),map.spawn];
let opening,disposals=0;
for(const [index,pose]of poses.entries()) {
 for(let frame=0;frame<32;frame++) {
  const loads=streamed.stats.loads;streamed.update(pose);assert(streamed.stats.loads-loads<=1);assert(streamed.stats.residentChunks<=49);
  if(!streamed.stats.queue)break;
 }
 assert.equal(streamed.stats.queue,0);const actual=hashes(streamedScene);
 for(const [key,hash]of actual)assert.equal(hash,expected.get(key),'all streamed backyard attributes match complete source geometry');
 if(!index)opening=actual;if(index===poses.length-1)assert.deepEqual(actual,opening,'revisiting regenerates exactly the original yard geometry');
 let bytes=0;streamedScene.traverse(mesh=>{if(mesh.isMesh)for(const attribute of Object.values(mesh.geometry.attributes))bytes+=attribute.array.byteLength;});
 assert.equal(streamed.stats.residentBytes,bytes);assert(bytes<fullBytes*.35,'distant backyards retain no full-city vertex buffers');
}
const loads=streamed.stats.loads;for(let frame=0;frame<100;frame++)streamed.update(map.spawn);assert.equal(streamed.stats.loads,loads);
streamedScene.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.addEventListener('dispose',()=>disposals++);});
streamed.update({x:1e6,z:1e6});assert(disposals>0);assert.equal(streamed.stats.residentBytes,0);
assert.deepEqual(streamed.backyardBarriers,barriers);assert.equal(digest(map),before,'source footprints, terrain, roads and doors are never mutated');
const report={yards:sourceStats.backyards,clotheslines:sourceStats.clotheslines,barriers:barriers.length,triangles:sourceStats.backyardTriangles,fullBytes,peakResidentBytes:streamed.stats.peakResidentBytes,doors:entries.length};
streamed.dispose();streamed.dispose();streamed.update(map.spawn);assert.equal(streamedScene.children.length,0);
console.log('PASS actual source backyards: rear lawns/clotheslines, shared physical fence corners, passable1.8m gates, unchanged front entries/source data, bounded Low chunks/buffers, exact deterministic revisit and disposal',JSON.stringify(report));
