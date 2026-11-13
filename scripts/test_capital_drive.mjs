import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import authored browser ES module without changing the portal's Node module mode.
const source = await readFile(new URL('../Games/Capital Drive/simulation.js', import.meta.url), 'utf8');
const { buildRoadGraph, pointOnLane, createSimulation } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const navigationSource = await readFile(new URL('../Games/Capital Drive/navigation.js', import.meta.url), 'utf8');
const { findRoute } = await import(`data:text/javascript;base64,${Buffer.from(navigationSource).toString('base64')}`);
const road = (id, points, nodes, oneway = 0) => ({ id, name: id, type: 'residential', width: 10, speed: 50, oneway, points, nodes });
const roads = [
  road('north', [[0, 200], [0, 0], [0, -200]], [1, 2, 3]),
  road('east', [[-200, 0], [0, 0], [200, 0]], [4, 2, 5]),
  road('oneway', [[200, 0], [200, 200]], [5, 6], 1),
  road('reverse-way', [[200, 200], [0, 200]], [6, 1], -1)
];
const map = {
  bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, roads,
  buildings: [{ id: 'wall', points: [[40, -80], [75, -80], [75, -40], [40, -40]], height: 15 }],
  landmarks: [], spawn: { x: -2.3, z: 160, yaw: 0 }
};
const graph = buildRoadGraph(roads);
assert.equal(graph.nodes.get('2').outgoing.length, 4, 'shared OSM intersection joins four directions');
assert.equal(graph.edges.filter(edge => edge.road.id === 'oneway').length, 1);
assert.equal(graph.edges.find(edge => edge.road.id === 'oneway').from.id, '5');
assert.equal(graph.edges.find(edge => edge.road.id === 'reverse-way').from.id, '1');
const northEdge = graph.edges.find(edge => edge.from.id === '1' && edge.to.id === '2');
assert(pointOnLane(northEdge, 30).x < 0, 'northbound left lane is west');
const eastEdge = graph.edges.find(edge => edge.from.id === '2' && edge.to.id === '5');
assert(pointOnLane(eastEdge, 30).z < 0, 'eastbound left lane is north');
assert.equal(createSimulation(map, { trafficCount: 0 }).nearestRoad(3, 100).road.id, 'north');
const directed = buildRoadGraph([
  road('route-east', [[0, 0], [100, 0]], [101, 102], 1),
  road('route-south', [[100, 0], [100, 100]], [102, 103], 1),
  road('route-west', [[100, 100], [0, 100]], [103, 104], 1),
  road('route-north', [[0, 100], [0, 0]], [104, 101], 1)
]);
assert.deepEqual(findRoute(directed, { x: 100, z: 0 }, { x: 0, z: 0 }),
  [[100, 0], [100, 100], [0, 100], [0, 0]], 'navigation follows legal one-way loop instead of the reverse shortcut');
const disconnected = buildRoadGraph([road('west-island', [[0, 0], [10, 0]], [201, 202]),
  road('east-island', [[100, 0], [110, 0]], [203, 204])]);
assert.deepEqual(findRoute(disconnected, { x: 0, z: 0 }, { x: 110, z: 0 }), [], 'unreachable destination has no fabricated route');
console.log('PASS connected directed road graph, one-way directions, left lanes and legal navigation');

function advance(sim, seconds, input) {
  for (let i = 0; i < seconds * 60; i++) sim.step(1 / 60, input);
}
const driving = createSimulation(map, { trafficCount: 0 });
advance(driving, 3, { throttle: 1 });
assert(driving.player.speed > 20, 'arcade acceleration reaches city-driving speed');
assert(driving.player.z < 130, 'yaw zero drives north');
const beforeBrake = driving.player.speed;
advance(driving, 0.7, { brake: true });
assert(driving.player.speed < beforeBrake * 0.5, 'brake removes forward speed');
driving.reset();
advance(driving, 2, { throttle: -1 });
assert(driving.player.speed < -5 && driving.player.z > 160, 'reverse travels backwards');
driving.reset();
advance(driving, 1, { throttle: 1, steer: 1 });
assert(driving.player.yaw < 0 && driving.player.x > map.spawn.x, 'right input steers east');
console.log('PASS fast acceleration, forward travel, braking, reverse and steering');

function sidewaysVelocity(player) {
  return Math.abs(player.vx * Math.cos(player.yaw) - player.vz * Math.sin(player.yaw));
}
const grip = createSimulation(map, { trafficCount: 0 });
const drift = createSimulation(map, { trafficCount: 0 });
for (const sim of [grip, drift]) advance(sim, 2, { throttle: 1 });
advance(grip, 0.65, { throttle: 1, steer: 1 });
advance(drift, 0.65, { throttle: 1, steer: 1, handbrake: true });
assert(sidewaysVelocity(drift.player) > sidewaysVelocity(grip.player) * 1.4, 'handbrake retains sideways momentum');
console.log('PASS handbrake increases controllable lateral slide');

const collision = createSimulation(map, { trafficCount: 0 });
collision.reset({ x: 35, z: -60, yaw: -Math.PI / 2 });
advance(collision, 1.1, { throttle: 1 });
assert(collision.player.x <= 38.5, 'building collision keeps car outside polygon');
assert(collision.player.crashes > 0, 'meaningful impact records a crash');
collision.reset({ x: 50, z: -60, yaw: 0 });
collision.step(1 / 60, {});
assert(collision.player.x < 40 || collision.player.x > 75 || collision.player.z < -80 || collision.player.z > -40,
  'reset inside a building resolves outside rather than sticking');
collision.player.x = map.bounds.maxX + 20;
collision.step(1 / 60, {});
assert.equal(collision.player.x, map.spawn.x, 'world edge recovers to spawn');
collision.player.vx = NaN;
collision.step(1 / 60, {});
assert(Number.isFinite(collision.player.vx), 'invalid physics state recovers');
collision.reset();
assert.equal(collision.player.odometer, 0);
assert.equal(collision.player.crashes, 0);
assert.equal(collision.player.speed, 0);
collision.reset({ x: 40, z: -60, yaw: 0 });
collision.step(1 / 60, {});
assert(collision.player.x < 40, 'exact polygon boundary resolves toward its exterior');
const closedMap = { ...map, buildings: [{ id: 'closed', points: [[40, -80], [75, -80], [75, -40], [40, -40], [40, -80]] }] };
const vertex = createSimulation(closedMap, { trafficCount: 0 });
vertex.reset({ x: 40, z: -80, yaw: 0 });
vertex.step(1 / 60, {});
assert(vertex.player.x < 40 || vertex.player.z < -80, 'closed polygon vertex resolves outside');
console.log('PASS forgiving building impacts, unsticking, world-edge recovery and reset');
const parked = createSimulation(map, { trafficCount: 0 });
assert.equal(parked.setParkedCars([{ x: -2.3, z: 140, yaw: 0 }, { x: NaN, z: 0 }]), 1,
  'parked index accepts finite coordinates only');
advance(parked, 2.5, { throttle: 1 });
assert(parked.player.z >= 143.5 && parked.player.crashes > 0, 'parked car stops a meaningful forward impact');
parked.reset({ x: -2.3, z: 140, yaw: 0 });
parked.step(1 / 60, {});
assert(Math.hypot(parked.player.x + 2.3, parked.player.z - 140) >= 3.55, 'exact parked-car overlap resolves without sticking');
parked.setParkedCars([{ x: 300, z: 300 }]);
parked.reset();
advance(parked, 2.5, { throttle: 1 });
assert(parked.player.z < 140, 'replacing parked cars removes previous static colliders');
parked.setParkedCars();
console.log('PASS indexed parked-car impact, overlap recovery and collider replacement');

const fleet = createSimulation(map, { seed: 17, trafficCount: 12 });
const repeat = createSimulation(map, { seed: 17, trafficCount: 12 });
assert.equal(fleet.traffic.length, 12);
assert.deepEqual(fleet.traffic.map(car => [car.x, car.z, car.modelId]), repeat.traffic.map(car => [car.x, car.z, car.modelId]));
const edgeVisits = new Map(fleet.traffic.map(car => [car.id, new Set([car.edge.id])]));
for (let i = 0; i < 120 * 60; i++) {
  fleet.step(1 / 60, {});
  for (const car of fleet.traffic) {
    assert([car.x, car.z, car.yaw, car.speed].every(Number.isFinite));
    assert(car.edge.from.outgoing.includes(car.edge));
    assert(car.position >= 0 && car.position <= car.edge.length + 0.001);
    edgeVisits.get(car.id).add(car.edge.id);
  }
}
assert([...edgeVisits.values()].some(visited => visited.size > 3), 'traffic navigates connected intersections');
assert(fleet.traffic.every(car => ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'].includes(car.modelId)));
const following = createSimulation(map, { seed: 17, trafficCount: 2 });
for (const [i, car] of following.traffic.entries()) {
  car.edge = following.graph.edges.find(edge => edge.from.id === '1' && edge.to.id === '2');
  car.position = 50 + i * 8;
  car.speed = 10;
  Object.assign(car, pointOnLane(car.edge, car.position));
}
following.step(1 / 60, {});
assert(following.traffic[0].speed < 10, 'following vehicle slows for a car eight metres ahead');
console.log('PASS deterministic everyday traffic, following slowdown and 120 seconds of finite connected routing');
const largeMap = { ...map, bounds: { minX: -2500, maxX: 2500, minZ: -2500, maxZ: 2500 },
  roads: [...roads, road('local-ring', [[400, -300], [400, 300]], [20, 21]),
    road('distant', [[1500, -300], [1500, 300]], [30, 31])] };
const localFleet = createSimulation(largeMap, { seed: 33, trafficCount: 26 });
assert.equal(localFleet.traffic.length, 26);
assert(localFleet.traffic.every(car => Math.hypot(car.x - localFleet.player.x, car.z - localFleet.player.z) < 350),
  'initial fleet stays near the player even when distant roads exist');
const recycled = localFleet.traffic[0];
recycled.edge = localFleet.graph.edges.find(edge => edge.road.id === 'distant');
recycled.position = 100;
Object.assign(recycled, pointOnLane(recycled.edge, recycled.position));
localFleet.step(1 / 60, {});
const recycledDistance = Math.hypot(recycled.x - localFleet.player.x, recycled.z - localFleet.player.z);
assert(recycledDistance > 325 && recycledDistance < 655, 'distant traffic recycles near player beyond the rendering cull');
console.log('PASS local fleet population and spatially indexed distant-car recycling');
console.log('Capital Drive simulation: all checks passed');

if (process.argv[2]) {
  const actual = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const start = performance.now();
  const city = createSimulation(actual);
  assert(city.graph.edges.length > 0, 'real map contains driveable graph edges');
  assert.equal(city.traffic.length, 26, 'real map supports the intended traffic population');
  assert(Number.isFinite(city.nearestRoad(city.player.x, city.player.z)?.distance), 'spawn has a nearest road');
  for (const edge of city.graph.edges) {
    assert(edge.road.oneway !== 1 || edge.direction === 1);
    assert(edge.road.oneway !== -1 || edge.direction === -1);
  }
  const initial = city.traffic.map(car => [car.x, car.z]);
  for (let i = 0; i < 60 * 60; i++) city.step(1 / 60, {});
  assert(city.traffic.every(car => [car.x, car.z, car.yaw, car.speed].every(Number.isFinite)));
  assert(city.traffic.some((car, i) => Math.hypot(car.x - initial[i][0], car.z - initial[i][1]) > 30), 'actual-map traffic makes progress');
  console.log(`PASS actual map: ${city.graph.nodes.size} nodes, ${city.graph.edges.length} directed edges, ${actual.buildings.length} indexed buildings, 26 cars; 60-second soak in ${Math.round(performance.now() - start)}ms`);
}
