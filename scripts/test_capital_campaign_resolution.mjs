import assert from 'node:assert/strict';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
const map={spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:10,z:20},{id:'store-12918449444',name:'The Book Moo',store:true,x:30,z:40},{id:'kingston',name:'Kingston',x:50,z:60}],storyHomes:{basement:{roomId:'fixture-milo-home',name:"Milo's safehouse",street:'Kingston',x:70,z:80,approach:{x:71,z:81}}}};
const ctx={pose:{x:0,z:0,speed:0},onFoot:true,wanted:0,respawnSerial:0,campaign:true,health:100,vehicleHealth:100};
const journal=createCampaign(map).journal(),oldShared=journal.shared.slice(0,15).map(chapter=>chapter.id);
const added=['conflict-of-interest','three-clean-copies'];
assert.deepEqual(journal.shared.slice(15).map(chapter=>chapter.id),added);
const historicalV1={version:1,completed:oldShared};
const migrated=createCampaign(map,historicalV1);
assert.deepEqual(migrated.serialize().completed,oldShared);assert.deepEqual(migrated.drainEvents(),[]);
assert.equal(migrated.current().id,added[0]);assert.equal(migrated.optionalUnlocked(),false,'old successful v1 save needs the new resolution before more optionals');
const historicalV2={version:2,character:'student',legacy:false,meeting:true,intros:Object.fromEntries(journal.introductions.map(hero=>[hero.character,hero.chapters.map(chapter=>chapter.id)])),completed:oldShared,optionalCompleted:['above-the-paperwork']};
let campaign=createCampaign(map,historicalV2);
assert.deepEqual(campaign.serialize(),historicalV2,'historical completed story and optional receipts are retained byte-for-field');
assert.equal(campaign.current(),null);assert.equal(campaign.nextRequiredCharacter().id,'corporate');
assert.equal(campaign.startOptional('above-the-paperwork',ctx).ok,false);
const tick=(live,n=25)=>{for(let i=0;i<n;i++)campaign.update(.1,live);};
let serial=10;
for(const [index,hero] of ['corporate','basement'].entries()) {
  assert(campaign.selectCharacter(hero,ctx).ok);const chapter=campaign.current();
  assert.equal(chapter.id,added[index]);assert.equal(chapter.combat,false);assert.equal(chapter.stages.length,3);
  assert.equal(chapter.cutscene.lines.length,2);assert(chapter.cutscene.lines.reduce((total,line)=>total+line.duration,0)<=7);
  assert.deepEqual(chapter.stages.map(goal=>goal.kind),index===0?['recon','evidence','escape']:['home-action','drive','foot']);
  assert(campaign.start(ctx).ok);campaign.drainEvents();
  while(campaign.state.active) {
    const active=campaign.state.active,goal=active.target,stage=active.stage;
    const live={...ctx,pose:{...goal,speed:0},onFoot:goal.kind!=='drive'};
    if(goal.kind==='recon')live.recon={serial:++serial,missionId:active.id,stage,targetId:goal.targetId,space:null,kind:'recon',outcome:'documented'};
    if(goal.kind==='evidence'){live.interior={storeId:goal.storeId,roomId:'coals-room'};live.evidence={serial:++serial,missionId:active.id,storeId:goal.storeId,roomId:'coals-room',outcome:'secured'};}
    if(goal.kind==='home-action'){live.interior={roomId:goal.roomId};live.homeAction={serial:++serial,roomId:goal.roomId,outcome:'packed'};}
    if(['recon','evidence','home-action'].includes(goal.kind)) {
      const token=campaign.captureRetry();campaign.update(.1,{...ctx,recovering:true});
      assert(campaign.resumeRetry(token,live).ok);tick(live);
      assert.equal(campaign.state.active.stage,stage,'receipt present at retry is stale');
      const key={recon:'recon',evidence:'evidence','home-action':'homeAction'}[goal.kind];
      live[key]={...live[key],serial:++serial};
      if(goal.kind==='evidence'){tick({...live,evidence:{...live.evidence,missionId:'other'}});assert.equal(campaign.state.active.stage,stage,'wrong chapter cannot secure procurement evidence');}
    }
    if(goal.kind==='drive'){tick({...live,pose:{...live.pose,speed:4}});assert.equal(campaign.state.active.stage,stage,'signed copies require a real stop');}
    tick(live);
    assert(!campaign.state.active||campaign.state.active.stage!==stage);
  }
  const paid=campaign.drainEvents().filter(event=>event.type==='complete');
  assert.deepEqual(paid.map(event=>[event.id,event.reward]),[[chapter.id,index===0?1800:2000]]);
  const saved=campaign.serialize();campaign=createCampaign(map,saved);assert.deepEqual(campaign.serialize(),saved);
  assert.deepEqual(campaign.serialize().optionalCompleted,['above-the-paperwork'],'new chapters preserve old optional decisions');
}
assert.equal(campaign.optionalUnlocked(),true);
assert.deepEqual(campaign.serialize().completed,[...oldShared,...added]);
assert.equal(campaign.start(ctx).ok,false);assert.deepEqual(campaign.drainEvents(),[]);
const resolution=campaign.developerChapters().filter(chapter=>added.includes(chapter.id));assert.equal(resolution.length,2);
console.log('PASS story resolution: preserved 15-chapter v1/v2 prefixes and optional receipts, two distinct three-step receipt-bound missions, stale/wrong evidence guards, retries, hero ownership, exact rewards, reload and restored optional gate.');
