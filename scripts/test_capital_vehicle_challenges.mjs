import assert from 'node:assert/strict';
import { createVehicleChallenge } from '../Games/Capital Drive/vehicle-challenges.js';

const options = { targetId: 'parked:4', anchor: { x: 10, z: -20 }, sandbox: false };
const context = { valid: true, sandbox: false };
function fixture(kind = 'scooter', extra = {}) {
  const game = createVehicleChallenge();
  assert.equal(game.start(kind, { ...options, ...extra }), true);
  return game;
}
const tick = (game, input = {}, dt = 0.02, ctx = context) => game.step(dt, input, ctx);
function cue(game, ctx = context) {
  for (let i = 0; i < 100; i++) {
    const state = game.snapshot();
    if (state.phase === 'cue') return state;
    assert(state.active, state.reason);
    tick(game, {}, 0.02, ctx);
  }
  assert.fail('cue did not open');
}
function result(game, type) {
  const events = game.drainEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, type);
  assert.equal(Object.isFrozen(events[0]), true);
  assert.equal(Object.isFrozen(events[0].anchor), true);
  assert.equal(game.cancel(), false);
  assert.deepEqual(game.drainEvents(), []);
  return events[0];
}

const api = createVehicleChallenge();
assert.equal(api.snapshot().phase, 'idle');
for (const kind of ['bike', 'toString', null, undefined]) assert.equal(api.start(kind, options), false);
for (const extra of [{ targetId: '' }, { targetId: '  ' }, { targetId: 5 }, { anchor: null },
  { anchor: { x: NaN, z: 0 } }, { anchor: { x: 0, z: Infinity } }, { sandbox: undefined }]) {
  assert.equal(api.start('scooter', { ...options, ...extra }), false);
}
assert.equal(api.start('scooter', options), true);
assert.equal(api.start('car', options), false, 'cannot overwrite an active session');
const detached = api.snapshot();
assert.equal(Object.isFrozen(detached), true);
assert.equal(Object.isFrozen(detached.sequence), true);
assert.equal(Object.isFrozen(detached.anchor), true);
assert.throws(() => { detached.sequence[0] = 'bad'; }, TypeError);
options.anchor.x = 999;
assert.equal(api.snapshot().anchor.x, 10, 'input anchor is copied');
options.anchor.x = 10;
assert.deepEqual(api.snapshot().sequence, fixture().snapshot().sequence, 'same target and serial are reproducible');

// Both challenge types require the full sequence, and terminal sessions are retryable.
for (const kind of ['scooter', 'car']) {
  const game = fixture(kind);
  const initial = game.snapshot(), length = kind === 'car' ? 8 : 4;
  assert.equal(initial.sequence.length, length);
  assert.equal(initial.cueWindow, kind === 'car' ? 1 : 1.4);
  assert.equal(initial.maxMistakes, kind === 'car' ? 2 : 3);
  let firstCue;
  for (let index = 0; index < length; index++) {
    const state = cue(game);
    firstCue ??= state.cueRemaining;
    assert.equal(state.index, index);
    assert.equal(state.expectedKey, state.sequence[index]);
    assert(state.cueRemaining > 0);
    const after = tick(game, { [state.expectedKey]: true });
    assert.equal(after.index, index + 1);
    assert.equal(after.progress, (index + 1) / length);
    for (let repeat = 0; repeat < 3; repeat++) tick(game, { [state.expectedKey]: true });
    assert.equal(game.snapshot().index, index + 1, 'held keys cannot score again');
  }
  assert(firstCue <= (kind === 'car' ? 1 : 1.4));
  assert(firstCue > (kind === 'car' ? 0.9 : 1.3));
  const complete = result(game, 'complete');
  assert.equal(complete.targetId, options.targetId); assert.equal(complete.sandbox, false);
  assert.equal(game.snapshot().active, false); assert.equal(game.snapshot().expectedKey, null);
  tick(game, { up: true }, 1000);
  assert.deepEqual(game.drainEvents(), [], 'completed sessions never complete twice');
  assert.equal(game.start(kind, options), true);
  assert(game.snapshot().sessionId > initial.sessionId);
  assert.equal(game.snapshot().progress, 0); assert.equal(game.snapshot().mistakes, 0);
  assert.notDeepEqual(game.snapshot().sequence, initial.sequence, 'a new attempt varies the target sequence');
}

// Early input, wrong input and chords cost attempts and cannot advance a lock.
for (const kind of ['scooter', 'car']) {
  const game = fixture(kind);
  tick(game, { [game.snapshot().expectedKey]: true });
  assert.equal(game.snapshot().index, 0); assert.equal(game.snapshot().mistakes, 1);
  const state = cue(game);
  const wrong = ['x', 'y', 'up'].find(key => key !== state.expectedKey);
  tick(game, { [wrong]: true });
  assert.equal(game.snapshot().index, 0);
  if (kind === 'scooter') {
    cue(game);
    tick(game, { x: true, y: true, up: true });
  }
  result(game, 'failed');
  assert.equal(game.snapshot().mistakes, kind === 'car' ? 2 : 3);
}
{
  const game = fixture();
  cue(game);
  tick(game, { [game.snapshot().expectedKey]: true, x: true, y: true, up: true });
  assert.equal(game.snapshot().mistakes, 1, 'simultaneous fresh edges cannot match one key');
  assert.equal(game.snapshot().index, 0);
}
{
  const game = fixture();
  const expected = game.snapshot().expectedKey;
  tick(game, { [expected]: true }, 0.38);
  assert.equal(game.snapshot().index, 0, 'a prepare-to-cue transition cannot accept an early edge');
  assert.equal(game.snapshot().mistakes, 1);
}
{
  const game = fixture();
  cue(game);
  tick(game, {}, 1.41);
  assert.equal(game.snapshot().mistakes, 1, 'a missed cue costs a mistake');
  cue(game);
  tick(game, { [game.snapshot().expectedKey]: true }, 1.41);
  assert.equal(game.snapshot().index, 0, 'a late press never scores');
  assert.equal(game.snapshot().mistakes, 2);
}
{
  const game = fixture();
  cue(game);
  const state = game.snapshot();
  for (const dt of [0, -1, NaN, Infinity]) tick(game, { [state.expectedKey]: true }, dt);
  assert.deepEqual(game.snapshot(), state, 'paused and invalid dt freeze clocks, index and mistakes');
  tick(game, { [state.expectedKey]: true });
  assert.equal(game.snapshot().index, 0, 'held pause input is consumed rather than scored after resume');
  tick(game);
  tick(game, { [state.expectedKey]: true });
  assert.equal(game.snapshot().index, 1, 'release and a new active edge are required');
}
{
  const game = fixture();
  cue(game);
  const state = game.snapshot();
  tick(game, {}, 24);
  assert.equal(result(game, 'failed').reason, 'Time ran out.');
  assert.equal(game.snapshot().index, state.index, 'large ticks cannot instantly complete');
}

// Changing target validity or mode wins over a simultaneous correct input.
for (const [ctx, reason] of [[{ valid: false, sandbox: false }, 'invalid-context'],
  [{ valid: true, sandbox: true }, 'mode-changed'], [null, 'invalid-context'],
  [{ valid: true }, 'mode-changed']]) {
  const game = fixture();
  const state = cue(game);
  tick(game, { [state.expectedKey]: true }, 0.02, ctx);
  assert.equal(result(game, 'cancel').reason, reason);
  assert.equal(game.snapshot().index, 0);
}
{
  const game = fixture('scooter', { sandbox: true });
  const sandbox = { valid: true, sandbox: true };
  for (let i = 0; i < 4; i++) tick(game, { [cue(game, sandbox).expectedKey]: true }, 0.02, sandbox);
  assert.equal(result(game, 'complete').sandbox, true, 'practice results remain tagged');
}
{
  const game = fixture();
  assert.equal(game.cancel('left-target'), true);
  assert.equal(result(game, 'cancel').reason, 'left-target');
  assert.equal(game.snapshot().phase, 'cancelled');
  assert.equal(game.start('car', options), true);
  game.clear(); game.clear();
  assert.equal(result(game, 'cancel').reason, 'cleared');
  assert.equal(game.snapshot().phase, 'idle');
  assert.equal(game.start('car', options), true);
}
console.log('PASS vehicle challenges: full scooter/car sequences; timing, early/wrong/late/chord/repeat guards; pause; deadlines; validation/mode cancellation; immutable snapshots; exactly-once events; deterministic varied retries.');
