import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createStealthContracts, STEALTH_CONTRACT_IDS } from '../Games/Capital Drive/stealth-contracts.js';

const districts = ['manuka', 'foreshore', 'canberra-centre', 'redhill', 'kingston', 'griffith'].map((id, index) => ({ id, x:index*470, z:0 }));
const map = { spawn:{x:0,z:0}, landmarks:[{id:'coals',name:'Coals',store:true,x:20,z:10}, ...districts],
  roads: districts.flatMap(({id,x,z}) => [-60,0,60].map((offset, index) => ({ id:`${id}:${index}`, name:`Test Street ${index+1}`,
    points:[[x-120,z+offset],[x+120,z+offset]], width:8, type:'residential' }))) };
const stealthContracts = createStealthContracts(map, { canStand:()=>true, hasLineOfSight:()=>true });
const options = { stealthContracts };
const context = { pose:map.spawn, onFoot:true, health:100, vehicleHealth:100, wanted:0, respawnSerial:0, campaign:true };
const campaign = createCampaign(map, null, options);
const tick = (change, count = 8) => {
  for (let index = 0; index < count; index++) campaign.update(.1, { ...context, ...change });
};
assert.deepEqual(stealthContracts.chapters.map(chapter => chapter.id), STEALTH_CONTRACT_IDS);
assert.equal(campaign.optionalChapters.length, STEALTH_CONTRACT_IDS.length + 1, 'aviation remains available');
assert.equal(campaign.contractPlans('above-the-paperwork'), null);
assert.equal(campaign.startOptional(STEALTH_CONTRACT_IDS[0], context).ok, false);
assert(campaign.selectCharacter('student', context).ok);
const original = campaign.serialize(), story = campaign.current().id;

for (const chapter of stealthContracts.chapters) {
  const { id } = chapter;
  const plans = campaign.contractPlans(id);
  assert(Object.isFrozen(plans) && Object.isFrozen(plans.approaches));
  assert(plans.approaches.every(approach => approach.name && approach.description && !Object.hasOwn(approach, 'stages')));
  assert.equal(plans.exits.length, 2);
  const before = campaign.serialize();
  for (const bad of [{ approachId:'unknown' }, { exitId:'unknown' }, { approachId:23 }, null])
    assert.equal(campaign.startOptional(id, context, bad).ok, false);
  assert.deepEqual(campaign.serialize(), before, 'invalid plans leave progress unchanged');

  assert(campaign.startOptional(id, context).ok);
  const originalTarget = campaign.state.active.target;
  const defaultExtract = campaign.current().stages.at(-1);
  assert.deepEqual(campaign.state.active.stealthPlan, { approachId:plans.approaches[0].id, exitId:plans.exits[0].id });
  const first = stealthContracts.resolve(campaign.state.active, { ...context, pose:originalTarget, crouching:true });
  assert(first.ok);
  assert(campaign.cancel());
  assert.deepEqual(campaign.drainEvents().at(-1), { type:'failed', message:'Mission cancelled.' });
  assert.deepEqual(campaign.serialize(), before, 'cancellation preserves core and optional completion');

  const plan = { approachId:plans.approaches[1].id, exitId:plans.exits[1].id };
  assert(campaign.startOptional(id, { ...context, stealthOutcome:first.receipt }, plan).ok);
  const { active } = campaign.state;
  assert(active.optional && active.stealth && !active.combat);
  assert.deepEqual(active.stealthPlan, plan);
  assert.notDeepEqual([active.target.x, active.target.z], [originalTarget.x, originalTarget.z], 'different approach changes the actual objective');
  assert.notDeepEqual([campaign.current().stages.at(-1).x, campaign.current().stages.at(-1).z], [defaultExtract.x, defaultExtract.z], 'extraction uses the chosen pickup');
  tick({ pose:active.target, stealthOutcome:first.receipt });
  assert.equal(active.stage, 0, 'a prior attempt receipt cannot advance the identical stage index');

  for (let stage = 0; stage < active.stageCount; stage++) {
    const { target } = active;
    const here = { ...context, pose:target, crouching:!target.stand };
    const action = stealthContracts.resolve(active, here);
    assert(action.ok, `${id} stage ${stage}: ${action.message}`);
    assert.equal(stealthContracts.resolve(active, here).ok, false, 'a step receipt is issued only once');
    for (const invalid of [
      { paused:true }, { onFoot:false }, { passenger:true }, { interior:{ roomId:'other' } }, { wanted:1 },
      { pose:{x:target.x+10,z:target.z} }, { stealthOutcome:{ ...action.receipt, id:'wrong' } },
      { stealthOutcome:{ ...action.receipt, stage:stage+1 } }, { stealthOutcome:{ ...action.receipt, serial:Infinity } },
    ]) {
      tick({ pose:target, stealthOutcome:action.receipt, ...invalid });
      assert.equal(active.stage, stage, 'remote, stale, wrong-mode or malformed receipts cannot advance');
    }
    tick({ pose:target, stealthOutcome:action.receipt });
    if (stage+1 < active.stageCount) assert.equal(active.stage, stage+1);
  }
  assert.equal(campaign.state.active, null);
  assert.deepEqual(campaign.drainEvents().filter(event => event.type==='complete').map(event=>[event.id,event.reward]), [[id,chapter.reward]]);
  assert.equal(campaign.current().id, story, 'optional play restores current story chapter');
  assert.equal(campaign.startOptional(id, context, plan).ok, false, 'completed contracts cannot pay again');
}
const saved = campaign.serialize();
assert.deepEqual(saved, { ...original, optionalCompleted:STEALTH_CONTRACT_IDS });
assert.deepEqual(createCampaign(map, saved, options).serialize(), saved);
assert.deepEqual(createCampaign(map, saved).serialize(), saved, 'declared completion survives unavailable sites');
for (const change of [{ recovering:true }, { respawnSerial:1 }]) {
  const failed = createCampaign(map, original, options);
  assert(failed.startOptional(STEALTH_CONTRACT_IDS[0], context).ok);
  failed.update(.1, { ...context, ...change });
  assert.equal(failed.state.active, null);
  assert.equal(failed.drainEvents().at(-1).type, 'failed');
  assert.deepEqual(failed.serialize(), original);
}
console.log('PASS six optional contract campaigns with working alternate plans, receipt guards, extraction, cancellation and single rewards.');
