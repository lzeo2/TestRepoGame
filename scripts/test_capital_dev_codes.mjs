import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createProgression } from '../Games/Capital Drive/progression.js';

const map = JSON.parse(await fs.readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const code = 'alopsd';
const limit = 1_000_000_000;
const ctx = extra => ({ pose: { ...map.spawn }, onFoot: false, vehicle: { modelId: 'lantern', stolen: false }, vehicleHealth: 37, wanted: 0, respawnSerial: 0, ...extra });
const withoutCash = career => {
  const { cash, ...saved } = career.serialize();
  return saved;
};

for (const input of [code, ` \t${code}\n`, code.toUpperCase()]) {
  const career = createProgression(map);
  const before = withoutCash(career);
  const result = career.redeemDevCode(input, ctx({ onFoot: true, wanted: 5, pose: { x: 9000, z: 9000 } }));
  assert.equal(result.ok, true, 'valid developer input works without location, vehicle or wanted restrictions');
  assert.equal(result.cash, limit);
  assert.equal(career.state.cash, limit);
  assert.deepEqual(withoutCash(career), before, 'credit preserves all other saved career data');
  assert.equal(result.message.toLowerCase().includes(code), false, 'feedback never reveals the input');
  assert.equal(career.drainEvents().at(-1).type, 'dev-credit');
  assert.deepEqual(createProgression(map, career.serialize()).serialize(), career.serialize(), 'credited save reloads through existing validation');
}

const malformed = [undefined, null, true, false, 0, limit, NaN, {}, [], new String(code), '', ' ', 'unknown', `${code}!`, `${code} extra`, `x${code}`];
for (const input of malformed) {
  const career = createProgression(map);
  const before = career.serialize();
  assert.equal(career.redeemDevCode(input, ctx()).ok, false);
  assert.deepEqual(career.serialize(), before, 'invalid input preserves the saved career');
}

for (const context of [undefined, null, {}, ctx({ pose: { x: NaN, z: 0 } }), ctx({ onFoot: 'yes' }), ctx({ wanted: 6 }), ctx({ vehicleHealth: Infinity }), ctx({ respawnSerial: -1 }), ctx({ sandbox: true }), ctx({ recovering: true })]) {
  const career = createProgression(map);
  career.startJob('crescent-parcel', ctx());
  const before = career.serialize(), active = structuredClone(career.state.activeJob);
  assert.equal(career.redeemDevCode(code, context).ok, false);
  assert.deepEqual(career.serialize(), before, 'blocked contexts preserve the saved career');
  assert.deepEqual(career.state.activeJob, active, 'blocked contexts preserve the active job');
}

const career = createProgression(map);
assert.equal(career.startJob('crescent-parcel', ctx()).ok, true);
career.update(1, ctx());
const active = structuredClone(career.state.activeJob), garage = structuredClone(career.state.ownedVehicles);
assert.equal(career.redeemDevCode(code, ctx()).ok, true);
assert.deepEqual(career.state.activeJob, active, 'credit cannot advance, cancel or reset an active job');
assert.deepEqual(career.state.completedJobs, []);
assert.deepEqual(career.state.ownedVehicles, garage, 'credit cannot repair or reset the garage');
for (let i = 0; i < 3; i++) assert.equal(career.redeemDevCode(code, ctx()).ok, true);
assert.equal(career.state.cash, limit, 'repeated redemption is capped and idempotent');
career.update(1, ctx({ pose: active.target }));
assert.equal(career.state.cash, limit, 'normal rewards still saturate at the wallet cap');
assert.deepEqual(career.state.completedJobs, ['crescent-parcel'], 'active job still completes through normal progression');

const training = createProgression(map);
const gym = training.services.find(site => site.type === 'gym');
assert.equal(training.startActivity(gym.id, 'workout', ctx({ pose: gym, onFoot: true })).ok, true);
const activity = structuredClone(training.state.activity);
training.redeemDevCode(code, ctx());
assert.deepEqual(training.state.activity, activity, 'credit preserves active training and its pending cost');
assert.equal(training.state.fitnessLevel, 0, 'credit does not complete training');

console.log('Capital developer codes: input, context, capped credit, save reload and progression preservation checks passed.');
