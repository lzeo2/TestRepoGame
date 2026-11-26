import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
import {findRoute} from '../Games/Capital Drive/navigation.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {buildRoadGraph,createSimulation} from '../Games/Capital Drive/simulation.js';

const load=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const names=['canberra','canberra-north','road-profiles','north-terrain','airport','airport-terrain',
  'north-west','north-west-terrain','giant-spray','region-belconnen','region-north','region-south','region-west-belconnen'];
const data=new Map(await Promise.all(names.map(async name=>[name,await load(name)])));
const get=name=>data.get(name),region=get('region-west-belconnen');
let prior=applyMapExpansion(applyRoadProfiles(get('canberra'),get('road-profiles')),get('canberra-north'));
prior.terrainTiles=[get('north-terrain').terrain];
prior=applyNorthWest(applyDefenceDepot(applyAirport(prior,get('airport'),get('airport-terrain'))),get('north-west'),get('north-west-terrain'),get('giant-spray'));
prior=applyRegionalExpansion(prior,['belconnen','north','south'].map(id=>get(`region-${id}`)));
try {prior=applyRegionalExpansion(prior,[await load('region-molonglo')]);}
catch(error){if(error.code!=='ENOENT')throw error;}
const before=createHash('sha256').update(JSON.stringify(prior.roads)).digest('hex'),map=applyRegionalExpansion(prior,[region]);
assert.equal(createHash('sha256').update(JSON.stringify(prior.roads)).digest('hex'),before);
for(let i=0;i<prior.roads.length;i++)assert.equal(map.roads[i],prior.roads[i],'all retained road owners remain exact');
const bodies=new Map(map.buildings.map(b=>[b.id,b]));for(const b of prior.buildings)assert.equal(bodies.get(b.id),b);
assert.equal(map.terrain,prior.terrain);assert.equal(map.spawn,prior.spawn);
for(let i=0;i<prior.terrainTiles.length;i++)assert.equal(map.terrainTiles[i],prior.terrainTiles[i]);
assert.equal(region.meta.regionId,'west-belconnen');assert.equal(region.meta.license,'ODbL-1.0');
assert.deepEqual(region.meta.sourceBoxes,[[149.015,-35.25,149.06,-35.19]]);
assert.equal(region.meta.clipPolicy.sourceNodeFringeDegrees,.004);
assert.equal(region.meta.files.length,12);for(const pin of region.meta.files){assert.match(pin.sha256,/^[a-f0-9]{64}$/);assert.match(pin.url,/^https:\/\/api\.openstreetmap\.org\/api\/0\.6\/map.json\?bbox=/);}
assert(region.roads.length>1000&&region.buildings.length>900);assert(region.buildings.length<=2100);
const fair=region.landmarks.find(place=>place.id==='kippax-fair');
const fairBuilding=bodies.get(fair.buildingId);
assert.equal(fairBuilding.sourceId,'relation/9912221');
assert.deepEqual(fairBuilding.sourceWayIds,[27243622,713272037]);
assert.equal(fairBuilding.points.length,16);
assert.deepEqual(fairBuilding.points[0],fairBuilding.points.at(-1));
const area=Math.abs(fairBuilding.points.slice(1).reduce((sum,b,i)=>{
  const a=fairBuilding.points[i];return sum+a[0]*b[1]-a[1]*b[0];
},0))/2;
assert(Math.abs(area-7497.29)<.02);
assert.equal(region.terrain.validation.unsupportedCells,0);assert.equal(region.terrain.validation.nearestFillCells,0);
assert(region.terrain.validation.maximumNearestContourMetres<200);
assert.equal(region.terrain.license,'CC-BY-4.0');assert.equal(region.terrain.verticalDatum,'AHD');
const t=region.terrain,b=region.bounds;
assert(t.minX<=b.minX&&t.maxX>=b.maxX&&t.minZ<=b.minZ&&t.maxZ>=b.maxZ);
for(const road of region.roads){assert.equal(road.nodes.length,road.points.length);assert(!road.fictional);assert(road.sourceId.startsWith('way/'));
  assert(!['private','no'].includes(road.sourceTags?.access));
  assert(!['driveway','parking_aisle','drive-through','emergency_access'].includes(road.sourceTags?.service));
}
const graph=buildRoadGraph(map.roads),sampler=createTerrainSampler(map);
const simulation=createSimulation(map,{...sampler,trafficCount:0,parkedCount:0});
const newPoints=new Set(region.roads.flatMap(road=>road.points.map(point=>point.join(','))));
const routes=[];let clearTerminalProbes=0;
for(const name of ['Higgins','Latham','Charnwood']){
  const place=region.landmarks.find(p=>p.name===name);assert(place&&place.sourceId.startsWith('node/'));
  // Exercise the actual player routeTo owner. The separate service Dijkstra
  // planner has a bounded search cap; player GPS uses consistent Euclidean A*.
  const out=findRoute(graph,map.spawn,place),back=findRoute(graph,place,map.spawn);
  assert(out.length>100&&back.length>100,`${name} has both actual source-road directions back to the city`);
  assert(out.some(point=>newPoints.has(point.join(','))),'route actually traverses new source roads');
  const a=out.at(-2),b=out.at(-1),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
  assert(Number.isFinite(sampler.groundHeightAt(x,z)));
  const yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);
  assert(simulation.canOccupy({x,z,yaw},{length:4.5,width:1.8}),`${name} public-road arrival admits an actual car body`);
  clearTerminalProbes++;
  routes.push({name,outbound:out.length,return:back.length,arrivalRoad:simulation.nearestRoad(x,z).road.name});
}
const existingNodes=new Set(prior.roads.flatMap(r=>r.nodes||[]));
const seams=new Set(region.roads.flatMap(r=>r.nodes).filter(id=>existingNodes.has(id)));
assert(seams.size>20,'regional overlay stitches to retained exact source node IDs');
for(const id of ['osm-815187745','osm-372148527','osm-27243629'])assert(bodies.has(id),'selected shop/library carrier retained');
const bytes=(await readFile(new URL('../Games/Capital Drive/data/region-west-belconnen.json',import.meta.url))).byteLength;
assert(bytes<4_000_000);
console.log('PASS West Belconnen source/terrain/retained owners, no invented roads, bounded footprints, exact seams and actual city return routes',JSON.stringify({roads:region.roads.length,buildings:region.buildings.length,seams:seams.size,clearTerminalProbes,bytes,routes}));
