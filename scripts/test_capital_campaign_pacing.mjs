import assert from 'node:assert/strict';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
// Domain fixture: positions are explicit setup, not evidence of native travel.
const map={spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:10,z:20}]};
const ctx={campaign:true,developer:true,pose:{x:0,z:0,speed:0},onFoot:true,wanted:0,respawnSerial:0,vehicleHealth:100};
const make=id=>{const c=createCampaign(map);assert(c.startDeveloper(id,ctx).ok);return c;};
const tick=(c,live,n=12)=>{for(let i=0;i<n;i++)c.update(.1,live);};
const audit=createCampaign(map).developerChapters();
assert.equal(audit.length,24,'all main-story chains remain available under their original IDs');
for(const {id,character} of audit){
  const c=make(id),chapter=c.current();
  assert(chapter.cutscene.lines.length<=2,'opening stays compact');
  assert(chapter.outro.length>0,'each chain retains its payoff');
  for(const goal of chapter.stages){
    if(['drive','foot','interior'].includes(goal.kind))assert.equal(goal.hold,0,`${id}: no idle arrival dwell`);
  }
  assert(c.state.active.prompt.startsWith(({student:"Kit",corporate:"Rowan",basement:"Milo"})[character]+":"), `${id}: first frame identifies the chapter owner`);
  c.update(.1,ctx);
  if(c.state.active)assert.match(c.state.active.prompt,/^(Kit|Rowan|Milo|Crew):/,'context identifies the active voice');
  assert.equal(c.drainEvents().some(event=>event.type==='complete'),false,'prompt cannot grant a career reward');
}
const delivery=make('basement-first-delivery');
assert.deepEqual(delivery.current().stages.map(goal=>goal.kind),['work','drive','foot']);
tick(delivery,{...ctx,interior:{storeId:'coals'}});
assert.equal(delivery.state.active.stage,0,'waiting at the station cannot prepare a parcel');
tick(delivery,{...ctx,interior:{storeId:'wrong'},workCompletion:{serial:1,storeId:'coals'}});
assert.equal(delivery.state.active.stage,0,'receipt needs its matching live room');
tick(delivery,{...ctx,interior:{storeId:'coals'},workCompletion:{serial:1,storeId:'coals'}});
assert.equal(delivery.state.active.stage,1,'fresh paid work prepares the parcel');
delivery.update(.1,ctx);assert.match(delivery.state.active.prompt,/Press E beside your car/);
const terminal=make('terminal-transfer'),goal=terminal.state.active.target;
assert.equal(terminal.current().combat,false);assert.equal(terminal.current().incident,undefined);
assert.deepEqual(terminal.current().stages.map(stage=>stage.kind),['home-action','drive','drive','escape']);
assert(terminal.current().stages.every(stage=>!stage.stolen));
tick(terminal,{...ctx,interior:{roomId:goal.roomId}});assert.equal(terminal.state.active.stage,0);
tick(terminal,{...ctx,interior:{roomId:goal.roomId},homeAction:{serial:1,roomId:goal.roomId,outcome:'packed'}});
assert.equal(terminal.state.active.stage,1,'transfer needs a fresh packed copy');
assert(make('carbon-copy').current().stages.every(stage=>stage.kind!=='stolen'&&!stage.stolen),'copy custody no longer requires theft');
// Context must retain the destination until the player actually reaches it.
const parking=make('student-extra-credit'),parkingGoal=parking.state.active.target;
parking.update(.1,{...ctx,onFoot:false,pose:{x:parkingGoal.x+1000,z:parkingGoal.z,speed:4}});
assert(parking.state.active.prompt.includes(parkingGoal.label),'moving far from destination keeps route guidance');
parking.update(.1,{...ctx,onFoot:false,pose:{...parkingGoal,speed:4}});
assert.match(parking.state.active.prompt,/Come to a full stop at the marked approach/);
assert.equal(parking.state.active.stage,0,'prompt does not bypass required parking');
const searching=make('quiet-streets'),searchGoal=searching.state.active.target;
const remoteCar={...ctx,onFoot:false,wanted:2,pose:{x:searchGoal.x+1000,z:searchGoal.z,speed:8}};
searching.update(.1,remoteCar);
assert(searching.state.active.escapeReached,'a moving car away from Red Hill starts the escape');
searching.update(.1,remoteCar);
assert.match(searching.state.active.prompt,/Lose the police anywhere/);
assert.equal(searching.state.active.stage,0,'prompt cannot resolve an active search');
console.log('PASS campaign pacing: audited 24 preserved chains, immediate arrival gates, hero prompts, fresh parcel preparation and transfer packing, nonviolent copy transport, room and reward guards.');
