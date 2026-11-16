import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createBurglary} from '../Games/Capital Drive/burglary.js';
import {createInteriorActivities} from '../Games/Capital Drive/interior-activities.js';
const homes=Array.from({length:65},(_,i)=>({id:`house-fixture-${i}`,type:'house',name:`Fixture house ${i}`,x:0,z:0,yaw:0}));
const map={spawn:{x:0,z:0},storyHomes:{basement:{roomId:homes[2].id}}};
const context=(id=homes[3].id,extra={})=>({pose:{x:0,z:0},onFoot:true,health:100,vehicleHealth:100,wanted:2,respawnSerial:0,sandbox:false,planId:id,interior:{roomId:id},...extra});
const receipt=(id,serial=1)=>Object.freeze({roomId:id,serial,outcome:'looted'});
const legacy=createProgression(map,null,{homes}).serialize();assert.equal(Object.hasOwn(legacy,'burglaryCooldowns'),false);
function actualLoot(owner,id){
 const entry={id,roomId:id,type:'house',x:0,z:0};
 const outside={...context(id),planId:null,interior:null};assert(owner.start(entry,outside));
 for(let i=0;i<120&&owner.snapshot().active;i++){
  const state=owner.snapshot();
  if(state.phase==='cue'){owner.step(.01,{[state.expectedKey]:true},outside);owner.step(.01,{},outside);}
  else owner.step(.1,{},outside);
 }
 assert.equal(owner.snapshot().phase,'complete');assert(owner.consumeEntry(id,outside));
 const station={id:`${id}-valuables`,kind:'stock',x:0,z:0,radius:1.8};
 const plan={id,type:'house',activities:[station]};assert(owner.entered(plan));
 const activities=createInteriorActivities(),ctx=context(id);activities.load(plan);assert(activities.start(station.id,ctx));
 for(let i=0;i<36;i++)activities.step(.1,{},ctx);
 for(const key of ['x','up','y','x']){activities.step(.01,{[key]:true},ctx);activities.step(.01,{},ctx);}
 assert.equal(activities.snapshot().phase,'complete');
 const event=activities.drainEvents().find(event=>event.type==='complete');assert(event);assert(owner.recordLoot(event,activities.snapshot(),ctx));
 return ctx;
}
const owner=createBurglary({canApproach:()=>true});
let calls=0;const p=createProgression(map,null,{homes,takeHouseLoot:(id,ctx)=>{calls++;return owner.takeHouseLoot(id,ctx);}});
const live=actualLoot(owner,homes[3].id),before=p.state.cash;
for(const extra of [{sandbox:true},{preview:true},{paused:true},{recovery:true},{onFoot:false},{health:0},{health:101},{recovering:true},{passenger:true},{interior:null},{interior:{roomId:'unknown'}}]){
 assert.equal(p.claimHouseLoot({...live,...extra}).ok,false);assert.equal(p.state.cash,before);assert.equal(calls,0,'denied context cannot consume the owner receipt');
}
const paid=p.claimHouseLoot(live);assert(paid.ok);assert.equal(calls,1);assert(Number.isInteger(paid.reward)&&paid.reward>=200&&paid.reward<=600);assert.equal(p.state.cash,before+paid.reward);
assert.equal(p.state.burglaryCooldowns[homes[3].id],300);
assert.equal(p.claimHouseLoot(live).ok,false);assert.equal(calls,1,'cooldown prevents receipt consumption/reward replay');
assert.equal(owner.takeHouseLoot(homes[3].id,live),null,'actual owner consumed once');
const saved=p.serialize(),reload=createProgression(map,saved,{homes});assert.deepEqual(reload.serialize(),saved);assert.equal(reload.claimHouseLoot(live).ok,false);
const frozen=reload.state.burglaryCooldowns[homes[3].id];reload.update(.2,{...live,paused:true});assert.equal(reload.state.burglaryCooldowns[homes[3].id],frozen);
reload.update(1000,live);assert.equal(reload.state.burglaryCooldowns[homes[3].id],299.75,'large caller dt ages only the existing bounded supplied slice');
for(let i=0;i<1199;i++)reload.update(.25,live);assert.equal(Object.hasOwn(reload.state.burglaryCooldowns,homes[3].id),false);assert.equal(Object.hasOwn(reload.serialize(),'burglaryCooldowns'),false,'expiry deletes retained cooldown entries');
let serial=1;
const replay=createProgression(map,null,{homes,takeHouseLoot:id=>receipt(id,serial)});assert(replay.claimHouseLoot(live).ok);
for(let i=0;i<1200;i++)replay.update(.25,live);assert.equal(replay.claimHouseLoot(live).ok,false,'same authoritative serial cannot be replayed after expiry');
assert.equal(replay.claimHouseLoot(context(homes[4].id)).ok,false,'same receipt serial cannot migrate to another house');
serial=2;assert(replay.claimHouseLoot(context(homes[4].id)).ok);
const deterministic=createProgression(map,null,{homes,takeHouseLoot:id=>receipt(id)});assert.equal(deterministic.claimHouseLoot(live).reward,paid.reward,'reward derives only from mapped house identity');
for(const id of [homes[0].id,homes[2].id]){
 const guarded=createProgression(map,null,{homes,takeHouseLoot:roomId=>receipt(roomId)});
 if(id===homes[0].id){guarded.state.cash=20000;assert(guarded.buyProperty(id,{...context(id),interior:null,planId:null,wanted:0}).ok);}
 assert.equal(guarded.claimHouseLoot(context(id)).ok,false,'owned and Milo safehouses cannot be looted');
}
for(const activity of ['activeJob','activity']){const guarded=createProgression(map,null,{homes,takeHouseLoot:id=>receipt(id)});guarded.state[activity]={};assert.equal(guarded.claimHouseLoot(live).ok,false);}
for(const value of [null,true,{roomId:live.planId,serial:1,outcome:'looted'},receipt('other'),receipt(live.planId,0),Object.freeze({roomId:live.planId,serial:1,outcome:'claimed'})]){
 const denied=createProgression(map,null,{homes,takeHouseLoot:()=>value});assert.equal(denied.claimHouseLoot(live).ok,false);assert.equal(denied.state.cash,1000);
}
let fullCalls=0;const fullMap=Object.fromEntries(homes.slice(0,64).map(home=>[home.id,300]));
const full=createProgression(map,{...legacy,burglaryCooldowns:fullMap},{homes,takeHouseLoot:id=>{fullCalls++;return receipt(id);}});
const capBefore=full.serialize();assert.equal(full.claimHouseLoot(context(homes[64].id)).ok,false);assert.equal(fullCalls,0);assert.deepEqual(full.serialize(),capBefore,'full cap never evicts a live cooldown');
full.state.burglaryCooldowns[homes[3].id]=.1;full.update(.25,live);assert(full.claimHouseLoot(context(homes[64].id)).ok);assert.equal(Object.keys(full.state.burglaryCooldowns).length,64);
const wallet=createProgression(map,null,{homes,takeHouseLoot:()=>{throw new Error('must not consume');}});wallet.state.cash=1000000000;assert.equal(wallet.claimHouseLoot(live).ok,false);
for(const burglaryCooldowns of [null,[],{unknown:10},{[homes[3].id]:-1},{[homes[3].id]:301},{[homes[3].id]:NaN},{[homes[3].id]:'10'},Object.fromEntries(homes.map(home=>[home.id,1]))])assert.throws(()=>createProgression(map,{...legacy,burglaryCooldowns},{homes}),/burglary/);
owner.clear();
console.log('Capital burglary economy PASS: actual lock/activity/consumable receipt, deterministic once-only wages, safehouse/context guards, strict legacy save/reload, replay rejection, supplied cooldown expiry and64-entry no-eviction cap');
