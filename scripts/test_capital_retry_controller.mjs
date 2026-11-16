import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createCampaign} from '../Games/Capital Drive/campaign.js';

const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const start=source.indexOf('function retryCampaignMission(){');
assert(start>=0);
const body=source.indexOf('{',start);let end=body+1,depth=1;
while(depth){assert(end<source.length);depth+=(source[end]==='{')-(source[end]==='}');end++;}
const context={pose:{x:0,z:0,speed:0},onFoot:true,wanted:0,respawnSerial:0,campaign:true,sandbox:false,health:71};
const campaign=createCampaign({spawn:{x:0,z:0},landmarks:[
  {id:'coals',name:'Coals',store:true,x:100,z:10},
  {id:'canberra-centre',x:200,z:-400},
  {id:'store-5656111023',name:'Lambzhou 1919',x:300,z:-420},
]});
assert(campaign.selectCharacter('student',context).ok);assert(campaign.start(context).ok);
const first=structuredClone(campaign.state.active),saved=campaign.serialize();
campaign.update(.1,{...context,recovering:true});assert(campaign.retryPending);
const trace=[],plan={id:'actual-room'};
const state={health:0,recovery:{phase:'out'},weapon:'pistol',ammo:7};
const env={started:true,gameMode:'campaign',paused:()=>false,developerReturn:null,aircraft:{active:null},
  gameplay:{state,setWeapon(id){state.weapon=id;trace.push('fists');}},campaign,
  careerContext:()=>({...context,health:state.health,recovering:!!state.recovery,respawnSerial:1}),
  stopMini(){trace.push('stop');},clearRecon(){trace.push('recon');},clearInput(){trace.push('input');},
  campaignScenes:{clear(){trace.push('crew');}},interiors:{active:plan},
  activities:{load(room){assert.equal(room,plan);trace.push('activities');}},
  roomPeople:{load(room){assert.equal(room,plan);trace.push('people');}},
  campaignNavigationTarget:()=>campaign.state.active.target,routeTo(target){assert.equal(target,campaign.state.active.target);trace.push('route');},
  notify(){trace.push('notice');}};
const retry=vm.runInNewContext(`${source.slice(start,end)};retryCampaignMission`,env);
assert.equal(retry(),false,'medical recovery cannot trigger an immediate failing attempt');assert.deepEqual(trace,[]);
state.health=100;state.recovery=null;
for(const [key,value] of [['started',false],['gameMode','street'],['developerReturn',{}],['paused',()=>true],['aircraft',{active:{id:'jet'}}]]){
  const original=env[key];env[key]=value;assert.equal(retry(),false);assert(campaign.retryPending);env[key]=original;
}
assert.equal(retry(),true);assert.equal(campaign.retryPending,null);
assert.equal(campaign.state.active.id,first.id);assert.equal(campaign.state.active.stage,0);
assert.equal(campaign.state.active.serial,1);assert.equal(campaign.state.active.remaining,first.remaining);
assert.equal(campaign.state.active.cutscene,null,'automatic retries do not replay the cinematic');
assert.deepEqual(trace,['stop','recon','input','crew','activities','people','fists','route','notice']);
assert.equal(state.health,100);assert.equal(state.ammo,7,'controller never refills ammo');
assert.deepEqual(campaign.serialize(),saved,'restart is transient and cannot bank completed chapters');
assert.equal(retry(),false);assert.equal(trace.length,9,'one failed attempt restarts only once');
campaign.update(.1,{...context,recovering:true});campaign.cancel();assert.equal(retry(),false);
assert(source.includes('finishDeveloperPreview();\n  retryCampaignMission();'),'sole controller loop consumes pending retries');
console.log('PASS actual retry controller: recovery/pause/mode/preview/flight guards, same fresh chapter once, real room and crew reset, route refresh, unchanged ammo/health/save and explicit cancellation');
