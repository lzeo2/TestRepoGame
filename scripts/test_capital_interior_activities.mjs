import assert from 'node:assert/strict';
import { createInteriorActivities } from '../Games/Capital Drive/interior-activities.js';

const kinds = ['bench', 'noodle', 'stock', 'tv', 'cooking', 'rest', 'arcade'];
const stations = kinds.map((kind, i) => ({ id: kind, kind, label: `Play ${kind}`, x: i * 10, z: 2, yaw: 0, radius: 1.8 }));
const plan = { id: 'test-room', activities: stations };
const recipe = { noodle: ['x', 'y', 'up', 'x', 'up', 'y'], cooking: ['x', 'x', 'y', 'up', 'y', 'up'], stock: ['x', 'up', 'y', 'x'] };
const grip = { x: true, y: true };
const context = (kind, extra = {}) => ({ pose: { ...stations.find(s => s.kind === kind) }, onFoot: true, wanted: 0, recovering: false, sandbox: false, ...extra });
function fixture(kind, extra = {}) {
  const game = createInteriorActivities();
  assert.equal(game.load(plan), 7);
  const ctx = context(kind, extra);
  assert.equal(game.start(kind, ctx), true);
  return { game, ctx };
}
function tick(game, ctx, held = {}, dt = 0.05) { return game.step(dt, held, ctx); }
function waitPhase(game, ctx, phase, held = {}) {
  for (let i = 0; i < 300; i++) {
    const state = game.snapshot();
    if (state.phase === phase) return state;
    assert(state.active, `expected ${phase}, got ${state.phase}: ${state.reason}`);
    tick(game, ctx, held);
  }
  assert.fail(`did not reach ${phase}`);
}
function press(game, ctx, key) { tick(game, ctx); return tick(game, ctx, { [key]: true }); }
function assertSingleResult(game, type) {
  const result = game.drainEvents();
  assert.equal(result.length, 1);
  assert.equal(result[0].type, type);
  assert.equal(game.cancel(), false);
  assert.deepEqual(game.drainEvents(), []);
  return result[0];
}

const api = createInteriorActivities();
assert.equal(api.snapshot().phase, 'idle');
assert.equal(api.nearest(null), null);
assert.equal(api.load({ id: 'bad', activities: [{ id: 'bad', kind: 'bench', x: NaN, z: 0 }, ...stations, stations[0]] }), 7);
const nearest = api.nearest(stations[0]);
nearest.x = 999;
assert.equal(api.nearest(stations[0]).x, 0, 'nearest is detached');
assert.equal(api.nearest({ x: 500, z: 500 }), null);
assert.equal(api.start('unknown', context('bench')), false);
for (const extra of [{ onFoot: false }, { wanted: 1 }, { wanted: NaN }, { recovering: true }, { pose: { x: 999, z: 999 } }, { pose: null }]) {
  assert.equal(api.start('bench', context('bench', extra)), false, JSON.stringify(extra));
}
assert.equal(api.start('bench', context('bench')), true);
assert.equal(api.start('rest', context('rest')), false, 'cannot overlap sessions');
const detached = api.snapshot();
detached.station.x = 999; detached.stations.length = 0;
assert.equal(api.snapshot().station.x, 0);
assert.equal(api.snapshot().stations.length, 7);
api.clear(); api.clear();
assert.equal(assertSingleResult(api, 'cancel').reason, 'room-cleared');
assert.equal(api.snapshot().stations.length, 0);

// Timed rest advances only on supplied active time and never on input.
{
  const { game, ctx } = fixture('rest');
  const before = game.snapshot();
  for (let i = 0; i < 20; i++) tick(game, ctx, { up: true }, 0);
  assert.deepEqual(game.snapshot(), before, 'paused clocks and scores remain frozen');
  tick(game, ctx, {}, NaN); tick(game, ctx, {}, Infinity); tick(game, ctx, {}, -1);
  assert.deepEqual(game.snapshot(), before, 'invalid time cannot progress rest');
  for (let i = 0; i < 161; i++) tick(game, ctx);
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.heal, 20); assert.equal(event.score, 100);
  assert.equal(event.sandbox, false);
  for (let i = 0; i < 100; i++) tick(game, ctx);
  assert.deepEqual(game.drainEvents(), [], 'terminal activity cannot complete again');
  assert.equal(game.start('rest', ctx), true, 'terminal stations are replayable');
  tick(game, { ...ctx, pose: { x: ctx.pose.x + 3, z: ctx.pose.z } }, {}, 20);
  assert.equal(assertSingleResult(game, 'cancel').reason, 'left-station');
}
for (const [extra, reason] of [[{ recovering: true }, 'recovery'], [{ onFoot: false }, 'not-on-foot'], [{ wanted: 2 }, 'wanted'], [{ sandbox: true }, 'mode-changed']]) {
  const { game, ctx } = fixture('rest');
  tick(game, { ...ctx, ...extra }, {}, 20);
  assert.equal(assertSingleResult(game, 'cancel').reason, reason, 'context cancels before a completion tick');
}
{
  const { game, ctx } = fixture('rest');
  game.load({ ...plan, id: 'next-room' });
  assert.equal(assertSingleResult(game, 'cancel').reason, 'room-changed');
  assert.equal(game.snapshot().active, false);
  assert.equal(game.start('rest', ctx), true);
  assert(game.cancel()); assert.equal(assertSingleResult(game, 'cancel').reason, 'cancelled');
}

// Recipe games require fresh, single-key presses. Repeated X in cooking needs release.
for (const kind of ['noodle', 'cooking', 'stock']) {
  const { game, ctx } = fixture(kind, { sandbox: true });
  if (kind === 'stock') {
    assert.match(game.snapshot().prompt, /Remember: X, ArrowUp, Y, X/);
    for (let i = 0; i < 20; i++) tick(game, ctx, { x: true });
    assert.equal(game.snapshot().score, 0, 'memorisation presses award nothing');
    waitPhase(game, ctx, 'repeat');
    assert.match(game.snapshot().prompt, /X, ArrowUp, Y, X/, 'stock sequence stays visible for the key tiles');
    assert.deepEqual(game.snapshot().sequence, recipe.stock);
    assert.equal(game.snapshot().memorising, false);
    assert.equal(game.snapshot().acceptsInput, true);
  }
  assert.deepEqual(game.snapshot().sequence, recipe[kind]);
  assert.equal(Object.isFrozen(game.snapshot().sequence), true);
  for (const [index, key] of recipe[kind].entries()) {
    assert.equal(game.snapshot().index, index);
    assert.equal(game.snapshot().expectedKey, key);
    press(game, ctx, key);
  }
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.kind, kind); assert.equal(event.sandbox, true);
  assert.equal(event.score, recipe[kind].length * 50);
  assert.equal(game.snapshot().progress, 1);
  assert.equal(game.snapshot().expectedKey, null);
  assert.equal(game.snapshot().acceptsInput, false);
  assert.match(game.snapshot().prompt, /Q to play again/);
}
{
  const { game, ctx } = fixture('cooking');
  press(game, ctx, 'x');
  for (let i = 0; i < 30; i++) tick(game, ctx, { x: true });
  assert.equal(game.snapshot().progress, 1 / 6, 'held/repeated keys cannot add ingredients');
  press(game, ctx, 'x');
  assert.equal(game.snapshot().progress, 2 / 6);
  tick(game, ctx); tick(game, ctx, { x: true, y: true });
  assert.equal(game.snapshot().mistakes, 1, 'simultaneous keys cannot match one recipe item');
  assert.equal(game.snapshot().progress, 0);
  assert.equal(game.snapshot().score, 0, 'resetting progress cannot farm score');
  press(game, ctx, 'up'); press(game, ctx, 'up');
  assertSingleResult(game, 'failed');
}

// Bench: six controlled lift edges, no grip/repeat/early/late shortcut.
{
  const { game, ctx } = fixture('bench');
  for (let i = 0; i < 30; i++) tick(game, ctx, { up: true });
  assert.equal(game.snapshot().reps, 0, 'ArrowUp without both grip keys cannot lift');
  assert.equal(game.snapshot().mistakes, 1, 'an early ungripped press is penalised once, not on repeat');
}
{
  const { game, ctx } = fixture('bench');
  for (let rep = 1; rep <= 6; rep++) {
    waitPhase(game, ctx, 'cue', grip);
    const cue = game.snapshot();
    assert.equal(cue.cue, true); assert.equal(cue.requiresGrip, true);
    assert.equal(cue.acceptsInput, true); assert(cue.cueRemaining > 0);
    assert.equal(cue.cueWindow, 1.05);
    assert.deepEqual(cue.sequence, Array(6).fill('up'));
    assert.equal(cue.index, rep - 1); assert.equal(cue.expectedKey, 'up');
    const state = tick(game, ctx, { ...grip, up: true });
    assert.equal(state.cue, false); assert.equal(state.cueRemaining, 0);
    assert.equal(state.reps, rep); assert.equal(state.lift, 1);
    for (let i = 0; i < 4; i++) tick(game, ctx, { ...grip, up: true });
    assert.equal(game.snapshot().reps, rep, 'keyboard repeat cannot add reps');
    if (rep < 6) waitPhase(game, ctx, 'prepare', grip);
    else waitPhase(game, ctx, 'complete', grip);
  }
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.reps, 6); assert.equal(event.score, 600);
}
{
  const { game, ctx } = fixture('bench');
  tick(game, ctx, grip); tick(game, ctx, { ...grip, up: true });
  assert.equal(game.snapshot().mistakes, 1, 'early press is a mistake');
  assert.equal(game.snapshot().reps, 0);
  waitPhase(game, ctx, 'cue', grip);
  const cue = game.snapshot();
  for (let i = 0; i < 80; i++) tick(game, ctx, grip, 0);
  assert.deepEqual(game.snapshot(), cue, 'pause preserves bench cue window');
  tick(game, ctx, { ...grip, up: true }, 0);
  tick(game, ctx, { ...grip, up: true });
  assert.equal(game.snapshot().reps, 0, 'held key through pause is not a new press');
  tick(game, ctx, grip); tick(game, ctx, { ...grip, up: true });
  assert.equal(game.snapshot().reps, 1);
  tick(game, ctx, { x: true });
  assert.equal(game.snapshot().mistakes, 2, 'grip release is a mistake');
  waitPhase(game, ctx, 'cue', grip);
  for (let i = 0; i < 22; i++) tick(game, ctx, grip);
  const result = assertSingleResult(game, 'failed');
  assert.match(game.snapshot().prompt, /Q to retry/);
  assert.match(result.reason, /Too late/); assert.equal(result.reps, 1);
  assert.equal(game.start('bench', ctx), true, 'failed bench is retryable');
  assert.equal(game.snapshot().reps, 0); assert.equal(game.snapshot().mistakes, 0);
}
{
  const { game, ctx } = fixture('bench');
  waitPhase(game, ctx, 'cue', grip);
  tick(game, { ...ctx, recovering: true }, { ...grip, up: true });
  const result = assertSingleResult(game, 'cancel');
  assert.equal(result.reps, 0, 'recovery prevents a same-frame successful lift');
}
for (const kind of ['tv', 'arcade']) {
  const { game, ctx } = fixture(kind);
  const target = kind === 'arcade' ? 8 : 5;
  for (let i = 0; i < target; i++) {
    waitPhase(game, ctx, 'cue');
    tick(game, ctx, { up: true });
    if (i < target - 1) {
      for (let j = 0; j < 4; j++) tick(game, ctx, { up: true });
      assert.equal(game.snapshot().score, (i + 1) * 100, 'held reflex input does not score again');
      tick(game, ctx);
    }
  }
  assert.equal(assertSingleResult(game, 'complete').score, target * 100);
}
{
  const { game, ctx } = fixture('tv');
  press(game, ctx, 'up'); press(game, ctx, 'up'); press(game, ctx, 'up');
  assertSingleResult(game, 'failed');
}
console.log('PASS interior activities: seven playable kinds; six-rep bench; grip/early/late/repeat guards; recipe/memory/reflex/rest scoring; pause; detached snapshots; context/session cancellation; sandbox tagging; exactly-once outcomes and retries.');
