import assert from 'node:assert/strict';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {buildRoadGraph} from '../Games/Capital Drive/simulation.js';
import {createTrafficLights} from '../Games/Capital Drive/traffic-lights.js';
import {createLightRail} from '../Games/Capital Drive/light-rail.js';
import {LIGHT_RAIL_SOURCE} from '../Games/Capital Drive/light-rail-source.js';
import {prepareWaterRing} from '../Games/Capital Drive/water-contact.js';

const map=await loadCapitalMap(),terrain=createTerrainSampler(map);
const report={grids:[],bridgeSegments:0,bridgeSamples:0,bridgeRoads:0,bridgeGrades:[],bridgeJoins:[],signals:0,signalHeads:0,rail:{},water:{polygons:0,rings:0,shoreSamples:0}};
const finite=(values,label)=>assert(values.every(Number.isFinite),label);
const within=(p,b)=>p[0]>=b.minX&&p[0]<=b.maxX&&p[1]>=b.minZ&&p[1]<=b.maxZ;
finite(Object.values(map.bounds),'playable map bounds');
assert(map.bounds.maxX>map.bounds.minX&&map.bounds.maxZ>map.bounds.minZ);
for(const grid of [map.terrain,...map.terrainTiles]){
  finite([grid.minX,grid.maxX,grid.minZ,grid.maxZ],'terrain extent');
  assert(grid.maxX>grid.minX&&grid.maxZ>grid.minZ);
  assert(Number.isInteger(grid.cols)&&grid.cols>1&&Number.isInteger(grid.rows)&&grid.rows>1);
  assert.equal(grid.heights.length,grid.cols*grid.rows);finite(grid.heights,'every source terrain cell');
  let min=Infinity,max=-Infinity;for(const height of grid.heights){min=Math.min(min,height);max=Math.max(max,height);}
  let samples=0;
  // Every grid row and column boundary, plus nine regular strata per grid.
  const points=[];
  for(let i=0;i<grid.cols;i++)for(const z of [grid.minZ,grid.maxZ])points.push([grid.minX+(grid.maxX-grid.minX)*i/(grid.cols-1),z]);
  for(let i=0;i<grid.rows;i++)for(const x of [grid.minX,grid.maxX])points.push([x,grid.minZ+(grid.maxZ-grid.minZ)*i/(grid.rows-1)]);
  for(const u of [0,.5,1])for(const v of [0,.5,1])points.push([grid.minX+(grid.maxX-grid.minX)*u,grid.minZ+(grid.maxZ-grid.minZ)*v]);
  for(const [x,z] of points){finite([terrain.groundHeightAt(x,z),terrain.heightAt(x,z)],'terrain boundary authority');samples++;}
  report.grids.push({cols:grid.cols,rows:grid.rows,cells:grid.heights.length,min,max,samples,
    extendsPlayableBounds:!within([grid.minX,grid.minZ],map.bounds)||!within([grid.maxX,grid.maxZ],map.bounds)});
}
const roads=new Map(map.roads.map(r=>[r.id,r])),byEnd=new Map(),key=p=>p.join(',');
for(const road of map.roads)for(const point of [road.points[0],road.points.at(-1)]){
  const k=key(point);if(!byEnd.has(k))byEnd.set(k,[]);byEnd.get(k).push(road);
}
const bridgeIds=new Set(terrain.bridgeSegments.map(s=>s.roadId));report.bridgeRoads=bridgeIds.size;
for(const road of map.roads){
  const tag=road.sourceTags?.bridge??road.tags?.bridge??road.bridge;
  if(tag&&tag!=='no')assert(bridgeIds.has(road.id),`${road.id} tagged bridge compiled into support spans`);
}
for(const segment of terrain.bridgeSegments){
  const road=roads.get(segment.roadId);assert(road);report.bridgeSegments++;
  finite([...segment.a,...segment.b,segment.y0,segment.y1,segment.radius],`${road.id} compiled bridge`);
  assert(segment.radius>0);
  const span=Math.hypot(segment.b[0]-segment.a[0],segment.b[1]-segment.a[1]);assert(span>0);
  let previous=null,maxGrade=0;
  for(const t of [0,.25,.5,.75,1]){
    const x=segment.a[0]+(segment.b[0]-segment.a[0])*t,z=segment.a[1]+(segment.b[1]-segment.a[1])*t;
    const y=terrain.roadHeightAt(road,x,z);
    finite([y,terrain.groundHeightAt(x,z),terrain.heightAt(x,z),terrain.vehicleHeightAt({x,z,yaw:0},road)],`${road.id} bridge authority`);
    assert.equal(terrain.vehicleHeightAt({x,z,yaw:0},road),y);
    if(previous!==null)maxGrade=Math.max(maxGrade,Math.abs(y-previous)/(span/4));
    previous=y;report.bridgeSamples++;
  }
  report.bridgeGrades.push({roadId:road.id,name:road.name||'',grade:maxGrade});
}
for(const id of bridgeIds){
  const road=roads.get(id);
  for(const p of [road.points[0],road.points.at(-1)])for(const approach of byEnd.get(key(p))||[]){
    if(approach===road||bridgeIds.has(approach.id))continue;
    const deck=terrain.roadHeightAt(road,...p),join=terrain.roadHeightAt(approach,...p);
    finite([deck,join],`${id} approach heights`);
    assert(Math.abs(deck-join)<.02,`${id} shares abutment support with ${approach.id}: ${deck-join}m`);
    report.bridgeJoins.push({roadId:id,approachId:approach.id,gap:Math.abs(deck-join)});
  }
}
report.bridgeGrades.sort((a,b)=>b.grade-a.grade);report.bridgeGrades=report.bridgeGrades.slice(0,8);
report.bridgeJoins.sort((a,b)=>b.gap-a.gap);report.bridgeJoinCount=report.bridgeJoins.length;report.bridgeJoins=report.bridgeJoins.slice(0,8);
// Confirmed branch abutments used to skip the approach due to deck-node degree.
report.correctedApproachGrades=[];
for(const [id,joint] of [['667689698-west-belconnen-0',[-9085.39,-11947.88]],['997055356-north-0',[-2400.89,-3748.52]]]){
  const road=roads.get(id),points=key(road.points[0])===key(joint)?road.points:[...road.points].reverse();
  const a=points[0],b=points[1],span=Math.hypot(b[0]-a[0],b[1]-a[1]);
  let previous=null,worst=0;
  for(let distance=0;distance<=Math.min(span,20);distance+=.25){
    const x=a[0]+(b[0]-a[0])*distance/span,z=a[1]+(b[1]-a[1])*distance/span,y=terrain.roadHeightAt(road,x,z);
    if(previous!==null)worst=Math.max(worst,Math.abs(y-previous)/.25);previous=y;
  }
  assert(worst<.15,`${id} corrected approach grade remains below 15%, got ${worst}`);
  report.correctedApproachGrades.push({id,maxGrade:worst});
}

const graph=buildRoadGraph(map.roads),lights=createTrafficLights(map,graph);
for(const signal of map.trafficSignals.signals){
  const node=graph.nodes.get(String(signal.id));assert(node,`${signal.id} source signal resolves to road graph`);
  assert(Math.hypot(signal.x-node.x,signal.z-node.z)<.08);report.signals++;
}
const edges=new Map(graph.edges.map(e=>[e.id,e]));
for(const head of lights.heads){
  const edge=edges.get(head.edgeId);assert(edge&&edge.to.id===head.nodeId,`${head.id} incoming road owner`);
  finite([head.x,head.z,head.yaw,head.stopPosition],'signal approach');assert(head.stopPosition>=0&&head.stopPosition<=edge.length);
  finite([terrain.heightAt(head.x,head.z)],'signal support terrain');
  assert(lights.approaches.some(a=>a.id===head.approachId));report.signalHeads++;
}
for(let tick=0;tick<248;tick++){
  lights.step(.5);
  for(const group of lights.groups)assert(new Set(group.approaches.filter(a=>a.color!=='red').map(a=>a.axis)).size<=1,'signal conflicts stay exclusive');
}
report.signalGroups=lights.groups.length;

const rail=createLightRail(map,{heightAt:terrain.heightAt});
assert.equal(rail.routes.length,LIGHT_RAIL_SOURCE.lines.length);assert.equal(rail.stops.length,LIGHT_RAIL_SOURCE.stops.length);
let railVertices=0;
for(const [i,line] of LIGHT_RAIL_SOURCE.lines.entries()){
  assert.equal(line.points.length,line.nodes.length);assert.deepEqual(rail.routes[i].points,line.points);
  for(const point of line.points){finite(point,'source rail point');assert(within(point,map.bounds));finite([terrain.heightAt(...point)],'rail terrain');railVertices++;}
}
for(const stop of rail.stops){finite([stop.x,stop.z,stop.y,stop.approach.x,stop.approach.z,stop.approach.y],'rail stop/approach');assert(rail.nearStop(stop.approach));}
for(const platform of rail.platforms){finite([platform.x,platform.z,platform.y,platform.yaw,platform.length,platform.platformWidth],'rail platform');assert(platform.length>0&&platform.platformWidth>0);}
report.rail={lines:rail.routes.length,stops:rail.stops.length,platforms:rail.platforms.length,vertices:railVertices};

// Independent linear parity oracle checks the production indexed narrow phase.
function parity(points,x,z){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
for(const water of map.areas.filter(a=>a.type==='water')){
  report.water.polygons++;
  if(water.surfaceY!==undefined)finite([water.surfaceY],`${water.id} surface height`);
  for(const points of [water.points,...(water.innerRings||[]).map(h=>h.points||h)]){
    const ring=prepareWaterRing(points);report.water.rings++;
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];if(a[0]===b[0]&&a[1]===b[1])continue;
      const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
      for(const [dx,dz] of [[.137,.071],[-.137,-.071]])assert.equal(ring.contains(x+dx,z+dz),parity(points,x+dx,z+dz),`${water.id} shoreline parity`);
      const contact=ring.contact(x,z,.45);assert(contact);finite([contact.nx,contact.nz,contact.depth],'water shoreline contact');assert(contact.depth>0);
      report.water.shoreSamples++;
    }
  }
}
console.log('PASS actual infrastructure finite/source-owner sweep '+JSON.stringify(report));
console.log('Coverage limits: bridge grade/join maxima are diagnostics, not survey or universal acceptance; water tests ring narrow phase, not combined polygon holes or swimming; rail tests source compilation/approaches, not collision clearance or passenger journeys. No native input, target-device performance, unseen geographic data, or real-world accuracy claim.');
