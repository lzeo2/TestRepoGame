import assert from 'node:assert/strict';
import {SERVICES} from '../Games/Capital Drive/services.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
const foodSite=SERVICES.find(site=>site.type==='food');
const map={spawn:{x:0,z:0}},sites=[{id:'test-dealer',name:'Dealer',road:'Test street',type:'arms',dealer:true,fictional:true,x:200,z:200,radius:4,weaponIds:['pistol'],priceMultiplier:2}];
const ctx={pose:{x:0,z:0},onFoot:true,health:60,wanted:5,vehicleHealth:100,respawnSerial:0};
let order=null,receipt=null;
const options={extraServices:sites,deliveryOrder:()=>order,takeDeliveryReceipt:id=>{const next=receipt;if(next?.orderId===id)receipt=null;return next;}};
const p=createProgression(map,null,options),food={kind:'food',sourceId:foodSite.id,itemId:'food'},arms={kind:'arms',sourceId:'test-dealer',itemId:'pistol'};
const book=(id,request)=>{order=Object.freeze({orderId:id,...request});return p.reserveDelivery(id,request,ctx);};
const finish=(type='completed')=>{receipt=Object.freeze({...order,type});return p.completeDelivery(order.orderId,ctx);};
assert.equal(p.quoteDelivery(food,ctx).cost,foodSite.price+50);assert.equal(p.quoteDelivery(arms,ctx).cost,950);
for(const extra of [{sandbox:true},{preview:true},{paused:true},{health:0},{onFoot:false},{interior:{roomId:'house'}}])assert.equal(p.quoteDelivery(food,{...ctx,...extra}).ok,false);
assert.equal(p.reserveDelivery('fake',food,ctx).ok,false);assert.equal(p.state.cash,1000);
assert(book('one',food).ok);assert.equal(p.state.cash,1000-foodSite.price-50);assert.equal(p.serialize().cash,1000,'reload refunds abandoned transient courier escrow');
assert.equal(p.reserveDelivery('one',food,ctx).ok,false);assert.equal(p.completeDelivery('one',ctx).ok,false);
const meal=finish();assert(meal.ok);assert.equal(meal.heal,foodSite.heal);assert.equal(p.state.cash,1000-foodSite.price-50);assert.equal(p.serialize().cash,1000-foodSite.price-50);
assert.equal(p.completeDelivery('one',ctx).ok,false);
p.state.cash=2000;assert(book('two',arms).ok);assert.equal(p.state.equipment.pistol,false);const gun=finish();assert(gun.ok);assert.equal(gun.weaponId,'pistol');assert.equal(gun.ammo,24);assert.equal(p.state.equipment.pistol,true);assert.equal(p.state.cash,1050);
assert.equal(p.quoteDelivery(arms,ctx).ok,false,'owned weapons cannot be reordered');
assert(book('three',food).ok);assert(finish('failed').ok);assert.equal(p.state.cash,1050,'failed delivery refunds exactly once');assert.equal(p.completeDelivery('three',ctx).ok,false);
assert(book('four',food).ok);receipt=Object.freeze({...order,type:'cancelled'});assert(p.completeDelivery('four',{...ctx,recovering:true}).ok);assert.equal(p.state.cash,1050);
assert(book('five',food).ok);receipt={...order,type:'completed'};assert.equal(p.completeDelivery('five',ctx).ok,false,'untrusted mutable terminal cannot pay');receipt=Object.freeze({...order,type:'cancelled'});assert(p.completeDelivery('five',ctx).ok);
assert.deepEqual(createProgression(map,p.serialize(),options).serialize(),p.serialize());

const risky=createProgression(map,null,options),illegal={...arms,method:'illegal'};
const illegalQuote=risky.quoteDelivery(illegal,ctx);
assert.equal(illegalQuote.cost,950);assert.equal(illegalQuote.method,'illegal');
assert.equal(risky.quoteDelivery(arms,ctx).method,'legal');
for(const method of [null,'','Illegal','express',0]){
  assert.equal(risky.quoteDelivery({...arms,method},ctx).ok,false);
}
order=Object.freeze({orderId:'risk-one',...arms});
assert.equal(risky.reserveDelivery('risk-one',illegal,ctx).ok,false,'legacy physical orders only authorize legal escrow');
order=Object.freeze({orderId:'risk-one',...illegal});
assert.equal(risky.reserveDelivery('risk-one',arms,ctx).ok,false,'illegal courier cannot reserve a legal order');
assert.equal(risky.state.cash,1000);
assert(risky.reserveDelivery('risk-one',illegal,ctx).ok);
assert.equal(risky.serialize().cash,1000,'ordinary reload still releases unresolved escrow');
const arrest={...order,type:'confiscated',risk:'arrest'};
for(const bad of [
  {...arrest,method:undefined}, {...arrest,method:'legal'}, {...arrest,risk:undefined},
  {...arrest,risk:'clear'}, {...arrest,type:'completed'}, {...arrest,sourceId:'wrong'},
]){
  receipt=Object.freeze(bad);
  assert.equal(risky.completeDelivery('risk-one',ctx).ok,false);
  assert.equal(risky.serialize().cash,1000,'wrong receipt keeps the real courier escrow untouched');
}
receipt=Object.freeze(arrest);
const lost=risky.completeDelivery('risk-one',ctx);
assert(lost.ok && lost.confiscated);
assert.equal(lost.method,'illegal');assert.equal(lost.risk,'arrest');assert.equal(lost.cost,950);
for(const key of ['refund','ammo','weaponId','heal'])assert.equal(lost[key],undefined);
assert.equal(risky.state.equipment.pistol,false,'confiscation never grants a weapon');
assert.equal(risky.state.cash,50);assert.equal(risky.serialize().cash,50,'confiscation persists without the escrow reload refund');
receipt=Object.freeze(arrest);
assert.equal(risky.completeDelivery('risk-one',ctx).ok,false);
assert.equal(risky.reserveDelivery('risk-one',illegal,ctx).ok,false);
assert.equal(risky.state.cash,50,'replay cannot charge or refund a confiscated order');
assert.equal(risky.drainEvents().filter(event=>event.type==='delivery-confiscated').length,1);

risky.state.cash=1000;
order=Object.freeze({orderId:'legal-risk',...arms});
assert(risky.reserveDelivery(order.orderId,arms,ctx).ok);
receipt=Object.freeze({...order,type:'confiscated',risk:'arrest'});
assert.equal(risky.completeDelivery(order.orderId,ctx).ok,false,'legal deliveries cannot be confiscated');
receipt=Object.freeze({...order,type:'completed',risk:'reported'});
assert.equal(risky.completeDelivery(order.orderId,ctx).ok,false,'legal deliveries cannot be reported');
receipt=Object.freeze({...order,type:'cancelled'});
assert.equal(risky.completeDelivery(order.orderId,ctx).refund,950);
assert.equal(risky.state.cash,1000);
const riskyFood={...food,method:'illegal'};
for(const type of ['failed','cancelled','completed']){
  order=Object.freeze({orderId:'risk-'+type,...riskyFood});
  assert(risky.reserveDelivery(order.orderId,riskyFood,ctx).ok);
  if(type==='failed'){
    receipt=Object.freeze({...order,type,risk:'reported'});
    assert.equal(risky.completeDelivery(order.orderId,ctx).ok,false,'only a completed order can be reported');
  }
  receipt=Object.freeze({...order,type,...(type==='completed'?{risk:'reported'}:{})});
  const outcome=risky.completeDelivery(order.orderId,ctx);
  assert(outcome.ok);assert.equal(outcome.method,'illegal');
  if(type==='completed'){
    assert.equal(outcome.heal,foodSite.heal);
    assert.equal(outcome.risk,'reported','the accepted handover forwards the report to the police owner');
  }
  else assert.equal(outcome.refund,foodSite.price+50,'normal illegal-order failure and cancellation still refund');
}
assert.equal(risky.state.cash,1000-foodSite.price-50);
assert.deepEqual(createProgression(map,risky.serialize(),options).serialize(),risky.serialize());
console.log('Capital delivery transactions: authoritative catalog prices, method-bound escrow, physical identity, frozen handover effects, refund/replay guards, confiscation without grant and v1 reload passed.');
