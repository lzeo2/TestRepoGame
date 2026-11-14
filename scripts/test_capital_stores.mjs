import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const game = join(root, 'Games/Capital Drive');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(join(game, 'data/stores.json'));
const moduleBytes = await readFile(join(game, 'stores.js'));
const { MAPPED_STORES, LEGACY_SHOP_IDS } = await import(`data:text/javascript;base64,${moduleBytes.toString('base64')}`);
const payload = JSON.parse(bytes);
const precinctBytes = await readFile(join(game, 'data/shopping-precincts.json'));
const precinctModuleBytes = await readFile(join(game, 'shopping-precincts.js'));
const precinctPayload = JSON.parse(precinctBytes);
const { SHOPPING_PRECINCTS, SHOPPING_BUILDING_IDS } = await import(`data:text/javascript;base64,${precinctModuleBytes.toString('base64')}`);
assert.deepEqual(SHOPPING_PRECINCTS,precinctPayload.precincts);
assert.deepEqual(SHOPPING_BUILDING_IDS,['act-87705-0']);
assert(Object.isFrozen(SHOPPING_PRECINCTS[0].paths[0].points[0]));
assert.equal(SHOPPING_PRECINCTS.length,5);
assert(SHOPPING_PRECINCTS[0].paths.length>0);
assert(SHOPPING_PRECINCTS.every(p=>Object.isFrozen(p) && p.boundary.length>=4 && p.source.version>0));
assert.deepEqual(SHOPPING_PRECINCTS.find(p=>p.sourceName==='Manuka Terrace').buildings[0].points,JSON.parse(await readFile(join(game,'data/canberra.json'))).buildings.find(b=>b.id==='act-87705-0').points);
for (const id of [358293199,439239650,439239719,6275666787,12918449444,12918449448,11906941518]) assert(MAPPED_STORES.some(s=>s.id===`store-${id}`));
for (let i=0;i<MAPPED_STORES.length;i++) for(let j=0;j<i;j++) {
  const a=MAPPED_STORES[i].frontage,b=MAPPED_STORES[j].frontage;
  assert(Math.hypot(a.x-b.x,a.z-b.z)>=(a.width+b.width)/2+0.795,'facade units retain clear separation');
}

const mapBytes = await readFile(join(game, 'data/canberra.json'));
const addressBytes = await readFile(join(game, 'data/addresses.json'));
const profileBytes = await readFile(join(game, 'data/road-profiles.json'));
const northBytes = await readFile(join(game, 'data/canberra-north.json'));
const north = JSON.parse(northBytes), baseMap = JSON.parse(mapBytes);
const map = {...baseMap,buildings:[...baseMap.buildings,...north.buildings],roads:[...baseMap.roads,...north.roads]};
const profiles = {...JSON.parse(profileBytes).roads,...Object.fromEntries(north.roads.map(r=>[r.id,r.sourceTags||{}]))};
assert.equal(hash(northBytes),payload.meta.northMapSha256);
const noodles=MAPPED_STORES.find(s=>s.id==='store-5656111023');
assert(noodles);
assert.equal(MAPPED_STORES.length,21);
assert.equal(noodles.name,'Lambzhou 1919');
assert.equal(noodles.interiorType,'noodle-shop');
assert.equal(noodles.buildingId,'osm-584970594');
assert.equal(noodles.road,'Bunda Street');
assert.equal(noodles.robbery,500);
assert.equal(noodles.price,35);
assert.equal(noodles.heal,35);
for(const alias of ['Lanzhou 1919','1919 Lanzhou Beef Noodle','Lanhou 1919']) assert(noodles.aliases.includes(alias));
assert.equal(noodles.externalReferences.length,2);
assert(/not an OSM address/.test(noodles.addressNote));
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
function inside(p, points) {
  let hit = false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i], b=points[j];
    if ((a[1]>p[1]) !== (b[1]>p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
}
function closest(p,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)||0));
  return [a[0]+dx*t,a[1]+dz*t];
}
assert.deepEqual(MAPPED_STORES,payload.stores);
assert.deepEqual(LEGACY_SHOP_IDS,['crescent-kiosk','manuka-store']);
assert(Object.isFrozen(MAPPED_STORES) && Object.isFrozen(LEGACY_SHOP_IDS));
assert(MAPPED_STORES.length>=15 && MAPPED_STORES.length<=25);
assert.equal(new Set(MAPPED_STORES.map(s=>s.id)).size,MAPPED_STORES.length);
assert.equal(hash(mapBytes),payload.meta.mapSha256);
assert.equal(hash(profileBytes),payload.meta.roadProfilesSha256);
assert.equal(payload.meta.license,'ODbL-1.0');
assert.equal(payload.meta.sourceFiles.length,18);
assert(payload.meta.sourceDates.length>0);
assert.equal(MAPPED_STORES.find(s=>s.source.id===358293199).name,'Coals');
const normalise = value => value.toLowerCase().replace(/[^a-z0-9]/g,'');
for (const store of MAPPED_STORES) {
  assert(Object.isFrozen(store) && Object.isFrozen(store.frontage) && Object.isFrozen(store.building.points[0]));
  assert.notEqual(normalise(store.name),normalise(store.sourceName),'all visible business names are parodies');
  assert(store.aliases.includes(store.name.toLowerCase()));
  assert(['food','retail'].includes(store.type));
  assert(store.radius>0 && store.radius<=5.5 && store.price===35 && store.heal===35);
  assert(store.id==='store-5656111023' ? store.robbery===500 : store.robbery>=180 && store.robbery<=350);
  assert(store.source.version>0 && /^\d{4}-/.test(store.source.timestamp));
  assert.equal(store.source.type,'node');
  const sourcePoint=[(store.source.lon-map.meta.origin[0])*111320*Math.cos(map.meta.origin[1]*Math.PI/180),(map.meta.origin[1]-store.source.lat)*111320];
  assert(distance(sourcePoint,[store.sourcePosition.x,store.sourcePosition.z])<0.002);
  assert.equal(store.frontage.confidence,'estimated');
  const building=map.buildings.find(b=>b.id===store.buildingId);
  assert(building);
  assert.deepEqual(store.building,{points:building.points,height:building.height});
  assert(inside(sourcePoint,building.points),'source POI must lie inside the exact matched footprint');
  const road=map.roads.find(r=>r.id===store.roadId), tags=profiles[road.id]||{};
  assert.equal(road.name,store.road);
  assert.notEqual(road.type,'service');
  assert(!['private','no'].includes(tags.motor_vehicle||tags.vehicle||tags.access));
  assert(!['driveway','parking_aisle','drive-through','emergency_access'].includes(tags.service));
  const front=[store.frontage.x,store.frontage.z], approach=[store.x,store.z];
  assert(distance(front,approach)<store.radius);
  const outward=[-Math.sin(store.frontage.yaw),-Math.cos(store.frontage.yaw)];
  assert((approach[0]-front[0])*outward[0]+(approach[1]-front[1])*outward[1]>2.4,'sign faces approach');
  const wallDistance=Math.min(...building.points.slice(1).map((b,i)=>distance(front,closest(front,building.points[i],b))));
  assert(wallDistance>0.2 && wallDistance<0.24,'fascia immediately outside exact footprint');
  for (let i=0;i<=30;i++) {
    const p=[store.x+(store.publicApproach.x-store.x)*i/30,store.z+(store.publicApproach.z-store.z)*i/30];
    assert(!map.buildings.some(b=>inside(p,b.points)),`${store.name}: clear walk to public roadside`);
  }
  assert(!map.buildings.some(b=>inside(front,b.points)),`${store.name}: sign outside every source building`);
  const roadDistance=Math.min(...road.points.slice(1).map((b,i)=>distance(approach,closest(approach,road.points[i],b))));
  assert(roadDistance>road.width/2+0.5,'interaction beside carriageway');
  assert(roadDistance<48,'bounded public street approach');
}
for (const path of SHOPPING_PRECINCTS[0].paths) {
  for (let k=1;k<path.points.length;k++) {
    const a=path.points[k-1],b=path.points[k];
    for(let i=0;i<=12;i++) assert(!map.buildings.some(building=>inside([a[0]+(b[0]-a[0])*i/12,a[1]+(b[1]-a[1])*i/12],building.points)),`${path.id}: exterior path avoids source building`);
  }
}
// Cache verification is explicit: CI can run geometry checks without developer downloads.
const cacheIndex=process.argv.indexOf('--cache');
const cache=cacheIndex>=0 ? process.argv[cacheIndex+1] : process.env.CAPITAL_STORES_CACHE;
const northCacheIndex=process.argv.indexOf('--north-cache');
const northCache=northCacheIndex>=0 ? process.argv[northCacheIndex+1] : process.env.CAPITAL_STORES_NORTH_CACHE;
if (cache) {
  assert(northCache,'--cache requires --north-cache for complete Civic source regeneration');
  const sources=new Map();
  for (const source of payload.meta.sourceFiles) {
    const raw=await readFile(join(cache,source.file));
    assert.equal(hash(raw),source.sha256);
    for (const e of JSON.parse(raw).elements) sources.set(`${e.type}/${e.id}`,e);
  }
  for (const source of payload.meta.northSourceFiles) {
    const raw=await readFile(join(northCache,source.file));
    assert.equal(hash(raw),source.sha256);
    for(const e of JSON.parse(raw).elements) sources.set(`${e.type}/${e.id}`,e);
  }
  for (const store of MAPPED_STORES) {
    const source=sources.get(`${store.source.type}/${store.source.id}`);
    for (const key of ['type','id','lat','lon','version','timestamp']) assert.equal(source[key],store.source[key]);
    assert((source.tags.shop || ['cafe','restaurant','fast_food'].includes(source.tags.amenity)) && source.tags.name===store.sourceName);
  }
  for (const precinct of SHOPPING_PRECINCTS) {
    const source=sources.get(`way/${precinct.source.id}`);
    const points=source.nodes.map(id=>{ const n=sources.get(`node/${id}`); return [(n.lon-map.meta.origin[0])*111320*Math.cos(map.meta.origin[1]*Math.PI/180),(map.meta.origin[1]-n.lat)*111320]; });
    assert.equal(points.length,precinct.boundary.length);
    points.forEach((p,i)=>assert(distance(p,precinct.boundary[i])<0.001));
    for (const path of [...precinct.paths,...precinct.parking]) {
      const way=sources.get(`way/${path.source.id}`);
      assert(way && path.points.length===way.nodes.length);
      way.nodes.forEach((id,i)=>{ const n=sources.get(`node/${id}`); assert(distance(path.points[i],[(n.lon-map.meta.origin[0])*111320*Math.cos(map.meta.origin[1]*Math.PI/180),(map.meta.origin[1]-n.lat)*111320])<0.001); });
    }
  }
  const output=await mkdtemp(join(tmpdir(),'capital-stores-'));
  try {
    for (let run=0;run<2;run++) {
      const result=spawnSync('python3',['-B','scripts/build_capital_stores.py','--cache',cache,'--north-cache',northCache,'--output',join(output,'stores.json'),'--module-output',join(output,'stores.js'),'--precinct-output',join(output,'shopping-precincts.json'),'--precinct-module-output',join(output,'shopping-precincts.js')],{cwd:root,encoding:'utf8',timeout:30000});
      assert.equal(result.status,0,result.stderr);
      assert.deepEqual(await readFile(join(output,'stores.json')),bytes,'JSON regeneration is byte-identical');
      assert.deepEqual(await readFile(join(output,'stores.js')),moduleBytes,'module regeneration is byte-identical');
      assert.deepEqual(await readFile(join(output,'shopping-precincts.json')),precinctBytes,'precinct JSON regeneration is byte-identical');
      assert.deepEqual(await readFile(join(output,'shopping-precincts.js')),precinctModuleBytes,'precinct module regeneration is byte-identical');
    }
  } finally { await rm(output,{recursive:true,force:true}); }
  assert.deepEqual(await readFile(join(game,'data/canberra-north.json')),northBytes,'northern source map preserved');
  assert.deepEqual(await readFile(join(game,'data/canberra.json')),mapBytes,'map preserved');
  assert.deepEqual(await readFile(join(game,'data/addresses.json')),addressBytes,'address source preserved');
  assert.deepEqual(await readFile(join(game,'data/road-profiles.json')),profileBytes,'road source preserved');
  console.log('Capital stores: pinned actual cache, exact source nodes, two byte-identical builds and source preservation PASS');
}
console.log(`Capital stores: ${MAPPED_STORES.length} frozen parody entries, exact footprints, projection, sign alignment and clear public-sidewalk approaches PASS${cache?'':' (external cache not requested)'}`);
