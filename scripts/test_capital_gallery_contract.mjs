import assert from 'node:assert/strict';
import {createGalleryFixture} from './capital-gallery-fixture.mjs';
import {createStealthContracts,planStealthChapter} from '../Games/Capital Drive/stealth-contracts.js';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
import {createMissionGuide} from '../Games/Capital Drive/mission-locations.js';
const fixture=createGalleryFixture(),{gallery,plan,collider}=fixture;
const map={spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:20,z:10},{id:'australian-war-memorial',x:3000,z:0}],roads:[]};
let outsideSight=true;
const options={canStand:()=>true,hasLineOfSight:(from,to)=>{
  assert(!from.interiorId&&!to.interiorId,'gallery actions never use the mapped-building LOS owner');return outsideSight;
},gallery};
const contracts=createStealthContracts(map,options),chapter=contracts.chapters.find(item=>item.id==='replica-relay');
const guide=createMissionGuide(fixture.interiors.entries);
assert(chapter);assert.equal(chapter.name,'The Gallery Ledger');assert.equal(chapter.reward,2250);
assert.deepEqual(gallery.points,plan.heist.anchors,'contract anchors belong to the actual generated gallery plan');
assert.equal(new Set(gallery.points.map(point=>`${point.x},${point.z}`)).size,6);
assert.equal(createStealthContracts(map,{...options,gallery:undefined}).chapters.length,0,'no gallery means no outdoor fallback contract');
assert.equal(createStealthContracts(map,{...options,gallery:{...gallery,roomId:'other'}}).chapters.length,0);
const ctx={pose:map.spawn,onFoot:true,health:100,vehicleHealth:100,wanted:0,respawnSerial:0,campaign:true};
const saved={version:1,completed:createCampaign(map).journal().shared.map(item=>item.id)};
const visible=(from,to)=>{
  assert.equal(from.interiorId,plan.id);assert.equal(to.interiorId,plan.id);
  return fixture.interiors.hasLineOfSight(from,to);
};
for(const approach of chapter.approaches)for(const exit of chapter.exits) {
  const campaign=createCampaign(map,saved,{stealthContracts:contracts});
  assert(campaign.startOptional(chapter.id,ctx,{approachId:approach.id,exitId:exit.id}).ok);
  const planned=planStealthChapter(chapter,{approachId:approach.id,exitId:exit.id});
  assert.equal(planned.stages.at(-1).roomId,undefined);assert.equal(planned.stages.at(-1).x,exit.x);
  assert(planned.stages.slice(0,-1).every(goal=>goal.roomId===plan.id&&goal.y===plan.floorY));
  const entry=guide.guide({target:planned.stages[0]});
  assert.equal(entry.entryId,plan.id);assert.equal(entry.indoors,false);assert.match(entry.instruction,/Enter.*Gallery/);
  assert.deepEqual(guide.guide({target:planned.stages[0]},{plan}).point,{x:planned.stages[0].x,z:planned.stages[0].z});
  assert.equal(guide.guide({target:planned.stages.at(-1)},{plan}).indoors,true,'extraction routes from the interior exit first');
  let latest=null;
  while(campaign.state.active) {
    const active=campaign.state.active,goal=active.target,stage=active.stage;
    const inside=Boolean(goal.roomId),live={...ctx,pose:goal,crouching:goal.crouch,interior:inside?{id:plan.id,roomId:plan.id}:null,visible:inside?visible:()=>true};
    if(inside) {
      assert(collider.canOccupy(goal),'each contract objective supports the real gallery foot collider');
      for(const change of [{interior:null},{interior:{id:'other'}},{visible:undefined},{visible:()=>false},{onFoot:false},{wanted:1},{pose:{x:goal.x+2,z:goal.z}}])assert.equal(contracts.resolve(active,{...live,...change}).ok,false,'gallery action needs exact room, physical sight, foot mode and close reach');
    } else {
      assert.equal(contracts.resolve(active,{...live,interior:{id:plan.id}}).ok,false,'pickup cannot be completed from inside overlapping gallery coordinates');
      outsideSight=false;assert.equal(contracts.resolve(active,live).ok,false);outsideSight=true;
    }
    const action=contracts.resolve(active,live);assert(action.ok,action.message);latest=action.receipt;
    assert.equal(action.receipt.roomId??null,goal.roomId??null);
    if(inside) {
      const before=active.stage;
      for(let i=0;i<8;i++)campaign.update(.1,{...live,stealthOutcome:{...latest,roomId:'other'}});
      assert.equal(active.stage,before,'Campaign does not accept a receipt from another room');
    }
    for(let i=0;i<12&&campaign.state.active?.stage===stage;i++)campaign.update(.1,{...live,stealthOutcome:latest});
    assert(!campaign.state.active||campaign.state.active.stage===stage+1);
  }
  assert.deepEqual(campaign.drainEvents().filter(event=>event.type==='complete').map(event=>[event.id,event.reward]),[['replica-relay',2250]]);
  const completed=campaign.serialize();assert.deepEqual(completed.optionalCompleted,['replica-relay']);
  const reloaded=createCampaign(map,completed,{stealthContracts:contracts});assert(reloaded.isCompleted('replica-relay'));
  assert.equal(reloaded.startOptional('replica-relay',ctx).ok,false,'historical stable completion ID cannot reward again');
}
console.log('PASS Gallery Ledger: actual fictional gallery anchors, two in-room approaches/two exterior pickups, room-tagged physical sight and receipts, real collider reach, unchanged stable completion/economy and no outdoor fallback.');
