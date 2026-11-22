import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';

const map = { spawn: { x: 0, z: 0 }, landmarks: [{ id: 'coals', name: 'Coals', store: true, x: 100, z: 10 }] };
const base = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, wanted: 0, health: 100, vehicleHealth: 100,
  vehicle: { stolen: true }, respawnSerial: 0, campaign: true, sandbox: false };
const tick = (campaign, context, count = 100) => { for (let i = 0; i < count; i++) campaign.update(.1, context); };
const catalog = createCampaign(map);
const shared = catalog.journal().shared.map(chapter => chapter.id);
const escapeIds = [];
for (const entry of catalog.developerChapters()) {
  assert(catalog.startDeveloper(entry.id, { ...base, developer: true }).ok);
  if (catalog.current().stages.some(stage => stage.kind === 'escape')) escapeIds.push(entry.id);
  catalog.cancel();
}
assert.equal(catalog.developerChapters().length, 24, 'audit all actual campaign definitions');
assert.deepEqual(escapeIds, ['student-paper-chase', 'corporate-lunch-breakpoint', 'late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake', 'shelf-life', 'two-till-problem', 'sealed-account', 'earmuffs-rematch', 'closing-time', 'conflict-of-interest']);
let serial = 0;
function contextFor(campaign) {
  const target = campaign.state.active.target;
  const context = { ...base, pose: { ...target, speed: 0 }, onFoot: true };
  if (target.kind === 'drive' || target.kind === 'stolen' || target.drive) context.onFoot = false;
  if (target.kind === 'interior') context.interior = { storeId: target.storeId, roomId: 'fixture-room', atCounter: true };
  if (target.kind === 'work') { context.interior = { storeId: target.storeId, roomId: 'fixture-room' }; context.workCompletion = { storeId: target.storeId, serial: ++serial }; }
  if (target.kind === 'home-action') { context.interior = { roomId: target.roomId }; context.homeAction = { roomId: target.roomId, outcome: 'packed', serial: ++serial }; }
  if (['fight', 'encounter'].includes(target.kind)) {
    context.interior = { storeId: target.storeId, roomId: 'fixture-room' };
    context.encounter = { storeId: target.storeId, roomId: 'fixture-room', missionId: campaign.state.active.id, character: 'booth-guest', phase: 'complete', outcome: 'noodle-victory', victory: true, serial: ++serial };
  }
  if (target.kind === 'school-alarm') {
    context.interior = { roomId: target.roomId };
    context.schoolAlarm = { roomId: target.roomId, outcome: 'triggered', serial: ++serial };
  } else if (target.kind === 'robbery') {
    context.interior = { storeId: target.storeId, roomId: 'fixture-room' };
    context.heist = { storeId: target.storeId, kind: 'robbery', serial: ++serial };
  } else if (target.kind === 'recon') {
    context.recon = { missionId: campaign.state.active.id, stage: campaign.state.active.stage, targetId: target.targetId, kind: 'recon', outcome: 'documented', space: null, serial: ++serial };
  } else if (target.kind === 'evidence') {
    context.interior = { storeId: target.storeId, roomId: 'fixture-room' };
    context.evidence = { storeId: target.storeId, roomId: 'fixture-room', missionId: campaign.state.active.id, outcome: 'secured', serial: ++serial };
  }
  return context;
}
function opening(id) {
  const index = shared.indexOf(id);
  const introSave = id === 'corporate-lunch-breakpoint' ? { version: 2, character: 'corporate', intros: { student: [], corporate: ['corporate-present-tense'], basement: [] }, meeting: false, legacy: false, completed: [] } : null;
  const campaign = createCampaign(map, index < 0 ? introSave : { version: 1, completed: shared.slice(0, index) });
  if (index < 0 && !introSave) assert(campaign.selectCharacter('student', base).ok);
  assert(campaign.start(base).ok);
  while (campaign.state.active.target.kind !== 'escape') {
    const stage = campaign.state.active.stage, context = contextFor(campaign);
    for (let i = 0; i < 100 && campaign.state.active.stage === stage; i++) campaign.update(.1, context);
    assert.notEqual(campaign.state.active.stage, stage, 'fresh domain receipts advance preceding stage');
  }
  campaign.drainEvents();
  return campaign;
}
for (const id of escapeIds) {
  const campaign = opening(id), saved = campaign.serialize(), arrival = contextFor(campaign);
  const far = { ...arrival, pose: { x: arrival.pose.x + 1000, z: arrival.pose.z + 1000 }, wanted: 0 };
  tick(campaign, { ...far, wanted: 2 }, 1);
  tick(campaign, far);
  assert(campaign.state.active, `${id}: clearing without arrival earns nothing`);
  assert.equal(campaign.snapshot().active.escapeReached, false);
  for (const invalid of [{ paused: true }, { sandbox: true }, { campaign: false }, { health: 0 }, { health: NaN }, { interior: { roomId: 'wrong-room' } }]) {
    campaign.update(.1, { ...arrival, wanted: 2, ...invalid });
    assert.equal(campaign.snapshot().active.escapeReached, false, `${id}: invalid context cannot record arrival`);
  }
  if (campaign.state.active.target.drive) {
    for (const invalid of [{ onFoot: true }, { vehicleHealth: 0 }, { pose: { ...arrival.pose, speed: 4 } }]) {
      campaign.update(.1, { ...arrival, wanted: 2, ...invalid });
      assert.equal(campaign.snapshot().active.escapeReached, false, 'drive arrival requires healthy stopped car');
    }
  }
  if (campaign.state.active.target.stolen) {
    campaign.update(.1, { ...arrival, wanted: 2, vehicle: { stolen: false } });
    assert.equal(campaign.snapshot().active.escapeReached, false, 'a stolen-car handover requires the stolen car');
  }
  campaign.update(0, { ...arrival, wanted: 2 });
  assert.equal(campaign.snapshot().active.escapeReached, false, 'zero dt cannot record arrival');
  campaign.update(.1, { ...arrival, wanted: 2 });
  assert.equal(campaign.snapshot().active.escapeReached, true);
  assert.deepEqual(campaign.serialize(), saved, 'arrival is transient');
  tick(campaign, { ...far, wanted: 2 });
  assert.equal(campaign.state.active.held, 0, 'search must clear before hold');
  const hold = campaign.state.active.target.hold;
  campaign.update(20, far);
  assert.equal(campaign.state.active.held, .1, 'large dt retains supplied-step cap');
  tick(campaign, far, Math.max(0, Math.round(hold * 10) - 2));
  assert(campaign.state.active, 'hold cannot finish early');
  tick(campaign, { ...far, wanted: 1 }, 1);
  assert.equal(campaign.state.active.held, 0, 'new search resets clear hold');
  tick(campaign, far);
  assert.equal(campaign.state.active, null, `${id}: clear anywhere after arrival completes`);
  const completions = campaign.drainEvents().filter(event => event.type === 'complete');
  assert.equal(completions.length, 1);
  assert(completions[0].reward > 0);
  tick(campaign, far);
  assert.equal(campaign.drainEvents().length, 0, 'reward never replays');

  const clearArrival = opening(id), point = contextFor(clearArrival);
  clearArrival.update(.1, point);
  assert.equal(clearArrival.snapshot().active.escapeReached, true, 'arrival while clear also sticks');
  tick(clearArrival, { ...point, pose: far.pose, wanted: 2 }, 1);
  tick(clearArrival, { ...point, pose: far.pose });
  assert.equal(clearArrival.state.active, null, 'later chase can clear away from initial arrival');

  const quiet = opening(id), quietPoint = contextFor(quiet), optionalSearch = quiet.state.active.target.requireWanted === false;
  quiet.update(.1, quietPoint);
  tick(quiet, { ...quietPoint, pose: far.pose });
  assert.equal(quiet.state.active === null, optionalSearch, 'optional departure search stays optional; authored pursuit still requires wanted');

  const failed = opening(id), reached = contextFor(failed);
  failed.update(.1, { ...reached, wanted: 2 });
  failed.update(.1, { ...far, recovering: true });
  assert.equal(failed.state.active, null);
  tick(failed, { ...base, respawnSerial: 1 });
  assert.equal(failed.state.active, null, 'failure leaves the mission inactive until an explicit start');
  assert(failed.start({ ...base, respawnSerial: 1 }).ok);
  assert.equal(failed.snapshot().active.escapeReached, false, 'fresh attempt discards old arrival');
  assert.equal(failed.state.active.stage, 0);
  assert.equal(failed.drainEvents().some(event => event.type === 'complete'), false, 'failed attempt pays nothing');
}
for (const id of ['carbon-copy', 'terminal-transfer']) {
  const probe = createCampaign(map);
  assert(probe.startDeveloper(id, { ...base, developer: true }).ok);
  const deliveries = probe.current().stages.filter(stage => stage.clear);
  assert(deliveries.length > 0);
  assert(deliveries.every(stage => stage.kind !== 'escape'), `${id}: physical deliveries and handovers retain location requirements`);
}
console.log(`PASS escape objectives: all 24 definitions audited, ${escapeIds.length} real escape stages, sticky arrival, exterior/context/dt guards, clear holds, retry reset and once-only rewards`);
