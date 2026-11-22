import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAssassinationChapter, ASSASSINATION_MISSION_ID, ASSASSINATION_TARGET_ID } from '../Games/Capital Drive/assassination-mission.js';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createContractTarget } from '../Games/Capital Drive/contract-target.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { roadProfile } from '../Games/Capital Drive/road-network.js';
const source = JSON.parse(readFileSync(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url)));
const simulation = createSimulation(source, { trafficCount: 0 });
const canStand = p => !simulation.moveActor({ ...p }, 0, 0, .45).blocked;
const options = { canStand, hasLineOfSight: simulation.hasLineOfSight, nearestRoad: simulation.nearestRoad };
const chapter = createAssassinationChapter(source, options);
assert(chapter && Object.isFrozen(chapter) && Object.isFrozen(chapter.compound.props));
assert.equal(chapter.id, ASSASSINATION_MISSION_ID); assert.equal(chapter.combat, true); assert.equal(chapter.assassination, true);
assert.equal(chapter.stages[1].targetId, ASSASSINATION_TARGET_ID);
assert.equal(chapter.stages[1].kind, 'assassination'); assert.equal(chapter.stages.at(-1).kind, 'escape');
assert.equal(chapter.stages.at(-1).requireWanted, false, 'clear-search escape also supports an unwitnessed lethal action');
assert(chapter.cutscene.lines.length >= 2); assert.match(chapter.briefing, /fictional collection yard/);
assert.equal(createAssassinationChapter(source, { ...options, canStand: () => false }), null);
assert.equal(createAssassinationChapter(source, { ...options, hasLineOfSight: () => false }), null);
for (const goal of chapter.stages) {
  assert(canStand(goal));
  const road = simulation.nearestRoad(goal.x, goal.z);
  assert(road.distance >= roadProfile(road.road).driveWidth / 2 + 2, 'all player/target markers clear the carriageway');
}
const [entry, target, exit] = chapter.stages;
assert(Math.hypot(target.x - exit.x, target.z - exit.z) > 35);
const walker = { ...entry };
for (let i = 0; i < 30; i++) assert(!simulation.moveActor(walker, (target.x - entry.x) / 30, (target.z - entry.z) / 30).blocked, 'compound open front has a swept path to the live target');
const map = { ...source, landmarks: [...source.landmarks, { id: 'fixture-coals', name: 'Coals', store: true, x: 0, z: 0 }] };
const context = { pose: entry, onFoot: true, wanted: 0, campaign: true, health: 100, vehicleHealth: 100, respawnSerial: 0 };
let campaign = createCampaign(map, null, { assassinationMission: chapter });
assert.equal(campaign.startOptional(chapter.id, context).ok, false, 'normal character selection remains required');
assert(campaign.selectCharacter('student', context).ok);
// Detached complete-story fixtures exercise the unlock boundary, not naturally earned play.
const journal = campaign.journal();
const completeV1 = { version:1, completed:journal.shared.map(chapter=>chapter.id) };
const completeV2 = { version:2, character:'student', legacy:false, meeting:true,
  intros:Object.fromEntries(journal.introductions.map(hero=>[hero.character,hero.chapters.map(chapter=>chapter.id)])),
  completed:[...completeV1.completed] };
assert.equal(campaign.optionalUnlocked(), false, 'character selection alone does not unlock optional missions');
for (const saved of [campaign.serialize(),
  ...completeV1.completed.map((_,end)=>({ ...completeV1, completed:completeV1.completed.slice(0,end) })),
  ...completeV2.completed.map((_,end)=>({ ...completeV2, completed:completeV2.completed.slice(0,end) }))]) {
  const locked = createCampaign(map, saved, { assassinationMission: chapter });
  const beforeLocked = locked.serialize();
  assert.equal(locked.optionalUnlocked(), false);
  for (const optionalId of [chapter.id]) assert.equal(locked.startOptional(optionalId, context).ok, false, 'unfinished story locks every optional');
  assert.equal(locked.state.active, null);
  assert.deepEqual(locked.serialize(), beforeLocked, 'locked attempts preserve progress');
  assert.deepEqual(locked.drainEvents(), [], 'locked attempts emit no start or reward');
}
for (const missing of ['student','corporate','basement','meeting']) {
  const locked = createCampaign(map, completeV2, { assassinationMission: chapter });
  if (missing==='meeting') locked.state.meeting=false;
  else locked.state.intros[missing]=[];
  assert.equal(locked.optionalUnlocked(), false, 'full shared story cannot bypass v2 '+missing);
  const beforeLocked=locked.serialize();
  for (const optionalId of [chapter.id]) assert.equal(locked.startOptional(optionalId, context).ok, false);
  assert.deepEqual(locked.serialize(), beforeLocked);
}
const legacy = createCampaign(map, completeV1, { assassinationMission: chapter });
assert.equal(legacy.optionalUnlocked(), true, 'completed v1 story remains compatible');
for (const optionalId of [chapter.id]) {
  assert(legacy.startOptional(optionalId, context).ok, 'complete legacy story unlocks optional');
  assert(legacy.cancel());
}
campaign = createCampaign(map, completeV2, { assassinationMission: chapter });
assert.equal(campaign.optionalUnlocked(), true, 'v2 needs all introductions, meeting and shared story');
const before = campaign.serialize(), story = campaign.current()?.id ?? null;
const serviceRun = createCampaign(map, completeV2, { assassinationMission: chapter });
assert(serviceRun.startOptional(chapter.id, context).ok);
for(let i=0;i<6;i++)serviceRun.update(.1, { ...context, pose: chapter.compound.approaches.service });
assert.equal(serviceRun.state.active.stage, 1, 'arriving on foot at the separate service entrance opens the yard objective');
const old = { missionId: chapter.id, targetId: target.targetId, outcome: 'killed', serial: 0 };
assert(campaign.startOptional(chapter.id, { ...context, assassinationOutcome: old }).ok);
assert.equal(campaign.state.active.assassination, true); assert.equal(campaign.state.active.combat, true);
assert.equal(campaign.state.active.cutscene.id, chapter.id);
const tick = (change = {}, count = 12) => { for (let i = 0; i < count; i++) campaign.update(.1, { ...context, ...change }); };
tick({ pose: entry }); assert.equal(campaign.state.active.stage, 1);
for (const invalid of [undefined, old, { ...old, serial: Infinity }, { ...old, serial: 5, missionId: 'other' },
  { ...old, serial: 5, targetId: 'bystander' }, { ...old, serial: 5, outcome: 'stunned' }]) {
  tick({ pose: target, assassinationOutcome: invalid }); assert.equal(campaign.state.active.stage, 1, 'only a fresh exact lethal target receipt advances');
}
const liveTarget = createContractTarget({ hasLineOfSight: simulation.hasLineOfSight });
assert(liveTarget.load({ missionId: chapter.id, targetId: target.targetId, pose: target, appearanceId: target.appearanceId, label: target.targetName }));
const shotDistance = Math.hypot(target.x - entry.x, target.z - entry.z);
const ray = { x: entry.x, y: .95, z: entry.z, dx: (target.x - entry.x) / shotDistance, dy: 0, dz: (target.z - entry.z) / shotDistance,
  range: 30, interiorId: null };
assert.equal(liveTarget.hitByShot(target.targetId, 50, ray).hits, 1);
assert.equal(liveTarget.body.health, 50); assert.equal(liveTarget.drainEvents().length, 0);
tick({ pose: target }); assert.equal(campaign.state.active.stage, 1, 'a wounded live target is not a completed assassination');
for (let i = 0; i < 3; i++) liveTarget.step(.1, { activeMissionId: chapter.id });
assert.equal(liveTarget.hitByShot(target.targetId, 50, ray).hits, 1);
const [killed] = liveTarget.drainEvents(); assert.equal(killed.outcome, 'killed'); assert.equal(killed.serial, 1);
assert.equal(liveTarget.body.dead, true); assert.equal(liveTarget.drainEvents().length, 0);

for (const denied of [{ paused: true }, { sandbox: true }, { onFoot: false }, { passenger: true }, { aircraft: { id: 'jet' } }, { interior: {} }, { health: 0 }, { pose: { x: target.x + 200, z: target.z } }]) {
  tick({ pose: target, assassinationOutcome: killed, ...denied }); assert.equal(campaign.state.active.stage, 1);
}
tick({ pose: target, wanted: 2, assassinationOutcome: killed }); assert.equal(campaign.state.active.stage, 2, 'witness heat does not invalidate actual target death');
tick({ pose: exit, wanted: 2, onFoot: false, assassinationOutcome: killed }); assert(!campaign.state.active.escapeReached, 'the pickup requires arrival on foot');
tick({ pose: exit, wanted: 2, assassinationOutcome: killed }); assert(campaign.state.active.escapeReached); assert.equal(campaign.state.active.stage, 2);
tick({ pose: { x: exit.x + 30, z: exit.z }, wanted: 0, onFoot: false, assassinationOutcome: killed }); assert.equal(campaign.state.active, null, 'the getaway may finish anywhere while still in the car');
assert.equal(campaign.current()?.id ?? null, story); assert.deepEqual(campaign.serialize().optionalCompleted, [chapter.id]);
assert.deepEqual(campaign.drainEvents().filter(e => e.type === 'complete').map(e => [e.id, e.reward]), [[chapter.id, 2600]]);
assert(!campaign.startOptional(chapter.id, context).ok, 'completed assassination cannot reward twice');
liveTarget.dispose();

// A retained optional receipt is not erased or paid again when story progress is locked.
const lockedSaved={ ...campaign.serialize(), completed:completeV2.completed.slice(0,-1) };
const lockedRestored=createCampaign(map, lockedSaved, { assassinationMission: chapter });
assert.equal(lockedRestored.optionalUnlocked(),false);
assert.deepEqual(lockedRestored.serialize(),lockedSaved);
for (const optionalId of [chapter.id]) assert.equal(lockedRestored.startOptional(optionalId,context).ok,false);
assert.deepEqual(lockedRestored.serialize().optionalCompleted,campaign.serialize().optionalCompleted);
assert.deepEqual(lockedRestored.drainEvents(),[]);

const saved = campaign.serialize(); assert.deepEqual(createCampaign(map, saved).serialize(), saved, 'stable optional completion survives a missing source-clear compound');
for (const recovery of [{ recovering: true }, { respawnSerial: 1 }]) {
  const retry = createCampaign(map, before, { assassinationMission: chapter }); assert(retry.startOptional(chapter.id, context).ok);
  retry.update(.1, { ...context, ...recovery }); assert.equal(retry.state.active, null); assert.deepEqual(retry.serialize(), before);
}
const cancelled = createCampaign(map, before, { assassinationMission: chapter }); assert(cancelled.startOptional(chapter.id, context).ok); assert(cancelled.cancel());
assert.deepEqual(cancelled.serialize(), before);
console.log(`PASS story-gated lethal optional mission: actual ${chapter.compound.road} compound clearance, introduction, exact fresh kill-only target receipt, active combat, search-aware exit, cancellation/recovery, single reward and compatible save`);
