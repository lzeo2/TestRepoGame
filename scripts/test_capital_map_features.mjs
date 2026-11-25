import assert from 'node:assert/strict';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {createAddressSearch} from '../Games/Capital Drive/address-search.js';
import {createMapProjection,drawMapDetail,mapPointFromClient} from '../Games/Capital Drive/map-projection.js';
import {createInteriors,createGymEntry,createSchoolEntry} from '../Games/Capital Drive/interiors.js';
import {createMissionGuide} from '../Games/Capital Drive/mission-locations.js';
import {MAPPED_STORES} from '../Games/Capital Drive/stores.js';
import {EXTRA_STORES} from '../Games/Capital Drive/civic-extras.js';
import {CIVIC_INTERIOR_ENTRIES} from '../Games/Capital Drive/civic-view.js';
import {SOURCE_GYM_SERVICES,GENERIC_SERVICES} from '../Games/Capital Drive/services.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {addCapitalWorldObstacles} from './capital-world-obstacles-fixture.mjs';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createInteriorView} from '../Games/Capital Drive/interior-view.js';

// Actual composed source data; no browser, player travel or surveyed-interior claim.
const map=await loadCapitalMap();
const mapTerrain=createTerrainSampler(map);
const worldObstacles=process.argv.includes('--world-obstacles')?addCapitalWorldObstacles(map,mapTerrain):null;
const summary={buildings:0,areas:0,areaTypes:{},holes:0,vertices:0,closedSourceRings:0,duplicateAdjacentVertices:[],places:0,aliases:0,entries:0};
const features=[...(map.areas||[]).map(source=>({source,kind:'area'})),...map.buildings.map(source=>({source,kind:'building'}))];
const extent={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
for(const {source,kind} of features){
  summary[kind==='area'?'areas':'buildings']++;
  if(kind==='area')summary.areaTypes[source.type]=(summary.areaTypes[source.type]||0)+1;
  if(kind==='building')assert(Number.isFinite(source.height)&&source.height>0,`${source.id} height`);
  for(const [index,ring] of [source.points,...(source.innerRings||[]).map(h=>h.points||h)].entries()){
    assert(Array.isArray(ring)&&ring.length>=3,`${source.id} ring ${index}`);
    if(index)summary.holes++;
    let twiceArea=0;
    const unique=new Set();
    for(let i=0;i<ring.length;i++){
      const p=ring[i],q=ring[(i+1)%ring.length];
      assert(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),`${source.id} finite vertex ${i}`);
      unique.add(`${p[0]},${p[1]}`);summary.vertices++;
      extent.minX=Math.min(extent.minX,p[0]);extent.maxX=Math.max(extent.maxX,p[0]);
      extent.minZ=Math.min(extent.minZ,p[1]);extent.maxZ=Math.max(extent.maxZ,p[1]);
      twiceArea+=p[0]*q[1]-q[0]*p[1];
      if(p[0]===q[0]&&p[1]===q[1]){
        if(i===ring.length-1)summary.closedSourceRings++;else summary.duplicateAdjacentVertices.push({id:source.id,ring:index,vertex:i});
      }
    }
    assert(unique.size>=3&&Math.abs(twiceArea)>1e-8,`${source.id} nondegenerate ring ${index}`);
  }
}
// Capture every actual fill, checking all vertices/rings survive the drawing owner.
// Extent is derived from source polygons because clipped edge records may extend
// beyond the playable bounds; that is source coverage, not an invalid coordinate.
const projection=createMapProjection(extent,1000,800),paths=[];
let current=[],closed=0;
const ctx={save(){},restore(){},beginPath(){current=[];closed=0;},rect(){},clip(){},fillRect(){},
  moveTo(x,y){assert([x,y].every(Number.isFinite));current.push([[x,y]]);},
  lineTo(x,y){assert([x,y].every(Number.isFinite));current.at(-1).push([x,y]);},
  closePath(){closed++;},fill(rule){paths.push({rings:current,closed,rule,color:this.fillStyle});},stroke(){}};
const stats=drawMapDetail(ctx,{areas:map.areas,buildings:map.buildings},projection);
assert.equal(stats.drawn,features.length);assert.equal(paths.length,features.length);
// Spatial grid enumeration is intentionally unrelated to source-array order.
const signature=rings=>JSON.stringify(rings.map(r=>r.map(p=>p.map(n=>Math.round(n*1e7)/1e7))));
const drawn=new Map();
for(const path of paths){const key=signature(path.rings);if(!drawn.has(key))drawn.set(key,[]);drawn.get(key).push(path);}
for(let i=0;i<features.length;i++){
  const {source,kind}=features[i],rings=[source.points,...(source.innerRings||[]).map(h=>h.points||h)];
  const key=signature(rings.map(r=>r.map(([x,z])=>{const p=projection.toCanvas(x,z);return [p.x,p.y];})));
  const actual=drawn.get(key)?.pop();assert(actual,`${source.id} exact rendered rings`);
  assert.equal(actual.rule,'evenodd',`${source.id} preserves source holes`);
  assert.equal(actual.closed,rings.length);assert.equal(actual.rings.length,rings.length);
  assert.equal(actual.color,kind==='building'?'#bfc1b3':source.type==='water'?'#9ab7ba':'#bbca9b');
  for(let r=0;r<rings.length;r++){
    assert.equal(actual.rings[r].length,rings[r].length);
    for(let v=0;v<rings[r].length;v++){
      const p=projection.toWorld(...actual.rings[r][v]),expected=rings[r][v];
      assert(Math.hypot(p.x-expected[0],p.z-expected[1])<1e-7,`${source.id} projected vertex`);
    }
  }
}

const search=createAddressSearch(map),places=[...(map.landmarks||[]),...(map.searchPlaces||[])];
const pinProjection=createMapProjection(map.bounds,390,600);
for(const place of places){
  assert(place.id!=null&&typeof place.name==='string'&&place.name.trim());
  assert([place.x,place.z].every(Number.isFinite),`${place.id} pin`);summary.places++;
  for(const query of [place.name,...(place.aliases||[])].filter(Boolean)){
    const results=search.search(query,50);
    // Search intentionally coalesces equal normalized labels within each kind.
    const result=results.find(p=>p.label===place.name&&p.kind===(place.store?'store':'landmark'));
    assert(result,`${place.id} searchable as ${query}`);assert(Object.isFrozen(result));
    const source=places.find(p=>`landmark:${p.id}`===result.id);
    assert(source&&source.x===result.x&&source.z===result.z,`${place.id} source pin identity`);
    summary.aliases++;
  }
  const pixel=pinProjection.toCanvas(place.x,place.z),roundtrip=pinProjection.toWorld(pixel.x,pixel.y);
  assert(Math.hypot(roundtrip.x-place.x,roundtrip.z-place.z)<1e-7);
  if(place.x>=map.bounds.minX&&place.x<=map.bounds.maxX&&place.z>=map.bounds.minZ&&place.z<=map.bounds.maxZ){
    const selected=mapPointFromClient(pinProjection,{left:10,top:20,width:195,height:300},10+pixel.x/2,20+pixel.y/2,map.bounds);
    assert(selected&&Math.hypot(selected.x-place.x,selected.z-place.z)<1e-7,`${place.id} CSS-scaled pin selection`);
  }
}

const gyms=[...SOURCE_GYM_SERVICES,...GENERIC_SERVICES.filter(s=>s.type==='gym')].map(s=>createGymEntry(map,s)).filter(Boolean);
const school=createSchoolEntry(map),stores=[...MAPPED_STORES,...EXTRA_STORES];
const interiors=createInteriors(map,{heightAt:mapTerrain.heightAt,stores,publicEntries:[...CIVIC_INTERIOR_ENTRIES,...gyms,...(school?[school]:[])]});
const guide=createMissionGuide(interiors.entries).guide;
const shellScene=new THREE.Scene(),shellView=createInteriorView(shellScene);
const houseAudit={sourceDoors:map.interiorEntries?.length||0,houseEntries:0,plans:0,renderedSamples:0,geometryVertices:0,omittedDescriptors:{}};
const admittedHouses=new Set(interiors.entries.filter(e=>e.type==='house').map(e=>String(e.buildingId)));
const occupied=new Set([...stores,...CIVIC_INTERIOR_ENTRIES,...gyms,...(school?[school]:[])].map(e=>String(e.buildingId)));
const buildingsById=new Map(map.buildings.map(b=>[String(b.id),b]));
for(const door of map.interiorEntries||[]){
  assert([door.x,door.z,door.nx,door.nz,door.width].every(Number.isFinite),`${door.id} finite exterior descriptor`);
  assert(Math.abs(Math.hypot(door.nx,door.nz)-1)<1e-8&&door.width>0,`${door.id} doorway normal/width`);
  const source=buildingsById.get(String(door.buildingId));assert(source,`${door.id} door retains source footprint`);
  const distance=Math.min(...source.points.map((a,i)=>{
    const b=source.points[(i+1)%source.points.length],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((door.x-a[0])*dx+(door.z-a[1])*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(door.x-a[0]-t*dx,door.z-a[1]-t*dz);
  }));
  // The production frame and visible door each sit .08m outside the source face.
  assert(distance<=.160001,`${door.id} exterior door remains on mapped facade: ${distance}m`);
  if(admittedHouses.has(String(door.buildingId)))continue;
  const building=buildingsById.get(String(door.buildingId));
  const reason=!building?'missing-source':occupied.has(String(door.buildingId))?'occupied-shop-or-public':building.height>9?'source-height-over-9m':!/^(house|residential|detached|semidetached_house|terrace|bungalow|yes)$/.test(building.type||'')?'ineligible-source-type':'other';
  houseAudit.omittedDescriptors[reason]=(houseAudit.omittedDescriptors[reason]||0)+1;
}
const sampledTypes=new Set();
for(const entry of interiors.entries){
  summary.entries++;
  assert(map.buildings.some(b=>String(b.id)===String(entry.buildingId)),`${entry.id} retained footprint`);
  const expected={x:entry.x-Math.sin(entry.yaw)*1.8,z:entry.z-Math.cos(entry.yaw)*1.8};
  const dto=guide({target:{kind:'interior',roomId:entry.id,x:999,z:999,label:'test target'}});
  assert.equal(dto.entryId,entry.id);assert.deepEqual(dto.point,expected,`${entry.id} mission guides actual entrance`);
  assert.equal(interiors.findEntry({...expected,y:entry.y})?.id,entry.id,`${entry.id} physically discoverable entrance`);
  const actor={...expected,y:entry.y,yaw:entry.yaw};
  const plan=interiors.enter(entry,actor);
  assert.equal(plan?.id,entry.id,`${entry.id} actual room entry`);
  assert([plan.floorY,plan.origin.x,plan.origin.z,plan.origin.yaw].every(Number.isFinite));
  if(entry.type==='house'){
    houseAudit.houseEntries++;houseAudit.plans++;
    for(const collection of [plan.walls,plan.furniture,plan.details])for(const item of collection||[]){
      assert([item.x,item.z,item.y,item.yaw,item.width,item.depth,item.height].every(Number.isFinite),`${entry.id} finite ${item.kind}`);
      assert(item.width>0&&item.depth>0&&item.height>0,`${entry.id} positive shell/furniture dimensions`);
    }
    const building=map.buildings.find(b=>String(b.id)===String(entry.buildingId));
    const stratum=`${building.source}:${building.type}:${building.points.length>8?'complex':'simple'}`;
    if(houseAudit.plans%97===1||!sampledTypes.has(stratum)){
      sampledTypes.add(stratum);assert(shellView.load(plan));houseAudit.renderedSamples++;
      shellScene.traverse(mesh=>{
        if(!mesh.isMesh)return;
        for(const attribute of Object.values(mesh.geometry.attributes))assert(Array.from(attribute.array).every(Number.isFinite),`${entry.id} finite rendered shell attribute`);
        houseAudit.geometryVertices+=mesh.geometry.attributes.position.count;
      });
      shellView.clear();
    }
  }
  assert(interiors.leave(actor),`${entry.id} room exit`);
  assert.equal(actor.x,expected.x);assert.equal(actor.z,expected.z);
}
shellView.dispose();
assert(summary.entries>=stores.length,'mapped shop/public entrances are exercised');
console.log(`PASS actual map feature sweep ${JSON.stringify(summary)}; exact detail paths/holes, search aliases/source pins, CSS projection and public/store mission entrance ties. Source closures/repeated vertices are retained; no native travel or surveyed geometry claim.`);
if(worldObstacles)console.log('PASS actual generated house door/room sweep '+JSON.stringify({worldObstacles:worldObstacles.counts,houseAudit,exclusions:['Every admitted house plan entered/left through real lazy owner; sampled renderer geometry only.','House descriptor omission can reflect occupied mapped shop/public buildings; doors are not invented for absent source entries.','No exterior clearance, native input, room navigation/reachability or surveyed-floorplan claim.']}));
