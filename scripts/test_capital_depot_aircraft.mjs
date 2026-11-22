import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createAircraft} from '../Games/Capital Drive/aircraft.js';
import {createAircraftView} from '../Games/Capital Drive/aircraft-view.js';
import {createCampaignWorld} from '../Games/Capital Drive/campaign-world.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {applyStreetAssetRoofs} from '../Games/Capital Drive/street-assets.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';

const data=async n=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${n}.json`,import.meta.url)));
const base=applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(await data('canberra'),await data('road-profiles')),await data('canberra-north')));
base.terrainTiles=[(await data('north-terrain')).terrain];
const extended=applyNorthWest(base,await data('north-west'),await data('north-west-terrain'));
const map=applyDefenceDepot(applyAirport(extended,await data('airport'),await data('airport-terrain')));
const depot=map.defenceDepot,terrain=createTerrainSampler(map);
map.barriers=[...depot.fences,...depot.vehicleBarriers];
const simulation=createSimulation(map,{trafficCount:0,parkedCount:0,isOnBridge:terrain.isOnBridge,vehicleHeightAt:terrain.vehicleHeightAt});
const aircraft=createAircraft(map,simulation,{heightAt:terrain.heightAt});
const fleet=aircraft.snapshot().planes;
const jet=fleet.find(p=>p.id==='jet:depot');
assert(jet?.depot&&jet.name==='Depot interceptor');
assert.equal(fleet.filter(p=>p.kind==='jet'&&!p.depot).length,2,'airport jets retain both original stands');
const sync=()=>simulation.setExternalVehicles([...aircraft.snapshot().planes.filter(p=>!p.airborne).map(p=>({...p,width:p.kind==='helicopter'?3.4:4})),depot.drivableTank]);
sync();
const point=(u,v)=>{const [x,z]=depot.point(u,v);return {x,z};};
const walker={...depot.landmark,yaw:jet.yaw};
const door=point(36.7,39.2);
for(const waypoint of [point(0,39.2),door]){
  for(let i=0;i<300&&Math.hypot(walker.x-waypoint.x,walker.z-waypoint.z)>.01;i++){
    const dx=waypoint.x-walker.x,dz=waypoint.z-walker.z,factor=Math.min(1,.35/Math.hypot(dx,dz));
    assert(!simulation.moveActor(walker,dx*factor,dz*factor,.45).blocked,'real swept route from the depot gate remains open');
  }
  assert(Math.hypot(walker.x-waypoint.x,walker.z-waypoint.z)<.01);
}
const context={pose:walker,onFoot:true,valid:true,sandbox:false};
assert.equal(aircraft.nearest(walker)?.id,jet.id);
assert(aircraft.interact(context).challenge);
for(let key=0;key<8;key++){
  for(let i=0;i<40&&aircraft.challenge.phase!=='cue';i++)aircraft.step(.02,{},context);
  assert.equal(aircraft.challenge.phase,'cue');
  aircraft.step(.02,{challenge:{[aircraft.challenge.expectedKey]:true}},context);
  if(key<7)aircraft.step(.02,{},context);
}
assert.equal(aircraft.active.id,jet.id);
const thefts=aircraft.drainEvents().filter(event=>event.type==='stolen');
assert.equal(thefts.length,1);
const world=createCampaignWorld();assert(world.recordAircraftTheft(thefts[0]));
const scene=new THREE.Scene(),view=createAircraftView(scene,terrain.heightAt);
view.update(aircraft.snapshot(),jet);
const shown=scene.getObjectByName(jet.name);
assert(shown?.visible&&view.stats.meshes===5);
let fenceHeight=null;
for(let i=0;i<600&&aircraft.active.altitude<18&&!aircraft.active.wrecked;i++){
  aircraft.step(1/60,{throttle:1,climb:true},{...context,onFoot:false});sync();
  const active=aircraft.active;
  if(fenceHeight===null&&Math.hypot(active.x-jet.x,active.z-jet.z)>=78)fenceHeight=active.altitude;
}
assert(aircraft.active.airborne&&!aircraft.active.wrecked&&aircraft.active.altitude>=18,'ordinary input flies the interceptor off the depot strip');
assert(fenceHeight>2.2,'nose clears the perimeter fence when first reaching it');
aircraft.reset(world.snapshot());sync();view.update(aircraft.snapshot(),jet);
assert.equal(aircraft.snapshot().planes.some(p=>p.id===jet.id),false);
assert.equal(shown.visible,false,'saved theft removes the live view as well as the entity');
assert.equal(aircraft.nearest(walker),null);
aircraft.reset({absentAircraft:fleet.map(p=>p.id)});sync();
const reserve=aircraft.snapshot().planes;
assert.deepEqual(reserve.map(p=>p.id),['loan:jet','loan:helicopter']);
const loanRotor=reserve[1],originalRotor=fleet.find(p=>p.kind==='helicopter');
assert(!loanRotor.depot&&Math.hypot(loanRotor.x-originalRotor.x,loanRotor.z-originalRotor.z)>100,
  'airport training helicopter keeps the optional flight available without filling the depot pad');
view.dispose();assert.equal(scene.children.length,0);
console.log('PASS depot interceptor: original map, unobstructed gate-to-door walk, one theft, real ground roll and clear fence, saved departure.');
