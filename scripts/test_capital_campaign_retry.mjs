import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';

const map = { spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
const context = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, vehicleHealth: 83,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false, health: 71 };
const receipts = serial => Object.fromEntries(['recon', 'evidence', 'presentation', 'encounter', 'workCompletion', 'schoolAlarm', 'heist', 'homeAction'].map(kind => [kind, { serial }]));
function opening() {
  const campaign = createCampaign(map);
  assert.equal(campaign.selectCharacter('student', context).ok, true);
  assert.equal(campaign.start(context).ok, true);
  campaign.drainEvents();
  return campaign;
}
function fail(campaign, ctx = {}) {
  campaign.update(.1, { ...context, ...receipts(8), recovering: true, ...ctx });
  assert.equal(campaign.state.active, null);
  assert.ok(campaign.retryPending);
}
let campaign = opening();
const saved = campaign.serialize(), first = structuredClone(campaign.state.active);
fail(campaign);
assert.ok(Object.isFrozen(campaign.retryPending));
assert.ok(Object.isFrozen(campaign.retryPending.companions));
assert.deepEqual(campaign.serialize(), saved, 'failure/pending state never enters career saves');
for (const invalid of [{ recovering: true }, { health: 0 }, { health: NaN }, { campaign: false }, { sandbox: true }, { character: 'corporate' }, { pose: { x: NaN, z: 0 } }, { respawnSerial: -1 }]) {
  assert.equal(campaign.retry({ ...context, ...invalid }).ok, false);
  assert.ok(campaign.retryPending, 'temporary guard preserves the pending attempt');
}
const resumed = { ...context, ...receipts(3), respawnSerial: 1, pose: { x: 73, z: 91 }, health: 52, cash: 17, ammo: { pistol: 4 } };
const untouched = structuredClone(resumed);
assert.equal(campaign.retry(resumed).ok, true);
assert.deepEqual(resumed, untouched, 'retry never mutates body, location, health, ammo or cash');
assert.equal(campaign.retryPending, null);
assert.equal(campaign.state.active.id, first.id);
assert.equal(campaign.state.active.stage, 0);
assert.equal(campaign.state.active.remaining, first.remaining);
assert.equal(campaign.state.active.serial, 1);
assert.equal(campaign.state.active.elapsed, 0);
assert.equal(campaign.state.active.held, 0);
assert.equal(campaign.state.active.cutscene, null, 'retry does not replay the chapter scene');
assert.ok(Object.values(campaign.state.active.baselines).every(value => value === 8), 'failed receipts cannot become fresh after controller reset');
assert.deepEqual(campaign.serialize(), saved);
assert.equal(campaign.drainEvents().filter(event => event.type === 'started').length, 1);
assert.equal(campaign.retry(resumed).ok, false);

for (const action of [value => value.cancel(), value => value.selectCharacter('corporate', context), value => value.start(context)]) {
  campaign = opening(); fail(campaign); action(campaign);
  assert.equal(campaign.retryPending, null, 'explicit user selection clears automatic retry');
}
campaign = opening(); fail(campaign);
for (const action of [value => value.start({ ...context, recovering: true }), value => value.start({ ...context, sandbox: true }), value => value.startDeveloper('unknown', { ...context, developer: true }), value => value.startDeveloper('unknown', context)]) {
  assert.equal(action(campaign).ok, false);
  assert.ok(campaign.retryPending, 'denied start preserves promised automatic retry');
}
campaign = opening(); fail(campaign); campaign.cancel();
assert.equal(campaign.cancel(), false, 'cancel with no active attempt remains compatible');
assert.equal(campaign.retryPending, null);
campaign = opening(); campaign.state.active.remaining = .01;
campaign.update(.1, context);
assert.ok(campaign.retryPending, 'time expiry schedules retry');
assert.equal(campaign.retry(context).ok, true);
campaign = opening();
campaign.update(.1, { ...context, respawnSerial: 1 });
assert.ok(campaign.retryPending, 'respawn serial change schedules retry');

// A legitimate crew handover must retain the actual hero and crew, rather than
// reapplying the chapter's canonical lead when the same chapter restarts.
const journal = createCampaign(map).journal();
const savedCrew = { version: 2, character: 'basement', intros: Object.fromEntries(journal.introductions.map(item => [item.character, item.chapters.map(chapter => chapter.id)])), meeting: true, legacy: false, completed: [] };
campaign = createCampaign(map, savedCrew);
assert.equal(campaign.start(context).ok, true);
const sharedId = campaign.state.active.id;
for (let i = 0; i < 10; i++) campaign.update(.1, { ...context, onFoot: false, vehicle: { stolen: true } });
assert.equal(campaign.state.active.stage, 1);
const ally = campaign.state.active.companions[0];
assert.ok(ally);
const allyCtx = { ...context, switchSafe: true, companion: { id: `campaign-ally:${ally}`, appearanceId: `player:${ally}`, x: 1, z: 1, yaw: 0, active: true, health: 100 } };
assert.equal(campaign.switchCompanion(ally, allyCtx).ok, true);
const actualCrew = [...campaign.state.active.companions];
fail(campaign);
assert.equal(campaign.retryPending.character, ally);
assert.equal(campaign.retry({ ...context, character: ally }).ok, true);
assert.equal(campaign.state.character, ally);
assert.equal(campaign.state.active.id, sharedId);
assert.deepEqual(campaign.state.active.companions, actualCrew);
assert.equal(campaign.current().id, sharedId);

campaign = createCampaign(map);
const preview = campaign.developerChapters()[0];
assert.equal(campaign.startDeveloper(preview.id, { ...context, developer: true }).ok, true);
campaign.update(.1, { ...context, recovering: true });
assert.equal(campaign.retryPending, null, 'developer previews never schedule retry');
console.log('Campaign automatic retry: PASS');
