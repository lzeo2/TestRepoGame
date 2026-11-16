import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createWorldView} from '../Games/Capital Drive/world-view.js';
import {readFile} from 'node:fs/promises';
import {coveredCentrePassage} from '../Games/Capital Drive/covered-passage.js';
import {createSimulation,pointOnLane} from '../Games/Capital Drive/simulation.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
const json=async n=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${n}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.collisionReplacedBuildingIds=['act-75267-0','osm-584970595'];
const before=JSON.stringify(map),passage=coveredCentrePassage(map);
assert(passage);assert.equal(passage.clearance,4.8);assert(passage.groundParts.length>=2);
assert.equal(JSON.stringify(map),before,'source geometry and tags remain unchanged');
for(const part of passage.groundParts)for(let i=0;i<part.points.length;i++) {
 const a=part.points[i],b=part.points[(i+1)%part.points.length],x=(a[0]+b[0])/2-passage.a[0],z=(a[1]+b[1])/2-passage.a[1];
 const along=x*passage.tx+z*passage.tz,across=-x*passage.tz+z*passage.tx;
 assert(!(along>passage.minAlong+.001&&along<passage.maxAlong-.001&&Math.abs(across)<passage.halfWidth-.001),'no shared rendered/collision ground wall crosses the open corridor');
}
assert.equal(coveredCentrePassage({...map,buildings:[{...passage.building,sourceTags:{layer:'0'}}]}),null);
assert.equal(coveredCentrePassage({...map,roads:[{...passage.road,sourceId:'other'}]}),null);
const sim=createSimulation(map,{trafficCount:0});sim.player.active=false;
const segments=sim.graph.segments.filter(s=>s.road.sourceId===passage.road.sourceId);
assert.equal(segments.length,2);assert(segments.every(s=>s.edges.length===2));
let samples=0;
for(const segment of sim.graph.segments.filter(s=>['way/347384260','way/380074148','way/701312042'].includes(s.road.sourceId)))for(const edge of segment.edges) {
 const yaw=Math.atan2(-edge.dx,-edge.dz);
 for(let d=0;d<=edge.length;d+=.25) {
  const pose=pointOnLane(edge,d);
  assert(sim.canOccupy({id:'probe',...pose}),`whole car blocked ${JSON.stringify(pose)}`);
  for(const side of [-1,1]) {
   const actor={id:'foot-probe',x:edge.from.x+edge.dx*d+edge.dz*side*6,z:edge.from.z+edge.dz*d-edge.dx*side*6};
   const result=sim.moveActor(actor,edge.dx*.1,edge.dz*.1,.45);
   assert(!result.blocked,`sidewalk actor blocked ${JSON.stringify(actor)}`);
  }
  samples++;
 }
}
// Same building still has physical ground walls outside the finite passage.
for(const p of [[-340,-4200],[-250,-4200],[-240,-4300]]) assert.equal(sim.canOccupy({id:'wall-probe',x:p[0],z:p[1],yaw:0}),false,`ground control ${p}`);
console.log(`Capital covered passage: PASS (${samples} directed whole-car lane samples and both 6m sidewalk sweeps; retained ground-wall controls; source unchanged)`);

for(const lowGraphics of [false,true]) {
 const scene=new THREE.Scene();
 const view=createWorldView(scene,{bounds:{minX:-500,maxX:0,minZ:-4500,maxZ:-4000},roads:[passage.road],buildings:[passage.building],areas:[],landmarks:[]},{lowGraphics});
 let upper=0,roof=0,ground=0;
 scene.traverse(o=>{
  if(!o.isMesh)return;
  const p=o.geometry.attributes.position,k=o.geometry.attributes.surfaceKind;
  for(let i=0;i<p.count;i++) {
   if(k?.array[i]===1){ assert(p.getY(i)>=4.8,'upper facade never drops into opening');upper++; }
   if(k?.array[i]===2)roof++;
   if(p.getY(i)<1&&p.getX(i)<-330)ground++;
  }
 });
 assert(upper>0&&roof>0&&ground>0,'upper facade, roof and ground mass all remain');
 view.dispose();assert.equal(scene.children.length,0);
}
assert.equal(JSON.stringify(map),before,'rendering and collision preserve source objects');
console.log('Capital covered passage visual geometry: PASS (Standard/Low facade minimum, retained roof and ground walls, disposal)');
