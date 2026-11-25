import assert from 'node:assert/strict';
import { createHeistActivities } from '../Games/Capital Drive/heist-activities.js';

// Detached domain fixture: game symbol cues and progression, not natural travel.
const site = {id:'practice-parcels',name:'Practice Parcel Run',kind:'rail',x:0,z:0,
  stopId:'start',arrivalStopId:'pickup',boarding:{x:1,z:0},pickup:{x:40,z:0}};
const heat=[], rewards=[];
const owner=createHeistActivities({sites:[site],onHeat:e=>heat.push(e),onReward:e=>rewards.push(e)});
const foot={pose:{x:0,z:0},onFoot:true,wanted:0,sandbox:true};
const ride={...foot,onFoot:false,railPassenger:true,railStopId:'start'};
assert.equal(owner.snapshot().substep,0);
owner.interact(foot);
assert.equal(owner.snapshot().substep,1);
assert.match(owner.snapshot().guidance,/E \/ USE/);
owner.step(.1,ride);
assert.equal(owner.snapshot().substep,2);
assert.match(owner.snapshot().guidance,/Stay on board/);
assert.equal(owner.interact({...ride,railStopId:'wrong'}),null);
assert.equal(owner.snapshot().substep,2,'a wrong stop cannot advance the guide');
const pickup={...ride,railStopId:'pickup',pose:site.pickup};
owner.interact(pickup);
assert.equal(owner.snapshot().substep,3);
assert.match(owner.snapshot().challenge.instruction,/blue.*triangle/);
assert.deepEqual(owner.snapshot().challenge.options,{x:'Blue circle',y:'Blue triangle',up:'Gold circle'});
const dispatchPaused=owner.snapshot();
owner.step(1,{...pickup,paused:true},{y:true});
assert.deepEqual(owner.snapshot(),dispatchPaused);
owner.step(.1,pickup);
assert.equal(owner.step(.1,pickup,{x:true}).ok,false);
assert.match(owner.snapshot().feedback,/BOTH blue and triangle/);
const departed={...pickup,railStopId:null,pose:{x:60,z:0}};
owner.step(.1,departed);owner.step(.1,departed,{y:true});
assert.equal(owner.snapshot().substep,4,'correct selection still works after the same tram departs');
assert.match(owner.snapshot().challenge.instruction,/1\/3/);
owner.step(.1,pickup);
const wrong=owner.snapshot().challenge.expectedKey==='x'?'y':'x';
assert.equal(owner.step(.1,pickup,{[wrong]:true}).ok,false);
assert.match(owner.snapshot().feedback,/Pattern reset to symbol 1.*2 attempts left/);
assert.match(owner.snapshot().challenge.guidance,/Wrong symbol/);
const paused=owner.snapshot();
owner.step(1,{...pickup,paused:true},{up:true});
assert.deepEqual(owner.snapshot(),paused);
const sequence=owner.snapshot().challenge.sequence;
for(const key of sequence){
  owner.step(.1,departed);
  owner.step(.1,departed,{[key]:true});
  if(owner.snapshot().challenge)assert.match(owner.snapshot().feedback,/matched.*Release/);
}
assert.equal(owner.snapshot().substep,5);
assert.equal(owner.snapshot().feedback,'','symbol feedback does not leak into the escape step');
assert.match(owner.snapshot().guidance,/Leave the train/);
assert.equal(owner.step(.1,{...foot,pose:{x:100,z:0}}).message,'Practice heist complete.');
assert.deepEqual(heat,[]);assert.deepEqual(rewards,[]);
owner.interact(foot);
owner.step(.1,ride);
owner.interact(pickup);
owner.step(.1,pickup);owner.step(.1,pickup,{y:true});
assert.equal(owner.snapshot().challenge.mistakes,0);
assert.doesNotMatch(owner.snapshot().feedback,/Wrong symbol/,'repeat attempts start with fresh guidance');
for(let i=0;i<3;i++){
  owner.step(.1,pickup);
  const expected=owner.snapshot().challenge.expectedKey;
  const result=owner.step(.1,pickup,{[expected==='x'?'y':'x']:true});
  assert.equal(result.ok,false);
}
assert.equal(owner.active,false,'three mistakes retain the existing failure guard');
assert.deepEqual(rewards,[]);
// A stopped pickup receipt also permits finishing beside that same platform.
owner.interact(foot);owner.step(.1,ride);owner.interact(pickup);
const platform={...foot,pose:site.pickup};
owner.step(.1,platform);owner.step(.1,platform,{y:true});
assert.equal(owner.snapshot().phase,'puzzle');
owner.step(.1,{...platform,pose:{x:100,z:0}});
assert.equal(owner.active,false,'the stop receipt does not authorize a remote foot pickup');
for(const phase of ['dispatch','puzzle']) {
  owner.interact(foot);owner.step(.1,ride);owner.interact(pickup);
  if(phase==='puzzle'){owner.step(.1,pickup);owner.step(.1,pickup,{y:true});}
  assert.equal(owner.snapshot().phase,phase);
  assert.equal(owner.step(.1,{...platform,indoors:true,room:{id:'unrelated-room'}}).ok,false);
  assert.equal(owner.active,false,'an unrelated room cannot consume the frozen pickup receipt');
}
console.log('PASS heist guidance: numbered rail substeps, button cues, mistakes, pause, fresh retries and practice authority.');
