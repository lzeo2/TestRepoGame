import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { findRoute } from '../Games/Capital Drive/navigation.js';
import { buildRoadGraph, createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';

// Compare against the unmodified navigation owner, not a second hand-written search.
const baselineRevision = '83f476088c6dbb0ca9f66fbea09889f4c65b9486';
const baselineSource = execFileSync('git', ['show', `${baselineRevision}:Games/Capital Drive/navigation.js`],
  { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
assert.equal(createHash('sha256').update(baselineSource).digest('hex'),
  'cb4936cb2957f345db9bce76079151e88496ea8cae38a584a519e22a3fc975ca');
const { findRoute: dijkstra } = await import(`data:text/javascript;base64,${Buffer.from(baselineSource).toString('base64')}`);
let comparisons = 0, changedTies = 0;
const coordinateIndexes = new WeakMap();
function cost(graph, points) {
  if (!coordinateIndexes.has(graph)) coordinateIndexes.set(graph,
    new Map([...graph.nodes.values()].map(node => [`${node.x},${node.z}`, node])));
  const nodes = coordinateIndexes.get(graph);
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const from = nodes.get(`${points[i - 1][0]},${points[i - 1][1]}`);
    const edges = from?.outgoing.filter(edge => edge.to.x === points[i][0] && edge.to.z === points[i][1]);
    assert(edges?.length, 'Every returned hop follows a retained directed edge');
    total += Math.min(...edges.map(edge => edge.length));
  }
  return total;
}
function compare(graph, start, destination) {
  const expected = dijkstra(graph, start, destination), actual = findRoute(graph, start, destination);
  assert.equal(actual.length > 0, expected.length > 0, 'Reachability is unchanged');
  if (expected.length) {
    assert.deepEqual(actual[0], expected[0], 'Nearest start selection is unchanged');
    assert.deepEqual(actual.at(-1), expected.at(-1), 'Nearest goal selection is unchanged');
    assert(Math.abs(cost(graph, actual) - cost(graph, expected)) < 1e-7, 'A* retains the optimal directed path cost');
    if (JSON.stringify(actual) !== JSON.stringify(expected)) changedTies++;
  }
  comparisons++;
  return actual;
}
let serial = 0;
const road = (points, oneway = 1, options = {}) => ({ id: `navigation-${serial++}`, name: 'Search fixture', type: 'residential',
  width: 8, points, oneway, ...options });
const directed = buildRoadGraph([road([[0, 0], [10, 0], [20, 0]])]);
assert.equal(compare(directed, { x: 0, z: 0 }, { x: 10, z: 0 }).length, 2);
assert.deepEqual(compare(directed, { x: 10, z: 0 }, { x: 0, z: 0 }), [], 'One-way reverse remains unreachable');
assert.deepEqual(compare(directed, { x: 2, z: 0 }, { x: 3, z: 0 }), [[0, 0]], 'Same nearest node stays a one-point route');
const disconnected = buildRoadGraph([road([[0, 0], [10, 0]], 0), road([[100, 0], [110, 0]], 0)]);
assert.deepEqual(compare(disconnected, { x: 0, z: 0 }, { x: 100, z: 0 }), []);
assert.deepEqual(compare(buildRoadGraph([road([[0, 0], [10, 0]], 0, { type: 'service' })]),
  { x: 0, z: 0 }, { x: 10, z: 0 }), [], 'No eligible GPS node retains empty result');
// Equal-cost diamond and multiple improvements exercise priority ordering and stale entries.
const diamond = buildRoadGraph([road([[0, 0], [10, -10], [20, 0]]), road([[0, 0], [10, 10], [20, 0]]),
  road([[0, 0], [-20, 20], [20, 0]]), road([[20, 0], [30, 0]])]);
compare(diamond, { x: 0, z: 0 }, { x: 20, z: 0 });
const roads = [];
for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
  if (x < 7) roads.push(road([[x * 10, z * 10], [(x + 1) * 10, z * 10]], (x + z) % 3 === 0 ? 1 : 0));
  if (z < 7) roads.push(road([[x * 10, z * 10], [x * 10, (z + 1) * 10]], (x + z) % 4 === 0 ? -1 : 0));
}
const lattice = buildRoadGraph(roads);
for (let i = 0; i < 100; i++) compare(lattice,
  { x: i * 17 % 73, z: i * 29 % 73 }, { x: i * 31 % 73, z: i * 43 % 73 });

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
const controller = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const replacement = controller.match(/map\.collisionReplacedBuildingIds=\[([^\]]+)\]/);
assert(replacement, 'Use the current controller replacement identities');
map.collisionReplacedBuildingIds = [...replacement[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
const graph = createSimulation(map, { trafficCount: 0 }).graph;
const places = ['telopea', 'canberra-centre', 'kingston', 'manuka'].map(id => {
  const place = map.landmarks.find(item => item.id === id); assert(place, id); return place;
});
const queries = [];
for (const start of places) for (const destination of places) queries.push([start, destination]);
for (const [start, destination] of queries) compare(graph, start, destination);
// Timings exclude the expensive assertion-side graph/path inspection.
function observe(search) {
  const started = performance.now();
  let points = 0;
  for (let i = 0; i < 5; i++) points += search(graph, places[0], places[1]).length;
  return { elapsedMs: performance.now() - started, calls: 5, points };
}
const baseline = observe(dijkstra), candidate = observe(findRoute);
console.log(`Capital navigation PASS: ${comparisons} pinned-Dijkstra cost/endpoint/reachability comparisons; ${changedTies} equal-cost route shapes changed.`);
console.log(JSON.stringify({ measurementOnly: true, baselineRevision, baseline, candidate,
  scope: 'Source graph search only; identical current expanded-map graph for both searches. Missing full boot colliders do not establish physical travel, native input or FPS.' }));
