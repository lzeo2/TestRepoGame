import assert from 'node:assert/strict';
import { createInteriorActivities, WORKOUT_KINDS, isWorkoutKind } from '../Games/Capital Drive/interior-activities.js';

const kinds = [...WORKOUT_KINDS, 'noodle', 'stock', 'tv', 'cooking', 'rest', 'arcade', 'presentation', 'alarm'];
assert(Object.isFrozen(WORKOUT_KINDS));
assert.deepEqual(WORKOUT_KINDS, ['bench', 'treadmill', 'curls', 'rower']);
for (const kind of WORKOUT_KINDS) assert.equal(isWorkoutKind(kind), true);
for (const value of [null, undefined, {}, 'rest', 'presentation', 'BENCH']) assert.equal(isWorkoutKind(value), false);
const stations = kinds.map((kind, i) => ({ id: kind, kind, label: `Play ${kind}`, x: i * 10, z: 2, yaw: 0, radius: 1.8 }));
const plan = { id: 'test-room', activities: stations };
const recipe = { noodle: ['x', 'y', 'up', 'x', 'up', 'y'], cooking: ['x', 'x', 'y', 'up', 'y', 'up'], stock: ['x', 'up', 'y', 'x'] };
const grip = { x: true, y: true };
const context = (kind, extra = {}) => ({ pose: { ...stations.find(s => s.kind === kind) }, onFoot: true, wanted: 0, recovering: false, sandbox: false, ...extra });
function fixture(kind, extra = {}) {
  const game = createInteriorActivities();
  assert.equal(game.load(plan), kinds.length);
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
assert.equal(api.load({ id: 'bad', activities: [{ id: 'bad', kind: 'bench', x: NaN, z: 0 }, ...stations, stations[0]] }), kinds.length);
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
assert.equal(api.snapshot().stations.length, kinds.length);
api.clear(); api.clear();
assert.equal(assertSingleResult(api, 'cancel').reason, 'room-cleared');
assert.equal(api.snapshot().stations.length, 0);

// Rest needs a fresh hold after the bed cue; passive time cannot heal.
{
  const { game, ctx } = fixture('rest');
  const before = game.snapshot();
  for (let i = 0; i < 20; i++) tick(game, ctx, { up: true }, 0);
  assert.deepEqual(game.snapshot(), before, 'paused clocks and scores remain frozen');
  tick(game, ctx, {}, NaN); tick(game, ctx, {}, Infinity); tick(game, ctx, {}, -1);
  assert.deepEqual(game.snapshot(), before, 'invalid time cannot progress rest');
  for (let i = 0; i < 20; i++) tick(game, ctx);
  assert.equal(game.snapshot().progress,0,'waiting alone cannot complete rest');
  for (let i = 0; i < 64; i++) tick(game, ctx, {x:true});
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.heal, 20); assert.equal(event.score, 100);
  assert.equal(event.sandbox, false);
  assert.equal(event.outcome,'rested');assert.equal(event.stationId,'rest');
  assert(Object.isFrozen(event) && Object.isFrozen(event.station));
  for (let i = 0; i < 100; i++) tick(game, ctx);
  assert.deepEqual(game.drainEvents(), [], 'terminal activity cannot complete again');
  assert.equal(game.start('rest', ctx), true, 'terminal stations are replayable');
  tick(game, { ...ctx, pose: { x: ctx.pose.x + 3, z: ctx.pose.z } }, {}, 20);
  assert.equal(assertSingleResult(game, 'cancel').reason, 'left-station');
}
{
  const {game,ctx}=fixture('rest');
  for(let i=0;i<70;i++)tick(game,ctx,{x:true});
  assert.equal(game.snapshot().progress,0,'held key at start cannot skip neutral cue');
  tick(game,ctx);tick(game,ctx,{x:true});
  for(let i=0;i<10;i++)tick(game,ctx,{x:true});
  assert(game.snapshot().progress>0);tick(game,ctx);
  assert.equal(game.snapshot().progress,0,'early release loses the partial hold');
  assert.equal(game.drainEvents().length,0,'interrupted hold never completes');
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
// The treadmill has twelve alternating cadence steps; curls have six slower lifts.
for (const kind of ['treadmill', 'curls']) {
  const { game, ctx } = fixture(kind, { sandbox: true });
  const target = kind === 'treadmill' ? 12 : 6;
  assert.equal(game.snapshot().exercisePose, kind);
  assert.deepEqual(game.snapshot().sequence, Array.from({length: target}, (_, i) => i % 2 ? 'y' : 'x'));
  for (let rep = 1; rep <= target; rep++) {
    waitPhase(game, ctx, 'cue');
    const cue = game.snapshot(), key = rep % 2 ? 'x' : 'y';
    assert.equal(cue.index, rep - 1); assert.equal(cue.expectedKey, key);
    assert.deepEqual(cue.inputKeys, [key]); assert(Object.isFrozen(cue.inputKeys));
    assert.match(cue.instruction, new RegExp(kind === 'curls' ? `hold ${key.toUpperCase()}` : `press ${key.toUpperCase()} once`));
    assert(cue.cueRemaining > 0 && cue.cueWindow > 0);
    for (let i = 0; i < 10; i++) tick(game, ctx, {}, 0);
    assert.deepEqual(game.snapshot(), cue, 'pause preserves movement cue and response window');
    tick(game, ctx, { [key]: true });
    assert.equal(game.snapshot().reps, kind === 'curls' ? rep - 1 : rep);
    assert.equal(game.snapshot().lift, kind === 'curls' ? 0 : 1);
    for (let i = 0; i < 3; i++) tick(game, ctx, { [key]: true });
    assert.equal(game.snapshot().reps, kind === 'curls' ? rep - 1 : rep, 'held/repeated movement key cannot add reps');
    waitPhase(game, ctx, 'release', kind === 'curls' ? { [key]: true } : {});
    assert.match(game.snapshot().instruction, /release all keys/);
    tick(game, ctx);
    assert.equal(game.snapshot().reps, rep, 'completed curl scores only after its full lift and release');
    if (rep === target) waitPhase(game, ctx, 'complete');
  }
  const sessionId = game.snapshot().sessionId;
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.sessionId, sessionId); assert.equal(event.planId, plan.id);
  assert.equal(event.station.id, kind); assert.equal(event.kind, kind);
  assert.equal(event.reps, target); assert.equal(event.score, target * 100); assert.equal(event.sandbox, true);
  assert.equal(game.snapshot().progress, 1); assert.deepEqual(game.snapshot().inputKeys, []);
  for (let i = 0; i < 50; i++) tick(game, ctx, { x: true, y: true, up: true });
  assert.deepEqual(game.drainEvents(), [], 'completed workouts cannot emit a second reward permit');
  assert(game.start(kind, ctx)); assert(game.snapshot().sessionId > sessionId);
}

// Rowing scores only a completed held drive followed by actual release.
{
  const { game, ctx } = fixture('rower');
  for (let rep = 1; rep <= 6; rep++) {
    waitPhase(game, ctx, 'cue');
    assert.equal(game.snapshot().expectedKey, 'xy');
    assert.deepEqual(game.snapshot().inputKeys, ['x', 'y']);
    assert.match(game.snapshot().instruction, /hold X \+ Y together/);
    tick(game, ctx, { x: true });
    assert.equal(game.snapshot().reps, rep - 1, 'one grip key cannot row');
    assert.equal(game.snapshot().phase, 'cue');
    tick(game, ctx, grip);
    assert.equal(game.snapshot().phase, 'drive');
    assert.equal(game.snapshot().requiresGrip, true);
    const drive = game.snapshot();
    tick(game, ctx, grip, 0); assert.deepEqual(game.snapshot(), drive, 'paused drive cannot finish a stroke');
    waitPhase(game, ctx, 'release', grip);
    assert.equal(game.snapshot().reps, rep - 1, 'holding the handle alone cannot score');
    assert.equal(game.snapshot().lift, 1);
    tick(game, ctx);
    assert.equal(game.snapshot().reps, rep, 'full release after DRIVE scores one stroke');
    if (rep === 6) waitPhase(game, ctx, 'complete');
  }
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.reps, 6); assert.equal(event.score, 600);
}

for (const kind of ['treadmill', 'curls', 'rower']) {
  // No time-only, early, chord-spam or held-key shortcut.
  {
    const { game, ctx } = fixture(kind);
    tick(game, ctx, { x: true });
    assert.equal(game.snapshot().mistakes, 1);
    assert.equal(game.snapshot().reps, 0);
    for (let i = 0; i < 100 && game.snapshot().active; i++) tick(game, ctx, { x: true });
    assertSingleResult(game, 'failed');
    assert.equal(game.snapshot().reps, 0, 'holding a key cannot farm workout reps');
    assert(game.start(kind, ctx), 'failed workouts can retry');
    for (let i = 0; i < 200 && game.snapshot().active; i++) tick(game, ctx);
    assertSingleResult(game, 'failed');
    assert.equal(game.snapshot().reps, 0, 'elapsed time alone cannot finish a workout');
  }
  {
    const { game, ctx } = fixture(kind);
    waitPhase(game, ctx, 'cue');
    tick(game, ctx, { x: true, y: true, up: true });
    assert.equal(game.snapshot().reps, 0);
    assert.equal(game.snapshot().mistakes, 1, 'invalid chord does not match workout input');
  }
  {
    const { game, ctx } = fixture(kind);
    waitPhase(game, ctx, 'cue');
    const cue = game.snapshot();
    tick(game, ctx, { x: true }, 0);
    tick(game, ctx, { x: true });
    assert.equal(game.snapshot().reps, 0, 'holding a key through pause is not a fresh press');
    assert.equal(game.snapshot().phase, cue.phase);
  }
  for (const [extra, reason] of [[{ recovering: true }, 'recovery'], [{ pose: { x: 900, z: 900 } }, 'left-station'],
    [{ onFoot: false }, 'not-on-foot'], [{ sandbox: true }, 'mode-changed'], [{ wanted: 2 }, 'wanted']]) {
    const { game, ctx } = fixture(kind);
    waitPhase(game, ctx, 'cue');
    tick(game, { ...ctx, ...extra }, kind === 'rower' ? grip : { x: true });
    const event = assertSingleResult(game, 'cancel');
    assert.equal(event.reason, reason); assert.equal(event.reps, 0);
  }
}
{
  const { game, ctx } = fixture('rower');
  waitPhase(game, ctx, 'cue'); tick(game, ctx, grip);
  tick(game, ctx, { x: true });
  assert.equal(game.snapshot().mistakes, 1, 'early release aborts the drive');
  assert.equal(game.snapshot().reps, 0);
  waitPhase(game, ctx, 'cue'); tick(game, ctx, grip);
  waitPhase(game, ctx, 'release', grip);
  for (let i = 0; i < 80 && game.snapshot().active; i++) tick(game, ctx, grip);
  assertSingleResult(game, 'failed');
  assert.equal(game.snapshot().reps, 0, 'never releasing the handle cannot complete a stroke');
}
for (const kind of ['treadmill', 'curls']) {
  const { game, ctx } = fixture(kind);
  waitPhase(game, ctx, 'cue'); tick(game, ctx, { y: true });
  assert.equal(game.snapshot().reps, 0); assert.equal(game.snapshot().mistakes, 1, 'opposite limb cannot match current cue');
  waitPhase(game, ctx, 'cue'); tick(game, ctx, { x: true });
  tick(game, ctx); tick(game, ctx, { x: true });
  assert.equal(game.snapshot().reps, kind === 'curls' ? 0 : 1);
  assert.equal(game.snapshot().mistakes, 2, 'fresh spam or early release during movement is rejected');
}
// The authored PowerPunt outage requires real edits followed by supplied active sync time.
{
  const { game, ctx } = fixture('presentation');
  assert.deepEqual(game.snapshot().sequence, ['x', 'y', 'x']);
  assert.equal(game.snapshot().exercisePose, null); assert.equal(game.snapshot().outcome, null);
  for (const [i, key] of ['x', 'y', 'x'].entries()) {
    const state = game.snapshot();
    assert.equal(state.expectedKey, key); assert.equal(state.acceptsInput, true);
    assert.match(state.instruction, new RegExp(`edit ${i + 1}/3: press ${key.toUpperCase()} once`));
    press(game, ctx, key);
  }
  assert.equal(game.snapshot().phase, 'sync'); assert.equal(game.snapshot().expectedKey, null);
  assert.equal(game.snapshot().acceptsInput, false); assert.equal(game.snapshot().outcome, null);
  const sync = game.snapshot();
  for (let i = 0; i < 50; i++) tick(game, ctx, { x: true, y: true }, 0);
  assert.deepEqual(game.snapshot(), sync, 'pause freezes sync and cannot create an outage');
  tick(game, ctx, {}, 1.19);
  assert.equal(game.snapshot().phase, 'sync'); assert.deepEqual(game.drainEvents(), []);
  tick(game, ctx, {}, .01);
  assert.equal(game.snapshot().phase, 'complete'); assert.equal(game.snapshot().outcome, 'outage');
  const event = assertSingleResult(game, 'complete');
  assert(Object.isFrozen(event)); assert(Object.isFrozen(event.station));
  assert.equal(event.outcome, 'outage'); assert.equal(event.kind, 'presentation');
  assert.equal(event.planId, plan.id); assert.equal(event.stationId, 'presentation');
  assert.equal(event.sessionId, game.snapshot().sessionId); assert.equal(event.score, 0);
  assert.equal(game.snapshot().progress, 1);
  tick(game, ctx, {}, 5); assert.deepEqual(game.drainEvents(), [], 'outage emits once per actual session');
}
{
  const { game, ctx } = fixture('presentation');
  tick(game, ctx, { x: true });
  for (let i = 0; i < 50; i++) tick(game, ctx, { x: true });
  assert.equal(game.snapshot().index, 1, 'held X cannot perform a later edit');
  press(game, ctx, 'x'); press(game, ctx, 'up'); press(game, ctx, 'y');
  const event = assertSingleResult(game, 'failed'); assert.equal(event.outcome, null);
  assert.equal(game.snapshot().outcome, null, 'wrong edit failure is not the scripted outage');
}
for (const [extra, reason] of [[{ recovering: true }, 'recovery'], [{ pose: { x: 999, z: 999 } }, 'left-station'],
  [{ visible: false }, 'occluded'], [{ onFoot: false }, 'not-on-foot'], [{ wanted: 1 }, 'wanted'], [{ sandbox: true }, 'mode-changed']]) {
  const { game, ctx } = fixture('presentation');
  for (const key of ['x', 'y', 'x']) press(game, ctx, key);
  tick(game, { ...ctx, ...extra }, {}, 2);
  const event = assertSingleResult(game, 'cancel');
  assert.equal(event.reason, reason); assert.equal(event.outcome, null);
  assert.equal(game.snapshot().outcome, null, 'invalid sync context cannot create an outage');
}
{
  const { game, ctx } = fixture('presentation');
  game.cancel(); assertSingleResult(game, 'cancel');
  assert.equal(game.start('presentation', { ...ctx, visible: false }), false);
  assert(game.start('presentation', ctx));
  tick(game, ctx, { x: true, y: true });
  assert.equal(game.snapshot().index, 0); assert.equal(game.snapshot().mistakes, 1, 'simultaneous edit spam is invalid');
}
{
  const { game, ctx } = fixture('presentation');
  tick(game, ctx, { x: true }); tick(game, ctx, { x: true, y: true });
  assert.equal(game.snapshot().index, 0); assert.equal(game.snapshot().mistakes, 1, 'previous edit key must release before the next edit');
}
console.log('PASS interior activities: twelve playable kinds; four distinct workouts; controlled bench, twelve cadence steps, six curls and six rowing strokes; fresh-key/grip/early/late/repeat/spam guards; PowerPunt three edits and paused 1.2s sync with once-only immutable outage; recovery/reach/visibility/mode cancellation; exact session identity and retries.');

// This game-only sequence is bound to its actual station and cannot use held keys.
const alarmContext = () => context('alarm', { health: 100, visible: true });
function alarmFixture() {
  const game = createInteriorActivities(), ctx = alarmContext(); game.load(plan);
  assert(game.start('alarm', ctx)); return { game, ctx };
}
function armAlarm(game, ctx) {
  tick(game, ctx); tick(game, ctx, { x: true });
  for (let i = 0; i < 14; i++) tick(game, ctx, { x: true });
  assert.equal(game.snapshot().phase, 'release');
  tick(game, ctx); assert.equal(game.snapshot().phase, 'confirm');
}
{
  const { game, ctx } = alarmFixture();
  tick(game, ctx, { x: true }, 1); tick(game, ctx, { x: true }, 1);
  assert.equal(game.snapshot().phase, 'ready', 'carried held input cannot begin a session');
  armAlarm(game, ctx); assert.equal(game.snapshot().outcome, null);
  tick(game, ctx, { y: true });
  const event = assertSingleResult(game, 'complete');
  assert.equal(event.outcome, 'triggered'); assert.equal(event.kind, 'alarm');
  assert.equal(event.stationId, 'alarm'); assert.equal(event.planId, plan.id);
  assert.equal(event.sessionId, game.snapshot().sessionId); assert.equal(event.sandbox, false);
  assert(Object.isFrozen(event) && Object.isFrozen(event.station));
  tick(game, ctx, { y: true }, 50); assert.deepEqual(game.drainEvents(), []);
  assert(game.start('alarm', ctx)); assert(game.snapshot().sessionId > event.sessionId);
  assert.equal(game.snapshot().outcome, null); assert.equal(game.snapshot().progress, 0);
}
for (const [extra, reason] of [[{ recovering: true }, 'recovery'], [{ health: 0 }, 'health'],
  [{ health: NaN }, 'health'], [{ visible: false }, 'occluded'],
  [{ sandbox: true }, 'sandbox'], [{ onFoot: false }, 'not-on-foot'], [{ wanted: 1 }, 'wanted'],
  [{ pose: { x: 999, z: 999 } }, 'left-station']]) {
  const game = createInteriorActivities(); game.load(plan);
  assert.equal(game.start('alarm', { ...alarmContext(), ...extra }), false, `alarm admission ${reason}`);
  const { game: live, ctx } = alarmFixture(); armAlarm(live, ctx);
  tick(live, { ...ctx, ...extra }, { y: true });
  const event = assertSingleResult(live, 'cancel'); assert.equal(event.reason, reason); assert.equal(event.outcome, null);
}
{
  const { game, ctx } = alarmFixture(); armAlarm(game, ctx);
  const state = game.snapshot();
  tick(game, ctx, { y: true }, 0);
  tick(game, { ...ctx, paused: true }, { y: true }, 2);
  assert.deepEqual(game.snapshot(), state, 'paused clocks freeze the sequence and consume held key edges');
  tick(game, ctx, { y: true }); assert.equal(game.snapshot().outcome, null, 'holding Y through pause is not a fresh confirmation');
  tick(game, ctx); tick(game, ctx, { y: true }); assert.equal(assertSingleResult(game, 'complete').outcome, 'triggered');
  const idle = createInteriorActivities(); idle.load(plan);
  assert.equal(idle.start('alarm', { ...ctx, paused: true }), false);
}
for (const change of ['clear', 'load', 'cancel']) {
  const { game, ctx } = alarmFixture(); armAlarm(game, ctx);
  if (change === 'clear') game.clear(); else if (change === 'load') game.load({ id: 'other', activities: [] }); else game.cancel();
  assert.equal(assertSingleResult(game, 'cancel').outcome, null);
}
{
  const { game, ctx } = alarmFixture();
  tick(game, ctx); tick(game, ctx, { x: true }); tick(game, ctx);
  assert.equal(game.snapshot().mistakes, 1, 'early X release is not a successful hold');
  armAlarm(game, ctx); tick(game, ctx, { x: true, y: true });
  assert.equal(game.snapshot().mistakes, 2, 'simultaneous confirmation spam cannot trigger');
  assert.equal(game.snapshot().outcome, null); assert.deepEqual(game.drainEvents(), []);
}
console.log('PASS fictional alarm: fresh neutral/X hold/release/Y, supplied active time, immutable exact station/plan/session event once, no sandbox or cancelled/occluded/unhealthy credit; frozen paused clocks and consumed pause edges');

for(const kind of ['noodle','stock'])for(let wanted=0;wanted<=5;wanted++){
  const {game,ctx}=fixture(kind,{wanted});
  if(kind==='stock')waitPhase(game,ctx,'repeat');
  for(const key of recipe[kind])press(game,ctx,key);
  assert.equal(game.snapshot().phase,'complete',`${kind} completes at ${wanted} stars`);
  assertSingleResult(game,'complete');
}
for(const kind of ['noodle','stock'])for(const wanted of [NaN,-1,6]){
  const game=createInteriorActivities();game.load(plan);
  assert.equal(game.start(kind,context(kind,{wanted})),false,'work requires valid wanted level');
}
console.log('PASS wanted interior work: noodle and stock start and finish at every valid wanted level.');
