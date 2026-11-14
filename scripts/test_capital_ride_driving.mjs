import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createRideService } from '../Games/Capital Drive/ride-service.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
const read = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`, import.meta.url), 'utf8'));
const map = applyRoadProfiles(applyMapExpansion(await read('canberra.json'), await read('canberra-north.json')), await read('road-profiles.json'));
const fixture = (source = map) => {
  const sim = createSimulation(source, { trafficCount: 0 }); sim.player.active = false;
  const ride = createRideService(source, sim, { pay: () => true, canPay: () => true }); sim.setExternalVehicles(ride.vehicles);
  return { sim, ride, ctx: { pose: { ...source.spawn }, onFoot: true, sandbox: false, wanted: 0 } };
};
function advance(f, predicate, limit = 120) {
  let ticks = 0, slow = 0;
  while (!predicate(f.ride) && ticks < limit * 60) {
    const car = f.ride.vehicles[0], before = { ...car }; f.ride.step(1 / 60, f.ctx); ticks++;
    assert(Math.hypot(car.x - before.x, car.z - before.z) <= 10.01 / 60, 'bounded physical motion');
    if (car.active) assert(f.sim.canOccupy(car, { length: car.length, width: car.width, ignoreId: car.id }), 'whole car stays physically clear, including yaw');
    if (car.speed < 2) slow++;
  }
  assert(predicate(f.ride), `${f.ride.phase}: ${f.ride.snapshot().reason}`);
  return { seconds: ticks / 60, slowSeconds: slow / 60 };
}
const actual = fixture();
assert(actual.ride.book('local-hop', actual.ctx).ok); assert.equal(actual.ride.snapshot().booking.metres, 534);
advance(actual, s => s.phase === 'waiting'); actual.ctx.pose = actual.ride.snapshot().pickup.walk;
assert(actual.ride.interact(actual.ctx).boarded);
const paused = actual.ride.snapshot(); actual.ride.step(0, actual.ctx); assert.deepEqual(actual.ride.snapshot(), paused);
const benchmark = advance(actual, s => s.phase === 'arrived', 110);
// Pre-change replay of this same source-map route measured135.15s,32.88s below2m/s.
assert(benchmark.seconds < 110 && benchmark.slowSeconds < 20, 'continuous OSM traversal improves the recorded legacy 534m route');
assert(actual.ride.interact(actual.ctx).exited);
const roads = [
  { id: 'east', points: [[0, 0], [180, 0], [360, 0]], nodes: [1, 2, 3], oneway: 1, width: 11 },
  { id: 'south', points: [[360, 0], [360, 250]], nodes: [3, 4], oneway: 1, width: 11 },
  { id: 'west', points: [[360, 250], [0, 250]], nodes: [4, 5], oneway: 1, width: 11 },
  { id: 'north', points: [[0, 250], [0, 0]], nodes: [5, 1], oneway: 1, width: 11 }];
const small = { roads, bounds: { minX: -200, minZ: -200, maxX: 600, maxZ: 600 }, buildings: [],
  spawn: { x: 100, z: -5, yaw: 0 }, landmarks: [{ id: 'corner', name: 'Corner stop', x: 360, z: 180 }] };
const corner = fixture(small); assert(corner.ride.book('corner', corner.ctx).ok);
advance(corner, s => s.phase === 'waiting'); corner.ctx.pose = corner.ride.snapshot().pickup.walk;
assert(corner.ride.interact(corner.ctx).boarded); advance(corner, s => s.phase === 'arrived');
for (const kind of ['bus', 'stationary-car']) {
  const f = fixture(small); assert(f.ride.book('corner', f.ctx).ok);
  const car = f.ride.vehicles[0], start = { ...car };
  f.sim.setExternalVehicles([...f.ride.vehicles, { id: kind, kind, x: car.x + 8, z: car.z, yaw: car.yaw,
    length: kind === 'bus' ? 10.6 : 4.5, width: kind === 'bus' ? 2.45 : 1.8, active: true }]);
  advance(f, s => s.phase === 'failed', 35); assert(Math.hypot(car.x - start.x, car.z - start.z) < 2);
}
const signal = fixture(small); assert(signal.ride.book('corner', signal.ctx).ok);
const signalCar = signal.ride.vehicles[0], line = signalCar.x + 14;
let red = true, calls = 0;
signal.sim.trafficLights = { stopDistance(car, { length }) { calls++; assert.equal(length, car.length, 'signal braking uses the actual external car body length'); return red ? Math.max(0, line - car.x) : Infinity; } };
for (let i = 0; i < 60 * 10; i++) signal.ride.step(1 / 60, signal.ctx);
assert(calls > 0 && signalCar.x <= line && signalCar.speed < .1, 'red/amber cap actual displacement at the stop line');
red = false; advance(signal, s => s.phase === 'waiting');
const rage = fixture(small);
for (let n = 0; n < 2; n++) { assert(rage.ride.book('corner', rage.ctx).ok); rage.ride.cancel(rage.ctx); assert(!rage.ride.snapshot().driver.active); }
assert(rage.ride.book('corner', rage.ctx).ok); advance(rage, s => s.phase === 'waiting');
rage.ctx.pose = { ...rage.ride.snapshot().car, z: rage.ride.snapshot().car.z + 5 };
const cancelled = rage.ride.cancel(rage.ctx); assert(cancelled.ok); assert(rage.ride.snapshot().driver.active);
assert.equal(rage.ride.activeFare, 0); assert.equal(rage.ride.vehicles[0].occupied, false);
assert(rage.ride.drainEvents().some(e => e.type === 'driver-rage' && e.reason.includes('angry')));
const still = rage.ride.snapshot(); rage.ride.step(0, rage.ctx); assert.deepEqual(rage.ride.snapshot(), still);
for (let i = 0; i < 60 * 5; i++) rage.ride.step(1 / 60, rage.ctx);
const combat = rage.ride.drainCombatEvents(); assert(combat.length > 0 && combat.length <= 5);
for (const event of combat) { assert.equal(event.attackerId, 'yoober-driver-npc'); assert.equal(event.targetId, 'player'); assert.equal(event.damage, 6); assert(!Object.hasOwn(event, 'offenderId')); }
assert.equal(rage.ride.drainCombatEvents().length, 0);
const d = rage.ride.snapshot().driver;
const clipped = rage.ride.clipMovement({ x: d.x - 3, z: d.z }, 6, 0, .45);
assert(clipped.blocked && clipped.dx < 3, 'swept player collision cannot pass through the out-of-car driver');
assert.equal(rage.ride.clipMovement({ x: d.x - 3, z: d.z }, -1, 0).blocked, false, 'moving away remains free');
const strike = rage.ride.strike({ x: d.x, z: d.z + 1, yaw: 0, range: 3, damage: 30, kind: 'firearm' });
assert.equal(strike.hits, 1); assert.equal(rage.ride.strike({ x: d.x, z: d.z + 1, yaw: 0, range: 3, damage: 30 }).hits, 0, 'hit cooldown prevents same-frame pellet spam');
for (let i = 0; i < 60 * 16; i++) rage.ride.step(1 / 60, rage.ctx);
assert(!rage.ride.snapshot().driver.active, 'one out-of-car adult expires within15s');
for (const change of [{ sandbox: true }, { recovering: true }, { pose: { x: -100, z: -100 } }]) {
  const f = fixture(small); for (let n = 0; n < 3; n++) { assert(f.ride.book('corner', f.ctx).ok); if (n === 2) Object.assign(f.ctx, change); f.ride.cancel(f.ctx); }
  assert(!f.ride.snapshot().driver.active, 'sandbox/recovery/remote cancellation cannot provoke');
}
const THREE = await import('../assets/car-arcade/vendor/three.module.js');
const { createRideServiceView } = await import('../Games/Capital Drive/ride-service-view.js');
const scene = new THREE.Scene(), view = createRideServiceView(scene, () => 0);
view.update({ car: { ...rage.ride.vehicles[0], active: true }, driver: { ...d, active: true } },
  { focus: d, job: { type: 'ride', stage: 0, target: { ...d, x: d.x + 3 } } });
assert.equal(view.stats.drivers, 1); assert.equal(view.stats.waiting, 1);
assert.equal(view.stats.batches, 3); assert.equal(view.stats.driverBatches, 0, 'driver reuses bounded waiting-adult batch');
assert.equal(scene.getObjectByName('Waiting fare adult').count, 2);
view.dispose(); view.dispose(); assert.equal(scene.children.length, 0);
console.log(`PASS Yoober driving: actual534m ${benchmark.seconds.toFixed(2)}s / ${benchmark.slowSeconds.toFixed(2)}s slow vs legacy135.15s /32.88s; corner/body clearance, bus/car yields, red/amber movement cap, pause; bounded nearby-cancel adult, cooldown/attribution/hits and safe exclusions`);
