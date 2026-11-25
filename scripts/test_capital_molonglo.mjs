import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles,createRoutePlanner,roadProfile} from '../Games/Capital Drive/road-network.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {applyResidentialExpansion} from '../Games/Capital Drive/residential-expansion.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createAddressSearch} from '../Games/Capital Drive/address-search.js';
import {prepareWaterRing} from '../Games/Capital Drive/water-contact.js';
import {findRoute} from '../Games/Capital Drive/navigation.js';

const names=['canberra','road-profiles','canberra-north','north-terrain','airport','airport-terrain','north-west','north-west-terrain',
  'giant-spray','region-belconnen','region-north','region-south','residential-supplement','region-molonglo'];
const records=new Map(await Promise.all(names.map(async name=>{const raw=await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url));return[name,{data:JSON.parse(raw),hash:createHash('sha256').update(raw).digest('hex')}];})));
const data=name=>records.get(name).data,overlay=data('region-molonglo');
assert.equal(overlay.meta.regionId,'molonglo');assert.equal(overlay.meta.license,'ODbL-1.0');
assert.equal(overlay.meta.files.length,16,'15 bounded map tiles and the complete selected river relation');
for(const pin of overlay.meta.files){assert.match(pin.url,/^https:\/\/api\.openstreetmap\.org\/api\/0\.6\//);assert.match(pin.sha256,/^[a-f0-9]{64}$/);}
for(const pin of overlay.meta.priorSnapshots)assert.equal(records.get(pin.file.replace(/\.json$/,'')).hash,pin.sha256,`retained source ${pin.file}`);
assert.equal(overlay.meta.clipPolicy.sourceBoxes.length,2);assert.equal(overlay.meta.clipPolicy.sourceNodeFringeDegrees,.004);
assert(overlay.buildings.length>100&&overlay.buildings.length<=2100);
assert.equal(overlay.terrain.validation.unsupportedCells,0);assert.equal(overlay.terrain.validation.nearestFillCells,0);
assert.equal(overlay.terrain.validation.outsideSourceHullCells,0);assert(overlay.terrain.validation.sourceSamples>100000);
assert.match(overlay.terrain.gridSha256,/^[a-f0-9]{64}$/);
let prior=applyMapExpansion(applyRoadProfiles(data('canberra'),data('road-profiles')),data('canberra-north'));
prior.terrainTiles=[data('north-terrain').terrain];
prior=applyDefenceDepot(applyAirport(prior,data('airport'),data('airport-terrain')));
prior=applyNorthWest(prior,data('north-west'),data('north-west-terrain'),data('giant-spray'));
prior=applyRegionalExpansion(prior,['belconnen','north','south'].map(name=>data(`region-${name}`)));
prior=applyResidentialExpansion(prior,data('residential-supplement'));
const map=applyRegionalExpansion(prior,[overlay]);
assert(map.bounds.minX<prior.bounds.minX-1500,'actual admitted source geometry expands the western map edge');
assert.equal(map.bounds.maxX,prior.bounds.maxX);assert.equal(map.bounds.maxZ,prior.bounds.maxZ);assert.equal(map.bounds.minZ,prior.bounds.minZ);
for(const [i,road]of prior.roads.entries())assert.equal(map.roads[i],road);
const bodies=new Map(map.buildings.map(body=>[String(body.id),body]));for(const body of prior.buildings)assert.equal(bodies.get(String(body.id)),body);
assert.equal(new Set(map.buildings.map(body=>String(body.id))).size,map.buildings.length);
const sourceIds=map.buildings.map(body=>body.sourceId).filter(Boolean);assert.equal(new Set(sourceIds).size,sourceIds.length,'new source bodies never duplicate the residential supplement');
for(const [i,tile]of prior.terrainTiles.entries())assert.equal(map.terrainTiles[i],tile);
const terrain=createTerrainSampler(map),oldTerrain=createTerrainSampler(prior);
for(const p of [prior.spawn,...prior.landmarks.slice(0,20)])assert.equal(terrain.groundHeightAt(p.x,p.z),oldTerrain.groundHeightAt(p.x,p.z));
const simulation=createSimulation(map,{trafficCount:0,heightAt:terrain.heightAt,groundHeightAt:terrain.groundHeightAt,isOnBridge:terrain.isOnBridge,vehicleHeightAt:terrain.vehicleHeightAt});
const graph=simulation.graph,planner=createRoutePlanner(graph),search=createAddressSearch(map),reports=[];
const roads=new Set(overlay.roads.map(road=>road.id));
const publicNodes=[...graph.nodes.values()].filter(node=>node.outgoing.some(edge=>edge.road.name&&edge.road.type!=='service'&&roadProfile(edge.road).trafficAllowed));
const nearestPublic=point=>publicNodes.reduce((best,node)=>!best||Math.hypot(node.x-point.x,node.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?node:best,null);
for(const name of ['Coombs','Wright','Coppins Crossing','Denman Prospect Shops','Charles Weston School']){
  const place=map.landmarks.find(place=>place.name===name);assert(place,`source landmark ${name}`);
  // Landmarks are source polygon centres, not invented driveable entrances.
  const approach=nearestPublic(place);assert(Math.hypot(approach.x-place.x,approach.z-place.z)<300,'named public road reaches the source landmark');
  const out=findRoute(graph,prior.spawn,place),home=findRoute(graph,place,prior.spawn);
  for(const path of [out,home]){
    assert(path.length>30,`normal directed route reaches and returns from ${name}`);
    assert(path.every(([x,z])=>Number.isFinite(terrain.heightAt(x,z))));
    assert(path.some(([x,z])=>overlay.roads.some(road=>road.points.some(p=>p[0]===x&&p[1]===z))),`${name} crosses an actual new source street`);
  }
  const carOut=planner.findEdges(prior.spawn,approach),carHome=planner.findEdges(approach,prior.spawn);
  for(const path of [carOut,carHome])assert(path.length>30&&path.some(edge=>roads.has(edge.road.id)),`${name}: legal car route crosses the newly sourced corridor`);
  assert(search.search(name).some(hit=>hit.label===name),'offline source-name search reaches the actual pin');reports.push(`${name}:GPS${out.length}/${home.length},car${carOut.length}/${carHome.length}`);
}
const bridge=map.roads.find(road=>road.sourceId==='way/73201646');assert(bridge);
assert.equal(bridge.sourceTags.bridge,'yes');assert.equal(bridge.sourceTags.layer,'1');assert.equal(bridge.oneway,0);
assert.equal(bridge.nodes.length,4);assert(terrain.bridgeSegments.some(segment=>segment.roadId===bridge.id));
for(const road of overlay.roads){assert.equal(road.nodes.length,road.points.length);assert.match(road.sourceId,/^way\/\d+$/);}
for(const [sourceId,holes]of [['relation/8316669',2],['way/251681896',0]]){
  const area=map.areas.find(area=>area.sourceId===sourceId);assert(area&&Number.isFinite(area.surfaceY));assert.equal(area.innerRings.length,holes);
  for(const ring of [area.points,...area.innerRings.map(h=>h.points)])assert.deepEqual(ring[0],ring.at(-1));
  const outer=prepareWaterRing(area.points),islands=area.innerRings.map(h=>prepareWaterRing(h.points));let wet=null;
  for(const a of area.points){for(const b of area.points.slice(0,20)){
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(outer.contains(x,z)&&!islands.some(h=>h.contains(x,z))){wet={x,z};break;}
  }if(wet)break;}
  assert(wet);assert.equal(simulation.waterAt(wet.x,wet.z,{underBridge:true})?.id,area.id);
}
console.log(`PASS Molonglo actual sources: ${overlay.roads.length}new runs/${overlay.buildings.length}exact bodies, western edge ${prior.bounds.minX}→${map.bounds.minX}, source Coppins bridge/river islands/pond, retained terrain/houses/roads and bidirectional routes ${reports.join(', ')}; graph ${graph.nodes.size}/${graph.edges.length}`);
