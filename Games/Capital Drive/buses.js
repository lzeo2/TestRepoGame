import { createRoutePlanner, roadProfile } from './road-network.js';

const COUNT = 2, LENGTH = 10.6, WIDTH = 2.45, STOP_HOLD = 20, STOPPED = .08;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const lane = (edge, distance) => ({
  x: edge.from.x + edge.dx * distance + edge.dz * edge.laneOffset,
  z: edge.from.z + edge.dz * distance - edge.dx * edge.laneOffset,
});

// Fictional ambient circuits, computed once from the supplied public directed graph.
// Bounded depth-first search excludes immediate reversals and repeated junctions.
function circuit(graph, seed, used) {
  let budget = 18000;
  const visited = new Set([seed.from.id, seed.to.id]);
  const path = [seed];
  function search(node, distance) {
    if (--budget <= 0 || path.length > 100 || distance > 4500) return null;
    const choices = node.outgoing.filter(edge => roadProfile(edge.road).busAllowed &&
      edge.segment !== path[path.length - 1].segment && edge.length > .2)
      .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) ||
        Math.abs(angle(a.yaw - path[path.length - 1].yaw)) - Math.abs(angle(b.yaw - path[path.length - 1].yaw)));
    for (const edge of choices) {
      if (edge.to.id === seed.from.id && path.length >= 3 && distance + edge.length > 260) return [...path, edge];
      if (visited.has(edge.to.id)) continue;
      visited.add(edge.to.id); path.push(edge);
      const result = search(edge.to, distance + edge.length);
      if (result) return result;
      path.pop(); visited.delete(edge.to.id);
      if (budget <= 0) break;
    }
    return null;
  }
  return search(seed.to, seed.length);
}

export function createBuses(map, simulation) {
  const graph = simulation.graph, planner = createRoutePlanner(graph), used = new Set();
  const origin = map.spawn || { x: 0, z: 0 };
  const seeds = graph.edges.filter(edge => edge.length > 24 && roadProfile(edge.road).busAllowed)
    .sort((a, b) => Math.hypot(a.from.x - origin.x, a.from.z - origin.z) - Math.hypot(b.from.x - origin.x, b.from.z - origin.z));
  const routes = [];
  for (const seed of seeds.slice(0, 160)) {
    if (used.has(seed.id)) continue;
    const start = lane(seed, seed.length / 2);
    if (!simulation.canOccupy({ ...start, yaw: seed.yaw }, { length: LENGTH, width: WIDTH }) ||
      routes.some(route => Math.hypot(route.points[0].x - start.x, route.points[0].z - start.z) < 22)) continue;
    const edges = circuit(graph, seed, used);
    if (!edges) continue;
    // Ask the shared planner to validate each directed leg with its bus access policy.
    if (!edges.every(edge => planner.findEdges(edge.from, edge.to, { kind: 'bus' }).length)) continue;
    const points = edges.map(edge => lane(edge, 0));
    points[0] = start;
    routes.push({ edges, points }); edges.forEach(edge => used.add(edge.id));
    if (routes.length === COUNT) break;
  }
  const vehicles = routes.map((route, i) => ({ id: `ambient-bus-${i}`, kind: 'bus',
    x: route.points[0].x, z: route.points[0].z, yaw: route.edges[0].yaw,
    length: LENGTH, width: WIDTH, active: true, occupied: true, speed: 0,
    color: i ? 0xbb7448 : 0x547389, layover: i ? 2 : 0, stopRequested: 0, playerAboard: false }));
  const cursors = vehicles.map(() => 1);
  let aboard = null, exitRequested = false;
  const localPose = (bus, x, z) => ({ x: bus.x + Math.cos(bus.yaw) * x + Math.sin(bus.yaw) * z,
    z: bus.z - Math.sin(bus.yaw) * x + Math.cos(bus.yaw) * z, yaw: bus.yaw });
  const doorPose = bus => localPose(bus, -1.95, -4.1);
  function nearest(pose, range = 10) {
    if (!pose || ![pose.x, pose.z, range].every(Number.isFinite) || range < 0) return null;
    let best = null;
    for (const bus of vehicles) {
      if (!bus.active) continue;
      const door = doorPose(bus), distance = Math.hypot(pose.x - door.x, pose.z - door.z);
      if (distance <= range && (!best || distance < best.distance)) best = { ...door, id: bus.id,
        busId: bus.id, distance, speed: bus.speed, stopped: bus.speed <= STOPPED, door: true };
    }
    return best;
  }
  function clearPath(bus, from, to) {
    if (!simulation.hasLineOfSight(from, to)) return false;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .15));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!simulation.canOccupy({ x: from.x + (to.x - from.x) * t,
        z: from.z + (to.z - from.z) * t, yaw: bus.yaw }, { length: 1, width: .8, ignoreId: bus.id })) return false;
    }
    return true;
  }
  function exitAt(bus) {
    const inside = localPose(bus, -.85, -4.1);
    for (const reach of [1.95, 2.35, 2.75]) {
      const outside = localPose(bus, -reach, -4.1);
      if (clearPath(bus, inside, outside)) return outside;
    }
    return null;
  }
  function interact(ctx = {}) {
    if (ctx.recovering || ctx.indoors) return { ok: false, reason: 'Leave the interior or recovery before using a bus' };
    if (aboard) {
      if (aboard.speed > STOPPED) {
        exitRequested = true; aboard.stopRequested = STOP_HOLD;
        return { ok: false, stopping: true, reason: 'Bus stopping. Press E again when stopped' };
      }
      const exitPose = exitAt(aboard);
      if (!exitPose) { exitRequested = true; return { ok: false, reason: 'Bus door blocked. Wait for clear ground' }; }
      aboard.playerAboard = false; aboard.stopRequested = 3; aboard.speed = 0; aboard = null; exitRequested = false;
      return { ok: true, exited: true, exitPose };
    }
    if (!ctx.onFoot || ctx.busy) return { ok: false, reason: ctx.busy ? 'Finish your current activity before boarding' : 'Get out of your vehicle first' };
    const near = nearest(ctx.pose);
    if (!near) return { ok: false, reason: 'Walk to the front-left bus door' };
    const bus = vehicles.find(item => item.id === near.busId);
    if (!simulation.hasLineOfSight(ctx.pose, near)) return { ok: false, reason: 'Bus door is out of sight' };
    if (bus.speed > STOPPED) {
      bus.stopRequested = STOP_HOLD;
      return { ok: false, stopping: true, reason: 'Bus stopping. Walk to its front-left door' };
    }
    if (near.distance > 2 || !clearPath(bus, ctx.pose, localPose(bus, -.85, -4.1)) || !exitAt(bus)) {
      return { ok: false, reason: 'Walk beside the clear front-left bus door' };
    }
    aboard = bus; bus.playerAboard = true; bus.stopRequested = 0; bus.layover = 0; bus.speed = 0; exitRequested = false;
    return { ok: true, boarded: true, passenger: true, busId: bus.id, fare: 0 };
  }
  function reset() {
    aboard = null; exitRequested = false;
    vehicles.forEach((bus, i) => {
      Object.assign(bus, routes[i].points[0], { yaw: routes[i].edges[0].yaw, speed: 0, layover: i ? 2 : 0, active: true, stopRequested: 0, playerAboard: false });
      cursors[i] = 1;
    });
  }
  function advance(bus, i, dt) {
    bus.stopRequested = Math.max(0, bus.stopRequested - dt);
    if (bus.stopRequested > 0 || aboard === bus && exitRequested) {
      bus.speed = Math.max(0, bus.speed - 4 * dt);
      const signalDistance = simulation.trafficLights?.stopDistance(bus, { length: LENGTH }) ?? Infinity;
      const travel = Math.min(bus.speed * dt, Math.max(0, signalDistance - .1));
      const movement = simulation.moveVehicle(bus, -Math.sin(bus.yaw) * travel, -Math.cos(bus.yaw) * travel,
        { length: LENGTH, width: WIDTH });
      if (movement.blocked || bus.speed <= STOPPED) bus.speed = 0;
      return;
    }
    if (bus.layover > 0) { bus.layover = Math.max(0, bus.layover - dt); bus.speed = 0; return; }
    const route = routes[i], points = route.points;
    let target = points[cursors[i]], distance = Math.hypot(target.x - bus.x, target.z - bus.z);
    if (distance < 4.5) {
      if (cursors[i] === 0) {
        if (bus.speed < .35) { bus.layover = 4; bus.speed = 0; cursors[i] = 1; return; }
      } else {
        cursors[i] = (cursors[i] + 1) % points.length;
        target = points[cursors[i]]; distance = Math.hypot(target.x - bus.x, target.z - bus.z);
      }
    }
    const desiredYaw = Math.atan2(-(target.x - bus.x), -(target.z - bus.z));
    const turn = angle(desiredYaw - bus.yaw);
    let targetSpeed = Math.max(1.4, 7.2 * (1 - Math.min(1, Math.abs(turn) / 1.3)));
    const signalDistance = simulation.trafficLights?.stopDistance(bus, { length: LENGTH }) ?? Infinity;
    targetSpeed = Math.min(targetSpeed, Math.sqrt(Math.max(0, signalDistance - .15) * 8));
    if (cursors[i] === 0) targetSpeed = Math.min(targetSpeed, Math.sqrt(Math.max(0, distance - 3) * 3));
    const look = Math.max(3, bus.speed * 1.4);
    const forward = { x: bus.x - Math.sin(bus.yaw) * look, z: bus.z - Math.cos(bus.yaw) * look, yaw: bus.yaw };
    if (!simulation.canOccupy(forward, { length: LENGTH, width: WIDTH, ignoreId: bus.id })) targetSpeed = 0;
    bus.speed += Math.max(-4 * dt, Math.min(1.25 * dt, targetSpeed - bus.speed));
    const oldYaw = bus.yaw;
    bus.yaw = angle(bus.yaw + Math.max(-.65 * dt, Math.min(.65 * dt, turn)));
    if (!simulation.canOccupy(bus, { length: LENGTH, width: WIDTH, ignoreId: bus.id })) bus.yaw = oldYaw;
    const travel = Math.min(bus.speed * dt, Math.max(0, signalDistance - .1));
    const move = simulation.moveVehicle(bus, -Math.sin(bus.yaw) * travel, -Math.cos(bus.yaw) * travel,
      { length: LENGTH, width: WIDTH });
    if (move.blocked) bus.speed = 0;
  }
  function step(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let remaining = Math.min(dt, .2);
    while (remaining > 1e-8) { const tick = Math.min(remaining, 1 / 30); vehicles.forEach((bus, i) => advance(bus, i, tick)); remaining -= tick; }
  }
  function snapshot() {
    return vehicles.map((bus, i) => ({ ...bus, circuit: 'fictional ambient circuit',
      routeEdgeIds: routes[i].edges.map(edge => edge.id), waypoint: cursors[i] }));
  }
  return { vehicles, step, reset, snapshot, nearest, interact,
    get passenger() { return !!aboard; }, get seatPose() { return aboard; } };
}
