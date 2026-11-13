import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import authored browser ES module without changing the portal's Node module mode.
const roadNetworkSource = await readFile(new URL('../Games/Capital Drive/road-network.js', import.meta.url), 'utf8');
const roadNetworkUrl = `data:text/javascript;base64,${Buffer.from(roadNetworkSource).toString('base64')}`;
let source = await readFile(new URL('../Games/Capital Drive/simulation.js', import.meta.url), 'utf8');
source = source.replace("'./road-network.js'", JSON.stringify(roadNetworkUrl));
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

const teleportMap = { ...map, areas: [
  { type: 'water', points: [[-160, -160], [-80, -160], [-80, -80], [-160, -80], [-160, -160]] },
  { type: 'park', points: [[-400, 200], [-200, 200], [-200, 350], [-400, 350]] }
], buildings: [...map.buildings, { id: 'edge-building', points: [[480, -20], [500, -20], [500, 20], [480, 20]] }] };
const travel = createSimulation(teleportMap, { trafficCount: 0 });
Object.assign(travel.player, { odometer: 123.45, crashes: 7, vx: 10, vz: -20, speed: 20, steer: 0.9, yaw: 0.7 });
const exactArrival = travel.teleport({ x: -300, z: 250 });
assert.deepEqual([exactArrival.ok, exactArrival.x, exactArrival.z, exactArrival.adjusted, exactArrival.reason],
  [true, -300, 250, false, 'exact'], 'ordinary off-road park point is preserved exactly');
assert.equal(travel.player.yaw, 0.7, 'omitted heading preserves current heading');
assert.equal(travel.player.offroad, true);
assert.deepEqual([travel.player.speed, travel.player.vx, travel.player.vz, travel.player.steer], [0, 0, 0, 0]);
assert.deepEqual([travel.player.odometer, travel.player.crashes], [123.45, 7], 'teleport preserves trip and crash statistics');
travel.step(0, { throttle: 1 });
assert.deepEqual([travel.player.x, travel.player.z], [-300, 250], 'paused step leaves arrival still');
travel.step(1 / 60, {});
assert.deepEqual([travel.player.x, travel.player.z, travel.player.odometer], [-300, 250, 123.45], 'arrival has no residual momentum');
const buildingArrival = travel.teleport({ x: 50, z: -60, yaw: 1.2 });
assert(buildingArrival.ok && buildingArrival.adjusted && buildingArrival.reason === 'building');
assert(buildingArrival.distance < 13 && buildingArrival.x < 38.2, 'building interior escapes through its nearest edge');
assert.equal(buildingArrival.yaw, 1.2, 'explicit finite heading is used');
const buildingEdge = travel.teleport({ x: 40, z: -60 });
assert(buildingEdge.ok && buildingEdge.adjusted && buildingEdge.x < 38.2, 'building edge includes car clearance');
const waterArrival = travel.teleport({ x: -120, z: -120 });
assert(waterArrival.ok && waterArrival.adjusted && waterArrival.reason === 'water');
assert(waterArrival.x <= -161.8 || waterArrival.x >= -78.2 || waterArrival.z <= -161.8 || waterArrival.z >= -78.2,
  'water interior moves onto land with clearance');
const clippedArrival = travel.teleport({ x: 900, z: -900 });
assert.deepEqual([clippedArrival.x, clippedArrival.z, clippedArrival.reason], [498, -498, 'bounds'], 'out-of-bounds request clamps two metres inside map');
const blockedBoundary = travel.teleport({ x: 490, z: 0 });
assert(blockedBoundary.ok && blockedBoundary.x <= 498 && blockedBoundary.z >= -498 && blockedBoundary.z <= 498);
assert(blockedBoundary.x <= 478.2 || Math.abs(blockedBoundary.z) >= 21.8, 'blocked map edge finds nearby clear land inside bounds');
travel.setParkedCars([{ x: -300, z: 250 }]);
const occupiedArrival = travel.teleport({ x: -300, z: 250 });
assert(occupiedArrival.ok && occupiedArrival.reason === 'parked-car' && occupiedArrival.distance >= 3.8,
  'teleport avoids parked-car occupancy as well as mapped polygons');
travel.setParkedCars();
const beforeInvalid = { ...travel.player };
for (const point of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: 0, z: 0, yaw: NaN }, null]) {
  const rejected = travel.teleport(point);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'invalid-coordinate');
  assert.deepEqual(travel.player, beforeInvalid, 'invalid request never mutates player');
}
const covered = createSimulation({ ...map, areas: [{ type: 'water', points: [[-600, -600], [600, -600], [600, 600], [-600, 600]] }] }, { trafficCount: 0 });
const beforeImpossible = { ...covered.player };
assert.equal(covered.teleport({ x: 0, z: 0 }).reason, 'no-clear-position', 'fully blocked map rejects without unsafe fallback');
assert.deepEqual(covered.player, beforeImpossible);
console.log('PASS teleport exact off-road arrival, building/water/edge safety, invalid rejection and preserved trip statistics');

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
const street = createSimulation(teleportMap, { trafficCount: 0 });
street.setPlayerVehicle({ modelId: 'atlas', color: 0x123456 });
street.setParkedCars([{ id: 'customer:7', x: 20, z: 120, yaw: 0.4, modelId: 'finch', color: 0xabcdef, owner: 'resident' }]);
assert.equal(street.parkedCars[0].owner, 'resident', 'caller metadata survives indexing');
assert.equal(street.nearbyVehicles(20, 120)[0].id, 'customer:7');
Object.assign(street.player, { odometer: 85, crashes: 3 });
const claimed = street.claimVehicle('customer:7');
assert(claimed.ok && claimed.stolen);
assert.equal(claimed.vehicle.id, 'player');
assert.deepEqual([street.player.modelId, street.player.color, street.player.odometer, street.player.crashes], ['finch', 0xabcdef, 85, 3]);
assert.equal(street.parkedCars[0].active, false);
assert.equal(street.abandonedCars[0].modelId, 'atlas');
assert.equal(street.claimVehicle('customer:7').ok, false, 'inactive sources cannot be claimed twice');
assert(street.claimVehicle(street.abandonedCars[0].id).ok, 'previous car can be reclaimed');
assert.equal(street.player.modelId, 'atlas');
assert.equal(street.abandonedCars.filter(car => car.active).length, 1);
const actor = { x: 38, z: -60 };
assert(street.moveActor(actor, 8, 0).blocked && actor.x < 40, 'swept foot movement cannot tunnel through building');
const swimmer = { x: -78, z: -120 };
assert(street.moveActor(swimmer, -8, 0).blocked && swimmer.x > -80, 'water blocks actor');
const walker = { x: 497, z: 300 };
assert(street.moveActor(walker, 8, 0).blocked && walker.x <= 499.55, 'bounds block actor locally');
const byCar = { x: street.player.x + 3, z: street.player.z };
assert(street.moveActor(byCar, -2, 0).blocked && byCar.x >= street.player.x + 2.25, 'vehicle clearance blocks actor');
assert.equal(street.hasLineOfSight({ x: 20, z: -60 }, { x: 90, z: -60 }), false, 'building blocks full segment');
assert.equal(street.hasLineOfSight({ x: 20, z: -90 }, { x: 90, z: -90 }), true, 'clear segment stays visible');
assert.equal(street.hasLineOfSight({ x: 50, z: -60 }, { x: 90, z: -60 }), false, 'interior endpoint blocks sight');
assert.equal(street.hasLineOfSight({ x: NaN, z: 0 }, { x: 0, z: 0 }), false);
const capped = createSimulation(largeMap, { trafficCount: 100 });
assert.equal(capped.traffic.length, 56);
assert(capped.traffic.every((car, i) => car.id === `traffic:${i}`));
const focusFleet = createSimulation(largeMap, { seed: 33, trafficCount: 12 });
const focus = { x: 1500, z: -400 };
const stable = [...focusFleet.traffic];
const trafficState = () => focusFleet.traffic.map(({ x, z, speed, active, anger, honkCooldown }) => ({ x, z, speed, active, anger, honkCooldown }));
const frozen = trafficState();
focusFleet.step(0, {}, focus);
assert.deepEqual(trafficState(), frozen, 'dt0 freezes traffic and timers');
for (let i = 0; i < 180; i++) focusFleet.step(1 / 60, {}, focus);
assert(focusFleet.traffic.some(car => Math.hypot(car.x - focus.x, car.z - focus.z) < 650), 'walking focus attracts local fleet');
assert(focusFleet.traffic.every((car, i) => car === stable[i]), 'refresh preserves slots and objects');
assert(focusFleet.traffic.every(car => car.anger >= 0 && car.anger <= 1 && Number.isFinite(car.overtakeCooldown)));
const rage = createSimulation(map, { trafficCount: 1 });
const angry = rage.traffic[0];
angry.aggressive = true;
const blocking = pointOnLane(angry.edge, angry.position + 9);
rage.setParkedCars([{ id: 'blocker', ...blocking }]);
for (let i = 0; i < 240; i++) rage.step(1 / 60, {});
assert(angry.anger > 0.4 && angry.honks > 0 && angry.honkCooldown > 0, 'blocked aggressive driver reacts with bounded anger and honk cooldown');
assert.equal(angry.overtake, 0, 'two-way street does not permit unsafe passing');
const passingMap = { ...map, spawn: { x: -400, z: -400 }, buildings: [], roads: [
  { ...road('wide-oneway', [[0, 0], [0, -400]], [91, 92], 1), width: 14 }
] };
const passing = createSimulation(passingMap, { trafficCount: 1 });
const passer = passing.traffic[0];
passer.position = 70; passer.active = true; passer.speed = 0; passer.anger = 0.8; passer.aggressive = true;
Object.assign(passer, pointOnLane(passer.edge, passer.position));
passing.setParkedCars([{ id: 'slow', ...pointOnLane(passer.edge, 82) }]);
passing.step(1 / 60, {});
assert(passer.overtake > 0 && passer.overtakeCooldown > 0, 'wide one-way permits clear overtaking with cooldown');
const passLane = { x: passer.x, z: passer.z };
passing.setParkedCars([{ id: 'slow', ...pointOnLane(passer.edge, 82) }, { id: 'passing-obstacle', x: passLane.x, z: passLane.z - 10 }]);
passing.step(1 / 60, {});
assert.equal(passer.overtake, 0, 'occupied passing corridor immediately cancels overtaking');
console.log('PASS vehicle metadata/claims, abandoned cars, actor sweeps, polygon sight, bounded stable fleet, walking focus and road rage');
console.log('Capital Drive simulation: all checks passed');

if (process.argv[2]) {
  const actual = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const start = performance.now();
  const city = createSimulation(actual);
  assert(city.graph.edges.length > 0, 'real map contains driveable graph edges');
  assert.equal(city.traffic.length, 40, 'real map supports the intended traffic population');
  assert(Number.isFinite(city.nearestRoad(city.player.x, city.player.z)?.distance), 'spawn has a nearest road');
  for (const edge of city.graph.edges) {
    assert(edge.road.oneway !== 1 || edge.direction === 1);
    assert(edge.road.oneway !== -1 || edge.direction === -1);
  }
  const initial = city.traffic.map(car => [car.x, car.z]);
  for (let i = 0; i < 60 * 60; i++) city.step(1 / 60, {});
  assert(city.traffic.every(car => [car.x, car.z, car.yaw, car.speed].every(Number.isFinite)));
  assert(city.traffic.some((car, i) => Math.hypot(car.x - initial[i][0], car.z - initial[i][1]) > 30), 'actual-map traffic makes progress');
  const footprint = actual.buildings.find(building => building.points.some(([x, z]) =>
    x > actual.bounds.minX + 5 && x < actual.bounds.maxX - 5 && z > actual.bounds.minZ + 5 && z < actual.bounds.maxZ - 5));
  const vertex = footprint.points.find(([x, z]) => x > actual.bounds.minX + 5 && x < actual.bounds.maxX - 5 &&
    z > actual.bounds.minZ + 5 && z < actual.bounds.maxZ - 5);
  const arrival = city.teleport({ x: vertex[0], z: vertex[1] });
  assert(arrival.ok && arrival.adjusted && arrival.reason === 'building', 'real footprint boundary receives safe teleport clearance');
  city.step(1 / 60, {});
  assert(Math.hypot(city.player.x - arrival.x, city.player.z - arrival.z) < 0.05, 'real-map arrival needs no subsequent collision correction');
  console.log(`PASS actual map: ${city.graph.nodes.size} nodes, ${city.graph.edges.length} directed edges, ${actual.buildings.length} indexed buildings, 40 cars; 60-second soak in ${Math.round(performance.now() - start)}ms`);
}
