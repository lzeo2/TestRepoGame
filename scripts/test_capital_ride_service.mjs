import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL('../Games/Capital Drive/', import.meta.url);
const read = name => readFile(new URL(name, base), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const networkURL = url(await read('road-network.js'));
const { applyRoadProfiles, roadProfile } = await import(networkURL);
const { createSimulation } = await import(url((await read('simulation.js')).replace("'./road-network.js'", JSON.stringify(networkURL))));
const { createRideService } = await import(url((await read('ride-service.js')).replace("'./road-network.js'", JSON.stringify(networkURL))));
const { applyMapExpansion } = await import(url(await read('map-expansion.js')));
const map = { bounds: { minX: -300, minZ: -300, maxX: 1000, maxZ: 1000 },
  spawn: { x: -150, z: -150, yaw: 0 }, buildings: [], roads: [
    { id: 'south', points: [[0, 0], [400, 0]], nodes: [1, 2], oneway: 1, width: 11, type: 'residential' },
    { id: 'east', points: [[400, 0], [400, 400]], nodes: [2, 3], oneway: 1, width: 11, type: 'residential' },
    { id: 'north', points: [[400, 400], [0, 400]], nodes: [3, 4], oneway: 1, width: 11, type: 'residential' },
    { id: 'west', points: [[0, 400], [0, 0]], nodes: [4, 1], oneway: 1, width: 11, type: 'residential' }],
  landmarks: [{ id: 'east-stop', name: 'Public east stop', x: 300, z: 0 },
    { id: 'north-stop', name: 'Public north stop', x: 400, z: 200 }] };
function fixture(source = map) {
  const sim = createSimulation(source, { trafficCount: 0 });
  let cash = 1000, payments = 0;
  const service = createRideService(source, sim, { canPay: fare => cash >= fare,
    pay: fare => { if (cash < fare) return false; cash -= fare; payments++; return true; } });
  sim.setExternalVehicles(service.vehicles);
  const ctx = { pose: { x: 100, z: -5, yaw: 0 }, onFoot: true, sandbox: false, wanted: 0, recovering: false, indoors: false, busy: false };
  return { sim, service, ctx, cash: () => cash, payments: () => payments };
}
function advance(f, until, seconds = 180) {
  for (let i = 0; i < seconds * 60 && !until(f.service.snapshot()); i++) {
    const prior = f.service.snapshot();
    f.service.step(1 / 60, f.ctx);
    const next = f.service.snapshot();
    assert(Math.hypot(next.car.x - prior.car.x, next.car.z - prior.car.z) <= 10.01 / 60, 'NPC never teleports while active');
  }
  assert(until(f.service.snapshot()), `phase ${f.service.snapshot().phase}: ${f.service.snapshot().reason}`);
}
const f = fixture(), s = f.service;
assert.equal(s.vehicles.length, 1); assert.equal(s.vehicles[0].active, false);
assert(s.quote('east-stop', f.ctx).ok);
assert.equal(s.quote('east-stop', { ...f.ctx, wanted: 1 }).ok, false);
assert.equal(s.book('east-stop', { ...f.ctx, recovering: true }).ok, false);
assert(Object.isFrozen(s.snapshot().car), 'QA snapshots are deeply frozen detached copies');
const initialCash = f.cash(), booked = s.book('east-stop', f.ctx);
assert(booked.ok); assert.equal(f.cash(), initialCash, 'booking is free');
assert(distance(s.snapshot().car, s.snapshot().pickup) >= 50, 'driver originates outside pickup');
assert.equal(s.book('east-stop', f.ctx).ok, false, 'duplicate booking rejected');
const paused = s.snapshot(); s.step(0, f.ctx); s.step(NaN, f.ctx); assert.deepEqual(s.snapshot(), paused);
assert.equal(s.interact(f.ctx).ok, false, 'cannot board moving approach');
advance(f, snap => snap.phase === 'waiting');
assert.equal(s.interact({ ...f.ctx, pose: { x: 200, z: -5 } }).ok, false, 'remote boarding denied');
f.ctx.pose = { ...s.snapshot().pickup.walk };
assert(s.interact(f.ctx).boarded); assert.equal(s.passenger, true);
assert.equal(s.phase, 'riding'); assert.equal(s.seatPose, s.vehicles[0], 'hot-loop passenger pose is stable');
assert.throws(() => { s.passenger = false; }, TypeError, 'phase getters have no setter');
assert.equal(f.payments(), 1); assert.equal(f.cash(), initialCash - booked.fare);
for (let i = 0; i < 60; i++) s.step(1 / 60, f.ctx);
s.interact(f.ctx); // A second E requests a stop and cannot charge again.
assert.equal(f.payments(), 1);
advance(f, snap => snap.phase === 'exit-ready');
const exit = s.interact(f.ctx); assert(exit.exited); assert(distance(exit.exitPose, s.snapshot().car) < 3);
assert(f.sim.canOccupy(exit.exitPose, { length: 1, width: .8, ignoreId: 'yoober-driver' }));
assert.equal(s.snapshot().passenger, false); assert.equal(f.payments(), 1);
assert.equal(s.activeFare, 0); assert.equal(s.snapshot().activeFare, 0);
assert.equal(s.snapshot().fare, booked.fare, 'terminal history retains the charged fare');
assert(s.quote('east-stop', { ...f.ctx, pose: { x: 100, z: -5, yaw: 0 } }).ok, 'terminal cancellation allows a fresh quote');
s.reset(); assert.equal(s.snapshot().phase, 'idle'); assert.equal(s.vehicles[0].active, false);
const trip = fixture(); assert(trip.service.book('north-stop', trip.ctx).ok);
advance(trip, snap => snap.phase === 'waiting'); trip.ctx.pose = trip.service.snapshot().pickup.walk;
assert(trip.service.interact(trip.ctx).boarded);
advance(trip, snap => snap.phase === 'arrived');
assert(trip.service.interact(trip.ctx).exited); assert.equal(trip.service.snapshot().phase, 'complete');
assert.equal(trip.service.activeFare, 0); assert.equal(trip.service.snapshot().activeFare, 0);
trip.ctx.pose = { x: 100, z: -5, yaw: 0 };
assert(trip.service.book('east-stop', trip.ctx).ok, 'completed ride allows a fresh complete booking');
assert(trip.service.activeFare > 0 && trip.service.snapshot().booking && trip.service.snapshot().pickup && trip.service.snapshot().dropoff, 'active booking is fully populated');
assert.equal(trip.payments(), 1); assert.equal(trip.service.drainEvents().filter(e => e.type === 'boarded').length, 1);
assert.equal(trip.service.drainEvents().length, 0);
const sandbox = fixture(); sandbox.ctx.sandbox = true;
assert(sandbox.service.book('east-stop', sandbox.ctx).ok); advance(sandbox, snap => snap.phase === 'waiting');
sandbox.ctx.pose = sandbox.service.snapshot().pickup.walk; assert(sandbox.service.interact(sandbox.ctx).boarded);
assert.equal(sandbox.payments(), 0, 'sandbox never spends career funds');
sandbox.ctx.recovering = true; sandbox.service.step(1 / 60, sandbox.ctx);
assert(['stopping', 'exit-ready'].includes(sandbox.service.snapshot().phase), 'recovery stops passenger ride');
const blockedExit = fixture(); assert(blockedExit.service.book('east-stop', blockedExit.ctx).ok);
advance(blockedExit, snap => snap.phase === 'waiting'); blockedExit.ctx.pose = blockedExit.service.snapshot().pickup.walk;
assert(blockedExit.service.interact(blockedExit.ctx).boarded);
const stoppedCar = blockedExit.service.vehicles[0];
const sideBlocks = [-1, 1].map(side => ({ id: `exit-obstacle-${side}`, active: true,
  x: stoppedCar.x + Math.cos(stoppedCar.yaw) * 2.5 * side,
  z: stoppedCar.z - Math.sin(stoppedCar.yaw) * 2.5 * side,
  yaw: stoppedCar.yaw, length: 8, width: 2 }));
blockedExit.sim.setExternalVehicles([...blockedExit.service.vehicles, ...sideBlocks]);
assert.equal(blockedExit.service.interact(blockedExit.ctx).ok, false, 'both blocked exits cannot teleport the passenger');
assert.equal(blockedExit.service.snapshot().passenger, true);
blockedExit.sim.setExternalVehicles(blockedExit.service.vehicles);
assert(blockedExit.service.cancel(blockedExit.ctx).stopping);
advance(blockedExit, snap => snap.phase === 'exit-ready');
assert(blockedExit.service.interact(blockedExit.ctx).exited); assert.equal(blockedExit.payments(), 1, 'cancel never refunds or grants cash');
const changed = fixture(); assert(changed.service.book('east-stop', changed.ctx).ok);
changed.ctx.sandbox = true; changed.service.step(1 / 60, changed.ctx); assert.equal(changed.service.snapshot().phase, 'cancelled');
const blocked = fixture(); assert(blocked.service.book('east-stop', blocked.ctx).ok);
const driver = blocked.service.vehicles[0], origin = { ...driver };
const obstacle = { id: 'external-bus', active: true, x: driver.x + 7, z: driver.z, yaw: driver.yaw, length: 4.5, width: 2 };
blocked.sim.setExternalVehicles([...blocked.service.vehicles, obstacle]);
advance(blocked, snap => snap.phase === 'failed', 35);
assert.equal(blocked.service.activeFare, 0); assert.equal(blocked.service.snapshot().activeFare, 0);
assert(distance(driver, origin) < 2, 'stopped obstacle is never passed'); assert.equal(blocked.payments(), 0);
const noCashSim = createSimulation(map, { trafficCount: 0 });
const noCash = createRideService(map, noCashSim, { canPay: () => false, pay: () => { throw Error('unexpected spend'); } });
assert.equal(noCash.quote('east-stop', f.ctx).ok, false); assert.equal(noCash.book('east-stop', f.ctx).ok, false);

// The production merge/profile loaders establish routes on the actual directed OSM graph.
const merged = applyRoadProfiles(applyMapExpansion(JSON.parse(await read('data/canberra.json')),
  JSON.parse(await read('data/canberra-north.json'))), JSON.parse(await read('data/road-profiles.json')));
const actual = fixture(merged);
actual.ctx.pose = { ...merged.spawn };
let actualBooking = actual.service.book('local-hop', actual.ctx);
// Try bounded public road approaches if the source spawn is not beside a reachable lane stop.
if (!actualBooking.ok) {
  for (const edge of actual.sim.graph.edges.filter(e => e.length > 90 && roadProfile(e.road).trafficAllowed).slice(0, 80)) {
    actual.ctx.pose = { x: edge.from.x + edge.dx * 65 + edge.dz * (edge.laneOffset + 2),
      z: edge.from.z + edge.dz * 65 - edge.dx * (edge.laneOffset + 2), yaw: edge.yaw };
    actualBooking = actual.service.book('local-hop', actual.ctx);
    if (actualBooking.ok) break;
  }
}
assert(actualBooking.ok, `actual merged/profiled map has a reachable short booking: ${actualBooking.reason}`);
const actualRoute = actual.service.snapshot().route;
assert(actualRoute.every(id => roadProfile(actual.sim.graph.edges[id].road).trafficAllowed));
actualRoute.forEach((id, i) => { if (i) assert.equal(actual.sim.graph.edges[actualRoute[i - 1]].to.id, actual.sim.graph.edges[id].from.id); });
advance(actual, snap => snap.phase === 'waiting', 120);
actual.ctx.pose = actual.service.snapshot().pickup.walk; assert(actual.service.interact(actual.ctx).boarded);
advance(actual, snap => ['arrived', 'exit-ready'].includes(snap.phase), 600);
assert.equal(actual.service.snapshot().phase, 'arrived', 'actual mapped short ride reaches a safe road dropoff');
assert(actual.service.interact(actual.ctx).exited); assert.equal(actual.payments(), 1);
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
console.log('PASS Yoober: actual merged/profiled directed drive and arrival; physical blockers; paused dt; guarded bookings; exactly-once boarding payment; sandbox; recovery/mode cancellation; clear local exits');
