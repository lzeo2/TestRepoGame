import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createMissionGuide } from '../Games/Capital Drive/mission-locations.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
const read = name => readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8').then(JSON.parse);
const [base, north, profiles] = await Promise.all(['canberra', 'canberra-north', 'road-profiles'].map(read));
const map = applyRoadProfiles(applyMapExpansion(base, north), profiles);
map.landmarks = [...map.landmarks, ...MAPPED_STORES.map(store => ({ ...store, store: true }))];
const existing = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets', 'across-the-water', 'home-by-the-lake', 'shelf-life', 'two-till-problem', 'carbon-copy'];
const additions = ['paper-trail-survey', 'exit-interview', 'sealed-account', 'earmuffs-rematch'];
const intros = { student: ['student-paper-chase', 'student-extra-credit'], corporate: ['corporate-present-tense', 'corporate-lunch-breakpoint'], basement: ['basement-touch-grass', 'basement-first-delivery'] };
const saved = { version: 2, character: 'corporate', intros, meeting: true, legacy: false, completed: existing };
const campaign = createCampaign(map, saved);
assert.equal(campaign.current().id, additions[0]); assert.deepEqual(campaign.serialize(), saved);
assert.deepEqual(campaign.journal().shared.slice(0, 9).map(c => c.id), existing);
assert.deepEqual(campaign.journal().shared.slice(9, 13).map(c => c.id), additions);
assert.deepEqual(campaign.journal().shared.slice(13).map(c => c.id), ['closing-time', 'terminal-transfer']);
assert.equal(campaign.developerChapters().length, 22);
assert.equal(createCampaign(map, { version: 1, completed: existing }).current().id, additions[0]);
const interiors = createInteriors(map, { stores: MAPPED_STORES }), guide = createMissionGuide(interiors.entries);
const ctx = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, vehicleHealth: 100, wanted: 0, health: 100, respawnSerial: 0, campaign: true,
  recon: { serial: 10 }, heist: { serial: 20 }, evidence: { serial: 30 }, encounter: { serial: 40 } };
function stageToEnd(live) {
  const stage = campaign.state.active.stage;
  for (let i = 0; i < 70 && campaign.state.active?.stage === stage; i++) campaign.update(.1, live);
}
const kinds = [], receipts = { recon: { serial: 10 }, heist: { serial: 20 }, evidence: { serial: 30 }, encounter: { serial: 40 } };
for (let index = 0; index < additions.length; index++) {
  assert(campaign.selectCharacter(['corporate', 'basement', 'student', 'corporate'][index], ctx).ok);
  const chapter = campaign.current(); assert.equal(chapter.id, additions[index]); kinds.push(chapter.stages.map(g => g.kind));
  if (chapter.id === 'earmuffs-rematch') assert.equal(chapter.stages[1].foot, true, 'post-fight escape retains its on-foot completion rule');
  assert(campaign.start({ ...ctx, ...receipts }).ok); campaign.drainEvents();
  while (campaign.state.active) {
    const active = campaign.state.active, goal = active.target, stage = active.stage;
    let live = { ...ctx, ...receipts, pose: { x: goal.x, z: goal.z, speed: 0 } };
    if (goal.kind === 'escape') { campaign.update(.1, { ...live, wanted: 3 }); stageToEnd(live); continue; }
    if (goal.kind === 'foot') { stageToEnd(live); continue; }
    const key = goal.kind === 'recon' ? 'recon' : goal.kind === 'robbery' ? 'heist' : goal.kind === 'evidence' ? 'evidence' : 'encounter';
    const fresh = { serial: receipts[key].serial + 1, missionId: active.id, stage: active.stage,
      targetId: goal.targetId, kind: goal.kind === 'robbery' ? 'robbery' : goal.kind, space: null,
      storeId: goal.storeId, roomId: 'actual-room', outcome: goal.kind === 'recon' ? 'documented' : goal.kind === 'evidence' ? 'secured' : 'noodle-victory', victory: true, phase: 'complete', character: 'booth-guest' };
    if (goal.kind === 'recon') {
      const dto = guide.guide(active, { pose: live.pose });
      assert(dto.recon && dto.recon.targetId === goal.targetId); assert.equal(dto.recon.space, null);
      assert(Number.isFinite(dto.recon.x) && Number.isFinite(dto.recon.z));
    } else live.interior = { storeId: goal.storeId, roomId: 'actual-room' };
    const invalids = [{ ...fresh, serial: receipts[key].serial }, { ...fresh, storeId: 'wrong-store', targetId: 'wrong-target' }];
    if (key !== 'heist') invalids.push({ ...fresh, missionId: 'wrong-mission' });
    if (goal.kind === 'fight') invalids.push({ ...fresh, outcome: 'noodle-fight' }, { ...fresh, victory: false }, { ...fresh, phase: 'fighting' });
    if (goal.kind === 'recon') invalids.push({ ...fresh, space: 'indoor' }, { ...fresh, stage: stage + 1 });
    for (const bad of invalids) { stageToEnd({ ...live, [key]: bad }); assert.equal(campaign.state.active.stage, stage); }
    stageToEnd({ ...live, [key]: fresh, onFoot: false }); assert.equal(campaign.state.active.stage, stage);
    stageToEnd({ ...live, [key]: fresh, sandbox: true }); assert.equal(campaign.state.active.stage, stage);
    receipts[key] = fresh; stageToEnd({ ...live, [key]: fresh });
    assert(!campaign.state.active || campaign.state.active.stage > stage, `${chapter.id} ${goal.kind} completed by its exact fresh receipt`);
  }
  const paid = campaign.drainEvents().filter(e => e.type === 'complete'); assert.equal(paid.length, 1); assert.equal(paid[0].id, chapter.id);
  campaign.update(.1, ctx); assert.deepEqual(campaign.drainEvents(), []);
}
assert.deepEqual(kinds, [['recon', 'recon'], ['recon', 'recon'], ['robbery', 'evidence', 'escape'], ['fight', 'escape']]);
assert.equal(campaign.current(), null); assert.deepEqual(campaign.serialize().completed, [...existing, ...additions]);
const preview = createCampaign(map, saved); assert(preview.startDeveloper('sealed-account', { ...ctx, developer: true }).ok); preview.cancel(); assert.deepEqual(preview.serialize(), saved);
console.log('Capital recon/heists: unchanged save prefixes, four ordered chapters, mapped scan guides, independent prep/action/getaway, fresh bound receipts, won fight and once-only rewards PASS');
