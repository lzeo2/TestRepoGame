import { createRoutePlanner, roadProfile } from './road-network.js';

const LENGTH = 4.66, WIDTH = 1.884, MAX_SPEED = 10;
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
  const vehicles = [car], events = [], combatEvents = [];
  const driver = { id: 'yoober-driver-npc', role: 'driver', x: 0, z: 0, yaw: 0, active: false,
    health: 100, reaction: 'calm', elapsed: 0, cooldown: 0, hitCooldown: 0 };
  const people = [driver];
  let ragePending = false, driverDoor = null;
  let phase = 'idle', reason = '', passenger = false, fare = 0, booking = null, serial = 0;
  let legStart = null;
  let route = [], points = [], cursor = 0, elapsed = 0, stalled = 0, wait = 0;
  let pickup = null, dropoff = null, paid = false, mode = false;
  const activeFare = () => ['approaching', 'waiting', 'riding', 'arrived', 'stopping', 'exit-ready'].includes(phase) ? fare : 0;
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
      if (i === path.length - 1) result.push({ ...to });
      else {
        const end = lane(edge, edge.length), next = lane(path[i + 1], 0);
        if (Math.abs(angle(edge.yaw - path[i + 1].yaw)) > .5) result.push({ ...end, precision: true }, { ...next, precision: true });
        else result.push({ x: (end.x + next.x) / 2, z: (end.z + next.z) / 2 });
      }
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
    if (driver.active) return { ok: false, reason: 'The driver is still outside' };
    if (passenger || !['idle', 'complete', 'cancelled', 'failed'].includes(phase)) return { ok: false, reason: 'A ride is already booked' };
    const result = plan(id, ctx);
    if (!result.ok) return result;
    const { path, ...publicQuote } = result;
    return copy(publicQuote);
  }
  function setRoute(path, from, to) {
    legStart = { x: from.x, z: from.z };
    route = path.map(edge => edge.id); points = routePoints(path, from, to); cursor = 0; elapsed = 0; stalled = 0;
  }
  function book(id, ctx = {}) {
    if (passenger || !['idle', 'complete', 'cancelled', 'failed'].includes(phase)) return { ok: false, reason: 'A ride is already booked' };
    if (driver.active) return { ok: false, reason: 'The driver is still outside' };
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
    ragePending = false; driver.active = false; car.occupied = true;
    Object.assign(car, { x: origin.x, z: origin.z, yaw: origin.yaw, speed: 0, active: true });
    setRoute(approach, origin, pickup); emit('booked');
    return { ok: true, bookingId: booking.id, fare, pickup: copy(pickup), dropoff: copy(dropoff) };
  }
  function provoke(ctx) {
    if (!ragePending || passenger || car.speed > .05) return;
    ragePending = false;
    if (guard(ctx) || ctx.sandbox || distance(car, ctx.pose) >= 10 || !simulation.hasLineOfSight(car, ctx.pose)) return;
    let door = exitAt(car);
    if (door && distance(door, ctx.pose) < .9) door = exitAt({ ...car, yaw: angle(car.yaw + Math.PI) });
    if (!door || distance(door, ctx.pose) < .9) return;
    driverDoor = door;
    Object.assign(driver, door, { active: true, health: 100, reaction: 'angry', elapsed: 0, cooldown: .6, hitCooldown: 0 });
    car.occupied = false; reason = 'The driver got out and is angry about the nearby cancellation'; emit('driver-rage');
  }
  function cancel(ctx = {}) {
    if (phase === 'idle' || !car.active || ['complete', 'cancelled', 'failed', 'cancel-braking'].includes(phase))
      return { ok: false, reason: 'No active ride' };
    reason = 'Ride cancelled';
    ragePending = serial % 3 === 0 && !ctx.sandbox && !guard(ctx, passenger) &&
      distance(car, ctx.pose) < 10 && simulation.hasLineOfSight(car, ctx.pose);
    if (passenger) { phase = 'stopping'; emit('stopping'); return { ok: true, stopping: true, reason }; }
    phase = car.speed > .05 ? 'cancel-braking' : 'cancelled'; wait = 0;
    if (phase === 'cancelled') { provoke(ctx); if (!driver.active) car.active = false; }
    emit('cancelled'); return { ok: true, stopping: phase === 'cancel-braking', reason };
  }
  function stepDriver(dt, ctx) {
    if (!driver.active) return;
    driver.elapsed += dt; driver.cooldown = Math.max(0, driver.cooldown - dt);
    driver.hitCooldown = Math.max(0, driver.hitCooldown - dt);
    if (ctx.recovering || ctx.sandbox || !!ctx.sandbox !== mode || ctx.indoors || driver.elapsed >= 15) {
      driver.active = false; car.occupied = true; return;
    }
    const chase = driver.reaction === 'angry' && driver.health > 0 && driver.elapsed < 10 &&
      ctx.onFoot && ctx.pose && distance(driver, ctx.pose) < 14 && simulation.hasLineOfSight(driver, ctx.pose);
    const target = chase ? ctx.pose : driverDoor;
    if (!chase && driver.health > 0) driver.reaction = 'returning';
    if (driver.health <= 0) { driver.reaction = 'knockdown'; return; }
    const gap = distance(driver, target);
    driver.yaw = Math.atan2(-(target.x - driver.x), -(target.z - driver.z));
    if (gap > (chase ? 1.45 : .35)) {
      const travel = Math.min(gap, dt * (chase ? 1.9 : 1.4));
      const movement = simulation.moveActor(driver, -Math.sin(driver.yaw) * travel, -Math.cos(driver.yaw) * travel, .38);
      if (movement.distance < travel * .25) for (const offset of [.8, -.8, 1.5, -1.5, 2.2, -2.2]) {
        const yaw = driver.yaw + offset;
        const probe = { x: driver.x - Math.sin(yaw) * .8, z: driver.z - Math.cos(yaw) * .8, yaw };
        if (!simulation.canOccupy(probe, { length: 1, width: .8, ignoreId: driver.id })) continue;
        simulation.moveActor(driver, -Math.sin(yaw) * travel, -Math.cos(yaw) * travel, .38); break;
      }
    } else if (!chase) { driver.active = false; car.occupied = true; return; }
    if (chase && gap < 1.9 && driver.cooldown <= 0 && simulation.hasLineOfSight(driver, ctx.pose)) {
      combatEvents.push(Object.freeze({ type: 'retaliation', attackerId: driver.id, targetId: 'player',
        x: driver.x, z: driver.z, damage: 6 })); driver.cooldown = 1.2;
    }
  }
  function clipMovement(actor, dx, dz, radius = .45) {
    if (!driver.active || actor?.id === driver.id) return { dx, dz, blocked: false };
    if (![actor?.x, actor?.z, dx, dz, radius].every(Number.isFinite)) return { dx: 0, dz: 0, blocked: true };
    const reach = Math.max(.1, Math.min(4, radius)) + .38;
    const x = actor.x - driver.x, z = actor.z - driver.z, length2 = dx * dx + dz * dz;
    const toward = x * dx + z * dz, c = x * x + z * z - reach * reach;
    if (length2 < 1e-12 || toward >= 0) return { dx, dz, blocked: false };
    const discriminant = toward * toward - length2 * c;
    if (discriminant < 0) return { dx, dz, blocked: false };
    const contact = c <= 0 ? 0 : (-toward - Math.sqrt(discriminant)) / length2;
    if (contact < 0 || contact > 1) return { dx, dz, blocked: false };
    const scale = Math.max(0, contact - .001 / Math.sqrt(length2));
    return { dx: dx * scale, dz: dz * scale, blocked: true };
  }
  function alert({ x, z, radius = 28, hasLineOfSight } = {}) {
    if (!driver.active || driver.health <= 0 || ![x, z, radius].every(Number.isFinite) ||
      distance(driver, { x, z }) > Math.max(0, Math.min(100, radius)) ||
      !(hasLineOfSight || simulation.hasLineOfSight)({ x, z }, driver)) return 0;
    driver.reaction = 'returning'; return 1;
  }
  function strike({ x, z, yaw = 0, range = 2, damage = 20, kind = 'melee', hasLineOfSight } = {}) {
    const result = { hits: 0, people: [] };
    if (!driver.active || driver.health <= 0 || driver.hitCooldown > 0 || ![x, z, yaw, range, damage].every(Number.isFinite)) return result;
    const gap = distance(driver, { x, z }), forward = (driver.x - x) * -Math.sin(yaw) + (driver.z - z) * -Math.cos(yaw);
    const lateral = Math.abs((driver.x - x) * Math.cos(yaw) - (driver.z - z) * Math.sin(yaw));
    const gun = ['pistol', 'shotgun', 'smg', 'carbine', 'gunshot', 'firearm', 'shot', 'fire'].includes(kind);
    if (damage <= 0 || gap > Math.max(0, Math.min(100, range)) || forward < -.3 ||
      (gun ? lateral > .55 : forward < gap * .25) || !(hasLineOfSight || simulation.hasLineOfSight)({ x, z }, driver)) return result;
    driver.health = Math.max(0, driver.health - Math.min(100, damage)); driver.hitCooldown = .4;
    driver.reaction = driver.health > 0 ? 'returning' : 'knockdown';
    result.hits = 1; result.people.push(copy(driver)); return result;
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
    // Progress along the lane polyline, rather than stopping at every OSM node.
    // A bounded lookahead rounds the short joins between successive left lanes.
    while (cursor < points.length - 1) {
      const target = points[cursor], previous = cursor ? points[cursor - 1] : legStart;
      const dx = target.x - previous.x, dz = target.z - previous.z, length2 = dx * dx + dz * dz;
      const projection = length2 ? ((car.x - previous.x) * dx + (car.z - previous.z) * dz) / length2 : 1;
      if (distance(car, target) < (target.precision ? .35 : 1) || (!target.precision && projection >= 1)) cursor++;
      else break;
    }
    const target = points[cursor];
    if (!target) { car.speed = 0; return; }
    const gap = distance(car, target), finalGap = distance(car, points.at(-1));
    if (cursor === points.length - 1 && finalGap < .2 && car.speed < .2) {
      car.speed = 0; phase = passenger ? 'arrived' : 'waiting'; wait = 0; emit(phase); return;
    }
    let remaining = gap, cornerLimit = MAX_SPEED, ahead = gap;
    let previous = cursor ? points[cursor - 1] : legStart;
    for (let i = cursor; i < points.length - 1; i++) {
      const here = points[i], next = points[i + 1];
      const incoming = Math.atan2(here.z - previous.z, here.x - previous.x);
      const outgoing = Math.atan2(next.z - here.z, next.x - here.x);
      const bend = Math.abs(angle(outgoing - incoming));
      if (ahead < 35 && bend > .2) {
        const cornerSpeed = Math.max(2, 6 - bend * 2.2);
        cornerLimit = Math.min(cornerLimit, Math.sqrt(cornerSpeed * cornerSpeed + 5 * Math.max(0, ahead - 3)));
      }
      const span = distance(here, next); remaining += span; ahead += span; previous = here;
    }
    let look = Math.min(target.precision ? gap : 8, 2.2 + car.speed * .55), aim = target;
    let from = car;
    for (let i = cursor; i < points.length; i++) {
      const to = points[i], span = distance(from, to);
      if (span >= look || i === points.length - 1) {
        const t = span > 0 ? Math.min(1, look / span) : 0;
        aim = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }; break;
      }
      look -= span; from = to;
    }
    const desiredYaw = Math.atan2(-(aim.x - car.x), -(aim.z - car.z));
    const turn = angle(desiredYaw - car.yaw);
    let wantedSpeed = Math.min(MAX_SPEED, cornerLimit, Math.sqrt(Math.max(0, remaining - .08) * 4));
    if (target.precision) wantedSpeed = Math.min(wantedSpeed, Math.sqrt(Math.max(0, gap - .05) * 4));
    if (Math.abs(turn) > .5) wantedSpeed = Math.min(wantedSpeed, 2.5);
    if (Math.abs(turn) > 1) wantedSpeed = 0;
    const signalGap = simulation.trafficLights?.stopDistance(car, { length: LENGTH }) ?? Infinity;
    wantedSpeed = Math.min(wantedSpeed, Math.sqrt(Math.max(0, signalGap - .12) * 8));
    const clearance = Math.min(remaining, 2 + car.speed * .9);
    const front = { x: car.x - Math.sin(car.yaw) * clearance, z: car.z - Math.cos(car.yaw) * clearance, yaw: car.yaw };
    if (!bodyClear(front)) wantedSpeed = 0;
    car.speed += Math.max(-5 * dt, Math.min(2 * dt, wantedSpeed - car.speed));
    const yaw = angle(car.yaw + Math.max(-1.2 * dt, Math.min(1.2 * dt, turn)));
    if (bodyClear({ ...car, yaw })) car.yaw = yaw;
    const travel = Math.min(remaining, car.speed * dt, Math.max(0, signalGap));
    const movement = simulation.moveVehicle(car, -Math.sin(car.yaw) * travel, -Math.cos(car.yaw) * travel,
      { length: LENGTH, width: WIDTH });
    if (movement.blocked || travel < car.speed * dt - 1e-6) car.speed = 0;
    stalled = movement.distance > .002 || Number.isFinite(signalGap) ? 0 : stalled + dt;
  }
  function step(dt, ctx = {}) {
    if (!Number.isFinite(dt) || dt <= 0 || (!car.active && !driver.active)) return;
    const invalid = guard(ctx, passenger) || (!!ctx.sandbox !== mode ? 'Ride mode changed' : '');
    if (invalid && !['complete', 'cancelled', 'failed'].includes(phase)) {
      reason = invalid; ragePending = false;
      if (passenger) { if (phase !== 'exit-ready') phase = 'stopping'; }
      else { phase = 'cancelled'; car.speed = 0; car.active = false; emit('cancelled'); return; }
    }
    let remaining = Math.min(dt, .2);
    while (remaining > 1e-8) {
      const tick = Math.min(remaining, 1 / 60); remaining -= tick; elapsed += tick;
      stepDriver(tick, ctx);
      if (!passenger && phase === 'cancelled') provoke(ctx);
      if (phase === 'approaching' || phase === 'riding') {
        drive(tick);
        if (stalled > 25 || elapsed > (passenger ? 600 : 120)) {
          reason = 'Road blocked. Ride stopped';
          if (passenger) phase = 'stopping';
          else { phase = 'failed'; car.speed = 0; car.active = false; emit('failed'); }
        }
      } else if (phase === 'stopping' || phase === 'cancel-braking') {
        car.speed = Math.max(0, car.speed - 5 * tick);
        const signalGap = simulation.trafficLights?.stopDistance(car, { length: LENGTH }) ?? Infinity;
        const travel = Math.min(car.speed * tick, Math.max(0, signalGap));
        const movement = simulation.moveVehicle(car, -Math.sin(car.yaw) * travel,
          -Math.cos(car.yaw) * travel, { length: LENGTH, width: WIDTH });
        if (movement.blocked || travel < car.speed * tick - 1e-6) car.speed = 0;
        if (car.speed <= .05) { car.speed = 0; phase = passenger ? 'exit-ready' : 'cancelled'; wait = 0; emit(phase); }
      } else {
        wait += tick;
        if (phase === 'waiting' && wait > 90) { phase = 'cancelled'; reason = 'Pickup timed out'; car.active = false; emit('cancelled'); }
        if (['complete', 'cancelled'].includes(phase) && wait > 3 && !driver.active && !ragePending) car.active = false;
      }
    }
  }
  function reset() {
    car.active = false; car.speed = 0; phase = 'idle'; reason = ''; passenger = false; paid = false;
    fare = 0; booking = null; pickup = null; dropoff = null; route = []; points = []; cursor = 0;
    elapsed = 0; stalled = 0; wait = 0; events.length = 0; combatEvents.length = 0;
    ragePending = false; driver.active = false; car.occupied = true;
  }
  function snapshot() {
    return freeze({ phase, reason, passenger, paid, fare, activeFare: activeFare(), booking: copy(booking),
      seatPose: passenger ? { x: car.x, z: car.z, yaw: car.yaw, speed: car.speed } : null,
      car: { ...car }, driver: copy(driver), people: driver.active ? [copy(driver)] : [],
      stats: { drivers: Number(driver.active), driverLimit: 1 }, pickup: copy(pickup), dropoff: copy(dropoff), route: [...route], waypoint: cursor });
  }
  return { vehicles, people, destinations, quote, book, interact, cancel, step, reset, snapshot, strike, alert, clipMovement,
    drainCombatEvents: () => combatEvents.splice(0),
    get phase() { return phase; }, get passenger() { return passenger; },
    get activeFare() { return activeFare(); }, get seatPose() { return passenger ? car : null; },
    drainEvents: () => events.splice(0) };
}
