import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createWorldView } from '../Games/Capital Drive/world-view.js';

const box=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
const lake={id:'osm-relation-3400115-0',type:'water',points:box(0,0,20,40),surfaceY:999};
const regional={id:'regional-source-lake',type:'water',points:box(100,0,140,40),surfaceY:21,
 innerRings:[{points:box(112,16,120,24)}]};
const pool={id:'legacy-pool',type:'water',points:box(-40,0,-30,10)};
const invalid={id:'invalid-level',type:'water',points:box(-25,0,-15,10),surfaceY:'21'};
const map={bounds:{minX:-80,maxX:180,minZ:-50,maxZ:70},spawn:{x:-60,z:-30,yaw:0},roads:[],buildings:[],areas:[lake,regional,pool,invalid],lakeWaterLevel:5.93};
let bridge=true;
const simulation=createSimulation(map,{trafficCount:0,isOnBridge:(x,z)=>bridge&&x>=100&&x<=140&&z>30,
 groundHeightAt:x=>x>=140?30:21.2});
simulation.player.active=false;
const before=JSON.stringify(map),surface=simulation.waterAt(104,4);
assert.deepEqual(surface,{id:regional.id,y:21});assert(Object.isFrozen(surface));
assert.equal(simulation.waterAt(106,8),surface,'one stable frozen surface per authorized area');
assert.deepEqual(simulation.waterAt(4,4),{id:lake.id,y:5.93},'retained lake level wins over incidental area metadata');
assert.equal(simulation.waterAt(116,20),null,'source island remains land');
assert.equal(simulation.waterAt(141,4),null);
assert.equal(simulation.waterAt(-35,5),null,'legacy pool is not silently made swimmable');
assert.equal(simulation.waterAt(-20,5),null,'numeric strings are not an authorized elevation');
assert.equal(simulation.waterAt(104,34),null,'dry bridge deck stays dry');
assert.equal(simulation.waterAt(104,34,{underBridge:true}),surface);
bridge=false;assert.equal(simulation.waterAt(104,34),surface,'bridge membership remains a live callback');
assert.equal(simulation.waterAt(NaN,4),null);
let actor={x:98,z:4};
assert(simulation.moveActor(actor,4,0).blocked&&actor.x<100,'ordinary foot collision remains unchanged');
actor={x:98,z:4};let result=simulation.moveSwimmingActor(actor,4,0);
assert(!result.blocked&&result.water===surface&&actor.x>100,'normal swim entry uses the regional surface');
actor={x:111,z:20,swimming:true};result=simulation.moveSwimmingActor(actor,4,0);
assert(!result.blocked&&result.water===null&&actor.x>112,'low source island can be reached on foot');
actor={x:139,z:4,swimming:true};result=simulation.moveSwimmingActor(actor,4,0);
assert(result.blocked&&actor.x<140,'high dry banks cannot be crossed by swimming');
actor={x:-42,z:5};assert(simulation.moveSwimmingActor(actor,5,0).blocked,'untagged pools retain their old solid boundary');
assert(!simulation.canOccupy({id:'probe',x:104,z:4,yaw:0}),'ordinary vehicle water collision remains solid');
assert.equal(JSON.stringify(map),before);

// Inspect actual water vertices. The explicit level must not be replaced by
// the minimum contour sample, including where the coarse terrain is higher.
const scene=new THREE.Scene(),view=createWorldView(scene,map,{lowGraphics:true,foliageTexture:null,
 terrainSampler:{groundHeightAt:()=>30,heightAt:()=>30,roadHeightAt:()=>30,vehicleHeightAt:()=>30,bridgeSegments:[]}});
let regionalVertices=0,legacyVertices=0,lbgVertices=0;
const waterTriangles=[];
scene.traverse(mesh=>{
 if(mesh.name!=='Canberra water')return;
 const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);
  if(x>=100&&x<=140&&z>=0&&z<=40){assert(Math.abs(p.getY(i)-21)<1e-6);regionalVertices++;}
  if(x>=0&&x<=20&&z>=0&&z<=40){assert(Math.abs(p.getY(i)-5.93)<1e-6);lbgVertices++;}
  if(x>=-40&&x<=-30){assert(Math.abs(p.getY(i)-29.88)<1e-5);legacyVertices++;}
 }
 for(let i=0;i<(index?.count??p.count);i+=3)waterTriangles.push([0,1,2].map(j=>{const v=index?index.getX(i+j):i+j;return[p.getX(v),p.getZ(v)];}));
});
assert(regionalVertices&&legacyVertices&&lbgVertices);
const covers=(x,z,t)=>{
 const cross=(a,b)=>(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);
 const s=t.map((a,i)=>cross(a,t[(i+1)%3]));return s.every(v=>v>=-1e-7)||s.every(v=>v<=1e-7);
};
assert(!waterTriangles.some(t=>covers(116,20,t)),'rendered water respects the same source island hole');
assert(waterTriangles.some(t=>covers(106,20,t)));
// Inspect the real rendered floor rather than repeating the clamp formula.
function groundTriangles(scene){
 const out=[];
 scene.traverse(mesh=>{
  if(mesh.name!=='Canberra surface')return;
  const p=mesh.geometry.attributes.position,k=mesh.geometry.attributes.surfaceKind;
  for(let i=0;i<p.count;i+=3)if(k.getX(i)===3)out.push([0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]));
 });return out;
}
const floors=groundTriangles(scene);
function floorAt(triangles,x,z){
 const hits=[];
 for(const [a,b,c] of triangles){
  const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  if(Math.abs(det)<1e-9)continue;
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det;
  const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;
  if(u>1e-7&&v>1e-7&&u+v<1-1e-7)hits.push(u*a[1]+v*b[1]+(1-u-v)*c[1]);
 }return hits;
}
assert(floorAt(floors,105.13,7.43).length&&floorAt(floors,105.13,7.43).every(y=>y<21),'raised source DEM cannot hide interior water');
assert(floorAt(floors,116.13,20.43).some(y=>y>29),'island interior remains source ground');
assert(floorAt(floors,4.13,7.43).length&&floorAt(floors,4.13,7.43).every(y=>y>29),'old lake floor is unchanged');
assert(floorAt(floors,-20.13,4.43).length&&floorAt(floors,-20.13,4.43).every(y=>y>29),'invalid explicit level cannot lower terrain');
assert.equal(view.groundHeightAt(105,7),30,'visual floor never mutates authoritative terrain');
const waterStreamScene=new THREE.Scene(),waterStream=createWorldView(waterStreamScene,map,{lowGraphics:true,streaming:true,foliageTexture:null,
 terrainSampler:{groundHeightAt:()=>30,heightAt:()=>30,roadHeightAt:()=>30,vehicleHeightAt:()=>30,bridgeSegments:[]}});
assert.deepEqual(groundTriangles(waterStreamScene).map(t=>JSON.stringify(t)).sort(),floors.map(t=>JSON.stringify(t)).sort(),'water refinement retains exact streaming mesh parity');
view.dispose();waterStream.dispose();

// Overlapping regional rectangles have exactly one ground owner, including
// clipped strips at earlier source seams. Legacy geometry stays the owner.
const grid=(minX,minZ,maxX,maxZ,regional=false)=>({minX,minZ,maxX,maxZ,cols:3,rows:3,heights:Array(9).fill(30),...(regional?{gridSha256:'fixture'}:{})});
const coverageMap={bounds:{minX:-90,minZ:-40,maxX:100,maxZ:100},spawn:{x:0,z:0},roads:[],buildings:[],areas:[],
 terrain:grid(0,0,60,60),terrainTiles:[grid(-50,0,10,80),grid(-80,-30,90,90,true),grid(-90,-40,100,100,true)]};
const snapshot=JSON.stringify(coverageMap),coverageScene=new THREE.Scene();
const coverageView=createWorldView(coverageScene,coverageMap,{lowGraphics:true,foliageTexture:null});
const coverage=groundTriangles(coverageScene);
for(let z=-37.217;z<99;z+=7.33)for(let x=-87.123;x<99;x+=8.17){
 assert.equal(floorAt(coverage,x,z).length,1,`one regional floor at ${x},${z}`);
 assert(Math.abs(floorAt(coverage,x,z)[0]-29.82)<1e-4,'clipped seam retains source height');
}
const streamScene=new THREE.Scene(),streamView=createWorldView(streamScene,coverageMap,{lowGraphics:true,streaming:true,foliageTexture:null});
const sorted=t=>t.map(v=>JSON.stringify(v)).sort();
assert.deepEqual(sorted(groundTriangles(streamScene)),sorted(coverage),'streaming and full terrain tessellation are identical');
assert.equal(JSON.stringify(coverageMap),snapshot,'render clipping does not modify source grids');
coverageView.dispose();streamView.dispose();
// Repeated lookup must use prepared local indices, never scan map areas or
// reread every polygon as new regions are added.
Object.defineProperty(map,'areas',{get(){throw new Error('global area scan during water query');}});
for(const area of [lake,regional,pool,invalid])Object.defineProperty(area,'points',{get(){throw new Error('unprepared polygon read during water query');}});
for(let i=0;i<1000;i++)assert.equal(simulation.waterAt(104,4),surface);
console.log('PASS regional water: explicit fixed levels, stable local indexed lookup, unchanged LBG/pools/vehicles, islands, live bridge split, swim entry/exit/high banks and actual rendered water vertices/holes; render-only bounded water floor, unchanged source heights, exact regional rectangle ownership and streaming parity');
