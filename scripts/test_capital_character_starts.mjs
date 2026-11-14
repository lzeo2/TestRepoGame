import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareCharacterStart } from '../Games/Capital Drive/character-start.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { EXTRA_STORES, BARRIERS as SKATE_BARRIERS, SKATE_BUILDING_OPENING } from '../Games/Capital Drive/civic-extras.js';
import { CIVIC_INTERIOR_ENTRIES } from '../Games/Capital Drive/civic-view.js';
import { POOL_BARRIERS, MANUKA_POOL_BASIN } from '../Games/Capital Drive/landmarks.js';
import { CAMPUS_BARRIERS } from '../Games/Capital Drive/campus.js';
import { HIGHWAY_BARRIERS } from '../Games/Capital Drive/highway-barriers.js';
import { generateParkedCars } from '../Games/Capital Drive/parking-layout.js';

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const [base, profiles, north] = await Promise.all(['canberra', 'road-profiles', 'canberra-north'].map(json));
const map = applyMapExpansion(applyRoadProfiles(base, profiles), north);
map.landmarks.push(...[...MAPPED_STORES, ...EXTRA_STORES].map(store => ({ ...store, store: true })));
map.barriers = [...POOL_BARRIERS, ...CAMPUS_BARRIERS, ...HIGHWAY_BARRIERS, ...SKATE_BARRIERS.map(b => {
  const dx=b.b[0]-b.a[0],dz=b.b[1]-b.a[1],d=Math.hypot(dx,dz),nx=-dz/d*b.width/2,nz=dx/d*b.width/2;
  return {...b,points:[[b.a[0]+nx,b.a[1]+nz],[b.b[0]+nx,b.b[1]+nz],[b.b[0]-nx,b.b[1]-nz],[b.a[0]-nx,b.a[1]-nz]]};
})];
map.collisionReplacedBuildingIds=['act-75267-0','osm-584970595'];
map.buildings=map.buildings.map(b=>b.id===SKATE_BUILDING_OPENING.buildingId?{...b,innerRings:[{points:SKATE_BUILDING_OPENING.polygon}]}:b);
map.areas.push({id:'manuka-pool-water',type:'water',points:MANUKA_POOL_BASIN});
const simulation=createSimulation(map,{trafficCount:0});
const parked=generateParkedCars(map,{isClear:(x,z,radius,pose)=>simulation.canOccupy(pose,{length:4.8,width:2})});
simulation.setParkedCars(parked);
const campaign=createCampaign(map),gameplay=createGameplay(map,simulation);
const sourceBefore=JSON.stringify(campaign.characters),entriesBefore=JSON.stringify(CIVIC_INTERIOR_ENTRIES);
for(const hero of campaign.characters) {
  simulation.reset();
  const before={...simulation.player};
  assert.equal(prepareCharacterStart(simulation,hero),null);
  assert.equal(prepareCharacterStart(simulation,hero,{initial:false,publicEntries:CIVIC_INTERIOR_ENTRIES}),null);
  assert.deepEqual(simulation.player,before,'live calls cannot move the player car');
  let checks=0;
  const moveActor=simulation.moveActor,canOccupy=simulation.canOccupy;
  simulation.moveActor=(...args)=>{checks++;return moveActor(...args);};
  simulation.canOccupy=(...args)=>{checks++;return canOccupy(...args);};
  const pose=prepareCharacterStart(simulation,hero,{initial:true,publicEntries:CIVIC_INTERIOR_ENTRIES});
  simulation.moveActor=moveActor;simulation.canOccupy=canOccupy;
  assert(pose,`${hero.id} finds an actual clear foot start`);assert(Object.isFrozen(pose));
  assert(checks<=200,'initial candidate checks remain bounded');
  assert(Math.hypot(pose.x-simulation.player.x,pose.z-simulation.player.z)>=6,'parked car stays away from the adult');
  assert(!simulation.moveActor({...pose},0,0,.45).blocked,'foot start passes actual standing-body collision');
  assert(simulation.canOccupy(simulation.player),'parked car fits actual source geometry and cars');
  gameplay.reset({sandbox:false,onFoot:true,startPose:pose});
  assert.equal(gameplay.state.mode,'foot',`${hero.id} does not silently fall back to vehicle mode`);
  assert.equal(gameplay.state.actor.x,pose.x);assert.equal(gameplay.state.actor.z,pose.z);
  if(hero.id==='corporate') {
    const entry=CIVIC_INTERIOR_ENTRIES[0];
    assert(Math.hypot(pose.x-entry.x+Math.sin(entry.yaw)*2,pose.z-entry.z+Math.cos(entry.yaw)*2)<1e-8,'corporate starts at the actual Centre exterior approach');
  }
  console.log('PASS character start',hero.id,JSON.stringify(pose),'candidate checks',checks);
}
assert.equal(JSON.stringify(campaign.characters),sourceBefore);assert.equal(JSON.stringify(CIVIC_INTERIOR_ENTRIES),entriesBefore);
assert.equal(prepareCharacterStart(simulation,{start:{x:NaN,z:0}},{initial:true}),null);
console.log('PASS actual expanded/profiled character starts, source barriers,',parked.length,'parked cars, immutable inputs, live-call rejection and on-foot reset');
