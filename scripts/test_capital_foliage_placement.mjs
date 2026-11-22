import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {placeFoliage} from '../Games/Capital Drive/foliage-placement.js';
import {roadProfile} from '../Games/Capital Drive/road-network.js';

const road=(id,z,type='residential')=>({id,type,width:8,points:[[0,z],[175,z],[560,z],[920,z]]});
const polygon=(id,type,west,south,east,north)=>({id,type,points:[[west,south],[east,south],[east,north],[west,north]]});
const mainRoad=road('old-street',24), outerRoad=road('new-street',760,'trunk');
const forest=polygon('source-forest','wood',620,97,880,315);
const meadow=polygon('meadow','park',30,128,300,315);
const pitch=polygon('school-pitch','pitch',100,178,245,287);
const hole=polygon('source-hole','water',705,159,773,248);
forest.innerRings=[{points:hole.points}];
const fixture={
  bounds:{minX:-40,minZ:-50,maxX:960,maxZ:850},
  roads:[mainRoad, outerRoad, road('bridge',310,'secondary'),road('sidewalk',482,'footway'),road('private',622)],
  areas:[meadow,pitch,forest],
};
fixture.roads[2].sourceTags={bridge:'yes'};
fixture.roads[4].sourceTags={access:'private'};
const xzIn=(point,area)=>point.x>area.points[0][0] && point.x<area.points[2][0] &&
  point.z>area.points[0][1] && point.z<area.points[2][1];
const obstructed=polygon('authored-gate','no-planting',295,-48,520,70);
const seen=new Set();
const isClear=(x,z,kind)=>{seen.add(kind);return !xzIn({x,z},obstructed);};
const specimen=placeFoliage(fixture,{isClear});
assert.deepEqual(specimen,placeFoliage(fixture,{isClear}), 'Repeated placement is deterministic');
assert(!specimen.some(point=>xzIn(point,obstructed)), 'The world clearance callback has final authority');
assert(!specimen.some(point=>xzIn(point,pitch)), 'An overlapping park does not cover the mapped pitch');
assert(!specimen.some(point=>point.habitat==='wood' && xzIn(point,hole)), 'Mapped area holes stay clear');
assert(specimen.some(point=>point.kind==='tree' && point.habitat==='wood'));
assert(specimen.some(point=>point.kind==='shrub' && point.habitat==='park'));
assert.deepEqual([...seen].sort(),['shrub','tree']);
assert(!specimen.some(point=>point.habitat==='street' && [310,482,622].some(roadZ=>Math.abs(point.z-roadZ)<30)),
  'A bridge, footpath or private driveway does not seed an artificial avenue');
for(const point of specimen.filter(point=>point.habitat==='street')){
  const source=point.z>400?outerRoad:mainRoad, profile=roadProfile(source);
  assert(Math.abs(point.z-source.points[0][1])>profile.driveWidth/2+profile.pavementWidth);
}
for(let first=0;first<specimen.length;first++){
  for(let second=first+1;second<specimen.length;second++){
    const a=specimen[first], b=specimen[second];
    const minimum=a.kind!==b.kind?2.6:a.kind==='tree'?8.5:4.5;
    assert(Math.hypot(a.x-b.x,a.z-b.z)>=minimum,'Minimum spacing spans adjacent chunks and species');
  }
}
assert.deepEqual(placeFoliage({roads:fixture.roads,areas:fixture.areas}),[]);

const read=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const layers=await Promise.all(['canberra','canberra-north','north-west','airport'].map(read));
const bounds={
  minX:Math.min(...layers.map(layer=>layer.bounds.minX)), maxX:Math.max(...layers.map(layer=>layer.bounds.maxX)),
  minZ:Math.min(...layers.map(layer=>layer.bounds.minZ)), maxZ:Math.max(...layers.map(layer=>layer.bounds.maxZ)),
};
const points=placeFoliage({bounds,roads:layers.flatMap(layer=>layer.roads),areas:layers.flatMap(layer=>layer.areas)});
const totals={tree:0,shrub:0}, perChunk=new Map();
for(const point of points){
  assert(Number.isFinite(point.x)&&Number.isFinite(point.z)&&Number.isSafeInteger(point.seed));
  const chunk=`${Math.floor(point.x/350)},${Math.floor(point.z/350)}`;
  if(!perChunk.has(chunk))perChunk.set(chunk,{tree:0,shrub:0});
  perChunk.get(chunk)[point.kind]++;
  totals[point.kind]++;
}
assert(totals.tree<=28000&&totals.shrub<=16000);
assert([...perChunk.values()].every(chunk=>chunk.tree<=126&&chunk.shrub<=58));
for(const district of [point=>point.x<-3000,point=>point.z<-5500,point=>point.x>4500,point=>point.z>1500]){
  const selection=points.filter(district);
  assert(selection.some(point=>point.kind==='tree') && selection.some(point=>point.kind==='shrub'),
    'The global cap preserves vegetation in each outer district');
}
console.log(`PASS foliage placement clearance, spacing, world caps and outer coverage. Candidate limits ${totals.tree} trees and ${totals.shrub} shrubs across ${perChunk.size} live-source chunks.`);
