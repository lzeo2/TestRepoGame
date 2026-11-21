import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../Games/Capital Drive/tutorial.js', import.meta.url), 'utf8');
const { createTutorial, TUTORIAL_STEPS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const context = (extra = {}) => ({ started: true, paused: false, recovering: false, interior: false, cutscene: false,
  mode: 'foot', pose: { x: 0, z: 0 }, speed: 0, orbitSerial: 0, phoneSerial: 0, mapRouteSerial: 0, shopsSerial: 0, jobsSerial: 0, ...extra });
const tick = (tutorial, ctx, dt = .1) => tutorial.observe(ctx, dt);
const at = (id, ctx = context()) => {
  const tutorial = createTutorial({ version: 1, status: 'active', index: TUTORIAL_STEPS.findIndex(step => step.id === id) });
  tutorial.resume(ctx); tutorial.drainEvents();
  return tutorial;
};

assert(Object.isFrozen(TUTORIAL_STEPS));
assert(TUTORIAL_STEPS.every(Object.isFrozen));
let ctx = context(), tutorial = createTutorial();
assert.equal(tutorial.snapshot().status, 'idle');
assert.equal(tick(tutorial, ctx).status, 'idle', 'no implicit start');
tutorial.start(ctx);
assert.equal(tick(tutorial, ctx).step, 'look', 'time does not teach looking');
ctx.orbitSerial++;
assert.equal(tick(tutorial, ctx).step, 'walk');
ctx.pose.x = 1;
assert.equal(tick(tutorial, ctx).step, 'walk');
ctx.pose.x = 2;
assert.equal(tick(tutorial, ctx).step, 'phone');
ctx.phoneSerial++;
assert.equal(tick(tutorial, ctx).step, 'enter-car');
assert.equal(tick(tutorial, ctx).step, 'enter-car', 'E input alone is not car entry');
ctx.mode = 'vehicle'; ctx.pose.x = 100;
assert.equal(tick(tutorial, ctx).step, 'drive');
assert.equal(tutorial.snapshot().distance, 0, 'car entry offset is not driving');
ctx.speed = 5;
for (let i = 0; i < 20; i++) { ctx.pose.x += .5; tick(tutorial, ctx); }
assert.equal(tutorial.snapshot().step, 'brake');
assert.equal(tick(tutorial, ctx).step, 'brake');
ctx.speed = -.5;
assert.equal(tick(tutorial, ctx).step, 'map-route', 'actual stopped reverse speed is accepted');
ctx.mapRouteSerial++;
assert.equal(tick(tutorial, ctx).step, 'shops');
ctx.shopsSerial++;
assert.equal(tick(tutorial, ctx).step, 'jobs');
ctx.jobsSerial++;
assert.equal(tick(tutorial, ctx).status, 'complete');
for (let i = 0; i < 100; i++) tick(tutorial, ctx);
const events = tutorial.drainEvents();
assert.equal(events.filter(event => event.type === 'stage').length, 9);
assert.equal(events.filter(event => event.type === 'complete').length, 1);
assert.equal(tutorial.drainEvents().length, 0);
assert(Object.isFrozen(events) && events.every(Object.isFrozen));
assert.deepEqual(tutorial.serialize(), { version: 1, status: 'complete', index: 9 });

ctx = context({ mode: 'vehicle', pose: { x: 20, z: 20 }, speed: 6, orbitSerial: 12 });
tutorial = createTutorial(); tutorial.start(ctx);
assert.equal(tick(tutorial, ctx).step, 'look', 'old orbit serial does not count');
ctx.orbitSerial++;
assert.equal(tick(tutorial, ctx).step, 'walk');
assert.match(tutorial.snapshot().instruction, /E.*stop.*E.*out/);
ctx.pose.x += 1;
assert.equal(tick(tutorial, ctx).distance, 0, 'driving is not walking');
ctx.mode = 'foot'; ctx.pose.x += 100;
assert.equal(tick(tutorial, ctx).distance, 0, 'first on-foot observation sets its anchor');
ctx.pose.x += 1; tick(tutorial, ctx);
ctx.pose.x += 1;
assert.equal(tick(tutorial, ctx).step, 'phone');

for (const [id, key] of [['look', 'orbitSerial'], ['phone', 'phoneSerial'], ['map-route', 'mapRouteSerial'], ['shops', 'shopsSerial'], ['jobs', 'jobsSerial']]) {
  ctx = context({ [key]: 90 }); tutorial = at(id, ctx);
  assert.equal(tick(tutorial, ctx).step, id, `${id} uses a fresh baseline`);
  tick(tutorial, { ...ctx, [key]: NaN });
  assert.equal(tick(tutorial, { ...ctx, [key]: 100 }).step, id, 'missing or corrupt counters re-baseline');
  assert.notEqual(tick(tutorial, { ...ctx, [key]: 101 }).step, id);
}
ctx = context({ phoneSerial: 20 }); tutorial = at('walk', ctx);
ctx.pose.x = 1; tick(tutorial, ctx); ctx.pose.x = 2; tick(tutorial, ctx);
assert.equal(tick(tutorial, ctx).step, 'phone', 'an earlier menu visit cannot skip a future step');
ctx.phoneSerial++;
assert.equal(tick(tutorial, ctx).step, 'enter-car');

for (const frozen of [{ paused: true }, { recovering: true }, { interior: {} }, { cutscene: true }, { started: false }]) {
  ctx = context(); tutorial = at('walk', ctx);
  ctx.pose.x = 1; tick(tutorial, ctx);
  const before = tutorial.snapshot();
  tick(tutorial, { ...ctx, ...frozen, pose: { x: 200, z: 200 } });
  assert.deepEqual(tutorial.snapshot(), before, 'frozen observations change no progress or presentation');
  ctx.pose.x = 300;
  assert.equal(tick(tutorial, ctx).distance, 1, 'resume re-anchors instead of counting frozen relocation');
  ctx.pose.x++;
  assert.equal(tick(tutorial, ctx).step, 'phone');
}
for (const dt of [0, -1, NaN, Infinity, undefined, '1']) {
  ctx = context(); tutorial = at('look', ctx);
  tutorial.observe({ ...ctx, orbitSerial: 1 }, dt);
  assert.equal(tutorial.snapshot().step, 'look');
  ctx.orbitSerial = 1;
  assert.equal(tick(tutorial, ctx).step, 'look', 'events during invalid dt do not carry over');
  ctx.orbitSerial++;
  assert.equal(tick(tutorial, ctx).step, 'walk');
}

ctx = context(); tutorial = at('walk', ctx);
for (const pose of [null, { x: NaN, z: 0 }, { x: '2', z: 0 }]) assert.equal(tick(tutorial, { ...ctx, pose }).distance, 0);
ctx.pose.x = 100; tick(tutorial, ctx); ctx.pose.x = 200;
assert.equal(tick(tutorial, ctx).distance, 0, 'large jumps cannot teach walking');
ctx.pose.x += 2;
assert.equal(tick(tutorial, ctx, 999).distance, 0, 'large dt is capped for plausible movement');
ctx.pose.x += 1;
assert.equal(tick(tutorial, ctx).distance, 1);
ctx = context({ mode: 'vehicle', speed: 0 }); tutorial = at('drive', ctx);
ctx.pose.x = .5;
assert.equal(tick(tutorial, ctx).distance, 0, 'moving pose at stopped speed is not driving');
ctx.speed = 5; ctx.pose.x = 100;
assert.equal(tick(tutorial, ctx).distance, 0, 'teleport is not driving');
ctx.mode = 'foot'; ctx.pose.x++;
assert.match(tick(tutorial, ctx).instruction, /car.*E/);
ctx.mode = 'vehicle'; ctx.pose.x = 200;
assert.equal(tick(tutorial, ctx).distance, 0, 're-entry starts a new movement anchor');
for (const bad of [NaN, Infinity, undefined, '5']) {
  assert.equal(tick(tutorial, { ...ctx, speed: bad }).distance, 0);
  const brake = at('brake', ctx);
  assert.equal(tick(brake, { ...ctx, speed: bad }).step, 'brake', 'invalid speed cannot teach braking');
}

const validSaves = [{ version: 1, status: 'idle', index: 0 }, { version: 1, status: 'active', index: 3 },
  { version: 1, status: 'skipped', index: 4 }, { version: 1, status: 'complete', index: 9 }];
for (const saved of validSaves) {
  tutorial = createTutorial(saved);
  assert.deepEqual(tutorial.serialize(), saved);
  assert.equal(tutorial.snapshot().active, false, 'loaded progress waits for an explicit resume');
  assert(Object.isFrozen(tutorial.serialize()) && Object.isFrozen(tutorial.snapshot()));
}
const badSaves = [{}, [], 'broken', 4, { version: 2, status: 'active', index: 1 },
  { version: 1, status: 'active', index: -1 }, { version: 1, status: 'active', index: 9 },
  { version: 1, status: 'complete', index: 8 }, { version: 1, status: 'idle', index: 1 },
  { version: 1, status: 'active', index: .5 }, { version: 1, status: 'active', index: 1, cash: 999 },
  { version: 1, status: 'unknown', index: 0 }, Object.create({ version: 1, status: 'active', index: 1 }),
  Object.defineProperties({}, { version: { get() { throw Error('must not read accessor'); } }, status: { value: 'active' }, index: { value: 1 } })];
for (const saved of badSaves) {
  tutorial = createTutorial(saved);
  assert.equal(tutorial.snapshot().savedValid, false);
  assert.equal(tutorial.snapshot().status, 'idle');
}
tutorial = createTutorial(validSaves[1]); ctx = context();
tutorial.resume(ctx); assert.equal(tutorial.snapshot().step, 'enter-car');
tutorial.skip(); tutorial.skip();
assert.equal(tutorial.snapshot().status, 'skipped');
assert.equal(tutorial.drainEvents().filter(event => event.type === 'preference').length, 2);
tutorial.start(ctx);
assert.equal(tutorial.snapshot().step, 'look', 'explicit replay resets learned status');
assert.equal(tutorial.snapshot().distance, 0);
for (let i = 0; i < 1000; i++) tutorial.start(ctx);
assert(tutorial.drainEvents().length <= 32, 'undrained explicit replay events remain bounded');
assert.equal(tutorial.drainEvents().length, 0);
for (const [menu, key] of [['phone', 'phoneSerial'], ['map-route', 'mapRouteSerial'], ['shops', 'shopsSerial'], ['jobs', 'jobsSerial']]) {
  ctx = context({ [key]: 2 }); tutorial = at(menu, ctx);
  tick(tutorial, { ...ctx, paused: true });
  assert.equal(tutorial.observeMenu({ ...ctx, paused: true }, menu).step, menu, 'old menu fact is not fresh');
  ctx[key]++;
  assert.equal(tutorial.observeMenu({ ...ctx, paused: true }, 'unrelated').step, menu);
  const otherMenu = menu === 'phone' ? 'shops' : 'phone';
  assert.equal(tutorial.observeMenu({ ...ctx, paused: true }, otherMenu).step, menu, 'a different successful menu cannot advance the current lesson');
  for (const guard of [{ started: false }, { recovering: true }, { interior: {} }, { cutscene: true }, { [key]: NaN }]) {
    assert.equal(tutorial.observeMenu({ ...ctx, paused: true, ...guard }, menu).step, menu);
  }
  assert.notEqual(tutorial.observeMenu({ ...ctx, paused: true }, menu).step, menu, 'successful fresh user menu action is observed while its dialog pauses');
  const after = tutorial.snapshot();
  tutorial.observeMenu({ ...ctx, paused: true }, menu);
  assert.deepEqual(tutorial.snapshot(), after, 'duplicate callback cannot advance again');
  assert.equal(tutorial.drainEvents().length, 1, 'one actual menu transition emits once');
}
for (const phase of ['look', 'walk', 'enter-car', 'drive', 'brake']) {
  ctx = context({ mode: phase === 'drive' || phase === 'brake' ? 'vehicle' : 'foot', speed: 0 });
  tutorial = at(phase, ctx);
  const before = tutorial.snapshot();
  tutorial.observeMenu({ ...ctx, paused: true, mode: 'vehicle', speed: 5, pose: { x: 500, z: 500 },
    orbitSerial: 100, phoneSerial: 100, mapRouteSerial: 100, shopsSerial: 100, jobsSerial: 100 }, 'phone');
  assert.deepEqual(tutorial.snapshot(), before, 'menu action cannot teach looking, walking, entering, driving or braking');
  if (phase === 'walk' || phase === 'drive') {
    ctx.pose.x = .25; ctx.speed = 5;
    assert.equal(tick(tutorial, ctx).distance, 0, 'menu freeze cannot leak movement into the next world frame');
  }
}
assert(!/\b(?:document|window|localStorage|requestAnimationFrame|setTimeout|Date|fetch)\b/.test(source), 'pure tutorial has no DOM, storage, network or clock');
console.log('PASS tutorial: 9 observed stages, both start modes, fresh serials, real motion, freeze/resume, actual paused menu actions, strict preference, replay, frozen DTOs and bounded once-only events');
