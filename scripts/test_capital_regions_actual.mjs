import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyNorthWest} from '../Games/Capital Drive/north-west.js';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {applyRoadProfiles,createRoutePlanner,roadProfile} from '../Games/Capital Drive/road-network.js';
import {applyStreetAssetRoofs} from '../Games/Capital Drive/street-assets.js';
import {prepareWarMemorial} from '../Games/Capital Drive/war-memorial.js';
import {createAddressSearch} from '../Games/Capital Drive/address-search.js';
import {findRoute} from '../Games/Capital Drive/navigation.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {prepareWaterRing} from '../Games/Capital Drive/water-contact.js';
import {createProgression} from '../Games/Capital Drive/progression.js';

// Actual bundled sources only: no network, source-cache requirement or placements.
const started=performance.now(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const names=['canberra','canberra-north','road-profiles','north-terrain','airport','airport-terrain',
  'north-west','north-west-terrain','giant-spray','region-belconnen','region-north','region-south'];
const inputs=new Map(await Promise.all(names.map(async name=>{
  const bytes=await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url));
  return [name,{data:JSON.parse(bytes),bytes:bytes.length,sha256:sha(bytes)}];
})));
const data=name=>inputs.get(name).data,regions=['belconnen','north','south'].map(id=>data(`region-${id}`));
const civic=applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(data('canberra'),data('road-profiles')),data('canberra-north')));
civic.terrainTiles=[data('north-terrain').terrain];
const prior=prepareWarMemorial(applyNorthWest(applyAirport(civic,data('airport'),data('airport-terrain')),
  data('north-west'),data('north-west-terrain'),data('giant-spray')));
prior.lakeWaterLevel=5.93;
const previousDigest=sha(JSON.stringify(prior.roads)),map=applyRegionalExpansion(prior,regions);
assert.equal(map.spawn,prior.spawn);assert.equal(map.terrain,prior.terrain);
assert.equal(map.mapExpansion,prior.mapExpansion);assert.equal(map.terrainRequirements,prior.terrainRequirements);
assert.equal(sha(JSON.stringify(prior.roads)),previousDigest,'composition cannot mutate retained source geometry or tags');
for(const [i,road]of prior.roads.entries())assert.equal(map.roads[i],road,'every previous road keeps its exact object and node/point/tag references');
const mergedBodies=new Map(map.buildings.map(body=>[String(body.id),body])),mergedPlaces=new Map(map.landmarks.map(place=>[place.id,place]));
for(const body of prior.buildings)assert.equal(mergedBodies.get(String(body.id)),body,'every existing source footprint retains its owner and geometry');
for(const place of prior.landmarks)assert.equal(mergedPlaces.get(place.id),place,'existing landmark identities and mission anchors retain priority');
for(const [i,tile]of prior.terrainTiles.entries())assert.equal(map.terrainTiles[i],tile,'higher-resolution terrain keeps priority and identity');
assert.deepEqual(map.regionalExpansion.map(region=>region.regionId),['belconnen','north','south']);
assert.equal(map.terrainTiles.length,prior.terrainTiles.length+3);
for(const [index,region]of regions.entries()){
  assert.equal(region.meta.license,'ODbL-1.0');assert.deepEqual(region.meta.origin,prior.meta.origin);
  assert(region.meta.files.length>1);
  for(const pin of region.meta.files){assert.match(pin.url,/^https:\/\/api\.openstreetmap\.org\/api\/0\.6\//);assert.match(pin.sha256,/^[a-f0-9]{64}$/);assert(!pin.file.includes('/'));}
  for(const pin of region.meta.priorSnapshots)assert.equal(inputs.get(pin.file.replace(/\.json$/,'')).sha256,pin.sha256,`${region.meta.regionId} retained source revision ${pin.file}`);
  const housing=region.meta.housingCoverage;
  assert(region.buildings.length<=2100+(region.meta.regionId==='north'?700:region.meta.regionId==='south'?50:0),'per-region source-footprint allocation stays bounded');
  if(housing){
    assert.equal(region.buildings.length,housing.retainedCount+housing.added);
    assert(housing.retainedCount<=2100&&housing.added<=housing.maximumAdditional);
    const additional=new Set(housing.additionalSourceIds);assert.equal(additional.size,housing.added);
    const retained=region.buildings.filter(body=>!additional.has(body.sourceId));
    assert.equal(sha(retained.map(body=>body.sourceId).sort().join('\n')),housing.retainedIdsSha256,'all original selected source identities are preserved');
    for(const body of region.buildings.filter(body=>additional.has(body.sourceId)))assert(['house','detached','residential','apartments','terrace','semidetached_house','bungalow','cabin'].includes(body.type),'housing correction uses explicit residential source tags');
    for(const window of housing.windows){
      assert.equal(window.radiusMetres,750);assert.equal(window.target,Math.ceil(window.sourceTagged*.75));
      const homes=region.buildings.filter(body=>['house','detached','residential','apartments','terrace','semidetached_house','bungalow','cabin'].includes(body.type)).filter(body=>{
        const points=body.points.slice(0,-1),x=points.reduce((n,p)=>n+p[0],0)/points.length,z=points.reduce((n,p)=>n+p[1],0)/points.length;
        return Math.hypot(x-window.x,z-window.z)<=750;
      });
      assert.equal(homes.length,window.retainedAfter,`${window.name}: bundled known residential coverage matches source receipt`);
      assert(homes.length>=window.target);assert.equal(window.retainedAfter-window.retainedBefore,window.additional);
    }
  }
  assert(inputs.get(`region-${region.meta.regionId}`).bytes<8_000_000,'one bundled overlay stays below 8 MB');
  assert.equal(map.terrainTiles[prior.terrainTiles.length+index].heights,region.terrain.heights);
  assert.equal(map.terrainTiles[prior.terrainTiles.length+index].blendPreviousMetres,150);
  assert.match(region.terrain.gridSha256,/^[a-f0-9]{64}$/);
  for(const body of region.buildings){
    assert.match(body.sourceId,/^way\/\d+$/);assert.deepEqual(body.points[0],body.points.at(-1));
    assert(body.points.length>=4&&body.points.flat().every(Number.isFinite));
    assert(Number.isFinite(body.height)&&body.height>0&&body.height<=250);assert(body.heightSource);
    assert(!['email','phone','website','contact:email'].some(key=>key in body.sourceTags));
  }
}
assert(regions.reduce((n,region)=>n+(region.meta.housingCoverage?.added||0),0)<=750,'housing correction remains a bounded additive source selection');
const retainedPositions=new Map(),coordinates=new Set(),sourcePair=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
for(const road of prior.roads)for(const [i,p]of road.points.entries()){
  if(road.nodes&&!retainedPositions.has(road.nodes[i]))retainedPositions.set(road.nodes[i],p);
  if(i)coordinates.add(sourcePair(road.points[i-1].join(','),p.join(',')));
}
let addedSegments=0,seamNodes=new Set();
for(const road of map.roads.slice(prior.roads.length)){
  assert.match(road.sourceId,/^way\/\d+$/);assert.equal(road.nodes.length,road.points.length);
  for(const [i,p]of road.points.entries()){
    assert(p.every(Number.isFinite));
    if(retainedPositions.has(road.nodes[i])){assert.deepEqual(p,retainedPositions.get(road.nodes[i]),'source intersections retain old coordinates');seamNodes.add(road.nodes[i]);}
    if(!i)continue;
    const key=sourcePair(road.points[i-1].join(','),p.join(','));assert(!coordinates.has(key),'no duplicate physical road segment across regional seams');coordinates.add(key);addedSegments++;
  }
}
assert(seamNodes.size>=20,'new streets meet the old city at actual source intersections');
assert.equal(addedSegments,map.regionalExpansion.reduce((sum,region)=>sum+region.addedSegments,0));
assert.equal(new Set(map.roads.map(road=>String(road.id))).size,map.roads.length);

const oldCareer=createProgression(prior),careerTill=oldCareer.services.find(site=>site.robbery);
oldCareer.state.cash=4321;oldCareer.state.fitnessLevel=1;oldCareer.state.equipment.pistol=true;
oldCareer.state.robberyCooldowns[careerTill.id]=180;
const saved=oldCareer.serialize(),career=createProgression(map,saved);
assert.deepEqual(career.serialize(),saved,'a valid existing career save loads byte-for-byte in the expanded map');
assert.deepEqual(career.jobs,oldCareer.jobs,'existing career job points, unlocks and rewards stay unchanged');
assert.equal(career.state.robberyCooldowns[careerTill.id],180,'regional travel cannot refill an existing saved till');
assert.deepEqual(createProgression(map,career.serialize()).serialize(),saved,'expanded-map saves retain the existing strict v1 contract');

const terrain=createTerrainSampler(map),priorTerrain=createTerrainSampler(prior);
for(const tile of [prior.terrain,...prior.terrainTiles])for(const x of [tile.minX,(tile.minX+tile.maxX)/2,tile.maxX])for(const z of [tile.minZ,(tile.minZ+tile.maxZ)/2,tile.maxZ]){
  assert.equal(terrain.groundHeightAt(x,z),priorTerrain.groundHeightAt(x,z),'regional contours never override old terrain at an old tile boundary or interior');
}
for(const road of prior.roads.filter(road=>['way/4878920','way/4878927'].includes(road.sourceId)))for(const [x,z]of road.points){
  assert.equal(terrain.roadHeightAt(road,x,z),priorTerrain.roadHeightAt(road,x,z),'retained lake bridge heights survive the expansion');
}
const graphStarted=performance.now();
const simulation=createSimulation(map,{trafficCount:0,heightAt:terrain.heightAt,groundHeightAt:terrain.groundHeightAt,
  isOnBridge:terrain.isOnBridge,vehicleHeightAt:terrain.vehicleHeightAt});
const graph=simulation.graph,planner=createRoutePlanner(graph),search=createAddressSearch(map);
assert.equal(simulation.traffic.length,0,'one static city simulation suffices for route and shoreline authority');
assert(map.roads.length<30_000&&graph.nodes.size<140_000&&graph.edges.length<260_000,'whole-city graph allocation stays bounded');
const graphMs=performance.now()-graphStarted;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),publicNamed=edge=>edge.road.name&&edge.road.type!=='service'&&roadProfile(edge.road).trafficAllowed;
const publicNodes=[...graph.nodes.values()].filter(node=>node.outgoing.some(publicNamed));
const nearestPublic=point=>publicNodes.reduce((best,node)=>!best||gap(point,node)<gap(point,best)?node:best,null);
const origin=nearestPublic(prior.spawn),oldRoads=new Set(prior.roads),routeReports=[];
for(const [id,sourceId]of [['westfield-belconnen','way/27795123'],['ais-arena','way/57767858'],
  ['gungahlin-library','way/219848276'],['epic','way/31802192'],['woden-library','node/9536031503'],['tuggeranong-library','node/9536028924']]){
  const place=map.landmarks.find(place=>place.id===id);assert(place,`exact mapped hub ${id}`);assert.equal(place.sourceId,sourceId);
  const target=nearestPublic(place);assert(gap(place,target)<300,`${place.name}: a named public road reaches within 300m of the source hub`);
  const out=planner.findEdges(origin,target),home=planner.findEdges(target,origin);
  for(const [route,start,end]of [[out,origin,target],[home,target,origin]]){
    assert(route.length>20&&route[0].from===start&&route.at(-1).to===end,`${place.name}: normal directed return route`);
    assert(route.some(edge=>oldRoads.has(edge.road))&&route.some(edge=>!oldRoads.has(edge.road)),`${place.name}: actual old/new street seam crossed`);
    for(const [i,edge]of route.entries()){
      assert(roadProfile(edge.road).trafficAllowed);if(i)assert.equal(edge.from,route[i-1].to);
      for(const point of [edge.from,edge.to,{x:(edge.from.x+edge.to.x)/2,z:(edge.from.z+edge.to.z)/2}]){
        assert(Number.isFinite(terrain.groundHeightAt(point.x,point.z)));
        assert(Number.isFinite(terrain.roadHeightAt(edge.road,point.x,point.z)));
      }
    }
    const gps=findRoute(graph,start,end);assert(gps.length>20,`${place.name}: ordinary GPS solver also finds the trip`);
    assert.deepEqual(gps[0],[start.x,start.z]);assert.deepEqual(gps.at(-1),[end.x,end.z]);
  }
  const result=search.search(place.name).find(hit=>hit.id===`landmark:${id}`);assert(result,`${place.name}: offline search returns the actual hub`);
  assert.equal(result.x,place.x);assert.equal(result.z,place.z);
  routeReports.push(`${id}:${out.length}/${home.length}`);
}
for(const name of ['Belconnen','Bruce','Watson','Mitchell','Gungahlin','Phillip','Greenway'])assert(search.search(name).some(hit=>hit.kind==='landmark'&&hit.label===name),`offline suburb search ${name}`);
const suburbs=map.landmarks.filter(place=>place.sourceTags?.place==='suburb');
for(const [hubId,name,sourceId]of [['westfield-belconnen','Belconnen','node/4563377371'],
  ['gungahlin-library','Gungahlin','node/4564887164'],['south-point-tuggeranong','Greenway','node/291971878']]){
  const hub=mergedPlaces.get(hubId);
  const nearest=suburbs.reduce((best,place)=>gap(place,hub)<gap(best,hub)?place:best);
  assert.equal(nearest.name,name,`${hub.name}: district uses the local suburb marker`);
  assert.equal(nearest.sourceId,sourceId,`${name}: broad district marker cannot displace the local suburb`);
}
for(const name of ['Belconnen Way','Flemington Road','Gungahlin Drive','Hindmarsh Drive','Athllon Drive'])assert(search.search(name).some(hit=>hit.kind==='street'&&hit.label===name),`offline road search ${name}`);

const pointInside=(ring,predicate=()=>true)=>{
  const prepared=prepareWaterRing(ring),xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
  for(let ix=1;ix<20;ix++)for(let iz=1;iz<20;iz++){
    const point={x:Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*ix/20,z:Math.min(...zs)+(Math.max(...zs)-Math.min(...zs))*iz/20};
    if(prepared.contains(point.x,point.z)&&predicate(point))return point;
  }
  assert.fail('source ring has no sampled interior point');
};
const lakes=[];
for(const [sourceId,expectedIslands]of [['relation/409874',2],['relation/331482',3],['relation/1222',3],['relation/67720',3]]){
  const areas=map.areas.filter(area=>area.sourceId===sourceId&&area.type==='water');assert.equal(areas.length,1,`one complete outer shoreline for ${sourceId}`);
  const islands=areas.reduce((sum,area)=>sum+(area.innerRings||[]).length,0);assert.equal(islands,expectedIslands);
  for(const area of areas){
    assert(Number.isFinite(area.surfaceY)&&area.surfaceSource,'sourced shore estimate supplies one physical water level');
    const holes=(area.innerRings||[]).map(hole=>hole.points||hole),preparedHoles=holes.map(hole=>prepareWaterRing(hole));
    for(const ring of [area.points,...holes]){
      assert.deepEqual(ring[0],ring.at(-1),'every shoreline and island stays closed');
      for(const [x,z]of ring)assert(Number.isFinite(x)&&Number.isFinite(z)&&x>=map.bounds.minX&&x<=map.bounds.maxX&&z>=map.bounds.minZ&&z<=map.bounds.maxZ,'full source shorelines remain inside expanded map bounds');
    }
    const wet=pointInside(area.points,point=>!preparedHoles.some(hole=>hole.contains(point.x,point.z)));
    assert.equal(simulation.waterAt(wet.x,wet.z,{underBridge:true})?.id,area.id,'actual water owner includes the complete lake');
    for(const hole of holes){const dry=pointInside(hole);assert.equal(simulation.waterAt(dry.x,dry.z,{underBridge:true}),null,'source islands remain dry land');}
    const outer=prepareWaterRing(area.points);let shoreChecked=false;
    for(let i=1;i<area.points.length&&!shoreChecked;i++){
      const a=area.points[i-1],b=area.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<3)continue;
      const middle={x:(a[0]+b[0])/2,z:(a[1]+b[1])/2},sides=[-1,1].map(side=>({x:middle.x-dz/length*side*.8,z:middle.z+dx/length*side*.8}));
      const inside=sides.find(p=>outer.contains(p.x,p.z)&&!preparedHoles.some(h=>h.contains(p.x,p.z))),outside=sides.find(p=>!outer.contains(p.x,p.z));
      if(!inside||!outside)continue;
      assert.equal(simulation.waterAt(inside.x,inside.z,{underBridge:true})?.id,area.id);
      assert.notEqual(simulation.waterAt(outside.x,outside.z,{underBridge:true})?.id,area.id,'normal shoreline contact changes on the actual source boundary');shoreChecked=true;
    }
    assert(shoreChecked);lakes.push(`${area.name}:${area.points.length}shore/${holes.length}islands`);
  }
}
const oldLake=prior.areas.find(area=>area.sourceId==='relation/3400115');assert(oldLake);
assert.equal(map.areas.find(area=>area.id===oldLake.id),oldLake,'Lake Burley Griffin keeps its original full source shoreline');
const sourceChunks=new Set(),chunkSize=350;
for(const road of map.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i];
  for(let x=Math.floor(Math.min(a[0],b[0])/chunkSize);x<=Math.floor(Math.max(a[0],b[0])/chunkSize);x++)for(let z=Math.floor(Math.min(a[1],b[1])/chunkSize);z<=Math.floor(Math.max(a[1],b[1])/chunkSize);z++)sourceChunks.add(`${x},${z}`);
}
assert(sourceChunks.size<6500,'source road coverage stays within the bounded 350m chunk index');
assert(regions.flatMap(region=>region.landmarks.flatMap(place=>place.buildingIds||[])).length<=24,'regional promoted architecture stays bounded');
console.log(`PASS actual regions: existing save/jobs/footprint/terrain priority retained; ${map.roads.length}roads/${graph.nodes.size}nodes/${graph.edges.length}edges; ${addedSegments}new source segments/${seamNodes.size}seams; ${sourceChunks.size}road-covered350mchunks; ${regions.reduce((n,r)=>n+r.buildings.length,0)}new source footprints.`);
console.log(`Return routes ${routeReports.join(', ')}; lakes ${lakes.join(', ')}; graph ${Math.round(graphMs)}ms, total ${Math.round(performance.now()-started)}ms. One static simulation; mesh residency is verified by the separate streaming suite.`);
