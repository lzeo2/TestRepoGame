import assert from 'node:assert/strict';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';

const map = await loadCapitalMap();
const terrain = createTerrainSampler(map);
const layer = road => Number(road.sourceTags?.layer ?? 0);
const source = road => road.sourceId || `way/${String(road.id).split('-')[0]}`;
const isDeck = road => Boolean(road.sourceTags?.bridge && road.sourceTags.bridge !== 'no');
const isLocalPath = road => road.standalonePath || road.type === 'service';
const cellLength = 100;
const cells = new Map(), upperSegments = [];
for (const road of map.roads) {
  if (isLocalPath(road) || road.sourceTags?.tunnel === 'yes') continue;
  for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i-1], b = road.points[i], dx = b[0]-a[0], dz = b[1]-a[1];
    const length = Math.hypot(dx,dz);
    if (length < .1) continue;
    const segment = {road,a,b,dx,dz,length,keys:[]};
    for(let x=Math.floor(Math.min(a[0],b[0])/cellLength);x<=Math.floor(Math.max(a[0],b[0])/cellLength);x++) {
      for(let z=Math.floor(Math.min(a[1],b[1])/cellLength);z<=Math.floor(Math.max(a[1],b[1])/cellLength);z++) {
        const id = `${x},${z}`;
        if(!cells.has(id)) cells.set(id,[]);
        cells.get(id).push(segment);
        segment.keys.push(id);
      }
    }
    if(isDeck(road) && layer(road)>0) upperSegments.push(segment);
  }
}
const pairs = new Map();
for (const upper of upperSegments) {
  for (const lower of new Set(upper.keys.flatMap(key=>cells.get(key)))) {
    if (layer(lower.road)>=layer(upper.road) || isDeck(lower.road) ||
        (upper.road.name && upper.road.name===lower.road.name)) continue;
    const cross = upper.dx*lower.dz-upper.dz*lower.dx;
    if (Math.abs(cross) < upper.length*lower.length*.25) continue;
    const dx = lower.a[0]-upper.a[0], dz = lower.a[1]-upper.a[1];
    const u=(dx*lower.dz-dz*lower.dx)/cross,v=(dx*upper.dz-dz*upper.dx)/cross;
    // Set aside near-endpoint joins, where two ways can describe the same ramp.
    if (Math.min(u,1-u)*upper.length < 1 || Math.min(v,1-v)*lower.length < 1) continue;
    const x=upper.a[0]+u*upper.dx,z=upper.a[1]+u*upper.dz;
    const lowerY=terrain.roadHeightAt(lower.road,x,z);
    const upperY=terrain.roadHeightAt(upper.road,x,z);
    const key=`${source(upper.road)} over ${source(lower.road)}`;
    pairs.set(key,Math.min(pairs.get(key)??Infinity,upperY-lowerY));
  }
}
const minimumGap = Math.min(...pairs.values());
assert(pairs.size >= 130, 'census includes the full layered motor network');
for(const [key,gap] of pairs) assert(gap>=4.95,`${key} only has ${gap.toFixed(2)} m`);
for(const key of ['way/75247036 over way/1089981018','way/75247010 over way/5640616',
                   'way/4878927 over way/4844798','way/1124045978 over way/294434708']) {
  assert(pairs.has(key),`${key} is covered in the full map`);
}
console.log(JSON.stringify({pairs:pairs.size,minimumCentrelineGap:minimumGap,
  scope:'Positive-layer motor decks over lower, non-tunnel road interiors at distinct centerline intersections. Narrow samples, authored heights.'}));
