// Normal saved prefixes and guard checks; --playability also exercises source owners.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';

const read = name => readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8').then(JSON.parse);
const [base, north, profiles, airport] = await Promise.all(['canberra', 'canberra-north', 'road-profiles', 'airport'].map(read));
const map = applyAirport(applyMapExpansion(applyRoadProfiles(base, profiles), north), airport);
map.landmarks.push(...MAPPED_STORES.map(store => ({ ...store, store: true })));
const journal = createCampaign(map).journal();
const old = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake', 'shelf-life', 'two-till-problem', 'carbon-copy', 'paper-trail-survey', 'exit-interview', 'sealed-account', 'earmuffs-rematch'];
assert.deepEqual(journal.shared.slice(0, 13).map(c => c.id), old);
assert.deepEqual(journal.shared.slice(13, 15).map(c => c.id), ['closing-time', 'terminal-transfer']);
const intros = Object.fromEntries(journal.introductions.map(item => [item.character, item.chapters.map(c => c.id)]));
const save = { version: 2, character: 'student', intros, meeting: true, legacy: false, completed: old };
const context = { pose: { ...map.spawn, speed: 0 }, onFoot: true, health: 100, vehicleHealth: 100, wanted: 0, respawnSerial: 0, campaign: true, sandbox: false,
  heist: { serial: 12 }, evidence: { serial: 8 }, homeAction: { serial: 4 } };
let campaign = createCampaign(map, save);
assert.deepEqual(campaign.serialize(), save, 'old strict v2 prefix is unchanged on load');
assert.deepEqual(campaign.drainEvents(), []);
assert.equal(campaign.developerChapters().length, 24);
for (let index = 0; index < 2; index++) {
  const hero = index ? 'corporate' : 'student';
  assert(campaign.selectCharacter(hero, context).ok);
  const chapter = campaign.current();
  assert.equal(chapter.id, ['closing-time', 'terminal-transfer'][index]);
  assert.equal(chapter.time, 1440);
  assert.deepEqual(chapter.companions, ['student', 'corporate', 'basement'].filter(id => id !== hero));
  assert.deepEqual(chapter.stages.map(g => g.kind), index ? ['home-action', 'drive', 'drive', 'foot'] : ['robbery', 'evidence', 'drive', 'robbery', 'escape']);
  assert(campaign.start(context).ok);
  const start = campaign.drainEvents().find(e => e.type === 'started');
  if (index) {
    assert.equal(start.incident, false, 'paperwork transfer does not manufacture an offence');
    assert.equal(start.wantedLevel, 0); assert.equal(chapter.combat, false);
    assert(chapter.stages.every(goal => !goal.stolen), 'transfer accepts an ordinary owned car');
  }
  const advance = live => { const stage = campaign.state.active.stage; for (let n = 0; n < 100 && campaign.state.active?.stage === stage; n++) campaign.update(.1, live); };
  while (campaign.state.active) {
    const { target: goal, stage } = campaign.state.active;
    const live = { ...context, pose: { ...goal, speed: 0 }, interior: null, onFoot: ['robbery', 'evidence', 'home-action', 'foot'].includes(goal.kind), vehicle: { stolen: false } };
    if (['robbery', 'evidence'].includes(goal.kind)) {
      const key = goal.kind === 'robbery' ? 'heist' : 'evidence';
      live.interior = { storeId: goal.storeId, roomId: `interior-${goal.storeId}` };
      const receipt = { serial: context[key].serial + 1, storeId: goal.storeId, roomId: live.interior.roomId, kind: 'robbery', missionId: chapter.id, outcome: 'secured' };
      for (const invalid of [
        { ...live, [key]: { ...receipt, serial: context[key].serial } },
        { ...live, [key]: { ...receipt, storeId: 'forged-store' } },
        { ...live, [key]: receipt, interior: null },
        { ...live, [key]: receipt, onFoot: false },
        { ...live, [key]: receipt, sandbox: true },
        ...(key === 'evidence' ? [{ ...live, [key]: { ...receipt, missionId: 'sealed-account' } }, { ...live, [key]: { ...receipt, roomId: 'wrong-room' } }] : []),
      ]) { advance(invalid); assert.equal(campaign.state.active.stage, stage, 'stale, remote and forged context denied'); }
      live[key] = context[key] = receipt;
    }
    if (goal.kind === 'home-action') {
      live.interior = { roomId: goal.roomId };
      const receipt = { serial: context.homeAction.serial + 1, roomId: goal.roomId, outcome: 'packed' };
      for (const invalid of [
        { ...live, homeAction: { ...receipt, serial: context.homeAction.serial } },
        { ...live, homeAction: { ...receipt, roomId: 'wrong-home' } },
        { ...live, homeAction: { ...receipt, outcome: 'cancelled' } },
        { ...live, homeAction: receipt, interior: { roomId: 'wrong-home' } },
        { ...live, homeAction: receipt, interior: null },
        { ...live, homeAction: receipt, onFoot: false },
        { ...live, homeAction: receipt, sandbox: true },
      ]) { advance(invalid); assert.equal(campaign.state.active.stage, stage, 'transfer requires fresh packing in its actual home'); }
      live.homeAction = context.homeAction = receipt;
    }
    if (goal.stolen || goal.kind === 'stolen') { advance({ ...live, vehicle: { stolen: false } }); assert.equal(campaign.state.active.stage, stage); }
    if (goal.clear) { advance({ ...live, wanted: 3 }); assert.equal(campaign.state.active.stage, stage); }
    if (goal.stop) { advance({ ...live, pose: { ...live.pose, speed: 8 } }); assert.equal(campaign.state.active.stage, stage); }
    advance(live);
    assert(campaign.state.active === null || campaign.state.active.stage > stage);
  }
  const paid = campaign.drainEvents().filter(e => e.type === 'complete');
  assert.equal(paid.length, 1); assert.equal(paid[0].reward, [2800, 3400][index]);
  campaign.update(.1, context); assert.deepEqual(campaign.drainEvents(), []);
  campaign = createCampaign(map, campaign.serialize());
  assert.deepEqual(campaign.state.completed, [...old, ...['closing-time', 'terminal-transfer'].slice(0, index + 1)]);
}
assert.equal(campaign.current().id, 'conflict-of-interest', 'completed crime prefix continues into the appended resolution');
assert.equal(campaign.optionalUnlocked(), false, 'later optional chapters wait for the new resolution');
const terminal = createCampaign(map, { ...save, character: 'corporate', completed: [...old, 'closing-time'] }).current();
const approach = terminal.stages[2];
assert.deepEqual([approach.x, approach.z], [terminal.stages[3].x, terminal.stages[3].z]);
assert(map.roads.some(r => r.name && r.type !== 'service' && r.points.some(p => p[0] === approach.x && p[1] === approach.z)), 'airport handover uses an actual public road vertex');
assert(Math.hypot(approach.x - 4622.74, approach.z + 1045.64) < 500);
if (process.argv.includes('--playability')) {
  const result = spawnSync(process.execPath, ['scripts/test_capital_campaign_playability.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  for (const id of ['closing-time', 'terminal-transfer']) {
    const row = report.rows.find(row => row.id === id);
    assert(row?.campaignCompleted && row.domainChain === 'PASS', `${id}: normal prefix and source-domain actions complete`);
    assert(row.stages.filter(s => ['robbery', 'evidence', 'home-action'].includes(s.kind)).every(s => s.domainReceipt && s.status === 'DOMAIN_PASS'));
  }
}
console.log('Capital collection and transfer chapters: strict old prefix, fresh evidence/packing guards, nonviolent transfer, companions, airport public road and once-only rewards PASS');
