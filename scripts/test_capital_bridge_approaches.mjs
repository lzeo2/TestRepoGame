import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
const before=JSON.stringify(map),terrain=createTerrainSampler(map),key=p=>p.join(',');
const ids=['4878920-north-0','75247036-north-0','4878927-0','4878928-0'];
let crossSections=0,profileSamples=0,footApproaches=0,worstSeam=0,smallestClearance=Infinity;
for(const id of ids){
 const road=map.roads.find(r=>r.id===id);assert(road);
 const half=roadProfile(road).driveWidth/2;
 for(const [p,q]of [[road.points[0],road.points[1]],[road.points.at(-1),road.points.at(-2)]]){
  const approaches=map.roads.filter(r=>r!==road&&!r.sourceTags?.bridge&&(key(r.points[0])===key(p)||key(r.points.at(-1))===key(p)));
  assert(approaches.length>0);
  const span=Math.hypot(q[0]-p[0],q[1]-p[1]),nx=-(q[1]-p[1])/span,nz=(q[0]-p[0])/span;
  for(const approach of approaches)for(const offset of [-half-1.8,-half,-half/2,0,half/2,half,half+1.8]){
   const x=p[0]+nx*offset,z=p[1]+nz*offset,deck=terrain.roadHeightAt(road,x,z),join=terrain.roadHeightAt(approach,x,z);
   const gap=Math.abs(deck-join);worstSeam=Math.max(worstSeam,gap);crossSections++;
   assert(gap<.02,`${road.name} ${id} meets ${approach.id} across lane/pavement at ${x},${z}: ${gap}m`);
   const yaw=Math.atan2(-(q[0]-p[0]),-(q[1]-p[1]));
   assert.equal(terrain.vehicleHeightAt({x,z,yaw},road),deck);
   assert.equal(terrain.vehicleHeightAt({x,z,yaw},approach),join);
  }
 }
 for(const p of [road.points[0],road.points.at(-1)]){
  const approach=map.roads.find(r=>r!==road&&!r.sourceTags?.bridge&&(key(r.points[0])===key(p)||key(r.points.at(-1))===key(p)));
  if(!approach)continue;
  const points=key(approach.points[0])===key(p)?approach.points:[...approach.points].reverse();
  const q=points[1],dx=q[0]-p[0],dz=q[1]-p[1],span=Math.hypot(dx,dz);
  const at=(distance,offset=0)=>({x:p[0]+dx/span*distance-dz/span*offset,z:p[1]+dz/span*distance+dx/span*offset});
  for(const offset of [-half+.5,0,half-.5]){
   const pose=at(12,offset);if(terrain.bridgeHeightAt(pose.x,pose.z)!==null)continue;
   assert(Math.abs(terrain.heightAt(pose.x,pose.z)-terrain.roadHeightAt(approach,pose.x,pose.z))<.001,'foot outside deck cap follows actual paved approach');footApproaches++;
  }
  for(const distance of [19.99,20.01]){
   const pose=at(distance);if(terrain.bridgeHeightAt(pose.x,pose.z)!==null)continue;
   assert(Math.abs(terrain.heightAt(pose.x,pose.z)-terrain.groundHeightAt(pose.x,pose.z))<.001,'foot approach outer end rejoins unchanged source terrain smoothly');
  }
  const verge=at(12,(Number(approach.width)||8)/2+3.1);
  if(terrain.bridgeHeightAt(verge.x,verge.z)===null)assert.equal(terrain.heightAt(verge.x,verge.z),terrain.groundHeightAt(verge.x,verge.z),'outside paved approach corridor remains source ground');
 }
 for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],span=Math.hypot(dx,dz),steps=Math.ceil(span);
  for(const offset of [-half-1.8,-half,0,half,half+1.8]){
   const at=u=>({x:a[0]+dx*u-dz/span*offset,z:a[1]+dz*u+dx/span*offset});
   const y=u=>{const p=at(u);return terrain.roadHeightAt(road,p.x,p.z);},y0=y(0),ym=y(.5),y1=y(1);
   for(let j=0;j<=steps;j++){
    const u=j/steps,p=at(u),deck=y(u),expected=y0*(1-u)+y1*u+(ym-(y0+y1)/2)*4*u*(1-u);
    assert(Math.abs(deck-expected)<.015,`lake deck smooth: ${id} segment${i} offset${offset} u${u} error${deck-expected}`);
    const clearance=deck-terrain.groundHeightAt(p.x,p.z);smallestClearance=Math.min(smallestClearance,clearance);
    assert(clearance>=-.001,'nominal lane/pavement deck clears underlying source terrain');profileSamples++;
   }
  }
 }
}
// The overlapping Commonwealth source carriageways must have one physical
// elevation at identical X/Z while retaining their distinct logical owners.
const first=map.roads.find(r=>r.id===ids[0]),second=map.roads.find(r=>r.id===ids[1]);
for(let i=1;i<first.points.length;i++)for(let j=0;j<=20;j++){
 const a=first.points[i-1],b=first.points[i],u=j/20,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;
 assert.equal(terrain.roadHeightAt(first,x,z),terrain.roadHeightAt(second,x,z),'overlapping Common logical roads share the physical deck field');
}
// Existing lower roads keep their ground owner at both actual crossings.
for(const [id,x,z]of [['23035340-north-0',-945.1485714285715,-2568.940857142857],['31345303-0',258.3816984477051,-1742.6389541621506]]){
 const road=map.roads.find(r=>r.id===id);assert.equal(terrain.roadHeightAt(road,x,z),terrain.groundHeightAt(x,z));
 assert(terrain.heightAt(x,z)>terrain.roadHeightAt(road,x,z)+2,'lower road retains actual separate source level');
}
let kingsGradeSamples=0,worstKingsGrade=0;
for(const id of ['4018736-0','666840802-0','546709079-0','546708610-0']){
 const road=map.roads.find(r=>r.id===id);
 const joint=road.points.find(p=>map.roads.some(bridge=>['4878927-0','4878928-0'].includes(bridge.id)&&bridge.points.some(q=>key(p)===key(q))));
 const points=key(road.points[0])===key(joint)?road.points:[...road.points].reverse(),a=points[0],b=points[1];
 const span=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/span,dz=(b[1]-a[1])/span;
 for(const offset of [-3,0,3]){
  let previous=null;
  for(let distance=0;distance<=30;distance+=.25){
   const x=a[0]+dx*distance-dz*offset,z=a[1]+dz*distance+dx*offset,y=terrain.roadHeightAt(road,x,z);
   assert(y>=terrain.groundHeightAt(x,z),'Kings grade stays above its unchanged source bank');
   if(previous!==null){const grade=Math.abs(y-previous)/.25;worstKingsGrade=Math.max(worstKingsGrade,grade);assert(grade<.06,`${id}: ordinary lane grade remains below 6%, got ${grade}`);}
   previous=y;kingsGradeSamples++;
  }
 }
}
// Native v2 trace: these exact poses previously climbed 9.465→11.563m in 6m.
const nativeKings=[[470.7267631330618,-1877.370919599721],[472.66531440748446,-1878.2943179830083],[474.3810240055607,-1879.1115692416972],[476.16216946751024,-1879.9599898440638]];
for(let i=1;i<nativeKings.length;i++){
 const [a,b]=[nativeKings[i-1],nativeKings[i]],yaw=Math.atan2(-(b[0]-a[0]),-(b[1]-a[1]));
 const from=terrain.vehicleHeightAt({x:a[0],z:a[1],yaw}),to=terrain.vehicleHeightAt({x:b[0],z:b[1],yaw});
 assert(Math.abs(to-from)/Math.hypot(b[0]-a[0],b[1]-a[1])<.06,'actual native Kings poses no longer inherit the 35% contour-bank ramp');
}
const explicitBridge={id:'explicit-lake',name:'Commonwealth Avenue',type:'primary',width:8,sourceTags:{bridge:'yes'},points:[[0,0],[300,0]]};
const explicitApproach={id:'explicit-approach',type:'primary',width:8,points:[[-40,0],[0,0]]};
const explicit=createTerrainSampler({roads:[explicitBridge,explicitApproach],bridgeDecks:[{roadId:explicitBridge.id,heights:[10,12]}]});
assert.equal(explicit.roadHeightAt(explicitBridge,150,0),11,'supplied surveyed/authored override wins over fitted lake estimate');
assert(Math.abs(explicit.roadHeightAt(explicitApproach,0,3)-10)<=10*Number.EPSILON,
  'explicit abutment plane remains shared across lane width within floating-point rounding');
assert(footApproaches>=12,'both bridges expose actual foot approach samples outside the deck mask');
assert.equal(JSON.stringify(map),before,'source coordinates, heights and tags remain immutable');
console.log(`Capital bridge approaches PASS: ${crossSections} real lane/pavement joins, worst seam ${worstSeam.toFixed(4)}m; ${footApproaches} bounded foot approaches; ${kingsGradeSamples} Kings lane-grade samples max ${(worstKingsGrade*100).toFixed(2)}%; ${profileSamples} smooth lake-deck samples, minimum bank clearance ${smallestClearance.toFixed(3)}m; shared Common field and retained Kings/Common under-road levels.`);
