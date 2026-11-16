import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createTrafficView} from '../Games/Capital Drive/traffic-view.js';
import {createWorldView} from '../Games/Capital Drive/world-view.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
const json=async n=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${n}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
const before=JSON.stringify(map),terrain=createTerrainSampler(map);
const cases=[
 ['Flynn Drive','23035340-north-0',[-945.1485714285715,-2568.940857142857],[-945.3928571428571,-2568.9886857142856]],
 ['Barrine Drive','1089981018-north-0',[-880.2679496008114,-2929.958654802882],[-880.021446868571,-2929.9258132728273]],
 ['Parkes Way','1369503180-0',[992.6055079342547,-2130.823003850052],[992.7118715706183,-2130.5979771120838]],
 ['Bowen Drive','31345303-0',[258.3816984477051,-1742.6389541621506],[258.48780234380905,-1742.4151879283843]]
];
for(const [name,id,a,b]of cases){
 const road=map.roads.find(r=>r.id===id);assert(road);
 const oldJump=Math.abs(terrain.heightAt(...a)-terrain.heightAt(...b));assert(oldJump>1.5,`${name}: reproduces foreign-deck cliff`);
 const jump=Math.abs(terrain.roadHeightAt(road,...a)-terrain.roadHeightAt(road,...b));assert(jump<.15,`${name}: ground contour remains smooth`);
 for(const p of [a,b]){
  assert.equal(terrain.roadHeightAt(road,...p),terrain.groundHeightAt(...p),'lower road never inherits foreign deck');
  for(const yaw of [Math.atan2(-(b[0]-a[0]),-(b[1]-a[1])),Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]))+Math.PI]){
   const pose={x:p[0],z:p[1],yaw};
   assert.equal(terrain.vehicleHeightAt(pose,road),terrain.roadHeightAt(road,...p),'known vehicle road agrees with rendered surface in both directions');
  }
 }
 // An unbound player car also follows the local road heading at the crossing.
 let closest=null;
 for(let i=1;i<road.points.length;i++){
  const u=road.points[i-1],v=road.points[i],dx=v[0]-u[0],dz=v[1]-u[1],t=Math.max(0,Math.min(1,((a[0]-u[0])*dx+(a[1]-u[1])*dz)/(dx*dx+dz*dz)));
  const x=u[0]+dx*t,z=u[1]+dz*t,d=Math.hypot(x-a[0],z-a[1]);
  if(!closest||d<closest.d)closest={x,z,d,yaw:Math.atan2(-dx,-dz)};
 }
 for(const yaw of [closest.yaw,closest.yaw+Math.PI])assert(Math.abs(terrain.vehicleHeightAt({...closest,yaw})-terrain.roadHeightAt(road,closest.x,closest.z))<.1,`${name}: local heading selects lower road in both directions`);
 console.log(`${name}: legacy cliff ${oldJump.toFixed(3)}m -> source road delta ${jump.toFixed(3)}m`);
}
let bridgeSamples=0;
for(const road of map.roads.filter(r=>['Commonwealth Avenue','Kings Avenue'].includes(r.name)&&r.sourceTags?.bridge==='yes')){
 for(const p of road.points){assert(terrain.roadHeightAt(road,...p)>=terrain.groundHeightAt(...p));bridgeSamples++;}
}
assert(bridgeSamples>20);
for(const id of ['4878920-north-0','4878927-0']) {
 const road=map.roads.find(r=>r.id===id),a=road.points[0],b=road.points[1],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,yaw=Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]));
 assert(terrain.roadHeightAt(road,x,z)>=8.43,'actual lake bridge keeps authored clearance');
 for(const heading of [yaw,yaw+Math.PI])assert(Math.abs(terrain.vehicleHeightAt({x,z,yaw:heading})-terrain.roadHeightAt(road,x,z))<.1,'unbound car remains on actual bridge in both directions');
}
const bridge={id:'explicit-deck',type:'primary',width:8,sourceTags:{bridge:'yes'},points:[[0,0],[100,0]]};
const approach={id:'approach',type:'primary',width:8,points:[[-50,0],[0,0]]};
const grade=createTerrainSampler({roads:[bridge,approach],bridgeDecks:[{roadId:bridge.id,heights:[10,10]}]});
assert.equal(grade.roadHeightAt(approach,0,0),grade.roadHeightAt(bridge,0,0),'explicit deck and source-connected approach share abutment elevation');
assert.equal(grade.roadHeightAt(approach,-20,0),0,'grade blend is finite');
assert(grade.roadHeightAt(approach,-.01,0)>9.99,'approach has no vertical abutment step');
// Render an actual lower-road crossing together with the interfering bridge.
// The old global sampler produces near-vertical subdivided road triangles here.
for(const [name,id,a]of cases){
 const lower=map.roads.find(r=>r.id===id);
 const roads=map.roads.filter(r=>r===lower||r.sourceTags?.bridge==='yes');
 const local={...map,roads,buildings:[],areas:[],landmarks:[],spawn:{x:a[0],z:a[1]},bounds:{minX:a[0]-50,maxX:a[0]+50,minZ:a[1]-50,maxZ:a[1]+50}};
 const scene=new THREE.Scene(),view=createWorldView(scene,local,{lowGraphics:true});let vertices=0,cliffs=0;
 scene.traverse(o=>{if(!o.isMesh||!/^Canberra (road|pavement)$/.test(o.name))return;
  const p=o.geometry.attributes.position;vertices+=p.count;
  for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++){
   const u=i+j,v=i+(j+1)%3;
   if(Math.hypot(p.getX(u)-a[0],p.getZ(u)-a[1])>25)continue;
   const horizontal=Math.hypot(p.getX(u)-p.getX(v),p.getZ(u)-p.getZ(v)),vertical=Math.abs(p.getY(u)-p.getY(v));
   if(horizontal<1.5&&vertical>1.5)cliffs++;
  }
 });
 assert.equal(cliffs,0,`${name}: actual rendered road/pavement has no foreign-deck cliff triangles`);
 assert(vertices>0&&vertices<250000,'retained bridge roads have a bounded vertex count');
 console.log(`${name}: rendered ${vertices} road/pavement vertices, zero cliff triangles`);
 view.dispose();assert.equal(scene.children.length,0);
}
assert.equal(JSON.stringify(map),before,'source grids, roads and tags remain unchanged');
console.log(`Capital bridge roads: PASS (${bridgeSamples} bridge source vertices retained; four actual under-road crossings, vehicle owner agreement, rendered cliff rejection and disposal)`);

const lower=map.roads.find(r=>r.id===cases[0][1]),point=cases[0][2];
const car={id:'bridge-view-probe',modelId:'lantern',color:0xffffff,x:point[0],z:point[1],yaw:1.4,edge:{road:lower}};
const scene=new THREE.Scene();let callbacks=0;
const traffic=createTrafficView(scene,()=>99,[car],{vehicleHeightAt:(pose,road)=>{
 assert.equal(road,lower,'instanced traffic forwards its authoritative edge road');
 assert.equal(pose.yaw,car.yaw,'pitch probes retain heading');callbacks++;return terrain.vehicleHeightAt(pose,road);
}});
traffic.update(car);assert.equal(callbacks,3,'body/front/rear all use owner callback');
const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
scene.traverse(o=>{if(o.isInstancedMesh&&o.count){o.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert(Math.abs(position.y-terrain.roadHeightAt(lower,car.x,car.z)-.18)<.001,'instanced vehicle rests on lower rendered road');}});
traffic.dispose();assert.equal(scene.children.length,0);
console.log('Capital bridge traffic adapter: PASS (known road and heading forwarded for body/pitch, actual instance elevation, disposal)');
