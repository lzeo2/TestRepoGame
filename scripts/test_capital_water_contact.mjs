import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { prepareWaterRing } from '../Games/Capital Drive/water-contact.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const sourceURL = new URL('../Games/Capital Drive/simulation.js', import.meta.url);
const baselineRevision = '73c8335c';
let source = execFileSync('git', ['show', `${baselineRevision}:Games/Capital Drive/simulation.js`], { cwd: new URL('../', import.meta.url), encoding: 'utf8', maxBuffer: 1024 * 1024 });
source = source.replace(/from ['"]([^'"]+)['"]/g, (_, path) => `from ${JSON.stringify(new URL(path, sourceURL).href)}`);
const baseline = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport {polygonContact, insideRing};`).toString('base64')}`);
let comparisons = 0;
function checkRing(points, probes) {
  const ring = prepareWaterRing(points);
  for (const [x, z, radius] of probes) {
    assert.equal(ring.contains(x, z), baseline.insideRing(x, z, points));
    assert.deepEqual(ring.contact(x, z, radius), baseline.polygonContact(x, z, points, radius));
    comparisons++;
  }
}
const probes = Array.from({ length: 400 }, (_, i) => [Math.sin(i * 3.71) * 31, Math.cos(i * .89) * 31, .1 + i % 17 / 3]);
for (const points of [[], [[0, 0]], [[0, 0], [0, 0]], [[0, 0], [3, 0], [3, 3], [0, 3]]]) {
  checkRing(points, [...probes, [0, 0, .45], [1.5, 1.5, 1.5], [3, 3, 0], [3.45, 1, .45]]);
}
for (let n = 3; n < 50; n += 3) {
  const points = Array.from({ length: n }, (_, i) => { const angle = i * Math.PI * 2 / n, radius = i % 3 === 0 ? 9 : 20; return [Math.cos(angle) * radius, Math.sin(angle) * radius]; });
  if (n % 2) points.reverse();
  points.splice(2, 0, points[1]);
  checkRing(points, [...probes, ...points.map(([x, z]) => [x, z, .45])]);
}

const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
map.terrainTiles = [(await json('north-terrain')).terrain]; map.lakeWaterLevel = 5.93;
const terrain = createTerrainSampler(map);
const waters = map.areas.filter(area => area.type === 'water' && area.points?.length);
let referenceEdges = 0, contactEdges = 0, parityEdges = 0;
const referenceStarted = performance.now();
const expected = [];
for (const water of waters) for (const points of [water.points, ...(water.innerRings || []).map(r => r.points || r)]) {
  const local = [];
  for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 250))) {
    const a = points[i], b = points[(i + 1) % points.length], x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    for (const offset of [0, -.46, .46, -2, 2, -25, 25]) local.push([x + offset, z - offset, .45 + i % 3]);
  }
  expected.push({ points, local, contacts: local.map(([x, z, radius]) => baseline.polygonContact(x, z, points, radius)), inside: local.map(([x, z]) => baseline.insideRing(x, z, points)) });
  referenceEdges += points.length * local.length;
}
const referenceContactMs = performance.now() - referenceStarted;
const preparedStarted = performance.now();
for (const { points, local, contacts, inside } of expected) {
  const metrics = {}, ring = prepareWaterRing(points, metrics);
  for (let i = 0; i < local.length; i++) {
    const [x, z, radius] = local[i];
    assert.deepEqual(ring.contact(x, z, radius), contacts[i], 'actual shoreline/island contact stays exactly equal');
    assert.equal(ring.contains(x, z), inside[i]); comparisons++;
  }
  contactEdges += metrics.contactEdges || 0; parityEdges += metrics.parityEdges || 0;
}
const preparedContactMs = performance.now() - preparedStarted;
assert(contactEdges < referenceEdges / 4, 'prepared shoreline must substantially reduce exact nearest-edge evaluations');

// Differential checks exercise the real mask, holes and fresh bridge callback,
// not merely the prepared ring helper in isolation.
let bridgeOverride = null;
const options = { trafficCount: 40, seed: 20261112, isOnBridge: (x, z, radius) => bridgeOverride ?? terrain.isOnBridge(x, z, radius) };
const beforeStart = performance.now(), before = baseline.createSimulation(map, options), baselineInitMs = performance.now() - beforeStart;
const afterStart = performance.now(), after = createSimulation(map, options), preparedInitMs = performance.now() - afterStart;
const traffic = sim => sim.traffic.map(car => Object.fromEntries(['id', 'active', 'x', 'z', 'yaw', 'speed', 'position', 'overtake', 'anger', 'honks'].map(key => [key, car[key]])));
assert.deepEqual(traffic(after), traffic(before));
const authorityProbes = [];
for (const water of waters) for (const ring of [water.points, ...(water.innerRings || []).map(r => r.points || r)]) {
  for (let i = 0; i < ring.length; i += Math.max(1, Math.ceil(ring.length / 45))) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    authorityProbes.push({ x: (a[0] + b[0]) / 2 + .5, z: (a[1] + b[1]) / 2 - .5 });
  }
}
for (const segment of terrain.bridgeSegments.filter((_, i) => i % 7 === 0)) authorityProbes.push({ x: (segment.a[0] + segment.b[0]) / 2, z: (segment.a[1] + segment.b[1]) / 2 });
let authorityChecks = 0;
for (const [i, point] of authorityProbes.entries()) {
  const pose = { ...point, id: 'shore-probe', yaw: i * .71, modelId: ['lantern', 'atlas', 'finch'][i % 3] };
  for (const override of [null, true, false]) {
    bridgeOverride = override;
    assert.equal(after.canOccupy(pose), before.canOccupy(pose));
    const a = { ...pose }, b = { ...pose };
    assert.deepEqual(after.moveActor(a, .7, -.6), before.moveActor(b, .7, -.6));
    assert.deepEqual(a, b);
    assert.equal(after.hasLineOfSight(pose, { x: pose.x + 3, z: pose.z + 2 }), before.hasLineOfSight(pose, { x: pose.x + 3, z: pose.z + 2 }));
    authorityChecks += 3;
  }
}
bridgeOverride = null;
const commonwealthIds = new Set(map.roads.filter(road => road.name === 'Commonwealth Avenue').map(road => road.id));
const commonwealthSegments = terrain.bridgeSegments.filter(segment => commonwealthIds.has(segment.roadId));
assert(commonwealthSegments.length > 0, 'actual Commonwealth bridge is present');
const bridge = commonwealthSegments[Math.floor(commonwealthSegments.length / 2)];
const routePoint = { x: (bridge.a[0] + bridge.b[0]) / 2, z: (bridge.a[1] + bridge.b[1]) / 2, yaw: Math.atan2(-(bridge.b[0] - bridge.a[0]), -(bridge.b[1] - bridge.a[1])) };
assert.deepEqual(after.teleport(routePoint), before.teleport(routePoint));
let baselineReplayMs = 0, preparedReplayMs = 0;
for (let frame = 0; frame < 360; frame++) {
  if (frame === 180) assert.deepEqual(after.teleport(routePoint), before.teleport(routePoint), 'repeat the same bridge approach with warm shoreline queries');
  const input = { throttle: .3, steer: Math.sin(frame / 90) * .1 };
  let start = performance.now(); before.step(1 / 60, input); baselineReplayMs += performance.now() - start;
  start = performance.now(); after.step(1 / 60, input); preparedReplayMs += performance.now() - start;
  assert.deepEqual(after.player, before.player, 'same bridge input retains actual player trajectory');
  assert.deepEqual(traffic(after), traffic(before), 'same bridge input retains all 40 traffic trajectories');
}
console.log(`PASS water contact: ${comparisons} exact contact/parity probes, ${authorityChecks} actual coastline/island/bridge authority checks, 360-frame 40-car exact repeated Commonwealth bridge replay.`);
console.log(JSON.stringify({ measurementOnly: true, baselineRevision, referenceEdges, contactEdges, parityEdges, referenceContactMs, preparedContactMs, baselineInitMs, preparedInitMs, baselineReplayMs, preparedReplayMs }));
