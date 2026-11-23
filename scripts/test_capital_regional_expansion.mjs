import assert from 'node:assert/strict';
import {applyRegionalExpansion} from '../Games/Capital Drive/regional-expansion.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
const origin=[149.137,-35.318];
const bounds=(minX,maxX,minZ=-50,maxZ=100)=>({minX,maxX,minZ,maxZ});
const tile=(limits,height)=>({...limits,cols:2,rows:2,heights:Array(4).fill(height),source:'synthetic fixture'});
const road=(id,points,extra={})=>({id,points,width:7,type:'residential',name:'Fixture Road',sourceId:'way/'+id,...extra});
const polygon=(id,x,extra={})=>({id,points:[[x,0],[x+5,0],[x+5,5],[x,5],[x,0]],...extra});
const base={meta:{origin},bounds:bounds(0,100),terrain:tile(bounds(0,100),5),terrainTiles:[tile(bounds(-20,120),8)],
 roads:[road('old',[[0,0],[10,0]],{nodes:[1,2],oneway:1,sourceTags:{maxspeed:'40'}})],
 buildings:[polygon('old-building',20,{sourceId:'way/old-building',height:9})],
 areas:[polygon('retained-area',30,{type:'park',surfaceY:6}),polygon('water-piece',40,{type:'water'})],
 landmarks:[{id:'retained-place',name:'Old place',x:25,z:2}],landmarkBuildingIds:['old-building'],
 mapExpansion:{old:true},terrainRequirements:{unchanged:true},custom:{kept:true}};
const first={meta:{origin,regionId:'west',title:'West'},bounds:bounds(-50,400),terrain:tile(bounds(-50,400),20),
 roads:[road('overlap',[[10,0],[0,0],[0,-10]],{nodes:[2,1,3]}),road('old',[[150,0],[160,0]],{nodes:[4,5],bridge:true,sourceTags:{access:'destination'}}),road('retag',[[0,0],[10,0]],{sourceId:'way/old',sourceTags:{maxspeed:'90'}})],
 buildings:[polygon('duplicate-outline',20),polygon('new-building',150,{sourceId:'way/new-building',height:12})],
 areas:[polygon('full-water',40,{type:'water',sourceWayIds:['water-piece'],surfaceY:12,innerRings:[{points:[[41,1],[42,1],[42,2],[41,1]],sourceWayIds:['water-island']}]})],
 landmarks:[{id:'retained-place',name:'Do not replace',x:200,z:0},{id:'art',name:'New art',x:152,z:2,design:'civic-hall',buildingId:'new-building'},
 {id:'unbacked-art',name:'Plain mapped place',x:250,z:0,design:'tower',buildingId:'absent-building'},{id:'plain',name:'Plain place',x:300,z:0}]};
const second={meta:{origin,regionId:'north',title:'North'},bounds:bounds(400,700),terrain:tile(bounds(400,700),30),
 roads:[road('later-overlap',[[160,0],[150,0],[140,0]],{nodes:[5,4,6]}),road('old',[[500,0],[510,0]],{nodes:[7,8]})],
 buildings:[polygon('new-building',160),polygon('second-building',500)],areas:[polygon('second-park',510,{type:'park',surfaceY:19})],
 landmarks:[{id:'second-art',name:'Second art',x:501,z:2,design:'station',buildingId:'second-building'}]};
const copy=value=>structuredClone(value);
const before=copy({base,first,second});
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
freeze(base);freeze(first);freeze(second);
assert.equal(applyRegionalExpansion(base,[]),base);
const merged=applyRegionalExpansion(base,[first,second]);
assert.deepEqual({base,first,second},before,'deep-frozen input geometry/metadata stay unchanged');
assert.equal(merged.roads[0],base.roads[0]);assert.equal(merged.roads[0].points,base.roads[0].points);
assert.equal(merged.roads[0].sourceTags.maxspeed,'40','new source tags cannot retag existing roads');
assert.equal(merged.roads[0].oneway,1);
assert.equal(new Set(merged.roads.map(r=>String(r.id))).size,merged.roads.length,'colliding road IDs receive unique deterministic split IDs');
assert.deepEqual(merged.roads.map(r=>r.points),[[[0,0],[10,0]],[[0,0],[0,-10]],[[150,0],[160,0]],[[150,0],[140,0]],[[500,0],[510,0]]]);
assert.deepEqual(merged.roads[1].nodes,[1,3]);assert.deepEqual(merged.roads[3].nodes,[4,6],'split geometry retains aligned source node IDs');
assert.equal(merged.roads[2].bridge,true);assert.equal(merged.roads[2].sourceTags.access,'destination');
assert.equal(merged.buildings[0],base.buildings[0]);assert.deepEqual(merged.buildings.map(b=>b.id),['old-building','new-building','second-building']);
assert.equal(merged.areas[0],base.areas[0]);assert(!merged.areas.some(area=>area.id==='water-piece'),'full source water replaces its older constituent');
assert.equal(merged.areas.find(area=>area.id==='full-water'),first.areas[0]);assert.equal(merged.areas.find(area=>area.id==='full-water').surfaceY,12);
assert.deepEqual(merged.areas.find(area=>area.id==='full-water').innerRings,first.areas[0].innerRings);
assert.deepEqual(merged.bounds,bounds(-50,700));assert.equal(merged.landmarks[0],base.landmarks[0]);
assert.deepEqual(merged.regionalPlaces.map(p=>[p.id,p.regionId]),[['art','west'],['unbacked-art','west'],['plain','west'],['second-art','north']]);
assert.equal(merged.regionalPlaces.find(p=>p.id==='unbacked-art').design,undefined,'missing building never gains artwork ownership');
assert.equal(merged.landmarks.find(p=>p.id==='unbacked-art').design,undefined);
assert.deepEqual(merged.landmarkBuildingIds,['old-building','new-building','second-building']);
assert.deepEqual(merged.regionalExpansion,[
 {regionId:'west',title:'West',addedRoads:2,addedSegments:2,addedBuildings:1,addedAreas:1,addedLandmarks:3,promotedBuildings:1,skippedDesigns:1},
 {regionId:'north',title:'North',addedRoads:2,addedSegments:2,addedBuildings:1,addedAreas:1,addedLandmarks:1,promotedBuildings:1,skippedDesigns:0}]);
assert.equal(merged.terrain,base.terrain);assert.equal(merged.terrainTiles[0],base.terrainTiles[0]);
assert.equal(merged.terrainTiles[1].heights,first.terrain.heights);assert.equal(merged.terrainTiles[1].blendPreviousMetres,150);
assert.equal(merged.terrainTiles[2].heights,second.terrain.heights);
assert.equal(merged.mapExpansion,base.mapExpansion);assert.equal(merged.terrainRequirements,base.terrainRequirements);assert.equal(merged.custom,base.custom);
const terrain=createTerrainSampler(merged);
const priorTerrain=createTerrainSampler(base);
assert.equal(terrain.groundHeightAt(50,0),priorTerrain.groundHeightAt(50,0));assert.equal(terrain.groundHeightAt(110,0),priorTerrain.groundHeightAt(110,0));
assert.equal(terrain.groundHeightAt(300,0),20);assert.equal(terrain.groundHeightAt(650,0),30,'regions append after all prior terrain precedence');
for(const invalid of [null,{},[first,first]])assert.throws(()=>applyRegionalExpansion(base,invalid));
const badChanges=[{meta:{...first.meta,origin:[0,0]}},{meta:{...first.meta,regionId:''}},{bounds:bounds(-100,400)},
 {terrain:{...first.terrain,cols:1}},{terrain:{...first.terrain,heights:[0,NaN,0,0]}},{terrain:{...first.terrain,heights:[1,2]}},
 {roads:[]},{roads:[road('bad',[[0,0],[Infinity,0]])]},{roads:[road('bad',[[0,0],[1,1]],{nodes:[1]})]},
 {buildings:[{id:'bad',points:[[0,0]]}]},{landmarks:[{id:'bad',x:NaN,z:0}]}];
for(const change of badChanges)assert.throws(()=>applyRegionalExpansion(base,[{...first,...change}]));
assert.throws(()=>applyRegionalExpansion(merged,[first]),/unique region/,'previously applied region IDs cannot silently repeat');
// A generated, bounded synthetic overlay checks large-batch IDs/segment accounting.
const large={meta:{origin,regionId:'large',title:'Large fixture'},bounds:bounds(1000,22000),terrain:tile(bounds(1000,22000),40),
 roads:Array.from({length:5000},(_,i)=>road('r'+i,[[1000+i*4,0],[1002+i*4,0]],{nodes:[10000+i*2,10001+i*2]})),buildings:[],areas:[],landmarks:[]};
const many=applyRegionalExpansion(base,[large]);assert.equal(many.roads.length,5001);assert.equal(many.regionalExpansion[0].addedSegments,5000);
assert.equal(many.roads[0],base.roads[0]);assert.deepEqual(many.roads.at(-1).points,large.roads.at(-1).points);assert.equal(many.roads.at(-1).points[0],large.roads.at(-1).points[0],'source point geometry is retained without a deep clone');
console.log('PASS regional expansion: frozen inputs/base road identity and tags, coordinate/node-aligned splits and ID collisions, building/area dedupe and water holes/surfaceY, terrain coverage/priority, artwork ownership, stats, invalid regions and 5000-road batch.');
