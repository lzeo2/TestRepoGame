import assert from 'node:assert/strict';
import {createDeliveryService,deliverySources,DELIVERY_METHODS,deliveryMethod} from '../Games/Capital Drive/delivery-service.js';
const road={id:'public',highway:'residential',width:9};
const a={x:0,z:0},b={x:0,z:-200};
const edge={id:0,from:a,to:b,dx:0,dz:-1,yaw:0,laneOffset:2,length:200,road,segment:0};
let blocked=false,red=false;
const simulation={graph:{edges:[edge],nodes:[a,b]},canOccupy:()=>!blocked,hasLineOfSight:()=>true,
  trafficLights:{stopDistance:()=>red?0:Infinity},moveVehicle(car,dx,dz){
    if(blocked)return {blocked:true,distance:0};car.x+=dx;car.z+=dz;return {blocked:false,distance:Math.hypot(dx,dz)};
  }};
const sources=deliverySources([{id:'food-source',name:'Parody cafe',type:'food',x:-2,z:-15,roadId:'public'}],[]);
const service=createDeliveryService({},simulation,{sources});
const ctx={pose:{x:-2,z:-110},onFoot:true,wanted:5};
const request={kind:'food',sourceId:'food-source',itemId:'food'};
assert.equal(service.quote(request,ctx).method,'legal');
assert.equal(service.phase,'idle');assert.equal(service.vehicles[0].active,false);
assert.equal(service.order({...request,sourceId:'invented'},ctx).ok,false);
assert.equal(service.order(request,ctx).method,'legal');
const initialTracking=service.tracking();
assert.equal(initialTracking.kind,'food');assert(initialTracking.distance>0&&initialTracking.eta>0);
assert.equal(initialTracking.car.x,service.vehicles[0].x);
initialTracking.car.x=9999;initialTracking.dropoff.z=9999;
assert.notEqual(service.vehicles[0].x,9999,'tracking pose is a detached read');
assert.notEqual(service.tracking().dropoff.z,9999);
assert.equal(service.order(request,ctx).ok,false);
assert.equal(service.interact(ctx).ok,false);
red=true;const origin={...service.vehicles[0]};for(let i=0;i<60;i++)service.step(1/60,ctx);
assert.equal(service.vehicles[0].z,origin.z,'signal prevents physical travel');red=false;
for(let i=0;i<1800&&service.phase==='approaching';i++) {
  const before={...service.vehicles[0]};service.step(1/60,ctx);
  assert(Math.hypot(before.x-service.vehicles[0].x,before.z-service.vehicles[0].z)<=10/60+.00001);
}
assert.equal(service.phase,'waiting');
assert.equal(service.tracking().distance,0);assert.equal(service.tracking().eta,0);
assert.equal(service.interact({...ctx,onFoot:false}).ok,false);
const stopped=service.snapshot().car;
assert.equal(service.interact({...ctx,pose:{x:stopped.x+2,z:stopped.z}}).ok,true);
assert.equal(service.interact(ctx).ok,false);
assert.equal(service.tracking(),null,'terminal deliveries stop tracking immediately');
const events=service.drainEvents();assert.equal(events.filter(e=>e.type==='completed').length,1);
assert.equal(events.at(-1).orderId,events[0].orderId);
assert(events.every(e=>e.method==='legal' && !('risk' in e)));
for(let i=0;i<200;i++)service.step(1/60,ctx);
assert.equal(service.order(request,ctx).ok,true);
service.step(1/60,{...ctx,recovering:true});service.cancel();
assert.equal(service.drainEvents().filter(e=>['cancelled','failed'].includes(e.type)).length,1);
assert.equal(service.vehicles.length,1);
for(let i=0;i<200;i++)service.step(1/60,ctx);
assert.equal(service.order(request,ctx).ok,true);blocked=true;
for(let i=0;i<1900;i++)service.step(1/60,ctx);
assert.equal(service.phase,'failed','physical blocking fails without timer delivery');
assert.equal(service.drainEvents().filter(e=>e.type==='completed').length,0);
console.log('delivery service: directed approach, signal stop, foot handover, exactly-once terminal, recovery PASS');

service.reset();blocked=false;
const arms=createDeliveryService({},simulation,{sources:[{id:'equipment',name:'Equipment',kind:'arms',x:-2,z:-10,weaponIds:['pistol']}]});
assert.equal(arms.order({sourceId:'equipment',kind:'arms',itemId:'pistol'},ctx).ok,true);
assert.equal(arms.tracking().kind,'arms');
const before=arms.tracking();red=true;for(let i=0;i<30;i++)arms.step(1/60,ctx);
assert.deepEqual(arms.tracking(),before,'signal-blocked tracking cannot invent progress');red=false;
for(let i=0;i<120;i++)arms.step(1/60,ctx);
assert(arms.tracking().distance<before.distance,'tracking follows actual supplied-time van travel');
arms.cancel();assert.equal(arms.tracking(),null);arms.reset();assert.equal(arms.tracking(),null);
console.log('delivery tracking: food/equipment, physical route distance, signal holds, detached poses, arrival and terminal cleanup PASS');

assert.deepEqual(DELIVERY_METHODS.illegal,{speedMultiplier:3,arrestChance:.15,reportChance:.25});
for (const badMethod of [null,'fast','LEGAL','__proto__',{},1]) {
  assert.equal(deliveryMethod(badMethod),null);
  assert.equal(service.quote({...request,method:badMethod},ctx).ok,false);
}
assert.equal(deliveryMethod(undefined),'legal');
assert.equal(deliveryMethod('legal'),'legal');
assert.equal(deliveryMethod('illegal'),'illegal');

function methodFixture(method,roll) {
  let rolls=0, realSteps=0, sweeps=0, peakSpeed=0, redLine=null;
  const traffic = {...simulation,trafficLights:{stopDistance:car=>redLine===null?Infinity:Math.max(0,car.z-redLine)},
    moveVehicle(car,dx,dz) {
      assert(Math.hypot(dx,dz)<=10/60+.00001,'fast couriers still check each short physical movement');
      sweeps++;
      return simulation.moveVehicle(car,dx,dz);
    }};
  const courier=createDeliveryService({},traffic,{sources,random:()=>{rolls++;return roll;}});
  const payload={...request,method};
  assert.equal(courier.quote({...payload,method:'invented'},ctx).ok,false);
  assert.equal(courier.quote(payload,ctx).method,method);
  assert.equal(courier.order(payload,ctx).method,method);
  const car=courier.vehicles[0],initial=courier.tracking();
  assert.equal(initial.method,method);
  assert.equal(rolls,0,'quote, dispatch and tracking never draw the handover roll');
  const step=()=>{courier.step(1/60,ctx);realSteps++;peakSpeed=Math.max(peakSpeed,car.speed);};
  return {courier,car,initial,step,redLine:value=>{redLine=value;},stats:()=>({rolls,realSteps,sweeps,peakSpeed})};
}
function arrive(fixture) {
  for (let i=0;i<1800 && fixture.courier.phase==='approaching';i++) fixture.step();
  assert.equal(fixture.courier.phase,'waiting');
  assert.equal(fixture.stats().rolls,0,'waiting at the stop never draws the handover roll');
  return fixture.stats();
}
const legal=methodFixture('legal',0),illegal=methodFixture('illegal',.4);
assert.equal(illegal.initial.eta,Math.ceil(legal.initial.eta/3));
const legalTravel=arrive(legal),illegalTravel=arrive(illegal);
assert(Math.abs(legalTravel.realSteps-illegalTravel.realSteps*3)<=2,'unobstructed route physically advances at three times the pace');
assert.equal(illegalTravel.sweeps,legalTravel.sweeps,'faster route keeps the same per-travel collision sampling');
assert.equal(illegalTravel.peakSpeed,3*legalTravel.peakSpeed,'public car speed reports the physical pace');
const beside = f => ({...ctx,pose:{x:f.car.x+1,z:f.car.z}});
assert(legal.courier.interact(beside(legal)).ok);
assert.equal(legal.stats().rolls,0);
assert.equal(legal.courier.drainEvents().at(-1).risk,undefined);

for (const [roll,type,risk] of [[.149,'confiscated','arrest'],[.15,'completed','reported'],[.399,'completed','reported'],[.4,'completed',undefined]]) {
  const fixture=methodFixture('illegal',roll);
  assert.equal(fixture.courier.interact(ctx).ok,false);
  arrive(fixture);
  const handover=beside(fixture);
  assert.equal(fixture.courier.interact({...handover,onFoot:false}).ok,false);
  assert.equal(fixture.courier.interact({...handover,pose:{x:200,z:300}}).ok,false);
  blocked=true;
  assert.equal(fixture.courier.interact(handover).ok,false);
  blocked=false;
  assert.equal(fixture.stats().rolls,0,'failed handover checks never draw the roll');
  const result=fixture.courier.interact(handover);
  assert(result.ok);
  assert.equal(result.risk,risk);
  assert.equal(fixture.courier.phase,type);
  assert.equal(fixture.courier.interact(handover).ok,false);
  assert.equal(fixture.stats().rolls,1,'each valid handover draws one roll');
  assert.equal(fixture.courier.tracking(),null);
  const terminal=fixture.courier.drainEvents().at(-1);
  assert.equal(terminal.type,type);
  assert.equal(terminal.method,'illegal');
  assert.equal(terminal.risk,risk);
  assert.equal(Object.hasOwn(terminal,'risk'),risk!==undefined);
  assert(Object.isFrozen(terminal));
}

const signalFixture=methodFixture('illegal',0);
const stopLine=signalFixture.car.z-22;
signalFixture.redLine(stopLine);
for (let i=0;i<2200;i++) {
  signalFixture.step();
  assert(signalFixture.car.z>=stopLine-1e-6,'no illegal movement substep skips a stop line');
}
assert.equal(signalFixture.courier.phase,'approaching','red wait is never charged as a road blockage');
assert(Math.abs(signalFixture.car.z-stopLine)<.2);
signalFixture.redLine(null);
const stoppedByBody=signalFixture.car.z;
blocked=true;for(let i=0;i<600;i++)signalFixture.step();blocked=false;
assert.equal(signalFixture.car.z,stoppedByBody,'body blockage cannot become a fast teleport');
assert.equal(signalFixture.courier.phase,'approaching','illegal blockage still waits thirty real seconds');
signalFixture.courier.cancel();
assert.equal(signalFixture.stats().rolls,0,'cancellation never draws a handover roll');
const stalledFixture=methodFixture('illegal',0);
blocked=true;
for(let i=0;i<1795;i++)stalledFixture.step();
assert.equal(stalledFixture.courier.phase,'approaching');
for(let i=0;i<15;i++)stalledFixture.step();
blocked=false;
assert.equal(stalledFixture.courier.phase,'failed','physical blockage times out after thirty real seconds');
assert.equal(stalledFixture.stats().rolls,0,'physical failure never draws a handover roll');
console.log('delivery methods: compatible legal defaults, 3x swept travel and ETA, red and blocked holds, one private handover roll across exact risk boundaries PASS');
