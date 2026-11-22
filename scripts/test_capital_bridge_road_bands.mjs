import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {lakeBridgeRoadBands,createWorldView} from '../Games/Capital Drive/world-view.js';
import {createCivicView} from '../Games/Capital Drive/civic-view.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];
const sourceIds=new Set(['way/4878920','way/75247036','way/75247010','way/4878927','way/4878928']);
const lake=map.roads.filter(r=>sourceIds.has(r.sourceId)&&r.sourceTags?.bridge==='yes');
const segments=lake.flatMap(road=>road.points.slice(1).map((b,i)=>({road,a:road.points[i],b,width:roadProfile(road).driveWidth,length:Math.hypot(b[0]-road.points[i][0],b[1]-road.points[i][1])})));
const bands=lakeBridgeRoadBands(segments);
let clipped=0;
for(const s of segments)for(const band of bands.get(s)) {
  const x=(band.a[0]+band.b[0])/2,z=(band.a[1]+band.b[1])/2,left=band.left(x,z),right=band.right(x,z);
  assert(left<right);assert(left>=-s.width/2&&right<=s.width/2);
  if(s.road.name==='Kings Avenue'){assert(band.leftOuter&&band.rightOuter);assert.equal(right-left,8);}
  else if(!band.leftOuter||!band.rightOuter){clipped++;assert(right-left>6&&right-left<8);}
  assert.equal(roadProfile(s.road).lanes,s.road.name==='Kings Avenue'?2:3,'logical source lane count stays unchanged');
}
assert(clipped>=3,'all three overlapping Commonwealth ways receive an owned band');
// Oppositely directed, near-coincident source roads produce one asphalt skin.
const roads=[{id:'a',name:'Commonwealth Avenue',sourceId:'way/4878920',type:'trunk',width:10.8,oneway:1,sourceTags:{bridge:'yes',lanes:'3'},points:[[0,0],[120,0]]},
  {id:'b',name:'Commonwealth Avenue',sourceId:'way/75247036',type:'trunk',width:10.8,oneway:1,sourceTags:{bridge:'yes',lanes:'3'},points:[[120,3.2],[0,3.2]]}];
const scene=new THREE.Scene(),world=createWorldView(scene,{bounds:{minX:-20,maxX:140,minZ:-20,maxZ:20},spawn:{x:60,z:0},roads,areas:[],buildings:[],landmarks:[]},{lowGraphics:true});
const asphalt=new THREE.Color(0x555654),triangles=[];
scene.traverse(mesh=>{
  if(mesh.name!=='Canberra road')return;
  const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
  for(let i=0;i<p.count;i+=3)if(Math.abs(c.getX(i)-asphalt.r)<.005&&Math.abs(c.getY(i)-asphalt.g)<.005&&Math.abs(c.getZ(i)-asphalt.b)<.005)
    triangles.push([0,1,2].map(j=>new THREE.Vector3(p.getX(i+j),p.getY(i+j),p.getZ(i+j))));
});
assert(triangles.length>0);
const ray=new THREE.Ray(),hit=new THREE.Vector3();
for(const z of [-5,-3,0,1,2,3,5,8]) {
  ray.set(new THREE.Vector3(66.37,20,z),new THREE.Vector3(0,-1,0));
  assert.equal(triangles.filter(t=>ray.intersectTriangle(...t,false,hit)).length,1,`one rendered asphalt skin at lateral ${z}`);
}
world.dispose();assert.equal(scene.children.length,0);
const terrain=createTerrainSampler(map),civicScene=new THREE.Scene(),civic=createCivicView(civicScene,map,terrain.heightAt,{roadHeightAt:terrain.roadHeightAt});
assert.equal(civic.stats.bridgeParapets,160,'existing physical rail polygons retain their span count');
assert(civic.stats.bridgeTriangles<=1400,'shoulders and fascia stay in the existing bounded bridge batch');
const mesh=civicScene.children[0].children.find(m=>m.name==='Source lake bridge parapets'),p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
const shoulder=new THREE.Color(0xb7b3a5);let shoulderVertices=0;
for(let i=0;i<p.count;i++)if(Math.abs(c.getX(i)-shoulder.r)<1e-5&&Math.abs(c.getY(i)-shoulder.g)<1e-5&&Math.abs(c.getZ(i)-shoulder.b)<1e-5)shoulderVertices++;
assert.equal(shoulderVertices,46*6,'both 23-span Kings non-sidewalk edges get a continuous solid shoulder');
console.log(`PASS actual source bridge bands, unchanged Kings widths/source lanes, one rendered Commonwealth asphalt skin, ${shoulderVertices/3} shoulder triangles and ${civic.stats.bridgeTriangles} total bridge triangles`);
civic.dispose();assert.equal(civicScene.children.length,0);
