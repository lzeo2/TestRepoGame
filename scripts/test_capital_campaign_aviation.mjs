import assert from 'node:assert/strict';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
const map={spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:20,z:10}]};
const ctx={pose:{x:0,z:0,speed:0},onFoot:true,vehicleHealth:100,health:100,wanted:0,respawnSerial:0,campaign:true,sandbox:false};
const locations=[{id:'helicopter:1',kind:'helicopter',x:120,z:130,wrecked:false},{id:'jet:1',kind:'jet',x:800,z:900,wrecked:false}];
const id='above-the-paperwork';
let campaign=createCampaign(map);
assert(!campaign.startOptional(id,{...ctx,aircraftLocations:locations}).ok);
assert(campaign.selectCharacter('student',ctx).ok);
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
  const locked = createCampaign(map, saved);
  const beforeLocked = locked.serialize();
  assert.equal(locked.optionalUnlocked(), false);
  for (const optionalId of [id]) assert.equal(locked.startOptional(optionalId, {...ctx,aircraftLocations:locations}).ok, false, 'unfinished story locks every optional');
  assert.equal(locked.state.active, null);
  assert.deepEqual(locked.serialize(), beforeLocked, 'locked attempts preserve progress');
  assert.deepEqual(locked.drainEvents(), [], 'locked attempts emit no start or reward');
}
for (const missing of ['student','corporate','basement','meeting']) {
  const locked = createCampaign(map, completeV2);
  if (missing==='meeting') locked.state.meeting=false;
  else locked.state.intros[missing]=[];
  assert.equal(locked.optionalUnlocked(), false, 'full shared story cannot bypass v2 '+missing);
  const beforeLocked=locked.serialize();
  for (const optionalId of [id]) assert.equal(locked.startOptional(optionalId, {...ctx,aircraftLocations:locations}).ok, false);
  assert.deepEqual(locked.serialize(), beforeLocked);
}
const legacy = createCampaign(map, completeV1);
assert.equal(legacy.optionalUnlocked(), true, 'completed v1 story remains compatible');
for (const optionalId of [id]) {
  assert(legacy.startOptional(optionalId, {...ctx,aircraftLocations:locations}).ok, 'complete legacy story unlocks optional');
  assert(legacy.cancel());
}
campaign = createCampaign(map, completeV2);
assert.equal(campaign.optionalUnlocked(), true, 'v2 needs all introductions, meeting and shared story');
const before=campaign.serialize(),core=campaign.current()?.id ?? null;
for(const invalid of [{sandbox:true},{recovering:true},{aircraftLocations:[]},{aircraftLocations:locations.slice(0,1)},{aircraft:{id:'already-flying'}}])assert(!campaign.startOptional(id,{...ctx,aircraftLocations:locations,...invalid}).ok);
assert.deepEqual(campaign.serialize(),before,'denied starts cannot change saved progress');
assert(campaign.startOptional(id,{...ctx,aircraftLocations:locations}).ok);
assert.equal(campaign.state.active.aviation,true);
assert.equal(campaign.state.active.stageCount,4);
assert.equal(campaign.state.active.target.x,locations[0].x,'targets use actual owner placements');
const tick=(context,count=12)=>{for(let i=0;i<count;i++)campaign.update(.1,{...ctx,...context});};
const heli={...locations[0],altitude:0,airborne:false};
tick({aircraft:{...heli,id:'other'}});assert.equal(campaign.state.active.stage,0);
tick({aircraft:heli,paused:true});assert.equal(campaign.state.active.elapsed,1.2);
tick({aircraft:heli,onFoot:false});assert.equal(campaign.state.active.stage,1);
tick({aircraft:{...heli,altitude:14.9,airborne:true},onFoot:false});assert.equal(campaign.state.active.stage,1);
tick({aircraft:{...heli,altitude:20,airborne:true,wrecked:true},onFoot:false});assert.equal(campaign.state.active.stage,1);
tick({aircraft:{...heli,altitude:15,airborne:true},onFoot:false});assert.equal(campaign.state.active.stage,2);
assert.equal(campaign.state.active.target.x,locations[1].x);
tick({pose:locations[0],onFoot:true,aircraft:null});assert.equal(campaign.state.active.stage,2,'must land at jet approach');
tick({pose:locations[1],onFoot:false,aircraft:{...heli,airborne:true,altitude:20}});assert.equal(campaign.state.active.stage,2);
tick({pose:locations[1],onFoot:true,aircraft:null});assert.equal(campaign.state.active.stage,3);
tick({aircraft:{...heli,airborne:true,altitude:30},onFoot:false});assert.equal(campaign.state.active.stage,3);
tick({aircraft:{...locations[1],airborne:true,altitude:19.9},onFoot:false});assert.equal(campaign.state.active.stage,3);
tick({aircraft:{...locations[1],airborne:true,altitude:20},onFoot:false});assert.equal(campaign.state.active,null);
const paid=campaign.drainEvents().filter(e=>e.type==='complete');assert.equal(paid.length,1);assert.equal(paid[0].reward,1800);
assert.equal(campaign.current()?.id ?? null,core,'optional flight does not replace core progress');
assert.deepEqual(campaign.state.completed,before.completed);
assert.deepEqual(campaign.state.intros,before.intros);
assert.deepEqual(campaign.serialize().optionalCompleted,[id]);

// A retained optional receipt is not erased or paid again when story progress is locked.
const lockedSaved={ ...campaign.serialize(), completed:completeV2.completed.slice(0,-1) };
const lockedRestored=createCampaign(map, lockedSaved);
assert.equal(lockedRestored.optionalUnlocked(),false);
assert.deepEqual(lockedRestored.serialize(),lockedSaved);
for (const optionalId of [id]) assert.equal(lockedRestored.startOptional(optionalId,{...ctx,aircraftLocations:locations}).ok,false);
assert.deepEqual(lockedRestored.serialize().optionalCompleted,campaign.serialize().optionalCompleted);
assert.deepEqual(lockedRestored.drainEvents(),[]);

const restored=createCampaign(map,campaign.serialize());
assert(restored.isCompleted(id));assert.equal(restored.current()?.id ?? null,core);
assert(!restored.startOptional(id,{...ctx,aircraftLocations:locations}).ok,'no replay reward');
for(const optionalCompleted of [[id,id],['unknown'],true])assert.throws(()=>createCampaign(map,{...before,optionalCompleted}),/corrupt/);
assert.deepEqual(createCampaign(map,before).serialize(),before,'legacy v2 shape is retained unchanged');
const cancelled=createCampaign(map,before);assert(cancelled.startOptional(id,{...ctx,aircraftLocations:locations}).ok);cancelled.cancel();assert.deepEqual(cancelled.serialize(),before);
console.log('PASS story-gated optional aviation campaign: actual aircraft targets; distinct board/lift/land/jet takeoff stages; pause/wrong-kind/wreck/altitude denials; no core-save changes; one reward; replay/cancel/legacy validation.');
