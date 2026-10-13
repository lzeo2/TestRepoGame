// Run: node Games/Getaway/verification/check-solo.mjs
import assert from 'node:assert/strict';
import { LocalSession } from './sim.mjs';
globalThis.location = { search: '' };
const drive = { throttle: 1, brake: 0, steer: 0, handbrake: false, boost: false };
const run = () => {
  const session = new LocalSession('Dax', { robber: 'muscle', cop: 'cruiser' });
  const start = session.update(0, drive).cars[0];
  let view;
  for (let i = 0; i < 120; i++) view = session.update(1 / 60, drive);
  const distance = Math.hypot(view.cars[0].x - start.x, view.cars[0].z - start.z);
  assert(distance > 1, `Car did not move: ${distance}`);
  for (let i = 120; i < 18000; i++) view = session.update(1 / 60, { ...drive, steer: Math.sin(i / 120) * 0.3 });
  assert.equal(session.city.seed, 7);
  assert.equal(session.world.phase, 'waiting');
  assert.equal(session.world.cops().length, 0);
  assert.equal(session.world.heli.active, false);
  assert.equal(view.cars.length, 1);
  assert.equal(session.room, null);
  assert.equal(session.status(), 'solo');
  assert(view.t > 299);
  assert([view.cars[0].x, view.cars[0].z, view.cars[0].speed].every(Number.isFinite));
  return { distance, view };
};
const first = run();
assert.deepEqual(run(), first);
console.log(`PASS: default seed 7; moved ${first.distance.toFixed(2)}m in 2s; deterministic 300s; one car; no cops, helicopter, server or round end.`);
