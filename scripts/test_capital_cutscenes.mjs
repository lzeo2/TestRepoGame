import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../Games/Capital Drive/cutscenes.js', import.meta.url), 'utf8');
const { createCutscenes } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const scene = () => ({ id: 'paper-chase', title: 'Paper chase', lines: [
  { speaker: 'Kit', text: 'The flyers were here yesterday.', duration: 4 },
  { speaker: 'Mara', text: 'Check the path before the delivery.', duration: 5 },
] });
const context = { character: 'student', missionId: 'student-paper-chase' };
const cuts = createCutscenes();
assert.equal(cuts.snapshot().status, 'idle');
assert.equal(cuts.skip(), false);
assert.equal(cuts.cancel(), false);
assert.deepEqual(cuts.drainEvents(), []);

const original = scene();
assert.equal(cuts.play(original, context), true);
const beginning = cuts.snapshot();
assert.equal(beginning.duration, 9);
assert.equal(beginning.cameraShotIndex, 0);
assert.equal(beginning.cameraProgress, 0);
assert.ok(Object.isFrozen(beginning));
assert.throws(() => { beginning.text = 'changed'; }, TypeError);
original.title = 'changed';
original.lines[0].text = 'changed';
original.lines[0].duration = 1;
original.lines.push({ speaker: 'Other', text: 'changed' });
assert.equal(cuts.snapshot().title, 'Paper chase');
assert.equal(cuts.snapshot().text, 'The flyers were here yesterday.');

for (const dt of [0, -1, NaN, Infinity, undefined, '4']) assert.strictEqual(cuts.step(dt), beginning);
assert.strictEqual(cuts.step(4, { paused: true }), beginning);
let state = cuts.step(2);
assert.equal(state.lineIndex, 0);
assert.equal(state.lineProgress, .5);
assert.equal(state.progress, 2 / 9);
state = cuts.step(2);
assert.equal(state.lineIndex, 1, 'exact boundary displays next caption');
assert.equal(state.cameraShotIndex, 1);
assert.equal(state.cameraProgress, 0);
assert.equal(state.speaker, 'Mara');
const paused = cuts.snapshot();
assert.strictEqual(cuts.step(9, { paused: true }), paused);
state = cuts.step(Number.MAX_VALUE);
assert.equal(state.status, 'completed');
assert.equal(state.active, false);
assert.equal(state.elapsed, 9, 'large dt clamps to scene duration');
assert.equal(state.progress, 1);
assert.equal(state.cameraProgress, 1);
assert.equal(cuts.skip(), false);
assert.equal(cuts.cancel(), false);
assert.strictEqual(cuts.step(1), state);
let events = cuts.drainEvents();
assert.equal(events.length, 1);
assert.deepEqual(events[0], { type: 'completed', reason: 'elapsed', id: 'paper-chase', ...context, runId: 1 });
assert.ok(Object.isFrozen(events));
assert.ok(Object.isFrozen(events[0]));
assert.deepEqual(cuts.drainEvents(), []);

assert.equal(cuts.play(scene(), context), true);
assert.equal(cuts.snapshot().runId, 2, 'replay has a new transient identity');
assert.equal(cuts.skip(), true);
assert.equal(cuts.skip(), false);
assert.equal(cuts.drainEvents()[0].reason, 'skipped');
assert.equal(cuts.play(scene(), context), true);
cuts.step(1);
assert.equal(cuts.cancel(), true);
assert.equal(cuts.cancel(), false);
assert.equal(cuts.snapshot().status, 'cancelled');
assert.equal(cuts.snapshot().elapsed, 1, 'cancellation does not complete timeline');
assert.deepEqual(cuts.drainEvents().map(e => e.type), ['cancelled']);
assert.equal(cuts.play(scene(), context), true);
assert.equal(cuts.play({ ...scene(), id: 'second' }, { character: 'corporate', missionId: 'other' }), true);
events = cuts.drainEvents();
assert.equal(events.length, 1);
assert.equal(events[0].reason, 'replaced');
assert.equal(events[0].missionId, context.missionId, 'replacement retains captured mission identity');
assert.equal(cuts.snapshot().missionId, 'other');

const invalid = [null, {}, { ...scene(), id: '../unsafe' }, { ...scene(), id: 'a'.repeat(65) },
  { ...scene(), title: ' ' }, { ...scene(), title: 'x'.repeat(97) },
  { ...scene(), lines: [] }, { ...scene(), lines: Array(7).fill(scene().lines[0]) },
  ...[null, {}, { speaker: '', text: 'ok' }, { speaker: 'x'.repeat(49), text: 'ok' },
    { speaker: 'Kit', text: 'x'.repeat(281) }, { speaker: 'Kit', text: '\t' },
    ...[0, -1, .5, 9, NaN, Infinity, null, '3'].map(duration => ({ speaker: 'Kit', text: 'ok', duration }))]
    .map(line => ({ ...scene(), lines: [line] })),
  { ...scene(), lines: Array(4).fill({ speaker: 'Kit', text: 'ok', duration: 8 }) }];
const beforeInvalid = cuts.snapshot();
for (const value of invalid) {
  assert.equal(cuts.play(value, context), false);
  assert.strictEqual(cuts.snapshot(), beforeInvalid, 'invalid scene cannot cancel live scene');
}
for (const value of [null, [], { character: {} }, { missionId: '' }, { character: null }]) {
  assert.equal(cuts.play(scene(), value), false);
  assert.strictEqual(cuts.snapshot(), beforeInvalid);
}
assert.deepEqual(cuts.drainEvents(), []);

const defaults = createCutscenes();
assert.equal(defaults.play({ id: 'default', title: 'Default', lines: [{ speaker: 'Kit', text: 'Ready.' }] }), true);
assert.equal(defaults.snapshot().duration, 3);
assert.equal(defaults.snapshot().missionId, null);
assert.equal(defaults.step(3).status, 'completed');
const maximum = { id: 'max', title: 'Maximum', lines: Array(6).fill({ speaker: 'Kit', text: 'Ready.', duration: 4 }) };
assert.equal(defaults.play(maximum), true);
assert.equal(defaults.step(20).lineIndex, 5, 'one step may cross several lines');
assert.equal(defaults.step(4).progress, 1);
assert.equal(defaults.drainEvents().length, 2);

console.log('Capital cutscenes: timeline, pause, immutable inputs, exactly-once terminal events and bounds PASS');

const runtime = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const controllerSources = ['campaignIntroChapter', 'playCampaignIntro', 'renderCutscene'].map(name => {
  const start = runtime.indexOf(`function ${name}(`);
  assert(start >= 0);
  return runtime.slice(start, runtime.indexOf('\n}', start) + 2);
});
const optional = { id: 'blackthorn-account', cutscene: { ...scene(), id: 'blackthorn-account', title: 'The Blackthorn account' } };
const completed = new Set(), launched = [], screens = [];
const env = {
  pendingCutscene: null, cutsceneAnchor: null, cameraReady: true,
  missionCheckpoint: null, gameMode: 'campaign', started: true, windowFocused: true, document: { hidden: false },
  campaign: { current: () => ({ id: context.missionId, cutscene: scene() }), state: { character: 'student', active: null },
    optionalChapters: [optional], isCompleted: id => completed.has(id) },
  cutscenes: createCutscenes(), missionLaunchReason: () => '', focus: () => ({ x: 1, z: 2 }),
  startCampaignMission: id => launched.push(id), setCutsceneVisible: visible => screens.push(visible),
  syncPlayerAppearance() {}, clearInput() {}, closeDialogs() {}, openCampaign() {}, $: () => ({}),
};
const intro = Function('env', `with (env) { ${controllerSources.join('\n')}; return {playCampaignIntro,renderCutscene}; }`)(env);
assert.match(runtime, /openContractPlan\(item\.id\):playCampaignIntro\(item\.id\)/);
intro.playCampaignIntro(optional.id);
assert.equal(env.cutscenes.snapshot().missionId, optional.id);
assert.deepEqual(launched, [], 'the optional story plays before the mission starts');
env.cutscenes.cancel(); intro.renderCutscene(0);
assert.deepEqual(launched, [], 'cancel leaves the optional chapter unstarted');
intro.playCampaignIntro(optional.id); env.cutscenes.skip(); intro.renderCutscene(0); intro.renderCutscene(0);
assert.deepEqual(launched, [optional.id], 'the optional introduction launches exactly its captured chapter once');
intro.playCampaignIntro(optional.id); completed.add(optional.id); env.cutscenes.skip(); intro.renderCutscene(0);
assert.deepEqual(launched, [optional.id], 'a chapter completed during the scene cannot start again');
intro.playCampaignIntro(); env.cutscenes.skip(); intro.renderCutscene(0);
assert.deepEqual(launched, [optional.id, null], 'the primary campaign introduction still launches its own story');
assert.equal(screens.at(-1), false);
console.log('Capital intro controller: exact optional identity, skip, cancel, completion guard and main story PASS');
