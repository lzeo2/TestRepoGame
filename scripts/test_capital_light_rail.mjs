import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLightRail} from '../Games/Capital Drive/light-rail.js';
import {LIGHT_RAIL_SOURCE} from '../Games/Capital Drive/light-rail-source.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';

const read=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const [base,north,profiles,ground,northWest,northWestGround]=await Promise.all(
  ['canberra','canberra-north','road-profiles','north-terrain','north-west','north-west-terrain'].map(read));
const oldMap=applyMapExpansion(applyRoadProfiles(base,profiles),north);
oldMap.terrainTiles=[ground.terrain];
const map=applyNorthWest(oldMap,northWest,northWestGround);
const original=createLightRail(oldMap);
assert.equal(original.stops.length,0,'No partial rail beyond the currently available world');
assert.equal(original.interact({onFoot:true,pose:{x:0,z:0}}).ok,false);
original.step(1/60);

const sampler=createTerrainSampler(map),simulation=createSimulation(map,{ambientTraffic:0});
const canStand=(pose,ignoreId)=>!simulation.moveActor({...pose,id:ignoreId},0,0,.45).blocked;
const rail=createLightRail(map,{heightAt:sampler.groundHeightAt,canStand,canReach:simulation.hasLineOfSight});
const ids=['rail-alinga','rail-elouera','rail-ipima','rail-macarthur','rail-dickson'];
assert.deepEqual(rail.stops.map(stop=>stop.id),ids);
assert.equal(rail.vehicles.length,5);
assert.equal(rail.vehicles.filter(train=>train.active).length,4);
assert.equal(LIGHT_RAIL_SOURCE.source.license,'ODbL-1.0');
for(const chunk of LIGHT_RAIL_SOURCE.source.inputs) assert.match(chunk.sha256,/^[0-9a-f]{64}$/);
for(let i=0;i<rail.routes.length;i++)
  assert.deepEqual(rail.routes[i].points.at(-1),rail.routes[(i+1)%rail.routes.length].points[0],'mapped sections are joined');
for(const [i,stop] of rail.stops.entries()){
  assert.equal(stop.sourceId,`node/${LIGHT_RAIL_SOURCE.stops[i].station}`);
  assert(canStand(stop.approach),`${stop.id} dry platform approach is clear`);
  assert.equal(rail.nearStop(stop.approach).id,stop.id);
  assert(Number.isFinite(stop.y));
  assert(stop.trackGap>2.6 && stop.trackGap<6);
}
const alinga=rail.stops[0],ctx={onFoot:true,pose:alinga.approach};
assert(!rail.interact({...ctx,busy:true}).ok);
assert(!rail.interact({...ctx,recovering:true}).ok);
assert(!rail.interact({...ctx,indoors:true}).ok);
assert(!rail.interact({...ctx,onFoot:false}).ok);
assert(!rail.interact({...ctx,pose:{x:alinga.x+22,z:alinga.z}}).ok);
assert(rail.interact(ctx).boarded);
assert(rail.passenger);
assert.equal(rail.passengerStopId,'rail-alinga');
assert.equal(rail.seatPose,rail.seatPose,'Stable seat when parked');
const start=rail.seatPose;
rail.step(0); rail.step(NaN);
assert.equal(rail.seatPose,start);
for(let i=0;i<24;i++) rail.step(.25);
assert.equal(rail.passengerStopId,null,'In-flight seat never certifies a stopped heist objective');
assert.notEqual(rail.seatPose.z,start.z);
assert(rail.interact({}).stopping,'Moving exit requests a stop');
assert(rail.snapshot().exitRequested);
let travel=6;
while(!rail.passengerStopId && travel<47){rail.step(.25);travel+=.25;}
assert.equal(rail.passengerStopId,'rail-elouera');
assert(travel<47);
const exit=rail.interact({});
assert(exit.exited && exit.stopId==='rail-elouera');
assert(canStand(exit.exitPose));
assert(!rail.passenger && rail.seatPose===null);
rail.reset();
assert.equal(rail.vehicles.filter(train=>train.active).length,4);

const macarthur=rail.stops[3];
assert(rail.interact({onFoot:true,pose:macarthur.approach}).waiting);
const extra=rail.vehicles.at(-1);
assert(extra.active && extra.speed>0 && !extra.doorsOpen && !extra.stopId,'Spare drives into the platform');
let wait=0;
while(!extra.doorsOpen && wait<22){rail.step(.25);wait+=.25;}
assert.equal(extra.stopId,macarthur.id);
assert(wait<22,'Empty platform request has a short arrival');
simulation.setExternalVehicles(rail.vehicles);
assert(!canStand(macarthur.approach),'The actual stopped hull overlaps this narrow platform');
assert(canStand(macarthur.approach,extra.id),'Only the boarding train can be ignored for door access');
const blocker={...macarthur.approach,id:'platform-obstruction',length:3,width:2};
simulation.setExternalVehicles([...rail.vehicles,blocker]);
assert.equal(rail.interact({onFoot:true,pose:macarthur.approach}).ok,false,'Other vehicles still block boarding');
simulation.setExternalVehicles(rail.vehicles);
assert(rail.interact({onFoot:true,pose:macarthur.approach}).boarded);
simulation.setExternalVehicles([...rail.vehicles,blocker]);
assert.equal(rail.interact({}).ok,false,'Other vehicles still block exit');
simulation.setExternalVehicles(rail.vehicles);
assert.equal(rail.interact({}).exitPose,macarthur.approach,'The stopped train does not block its own platform exit');
simulation.setExternalVehicles([]);
rail.reset();

const visited=new Map(rail.vehicles.filter(train=>train.active).map(train=>[train.id,new Set()]));
for(let frame=0;frame<2400;frame++){
  const old=rail.vehicles.slice(0,4).map(train=>[train.x,train.z]);
  rail.step(.25);
  for(const [i,train] of rail.vehicles.slice(0,4).entries()){
    assert(Math.hypot(train.x-old[i][0],train.z-old[i][1])<6,'No gaps or teleporting through track turnbacks');
    if(train.doorsOpen) visited.get(train.id).add(train.stopId);
  }
}
for(const served of visited.values()) assert.deepEqual([...served].sort(),ids.slice().sort());
console.log(`PASS five sourced Canberra platforms, joined paired tracks and turnbacks, finite pooled railway, Alinga-to-Elouera ride ${travel}s, on-demand Macarthur arrival ${wait}s, guarded boarding and foot exit.`);
