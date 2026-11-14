import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const baseUrl = new URL('../Games/Capital Drive/', import.meta.url);
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { applyMapExpansion } = await import(moduleUrl(await readFile(new URL('map-expansion.js', baseUrl), 'utf8')));
const networkUrl = moduleUrl(await readFile(new URL('road-network.js', baseUrl), 'utf8'));
const { createRoutePlanner } = await import(networkUrl);
const { buildRoadGraph } = await import(moduleUrl((await readFile(new URL('simulation.js', baseUrl), 'utf8')).replace("'./road-network.js'", JSON.stringify(networkUrl))));
const raw = await readFile(new URL('data/canberra.json', baseUrl));
const base = JSON.parse(raw), north = JSON.parse(await readFile(new URL('data/canberra-north.json', baseUrl), 'utf8'));
const digest = createHash('sha256').update(raw).digest('hex');
const before = JSON.stringify(base), northBefore = JSON.stringify(north);
const merged = applyMapExpansion(base, north);
assert.equal(JSON.stringify(base), before, 'base geographic snapshot is immutable');
assert.equal(JSON.stringify(north), northBefore, 'source overlay is immutable');
assert.equal(merged.terrain, base.terrain, 'source merging does not pretend base terrain covers north');
assert.equal(merged.terrainRequirements.status, 'required-before-north-runtime');
assert.equal(merged.spawn, base.spawn);
assert.equal(merged.bounds.minZ, north.bounds.minZ);
assert.equal(merged.bounds.maxZ, base.bounds.maxZ);
assert.equal(merged.landmarks.filter(p => p.id === 'canberra-centre').length, 1);
assert(north.roads.length > 2500 && north.buildings.length > 3000);
assert.equal(north.meta.source.files.length, 17, '16 bounded official map tiles plus complete relation');
for (const file of north.meta.source.files) {
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.match(file.url, /^https:\/\/api\.openstreetmap\.org\/api\/0\.6\//);
  assert(!file.file.includes('/'), 'cache filenames have no machine-specific paths');
}
assert.equal(north.meta.source.license, 'ODbL-1.0');
for (const road of north.roads) {
  assert.equal(road.nodes.length, road.points.length);
  assert.equal(road.type, road.sourceTags.highway);
  assert.match(road.sourceId, /^way\/\d+$/);
}
const lake = north.areas.find(area => area.sourceId === 'relation/3400115');
assert.equal(north.meta.lakeComplete, true);
assert(lake.points.length > 2000, 'full shoreline is source geometry');
assert.equal(lake.holes.length, 7, 'source islands remain holes, not water');
for (const ring of [lake.points, ...lake.holes]) {
  assert.deepEqual(ring[0], ring.at(-1), 'every source ring is closed');
  assert(ring.length >= 4);
}
assert.equal(lake.sourceWayIds.length, 15, 'outer ring assembled from all source way members');
assert.equal(lake.innerRings.flatMap(ring => ring.sourceWayIds).length, 8);
const centre = north.landmarks[0];
assert.equal(centre.id, 'canberra-centre');
assert.equal(centre.sourceBuildingIds.length, 3);
for (const id of centre.sourceBuildingIds) assert(merged.buildings.some(b => b.id === id));

const graph = buildRoadGraph(merged.roads), planner = createRoutePlanner(graph);
const route = planner.findEdges(base.spawn, centre);
assert(route.length > 30, 'real directed route connects inner south to Canberra Centre');
assert(route.some(edge => edge.road.sourceTags?.bridge === 'yes'), 'route crosses sourced bridge');
for (const sourceId of ['way/4878920', 'way/4878927']) {
  const bridge = graph.edges.find(edge => edge.road.sourceId === sourceId);
  assert(bridge, `bridge ${sourceId} retains source identity`);
  assert.equal(bridge.road.sourceTags.bridge, 'yes');
  assert.equal(bridge.road.sourceTags.layer, '1');
  assert(planner.findEdges(base.spawn, bridge.from.id).length > 0, `spawn reaches ${sourceId}`);
  assert(planner.findEdges(bridge.to.id, centre).length > 0, `${sourceId} reaches Civic`);
}
const remerged = applyMapExpansion(merged, north);
for (const key of ['roads', 'buildings', 'areas', 'landmarks']) assert.equal(remerged[key].length, merged[key].length, `idempotent ${key}`);

// Exact segment clipping must not bridge across a duplicate middle segment.
const road = { id: '1', type: 'residential', nodes: [1, 2], points: [[0, 0], [1, 0]], oneway: 1 };
const fixture = { meta: { origin: [0, 0] }, bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, roads: [road], buildings: [{ id: 'old', points: [[0, 0], [1, 0], [1, 1], [0, 0]] }], areas: [], landmarks: [], terrain: {} };
const extension = { meta: { origin: [0, 0] }, bounds: fixture.bounds, roads: [{ ...road, id: 'new', sourceId: 'way/1', sourceTags: { bridge: 'yes' }, nodes: [0, 1, 2, 3], points: [[-1, 0], [0, 0], [1, 0], [2, 0]] }], buildings: [{ id: 'duplicate', points: [[1, 1], [1, 0], [0, 0], [1, 1]] }], areas: [], landmarks: [] };
const clipped = applyMapExpansion(fixture, extension);
assert.equal(clipped.roads.length, 3);
assert.deepEqual(clipped.roads.slice(1).map(r => r.nodes), [[0, 1], [2, 3]]);
assert(clipped.roads.every(r => r.oneway === 1));
assert.equal(clipped.roads[0].sourceTags.bridge, 'yes', 'retained base bridge gets exact source tags');
assert.equal(clipped.buildings.length, 1, 'rotation/reversal invariant exact footprint deduplication');
assert.throws(() => applyMapExpansion(fixture, { ...extension, meta: { origin: [1, 0] } }), /origin/);
console.log(`PASS north: ${north.roads.length} source runs, ${north.buildings.length} source footprints; full lake + 7 islands; both bridges connect spawn/Civic; ${route.length}-edge route; immutable base sha256 ${digest}; terrain gate explicit`);
