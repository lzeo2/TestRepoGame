import assert from 'node:assert/strict';
import { createCampaignAftermath } from '../Games/Capital Drive/campaign-aftermath.js';
import { createCampaign } from '../Games/Capital Drive/campaign.js';

const lunch = 'corporate-lunch-breakpoint', rematch = 'earmuffs-rematch';
const point = {x:-45,z:18};
const outside = (pose=point) => ({pose,onFoot:true,indoors:false});
const across = metres => ({x:point.x+metres,z:point.z});

for (const [decision,witnesses,civilianHarm,severity,scrutiny] of [
  ['cooperated',3,false,0,0],
  ['declined',3,false,1,1],
  ['avoided',3,false,2,1],
  ['cooperated',0,true,1,1],
  ['declined',0,true,2,1],
  ['avoided',0,true,2,1],
  ['declined',0,false,0,0],
  ['avoided',0,false,0,0],
]) {
  const owner=createCampaignAftermath();
  assert(owner.begin(lunch,point,{witnesses,civilianHarm}));
  const decisionResult=decision==='avoided' ? owner.step(outside(across(37))) : owner.choose(decision,outside());
  assert.equal(decisionResult.id,lunch);
  assert.deepEqual(decisionResult.point,point);
  assert.equal(decisionResult.severity,severity);
  assert.match(decisionResult.message,/Officer|before speaking/);
  assert.equal(owner.scrutiny(),scrutiny);
  assert.equal(owner.current(),null);
  assert.deepEqual(owner.serialize(),{[lunch]:{decision,witnesses,civilianHarm}});
  assert(owner.recorded(lunch));
  assert(!owner.begin(lunch,point));
  assert.equal(owner.choose(decision,outside()),null);
  assert.equal(owner.step(outside(across(40))),null);
  const reloaded=createCampaignAftermath(JSON.parse(JSON.stringify(owner.serialize())));
  assert.deepEqual(reloaded.serialize(),owner.serialize());
  assert.equal(reloaded.scrutiny(),scrutiny);
  assert(!reloaded.begin(lunch,point),'A completed incident cannot add consequences again after reload');
}

const owner=createCampaignAftermath(null);
assert.deepEqual(owner.serialize(),{});
assert(!owner.isCase('depot-interception'));
assert(!owner.begin('unknown',point));
assert(!owner.begin(lunch,{x:Infinity,z:18}));
const mutablePoint={...point};
assert(owner.begin(lunch,mutablePoint,{witnesses:4.9,civilianHarm:false}));
mutablePoint.x=999;
assert.deepEqual(owner.current().point,point);
assert.equal(owner.current().witnesses,3);
assert(Object.isFrozen(owner.current())&&Object.isFrozen(owner.current().point));
assert.deepEqual(owner.serialize(),{},'An unfinished interview is transient');
assert(!owner.begin(rematch,point),'Only one interview is active');
assert(owner.canSpeak(across(4)));
assert(!owner.canSpeak(across(4.01)));
assert.equal(owner.choose('cooperated',outside(across(4.01))),null);
assert.equal(owner.choose('cooperated',{...outside(),onFoot:false}),null);
assert.equal(owner.choose('cooperated',{...outside(),indoors:true}),null);
assert.equal(owner.choose('avoided',outside()),null,'Leaving is observed by the world, not a dialogue choice');
assert.equal(owner.step(outside(across(36))),null);
assert.equal(owner.step({...outside(across(50)),recovering:true}),null);
assert.equal(owner.step({pose:{x:NaN,z:0}}),null);
assert.equal(owner.step({...outside(across(12)),indoors:true}),null);
assert.equal(owner.step({...outside(across(12.01)),indoors:true}).severity,2);
const checkpoint=owner.serialize();
assert.deepEqual(checkpoint,{[lunch]:{decision:'avoided',witnesses:3,civilianHarm:false}});
assert(owner.begin(rematch,point,{witnesses:-1,civilianHarm:true}));
assert.equal(owner.current().witnesses,0);
const invalid = [
  [], 1, 'legacy', {unknown:checkpoint[lunch]}, {[lunch]:null},
  {[lunch]:{...checkpoint[lunch],decision:'unknown'}},
  {[lunch]:{...checkpoint[lunch],witnesses:4}},
  {[lunch]:{...checkpoint[lunch],witnesses:-1}},
  {[lunch]:{...checkpoint[lunch],witnesses:1.2}},
  {[lunch]:{...checkpoint[lunch],civilianHarm:1}},
  {[lunch]:{...checkpoint[lunch],extra:true}},
];
for (const value of invalid) {
  assert.throws(()=>createCampaignAftermath(value),/Invalid campaign witness file/);
  assert.throws(()=>owner.restore(value),/Invalid campaign witness file/);
  assert.deepEqual(owner.serialize(),checkpoint,'A rejected save leaves settled records intact');
  assert.equal(owner.current().id,rematch,'A rejected restore leaves the pending interaction intact');
}
assert.equal(owner.choose('declined',outside()).severity,2);
assert(owner.recorded(rematch));
owner.restore(checkpoint);
assert.deepEqual(owner.serialize(),checkpoint);
assert.equal(owner.current(),null);
assert(!owner.recorded(rematch));
assert(owner.begin(rematch,point),'Rolling back a failed mission allows the uncommitted case to be retried');
owner.restore(checkpoint);
assert.equal(owner.current(),null,'Rollback discards an unsettled case too');
assert(!owner.begin(lunch,point),'Rollback keeps a case carried in the checkpoint');
owner.restore(undefined);
assert.deepEqual(owner.serialize(),{},'Legacy career saves have no witness ledger');

const map={spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:20,z:10}]};
const story=createCampaign(map,{version:1,completed:[]}).chapters;
const chapter=story.find(item=>item.id===rematch);
const prefix=story.slice(0,story.indexOf(chapter)).map(item=>item.id);
const career=createCampaign(map,{version:1,completed:prefix});
const context={pose:map.spawn,onFoot:true,health:100,vehicleHealth:100,wanted:0,respawnSerial:0,campaign:true};
const tick=overrides=>{ for(let i=0;i<16;i++) career.update(.1,{...context,...overrides}); };
assert.equal(career.current().id,rematch);
assert(career.start(context).ok);
const goal=career.state.active.target, roomId='fixture-shop-room';
tick({pose:goal,interior:{storeId:goal.storeId,roomId},encounter:{serial:1,storeId:goal.storeId,roomId,
  missionId:rematch,character:'booth-guest',phase:'complete',outcome:'noodle-victory',victory:true}});
assert.equal(career.state.active.stage,1);
const exitGoal=career.state.active.target;
assert.equal(exitGoal.aftermath,true);
assert(owner.begin(rematch,exitGoal,{witnesses:2}));
tick({pose:exitGoal,aftermathResolved:owner.recorded(rematch)});
assert(career.state.active.escapeReached);
assert.equal(career.state.active.id,rematch,'A cleared exit does not skip an unresolved real interview');
const left={x:exitGoal.x+37,z:exitGoal.z};
assert.equal(owner.step(outside(left)).severity,2);
tick({pose:left,wanted:1,aftermathResolved:owner.recorded(rematch)});
assert.equal(career.state.active.id,rematch,'Avoiding the interview does not skip the wanted-clear gate');
tick({pose:left,aftermathResolved:owner.recorded(rematch)});
assert.equal(career.state.active,null,'A recorded outcome and cleared wanted state complete the earlier exit away from its marker');
assert.deepEqual(career.drainEvents().filter(item=>item.type==='complete').map(({id,reward})=>({id,reward})),
  [{id:rematch,reward:chapter.reward}]);
assert(career.isCompleted(rematch));
console.log('PASS campaign aftermath decision tiers, civilian harm, persistent replay guards, valid rollback, corrupt/legacy restore and the Pink Earmuffs rematch completion gate.');
