// Run: node Games/Getaway/verification/check-solo.mjs
import assert from 'node:assert/strict';
import { LocalSession } from './sim.mjs';
globalThis.location = { search: '' };
const picks = { robber: 'muscle', cop: 'cruiser' };
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
const chase = new LocalSession('Dax', picks);
assert.equal(chase.peaceful, false);
assert.equal(chase.world.cops().length, 4);
assert.equal(chase.world.robber().vehicle.id, 'muscle');
const copStart = chase.world.cops().map(c => ({ x: c.body.x, z: c.body.z }));
let pursued = false, ended = false, endTime = 0;
for (let i = 0; i < 60 * 300; i++) {
  chase.update(1 / 60, idle);
  if (chase.world.phase === 'chase') pursued ||= chase.world.cops().some((c, j) => Math.hypot(c.body.x-copStart[j].x, c.body.z-copStart[j].z) > 10);
  if (chase.world.phase === 'end') { ended = true; endTime = chase.world.t; break; }
}
assert(pursued, 'Bot cops never moved during pursuit');
assert(ended && (chase.world.busted || chase.world.escaped), 'No original round result');
console.log(`PASS: offline chase, 4 bot cops pursued; ${chase.world.busted ? 'busted' : 'escaped'} at ${endTime.toFixed(2)}s with ordinary idle input.`);
for (let i = 0; i < 60 * 30 && chase.world.round === 0; i++) chase.update(1 / 60, idle);
assert.equal(chase.world.round, 1);
assert.equal(chase.world.carOf('me').vehicle.id, 'cruiser');
const fresh = new LocalSession('Dax', picks);
assert.equal(fresh.world.round, 0);
assert.equal(fresh.world.t, 0);
assert.equal(fresh.world.busted, false);
assert.equal(fresh.world.phase, 'intro');
assert.equal(fresh.room, null);
console.log('PASS: next round uses cruiser cop pick; restart creates fresh intro, time 0, round 0.');
const selected = new LocalSession('Dax', { robber: 'compact', cop: 'interceptor' });
assert.equal(selected.world.robber().vehicle.id, 'compact');
location.search = '?peaceful=1';
const run = () => {
  const session = new LocalSession('Dax', picks);
  const drive = { ...idle, throttle: 1 };
  const start = session.update(0, drive).cars[0];
  let view;
  for (let i = 0; i < 120; i++) view = session.update(1 / 60, drive);
  const distance = Math.hypot(view.cars[0].x - start.x, view.cars[0].z - start.z);
  assert(distance > 1);
  for (let i = 120; i < 18000; i++) view = session.update(1 / 60, { ...drive, steer: Math.sin(i / 120) * 0.3 });
  assert.equal(session.city.seed, 7);
  assert.equal(session.world.phase, 'waiting');
  assert.equal(session.world.cops().length, 0);
  assert.equal(session.world.heli.active, false);
  assert.equal(view.cars.length, 1);
  assert.equal(session.room, null);
  assert.equal(session.status(), 'free drive');
  assert(view.t > 299);
  assert([view.cars[0].x, view.cars[0].z, view.cars[0].speed].every(Number.isFinite));
  return { distance, view };
};
const first = run();
assert.deepEqual(run(), first);
console.log(`PASS: explicit free drive, seed 7; moved ${first.distance.toFixed(2)}m in 2s; deterministic 300s; no cops or round end. Rendering not tested.`);
