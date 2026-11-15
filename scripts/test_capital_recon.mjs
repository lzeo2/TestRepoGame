import assert from 'node:assert/strict';
import { createRecon } from '../Games/Capital Drive/recon.js';
const active = { id: 'survey', stage: 0, target: { kind: 'recon', targetId: 'notice' } };
const descriptor = { x: 0, z: 8, y: 1.6, targetId: 'notice', space: null, hold: 1.1 };
const live = { pose: { x: 0, z: 0, speed: 0 }, yaw: Math.PI, pitch: 0, onFoot: true, health: 100,
  campaign: true, sandbox: false, missionId: 'survey', stage: 0, respawnSerial: 0, space: null, scan: false, hasLineOfSight: () => true };
const observe = (recon, context = live, frames = 14) => { for (let i = 0; i < frames; i++) recon.step(.1, context); };
const recon = createRecon(); recon.setObjective(active, descriptor);
observe(recon); assert.equal(recon.snapshot().ready, true); assert.equal(recon.snapshot().receipt, null, 'passive looking never completes recon');
recon.step(.1, { ...live, scan: true });
const [receipt] = recon.drainEvents();
assert.deepEqual(receipt, { serial: 1, missionId: 'survey', stage: 0, targetId: 'notice', space: null, kind: 'recon', outcome: 'documented' });
assert(Object.isFrozen(receipt)); observe(recon, { ...live, scan: true }); assert.deepEqual(recon.drainEvents(), []);
for (const bad of [
  { yaw: 0 }, { pitch: .7 }, { pose: { x: 0, z: 0, speed: 1 } }, { pose: { x: 0, z: -40 } },
  { hasLineOfSight: () => false }, { hasLineOfSight: undefined }, { onFoot: false }, { space: 'room' },
  { missionId: 'other' }, { stage: 1 }, { paused: true }, { recovering: true }, { campaign: false }, { sandbox: true }, { health: 0 },
]) {
  const trial = createRecon(); trial.setObjective(active, descriptor); observe(trial, { ...live, ...bad });
  trial.step(.1, { ...live, ...bad, scan: true });
  assert.equal(trial.snapshot().receipt, null, JSON.stringify(bad)); assert.deepEqual(trial.drainEvents(), []);
}
const held = createRecon(); held.setObjective(active, descriptor); observe(held, { ...live, scan: true }, 30);
assert.equal(held.snapshot().receipt, null, 'holding scan before framing cannot complete');
held.step(.1, live); held.step(.1, { ...live, scan: true }); assert(held.snapshot().receipt);
const paused = createRecon(); paused.setObjective(active, descriptor); observe(paused); paused.step(.1, { ...live, paused: true });
paused.step(.1, { ...live, scan: true }); assert.equal(paused.snapshot().receipt, null, 'pause clears steadiness and scan baseline');
const recovery = createRecon(); recovery.setObjective(active, descriptor); observe(recovery); recovery.step(.1, { ...live, respawnSerial: 1, scan: true }); assert.equal(recovery.snapshot().receipt, null);
const moving = createRecon(); moving.setObjective(active, descriptor);
for (let i = 0; i < 30; i++) moving.step(.1, { ...live, pose: { x: (i % 2) * .6, z: 0 } });
assert.equal(moving.snapshot().ready, false, 'slow pose drift resets the stable view');
recon.setObjective({ ...active, stage: 1, target: { kind: 'recon', targetId: 'exit' } }, { ...descriptor, targetId: 'exit' });
assert.equal(recon.snapshot().receipt, null); assert.equal(recon.snapshot().held, 0);
recon.clear(); assert.equal(recon.snapshot().active, false); assert.deepEqual(recon.drainEvents(), []);
assert.throws(() => recon.step(NaN, live));
console.log('Capital recon: supplied time, steady yaw/pitch, physical sight, fresh scan edge, mission/space binding, interruption and once-only receipt PASS');
