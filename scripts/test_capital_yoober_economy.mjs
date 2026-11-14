import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { buildRoadGraph, createSimulation } from '../Games/Capital Drive/simulation.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const legacy = { version: 1, cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [] };
const context = (pose = map.spawn, extra = {}) => ({ pose: { ...pose, speed: 0 }, onFoot: false,
  vehicle: { modelId: 'lantern', stolen: false }, vehicleHealth: 100, wanted: 0,
  recovering: false, sandbox: false, respawnSerial: 0, ...extra });
const fixture = (save = null) => {
  const p = createProgression(map, save), job = p.jobs.find(item => item.id === 'yoober-crescent');
  return { p, job, pickup: context(job.stages[0]), drop: context(job.stages[1]) };
};
const stop = (p, ctx, ticks = 40) => { for (let i = 0; i < ticks; i++) p.update(.05, ctx); };
const denied = (p, action) => { const before = p.serialize(); assert.equal(action().ok, false); assert.deepEqual(p.serialize(), before); };

{
  const p = createProgression(map, legacy);
  assert.equal(p.state.equipment.pistol, false);
  assert.deepEqual(createProgression(map, p.serialize()).serialize(), p.serialize());
  const oldIds = ['crescent-parcel', 'crescent-circuit', 'wagon-recovery', 'clear-the-search', 'franklin-delivery', 'kennedy-delivery', 'priority-parcel'];
  assert.deepEqual(createProgression(map, { ...legacy, completedJobs: oldIds }).state.completedJobs, oldIds);
  for (const change of [{ version: 2 }, { cash: -1 }, { completedJobs: ['yoober-fake'] },
    { completedJobs: ['yoober-crescent', 'yoober-crescent'] }, { completedJobs: ['priority-parcel'] }, { passenger: true }])
    assert.throws(() => createProgression(map, { ...legacy, ...change }));
}
const rides = createProgression(map).jobs.filter(job => job.type === 'ride');
assert(rides.length >= 2 && rides.length <= 3);
for (const job of rides) {
  assert.equal(job.legitimate, true); assert.equal(job.stages.length, 2);
  for (const stage of job.stages) {
    const road = map.roads.find(item => item.id === stage.roadId);
    assert(road && road.name && road.type !== 'service');
    assert(road.points.some(([x, z]) => x === stage.x && z === stage.z), 'fare stops are exact public source vertices');
  }
  const p = createProgression(map), pickup = context(job.stages[0]), drop = context(job.stages[1]);
  assert(p.startJob(job.id, pickup).ok);
  assert.equal(p.state.activeJob.passenger, false); assert.equal(p.state.activeJob.stage, 0);
  stop(p, drop, 50); assert.equal(p.state.activeJob.stage, 0, 'drop cannot skip pickup');
  stop(p, pickup, 39); assert.equal(p.state.activeJob.passenger, false, 'pickup needs two seconds');
  p.update(0, pickup); assert.equal(p.state.activeJob.passenger, false, 'paused clocks cannot board');
  stop(p, pickup, 1); assert.equal(p.state.activeJob.passenger, true); assert.equal(p.state.activeJob.stage, 1);
  assert.equal(p.state.activeJob.modelId, 'lantern');
  stop(p, drop, 39); assert.equal(p.state.cash, 1000, 'drop-off needs two seconds');
  stop(p, drop, 1); assert.equal(p.state.activeJob, null); assert.equal(p.state.cash, 1000 + job.reward);
  stop(p, drop, 100); assert.equal(p.state.cash, 1000 + job.reward, 'fare pays exactly once');
  const events = p.drainEvents(); assert.equal(events.filter(event => event.type === 'job-complete').length, 1);
  assert.equal(p.drainEvents().length, 0);
  assert.deepEqual(createProgression(map, p.serialize()).serialize(), p.serialize());
  assert(p.startJob(job.id, pickup).ok); stop(p, pickup); stop(p, drop);
  assert.equal(p.state.cash, 1000 + 2 * job.reward); assert.deepEqual(p.state.completedJobs, [job.id]);
}
for (const extra of [{ onFoot: true }, { wanted: 1 }, { sandbox: true }, { recovering: true }, { vehicleHealth: 49 },
  { vehicleHealth: 101 }, { vehicle: { modelId: 'atlas', stolen: false } },
  { vehicle: { modelId: 'orchard', stolen: false } }, { vehicle: { modelId: 'lantern', stolen: true } },
  { vehicle: { modelId: 'lantern' } }, { pose: { x: NaN, z: 0 } }]) {
  const { p, job, pickup } = fixture();
  denied(p, () => p.startJob(job.id, { ...pickup, ...extra }));
  assert(p.rideEligibility({ ...pickup, ...extra }).length > 0, 'denial has a concise reason');
}
for (const id of ['lantern', 'orchard', 'gravel', 'relay', 'atlas']) {
  const cars = id === 'lantern' ? legacy.ownedVehicles : [...legacy.ownedVehicles, { ...legacy.ownedVehicles[0], id }];
  const { p, job, pickup } = fixture({ ...legacy, ownedVehicles: cars });
  assert.equal(p.startJob(job.id, { ...pickup, vehicle: { modelId: id, stolen: false } }).ok, id !== 'atlas');
}
{
  const { p, job, pickup } = fixture({ ...legacy, ownedVehicles: [{ ...legacy.ownedVehicles[0], stored: true }] });
  denied(p, () => p.startJob(job.id, pickup));
}
for (const extra of [{ pose: { ...map.spawn, speed: 5 } }, { pose: { ...map.spawn, speed: -5 } },
  { pose: { x: -342.84, z: -382.24 } }, { onFoot: true }, { wanted: 1 },
  { vehicleHealth: 20 }, { vehicle: { modelId: 'lantern', stolen: true } }]) {
  const { p, job, pickup } = fixture(); assert(p.startJob(job.id, pickup).ok);
  stop(p, pickup, 30); p.update(.05, { ...pickup, ...extra });
  assert.equal(p.state.activeJob.stopTime, 0, 'movement/eligibility loss resets a contiguous pickup');
  stop(p, pickup, 39); assert.equal(p.state.activeJob.passenger, false); stop(p, pickup, 1);
  assert.equal(p.state.activeJob.passenger, true);
}
{
  const { p, job, pickup } = fixture(); assert(p.startJob(job.id, pickup).ok);
  p.update(3, pickup); assert.equal(p.state.activeJob.passenger, false, 'one long tick cannot board');
  assert.equal(p.state.activeJob.stopTime, .1);
}
{
  const cars = [...legacy.ownedVehicles, { ...legacy.ownedVehicles[0], id: 'orchard' }];
  const { p, job, pickup, drop } = fixture({ ...legacy, ownedVehicles: cars });
  const wagon = { ...pickup, vehicle: { modelId: 'orchard', stolen: false } };
  assert(p.startJob(job.id, pickup).ok); stop(p, pickup, 30); stop(p, wagon, 1);
  assert.equal(p.state.activeJob.stopTime, .05, 'changing even a legal owned car restarts the pickup stop');
  stop(p, wagon, 39); assert.equal(p.state.activeJob.modelId, 'orchard');
  p.update(.05, drop); assert.equal(p.state.activeJob, null, 'returning in another owned model cannot deliver this passenger');
  assert.equal(p.state.cash, 1000);
}
{
  const { p, job, pickup, drop } = fixture(); assert(p.startJob(job.id, pickup).ok); stop(p, pickup);
  stop(p, drop, 30); p.update(.05, { ...drop, pose: { ...drop.pose, speed: .81 } });
  assert.equal(p.state.activeJob.stopTime, 0, 'drop-off motion resets its own contiguous clock');
  stop(p, { ...drop, pose: { ...drop.pose, speed: -.8 } }, 39); assert.equal(p.state.cash, 1000);
  stop(p, { ...drop, pose: { ...drop.pose, speed: .8 } }, 1); assert.equal(p.state.cash, 1000 + job.reward);
}
for (const extra of [{ onFoot: true }, { wanted: 5 }, { sandbox: true }, { recovering: true }, { respawnSerial: 1 },
  { vehicleHealth: 0 }, { vehicle: { modelId: 'lantern', stolen: true } },
  { vehicle: { modelId: 'orchard', stolen: false } }, { pose: { x: NaN, z: 0 } }]) {
  const { p, job, pickup, drop } = fixture(); assert(p.startJob(job.id, pickup).ok); stop(p, pickup);
  p.update(.05, { ...drop, ...extra }); assert.equal(p.state.activeJob, null, 'passenger safety failure ends the fare');
  stop(p, drop); assert.equal(p.state.cash, 1000); assert.deepEqual(p.state.completedJobs, []);
}
for (const action of ['cancel', 'penalty', 'timeout']) {
  const { p, job, pickup, drop } = fixture(); assert(p.startJob(job.id, pickup).ok); stop(p, pickup);
  if (action === 'cancel') p.cancelJob(); else if (action === 'penalty') p.penalize(); else p.update(job.time + 1, drop);
  const cash = p.state.cash; stop(p, drop); assert.equal(p.state.cash, cash); assert.deepEqual(p.state.completedJobs, []);
  assert.equal(createProgression(map, p.serialize()).state.activeJob, null);
}
{
  const { p, job, pickup, drop } = fixture({ ...legacy, cash: 999999990 });
  assert(p.startJob(job.id, pickup).ok); stop(p, pickup); stop(p, drop); assert.equal(p.state.cash, 1000000000);
}
{
  const { p, pickup } = fixture(), foot = { ...pickup, onFoot: true };
  for (const amount of [7, 401, 0, -1, 8.1, Infinity, NaN, '20', 1000000000]) denied(p, () => p.payRide(amount, foot));
  for (const extra of [{ onFoot: false }, { wanted: 5 }, { sandbox: true }, { recovering: true }, { respawnSerial: -1 }, { pose: null }])
    denied(p, () => p.payRide(20, { ...foot, ...extra }));
  assert(p.payRide(8, foot).ok); assert.equal(p.state.cash, 992);
  assert(p.payRide(400, foot).ok); assert.equal(p.state.cash, 592);
  assert.deepEqual(createProgression(map, p.serialize()).serialize(), p.serialize());
  assert.equal(p.drainEvents().filter(event => event.type === 'ride-purchase').length, 2);
  const poor = createProgression(map, { ...legacy, cash: 7 }); denied(poor, () => poor.payRide(8, foot));
  assert(p.startJob('crescent-parcel', pickup).ok); denied(p, () => p.payRide(8, foot));
  p.cancelJob(); const gym = p.services.find(site => site.type === 'gym');
  const atGym = context(gym, { onFoot: true }); assert(p.startActivity(gym.id, 'workout', atGym).ok);
  denied(p, () => p.payRide(8, foot)); denied(p, () => p.startJob('yoober-crescent', pickup));
}
{
  const p = createProgression(map), food = p.services.find(site => site.type === 'food'), arms = p.services.find(site => site.type === 'arms');
  const wanted = site => context(site, { onFoot: true, wanted: 5, health: 60 });
  const buyFood = p.purchaseService(food.id, 'food', wanted(food)); assert(buyFood.ok); assert.equal(p.state.cash, 1000 - buyFood.cost);
  const buyGun = p.purchaseService(arms.id, 'pistol', wanted(arms)); assert(buyGun.ok); assert.equal(p.state.cash, 1000 - buyFood.cost - buyGun.cost);
  const gym = p.services.find(site => site.type === 'gym'); denied(p, () => p.startActivity(gym.id, 'workout', wanted(gym)));
  denied(p, () => p.payRide(8, wanted(food)));
}
{
  const { p, job } = fixture(), sim = createSimulation(map, { trafficCount: 0 });
  const graph = buildRoadGraph(map.roads), route = findRoute(graph, job.stages[0], job.stages[1]);
  assert(route.length >= 2, 'local fare has a legal directed public road route');
  assert(Math.hypot(map.spawn.x - job.stages[0].x, map.spawn.z - job.stages[0].z) < 15, 'local pickup is beside the actual spawn');
  assert(p.startJob(job.id, context(sim.player)).ok);
  for (const target of job.stages) {
    for (let frame = 0; frame < 1800; frame++) {
      const car = sim.player, distance = Math.hypot(car.x - target.x, car.z - target.z);
      const desired = Math.atan2(-(target.x - car.x), -(target.z - car.z));
      const delta = Math.atan2(Math.sin(desired - car.yaw), Math.cos(desired - car.yaw));
      sim.step(1 / 60, distance < 7 ? { brake: true } : { throttle: car.speed < 4 ? .4 : 0, steer: Math.max(-1, Math.min(1, -delta * 2)) });
      p.update(1 / 60, context(sim.player, { pose: { ...sim.player } }));
      if (!p.state.activeJob || p.state.activeJob.stage === 1 && target === job.stages[0]) break;
    }
  }
  assert.equal(p.state.activeJob, null, 'actual-map spawn-to-drop physics can finish the nearby local run');
  assert.equal(p.state.cash, 1000 + job.reward);
}
console.log('PASS Yoober economy: source public-road short/long fares; actual-map local driving; contiguous stopped boarding/drop-off; legal owned four-door guards; passenger failures/cancel/respawn; exactly-once capped recurring pay; legacy v1 saves; bounded booking debit; five-star food/weapon trading.');
