import assert from 'node:assert/strict';
import {createCampaignWorld} from '../Games/Capital Drive/campaign-world.js';

const world=createCampaignWorld(), original=world.snapshot();
const post='civic-district-police-post';
assert.deepEqual(original,{version:1,absentAircraft:[],policePosts:{}});
assert(Object.isFrozen(original)&&Object.isFrozen(original.absentAircraft)&&Object.isFrozen(original.policePosts));
assert.equal(world.recordAircraftTheft({type:'stolen',id:'helicopter:1',sandbox:true}),false);
assert.equal(world.recordAircraftTheft({type:'boarded',id:'helicopter:1',sandbox:false}),false);
assert.equal(world.recordAircraftTheft({type:'stolen',id:'loan:helicopter',sandbox:false}),false);
assert.equal(world.recordAircraftTheft({type:'stolen',id:'helicopter:1',sandbox:false}),true);
assert.equal(world.recordAircraftTheft({type:'stolen',id:'helicopter:1',sandbox:false}),false);
assert.equal(world.recordAircraftTheft({type:'stolen',id:'jet:2',sandbox:false}),true);
assert.equal(world.recordPolicePosts([{id:post,health:32.75}]),true);
assert.equal(world.recordPolicePosts([{id:post,health:32.75}]),false);
assert.equal(world.recordPolicePosts([{id:post,health:0},{id:'unknown',health:5}]),false,'invalid receipt is atomic');
assert.deepEqual(world.snapshot().policePosts,{[post]:32.75});
assert.equal(world.recordPolicePosts([{id:post,health:0}]),true);
const saved=JSON.parse(JSON.stringify(world.snapshot()));
assert.deepEqual(saved,{version:1,absentAircraft:['jet:2','helicopter:1'],policePosts:{[post]:0}});
assert.deepEqual(createCampaignWorld(saved).snapshot(),saved);
for(const invalid of [null,[],{...saved,version:2},{...saved,other:true},
  {...saved,absentAircraft:['jet:2','jet:2']},{...saved,absentAircraft:Array(1)},{...saved,absentAircraft:['loan:jet']},
  {...saved,policePosts:{unknown:0}},{...saved,policePosts:{[post]:121}},{...saved,policePosts:{[post]:null}}]){
  assert.throws(()=>world.restore(invalid),/Invalid saved campaign world/);
  assert.deepEqual(world.snapshot(),saved,'invalid restore preserves the running world ledger');
}
world.restore(original);
assert.deepEqual(world.snapshot(),original,'mission rollback returns precisely to the recorded prelaunch state');
assert.deepEqual(createCampaignWorld().snapshot(),original,'fresh worlds have independent state');
console.log('PASS campaign world validates bounded identities, isolates copies and restores aircraft and post consequences.');
