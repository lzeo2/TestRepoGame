import assert from 'node:assert/strict';
import {createHeistActivities} from '../Games/Capital Drive/heist-activities.js';
function fixture(kind='bank') {
  const site={id:{bank:'civic-bank',jeweller:'manuka-jewels',tower:'black-mountain-archive'}[kind],kind,name:'Fictional test shop',x:0,z:0};
  const roomId=`interior-${site.id}`,employee={id:`${roomId}-employee`,roomId,storeId:site.id,kind:'employee',x:0,z:0,health:100};
  const room={id:roomId,storeId:site.id,heistSiteId:site.id,employeeId:employee.id,loot:{id:`${roomId}-loot`,x:2,z:0,radius:1.4}};
  const ctx={pose:{x:0,z:2},room,employee,indoors:true,onFoot:true,wanted:0,armed:true,aiming:true,aimYaw:0};
  const heat=[],rewards=[];let sight=true;
  const heists=createHeistActivities({sites:[site],canSee:()=>sight,onHeat:e=>heat.push(e),onReward:e=>rewards.push(e)});
  return {heists,ctx,heat,rewards,site,setSight:value=>{sight=value;}};
}
for(const kind of ['bank','jeweller','tower']) {
  const {heists,ctx,heat,rewards,setSight}=fixture(kind);
  assert.equal(heists.snapshot().hostage,null);assert.equal(heists.hostageAction(ctx),null);assert.equal(heists.toggleHostage(ctx),null);
  assert(heists.interact(ctx).ok);assert.equal(heists.hostageAction(ctx),'hold');
  for(const change of [{paused:true},{recovering:true},{busy:true},{doorway:true},{onFoot:false},{railPassenger:true},{swimming:true},{indoors:false},{sandbox:true},
    {pose:{x:50,z:0}},{room:{...ctx.room,id:'wrong-room'}},{employee:{...ctx.employee,id:'other'}},{employee:{...ctx.employee,roomId:'other'}},
    {employee:{...ctx.employee,kind:'visitor'}},{employee:{...ctx.employee,health:0}}]) {
    assert.equal(heists.hostageAction({...ctx,...change}),null);assert.equal(heists.toggleHostage({...ctx,...change}),null);
  }
  setSight(false);assert.equal(heists.hostageAction(ctx),null);setSight(true);
  assert.equal(heists.snapshot().hostage,null,'availability probes never start a standoff');
  assert(heists.toggleHostage(ctx).ok);
  const held=heists.snapshot().hostage;
  assert.deepEqual(held,{roomId:ctx.room.id,employeeId:ctx.employee.id,remaining:12});assert(Object.isFrozen(held));
  assert.equal(heists.hostageAction(ctx),'release');
  assert.deepEqual(heat,[]);assert.deepEqual(rewards,[],'hold grants no payout or robbery shortcut');
  heists.step(1,{...ctx,paused:true});assert.equal(heists.snapshot().hostage.remaining,12);
  heists.step(1,ctx);assert.equal(heists.snapshot().hostage.remaining,11);
  const pickup={...ctx,pose:ctx.room.loot};assert(heists.interact(pickup).ok,'normal cash/case collection still works during hold');
  assert.equal(heists.snapshot().phase,'escape');assert.equal(heat.length,1);assert.equal(rewards.length,0);
  assert(heists.toggleHostage(ctx).ok);assert.equal(heists.snapshot().hostage,null);
  assert.equal(heists.hostageAction(ctx),null,'voluntary release cannot be followed by another hold in the same attempt');
  assert.equal(heists.toggleHostage(ctx),null);
  heists.step(.1,{pose:{x:100,z:0},onFoot:true,wanted:2});
  assert(heists.step(.1,{pose:{x:100,z:0},onFoot:true,wanted:0}).ok);
  assert.deepEqual(rewards.map(event=>event.amount),[{bank:2750,jeweller:1500,tower:2200}[kind]],'existing robbery reward unchanged');
  assert.equal(heists.snapshot().hostage,null);
}
for(const reason of ['timeout','injury','death','exit','room','recovery','cancel']) {
  const {heists,ctx}=fixture();assert(heists.interact(ctx).ok);assert(heists.toggleHostage(ctx).ok);
  if(reason==='timeout')for(let i=0;i<12;i++)heists.step(1,ctx);
  else if(reason==='injury'||reason==='death')heists.step(.1,{...ctx,employee:{...ctx.employee,health:reason==='death'?0:99}});
  else if(reason==='exit')heists.step(.1,{...ctx,indoors:false});
  else if(reason==='room')heists.step(.1,{...ctx,room:{...ctx.room,id:'other'}});
  else if(reason==='recovery')heists.step(.1,{...ctx,recovering:true});
  else heists.cancel();
  assert.equal(heists.snapshot().hostage,null,reason+' clears hostage state');
  if(reason==='timeout'||reason==='injury')assert.equal(heists.hostageAction(ctx),null,'expired/injured hold cannot be restarted');
  else {assert(heists.interact(ctx).ok);assert.equal(heists.hostageAction(ctx),'hold','new attempt has a fresh optional hold');}
}
const rail={id:'rail-parcels',kind:'rail',name:'Parcel run',x:0,z:0,stopId:'rail-alinga'};
const train=createHeistActivities({sites:[rail]});assert(train.interact({pose:rail,onFoot:true,wanted:0}).ok);
assert.equal(train.hostageAction(fixture().ctx),null);assert.equal(train.toggleHostage(fixture().ctx),null);assert.equal(train.snapshot().hostage,null);
console.log('PASS fictional hostage abstraction: matching nearby live employee/room and sight guards, fresh optional once-per-attempt hold/release, 12-second pause-aware timer, all cleanup paths, no extra heat/payout and unchanged bank/jeweller/tower robbery rewards; rail excluded.');
