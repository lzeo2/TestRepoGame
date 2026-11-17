import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createNeighbourhoodDetails} from '../Games/Capital Drive/neighbourhood.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
const house={id:'house',type:'house',points:[[-6,20],[6,20],[6,32],[-6,32]]};
const fixture={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[{id:'street',type:'residential',points:[[-90,0],[90,0]]}],buildings:[house,{id:'rear-shed',type:'shed',points:[[-8,38],[8,38],[8,40],[-8,40]]}],areas:[],landmarks:[]};
const fit=createNeighbourhoodDetails(new THREE.Scene(),fixture,()=>0,{lowGraphics:true});
assert.equal(fit.stats.backyards,1,'a rear obstruction trims the lot instead of removing its garden');
assert(fit.backyardBarriers.every(b=>b.points.every(p=>p[1]<38)),'trimmed fences stay clear of the mapped shed');
fit.dispose();
const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
const map=applyMapExpansion(await json('canberra'),await json('canberra-north'));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const before=digest(map), scene=new THREE.Scene();
const started=performance.now();
const details=createNeighbourhoodDetails(scene,map,()=>0,{lowGraphics:true});
const initMs=performance.now()-started;
// Test full polygon contacts through a local grid, including thin outlines
// that point sampling alone could miss.
const grid=new Map(),cell=100;
const keys=points=>{const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),result=[];for(let x=Math.floor(Math.min(...xs)/cell);x<=Math.floor(Math.max(...xs)/cell);x++)for(let z=Math.floor(Math.min(...zs)/cell);z<=Math.floor(Math.max(...zs)/cell);z++)result.push(`${x},${z}`);return result;};
const add=item=>{for(const key of keys(item.points)){if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);}};
const inside=(p,points)=>{let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};
const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const overlap=(a,b)=>{if(a.some(p=>inside(p,b))||b.some(p=>inside(p,a)))return true;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)if(turn(a[i],a[(i+1)%a.length],b[j])*turn(a[i],a[(i+1)%a.length],b[(j+1)%b.length])<0&&turn(b[j],b[(j+1)%b.length],a[i])*turn(b[j],b[(j+1)%b.length],a[(i+1)%a.length])<0)return true;return false;};
for(const building of map.buildings)add(building);
for(const barrier of details.backyardBarriers){
 const neighbours=new Set(keys(barrier.points).flatMap(key=>grid.get(key)||[]));
 for(const other of neighbours)if(other.buildingId!==barrier.buildingId)assert(!overlap(barrier.points,other.points),`physical fence avoids ${other.id}: ${barrier.id}`);
 add(barrier);
}
const baselinePath=process.argv[2];
let baselineReport;
if(baselinePath){
 const baseline=await import(pathToFileURL(baselinePath));
 const oldStarted=performance.now();
 const old=baseline.createNeighbourhoodDetails(new THREE.Scene(),map,()=>0,{lowGraphics:true});
 assert.deepEqual(details.entries,old.entries,'all source entrance descriptors and their order remain unchanged');
 baselineReport={yards:old.stats.backyards,triangles:old.stats.backyardTriangles,bytes:old.stats.residentBytes,initMs:performance.now()-oldStarted};old.dispose();
}
// Compare each public approach against the original physical source map, not
// only against the subset of houses which happened to receive a backyard.
const base=createSimulation(map,{trafficCount:0}), fenced=createSimulation({...map,barriers:[...(map.barriers||[]),...details.backyardBarriers]},{trafficCount:0});
for(const door of details.entries){
 for(const distance of [.8,1.5,3]){
  const pose={x:door.x-door.nx*distance,z:door.z-door.nz*distance,yaw:0},body={length:.7,width:.7};
  assert.equal(fenced.canOccupy(pose,body),base.canOccupy(pose,body),`front approach remains open: ${door.id} at ${distance}m`);
 }
}
const signatures=target=>{const hash=createHash('sha256');target.traverse(mesh=>{if(mesh.isMesh)for(const attribute of Object.values(mesh.geometry.attributes))hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));});return hash.digest('hex');};
const geometry=signatures(scene), entries=details.entries,barriers=details.backyardBarriers;
const report={baseline:baselineReport,current:{yards:details.stats.backyards,triangles:details.stats.backyardTriangles,bytes:details.stats.residentBytes,initMs},entries:entries.length,entryDigest:digest(entries)};
details.dispose();
const rebuiltScene=new THREE.Scene(),rebuilt=createNeighbourhoodDetails(rebuiltScene,map,()=>0,{lowGraphics:true});
assert.deepEqual(rebuilt.entries,entries);assert.deepEqual(rebuilt.backyardBarriers,barriers);assert.equal(signatures(rebuiltScene),geometry,'full rebuild has identical geometry and bounded cost');
assert.equal(digest(map),before);assert(rebuilt.stats.backyardTriangles<=60000);rebuilt.dispose();
console.log('PASS source-yard fit, unchanged all-entry approaches and deterministic geometry',JSON.stringify(report));
