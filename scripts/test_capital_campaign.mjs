import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const src = await readFile(new URL('../Games/Capital Drive/campaign.js', import.meta.url), 'utf8');
const { createCampaign } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const map = { spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
const ctx = { pose: { x: 0, z: 0, speed: 0 }, onFoot: false, vehicle: { stolen: false }, vehicleHealth: 100,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false };
const tick = (campaign, context, count = 15) => { for (let i = 0; i < count; i++) campaign.update(.1, context); };
const legacyIds = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake'];

let campaign = createCampaign(map);
assert.equal(campaign.current(), null);
assert.equal(campaign.nextRequiredCharacter(), null);
assert.equal(campaign.start(ctx).ok, false, 'new campaigns require a hero');
assert.deepEqual(campaign.characters.map(c => c.id), ['student', 'corporate', 'basement']);
assert.ok(Object.isFrozen(campaign.characters[0].start));
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
function finishMission(value) {
  const mission = value.current();
  assert.ok(mission, 'mission available');
  assert.equal(value.start({ ...ctx, wanted: mission.incident ? 1 : 0 }).ok, true);
  const activeCharacter = value.state.character;
  for (const hero of ['student', 'corporate', 'basement']) {
    assert.equal(value.selectCharacter(hero, ctx).ok, false, 'every active chapter locks character selection');
  }
  assert.equal(value.state.character, activeCharacter);
  let guard = 0;
  while (value.state.active && guard++ < 12) {
    const target = value.state.active.target;
    const context = { ...ctx, pose: { ...target, speed: 0 }, vehicle: { stolen: true }, onFoot: ['foot', 'interior', 'work', 'presentation', 'encounter'].includes(target.kind) };
    if (target.kind === 'interior') context.interior = { storeId: target.storeId, roomId: 'shop-room', atCounter: true };
    if (target.kind === 'work') {
      context.interior = { storeId: target.storeId, roomId: 'shop-room' };
      context.workCompletion = { serial: ++serial, storeId: target.storeId };
    }
    if (target.kind === 'presentation') {
      context.interior = { roomId: target.roomId };
      context.presentation = { serial: ++serial, roomId: target.roomId, outcome: 'outage' };
    }
    if (target.kind === 'encounter') {
      context.interior = { storeId: target.storeId, roomId: 'noodle-room' };
      context.encounter = { serial: ++serial, storeId: target.storeId, roomId: 'noodle-room', character: 'booth-guest', phase: 'complete', outcome: 'noodle-fight' };
    }
    tick(value, context, Math.ceil(Math.max(target.hold || 0, 1.5) * 10) + 2);
  }
  assert.equal(value.state.active, null, `${mission.id} completed`);
  const completions = value.drainEvents().filter(e => e.type === 'complete');
  assert.equal(completions.length, 1, `${mission.id} pays exactly once`);
  assert.equal(completions[0].id, mission.id);
  assert.equal(completions[0].reward, mission.reward);
  tick(value, ctx);
  assert.equal(value.drainEvents().length, 0, 'no reward replay');
  return mission.id;
}
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
  assert.equal(campaign.current().reward, chapterRewards[index], 'owner assignment preserves each original reward');
  assert.equal(finishMission(campaign), id, 'six existing chapters retain their global order and reward');
  campaign = createCampaign(map, campaign.serialize());
  assert.deepEqual(campaign.state.completed, legacyIds.slice(0, index + 1), 'each completed prefix survives reload without replay');
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
assert.deepEqual(campaign.state.completed, legacyIds);
assert.ok(campaign.isCompleted('student-paper-chase'));
assert.ok(Object.isFrozen(campaign.journal().introductions[0].chapters[0]));
assert.ok(Object.isFrozen(campaign.snapshot()));
assert.deepEqual(createCampaign(map, campaign.serialize()).serialize(), campaign.serialize());

const legacy = createCampaign(map, { version: 1, completed: ['late-parcel'] });
assert.equal(legacy.current().id, 'under-the-awning');
assert.equal(legacy.state.character, 'legacy');
assert.equal(legacy.nextRequiredCharacter(), null, 'untouched legacy saves preserve their original owner-free route');
assert.equal(legacy.chapters.length, 6, 'legacy journal keeps all six old chapters');
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
tick(oldPlay, ctx);
assert.equal(oldPlay.state.active.stage, 1);
tick(oldPlay, { ...ctx, pose: { x: 100, z: 10, speed: 12 } });
assert.deepEqual(oldPlay.state.completed, [], 'drive-by does not hand over');
tick(oldPlay, { ...ctx, pose: { x: 100, z: 10, speed: 0 } });
assert.deepEqual(oldPlay.state.completed, ['late-parcel']);
oldPlay.start(ctx);
tick(oldPlay, { ...ctx, onFoot: true, pose: { x: 100, z: 10 } }, 30);
assert.equal(oldPlay.state.active.stage, 0, 'outside cannot collect the indoor ledger');
tick(oldPlay, { ...ctx, onFoot: true, interior: { storeId: 'coals', atCounter: true } }, 25);
assert.equal(oldPlay.state.active.stage, 1);
oldPlay.update(.1, { ...ctx, respawnSerial: 1 });
assert.equal(oldPlay.state.active, null);
assert.equal(oldPlay.state.failed, true);
assert.deepEqual(oldPlay.state.completed, ['late-parcel']);
assert.equal(oldPlay.start(ctx).ok, true);
assert.equal(createCampaign(map, oldPlay.serialize()).state.active, null, 'interrupted mission is transient');

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
for (const outcome of ['peaceful', 'confrontation']) {
  tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome } });
  assert.equal(corporate.state.active.stage, 1, `${outcome} does not count as Rowan's noodle fight`);
}
for (const mismatch of [{ phase: 'confronting' }, { roomId: 'wrong-room' }, { storeId: 'coals' }, { character: 'employee' }]) {
  tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome: 'noodle-fight', ...mismatch } });
  assert.equal(corporate.state.active.stage, 1, 'only a complete matching guest encounter counts');
}
tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 10, outcome: 'noodle-fight' } });
assert.equal(corporate.state.active.stage, 1, 'old noodle fights do not count');
tick(corporate, { ...counter, encounter: { ...counter.encounter, serial: 11, outcome: 'noodle-fight' } });
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
console.log('PASS campaign: interleaved independent introductions and partial-save reload; active-mission switching lock; noodle-fight-only lunch credit; three-character convergence; character-owned courier chapters; retained six chapters; strict v1/v2 migration; replay and recovery gates');
