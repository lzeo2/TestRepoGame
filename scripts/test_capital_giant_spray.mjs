import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildRoadGraph } from '../Games/Capital Drive/simulation.js';
import { applyRoadProfiles, createRoutePlanner, roadProfile } from '../Games/Capital Drive/road-network.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyDefenceDepot } from '../Games/Capital Drive/defence-depot.js';
import { applyNorthWest } from '../Games/Capital Drive/north-west.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const names = ['canberra', 'canberra-north', 'road-profiles', 'airport', 'airport-terrain', 'north-west', 'north-west-terrain', 'giant-spray'];
const sources = new Map(await Promise.all(names.map(async name => {
  const raw = await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url));
  return [name, { raw, data: JSON.parse(raw), hash: createHash('sha256').update(raw).digest('hex') }];
})));
const data = name => sources.get(name).data;
const overlay = data('giant-spray'), site = overlay.site;
assert.equal(overlay.meta.source.license, 'ODbL-1.0');
assert(overlay.meta.source.files.every(file => /^https:\/\/api.openstreetmap.org\/api\/0.6\/map.json\?bbox=/.test(file.url) && /^[a-f0-9]{64}$/.test(file.sha256)));
for (const pin of overlay.meta.existingSnapshots) assert.equal(sources.get(pin.file.slice(0, -5)).hash, pin.sha256);
assert.equal(site.sourceId, 'way/27480300');
assert.equal(site.name, 'Giant Spray');
assert.equal(site.pools.length, 4); assert.equal(site.slides.length, 6);
assert.deepEqual(site.points[0], site.points.at(-1));
for (const feature of [site, ...site.pools, ...site.slides]) {
  assert(Number.isSafeInteger(feature.sourceVersion) && feature.sourceVersion > 0);
  assert(Number.isFinite(Date.parse(feature.sourceTimestamp)));
  assert.equal(feature.nodes.length, feature.points.length);
  for (const [x, z] of feature.points) {
    assert(Number.isFinite(x) && Number.isFinite(z));
    assert(x >= overlay.bounds.minX && x <= overlay.bounds.maxX && z >= overlay.bounds.minZ && z <= overlay.bounds.maxZ);
  }
}
assert.equal(overlay.buildings.length, 0, 'no residential building import');
assert.equal(overlay.areas.length, 0, 'source pools are view descriptors, not new swimmable water');
const pair = (a, b) => [a, b].sort((x, y) => x - y).join(':');
const priorPairs = new Set(), previous = new Map();
for (const name of ['canberra', 'canberra-north', 'airport', 'north-west']) for (const road of data(name).roads) {
  for (const [i, node] of (road.nodes || []).entries()) {
    previous.set(node, road.points[i]);
    if (i) priorPairs.add(pair(road.nodes[i-1], node));
  }
}
const added = new Set(), seams = new Set();
for (const road of overlay.roads) {
  assert(Number.isSafeInteger(road.sourceVersion));
  assert(roadProfile(road).trafficAllowed, 'only accepted public motor roads');
  assert.equal(road.nodes.length, road.points.length);
  for (const [i, node] of road.nodes.entries()) {
    if (previous.has(node)) { assert.deepEqual(road.points[i], previous.get(node)); seams.add(node); }
    if (!i) continue;
    const key = pair(road.nodes[i-1], node);
    assert(!priorPairs.has(key) && !added.has(key), 'no duplicate source segment'); added.add(key);
  }
}
assert(seams.size > 0, 'actual shared source-node seam');
assert(added.size > 20 && added.size < 400, 'bounded connector and precinct');
assert(sources.get('giant-spray').raw.length < 80_000);
const civic = applyMapExpansion(applyRoadProfiles(data('canberra'), data('road-profiles')), data('canberra-north'));
const terrain = data('north-west-terrain');
assert.equal(terrain.terrain.giantSpraySidecarSha256,sources.get('giant-spray').hash);
const prior = applyDefenceDepot(applyAirport(civic, data('airport'), data('airport-terrain')));
const merged = applyNorthWest(prior,data('north-west'),terrain,overlay);
assert.equal(merged.giantSpray,site);
const sampler=createTerrainSampler(merged);
assert(sampler.groundHeightAt(site.x,site.z)>0,'the original park location has ACT contour ground');
const script=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const districtSource=script.slice(script.indexOf('const districtPlaces='),script.indexOf('const boost=simulation.driving;'));
const updateDistrict=Function('map','p','$',districtSource);
const district={textContent:''};
for(const [id,name] of [['dickson-library','DICKSON'],['black-mountain-tower','BLACK MOUNTAIN'],['giant-spray','MACQUARIE']]){
  const point=merged.landmarks.find(place=>place.id===id);
  updateDistrict(merged,point,()=>district);
  assert.equal(district.textContent,name);
}
const graph = buildRoadGraph(merged.roads), planner = createRoutePlanner(graph);
const approach = graph.nodes.get(site.approach.sourceId.slice(5));
assert(approach && Math.hypot(approach.x-site.x, approach.z-site.z) < 80, 'public road arrival near actual perimeter');
const origin = [...graph.nodes.values()].filter(n => n.outgoing.some(e => roadProfile(e.road).trafficAllowed)).reduce((best, n) => Math.hypot(n.x-prior.spawn.x, n.z-prior.spawn.z) < Math.hypot(best.x-prior.spawn.x, best.z-prior.spawn.z) ? n : best);
const counts = [];
for (const [from, to] of [[origin, approach], [approach, origin]]) {
  const route = planner.findEdges(from, to);
  assert(route.length > 20 && route.at(-1).to === to, 'directed public route to and from retained world');
  assert(route.some(e => e.road.id.includes('-giant-spray-')));
  assert(route.some(e => !e.road.id.includes('-giant-spray-')));
  assert(route.every((e, i) => roadProfile(e.road).trafficAllowed && (!i || e.from === route[i-1].to)));
  counts.push(route.length);
}
console.log(JSON.stringify({ pass: true, roads: overlay.roads.length, segments: added.size, seams: seams.size, directedRouteEdges: counts, sourceFeatures: 1+site.pools.length+site.slides.length, bytes: sources.get('giant-spray').raw.length, bounds: overlay.bounds }));
