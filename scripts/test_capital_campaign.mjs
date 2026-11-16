import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { expansionPlaces } from '../Games/Capital Drive/map-expansion.js';
const map = { spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
const ctx = { pose: { x: 0, z: 0, speed: 0 }, onFoot: false, vehicle: { stolen: false }, vehicleHealth: 100,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false };
const tick = (campaign, context, count = 15) => { for (let i = 0; i < count; i++) campaign.update(.1, context); };
const legacyIds = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake'];
const continuationIds = ['shelf-life', 'two-till-problem', 'carbon-copy', 'paper-trail-survey', 'exit-interview', 'sealed-account', 'earmuffs-rematch', 'closing-time', 'terminal-transfer'];

let campaign = createCampaign(map);
assert.equal(campaign.current(), null);
assert.equal(campaign.nextRequiredCharacter(), null);
assert.equal(campaign.start(ctx).ok, false, 'new campaigns require a hero');
assert.deepEqual(campaign.characters.map(c => c.id), ['student', 'corporate', 'basement']);
assert.ok(Object.isFrozen(campaign.characters[0].start));
assert.deepEqual(campaign.characters.map(hero=>hero.onFoot),[true,true,false], 'Milo begins in his existing saloon; the other openings retain their foot starts');
for (const forbidden of [{ ...ctx, sandbox: true }, { ...ctx, recovering: true }, { ...ctx, campaign: false }, { ...ctx, pose: { x: NaN, z: 0 } }]) {
  assert.equal(campaign.selectCharacter('student', forbidden).ok, false);
  assert.equal(campaign.state.character, null, 'unavailable context does not select a character');
}
assert.equal(campaign.canSelectCharacter('unknown'), false);
assert.equal(campaign.selectCharacter('unknown', ctx).ok, false);
assert.equal(campaign.selectCharacter('student', ctx).ok, true);
assert.equal(campaign.selectCharacter('corporate', ctx).ok, true, 'switch freely before any introduction mission');
assert.equal(campaign.current().id, 'corporate-present-tense');
assert.equal(campaign.selectCharacter('student', ctx).ok, true);
assert.equal(campaign.drainEvents().length, 0, 'selection earns nothing');
assert.equal(campaign.start(ctx).ok, true);
assert.equal(campaign.start(ctx).ok, false);
campaign.update(10, { ...ctx, sandbox: true });
assert.equal(campaign.state.active.elapsed, 0);
campaign.update(0, ctx);
assert.equal(campaign.state.active.elapsed, 0);
tick(campaign, { ...ctx, pose: { ...campaign.state.active.target } });
assert.equal(campaign.state.active.stage, 0, 'student errand requires walking');
for (const hero of ['student', 'corporate', 'basement']) {
  assert.equal(campaign.canSelectCharacter(hero), false, 'active mission disables every character option');
  assert.equal(campaign.selectCharacter(hero, ctx).ok, false, 'active mission locks hero');
}
assert.equal(campaign.state.character, 'student');
assert.ok(campaign.cancel());
assert.deepEqual(campaign.state.intros.student, []);
assert.equal(campaign.selectCharacter('corporate', ctx).ok, true, 'cancel permits immediate switching');
assert.equal(campaign.current().id, 'corporate-present-tense');
assert.equal(campaign.selectCharacter('student', ctx).ok, true);

// Every objective is exercised through the same live-context predicates as the controller.
let serial = 0;
function finishMission(value, developer = false) {
  const mission = value.current();
  assert.ok(mission, 'mission available');
  if (!developer) assert.equal(value.start({ ...ctx, wanted: mission.wantedLevel || (mission.incident ? 1 : 0) }).ok, true);
  assert.equal(value.state.active.combat, mission.combat !== false, 'controller receives the chapter combat policy');
  assert.deepEqual(value.state.active.companions, mission.companions || []);
  assert.deepEqual(value.state.active.cutscene, mission.cutscene);
  const started = value.drainEvents().filter(event => event.type === 'started');
  assert.equal(started.length, 1);
  assert.equal(started[0].wantedLevel, mission.wantedLevel || 0);
  const activeCharacter = value.state.character;
  for (const hero of ['student', 'corporate', 'basement']) {
    assert.equal(value.selectCharacter(hero, ctx).ok, false, 'every active chapter locks character selection');
  }
  assert.equal(value.state.character, activeCharacter);
  let guard = 0;
  while (value.state.active && guard++ < 12) {
    const target = value.state.active.target;
    const context = { ...ctx, pose: { ...target, speed: 0 }, vehicle: { stolen: true }, onFoot: ['foot', 'interior', 'work', 'presentation', 'encounter', 'school-alarm', 'robbery', 'home-action', 'recon', 'evidence', 'fight'].includes(target.kind) || target.foot === true };
    if (target.kind === 'interior') context.interior = { storeId: target.storeId, roomId: 'shop-room', atCounter: true };
    if (target.kind === 'work') {
      context.interior = { storeId: target.storeId, roomId: 'shop-room' };
      context.workCompletion = { serial: ++serial, storeId: target.storeId };
    }
    if (target.kind === 'home-action') {
      context.interior = { roomId: target.roomId };
      context.homeAction = { serial: ++serial, roomId: target.roomId, outcome: 'packed' };
    }
    if (target.kind === 'school-alarm') {
      context.interior = { roomId: target.roomId };
      context.schoolAlarm = { serial: ++serial, roomId: target.roomId, outcome: 'triggered' };
      context.wanted = 1;
    }
    if (target.kind === 'robbery') {
      context.interior = { storeId: target.storeId, roomId: 'coals-room' };
      context.heist = { serial: ++serial, storeId: target.storeId, kind: 'robbery' };
    }
    if (target.kind === 'presentation') {
      context.interior = { roomId: target.roomId };
      context.presentation = { serial: ++serial, roomId: target.roomId, outcome: 'outage' };
    }
    if (target.kind === 'encounter' || target.kind === 'fight') {
      context.interior = { storeId: target.storeId, roomId: 'noodle-room' };
      context.encounter = { serial: ++serial, storeId: target.storeId, roomId: 'noodle-room', character: 'booth-guest', phase: 'complete', outcome: target.victory ? 'noodle-victory' : 'noodle-fight', victory: target.victory === true, missionId: mission.id };
    }
    if (target.kind === 'recon') context.recon = { serial: ++serial, missionId: mission.id, stage: value.state.active.stage, targetId: target.targetId, space: null, kind: 'recon', outcome: 'documented' };
    if (target.kind === 'evidence') { context.interior = { storeId: target.storeId, roomId: 'coals-room' }; context.evidence = { serial: ++serial, missionId: mission.id, roomId: 'coals-room', storeId: target.storeId, outcome: 'secured' }; }
    if (target.kind === 'escape' && !value.state.active.sawWanted) value.update(.1, { ...context, wanted: 1 });
    tick(value, context, Math.ceil(Math.max(target.hold || 0, 1.5) * 10) + 2);
  }
  assert.equal(value.state.active, null, `${mission.id} completed`);
  const completionEvents = value.drainEvents();
  const completions = completionEvents.filter(e => e.type === (developer ? 'developer-complete' : 'complete'));
  if (developer) assert.equal(completionEvents.some(event => event.type === 'complete'), false, 'preview cannot emit a career reward');
  assert.equal(completions.length, 1, `${mission.id} pays exactly once`);
  assert.equal(completions[0].id, mission.id);
  assert.equal(completions[0].reward, developer ? 0 : mission.reward);
  tick(value, ctx);
  assert.equal(value.drainEvents().length, 0, 'no reward replay');
  return mission.id;
}
const preview = createCampaign(map);
const previewChapters = preview.developerChapters();
assert.equal(previewChapters.length, 22);
assert.equal(new Set(previewChapters.map(chapter => chapter.id)).size, 22);
assert.ok(Object.isFrozen(previewChapters) && previewChapters.every(chapter => Object.isFrozen(chapter) && Object.isFrozen(chapter.start) && Object.isFrozen(chapter.target)));
for (const chapter of previewChapters) {
  const saved = preview.serialize(), journal = preview.journal(), normalId = preview.current()?.id;
  const developerContext = { ...ctx, developer: true, wanted: 1 };
  for (const invalid of [ctx, { ...developerContext, developer: 1 }, { ...developerContext, sandbox: true }, { ...developerContext, recovering: true }, { ...developerContext, campaign: false }, { ...developerContext, pose: { x: NaN, z: 0 } }, { ...developerContext, respawnSerial: -1 }]) {
    assert.equal(preview.startDeveloper(chapter.id, invalid).ok, false);
    assert.deepEqual(preview.serialize(), saved);
  }
  assert.equal(preview.startDeveloper('unknown', developerContext).ok, false);
  assert.equal(preview.startDeveloper(chapter.id, developerContext).ok, true, 'locked fresh careers can preview every real mission');
  assert.equal(preview.current().id, chapter.id);
  assert.equal(preview.state.active.character, chapter.character);
  assert.equal(preview.state.character, null, 'preview owner never selects or changes the saved character');
  assert.equal(preview.state.active.developer, true);
  assert.equal(preview.state.active.reward, 0);
  assert.equal(preview.startDeveloper(chapter.id, developerContext).ok, false, 'an active mission cannot be replaced');
  assert.equal(preview.start(ctx).ok, false);
  assert.deepEqual(preview.serialize(), saved, 'starting preview preserves all serialized prefixes');
  assert.deepEqual(preview.journal(), journal);
  assert.deepEqual(createCampaign(map, preview.serialize()).serialize(), saved, 'reload never restores transient preview');
  const stage = preview.state.active.stage;
  tick(preview, { ...ctx, pose: { x: 999999, z: 999999 } }, 30);
  assert.equal(preview.state.active.stage, stage, 'preview still needs the actual objective');
  assert.deepEqual(preview.serialize(), saved);
  finishMission(preview, true);
  assert.deepEqual(preview.serialize(), saved, 'preview success cannot advance any career prefix');
  assert.deepEqual(preview.journal(), journal);
  assert.equal(preview.current()?.id, normalId, 'normal mission returns after preview');
  assert.equal(preview.startDeveloper(chapter.id, developerContext).ok, true);
  preview.cancel(); preview.drainEvents();
  assert.equal(preview.current()?.id, normalId);
  assert.deepEqual(preview.serialize(), saved, 'cancellation clears only transient mission');
  assert.equal(preview.startDeveloper(chapter.id, developerContext).ok, true);
  tick(preview, { ...ctx, recovering: true });
  assert.equal(preview.state.active, null);
  assert.equal(preview.current()?.id, normalId);
  assert.deepEqual(preview.serialize(), saved, 'recovery failure preserves career progress');
  preview.drainEvents();
}
assert.equal(preview.selectCharacter('student', ctx).ok, true);
for (const chapter of previewChapters) {
  const saved = preview.serialize();
  assert.equal(preview.startDeveloper(chapter.id, { ...ctx, developer: true }).ok, true, 'any selected hero can preview every chapter owner');
  assert.equal(preview.state.active.character, chapter.character);
  assert.equal(preview.state.character, 'student');
  assert.deepEqual(preview.serialize(), saved);
  preview.cancel(); preview.drainEvents();
  assert.equal(preview.current().id, 'student-paper-chase');
  assert.deepEqual(preview.serialize(), saved);
}
assert.equal(preview.selectCharacter('basement', ctx).ok, true);
assert.equal(preview.characters.find(hero => hero.id === 'basement').onFoot, false, 'preview metadata preserves Milo\'s car start');
finishMission(preview);
assert.deepEqual(preview.state.intros.basement, ['basement-touch-grass'], 'normal completion still works after developer previews');
assert.equal(preview.start(ctx).ok, true);
const normalActive = structuredClone(preview.state.active);
assert.equal(preview.startDeveloper('home-by-the-lake', { ...ctx, developer: true }).ok, false);
assert.deepEqual(preview.state.active, normalActive, 'preview cannot replace an ordinary active mission');
preview.cancel(); preview.drainEvents();
preview.selectCharacter('student', ctx);
const previewSave = preview.serialize();
const staleAlarm = { serial: 12, roomId: 'interior-telopea-school', outcome: 'triggered' };
assert.equal(preview.startDeveloper('student-paper-chase', { ...ctx, developer: true, schoolAlarm: staleAlarm }).ok, true);
tick(preview, { ...ctx, onFoot: true, interior: { roomId: staleAlarm.roomId }, schoolAlarm: staleAlarm });
assert.equal(preview.state.active.stage, 0, 'preview also rejects receipts from before admission');
tick(preview, { ...ctx, pose: { x: 999999, z: 999999 } }, 5000);
assert.equal(preview.state.active, null, 'preview expires through the actual mission timer');
assert.deepEqual(preview.serialize(), previewSave, 'timeout never grants completion');
assert.equal(preview.drainEvents().some(event => ['complete', 'developer-complete'].includes(event.type)), false);
campaign.drainEvents();
const openings = [];
const heroes = ['student', 'corporate', 'basement'];
const poseBeforeSelection = structuredClone(ctx.pose);
for (const hero of heroes) {
  const progressBeforeSelection = campaign.serialize();
  assert.equal(campaign.selectCharacter(hero, ctx).ok, true);
  assert.deepEqual(campaign.serialize().intros, progressBeforeSelection.intros, 'selection does not advance introductions');
  assert.equal(campaign.drainEvents().length, 0, 'selection emits no reward or teleport events');
  assert.deepEqual(ctx.pose, poseBeforeSelection, 'selection preserves the player location');
  openings.push(finishMission(campaign));
  assert.equal(campaign.state.intros[hero].length, 1);
  assert.ok(campaign.canSelectCharacter('student'), 'partial introduction permits switching');
}
const partialSave = campaign.serialize();
assert.deepEqual(Object.values(partialSave.intros).map(chapters => chapters.length), [1, 1, 1]);
const partialReload = createCampaign(map, partialSave);
assert.deepEqual(partialReload.serialize(), partialSave, 'all three independent partial prefixes survive reload');
assert.equal(partialReload.drainEvents().length, 0, 'reload earns no rewards');
for (const hero of heroes) {
  assert.equal(partialReload.selectCharacter(hero, ctx).ok, true);
  assert.equal(partialReload.current().id, { student: 'student-extra-credit', corporate: 'corporate-lunch-breakpoint', basement: 'basement-first-delivery' }[hero]);
  assert.equal(partialReload.drainEvents().length, 0);
}
campaign = partialReload;
for (const hero of heroes) {
  assert.equal(campaign.selectCharacter(hero, ctx).ok, true);
  openings.push(finishMission(campaign));
  if (hero !== 'basement') assert.equal(campaign.current(), null, 'other introductions required before convergence');
}

assert.equal(new Set(openings).size, 6, 'six original, different opening missions');
assert.equal(campaign.current().id, 'three-receipts');
assert.equal(campaign.nextRequiredCharacter(), null, 'the shared meeting accepts any protagonist');
assert.equal(finishMission(campaign), 'three-receipts');
assert.equal(campaign.state.meeting, true);
const chapterOwners = ['basement', 'student', 'corporate', 'corporate', 'student', 'basement'];
const chapterRewards = [350, 450, 700, 800, 1000, 1200];
for (let index = 0; index < legacyIds.length; index++) {
  const id = legacyIds[index], owner = chapterOwners[index];
  for (const wrongHero of heroes.filter(hero => hero !== owner)) {
    assert.equal(campaign.selectCharacter(wrongHero, ctx).ok, true, 'any hero may be selected between courier missions');
    assert.equal(campaign.current(), null, `${wrongHero} cannot take ${owner}'s mission`);
    assert.equal(campaign.nextRequiredCharacter().id, owner);
    assert.ok(Object.isFrozen(campaign.nextRequiredCharacter()), 'required hero metadata is immutable');
    const before = campaign.serialize();
    assert.equal(campaign.start(ctx).ok, false, 'wrong hero cannot start the next shared chapter');
    assert.match(campaign.start(ctx).message, new RegExp(campaign.nextRequiredCharacter().name));
    tick(campaign, ctx);
    assert.deepEqual(campaign.serialize(), before, 'wrong hero cannot advance the global prefix');
    assert.deepEqual(campaign.drainEvents(), [], 'wrong hero earns no reward');
    campaign = createCampaign(map, campaign.serialize());
    assert.equal(campaign.current(), null, 'wrong-owner gate survives reload');
    assert.equal(campaign.nextRequiredCharacter().id, owner);
  }
  assert.equal(campaign.selectCharacter(owner, ctx).ok, true);
  assert.equal(campaign.nextRequiredCharacter(), null, 'selected owner can begin without another switch');
  assert.equal(campaign.current().character, owner);
  assert.deepEqual(campaign.current().companions, heroes.filter(hero => hero !== owner), 'the other two heroes accompany each heist');
  assert.equal(campaign.current().reward, chapterRewards[index], 'owner assignment preserves each original reward');
  assert.equal(finishMission(campaign), id, 'six existing chapters retain their global order and reward');
  campaign = createCampaign(map, campaign.serialize());
  assert.deepEqual(campaign.state.completed, legacyIds.slice(0, index + 1), 'each completed prefix survives reload without replay');
}
for (const id of continuationIds) {
  const owner = campaign.nextRequiredCharacter()?.id || campaign.state.character;
  assert.equal(campaign.selectCharacter(owner, ctx).ok, true);
  assert.equal(finishMission(campaign), id, 'the new continuation follows the preserved original prefix');
}
for (const hero of heroes) {
  campaign.selectCharacter(hero, ctx);
  const owned = campaign.chapters.filter(chapter => legacyIds.includes(chapter.id));
  assert.equal(owned.length, 2, 'each protagonist owns two later courier missions');
  assert.ok(owned.every(chapter => chapter.character === hero));
  assert.equal(campaign.current(), null, 'finished heroes cannot replay completed missions');
  assert.equal(campaign.nextRequiredCharacter(), null);
  assert.equal(campaign.start(ctx).ok, false);
  assert.deepEqual(campaign.drainEvents(), []);
}
assert.equal(campaign.current(), null);
assert.deepEqual(campaign.state.completed, [...legacyIds, ...continuationIds]);
assert.ok(campaign.isCompleted('student-paper-chase'));
assert.ok(Object.isFrozen(campaign.journal().introductions[0].chapters[0]));
assert.ok(Object.isFrozen(campaign.snapshot()));
assert.deepEqual(createCampaign(map, campaign.serialize()).serialize(), campaign.serialize());

const legacy = createCampaign(map, { version: 1, completed: ['late-parcel'] });
assert.equal(legacy.current().id, 'under-the-awning');
assert.equal(legacy.state.character, 'legacy');
assert.equal(legacy.nextRequiredCharacter(), null, 'untouched legacy saves preserve their original owner-free route');
assert.equal(legacy.chapters.length, 15, 'legacy journal keeps the original six and appended continuation');
assert.equal(legacy.drainEvents().length, 0, 'migration never grants rewards');
assert.equal(legacy.serialize().version, 2);
assert.equal(legacy.selectCharacter('corporate', ctx).ok, true, 'legacy players can try new heroes');
assert.equal(legacy.current().id, 'corporate-present-tense');
assert.deepEqual(legacy.state.completed, ['late-parcel'], 'new intros retain old shared prefix');
assert.deepEqual(createCampaign(map, legacy.serialize()).state.completed, ['late-parcel']);
finishMission(legacy); finishMission(legacy);
for (const hero of ['student', 'basement']) { legacy.selectCharacter(hero, ctx); finishMission(legacy); finishMission(legacy); }
assert.equal(finishMission(legacy), 'three-receipts');
assert.equal(legacy.current(), null, 'new heroes retain ownership gates after legacy migration');
assert.equal(legacy.nextRequiredCharacter().id, 'student');
legacy.selectCharacter('student', ctx);
assert.equal(legacy.current().id, 'under-the-awning', 'correct owner resumes retained shared progress without replaying the first reward');
assert.deepEqual(legacy.state.completed, ['late-parcel']);

const oldRoute = createCampaign(map, { version: 1, completed: [] });
for (const id of legacyIds) {
  assert.equal(oldRoute.nextRequiredCharacter(), null);
  assert.equal(finishMission(oldRoute), id, 'untouched legacy route plays all six chapters without owner gates');
}
assert.deepEqual(createCampaign(map, oldRoute.serialize()).state.completed, legacyIds);

const oldPlay = createCampaign(map, { version: 1, completed: [] });
oldPlay.start(ctx);
tick(oldPlay, { ...ctx, vehicle: { stolen: false } });
assert.equal(oldPlay.state.active.stage, 0, 'interception requires an actual stolen vehicle');
tick(oldPlay, { ...ctx, vehicle: { stolen: true } });
assert.equal(oldPlay.state.active.stage, 1);
tick(oldPlay, { ...ctx, vehicle: { stolen: true }, pose: { x: 100, z: 10, speed: 12 } });
assert.deepEqual(oldPlay.state.completed, [], 'drive-by does not hand over');
tick(oldPlay, { ...ctx, vehicle: { stolen: true }, pose: { x: 100, z: 10, speed: 0 } });
assert.deepEqual(oldPlay.state.completed, ['late-parcel']);
oldPlay.start(ctx);
tick(oldPlay, { ...ctx, onFoot: true, pose: { x: 100, z: 10 } }, 30);
assert.equal(oldPlay.state.active.stage, 0, 'outside cannot collect the indoor ledger');
tick(oldPlay, { ...ctx, onFoot: true, interior: { storeId: 'coals', atCounter: true } }, 25);
assert.equal(oldPlay.state.active.stage, 0, 'standing at the counter does not complete a robbery');
tick(oldPlay, { ...ctx, onFoot: true, interior: { storeId: 'coals' }, heist: { serial: 1, kind: 'robbery', storeId: 'coals' } });
assert.equal(oldPlay.state.active.stage, 1);
oldPlay.update(.1, { ...ctx, respawnSerial: 1 });
assert.equal(oldPlay.state.active, null);
assert.equal(oldPlay.state.failed, true);
assert.deepEqual(oldPlay.state.completed, ['late-parcel']);
assert.equal(oldPlay.start(ctx).ok, true);
assert.equal(createCampaign(map, oldPlay.serialize()).state.active, null, 'interrupted mission is transient');

const schoolEntry = { x: 12, z: 34, roomId: 'interior-telopea-school' };
const schoolCampaign = createCampaign({ ...map, schoolEntry });
schoolCampaign.selectCharacter('student', ctx);
assert.equal(schoolCampaign.current().id, 'student-paper-chase', 'school story retains completed-save identity');
assert.equal(schoolCampaign.current().name, 'False start');
assert.deepEqual([schoolCampaign.current().stages[0].x, schoolCampaign.current().stages[0].z], [12, 34]);
schoolEntry.x = 999;
assert.equal(schoolCampaign.current().stages[0].x, 12, 'school approach is copied at construction');
const alarm = { serial: 20, roomId: 'interior-telopea-school', outcome: 'triggered' };
schoolCampaign.start({ ...ctx, schoolAlarm: alarm });
assert.equal(schoolCampaign.state.active.combat, false, 'school mission blocks attacks');
const schoolContext = { ...ctx, onFoot: true, interior: { roomId: alarm.roomId }, schoolAlarm: alarm };
for (const invalid of [
  schoolContext,
  { ...schoolContext, schoolAlarm: { ...alarm, serial: 21, roomId: 'wrong-room' } },
  { ...schoolContext, schoolAlarm: { ...alarm, serial: 21, outcome: 'cancelled' } },
  { ...schoolContext, schoolAlarm: { ...alarm, serial: 21 }, interior: { roomId: 'wrong-room' } },
  { ...schoolContext, schoolAlarm: { ...alarm, serial: 21 }, onFoot: false },
  { ...schoolContext, schoolAlarm: { ...alarm, serial: 21 }, sandbox: true },
]) {
  tick(schoolCampaign, invalid);
  assert.equal(schoolCampaign.state.active.stage, 0, 'stale, wrong-room, failed or sandbox alarm cannot advance the school story');
}
tick(schoolCampaign, { ...schoolContext, wanted: 1, schoolAlarm: { ...alarm, serial: 21 } });
assert.equal(schoolCampaign.state.active.stage, 1);
const schoolExit = { ...ctx, onFoot: true, pose: { x: 12, z: 34 } };
for (const invalid of [{ ...schoolExit, wanted: 1 }, { ...schoolExit, interior: { roomId: alarm.roomId } }, { ...schoolExit, onFoot: false }]) {
  tick(schoolCampaign, invalid, 40);
  assert.equal(schoolCampaign.state.active.stage, 1, 'escape requires outside, on foot and clear of police');
}
tick(schoolCampaign, schoolExit, 40);
assert.equal(schoolCampaign.state.active, null);
assert.deepEqual(schoolCampaign.state.intros.student, ['student-paper-chase']);
assert.equal(schoolCampaign.drainEvents().filter(event => event.type === 'complete').length, 1);
assert.throws(() => createCampaign({ ...map, schoolEntry: { x: NaN, z: 0 } }), /finite/);

const robbery = createCampaign(map, { version: 1, completed: ['late-parcel'] });
const heist = { serial: 30, storeId: 'coals', kind: 'robbery' };
robbery.start({ ...ctx, heist });
const robberyContext = { ...ctx, onFoot: true, interior: { storeId: 'coals', roomId: 'coals-room', atCounter: true }, heist };
for (const invalid of [
  robberyContext,
  { ...robberyContext, heist: { ...heist, serial: 31, storeId: 'wrong-store' } },
  { ...robberyContext, heist: { ...heist, serial: 31, kind: 'purchase' } },
  { ...robberyContext, heist: { ...heist, serial: 31 }, interior: { storeId: 'wrong-store' } },
  { ...robberyContext, heist: { ...heist, serial: 31 }, onFoot: false },
  { ...robberyContext, heist: { ...heist, serial: 31 }, sandbox: true },
  { ...robberyContext, heist: null, workCompletion: { serial: 100, storeId: 'coals' } },
]) {
  tick(robbery, invalid);
  assert.equal(robbery.state.active.stage, 0, 'only a fresh matching completed robbery can recover the ledger');
}
tick(robbery, { ...robberyContext, heist: { ...heist, serial: 31 } });
assert.equal(robbery.state.active.stage, 1);
assert.deepEqual(robbery.state.completed, ['late-parcel'], 'robbery does not skip the getaway');
robbery.cancel();
assert.equal(robbery.start({ ...ctx, heist: { ...heist, serial: 31 } }).ok, true);
tick(robbery, { ...robberyContext, heist: { ...heist, serial: 31 } });
assert.equal(robbery.state.active.stage, 0, 'a cancelled robbery receipt cannot be reused on retry');

const metadataCampaign = createCampaign(map);
const missionDefinitions = new Map();
for (const hero of heroes) {
  metadataCampaign.selectCharacter(hero, ctx);
  for (const mission of metadataCampaign.chapters) missionDefinitions.set(mission.id, mission);
}
assert.equal(missionDefinitions.size, 22, 'all existing mission identities and appended crime chapters are retained');
for (const mission of missionDefinitions.values()) {
  assert.ok(Object.isFrozen(mission.cutscene.lines[0]), 'backstory data is immutable');
  assert.equal(mission.cutscene.id, mission.id);
  assert.ok(mission.cutscene.title.length > 0);
  assert.equal(mission.cutscene.lines.length, 2, 'pre-mission backstories stay compact');
  assert.ok(mission.cutscene.lines.every(line => line.speaker && line.text && Number.isFinite(line.duration)));
  assert.ok(mission.cutscene.lines.reduce((total, line) => total + line.duration, 0) <= 10);
}
for (const id of ['student-paper-chase', 'student-extra-credit', 'corporate-present-tense', 'basement-touch-grass']) {
  assert.equal(missionDefinitions.get(id).combat, false, `${id} disables attacks during the job`);
}

const corporate = createCampaign(map);
corporate.selectCharacter('corporate', ctx);
const presentation = { serial: 5, roomId: 'interior-canberra-centre', outcome: 'outage' };
corporate.start({ ...ctx, presentation });
const office = { ...ctx, onFoot: true, interior: { roomId: presentation.roomId }, presentation };
tick(corporate, office);
assert.equal(corporate.state.active.stage, 0, 'old presentation cannot satisfy a new mission');
tick(corporate, { ...office, presentation: { ...presentation, serial: 6, roomId: 'wrong-room' } });
assert.equal(corporate.state.active.stage, 0);
tick(corporate, { ...office, presentation: { ...presentation, serial: 6 } });
assert.equal(corporate.state.active.stage, 1);
tick(corporate, { ...ctx, onFoot: true, pose: { ...corporate.state.active.target } }, 25);
corporate.drainEvents();
corporate.start(ctx);
const counter = { ...ctx, onFoot: true, interior: { roomId: 'noodle-room', storeId: 'store-5656111023', atCounter: true }, encounter: { serial: 10, storeId: 'store-5656111023', roomId: 'noodle-room', character: 'booth-guest', phase: 'complete', outcome: 'peaceful' } };
tick(corporate, counter);
assert.equal(corporate.state.active.stage, 1);
tick(corporate, counter);
assert.equal(corporate.state.active.stage, 1, 'encounter predating booth stage is stale');
tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome: null } });
assert.equal(corporate.state.active.stage, 1);
for (const outcome of ['peaceful', 'confrontation', 'noodle-fight']) {
  tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome } });
  assert.equal(corporate.state.active.stage, 1, `${outcome} does not count as Rowan's noodle fight`);
}
for (const mismatch of [{ phase: 'confronting' }, { roomId: 'wrong-room' }, { storeId: 'coals' }, { character: 'employee' }]) {
  tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome: 'noodle-victory', victory: true, missionId: 'corporate-lunch-breakpoint', ...mismatch } });
  assert.equal(corporate.state.active.stage, 1, 'only a complete matching guest encounter counts');
}
tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 10, outcome: 'noodle-fight' } });
assert.equal(corporate.state.active.stage, 1, 'old noodle fights do not count');
tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome: 'noodle-victory', victory: true, missionId: 'corporate-lunch-breakpoint' } });
assert.equal(corporate.state.active.stage, 2);
assert.deepEqual(corporate.state.intros.corporate, ['corporate-present-tense'], 'fight alone does not skip the exit');
tick(corporate, { ...ctx, onFoot: true, wanted: 1, pose: { ...corporate.state.active.target } }, 35);
assert.equal(corporate.state.active.stage, 2, 'escape objective still requires a clear wanted state');
tick(corporate, { ...ctx, onFoot: true, pose: { ...corporate.state.active.target } }, 35);
assert.equal(corporate.state.active, null);
assert.equal(corporate.drainEvents().filter(event => event.type === 'complete').length, 1);

const workSave = createCampaign(map).serialize();
workSave.character = 'student'; workSave.intros.student = ['student-paper-chase'];
const worker = createCampaign(map, workSave);
worker.start(ctx);
const receipt = { serial: 2, storeId: 'coals' };
tick(worker, { ...ctx, pose: { x: 100, z: 10 }, workCompletion: receipt });
assert.equal(worker.state.active.stage, 1);
const shift = { ...ctx, onFoot: true, interior: { storeId: 'coals' }, workCompletion: receipt };
tick(worker, shift);
assert.equal(worker.state.active.stage, 1, 'previous wages do not prove a new task');
tick(worker, { ...shift, workCompletion: { serial: 3, storeId: 'wrong-store' } });
assert.equal(worker.state.active.stage, 1);
tick(worker, { ...shift, workCompletion: { serial: 3, storeId: 'coals' } });
assert.equal(worker.state.active, null);
assert.equal(worker.drainEvents().filter(e => e.type === 'complete').length, 1);

for (const save of [
  { version: 1, completed: ['borrowed-wheels'] },
  { version: 1, completed: ['late-parcel', 'late-parcel'] },
  { version: 1, completed: [], money: 100 },
  { ...workSave, extra: true },
  { ...workSave, character: 'unknown' },
  { ...partialSave, intros: { ...partialSave.intros, corporate: ['corporate-lunch-breakpoint'] } },
  { ...partialSave, intros: { ...partialSave.intros, basement: ['basement-touch-grass', 'basement-touch-grass'] } },
  { ...partialSave, intros: { ...partialSave.intros, corporate: ['corporate-present-tense'], extra: [] } },
  { ...partialSave, character: 'legacy', legacy: false },
  { ...partialSave, meeting: true },
  { ...partialSave, completed: ['late-parcel'] },
  { ...workSave, intros: { ...workSave.intros, student: ['corporate-present-tense'] } },
  { ...workSave, completed: ['late-parcel'] },
  { ...workSave, meeting: true },
  { ...workSave, character: null },
]) assert.throws(() => createCampaign(map, save), /corrupt/);
const timeout = createCampaign(map, { version: 1, completed: [] });
timeout.start(ctx);
tick(timeout, { ...ctx, pose: { x: 10000, z: 10000 } }, 3601);
assert.equal(timeout.state.active, null);
assert.equal(timeout.state.failed, true);
assert.deepEqual(timeout.state.completed, []);
assert.equal(timeout.selectCharacter('student', ctx).ok, true, 'time failure unlocks character switching');
assert.equal(timeout.state.failed, false);
assert.equal(timeout.current().id, 'student-paper-chase');
assert.equal(timeout.start(ctx).ok, true, 'time failure permits a clean retry');
timeout.update(.1, { ...ctx, respawnSerial: 1 });
assert.equal(timeout.state.active, null);
assert.equal(timeout.selectCharacter('corporate', ctx).ok, true, 'recovery failure unlocks character switching');
assert.equal(timeout.current().id, 'corporate-present-tense');
assert.throws(() => worker.update(NaN, ctx));
assert.throws(() => worker.update(-1, ctx));
const meetingSave={version:2,character:'student',intros:{student:['student-paper-chase','student-extra-credit'],corporate:['corporate-present-tense','corporate-lunch-breakpoint'],basement:['basement-touch-grass','basement-first-delivery']},meeting:false,legacy:false,completed:[]};
const meetingPoint={x:15,z:25};
const relocated=createCampaign(map,meetingSave,{meetingPoint});
assert.deepEqual([relocated.current().stages[0].x,relocated.current().stages[0].z],[15,25]);
meetingPoint.x=999;assert.equal(relocated.current().stages[0].x,15,'factory copies authored meeting coordinates');
assert(Object.isFrozen(relocated.current().stages[0]));
assert.equal(relocated.current().reward,200);assert.equal(relocated.current().stages[1].x,map.spawn.x);
assert.equal(createCampaign(map,meetingSave).current().stages[0].x,923,'default fixture meeting unchanged');
assert.deepEqual(createCampaign(map,{version:1,completed:[]},{meetingPoint:{x:15,z:25}}).current(),createCampaign(map,{version:1,completed:[]}).current(),'meeting override preserves six legacy chapter targets and rewards');
for(const invalid of [null,{}, {x:NaN,z:0},{x:0,z:Infinity}])assert.throws(()=>createCampaign(map,null,{meetingPoint:invalid}),/finite/);
const homeDescriptor = { roomId: 'interior-source-house', buildingId: 'source-house', name: "Milo's safehouse", street: 'Dawes Street', x: 41, z: 52, approach: { x: 45, z: 55 } };
const homeMap = { ...map, storyHomes: { basement: homeDescriptor } };
const homeCampaign = createCampaign(homeMap);
assert.deepEqual(homeCampaign.characters.find(hero => hero.id === 'basement').start, { x: 45, z: 55 }, 'Milo begins at the supplied checked home approach');
homeCampaign.selectCharacter('basement', ctx);
assert.match(homeCampaign.current().briefing, /Dawes Street/);
assert.equal(homeCampaign.characters.find(hero=>hero.id==='basement').onFoot,false);
assert.match(homeCampaign.current().briefing,/saloon/);
assert.match(homeCampaign.current().briefing,/Press E beside your car to get in, drive to Coals and stop/);
assert.deepEqual(homeCampaign.current().stages.map(goal=>goal.kind),['home-action','foot','drive','work']);
assert.equal(homeCampaign.current().stages[0].kind, 'home-action');
assert.equal(homeCampaign.current().stages[0].stationId, 'interior-source-house-stash');
assert.equal(homeCampaign.current().stages[0].roomId, homeDescriptor.roomId);
homeDescriptor.approach.x = 999;
assert.equal(homeCampaign.characters.find(hero => hero.id === 'basement').start.x, 45, 'mission home start is copied and frozen');
homeDescriptor.approach.x = 45;
const homeAction = { serial: 40, roomId: homeDescriptor.roomId, outcome: 'packed' };
homeCampaign.start({ ...ctx, homeAction });
assert.equal(homeCampaign.state.active.combat, false);
const homeContext = { ...ctx, onFoot: true, interior: { roomId: homeDescriptor.roomId }, homeAction };
for (const invalid of [
  homeContext,
  { ...homeContext, homeAction: { ...homeAction, serial: 41, roomId: 'wrong-home' } },
  { ...homeContext, homeAction: { ...homeAction, serial: 41, outcome: 'cancelled' } },
  { ...homeContext, homeAction: { ...homeAction, serial: 41 }, interior: { roomId: 'wrong-home' } },
  { ...homeContext, homeAction: { ...homeAction, serial: 41 }, onFoot: false },
  { ...homeContext, homeAction: { ...homeAction, serial: 41 }, interior: null },
  { ...homeContext, homeAction: { ...homeAction, serial: 41 }, sandbox: true },
  { ...homeContext, homeAction: null, workCompletion: { serial: 100, storeId: 'coals' } },
]) {
  tick(homeCampaign, invalid);
  assert.equal(homeCampaign.state.active.stage, 0, 'home task requires a fresh successful packed event in the correct live room');
}
homeCampaign.cancel();
homeCampaign.start({ ...ctx, homeAction: { ...homeAction, serial: 41 } });
tick(homeCampaign, { ...homeContext, homeAction: { ...homeAction, serial: 41 } });
assert.equal(homeCampaign.state.active.stage, 0, 'a task completed before retry cannot be reused');
tick(homeCampaign, { ...homeContext, homeAction: { ...homeAction, serial: 42 } });
assert.equal(homeCampaign.state.active.stage, 1);
assert.deepEqual(homeCampaign.state.intros.basement, [], 'packing alone cannot skip the exterior or paid shift');
const homeExterior = { ...ctx, onFoot: true, pose: { x: 45, z: 55 } };
tick(homeCampaign, { ...homeExterior, interior: { roomId: homeDescriptor.roomId } });
assert.equal(homeCampaign.state.active.stage, 1, 'the outside objective cannot complete inside the home');
tick(homeCampaign, homeExterior);
assert.equal(homeCampaign.state.active.stage, 2);
const coalsArrival={...ctx,pose:{x:100,z:10,speed:0},workCompletion:{serial:50,storeId:'coals'}};
for(const invalid of [
  {...coalsArrival,onFoot:true},
  {...coalsArrival,pose:{...coalsArrival.pose,speed:5}},
  {...coalsArrival,vehicleHealth:0},
  {...coalsArrival,pose:{x:45,z:55,speed:0}},
  {...coalsArrival,onFoot:true,interior:{storeId:'coals'},workCompletion:{serial:50,storeId:'coals'}},
]){
  tick(homeCampaign,invalid);
  assert.equal(homeCampaign.state.active.stage,2,'walking, a moving/wrecked car or an early shift cannot skip driving to Coals and stopping');
}
assert.equal(homeCampaign.drainEvents().filter(event=>event.type==='complete').length,0,'no car grant, arrival or early receipt earns a mission reward');
tick(homeCampaign,coalsArrival);
assert.equal(homeCampaign.state.active.stage,3);
assert.deepEqual(homeCampaign.state.intros.basement,[],'parking does not pay or complete the stock shift');
for(const invalid of [
  {...ctx,onFoot:true,interior:{storeId:'coals'},workCompletion:{serial:50,storeId:'coals'}},
  {...ctx,onFoot:true,interior:{storeId:'wrong-shop'},workCompletion:{serial:51,storeId:'coals'}},
  {...ctx,onFoot:false,interior:{storeId:'coals'},workCompletion:{serial:51,storeId:'coals'}},
  {...ctx,onFoot:true,interior:{storeId:'coals'},workCompletion:{serial:51,storeId:'wrong-shop'}},
  {...ctx,onFoot:true,workCompletion:{serial:51,storeId:'coals'}},
]){
  tick(homeCampaign,invalid);assert.equal(homeCampaign.state.active.stage,3,'paid work still requires its matching live room and fresh stock receipt');
}
tick(homeCampaign, { ...ctx, onFoot: true, interior: { storeId: 'coals' }, workCompletion: { serial: 52, storeId: 'coals' } });
assert.deepEqual(homeCampaign.state.intros.basement, ['basement-touch-grass']);
assert.equal(homeCampaign.drainEvents().filter(event => event.type === 'complete').length, 1);
const miloSaved=homeCampaign.serialize(),miloReload=createCampaign(homeMap,miloSaved);
assert.deepEqual(miloReload.serialize(),miloSaved,'existing v2 prefixes retain the same mission IDs');
assert.equal(miloReload.current().id,'basement-first-delivery');assert.equal(miloReload.drainEvents().length,0,'reload never awards a car, cash or mission payment');
assert.deepEqual(miloReload.current().stages.map(goal=>goal.kind),['foot','drive','foot'],'Signed for retains its actual drive delivery');
assert.match(miloReload.current().briefing,/Press E beside your car to get in/);

const finale = createCampaign(homeMap, { ...meetingSave, character: 'basement', meeting: true, completed: legacyIds.slice(0, 5) });
assert.equal(finale.current().id, 'home-by-the-lake');
assert.equal(finale.current().reward, 1200);
assert.deepEqual(finale.current().stages.map(goal => goal.kind), ['drive', 'home-action', 'foot']);
assert.ok(finale.current().stages.every(goal => goal.label.includes('Dawes Street')), 'all finale objectives identify the actual supplied home street');
assert.ok(finale.current().cutscene.lines.some(line => line.text.includes('Dawes Street')));
finale.start({ ...ctx, homeAction: { ...homeAction, serial: 42 } });
const finalePark = { ...ctx, pose: { x: 45, z: 55 } };
tick(finale, { ...finalePark, pose: { ...finalePark.pose, speed: 10 } });
assert.equal(finale.state.active.stage, 0, 'final home arrival requires stopping');
tick(finale, finalePark);
assert.equal(finale.state.active.stage, 1);
tick(finale, { ...homeContext, homeAction: { ...homeAction, serial: 42 } });
assert.equal(finale.state.active.stage, 1, 'the intro home receipt cannot pack the final recovered ledger');
tick(finale, { ...homeContext, homeAction: { ...homeAction, serial: 43 } });
assert.equal(finale.state.active.stage, 2);
assert.deepEqual(finale.state.completed, legacyIds.slice(0, 5));
for (const invalid of [{ ...finalePark, onFoot: false }, { ...finalePark, onFoot: true, wanted: 1 }, { ...finalePark, onFoot: true, interior: { roomId: homeDescriptor.roomId } }]) {
  tick(finale, invalid, 40);
  assert.equal(finale.state.active.stage, 2, 'final split requires being outside, on foot and clear');
}
tick(finale, { ...finalePark, onFoot: true }, 40);
assert.deepEqual(finale.state.completed, legacyIds);
assert.equal(finale.drainEvents().filter(event => event.type === 'complete').length, 1);
assert.deepEqual(createCampaign(homeMap, finale.serialize()).state.completed, legacyIds, 'final home completion remains save-compatible');
for (const invalid of [{ ...homeDescriptor, x: NaN }, { ...homeDescriptor, roomId: '' }]) {
  assert.throws(() => createCampaign({ ...map, storyHomes: { basement: invalid } }), /finite entry and room identity/);
}
// Read only the bounded northern snapshot: no simulation, renderer or full-map
// collider build is needed to prove the bridge objective uses its source road.
const north = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra-north.json', import.meta.url), 'utf8'));
const sourceRoad = north.roads.find(road => road.sourceId === 'way/4878920');
assert.ok(sourceRoad && sourceRoad.sourceTags.bridge === 'yes');
const sourcePlaces = expansionPlaces({ roads: [sourceRoad] });
const bridgeApproach = sourcePlaces.find(point => point.id === 'commonwealth-bridge');
const bridgeCampaign = createCampaign({ ...map, roads: north.roads, landmarks: [...map.landmarks, { id: 'commonwealth-bridge', x: -1230, z: -2840 }] }, { ...meetingSave, meeting: true, completed: legacyIds.slice(0, 4) });
assert.equal(bridgeCampaign.current().id, 'across-the-water');
const bridgeStages = bridgeCampaign.current().stages;
const regroupGoal = bridgeStages[0], bridgeGoal = bridgeStages[1];
const publicApproachRoad = north.roads.find(road => road.sourceId === 'way/5640616');
assert.equal(publicApproachRoad.sourceTags['sidewalk:both'], 'yes', 'crew regroup uses an explicitly sourced public sidewalk road');
assert.ok(publicApproachRoad.points.some(point => point[0] === regroupGoal.x && point[1] === regroupGoal.z), 'crew regroup uses an exact Flynn Drive source vertex');
assert.equal(regroupGoal.kind, 'drive');
assert.equal(regroupGoal.stop, true);
assert.equal(bridgeStages.length, 3, 'the source-safe regroup precedes the bridge crossing and Centre drop');
assert.deepEqual([bridgeGoal.x, bridgeGoal.z], [bridgeApproach.x, bridgeApproach.z], 'bridge score uses the exact source road midpoint even when a stale landmark is supplied');
const onSourceRoad = sourceRoad.points.slice(1).some((b, index) => {
  const a = sourceRoad.points[index], dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((bridgeGoal.x - a[0]) * dx + (bridgeGoal.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(bridgeGoal.x - a[0] - dx * t, bridgeGoal.z - a[1] - dz * t) < 1e-6;
});
assert.ok(onSourceRoad, 'source bridge mission target lies on an actual public-road segment');
assert.ok(Math.hypot(bridgeGoal.x + 1230, bridgeGoal.z + 2840) > bridgeGoal.radius, 'regression catches the old off-road fallback');
console.log('PASS campaign: interleaved independent introductions and partial-save reload; active-mission switching lock; won-fight-only lunch credit; three-character convergence; character-owned crew heists; fresh school alarm, robbery and proper-home objectives; compact backstories and job combat policy; retained six chapters; strict v1/v2 migration; replay and recovery gates');
