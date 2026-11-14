import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../Games/Capital Drive/', import.meta.url);
const source = await readFile(new URL('navigation-guidance.js', base), 'utf8');
const { createRouteGuidance } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const near = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} / ${expected}`);
const guidance = createRouteGuidance();
assert.equal(guidance.snapshot(), null);
assert.equal(guidance.update({ x: 0, z: 0 }), null);
const stairs = [[0, 0], [0, -60], [45, -60], [45, -100], [80, -100]];
guidance.setRoute(stairs);
let state = guidance.update({ x: 0, z: -10 });
assert.equal(state.kind, 'right');
near(state.distance, 50, 'distance follows current road to the turn');
assert.deepEqual(state.point, { x: 0, z: -60 });
near(state.incomingYaw, 0, 'north approach');
near(state.outgoingYaw, -Math.PI / 2, 'east departure');
near(state.remaining, 170, 'remaining road length');
const paused = guidance.snapshot();
for (let i = 0; i < 240; i++) assert.deepEqual(guidance.update({ x: 0, z: -10 }), paused, 'unchanged pose cannot advance progress');
state.point.x = 900; state.destination.z = 800;
assert.deepEqual(guidance.snapshot(), paused, 'snapshots cannot mutate the owner');
guidance.setRoute(stairs.map(p => [...p]));
assert.deepEqual(guidance.snapshot(), paused, 'identical route assignment preserves progress');
state = guidance.update({ x: 12, z: -60 });
assert.equal(state.kind, 'left');
near(state.distance, 33, 'passed turn exposes following turn');
assert.deepEqual(state.point, { x: 45, z: -60 });
state = guidance.update({ x: 0, z: -40 });
assert.equal(state.kind, 'right');
near(state.distance, 20, 'reversing along route increases distance to previous turn');
const beforeOffRoute = guidance.snapshot();
state = guidance.update({ x: 500, z: 500 });
assert.equal(state.offRoute, true);
near(state.progress, beforeOffRoute.progress, 'off-route motion does not consume route');
near(state.distance, beforeOffRoute.distance, 'off-route distance stays anchored to route');
state = guidance.update({ x: 0, z: -41 });
assert.equal(state.offRoute, false);
near(state.distance, 19, 'returning to road resumes guidance');

// After two short blocks, each real corner must remain its own instruction.
guidance.setRoute([[0, 0], [0, -10], [10, -10], [10, 0], [20, 0]]);
assert.equal(guidance.update({ x: 0, z: 0 }).kind, 'right');
state = guidance.update({ x: 5, z: -10 });
assert.equal(state.kind, 'right');
assert.deepEqual(state.point, { x: 10, z: -10 });
near(state.distance, 5, 'short blocks retain distinct turns');
guidance.setRoute([[0, 0], [0, -20], [0, 0]]);
assert.equal(guidance.update({ x: 0, z: -5 }).kind, 'uturn');

// A dense compact 90-degree corner accumulates a useful instruction, but a
// broad 90-degree bend is ordinary road following, irrespective of point count.
const arc = (radius, steps = 90) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = i * Math.PI / (steps * 2);
  return [radius - radius * Math.cos(a), -radius * Math.sin(a)];
});
guidance.setRoute([[0, 30], ...arc(12, 360), [42, -12]]);
state = guidance.update({ x: 0, z: 10 });
assert.equal(state.kind, 'right', 'small OSM turns accumulate across short segments');
assert(state.distance > 10 && state.distance < 35);
guidance.setRoute([[0, 30], ...arc(140), [170, -140]]);
assert.equal(guidance.update({ x: 0, z: 20 }).kind, 'straight', 'gentle dense curve must not invent a junction');

guidance.setRoute([[0, 0], [0, -50], [50, -50], [50, 0], [0, 0], [0, 50]]);
state = guidance.update({ x: 0, z: 0 });
near(state.progress, 0, 'self crossing prefers the current route branch');
assert.equal(state.kind, 'right');
near(state.distance, 50, 'loop does not jump to its later crossing');

guidance.setRoute([[0, 0], [0, 0], [NaN, 4], null, [0, -100], [0, -100]], { x: 0, z: -150 });
state = guidance.update({ x: 0, z: -70 });
assert.equal(state.kind, 'straight');
near(state.remaining, 80, 'final approach is included after road route ends');
state = guidance.update({ x: 0, z: -100 });
assert.equal(state.kind, 'straight', 'road endpoint is not an arrival at a distant destination');
near(state.distance, 50, 'distance to actual destination at road endpoint');
state = guidance.update({ x: 0, z: -140 });
assert.equal(state.kind, 'arrive');
assert.equal(state.offRoute, false, 'final approach is part of route distance');
near(state.distance, 10, 'arrival retains actual destination distance');
assert.deepEqual(state.point, { x: 0, z: -150 });
const validState = guidance.snapshot();
assert.deepEqual(guidance.update({ x: Infinity, z: 0 }), validState, 'invalid poses cannot poison guidance');
guidance.reset();
assert.equal(guidance.snapshot(), null);
guidance.setRoute([[5, 6]]);
assert.equal(guidance.update({ x: 5, z: 6 }).kind, 'arrive', 'single route node remains safe');
guidance.setRoute([]);
assert.equal(guidance.update({ x: 5, z: 6 }), null);

// Real offline source road vertices pass through the same directed graph and
// route finder used by the controller; this also guards mixed segment lengths.
const { buildRoadGraph } = await import(new URL('simulation.js', base));
const { findRoute } = await import(new URL('navigation.js', base));
const map = JSON.parse(await readFile(new URL('data/canberra.json', base)));
const graph = buildRoadGraph(map.roads);
const road = map.roads.find(r => r.name && r.points.length >= 8 && r.type !== 'service');
assert(road, 'real map has a named geometry-rich road');
const route = findRoute(graph, { x: road.points[0][0], z: road.points[0][1] }, { x: road.points.at(-1)[0], z: road.points.at(-1)[1] });
assert(route.length >= 2, 'real named road is routable');
guidance.setRoute(route);
let travelled = 0;
for (let i = 0; i < route.length - 1; i++) {
  const a = route[i], b = route[i + 1];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(length / 5));
  for (let j = 0; j < steps; j++) {
    const t = j / steps;
    state = guidance.update({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t });
    assert.equal(state.offRoute, false);
    assert(Number.isFinite(state.distance) && Number.isFinite(state.remaining));
    assert(state.progress >= travelled - .1, 'actual road traversal cannot jump backward');
    travelled = state.progress;
  }
}
state = guidance.update({ x: route.at(-1)[0], z: route.at(-1)[1] });
assert.equal(state.kind, 'arrive');
near(state.remaining, 0, 'actual route finishes at its final node');
console.log(`PASS route guidance: turns, dense curves, metric route distance, pause/reverse/off-route, arrival, detached state and actual OSM ${route.length}-point route`);
