import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCampaign } from '../Games/Capital Drive/campaign.js';

const map = { spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
const context = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, vehicleHealth: 83,
  wanted: 0, respawnSerial: 0, campaign: true, sandbox: false, health: 71 };
const receipts = serial => Object.fromEntries(['recon', 'evidence', 'presentation', 'encounter', 'workCompletion', 'schoolAlarm', 'heist', 'homeAction', 'assassinationOutcome'].map(kind => [kind, { serial }]));
function opening() {
  const campaign = createCampaign(map);
  assert.equal(campaign.selectCharacter('student', context).ok, true);
  assert.equal(campaign.start(context).ok, true);
  campaign.drainEvents();
  return campaign;
}
const cause = [
  { changeContext: { recovering: true }, message: 'Mission failed.' },
  { changeContext: { respawnSerial: 1 }, message: 'Mission failed.' },
  { expire: true, message: 'Mission time expired.' },
];
for (const { changeContext, message, expire } of cause) {
  const campaign = opening();
  const saved = campaign.serialize(), first = structuredClone(campaign.state.active);
  if (expire) campaign.state.active.remaining = .01;
  campaign.update(.1, { ...context, ...receipts(8), ...changeContext });
  assert.equal(campaign.state.active, null);
  assert(campaign.state.failed);
  assert.deepEqual(campaign.drainEvents(), [{ type: 'failed', id:first.id, stage:first.stage, message }]);
  assert.deepEqual(campaign.serialize(), saved, 'failure leaves saved progress unchanged');
  for (let frame = 0; frame < 20; frame++) campaign.update(.1, context);
  assert.equal(campaign.state.active, null, 'failure never starts another attempt by itself');
  assert.deepEqual(campaign.drainEvents(), []);
  assert.equal(campaign.start({ ...context, recovering: true }).ok, false);
  const resumed = { ...context, ...receipts(8), respawnSerial: 1, pose: { x: 73, z: 91 }, health: 52 };
  assert.equal(campaign.start(resumed).ok, true);
  assert.equal(campaign.state.active.id, first.id);
  assert.equal(campaign.state.active.stage, 0);
  assert.equal(campaign.state.active.remaining, first.remaining);
  assert.ok(Object.values(campaign.state.active.baselines).every(value => value === 8));
}

const journal = createCampaign(map).journal();
const savedCrew = { version: 2, character: 'basement',
  intros: Object.fromEntries(journal.introductions.map(item => [item.character, item.chapters.map(chapter => chapter.id)])),
  meeting: true, legacy: false, completed: [] };
for (const abandon of [false, true]) {
  const campaign = createCampaign(map, savedCrew);
  assert.equal(campaign.start(context).ok, true);
  const chapter = campaign.state.active.id;
  for (let i = 0; i < 10; i++) campaign.update(.1, { ...context, onFoot: false, vehicle: { stolen: true } });
  assert.equal(campaign.state.active.stage, 1);
  const ally = campaign.state.active.companions[0];
  const allyCtx = { ...context, switchSafe: true,
    companion: { id: `campaign-ally:${ally}`, appearanceId: `player:${ally}`, x: 1, z: 1, yaw: 0, active: true, health: 100 } };
  assert.equal(campaign.switchCompanion(ally, allyCtx).ok, true);
  assert.equal(campaign.state.character, ally);
  if (abandon) assert(campaign.cancel());
  else campaign.update(.1, { ...context, recovering: true });
  assert.equal(campaign.state.active, null);
  assert.equal(campaign.state.character, 'basement', 'failure returns control to the launch character');
  assert.equal(campaign.current().id, chapter);
  assert.deepEqual(campaign.serialize(), savedCrew);
}

const previewCampaign = createCampaign(map);
const beforePreview = previewCampaign.serialize();
const preview = previewCampaign.developerChapters()[0];
assert.equal(previewCampaign.startDeveloper(preview.id, { ...context, developer: true }).ok, true);
previewCampaign.update(.1, { ...context, recovering: true });
assert.equal(previewCampaign.state.active, null);
assert.deepEqual(previewCampaign.serialize(), beforePreview);
console.log('PASS campaign failure stops the attempt, preserves progression, restores the launch character and requires a fresh manual start');

const controller = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const failedBranch = controller.indexOf("event.type==='failed'&&missionCheckpoint");
assert(failedBranch > 0, 'script.js keeps the campaign failure checkpoint branch');
const overlayCall = controller.indexOf('beginMissionFailureTitle(event.message)', failedBranch);
assert(overlayCall > 0 && overlayCall - failedBranch < 900, 'the failure branch drives the shared mission failure overlay');
const overlayTitle = controller.indexOf("'MISSION FAILED'");
assert(overlayTitle > 0, 'the overlay shows a MISSION FAILED title');
const overlayScreen = controller.lastIndexOf('recovery-screen', overlayTitle);
assert(overlayScreen > 0 && overlayTitle - overlayScreen < 1500, 'the MISSION FAILED title drives the existing recovery screen element');
assert(controller.includes('MISSION_FAILURE_HOLD'), 'the failure title holds before the restore proceeds');
assert(controller.includes("event.message==='Mission cancelled.'"), 'cancelling a mission keeps the plain notify path');
console.log('PASS controller wiring: campaign failed events show the shared MISSION FAILED recovery overlay and cancels stay plain');
