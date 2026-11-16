import { createVehicleChallenge } from './vehicle-challenges.js';

const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const healthy = ctx => ctx?.onFoot === true && ctx.sandbox === false && Number.isFinite(ctx.health) && ctx.health>0 && !ctx.recovering && !ctx.recovery && point(ctx.pose);

// Lock completion authorizes one nearby entry. Only an actual completed activity
// in that entered room produces loot; progression alone decides its cash value.
export function createBurglary({ challenge = createVehicleChallenge(), canApproach } = {}) {
  let entry=null, permit=null, consumed=null, room=null, receiptSerial=0, maxRecordedSession=0, pendingLoot=null;
  const events=[];
  const exterior = ctx => healthy(ctx) && !ctx.interiorId && !ctx.planId && !ctx.mission && !ctx.job;
  function reachable(target,ctx) {
    return exterior(ctx) && point(target) && distance(ctx.pose,target)<=2.4 &&
      typeof canApproach==='function' && canApproach(target,ctx)===true;
  }
  function start(target,ctx) {
    if (challenge.snapshot().active || ctx?.paused || !target || (target.type || target.kind)!=='house' ||
        typeof target.id!=='string' || !target.id || target.owned || target.safehouse || !reachable(target,ctx)) return false;
    permit=null; consumed=null; room=null; pendingLoot=null;
    entry=Object.freeze({...target,roomId:target.roomId || target.id});
    return challenge.start('house',{targetId:entry.id,anchor:entry,sandbox:false});
  }
  function drainChallenge() {
    for(const event of challenge.drainEvents()) {
      if(event.type==='complete' && entry && event.targetId===entry.id) {
        permit=Object.freeze({entryId:entry.id,roomId:entry.roomId,sessionId:event.sessionId});
      }
      events.push(event);
      if(events.length>32)events.shift();
    }
  }
  function step(dt,input,ctx) {
    challenge.step(ctx?.paused ? 0 : dt,input,{valid:Boolean(entry && reachable(entry,ctx)),sandbox:ctx?.sandbox===true});
    drainChallenge(); return snapshot();
  }
  function cancel(reason='cancelled') { permit=null; consumed=null; const result=challenge.cancel(reason); drainChallenge(); return result; }
  function consumeEntry(entryId,ctx) {
    if(!permit || permit.entryId!==entryId || ctx?.paused || !reachable(entry,ctx)) return null;
    consumed=permit; permit=null; return consumed;
  }
  function entered(plan) {
    if(!consumed || !plan || plan.id!==consumed.roomId || plan.type!=='house') return false;
    const station=plan.activities?.find(s=>s.id===`${plan.id}-valuables` && s.kind==='stock' && point(s));
    room=Object.freeze({id:plan.id,sessionId:consumed.sessionId,station:station ? Object.freeze({...station}) : null});
    consumed=null; entry=null; challenge.clear(); drainChallenge(); return true;
  }
  function inRoom(roomId,ctx) { return healthy(ctx) && !ctx.paused && (ctx.interiorId || ctx.planId || ctx.interior?.roomId)===roomId; }
  function recordLoot(event,terminal,ctx) {
    const station=room?.station;
    if(!station || !inRoom(room.id,ctx) || event?.type!=='complete' || event.kind!=='stock' || event.sandbox!==false ||
        terminal?.phase!=='complete' || terminal.kind!=='stock' || terminal.sandbox!==false ||
        event.planId!==room.id || terminal.planId!==room.id || !Number.isSafeInteger(event.sessionId) || event.sessionId<=0 ||
        event.sessionId!==terminal.sessionId || event.station?.id!==station.id || event.id!==station.id ||
        terminal.station?.id!==station.id || distance(ctx.pose,station)>(Number.isFinite(station.radius)?station.radius:1.8)) return false;
    // The single activities owner supplies globally increasing session IDs even
    // across room loads. A scalar rejects old terminals without retaining rooms.
    if(event.sessionId<=maxRecordedSession || pendingLoot)return false;
    maxRecordedSession=event.sessionId;
    pendingLoot=Object.freeze({roomId:room.id,serial:++receiptSerial,outcome:'looted'});
    return true;
  }
  function takeHouseLoot(roomId,ctx) {
    if(!inRoom(roomId,ctx))return null;
    if(pendingLoot?.roomId!==roomId)return null;
    const receipt=pendingLoot; pendingLoot=null; return receipt;
  }
  function clear() { cancel('cleared'); challenge.clear(); drainChallenge(); entry=null; permit=null; consumed=null; room=null; pendingLoot=null; }
  function snapshot() { return Object.freeze({...challenge.snapshot(),house:true,entryId:entry?.id || null,roomId:room?.id || entry?.roomId || null,entryReady:Boolean(permit),pendingLootRoomId:pendingLoot?.roomId || null}); }
  return {get active(){return typeof challenge.active==='boolean'?challenge.active:challenge.snapshot().active;},start,step,cancel,clear,leave:clear,reset:clear,snapshot,consumeEntry,entered,recordLoot,takeHouseLoot,drainEvents:()=>events.splice(0)};
}
