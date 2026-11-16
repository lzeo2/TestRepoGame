// Bounded source-domain observations; run separately from browser CPU measurements.
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';

const args = process.argv.slice(2);
assert(args.length === 2 && args[0] === '--output' && args[1],
  'Usage: node [--expose-gc] scripts/profile_capital_simulation.mjs --output <fresh-external-file.json>');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(args[1]);
const relativeOutput = path.relative(root, output);
assert(relativeOutput.startsWith(`..${path.sep}`) || path.isAbsolute(relativeOutput), 'Output must be outside the repository');
try { await stat(output); throw new Error('Output already exists; choose a fresh JSON file'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
assert((await stat(path.dirname(output))).isDirectory(), 'Output parent must already exist');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = {};
async function hashModule(relative) {
  if (hashes[relative]) return;
  const bytes = await readFile(path.join(root, relative));
  hashes[relative] = { sha256: sha256(bytes), bytes: bytes.length };
  if (!relative.endsWith('.js') && !relative.endsWith('.mjs')) return;
  for (const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    await hashModule(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
  }
}
for (const relative of ['scripts/profile_capital_simulation.mjs', 'Games/Capital Drive/simulation.js',
  'Games/Capital Drive/map-expansion.js', 'Games/Capital Drive/road-network.js',
  'Games/Capital Drive/terrain.js', 'Games/Capital Drive/navigation.js']) await hashModule(relative);
// Controller bytes identify the replacement-ID source; do not import the browser boot.
const controllerPath = 'Games/Capital Drive/script.js';
const controller = await readFile(path.join(root, controllerPath));
hashes[controllerPath] = { sha256: sha256(controller), bytes: controller.length };
async function json(name) {
  const relative = `Games/Capital Drive/data/${name}.json`;
  const bytes = await readFile(path.join(root, relative));
  hashes[relative] = { sha256: sha256(bytes), bytes: bytes.length };
  return JSON.parse(bytes);
}
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
map.terrainTiles = [(await json('north-terrain')).terrain];
map.lakeWaterLevel = 5.93;
const replacements = controller.toString().match(/map\.collisionReplacedBuildingIds=\[([^\]]+)\]/);
assert(replacements, 'Controller replacement identities must be explicit');
map.collisionReplacedBuildingIds = [...replacements[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
assert(map.collisionReplacedBuildingIds.length, 'Missing replacement IDs');
const terrain = createTerrainSampler(map);
const started = performance.now();
const simulation = createSimulation(map, { trafficCount: 0, seed: 20261116, isOnBridge: terrain.isOnBridge });
const initializationMs = performance.now() - started;
const anchor = id => {
  const point = map.landmarks.find(item => item.id === id);
  assert(point && Number.isFinite(point.x) && Number.isFinite(point.z), `Missing landmark ${id}`);
  const candidates = [];
  for (const edge of simulation.graph.edges) {
    if (!edge.road.name || edge.road.type === 'service' || !roadProfile(edge.road).trafficAllowed) continue;
    const at = Math.max(0, Math.min(edge.length, (point.x - edge.from.x) * edge.dx + (point.z - edge.from.z) * edge.dz));
    const pose = pointOnLane(edge, at), offset = Math.hypot(pose.x - point.x, pose.z - point.z);
    if (offset < 200) candidates.push({ pose, offset, edgeId: edge.id });
  }
  candidates.sort((a, b) => a.offset - b.offset || a.edgeId - b.edgeId);
  const clear = candidates.find(({ pose }) => simulation.canOccupy({ ...pose, id: 'sight-origin', length: 1, width: .8 }, { length: 1, width: .8 }));
  assert(clear, `Missing clear public-road origin within 200m of ${id}`);
  assert(simulation.hasLineOfSight(clear.pose, clear.pose), 'Sight origin must be outside retained building solids');
  return { id, x: clear.pose.x, z: clear.pose.z,
    requestedLandmark: { id, x: point.x, z: point.z }, offsetMetres: clear.offset, roadEdgeId: clear.edgeId };
};
const anchors = [anchor('telopea'), anchor('canberra-centre')];
const measurements = [];
function measure(kind, metadata, run) {
  if (global.gc) global.gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  const result = run();
  const elapsedMs = performance.now() - start;
  const heapAfterWork = process.memoryUsage().heapUsed;
  if (global.gc) global.gc();
  measurements.push({ kind, ...metadata, elapsedMs, result, heapBytes: {
    before: heapBefore, afterWork: heapAfterWork,
    afterForcedGC: global.gc ? process.memoryUsage().heapUsed : null,
    forcedGCAvailable: !!global.gc,
    note: 'Process heap observations include runtime effects; not allocation totals or a leak verdict.'
  } });
}
for (const origin of anchors) for (const metres of [20, 80, 140]) {
  const queries = Array.from({ length: 512 }, (_, i) => {
    const angle = (i % 64) * Math.PI * 2 / 64;
    return [origin, { x: origin.x + Math.cos(angle) * metres, z: origin.z + Math.sin(angle) * metres }];
  });
  measure('exterior-sight', { origin, metres, calls: queries.length, distinctDirections: 64,
    queryHash: sha256(JSON.stringify(queries)) }, () => {
    let visible = 0;
    for (const [a, b] of queries) visible += Number(simulation.hasLineOfSight(a, b));
    return { visible, blocked: queries.length - visible };
  });
}
for (const count of [36, 64]) {
  const origin = anchors[count === 64 ? 1 : 0];
  const contacts = Array.from({ length: count }, (_, i) => ({ id: `profile-person-${i}`,
    x: origin.x + (i % 8 - 3.5) * 8, z: origin.z + (Math.floor(i / 8) - 3.5) * 8, radius: .32, active: true }));
  measure('adult-index-refresh', { origin, contacts: count, calls: 1200,
    suppliedWorkloadSeconds: 10, callsPerSuppliedSecond: 120,
    contactHash: sha256(JSON.stringify(contacts)), note: 'Static pooled contacts isolate index rebuilds; no world clock is advanced.' }, () => {
    let accepted = 0;
    for (let i = 0; i < 1200; i++) accepted += simulation.setExternalPeople(contacts);
    assert.equal(accepted, count * 1200);
    return { accepted, finalIndex: { ...simulation.peopleContacts } };
  });
}
const start = anchors[0];
const destinations = [
  { id: 'short-offset', x: start.x + 250, z: start.z },
  { ...anchors[1], id: 'long-civic' }
];
for (const destination of destinations) {
  measure('gps-route', { start, destination, calls: 5, note: 'Repeated fixed-pose calls; no simulated travel or elapsed route clock.' }, () => {
    const routes = [];
    for (let i = 0; i < 5; i++) {
      const points = findRoute(simulation.graph, start, destination);
      routes.push({ points: points.length, hash: sha256(JSON.stringify(points)),
        metres: points.slice(1).reduce((sum, p, j) => sum + Math.hypot(p[0] - points[j][0], p[1] - points[j][1]), 0) });
    }
    assert(routes.every(route => route.points > 1 && route.hash === routes[0].hash), 'Fixed route must remain nonempty and deterministic');
    return routes;
  });
}
const report = {
  schemaVersion: 1, measurementOnly: true,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  scope: 'Source-domain Node fixture. No browser, renderer, native input, FPS, GPU or hardware acceptance claim. Timings are observations without speed thresholds.',
  fixture: { composition: 'canberra + road-profiles + canberra-north + north-terrain; shared terrain bridge callback',
    collisionReplacedBuildingIds: map.collisionReplacedBuildingIds,
    limitations: 'Matches controller replacement identities but omits full-boot generated replacement geometry and pool/campus/skate/highway/local/Civic/noodle/backyard barrier colliders, traffic-signals sidecar and live traffic/people owners. Sight checks use source building footprints only; synthetic contacts are not pedestrian AI.',
    roads: map.roads.length, buildings: map.buildings.length, graphNodes: simulation.graph.nodes.size,
    graphEdges: simulation.graph.edges.length, traffic: simulation.traffic.length, initializationMs },
  hashes, measurements
};
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(`Recorded ${measurements.length} bounded source-domain batches; no speed assertions.`);
