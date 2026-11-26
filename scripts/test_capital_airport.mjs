import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {buildRoadGraph,createSimulation} from '../Games/Capital Drive/simulation.js';
import {createRoutePlanner} from '../Games/Capital Drive/road-network.js';
import {createAirportView} from '../Games/Capital Drive/airport-view.js';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';

const data=async file=>JSON.parse(await readFile(new URL('../Games/Capital Drive/data/'+file,import.meta.url)));
const base=await data('canberra.json'),north=await data('canberra-north.json'),snapshot=await data('airport.json');
const before=JSON.stringify(base),pinned=JSON.stringify(snapshot),map=applyAirport(applyMapExpansion(base,north),snapshot);
assert.equal(JSON.stringify(base),before);assert.equal(JSON.stringify(snapshot),pinned);
assert.equal(map.terrain,base.terrain,'original source grid unchanged');
assert.equal(map.bounds.maxX,snapshot.bounds.maxX);assert.equal(map.bounds.minX,base.bounds.minX);
assert(map.airportTerrain.estimated);assert.equal(map.airportTerrain.source.includes('estimates'),true);
assert(map.landmarkBuildingIds.includes(map.airport.terminalBuildingId));
assert(map.landmarkTreeExclusions.includes(map.airport.aerodrome.points));
assert.equal(snapshot.meta.source.license,'ODbL-1.0');assert.equal(snapshot.meta.source.files.length,9);
for(const f of snapshot.meta.source.files){assert.match(f.url,/^https:\/\/api\.openstreetmap\.org\/api\/0\.6\/map.json\?bbox=/);assert.match(f.sha256,/^[a-f\d]{64}$/);assert(!f.file.includes('/'));}
for(const r of snapshot.roads){assert.equal(r.points.length,r.nodes.length);assert(r.sourceTags.highway);assert.match(r.sourceId,/^way\/\d+$/);}
const roadsBefore=map.roads.length,again=applyAirport(map,snapshot);assert.equal(again.roads.length,roadsBefore);
const graph=buildRoadGraph(map.roads),planner=createRoutePlanner(graph),anchor=map.landmarks.find(p=>p.id==='canberra-airport');
const outward=planner.findEdges(base.spawn,anchor),homeward=planner.findEdges(anchor,base.spawn);
assert(outward.length>40&&homeward.length>40,'airport public approach connects both directions to original playable map');
assert(outward.some(e=>e.road.name==='Pialligo Avenue'),'real public approach uses Pialligo Avenue');
assert(outward.some(e=>e.road.name==='Terminal Avenue'),'route reaches actual public Terminal Avenue');
assert(Math.hypot(outward.at(-1).to.x-anchor.x,outward.at(-1).to.z-anchor.z)<30,'destination stays on actual terminal approach');
for(const e of outward)assert(!['no','private'].includes(e.road.sourceTags?.access),'route respects public access');
const terminal=map.buildings.find(b=>b.id===map.airport.terminalBuildingId);assert.equal(terminal.points.length,107);
assert.deepEqual(new Set(map.airport.surfaces.filter(s=>s.kind==='runway').map(s=>s.ref)),new Set(['12/30','17/35']));
const sampler=createTerrainSampler(map),old=createTerrainSampler(applyMapExpansion(base,north));
for(let z=base.bounds.minZ;z<2000;z+=19.37){assert(Math.abs(sampler.groundHeightAt(base.bounds.maxX,z)-old.groundHeightAt(base.bounds.maxX,z))<1e-8,'estimated terrain seam preserves source edge exactly');assert.equal(sampler.groundHeightAt(base.bounds.maxX-1,z),old.groundHeightAt(base.bounds.maxX-1,z));}
for(const s of map.airport.surfaces)for(const p of s.points)assert(Number.isFinite(sampler.heightAt(...p)));
assert.equal(sampler.groundHeightAt(anchor.x,anchor.z),25);
// Terminal body retains the same exact source footprint for static collision.
const sim=createSimulation(map,{trafficCount:0,parkedCount:0,isOnBridge:sampler.isOnBridge});
let clearApproachEdges=0;
for(const edge of outward){
 const x=(edge.from.x+edge.to.x)/2,z=(edge.from.z+edge.to.z)/2;if(x<=base.bounds.maxX)continue;
 const yaw=Math.atan2(-(edge.to.x-edge.from.x),-(edge.to.z-edge.from.z));
 assert(sim.canOccupy({x,z,yaw},{length:4.5,width:1.8}),`new source approach admits actual car body: ${edge.road.sourceId}`);clearApproachEdges++;
}
assert(clearApproachEdges>100,'vehicle clearance covers new eastern approach, including Pialligo bridge');
const centre=terminal.points.reduce((a,p)=>({x:a.x+p[0]/terminal.points.length,z:a.z+p[1]/terminal.points.length}),{x:0,z:0});
assert.equal(sim.canOccupy({...centre,yaw:0},{length:4.5,width:1.8}),false,'terminal remains a physical body');
const scene=new THREE.Scene(),view=createAirportView(scene,map,sampler.heightAt);assert.equal(view.stats.residentChunks,0,'distant airport allocates no geometry');
assert(view.stats.terminalSunshades>4&&view.stats.terminalSunshades<80,'sunshade runs follow the public terminal street facade');
for(let i=0;i<30;i++)view.update(anchor);
assert(view.stats.residentChunks>0&&view.stats.residentChunks<=28);assert.equal(view.stats.pendingChunks,0);
assert(view.stats.drawCalls<=28&&view.stats.triangles>100&&view.stats.triangles<25000);
assert.equal(view.stats.terminalFootprints,1);assert.equal(view.stats.sourceSurfaces,120);
const initial=view.stats;let disposed=0;for(const mesh of scene.children[0].children){assert(mesh.geometry.attributes.position.array.every(Number.isFinite));mesh.geometry.addEventListener('dispose',()=>disposed++);}
view.update(anchor);assert.equal(view.stats.createdChunks,initial.createdChunks,'idle view never rebuilds completed chunks');
view.update({x:0,z:0});assert.equal(view.stats.residentChunks,0);assert(disposed>0,'remote chunks dispose buffers');
for(const surface of map.airport.surfaces.filter(s=>s.kind==='runway'))for(const p of [surface.points[0],surface.points.at(-1)]){
 for(let i=0;i<20;i++)view.update({x:p[0],z:p[1]});assert(view.stats.residentChunks<=28);assert(view.stats.drawCalls>0,'source runway ends stream locally');
}
view.update(null);assert.equal(view.stats.residentChunks,0);view.dispose();view.dispose();assert.equal(scene.children.length,0);assert(view.stats.disposed);
console.log(`Capital airport PASS: ${snapshot.roads.length} sourced road sections, both-way route ${outward.length}/${homeward.length} edges via Pialligo/Terminal avenues; terminal collision, two runway axes, exact terrain seam; <=28 resident chunks, finite geometry and disposal.`);
