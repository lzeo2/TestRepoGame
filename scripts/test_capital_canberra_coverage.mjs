import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GAME_DATA_FILES} from '../Games/Capital Drive/game-data.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
import {applyStreetAssetRoofs} from '../Games/Capital Drive/street-assets.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {applyResidentialExpansion} from '../Games/Capital Drive/residential-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';

const inputs=new Map(await Promise.all(GAME_DATA_FILES.map(async file=>[
  file,JSON.parse(await readFile(new URL(`../Games/Capital Drive/${file}`,import.meta.url),'utf8')),
])));
const get=name=>inputs.get(`data/${name}.json`);
let map=applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(get('canberra'),get('road-profiles')),get('canberra-north')));
map.terrainTiles=[get('north-terrain').terrain];
map=applyDefenceDepot(applyAirport(map,get('airport'),get('airport-terrain')));
map=applyNorthWest(map,get('north-west'),get('north-west-terrain'),get('giant-spray'));
const regions=GAME_DATA_FILES.filter(file=>file.startsWith('data/region-')).map(file=>inputs.get(file));
map=applyResidentialExpansion(applyRegionalExpansion(map,regions),get('residential-supplement'));
map.lakeWaterLevel=5.93;
assert.deepEqual(map.regionalExpansion.map(region=>region.regionId),['belconnen','north','south','molonglo','west-belconnen']);
assert(map.residentialExpansion.addedBuildings>=16400,'almost all verified supplemental home outlines survive combined source deduplication');
assert(map.defenceDepot?.drivableTank && map.landmarks.some(place=>place.id==='capital-defence-depot'));
assert(map.bounds.minX<-11000,'the expansion extends west of the existing bounds');
const terrain=createTerrainSampler(map);
const bridges=map.roads.filter(road=>road.sourceTags?.bridge==='yes');
assert(bridges.length>=384);
const simulation=createSimulation(map,{trafficCount:0,isOnBridge:terrain.isOnBridge,
  groundHeightAt:terrain.groundHeightAt,vehicleHeightAt:terrain.vehicleHeightAt});
const coppins=bridges.find(road=>road.sourceId==='way/73201646');
assert(coppins,'the sourced Coppins Crossing deck is in the combined road network');
for(const [x,z] of coppins.points)assert(Number.isFinite(terrain.roadHeightAt(coppins,x,z)));
assert(simulation.graph.segments.some(segment=>segment.road===coppins),'the bridge is part of the navigable graph');
console.log(`PASS composed Canberra: ${map.roads.length} road runs, ${map.buildings.length} building outlines, ${map.residentialExpansion.addedBuildings} infill homes and ${bridges.length} bridge-tagged road runs`);
