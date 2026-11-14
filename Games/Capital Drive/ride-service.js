import { createRoutePlanner, roadProfile } from './road-network.js';

const LENGTH = 4.5, WIDTH = 1.8, MAX_SPEED = 10;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lane = (edge, at) => ({ x: edge.from.x + edge.dx * at + edge.dz * edge.laneOffset,
  z: edge.from.z + edge.dz * at - edge.dx * edge.laneOffset, yaw: edge.yaw });
const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};

// One transient NPC car. The controller owns its rendering, collision registration,
// passenger attachment and the only clock; the injected career owner owns money.
export function createRideService(map, simulation, { pay = () => false, canPay = () => false } = {}) {
  const planner = createRoutePlanner(simulation.graph);
  const edges = simulation.graph.edges.filter(edge => edge.length >= 18 && roadProfile(edge.road).trafficAllowed);
  const car = { id: 'yoober-driver', kind: 'ride', modelId: 'lantern', color: 0x6953a3,
    length: LENGTH, width: WIDTH, x: 0, z: 0, yaw: 0, speed: 0, active: false, occupied: true };
  const vehicles = [car], events = [];
  let phase = 'idle', reason = '', passenger = false, fare = 0, booking = null, serial = 0;
  let route = [], points = [], cursor = 0, elapsed = 0, stalled = 0, wait = 0;
  let pickup = null, dropoff = null, paid = false, mode = false;
  const emit = type => events.push(Object.freeze({ type, bookingId: booking?.id || null, fare, reason }));
  function guard(ctx = {}, aboard = false) {
    if (!ctx.pose || ![ctx.pose.x, ctx.pose.z].every(Number.isFinite)) return 'Player unavailable';
    if (ctx.recovering) return 'Recovery in progress';
    if (ctx.indoors) return 'Go outside first';
    if (ctx.wanted > 0) return 'Lose the wanted level first';
    if (ctx.busy) return 'Finish the current activity first';
    if (!aboard && !ctx.onFoot) return 'Get out of your vehicle first';
    return '';
  }
  const bodyClear = pose => simulation.canOccupy(pose, { length: LENGTH, width: WIDTH, ignoreId: car.id });
  function exitAt(pose) {
    for (const side of [1, -1]) for (const reach of [1.9, 2.3, 2.7]) {
      const target = { x: pose.x + Math.cos(pose.yaw) * reach * side,
        z: pose.z - Math.sin(pose.yaw) * reach * side, yaw: pose.yaw };
      if (!simulation.hasLineOfSight(pose, target)) continue;
      let clear = true;
      for (let i = 0; i <= 12; i++) {
        const p = { x: pose.x + (target.x - pose.x) * i / 12,
          z: pose.z + (target.z - pose.z) * i / 12, yaw: pose.yaw };
        if (!simulation.canOccupy(p, { length: 1, width: .8, ignoreId: car.id })) { clear = false; break; }
      }
      if (clear) return target;
    }
    return null;
  }
  function boardingClear(pose) {
    if (!simulation.hasLineOfSight(pose, car)) return false;
    const steps = Math.ceil(distance(pose, car) / .2);
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      if (!simulation.canOccupy({ x: pose.x + (car.x - pose.x) * t,
        z: pose.z + (car.z - pose.z) * t, yaw: car.yaw },
      { length: 1, width: .8, ignoreId: car.id })) return false;
    }
    return true;
  }
  function stop(edge, at) {
    const pose = lane(edge, Math.max(6, Math.min(edge.length - 6, at)));
    if (!bodyClear(pose)) return null;
    const walk = exitAt(pose);
    return walk ? { ...pose, walk, edgeId: edge.id, at: Math.max(6, Math.min(edge.length - 6, at)) } : null;
  }
  function nearbyStops(pose, maxWalk) {
    return edges.map(edge => {
      const at = Math.max(6, Math.min(edge.length - 6, (pose.x - edge.from.x) * edge.dx + (pose.z - edge.from.z) * edge.dz));
      return { edge, at, d: distance(lane(edge, at), pose) };
    }).filter(item => item.d <= maxWalk).sort((a, b) => a.d - b.d).slice(0, 32);
  }
  function connect(from, to) {
    const a = simulation.graph.edges[from.edgeId], b = simulation.graph.edges[to.edgeId];
    if (a === b && to.at > from.at + 5) return [a];
    const middle = a.to === b.from ? [] : planner.findEdges(a.to, b.from);
    if (a.to !== b.from && !middle.length) return null;
    const result = [a, ...middle, b];
    // Immediate reversing on the same road segment is not a drivable junction.
    if (result.some((edge, i) => i && edge.segment === result[i - 1].segment)) return null;
    return result;
  }
  function lengthOf(path, from, to) {
    return path.length === 1 ? to.at - from.at : path.reduce((sum, edge) => sum + edge.length, 0) - from.at - (path.at(-1).length - to.at);
  }
  function routePoints(path, from, to) {
    if (path.length === 1) return [{ ...to }];
    const result = [];
    path.forEach((edge, i) => {
      if (i) result.push(lane(edge, 0));
      result.push(i === path.length - 1 ? { ...to } : lane(edge, edge.length));
    });
    return result;
  }
  const anchors = (map.landmarks || []).filter(p => [p.x, p.z].every(Number.isFinite)).slice(0, 12);
  const destinations = anchors.map(p => Object.freeze({ id: p.id, name: p.name, x: p.x, z: p.z }));
  destinations.unshift(Object.freeze({ id: 'local-hop', name: 'Short local ride', local: true }));
  Object.freeze(destinations);
  function plan(destinationId, ctx) {
    const denied = guard(ctx);
    if (denied) return { ok: false, reason: denied };
    const destination = destinations.find(item => item.id === destinationId);
    if (!destination) return { ok: false, reason: 'Unknown destination' };
    const starts = nearbyStops(ctx.pose, 55);
    for (const item of starts) {
      const from = stop(item.edge, item.at);
      if (!from || distance(ctx.pose, from.walk) > 55 || !simulation.hasLineOfSight(ctx.pose, from.walk)) continue;
      const candidates = destination.local ? edges.map(edge => ({ edge, at: edge.length / 2,
        d: Math.abs(distance(lane(edge, edge.length / 2), from) - 180) }))
        .filter(item => distance(lane(item.edge, item.at), from) >= 90 && distance(lane(item.edge, item.at), from) <= 300)
        .sort((a, b) => a.d - b.d).slice(0, 40) : nearbyStops(destination, 160);
      for (const target of candidates) {
        const to = stop(target.edge, target.at);
        if (!to) continue;
        const path = connect(from, to);
        if (!path) continue;
        const metres = lengthOf(path, from, to);
        if (metres < 70 || metres > (destination.local ? 900 : 12000)) continue;
        const amount = Math.ceil(12 + metres * .018);
        if (!ctx.sandbox && !canPay(amount, ctx)) return { ok: false, reason: 'Not enough cash', fare: amount };
        return { ok: true, destinationId, destination: destination.name, fare: amount, metres: Math.round(metres),
          pickup: from, dropoff: to, path };
      }
    }
    return { ok: false, reason: 'No clear reachable public road stop nearby' };
  }
  function quote(id, ctx = {}) {
    if (passenger || !['idle', 'complete', 'cancelled', 'failed'].includes(phase)) return { ok: false, reason: 'A ride is already booked' };
    const result = plan(id, ctx);
    if (!result.ok) return result;
    const { path, ...publicQuote } = result;
    return copy(publicQuote);
  }
  function setRoute(path, from, to) {
    route = path.map(edge => edge.id); points = routePoints(path, from, to); cursor = 0; elapsed = 0; stalled = 0;
  }
  function book(id, ctx = {}) {
    if (passenger || !['idle', 'complete', 'cancelled', 'failed'].includes(phase)) return { ok: false, reason: 'A ride is already booked' };
    const planResult = plan(id, ctx);
    if (!planResult.ok) { reason = planResult.reason; return planResult; }
    const from = planResult.pickup;
    // Spawn only an unoccupied NPC car at a genuinely clear nearby road origin.
    // It must then drive the directed approach; booking never moves the player.
    const origins = nearbyStops(from, 100).filter(item => item.d >= 50);
    let approach = null, origin = null;
    for (const item of origins) {
      const candidate = stop(item.edge, item.at);
      if (!candidate || distance(candidate, from) < 50 || distance(candidate, from) > 100) continue;
      const path = connect(candidate, from);
      if (path && lengthOf(path, candidate, from) <= 650) { origin = candidate; approach = path; break; }
    }
    // A long edge often contains the complete approach within one segment.
    if (!origin) {
      const edge = simulation.graph.edges[from.edgeId];
      if (from.at >= 60) {
        const candidate = stop(edge, from.at - 55);
        if (candidate) { origin = candidate; approach = [edge]; }
      }
    }
    if (!origin) return { ok: false, reason: 'No safe driver approach available here' };
    booking = { id: `yoober-${++serial}`, destinationId: id, destination: planResult.destination,
      metres: planResult.metres, rideEdges: planResult.path.map(edge => edge.id) };
    pickup = from; dropoff = planResult.dropoff; fare = planResult.fare; paid = false; passenger = false;
    mode = !!ctx.sandbox; reason = ''; wait = 0; phase = 'approaching';
    Object.assign(car, { x: origin.x, z: origin.z, yaw: origin.yaw, speed: 0, active: true });
    setRoute(approach, origin, pickup); emit('booked');
    return { ok: true, bookingId: booking.id, fare, pickup: copy(pickup), dropoff: copy(dropoff) };
  }
  function cancel(ctx = {}) {
    if (phase === 'idle' || !car.active) return { ok: false, reason: 'No active ride' };
    reason = 'Ride cancelled';
    if (passenger) { phase = 'stopping'; emit('stopping'); return { ok: true, stopping: true }; }
    phase = 'cancelled'; car.active = false; car.speed = 0; emit('cancelled'); return { ok: true };
  }
  function interact(ctx = {}) {
    if (!car.active) return { ok: false, reason: 'No active ride' };
    if (passenger) {
      if (car.speed > .05) { phase = 'stopping'; reason = 'Stopping for a safe exit'; return { ok: false, stopping: true, reason }; }
      const exitPose = exitAt(car);
      if (!exitPose) return { ok: false, reason: 'Exit blocked. Wait for clear ground' };
      passenger = false; car.speed = 0; phase = phase === 'arrived' ? 'complete' : 'cancelled';
      reason = phase === 'complete' ? 'Ride complete' : 'Ride ended'; emit(phase);
      // Keep the stopped car physical until the controller has applied exitPose.
      wait = 0;
      return { ok: true, exited: true, exitPose: copy(exitPose) };
    }
    const denied = guard(ctx);
    if (denied || !!ctx.sandbox !== mode) return { ok: false, reason: denied || 'Ride mode changed' };
    if (phase !== 'waiting' || car.speed > .05) return { ok: false, reason: 'Wait for the driver to stop' };
    if (distance(ctx.pose, car) > 3.5 || !boardingClear(ctx.pose)) return { ok: false, reason: 'Walk beside the stopped driver' };
    if (!exitAt(car)) return { ok: false, reason: 'Boarding area blocked' };
    if (!mode && (!canPay(fare, ctx) || !pay(fare, { ...ctx, bookingId: booking.id, destinationId: booking.destinationId }))) {
      reason = 'Fare payment declined'; return { ok: false, reason };
    }
    paid = !mode; passenger = true; phase = 'riding'; reason = ''; emit('boarded');
    setRoute(booking.rideEdges.map(id => simulation.graph.edges[id]), pickup, dropoff);
    return { ok: true, boarded: true, fare, passenger: true };
  }
  function drive(dt) {
    while (cursor < points.length - 1 && distance(car, points[cursor]) < .35) cursor++;
    const target = points[cursor];
    if (!target) { car.speed = 0; return; }
    const d = distance(car, target), final = cursor === points.length - 1;
    if (final && d < .15 && car.speed < .15) {
      car.speed = 0; phase = passenger ? 'arrived' : 'waiting'; wait = 0; emit(phase); return;
    }
    const desiredYaw = Math.atan2(-(target.x - car.x), -(target.z - car.z));
    const turn = angle(desiredYaw - car.yaw);
    let wantedSpeed = Math.min(MAX_SPEED, Math.sqrt(Math.max(0, d - .05) * 4));
    if (Math.abs(turn) > .35) wantedSpeed = Math.min(wantedSpeed, 1.5);
    if (Math.abs(turn) > .9) wantedSpeed = 0;
    const look = Math.min(d, 2 + car.speed * .9);
    const front = { x: car.x - Math.sin(car.yaw) * look, z: car.z - Math.cos(car.yaw) * look, yaw: car.yaw };
    if (!bodyClear(front)) wantedSpeed = 0;
    car.speed += Math.max(-5 * dt, Math.min(2 * dt, wantedSpeed - car.speed));
    const yaw = angle(car.yaw + Math.max(-1.2 * dt, Math.min(1.2 * dt, turn)));
    if (bodyClear({ ...car, yaw })) car.yaw = yaw;
    const travel = Math.min(d, car.speed * dt);
    const movement = simulation.moveVehicle(car, -Math.sin(car.yaw) * travel, -Math.cos(car.yaw) * travel,
      { length: LENGTH, width: WIDTH });
    if (movement.blocked) car.speed = 0;
    stalled = movement.distance > .002 ? 0 : stalled + dt;
    if (cursor < points.length - 1 && d < .4) cursor++;
  }
  function step(dt, ctx = {}) {
    if (!Number.isFinite(dt) || dt <= 0 || !car.active) return;
    const invalid = guard(ctx, passenger) || (!!ctx.sandbox !== mode ? 'Ride mode changed' : '');
    if (invalid && !['complete', 'cancelled', 'failed'].includes(phase)) {
      reason = invalid;
      if (passenger) { if (phase !== 'exit-ready') phase = 'stopping'; }
      else { phase = 'cancelled'; car.speed = 0; car.active = false; emit('cancelled'); return; }
    }
    let remaining = Math.min(dt, .2);
    while (remaining > 1e-8) {
      const tick = Math.min(remaining, 1 / 60); remaining -= tick; elapsed += tick;
      if (phase === 'approaching' || phase === 'riding') {
        drive(tick);
        if (stalled > 25 || elapsed > (passenger ? 600 : 120)) {
          reason = 'Road blocked. Ride stopped';
          if (passenger) phase = 'stopping';
          else { phase = 'failed'; car.speed = 0; car.active = false; emit('failed'); }
        }
      } else if (phase === 'stopping') {
        car.speed = Math.max(0, car.speed - 5 * tick);
        const movement = simulation.moveVehicle(car, -Math.sin(car.yaw) * car.speed * tick,
          -Math.cos(car.yaw) * car.speed * tick, { length: LENGTH, width: WIDTH });
        if (movement.blocked) car.speed = 0;
        if (car.speed <= .05) { car.speed = 0; phase = 'exit-ready'; emit('exit-ready'); }
      } else {
        wait += tick;
        if (phase === 'waiting' && wait > 90) { phase = 'cancelled'; reason = 'Pickup timed out'; car.active = false; emit('cancelled'); }
        if (['complete', 'cancelled'].includes(phase) && wait > 3) car.active = false;
      }
    }
  }
  function reset() {
    car.active = false; car.speed = 0; phase = 'idle'; reason = ''; passenger = false; paid = false;
    fare = 0; booking = null; pickup = null; dropoff = null; route = []; points = []; cursor = 0;
    elapsed = 0; stalled = 0; wait = 0; events.length = 0;
  }
  function snapshot() {
    return freeze({ phase, reason, passenger, paid, fare, activeFare: fare, booking: copy(booking),
      seatPose: passenger ? { x: car.x + Math.cos(car.yaw) * .38, z: car.z - Math.sin(car.yaw) * .38, yaw: car.yaw } : null,
      car: { ...car }, pickup: copy(pickup), dropoff: copy(dropoff), route: [...route], waypoint: cursor });
  }
  return { vehicles, destinations, quote, book, interact, cancel, step, reset, snapshot,
    get phase() { return phase; }, get passenger() { return passenger; },
    get activeFare() { return fare; }, get seatPose() { return passenger ? car : null; },
    drainEvents: () => events.splice(0) };
}
