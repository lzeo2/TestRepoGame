import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {lakeBridgeRoadBands,createWorldView} from '../Games/Capital Drive/world-view.js';
import {createCivicView} from '../Games/Capital Drive/civic-view.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';
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
function concreteTriangles(scene) {
  const concrete=new THREE.Color(0x9b998a),result=[];
  scene.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
    if(!p||!c||mesh.geometry.index)return;
    for(let i=0;i<p.count;i+=3) {
      if(Math.abs(c.getX(i)-concrete.r)>.004||Math.abs(c.getY(i)-concrete.g)>.004||Math.abs(c.getZ(i)-concrete.b)>.004)continue;
      const triangle=[0,1,2].map(j=>new THREE.Vector3(p.getX(i+j),p.getY(i+j),p.getZ(i+j)));
      for(const vertex of triangle)vertex.add(mesh.position);
      result.push(triangle);
    }
  });
  return result;
}
const underside=concreteTriangles(scene);
assert(underside.length>0&&underside.length<=80,'two source lanes add only bounded concrete geometry');
for(const z of [-5,-3,0,1,2,3,5,8]) {
  ray.set(new THREE.Vector3(66.37,20,z),new THREE.Vector3(0,-1,0));
  assert.equal(triangles.filter(t=>ray.intersectTriangle(...t,false,hit)).length,1,`one rendered asphalt skin at lateral ${z}`);
  ray.set(new THREE.Vector3(66.37,-2,z),new THREE.Vector3(0,1,0));
  assert.equal(underside.filter(t=>ray.intersectTriangle(...t,true,hit)).length,1,`one front-facing soffit at lateral ${z}`);
  assert(Math.abs(hit.y+.35)<1e-5);
}
world.dispose();assert.equal(scene.children.length,0);
const terrain=createTerrainSampler(map),civicScene=new THREE.Scene(),civic=createCivicView(civicScene,map,terrain.heightAt,{roadHeightAt:terrain.roadHeightAt});
assert.equal(civic.stats.bridgeParapets,160,'existing physical rail polygons retain their span count');
assert(civic.stats.bridgeTriangles<=1400,'shoulders and fascia stay in the existing bounded bridge batch');
const mesh=civicScene.children[0].children.find(m=>m.name==='Source lake bridge parapets'),p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
const shoulder=new THREE.Color(0xb7b3a5);let shoulderVertices=0;
for(let i=0;i<p.count;i++)if(Math.abs(c.getX(i)-shoulder.r)<1e-5&&Math.abs(c.getY(i)-shoulder.g)<1e-5&&Math.abs(c.getZ(i)-shoulder.b)<1e-5)shoulderVertices++;
assert.equal(shoulderVertices,46*6,'both 23-span Kings non-sidewalk edges get a continuous solid shoulder');
const shots=createShotObstacles({buildings:[],barriers:[],roads:lake},{bridgeSegments:terrain.bridgeSegments});
for(const name of ['Commonwealth Avenue','Kings Avenue']) {
 const owned=lake.filter(r=>r.name===name);
 const line=segments.filter(s=>s.road.name===name).sort((a,b)=>b.length-a.length)[0];
 const [x,z]=line.a.map((v,i)=>v+(line.b[i]-v)*.43),deck=terrain.roadHeightAt(line.road,x,z);
 const sample={x,z,y:deck-2,dx:0,dy:1,dz:0,range:5};
 const local={...map,roads:owned,buildings:[],areas:[],landmarks:[],spawn:{x,z},
  bounds:{minX:x-25,maxX:x+25,minZ:z-25,maxZ:z+25}};
 const localScene=new THREE.Scene(),view=createWorldView(localScene,local,{lowGraphics:true,terrainSampler:terrain});
 ray.set(new THREE.Vector3(x,sample.y,z),new THREE.Vector3(0,1,0));
 const crossings=concreteTriangles(localScene).filter(t=>ray.intersectTriangle(...t,true,hit));
 assert.equal(crossings.length,1,`${name} concrete deck remains visible from below`);
 assert(Math.abs(hit.y-deck+.35)<.055,`${name} underside follows its sampled deck grade`);
 assert(Math.abs((hit.y-sample.y)-shots.trace(sample))<.055,`${name} visible bridge and upward cover trace agree`);
 view.dispose();
}
const full=await loadCapitalMap(),fullTerrain=createTerrainSampler(full);
const kent=fullTerrain.stats.clearance.crossings.find(site=>site.over==='way/667672050');
assert(kent,'retained Kent Street source overpass exists');
const kentRoad=full.roads.find(r=>r.sourceId===kent.over),adelaide=full.roads.find(r=>r.sourceId===kent.under);
const kentDeck=fullTerrain.roadHeightAt(kentRoad,kent.x,kent.z);
const kentUnder=fullTerrain.roadHeightAt(adelaide,kent.x,kent.z);
assert(kentDeck-kentUnder>=4.99);
const path={id:'narrow-bridge',name:'Fixture shared path',type:'cycleway',width:3,points:[[0,11],[98,11]],
  sourceTags:{bridge:'yes',layer:'1'}};
const fixture={roads:[path],buildings:[],bounds:{minX:0,maxX:100,minZ:0,maxZ:40},spawn:{x:40,z:11},
  bridgeDecks:[{roadId:path.id,heights:[8,8]}]};
const pathTerrain=createTerrainSampler(fixture);
assert.equal(roadProfile(path).trafficAllowed,false);
assert.equal(roadProfile(path).busAllowed,false);
assert.equal(roadProfile(path).pavementWidth,0);
assert.equal(roadProfile(path).hasKerb,false);
const results=[];
for(const [name,x,z,base,deck,local,sampler] of [
  ['Kent Street',kent.x,kent.z,kentUnder+1.5,kentDeck,
    {...full,roads:[kentRoad,adelaide],areas:[],buildings:[],landmarks:[],spawn:kent,
      bounds:{minX:kent.x-25,maxX:kent.x+25,minZ:kent.z-25,maxZ:kent.z+25}},fullTerrain],
  ['narrow cycleway',41.3,11,5,8,fixture,pathTerrain],
]) {
  const localScene=new THREE.Scene(),view=createWorldView(localScene,local,{lowGraphics:true,terrainSampler:sampler});
  const shell=concreteTriangles(localScene);
  const shot=createShotObstacles({roads:local.roads},{bridgeSegments:sampler.bridgeSegments.filter(s=>local.roads.some(r=>r.id===s.roadId))});
  for(const lateral of name==='narrow cycleway'?[0,1.4,1.7]:[0]) {
    const trace={x,z:z+lateral,y:base,dx:0,dy:1,dz:0,range:10};
    ray.set(new THREE.Vector3(x,base,z+lateral),new THREE.Vector3(0,1,0));
    const captured=shell.filter(t=>ray.intersectTriangle(...t,true,hit));
    assert.equal(captured.length,lateral>1.5?0:1,`${name} underside matches existing paved outline`);
    if(lateral>1.5) assert.equal(shot.trace(trace),trace.range,'no invisible collision outside narrow deck');
    else assert(Math.abs((hit.y-base)-shot.trace(trace))<.055&&Math.abs(hit.y-deck+.35)<.055);
  }
  view.dispose();results.push(shell.length);
}
console.log(`PASS actual Commonwealth/Kings/Kent deck soffits, exact 3 m cycleway clearance, retained source lanes, ${shoulderVertices/3} civic shoulder triangles and ${results.join('/')} local soffit triangles`);
civic.dispose();assert.equal(civicScene.children.length,0);
