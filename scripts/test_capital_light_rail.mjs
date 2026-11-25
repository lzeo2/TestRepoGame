import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createLightRail } from '../Games/Capital Drive/light-rail.js';
import { LIGHT_RAIL_SOURCE } from '../Games/Capital Drive/light-rail-source.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyNorthWest } from '../Games/Capital Drive/north-west.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyDefenceDepot } from '../Games/Capital Drive/defence-depot.js';
import { applyRegionalExpansion } from '../Games/Capital Drive/regional-expansion.js';
import { applyRoadProfiles, createRoutePlanner, roadProfile } from '../Games/Capital Drive/road-network.js';
import { applyStreetAssetRoofs } from '../Games/Capital Drive/street-assets.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createHeistActivities } from '../Games/Capital Drive/heist-activities.js';
import { createAddressSearch } from '../Games/Capital Drive/address-search.js';
import { POOL_BARRIERS, MANUKA_POOL_BASIN } from '../Games/Capital Drive/landmarks.js';
import { CAMPUS_BARRIERS, CAMPUS_BUILDING_IDS } from '../Games/Capital Drive/campus.js';
import { BARRIERS as SKATE_BARRIERS, SKATE_BUILDING_OPENING } from '../Games/Capital Drive/civic-extras.js';
import { SHOPPING_BUILDING_IDS } from '../Games/Capital Drive/shopping-precincts.js';

const read = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url)));
const data = new Map(await Promise.all(['canberra', 'canberra-north', 'road-profiles', 'north-terrain', 'airport', 'airport-terrain', 'north-west', 'north-west-terrain', 'giant-spray', 'region-belconnen', 'region-north', 'region-south'].map(async name => [name, await read(name)])));
const get = name => data.get(name);
const civic = applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(get('canberra'), get('road-profiles')), get('canberra-north')));
civic.terrainTiles = [get('north-terrain').terrain];
const prior = applyNorthWest(applyDefenceDepot(applyAirport(civic, get('airport'), get('airport-terrain'))), get('north-west'), get('north-west-terrain'), get('giant-spray'));
const map = applyRegionalExpansion(prior, ['region-belconnen', 'region-north', 'region-south'].map(get));
assert.equal(map.regionalExpansion.length, 3, 'exercise all three integrated regional packs');
map.lakeWaterLevel = 5.93;
map.barriers = [...(map.defenceDepot?.fences || []), ...(map.defenceDepot?.vehicleBarriers || []), ...POOL_BARRIERS, ...CAMPUS_BARRIERS,
  ...SKATE_BARRIERS.map(b => {
    const dx = b.b[0]-b.a[0], dz = b.b[1]-b.a[1], length = Math.hypot(dx,dz)||1, nx = -dz/length*b.width/2, nz = dx/length*b.width/2;
    return {...b,points:[[b.a[0]+nx,b.a[1]+nz],[b.b[0]+nx,b.b[1]+nz],[b.b[0]-nx,b.b[1]-nz],[b.a[0]-nx,b.a[1]-nz]]};
  })];
map.collisionReplacedBuildingIds = ['act-75267-0', 'osm-584970595'];
map.buildings = map.buildings.map(b => b.id === SKATE_BUILDING_OPENING.buildingId ? {...b,innerRings:[{points:SKATE_BUILDING_OPENING.polygon}]} : b);
map.shoppingManagedBuildingIds = SHOPPING_BUILDING_IDS;
map.campusBuildingIds = CAMPUS_BUILDING_IDS;
map.areas = [...map.areas,{id:'manuka-pool-water',type:'water',points:MANUKA_POOL_BASIN}];
const digest = () => createHash('sha256').update(JSON.stringify(map)).digest('hex');
const before = digest();
for (const partial of [civic, prior]) {
  const disabled = createLightRail(partial);
  assert.equal(disabled.stops.length, 0, 'partial geographic coverage disables the whole rail circuit');
  assert.equal(disabled.vehicles.length, 0);
  assert.equal(disabled.interact({onFoot:true,pose:map.spawn}).ok, false);
  disabled.step(.25);
}
const sampler = createTerrainSampler(map);
const simulation = createSimulation(map,{trafficCount:0,isOnBridge:sampler.isOnBridge,vehicleHeightAt:sampler.vehicleHeightAt,groundHeightAt:sampler.groundHeightAt});
simulation.player.active = false;
let denyPlatform = false;
const canStand = (pose,ignoreId) => !denyPlatform && !simulation.moveActor({...pose,id:ignoreId},0,0,.45).blocked;
const rail = createLightRail(map,{heightAt:sampler.heightAt,canStand,canReach:simulation.hasLineOfSight});
const expected = [
  ['rail-alinga',6355817336,6355817317,6355817318], ['rail-elouera',6355817340,6355817320,6355817319],
  ['rail-ipima',6355817332,6355817322,6355817321], ['rail-macarthur',6355817331,6355817324,6355817323],
  ['rail-dickson',6355817338,6355817325,6355817326], ['rail-swinden',6355817339,6354101270,6354101421],
  ['rail-phillip',6355817337,6354101235,6305033612], ['rail-epic',6355817329,6354101184,6354101857],
  ['rail-sandford',12730214896,9153593204,9153593205], ['rail-well-station',6355817341,6354101082,6354101750],
  ['rail-nullarbor',6355817335,6354101035,6354101703], ['rail-mapleton',6355817333,6354101002,6354101566],
  ['rail-manning-clark',6355817334,6354100951,6220951534], ['rail-gungahlin',6355817330,6355817327,6355817328],
];
const ids = expected.map(row => row[0]);
assert.deepEqual(rail.stops.map(stop => stop.id),ids);
assert.deepEqual(LIGHT_RAIL_SOURCE.stops.map(s => [s.id,s.station,s.north,s.south]),expected,'exact source station and directional stop identities');
assert.equal(LIGHT_RAIL_SOURCE.source.license,'ODbL-1.0');
for (const input of LIGHT_RAIL_SOURCE.source.inputs) assert.match(input.sha256,/^[a-f0-9]{64}$/);
assert.equal(rail.routes.length,4);
for (let i=0;i<4;i++) assert.deepEqual(rail.routes[i].points.at(-1),rail.routes[(i+1)%4].points[0],'exact turnback closure');
const north = LIGHT_RAIL_SOURCE.lines[0], south = LIGHT_RAIL_SOURCE.lines[2];
assert.equal(north.direction,1);assert.equal(south.direction,-1);
let lastNorth=-1,lastSouth=south.nodes.length;
function onPlatform(p,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1)));
  if(Math.hypot(p.x-a[0]-dx*t,p.z-a[1]-dz*t)<.05)return true;
  if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
for (const [i,stop] of rail.stops.entries()) {
  const source=LIGHT_RAIL_SOURCE.stops[i], ni=north.nodes.indexOf(source.north),si=south.nodes.indexOf(source.south);
  assert(ni>lastNorth&&si<lastSouth,'all directional markers appear once in the mapped running order');lastNorth=ni;lastSouth=si;
  assert.equal(stop.sourceId,`node/${source.station}`);
  assert(canStand(stop.approach),`${stop.id} has a physically dry checked approach`);
  assert.equal(rail.nearStop(stop.approach).id,stop.id);
  assert([stop.y,stop.approach.y].every(Number.isFinite));
  for (const side of ['north','south']) {
    const platform=source.platforms[side];assert.match(platform.sourceId,/^way\/\d+$/);
    assert.equal(platform.nodes.length,platform.points.length);assert.deepEqual(platform.points[0],platform.points.at(-1));
  }
  assert(Object.values(source.platforms).some(platform=>onPlatform(stop.approach,platform.points)),`${stop.id} approach remains on an actual source platform`);
}
assert.equal(rail.platforms.length,28);
for(const platform of rail.platforms){
 const source=LIGHT_RAIL_SOURCE.stops.find(stop=>stop.id===platform.stopId).platforms[platform.direction===1?'north':'south'];
 assert.equal(platform.sourceId,source.sourceId);assert.deepEqual(platform.points,source.points);
 assert(onPlatform(platform.approach,source.points)&&canStand(platform.approach),`${platform.id} source platform has real dry clearance`);
 assert(platform.platformWidth>0&&platform.platformWidth<8,'platform width comes from its actual source footprint, not displaced stop-position hypotenuse');
 assert.equal(rail.nearStop(platform.approach).direction,platform.direction);
}
// Real road access is separate from a dry platform. Each approach must have a
// nearby named public road, connected both ways to the retained player start.
const publicNodes=[...simulation.graph.nodes.values()].filter(n=>n.outgoing.some(e=>e.road.name&&e.road.type!=='service'&&roadProfile(e.road).trafficAllowed));
const closest=point=>publicNodes.reduce((best,n)=>Math.hypot(n.x-point.x,n.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?n:best);
const origin=closest(map.spawn),planner=createRoutePlanner(simulation.graph),access=[];
for (const stop of rail.stops) {
  const approach=closest(stop.approach),distance=Math.hypot(approach.x-stop.approach.x,approach.z-stop.approach.z);
  assert(distance<180,`${stop.id} road arrival remains near its actual source platform (${distance}m)`);
  for (const [from,to] of [[origin,approach],[approach,origin]]) {
    const route=planner.findEdges(from,to);assert(route.length&&route.at(-1).to===to,`${stop.id} directed public road access`);
    assert(route.every(e=>roadProfile(e.road).trafficAllowed));
  }
  access.push({id:stop.id,roadGap:Math.round(distance)});
}
const searchPlaces=rail.stops.map(stop=>({...stop.approach,id:stop.id,name:stop.name,aliases:stop.aliases,service:'rail'}));
const search=createAddressSearch({...map,searchPlaces},{addresses:[]});
for (const stop of rail.stops) assert(search.search(`${stop.name} light rail`,50).some(result=>result.id===`landmark:${stop.id}`),'all stations discoverable through normal search aliases');
const [alinga,elouera]=rail.stops,ctx=stop=>({onFoot:true,pose:stop.approach});
assert.equal(rail.vehicles.length,9);assert.equal(rail.vehicles.filter(train=>train.active).length,8);
simulation.setExternalVehicles(rail.vehicles);
const oneDirection=rail.vehicles.find(train=>train.active&&train.doorsOpen&&!rail.vehicles.some(other=>other.active&&other.doorsOpen&&other.stopId===train.stopId&&other.direction!==train.direction));
assert(oneDirection);
const opposite=rail.platforms.find(platform=>platform.stopId===oneDirection.stopId&&platform.direction!==oneDirection.direction);
assert(rail.interact({onFoot:true,pose:opposite.approach}).waiting&&!rail.passenger,'standing on the opposite source platform never boards the wrong-direction train');
rail.reset();
for (const denied of [{busy:true},{recovering:true},{indoors:true},{onFoot:false}]) assert(!rail.interact({...ctx(alinga),...denied}).ok);
assert(!rail.interact({...ctx(alinga),pose:{x:alinga.x+40,z:alinga.z}}).ok);
assert(rail.interact(ctx(alinga)).boarded);
assert.equal(rail.passengerStopId,alinga.id);assert.equal(rail.seatPose,rail.seatPose);
assert.equal(rail.passengerJourney.destination,rail.stops.at(-1).name);
assert.equal(rail.passengerJourney.nextStop,elouera.name);
const paused=rail.snapshot(),seat=rail.seatPose;
rail.step(0);rail.step(NaN);rail.step(Infinity);assert.deepEqual(rail.snapshot(),paused);assert.equal(rail.seatPose,seat);
// Retained Civic parcel uses actual current boarding/arrival receipts.
const heists=createHeistActivities({sites:[{id:'rail-parcels',name:'Capital Line parcel',kind:'rail',...alinga.approach,
 stopId:alinga.id,arrivalStopId:elouera.id,boarding:alinga.approach,pickup:elouera.approach}],onHeat(){},onReward(){}});
assert(heists.interact({...ctx(alinga),wanted:0}).ok);
const aboard=()=>({pose:rail.seatPose,railPassenger:rail.passenger,railStopId:rail.passengerStopId,wanted:0});
assert(heists.step(.1,aboard()).ok);
let civicTravel=0;
while(rail.passengerStopId===alinga.id&&civicTravel<15){rail.step(.25);civicTravel+=.25;}
assert.equal(rail.passengerStopId,null);assert(rail.interact({}).stopping);
assert.equal(heists.interact(aboard()),null,'in-flight pose cannot collect the retained parcel');
while(rail.passengerStopId!==elouera.id&&civicTravel<70){rail.step(.25);civicTravel+=.25;}
assert.equal(rail.passengerStopId,elouera.id);assert(heists.interact(aboard()).ok,'actual stopped Elouera receipt admits pickup');
denyPlatform=true;assert(!rail.interact({}).ok&&rail.passenger,'blocked exit keeps the passenger attached');denyPlatform=false;
const civicExit=rail.interact({});assert(civicExit.exited&&canStand(civicExit.exitPose));
const parcelPlatform={pose:civicExit.exitPose,onFoot:true,wanted:0};
heists.step(.1,parcelPlatform);
assert.equal(heists.snapshot().phase,'dispatch','same-stop normal exit retains admitted parcel selection');
assert.equal(heists.step(.1,parcelPlatform,{x:true}).ok,false);
heists.step(.1,parcelPlatform);heists.step(.1,parcelPlatform,{y:true});
assert.equal(heists.snapshot().phase,'puzzle','normal platform exit needs no second tram wait after a wrong choice');
rail.reset();
// Select an actually empty station: scheduled trains are now distributed over
// the full line, so Macarthur need not be empty under a legitimate schedule.
const empty=rail.stops.find(stop=>!rail.vehicles.some(train=>train.active&&train.doorsOpen&&train.stopId===stop.id));
assert(empty);const call=rail.interact(ctx(empty));assert(call.waiting);
let dispatch=0;
while(!rail.vehicles.some(train=>train.active&&train.doorsOpen&&train.stopId===empty.id)&&dispatch<60){rail.step(.25);dispatch+=.25;}
assert(dispatch<60,'normal platform call dispatches a physical arriving tram');
denyPlatform=true;assert(!rail.interact(ctx(empty)).ok&&!rail.passenger,'blocked platform prevents boarding');denyPlatform=false;
assert(rail.interact(ctx(empty)).boarded);assert(rail.interact({}).exited);
rail.reset();
const tick=()=>rail.step(.25);
function boardDirection(stop,direction){
 let waited=0;
 const platform=rail.platforms.find(p=>p.stopId===stop.id&&p.direction===direction),boarding={onFoot:true,pose:platform.approach};
 while(waited<240){
  const available=rail.vehicles.filter(train=>train.active&&train.doorsOpen&&train.stopId===stop.id);
  const journey=rail.platformJourney(stop.id,direction);
  if(journey?.direction===direction){assert(rail.interact(boarding).boarded);assert.equal(rail.passengerJourney.direction,direction);return {waited,boarding};}
  if(!available.some(train=>train.direction===direction)){const result=rail.interact(boarding);assert(result.waiting);}
  tick();waited+=.25;
 }
 assert.fail(`no direction${direction} service to ${stop.id} through normal platform calls`);
}
function rideTo(fromId,toId,limit,direction=1){
 rail.reset();
 const from=rail.stops.find(s=>s.id===fromId),to=rail.stops.find(s=>s.id===toId),{waited,boarding}=boardDirection(from,direction);
 assert.equal(rail.passengerStopId,fromId);assert(rail.interact({}).exited,'boarding guard and normal stopped exit remain usable');
 assert(rail.interact(boarding).boarded);
 let elapsed=0,previous=rail.seatPose;
 while(elapsed<limit&&(rail.passengerStopId!==toId||elapsed===0)){
  tick();elapsed+=.25;const current=rail.seatPose;
  assert(current&&[current.x,current.y,current.z,current.yaw,current.speed].every(Number.isFinite));
  assert(Math.hypot(current.x-previous.x,current.z-previous.z)<6,'long passenger ride never teleports');
  previous=current;
 }
 assert.equal(rail.passengerStopId,toId,`${fromId} reaches ${toId} on its mapped track`);
 if(toId==='rail-gungahlin')assert.equal(rail.passengerJourney.destination,alinga.name,'northern terminal advertises the legal return direction');
 const exited=rail.interact({});assert(exited.exited&&exited.stopId===toId&&canStand(exited.exitPose));
 const source=LIGHT_RAIL_SOURCE.stops.find(s=>s.id===toId).platforms[direction===1?'north':'south'];
 assert(onPlatform(exited.exitPose,source.points),'dismount remains on the arriving directional source platform');
 assert(!rail.passenger&&rail.seatPose===null);return {from:fromId,to:toId,waited,elapsed};
}
const journeys=[rideTo('rail-dickson','rail-gungahlin',1100),rideTo('rail-well-station','rail-nullarbor',240),rideTo('rail-gungahlin','rail-manning-clark',240,-1)];
rail.reset();
const scheduled=rail.vehicles.filter(train=>train.active),visited=new Map(scheduled.map(train=>[train.id,new Set()]));
let cycleSeconds=0;
while(cycleSeconds<5000&&[...visited.values()].some(stops=>stops.size<28)){
 const old=scheduled.map(train=>[train.x,train.z]);tick();cycleSeconds+=.25;
 for(const [i,train]of scheduled.entries()){
  assert([train.x,train.y,train.z,train.yaw,train.speed].every(Number.isFinite));
  assert(Math.hypot(train.x-old[i][0],train.z-old[i][1])<6,'all scheduled trains remain continuous at both source turnbacks');
  if(train.doorsOpen)visited.get(train.id).add(`${train.stopId}:${train.direction}`);
 }
}
for(const stops of visited.values()){
 assert.equal(stops.size,28,'every scheduled train completes both directional occurrences of all14stations');
 for(const id of ids)for(const direction of [1,-1])assert(stops.has(`${id}:${direction}`));
}
assert.equal(rail.vehicles.length,9,'service/dispatch never grows the fixed fleet');
rail.reset();assert.equal(rail.vehicles.filter(train=>train.active).length,8);assert(!rail.passenger&&rail.seatPose===null);
assert.equal(digest(),before,'rail and map integration never mutate source geometry');
console.log(JSON.stringify({pass:true,stations:ids.length,scheduled:8,reserve:1,civicTravel,dispatch,journeys,cycleSeconds,access,scope:'actual composed geographic/collision domain; normal interact/step boarding, not native browser input'}));
