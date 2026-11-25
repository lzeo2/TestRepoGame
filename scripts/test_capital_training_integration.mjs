import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCareerTraining} from '../Games/Capital Drive/career-training.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
const training=createCareerTraining();
const context={mode:'street',crewPresent:false};
const ctx=(pose=map.spawn)=>({pose:{...pose},onFoot:false,vehicle:{modelId:'lantern',color:'#e7e6df',stolen:false},vehicleHealth:100,wanted:0,respawnSerial:0});
const career=createProgression(map);
function finishParcel(){
  assert.equal(career.startJob('crescent-parcel',ctx()).ok,true);
  career.update(0,ctx());
  const idle=career.drainEvents();
  for(const event of idle)assert.equal(training.award(event,context),false,'job start/paused tick earns nothing');
  let guard=0;
  while(career.state.activeJob&&guard++<12)career.update(1,ctx(career.state.activeJob.target));
  assert.equal(career.state.activeJob,null);
  const completions=career.drainEvents().filter(event=>event.type==='job-complete');
  assert.equal(completions.length,1);return completions[0];
}
const event=finishParcel();
assert.equal(event.jobId,'crescent-parcel');
assert.equal(training.award(event,context),true,'actual production job completion trains player');
assert.equal(training.describe('street').player.earned,1);
assert.equal(training.describe('street').crew.earned,0);
assert.equal(training.describe('campaign').player.earned,0);
assert.equal(training.award(event,context),false);
assert.equal(training.purchase('player','steady-stride',context).ok,true);
assert.equal(training.effects('street').footSpeed,1.05);
assert.equal(training.effects('campaign').footSpeed,1);
assert.equal(training.effects('free').footSpeed,1);
assert.equal(training.effects('street',true).footSpeed,1);
assert.equal(training.describe('free'),null);
const repeat=finishParcel();
assert.equal(training.award(repeat,{...context,crewPresent:true}),true,'late crew can train from an actual repeat');
assert.equal(training.describe('street').player.earned,1);
assert.equal(training.describe('street').crew.earned,1);
assert.equal(training.award(repeat,{...context,crewPresent:true}),false);
const restored=createCareerTraining(JSON.parse(JSON.stringify(training.serialize())));
assert.equal(restored.award(repeat,{...context,crewPresent:true}),false,'persistence retains both source lockouts');
assert.equal(restored.effects('street').footSpeed,1.05);
assert.equal(restored.describe('campaign').player.earned,0);
for(const extra of [{mode:'free'},{inMission:true},{preview:true},{practice:true},{recovering:true},{paused:true}]){
  assert.equal(restored.award({type:'work-complete',serviceId:'coals'},{...context,...extra}),false);
  assert.equal(restored.purchase('crew','keep-pace',{...context,...extra}).ok,false);
}
for(const type of ['job-started','job-stage','job-failed','work-started','activity-ended','robbery-complete','mugging-complete','developer-complete','delivery-reserved','constructor','__proto__','toString'])assert.equal(restored.award({type,id:'ignored',jobId:'ignored',serviceId:'ignored'},context),false);
for(const type of ['job-complete','work-complete','workout-complete','complete'])assert.equal(restored.award({type},context),false,'malformed completion ID earns nothing');
assert.equal(restored.award(null,context),false);
assert.equal(restored.award(event,null),false);
assert.equal(restored.purchase('crew','keep-pace',null).ok,false);
// Exercise a genuine campaign completion rather than synthesizing its event.
const campaign=createCampaign({...map,landmarks:[...map.landmarks,{id:'coals',name:'Coals',store:true,x:map.spawn.x+100,z:map.spawn.z+10}]}),campaignCtx={...ctx(),campaign:true,sandbox:false};
assert.equal(campaign.selectCharacter('student',campaignCtx).ok,true);
assert.equal(campaign.start(campaignCtx).ok,true);
let serial=0,guard=0;
while(campaign.state.active&&guard++<12){
  const target=campaign.state.active.target;
  const live={...campaignCtx,pose:{...target,speed:0},onFoot:true};
  if(target.kind==='school-alarm'){live.interior={roomId:target.roomId};live.schoolAlarm={serial:++serial,roomId:target.roomId,outcome:'triggered'};live.wanted=1;}
  if(target.kind==='escape'&&!campaign.state.active.sawWanted)campaign.update(.1,{...live,wanted:1});
  for(let i=0;i<Math.ceil(Math.max(target.hold||0,1.5)*10)+2;i++)campaign.update(.1,live);
}
assert.equal(campaign.state.active,null);
const campaignCompletion=campaign.drainEvents().find(event=>event.type==='complete');
assert.ok(campaignCompletion);
assert.equal(restored.award(campaignCompletion,{mode:'campaign',inMission:true}),false,'uncommitted attempt is excluded');
assert.equal(restored.award(campaignCompletion,{mode:'campaign',crewPresent:true}),true);
assert.equal(restored.describe('campaign').player.earned,1);
assert.equal(restored.describe('campaign').crew.earned,1);
assert.equal(restored.describe('street').player.earned,1);
// Source contracts: the browser controller must route admitted events and persist
// training separately from the strict economy schema.
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
assert.match(source,/trainingProfiles:training\.serialize\(\)/);
assert.match(source,/training=createCareerTraining\(savedTraining\)/);
assert.match(source,/\['job-complete','work-complete','workout-complete'\]\.includes\(event\.type\)\?trainingCredit\(event\)/);
assert.match(source,/skillEffects:\(\)=>training\.effects\(gameMode/);
assert.match(source,/campaignScenes\?\.update\(\{skillEffects:training\.effects/);
assert.ok(source.indexOf('acceptMissionCheckpoint();',source.indexOf('function updateCareer'))<source.indexOf('const credit=trainingCredit(event,crewPresent)',source.indexOf('function updateCareer')),'campaign checkpoint commits before training award');
assert.match(source,/missionCheckpoint\.completionCrewPresent=crewAtPlayer\(\)/,'terminal tick captures crew before scene teardown');
assert.match(source,/const crewPresent=missionCheckpoint\?\.completionCrewPresent;\s*acceptMissionCheckpoint\(\);\s*clearInput\(\);\s*const credit=trainingCredit\(event,crewPresent\)/,'frame event processing uses terminal crew capture after commit');
console.log('Capital training integration PASS: real job and campaign events, active modes, filters, late crew repeat, persistence and production hooks');
