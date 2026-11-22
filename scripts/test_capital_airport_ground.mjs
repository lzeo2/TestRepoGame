import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createWorldView} from '../Games/Capital Drive/world-view.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';

function groundTriangles(scene){
 const triangles=[];
 scene.traverse(mesh=>{if(!mesh.isMesh||mesh.name!=='Canberra surface')return;
  const p=mesh.geometry.attributes.position,k=mesh.geometry.attributes.surfaceKind;
  for(let i=0;i<p.count;i+=3)if(k.getX(i)===3)triangles.push([0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]));
 });return triangles;
}
function covers(triangle,x,z){
 const [a,b,c]=triangle,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
 if(Math.abs(den)<1e-9)return false;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;
 const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;
 return u>1e-7&&v>1e-7&&u+v<1-1e-7;
}
const grid=(minX,maxX,minZ,maxZ,cols,rows)=>({minX,maxX,minZ,maxZ,cols,rows,heights:Array(cols*rows).fill(4)});
// One tile crossing all four sides exercises clipped cells and base exclusion.
const fixture={bounds:{minX:-100,maxX:200,minZ:-100,maxZ:200},terrain:grid(0,100,0,100,4,4),terrainTiles:[grid(-50,150,-50,150,8,8)],roads:[],buildings:[],areas:[],landmarks:[],spawn:{x:50,z:50}};
const fixtureScene=new THREE.Scene(),fixtureView=createWorldView(fixtureScene,fixture,{lowGraphics:true});
const triangles=groundTriangles(fixtureScene);
let area=0;
for(const t of triangles)if(t.every(p=>p[0]>=-50-1e-5&&p[0]<=150+1e-5&&p[2]>=-50-1e-5&&p[2]<=150+1e-5))area+=Math.abs((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[2][0]-t[0][0])*(t[1][2]-t[0][2]))/2;
assert(Math.abs(area-40000)<.02,'four-region tile plus base exactly covers its rectangle once');
for(const x of [-41.37,13.19,83.41,137.13])for(const z of [-39.13,17.37,89.19,139.73])assert.equal(triangles.filter(t=>covers(t,x,z)).length,1,`single ground surface at ${x},${z}`);
fixtureView.dispose();

// A 100m saddle reproduces coarse mountain-cell triangle interpolation error.
const coarse={...fixture,bounds:{minX:0,maxX:300,minZ:0,maxZ:100},terrain:grid(200,300,0,100,5,5),
 terrainTiles:[{...grid(0,100,0,100,2,2),heights:[0,0,0,16]}],spawn:{x:40,z:60}};
const coarseScene=new THREE.Scene(),coarseView=createWorldView(coarseScene,coarse,{lowGraphics:true});
const coarseSampler=createTerrainSampler(coarse),coarseTriangles=groundTriangles(coarseScene);
let maxError=0;
for(let i=0;i<9;i++)for(let j=0;j<9;j++){
 const x=3.17+i*10.31,z=4.73+j*10.13,matches=coarseTriangles.filter(t=>covers(t,x,z));
 assert.equal(matches.length,1,'coarse adaptive cell retains single coverage');
 const [a,b,c]=matches[0],den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;
 const rendered=u*a[1]+v*b[1]+(1-u-v)*c[1],expected=coarseSampler.groundHeightAt(x,z)-.18;
 maxError=Math.max(maxError,Math.abs(rendered-expected));
 assert(Math.abs(rendered-expected)<.08,'coarse nonplanar mesh tracks bilinear collision ground within 8cm');
}
assert(coarseTriangles.filter(t=>t.every(p=>p[0]>=-.001&&p[0]<=100.001&&p[2]>=-.001&&p[2]<=100.001)).length<=128,'coarse cell has at most eight by eight subdivisions');
coarseView.dispose();
console.log(`Capital coarse terrain PASS: 81 nonplanar mesh/collision probes, maximum error ${maxError.toFixed(4)}m, bounded adaptive subdivisions and single coverage.`);

const json=async name=>JSON.parse(await readFile(new URL('../Games/Capital Drive/data/'+name,import.meta.url)));
const base=await json('canberra.json'),north=await json('canberra-north.json'),snapshot=await json('airport.json');
const original=applyMapExpansion(base,north);original.terrainTiles=[(await json('north-terrain.json')).terrain];
const airport=applyAirport(original,snapshot),sampler=createTerrainSampler(airport);
const sparse=map=>({...map,roads:[],buildings:[],areas:[],landmarks:[]});
// These exact attribute hashes were recorded before the airport-ground fix.
for(const [spawn,key,expected] of [
 [{x:-875,z:1575},'District -3,4','24ddfa9eb3b70314be2c879372f890c7dffb82055a20bc65012547e7853d035c'],
 [{x:-875,z:-4375},'District -3,-13','902bee10c7f439c520df53edf8ea63953448b2a9439b461c31e26bd1f40d11a4']
]){
 const scene=new THREE.Scene(),view=createWorldView(scene,{...sparse(airport),spawn},{lowGraphics:true,streaming:true});
 const mesh=scene.children[0].children.find(c=>c.name===key).children.find(m=>m.name==='Canberra surface');
 const hash=createHash('sha256');for(const [name,a] of Object.entries(mesh.geometry.attributes))hash.update(name).update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));
 assert.equal(hash.digest('hex'),expected,'existing base/north ground attributes remain byte-identical');view.dispose();
}
const anchor=airport.landmarks.find(p=>p.id==='canberra-airport'),tile=airport.airportTerrain;
const scene=new THREE.Scene(),view=createWorldView(scene,{...sparse(airport),spawn:anchor},{lowGraphics:true,streaming:true});
const probes=[anchor];
for(let ix=0;ix<7;ix++)for(let iz=0;iz<9;iz++)probes.push({x:tile.minX+(tile.maxX-tile.minX)*(ix+.371)/7,z:tile.minZ+(tile.maxZ-tile.minZ)*(iz+.613)/9});
let checkedVertices=0;
for(const p of probes){
 for(let i=0;i<30;i++)view.update(p);
 assert.equal(view.stats.queuedChunks,0);assert(view.stats.residentChunks<=36);
 const ground=groundTriangles(scene),matches=ground.filter(t=>covers(t,p.x,p.z));
 assert.equal(matches.length,1,`actual airport ground covers probe once at ${p.x},${p.z}`);
 for(const t of matches)for(const [x,y,z]of t){assert(Math.abs(y-(sampler.groundHeightAt(x,z)-.18))<.02,'drawn vertices share the same bilinear ground sampler');checkedVertices++;}
}
view.dispose();assert.equal(scene.children.length,0);
console.log(`Capital airport ground PASS: four clipped regions exactly cover 40000m² once; base/north attribute hashes unchanged; ${probes.length} actual east-terrain probes including Terminal Avenue, ${checkedVertices} source-sampled vertices, bounded streaming/disposal.`);
