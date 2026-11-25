import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GAME_DATA_FILES} from '../Games/Capital Drive/game-data.js';
import {composeCapitalMap,decodeCapitalMapResponses,appendCapitalHighwayBarriers} from '../Games/Capital Drive/map-source.js';
import {HIGHWAY_BARRIERS} from '../Games/Capital Drive/highway-barriers.js';

// Check decoding without allocating geographic fixtures or invoking browser IO.
const calls=GAME_DATA_FILES.map(()=>0);
const values=GAME_DATA_FILES.map((file,index)=>({file,index}));
const responses=values.map((value,index)=>({json:async()=>{calls[index]++;return value;}}));
const decoded=await decodeCapitalMapResponses(responses);
for(let index=0;index<GAME_DATA_FILES.length;index++){
  assert.equal(decoded[GAME_DATA_FILES[index]],values[index]);
  assert.equal(calls[index],1,'each production response decoded exactly once');
}
calls.fill(0);
const geometry=await decodeCapitalMapResponses(responses,{includeAddresses:false});
assert.equal(geometry['data/addresses.json'],undefined);
assert.equal(calls[1],0,'geometry audit avoids unused address parse');
assert(calls.every((count,index)=>count===(index===1?0:1)));
await assert.rejects(decodeCapitalMapResponses(responses.slice(1)),/complete local source pack/);

// Source-domain composition only: no renderer, fake actors or service states.
const started=performance.now();
const gameRoot=new URL('../Games/Capital Drive/',import.meta.url);
const local=GAME_DATA_FILES.map(file=>({json:async()=>JSON.parse(await readFile(new URL(file,gameRoot),'utf8'))}));
const packs=await decodeCapitalMapResponses(local);
const result=composeCapitalMap(packs),{map,terrainSampler,stunts,addressData}=result;
assert.equal(addressData,packs['data/addresses.json'],'production retains its decoded address data');
assert.equal(map.trafficSignals,packs['data/traffic-signals.json']);
assert.equal(map.lakeWaterLevel,5.93);
assert.equal(map.terrainTiles.length,8,'retained source DEM tiles');
assert(map.roads.length>27000&&map.buildings.length>42000,'all retained source districts composed');
assert(Number.isFinite(terrainSampler.groundHeightAt(map.spawn.x,map.spawn.z)));
assert(stunts.ramps.length>0);
assert.equal(map.searchPlaces.filter(place=>place.description==='Fictional park stunt ramp').length,stunts.ramps.length);
const before=map.barriers.length;
assert.equal(appendCapitalHighwayBarriers(map),map);
assert.equal(map.barriers.length,before+HIGHWAY_BARRIERS.length);
assert(map.barriers.slice(-HIGHWAY_BARRIERS.length).every((barrier,index)=>barrier===HIGHWAY_BARRIERS[index]),'same production barrier objects');
assert.equal(map.parkedCars,undefined,'fixture does not fabricate a live fleet');
const controller=await readFile(new URL('script.js',gameRoot),'utf8');
assert(controller.includes('composeCapitalMap(sourcePacks)'));
assert(controller.indexOf('appendCapitalHighwayBarriers(map)')>controller.indexOf('localDetailsView=compatibility?'),'preserve notice placement before highway registration');
console.log(`PASS canonical map source: complete pack decode, address retention/omission, merged source geometry, DEM/stunt state and original barrier ordering (${Math.round(performance.now()-started)}ms).`);
