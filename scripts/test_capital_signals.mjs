import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createTrafficLights } from '../Games/Capital Drive/traffic-lights.js';
import { buildRoadGraph, createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';

const json = async file => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${file}`, import.meta.url), 'utf8'));
const source = await json('traffic-signals.json');
const base = await json('canberra.json'), north = await json('canberra-north.json');
const map = applyMapExpansion(base, north), graph = buildRoadGraph(map.roads);
assert.equal(source.version, 1);
assert.equal(source.signals.length, 339, 'pinned actual road signal coverage, not every junction');
assert.equal(source.meta.files.length, 34);
assert.equal(source.meta.license, 'ODbL-1.0');
for (const [file, expected] of Object.entries(source.meta.mapHashes)) {
  const bytes = await readFile(new URL(`../Games/Capital Drive/data/${file}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
}
for (const file of source.meta.files) {
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.match(file.url, /^https:\/\/api\.openstreetmap\.org\/api\/0\.6\/map\.json\?bbox=/);
  assert(!file.file.includes('/'));
}
const mx = 111320 * Math.cos(-35.318 * Math.PI / 180);
for (const signal of source.signals) {
  assert.equal(signal.sourceId, `node/${signal.id}`);
  assert.equal(signal.tags.highway, 'traffic_signals');
  assert.equal(signal.x, Math.round((signal.lon - 149.137) * mx * 100) / 100);
  assert.equal(signal.z, Math.round((-35.318 - signal.lat) * 111320 * 100) / 100);
  const node = graph.nodes.get(signal.id);
  assert(node, `source node ${signal.id} exists in retained map`);
  assert(Math.hypot(signal.x - node.x, signal.z - node.z) < .08);
  for (const file of signal.sourceFiles) assert(source.meta.files.some(record => record.file === file));
}
const lights = createTrafficLights(map, graph, source);
assert(lights.heads.length >= 300 && lights.heads.length < 1000);
assert.equal(lights.heads.length, lights.approaches.length);
assert.equal(new Set(lights.heads.map(head => head.id)).size, lights.heads.length);
for (const head of lights.heads) {
  assert(source.signals.some(signal => signal.sourceId === head.sourceId));
  assert(Number.isFinite(head.x + head.z + head.yaw));
}
for (let tick = 0; tick < 1000; tick++) {
  lights.step(.5);
  for (const group of lights.groups) {
    const permitted = group.approaches.filter(approach => approach.color !== 'red');
    assert(new Set(permitted.map(approach => approach.axis)).size <= 1, 'conflicting headings never simultaneously green/amber');
  }
}
lights.reset();
const snapshot = lights.heads.map(head => head.color);
lights.step(0); lights.step(-1); lights.step(NaN);
assert.deepEqual(lights.heads.map(head => head.color), snapshot);
assert.equal(lights.elapsed, 0);
lights.step(24);
assert(lights.heads.some(head => head.color === 'amber'));
lights.step(3);
assert(lights.heads.every(head => head.color === 'red'), 'explicit clearance interval');
lights.reset(); assert.deepEqual(lights.heads.map(head => head.color), snapshot);

const road = (id, points, nodes) => ({ id, name: id, type: 'residential', width: 8, speed: 50, oneway: 1, points, nodes });
const fixture = { bounds: { minX: -250, maxX: 250, minZ: -250, maxZ: 250 }, buildings: [],
  spawn: { x: -190, z: -190, yaw: 0 }, roads: [
    road('east', [[-100, 0], [0, 0], [100, 0]], [1, 2, 3]),
    road('south', [[0, -100], [0, -6], [0, 0], [0, 100]], [4, 5, 2, 6])
  ], trafficSignals: { version: 1, signals: [{ id: '2', sourceId: 'node/2', x: 0, z: 0, tags: { highway: 'traffic_signals' } }] } };
const sim = createSimulation(fixture, { trafficCount: 1, seed: 17 });
const car = sim.traffic[0], south = sim.graph.edges.find(edge => edge.road.id === 'south');
Object.assign(car, { edge: south, position: 54, speed: 20, active: true }, pointOnLane(south, 54));
const approach = sim.trafficLights.approaches.find(item => item.edgeId === south.id + 1);
assert(approach, 'signal lives on the next short edge');
assert.equal(sim.trafficLights.stateForApproach(approach.id), 'red');
assert(Math.abs(sim.trafficLights.stopDistance(car) - 41.4) < .001, 'upstream query accounts for short edge and front bumper');
assert(Math.abs(sim.trafficLights.stopDistance({ ...pointOnLane(south, 54) }) - 41.4) < .001, 'pose-only bus/ride queries use the indexed same lane');
assert.equal(sim.trafficLights.stopDistance({ x: 200, z: 200, yaw: 0 }), Infinity, 'unrelated poses do not inherit a city signal');
assert.equal(sim.trafficLights.stopDistance({ ...pointOnLane(south, 54), yaw: 0 }), Infinity, 'opposite driving direction does not brake for this signal');
for (let i = 0; i < 400; i++) {
  sim.step(.05);
  assert(car.z + 2.25 <= -2.34, 'front bumper remains before stop bar during red');
}
assert(car.speed < .01, 'car settles to a stop');
const stopped = { x: car.x, z: car.z, elapsed: sim.trafficLights.elapsed };
for (let i = 0; i < 30; i++) sim.step(0);
assert.deepEqual({ x: car.x, z: car.z, elapsed: sim.trafficLights.elapsed }, stopped, 'pause freezes both car and signal');
for (let i = 0; i < 600; i++) sim.step(.05);
assert(car.z > 12, 'red queue resumes on the next green');
sim.reset(); assert.equal(sim.trafficLights.elapsed, 0);

const direct = createTrafficLights(fixture, buildRoadGraph(fixture.roads), fixture.trafficSignals);
const eastEdge = buildRoadGraph(fixture.roads).edges[0];
direct.step(24);
assert(Number.isFinite(direct.stopDistance({ edge: eastEdge, position: 60, speed: 28 })), 'amber brakes even a fast approach');
assert.equal(direct.stopDistance({ edge: eastEdge, position: 99, speed: 2 }), Infinity, 'committed front clears junction');
assert.equal(direct.stopDistance({ edge: { id: -1 }, position: 0 }), Infinity);
console.log(`Capital signals PASS: ${source.signals.length} source nodes, ${lights.heads.length} heads, ${lights.groups.length} estimated junction groups; source hashes, conflict-free cycles, pause, upstream braking and restart`);
