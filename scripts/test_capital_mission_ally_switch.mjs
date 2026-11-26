import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';

const map = { spawn: { x: 0, z: 0 }, landmarks: [{ id: 'coals', name: 'Coals', store: true, x: 100, z: 10 }] };
const heroes = ['student', 'corporate', 'basement'];
const shared = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake'];
const owners = ['basement', 'student', 'corporate', 'corporate', 'student', 'basement'];
const saved = index => ({ version: 2, character: owners[index], intros: {
  student: ['student-paper-chase', 'student-extra-credit'], corporate: ['corporate-present-tense', 'corporate-lunch-breakpoint'],
  basement: ['basement-touch-grass', 'basement-first-delivery'],
}, meeting: true, legacy: false, completed: shared.slice(0, index) });
const context = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, vehicle: { stolen: false }, vehicleHealth: 72,
  wanted: 3, health: 67, respawnSerial: 0, campaign: true, sandbox: false };
const companion = id => ({ id: `campaign-ally:${id}`, appearanceId: `player:${id}`, x: 4, z: 7, yaw: .3, health: 43, active: true, mode: 'following', seated: false });
function mission(index) {
  const campaign = createCampaign(map, saved(index));
  assert.equal(campaign.start(context).ok, true);
  campaign.drainEvents();
  return campaign;
}
const tick = (campaign, ctx, count = 20) => { for (let i = 0; i < count; i++) campaign.update(.1, ctx); };
const switchContext = (campaign, id = campaign.state.active.companions[0]) => ({ ...context, companion: companion(id), switchSafe: true });
const withoutCrew = active => { const { companions, ...rest } = active; return structuredClone(rest); };

// A live wanted/combat escape can hand over without resetting any mission field.
const campaign = mission(3), active = campaign.state.active, chapter = campaign.current(), previous = campaign.state.character;
campaign.update(.1, context);
const id = active.companions[0], ctx = switchContext(campaign, id);
const before = withoutCrew(active), progress = campaign.serialize(), crew = [...active.companions];
assert.equal(campaign.canSwitchCompanion(id, ctx), true, 'wanted stars do not prevent a safe shared combat handover');
assert.equal(campaign.canSelectCharacter(id), false, 'ordinary checkpoint selection remains locked in a mission');
assert.equal(campaign.switchCompanion(id, ctx).ok, true);
assert.equal(campaign.state.active, active, 'the same active mission survives');
assert.deepEqual(withoutCrew(active), before, 'id, stage, held time, deadline, receipts and reward remain exact');
assert.deepEqual(active.companions, crew.map(hero => hero === id ? previous : hero), 'only target and former leader exchange roster roles');
assert.equal(campaign.state.character, id);
assert.equal(campaign.current(), chapter, 'chapter lookup stays bound to the running mission after the owner changes');
assert.equal(campaign.nextRequiredCharacter(), null);
assert.deepEqual(campaign.serialize(), { ...progress, character: id }, 'shared and introduction progress remain unchanged');
assert.deepEqual(campaign.drainEvents(), [], 'the handover emits no advancement, completion or reward');
const atEscape = { ...context, onFoot: false, wanted: 0, pose: { x: active.target.x+500, z: active.target.z, speed: 8 } };
tick(campaign, atEscape, 80);
const completions = campaign.drainEvents().filter(event => event.type === 'complete');
assert.equal(completions.length, 1);
assert.equal(completions[0].id, chapter.id);
assert.equal(completions[0].reward, chapter.reward);
assert.deepEqual(campaign.state.completed, shared.slice(0, 4));
tick(campaign, atEscape);
assert.deepEqual(campaign.drainEvents(), [], 'finishing after switching cannot replay the reward');

// All other accepted stage kinds are reached through their real receipt/arrival gates.
const drive = mission(4), driveId = drive.state.active.companions[0];
assert.equal(drive.state.active.target.kind, 'drive');
assert.equal(drive.switchCompanion(driveId, switchContext(drive, driveId)).ok, true);
while (drive.state.active) tick(drive, { ...context, wanted: 0, onFoot: false, pose: { ...drive.state.active.target, speed: 0 } });
assert.equal(drive.drainEvents().filter(event => event.type === 'complete').length, 1, 'multiple drive stages still complete against the original chapter');
const foot = mission(5);
tick(foot, { ...context, wanted: 0, onFoot: false, pose: { ...foot.state.active.target, speed: 0 } });
assert.equal(foot.state.active.target.kind, 'home-action');
assert.equal(foot.canSwitchCompanion(foot.state.active.companions[0], switchContext(foot)), false);
tick(foot, { ...context, wanted: 0, interior: { roomId: foot.state.active.target.roomId }, homeAction: { serial: 1, roomId: foot.state.active.target.roomId, outcome: 'packed' } });
assert.equal(foot.state.active.target.kind, 'escape');
assert.equal(foot.state.active.target.anywhere, true, 'home departure requires leaving the room and can then finish anywhere');
assert.equal(foot.switchCompanion(foot.state.active.companions[0], switchContext(foot)).ok, true);

const guarded = mission(3), guardedId = guarded.state.active.companions[0], valid = switchContext(guarded, guardedId);
for (const bad of [
  { sandbox: true }, { campaign: false }, { recovering: true }, { health: 0 }, { health: NaN }, { respawnSerial: 1 },
  { interior: {} }, { passenger: true }, { impactTime: .1 }, { carjacking: {} }, { activeJob: {} }, { activity: {} },
  { cutscene: true }, { heistActive: true }, { homeActionActive: true }, { pose: { x: NaN, z: 0 } },
  ...[{ health: 0 }, { health: NaN }, { active: false }, { seated: true }, { mode: 'passenger' }, { x: NaN }, { yaw: NaN },
    { id: 'campaign-ally:unknown' }, { appearanceId: 'player:unknown' }].map(change => ({ companion: { ...valid.companion, ...change } })),
  { companion: null },
]) {
  const prior = guarded.snapshot();
  assert.equal(guarded.canSwitchCompanion(guardedId, { ...valid, ...bad }), false, JSON.stringify(bad));
  assert.equal(guarded.switchCompanion(guardedId, { ...valid, ...bad }).ok, false);
  assert.deepEqual(guarded.snapshot(), prior, 'a denied handover changes nothing');
}
for (const deniedId of [guarded.state.character, 'unknown']) assert.equal(guarded.switchCompanion(deniedId, valid).ok, false);
assert.equal(guarded.switchCompanion(guardedId, { ...valid, switchSafe: false }).ok, false, 'mutation requires the controller placement preflight');
for (const index of [0, 1, 2]) {
  const blocked = mission(index);
  assert.equal(blocked.canSwitchCompanion(blocked.state.active.companions[0], switchContext(blocked)), false, 'stolen and robbery actions stay locked');
}
const intro = createCampaign(map);
intro.selectCharacter('student', context); intro.start(context);
assert.equal(intro.canSwitchCompanion('corporate', { ...context, companion: companion('corporate') }), false);
const preview = createCampaign(map, saved(3));
assert.equal(preview.startDeveloper('quiet-streets', { ...context, developer: true }).ok, true);
assert.equal(preview.canSwitchCompanion('student', { ...context, companion: companion('student') }), false);
const legacy = createCampaign(map, { version: 1, completed: shared.slice(0, 3) }); legacy.start(context);
assert.equal(legacy.canSwitchCompanion('student', { ...context, companion: companion('student') }), false);
assert.equal(createCampaign(map).canSwitchCompanion('student', context), false);
assert.deepEqual(guarded.drainEvents(), []);
console.log('Capital mission ally switching: live crew, safe shared stages, wanted combat, exact active-state/receipt preservation and once-only completion PASS');
