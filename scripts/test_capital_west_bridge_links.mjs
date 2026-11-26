import assert from 'node:assert/strict';
import { WEST_BRIDGE_LINKS } from '../Games/Capital Drive/west-bridge-links.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';
import { createRoutePlanner, roadProfile } from '../Games/Capital Drive/road-network.js';
import { buildRoadGraph } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { loadCapitalMap } from './capital-map-fixture.mjs';

const map = await loadCapitalMap();
const roads = map.roads.filter(road => road.id.startsWith('west-bridge-'));
assert.equal(WEST_BRIDGE_LINKS.meta.license, 'ODbL-1.0');
assert.equal(WEST_BRIDGE_LINKS.meta.files.length, 5);
assert(WEST_BRIDGE_LINKS.meta.files.every(source => /^[a-f0-9]{64}$/.test(source.sha256)));
assert.equal(roads.length, WEST_BRIDGE_LINKS.roads.length);
const road = id => roads.find(r => r.sourceId === `way/${id}`);
const scrivener = road(76997565);
assert.equal(scrivener.sourceVersion, 12);
assert.equal(scrivener.sourceTags.bridge_number, '3134');
assert.deepEqual(scrivener.points, [[-5779.98,-1979.82],[-5973.21,-2099.31]]);
assert.deepEqual(scrivener.nodes, [27313463,906703203]);
assert.equal(road(50845453).nodes.at(-1), scrivener.nodes[0]);
assert.equal(road(546708906).nodes[0], scrivener.nodes.at(-1));
const trail = road(38013588);
assert.equal(trail.sourceTags.name,'LBG');
assert.equal(trail.type,'cycleway');
assert.deepEqual(trail.points, [[-4885.17,-1710.96],[-4952.16,-1660.32],[-4963.24,-1651.94]]);

const terrain = createTerrainSampler(map), indexed = new Set(terrain.bridgeSegments.map(segment => segment.roadId));
const bridges = roads.filter(r => r.sourceTags.bridge === 'yes');
const approaches = new Set(roads.filter(r => r.standalonePath && !r.sourceTags.bridge).flatMap(r=>r.nodes));
assert.equal(bridges.length, 23);
for(const bridge of bridges) {
  assert(indexed.has(bridge.id), `physical deck support covers ${bridge.id}`);
  if (bridge.standalonePath) assert(approaches.has(bridge.nodes[0]) && approaches.has(bridge.nodes.at(-1)));
}
for (const path of roads.filter(r => r.standalonePath)) {
  const profile = roadProfile(path);
  assert.equal(path.name,'');
  assert.equal(profile.trafficAllowed,false);
  assert.equal(profile.busAllowed,false);
  assert.equal(profile.pavementWidth,0);
  assert.equal(profile.markings,false);
}
const ids = new Set(roads.map(r => r.id));
const keys = new Set();
for(const r of map.roads.filter(r=>!ids.has(r.id))) {
  for(let i=1;i<r.points.length;i++)keys.add([r.points[i-1].join(','),r.points[i].join(',')].sort().join('|'));
}
for(const r of roads) for(let i=1;i<r.points.length;i++) {
  const key=[r.points[i-1].join(','),r.points[i].join(',')].sort().join('|');
  assert(!keys.has(key),`one owner for each source span: ${r.id}/${i}`);
  keys.add(key);
}
const graph = buildRoadGraph(map.roads);
const south = graph.nodes.get('2043311314'), north = graph.nodes.get('2031625785');
const planner = createRoutePlanner(graph);
for (const [from, to] of [[south,north],[north,south]]) {
  const route = planner.findEdges(from,to);
  assert(route.some(edge=>edge.road===scrivener), 'motor graph uses the restored crossing');
  assert(route.every(edge => !edge.road.standalonePath), 'car route excludes foot and shared paths');
  const gps = findRoute(graph,from,to).map(point=>point.join(','));
  assert(scrivener.points.every(point=>gps.includes(point.join(','))), 'normal GPS uses the restored crossing');
}
const tinyGraph = buildRoadGraph([
  {id:'road-a',name:'Road A',type:'tertiary',points:[[0,0],[0,10],[10,10]]},
  {id:'road-b',name:'Road B',type:'tertiary',points:[[10,10],[10,0]]},
  {id:'path',name:'',type:'cycleway',standalonePath:true,points:[[0,0],[10,0]]},
]);
assert.deepEqual(findRoute(tinyGraph,{x:0,z:0},{x:10,z:0}),[[0,0],[0,10],[10,10],[10,0]], 'car GPS refuses a shorter cycleway');
console.log(`PASS ${roads.length} public source runs, ${bridges.length} supported road and path decks, one owner per segment, two-way Lady Denman Drive GPS, and no cycleway shortcut`);
