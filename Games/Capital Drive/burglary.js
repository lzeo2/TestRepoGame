import { createVehicleChallenge } from './vehicle-challenges.js';

const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const healthy = ctx => ctx?.onFoot === true && ctx.sandbox === false && Number.isFinite(ctx.health) && ctx.health>0 && !ctx.recovering && !ctx.recovery && point(ctx.pose);

// Lock completion authorizes one nearby entry. Only an actual completed activity
// in that entered room produces loot; progression alone decides its cash value.
export function createBurglary({ challenge = createVehicleChallenge(), canApproach } = {}) {
  let entry=null, permit=null, consumed=null, room=null, receiptSerial=0, maxRecordedSession=0, pendingLoot=null, session=null, attackSerial=0;
  const events=[];
  function securityFor(id) {
    let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
    return ['quiet','standard','alarmed'][hash%3];
  }
  const exterior = ctx => healthy(ctx) && !ctx.interiorId && !ctx.planId && !ctx.mission && !ctx.job;
  function reachable(target,ctx) {
    return exterior(ctx) && point(target) && distance(ctx.pose,target)<=2.4 &&
      typeof canApproach==='function' && canApproach(target,ctx)===true;
  }
  function start(target,ctx) {
    if (challenge.snapshot().active || ctx?.paused || !target || (target.type || target.kind)!=='house' ||
        typeof target.id!=='string' || !target.id || target.owned || target.safehouse || !reachable(target,ctx)) return false;
    permit=null; consumed=null; room=null; pendingLoot=null; session={noise:0,alarm:0,alarmed:false,security:securityFor(target.id)}; attackSerial=Number.isSafeInteger(ctx.attackSerial)?ctx.attackSerial:0;
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
    const before=challenge.snapshot().mistakes;
    challenge.step(ctx?.paused ? 0 : dt,input,{valid:Boolean(entry && reachable(entry,ctx)),sandbox:ctx?.sandbox===true});
    if(session)session.noise=Math.min(100,session.noise+Math.max(0,challenge.snapshot().mistakes-before)*24);
    drainChallenge(); return snapshot();
  }
  function cancel(reason='cancelled') { permit=null; consumed=null; const result=challenge.cancel(reason); drainChallenge(); return result; }
  function consumeEntry(entryId,ctx) {
    if(!permit || permit.entryId!==entryId || ctx?.paused || !reachable(entry,ctx)) return null;
    consumed=permit; permit=null; return consumed;
  }
  function entered(plan) {
    if(!consumed || !plan || plan.id!==consumed.roomId || plan.type!=='house') return false;
    const stations=(plan.activities||[]).filter(s=>(s.id===`${plan.id}-valuables` || s.id?.startsWith(`${plan.id}-valuables-`)) && s.kind==='stock' && point(s)).slice(0,8).map(s=>Object.freeze({...s}));
    room={id:plan.id,sessionId:consumed.sessionId,door:Object.freeze({x:entry.x,z:entry.z}),stations,searched:new Set()};
    consumed=null; entry=null; challenge.clear(); drainChallenge(); return true;
  }
  function inRoom(roomId,ctx) { return healthy(ctx) && !ctx.paused && (ctx.interiorId || ctx.planId || ctx.interior?.roomId)===roomId; }
  function recordLoot(event,terminal,ctx) {
    const station=room?.stations.find(s=>s.id===event?.id);
    if(!station || !inRoom(room.id,ctx) || event?.type!=='complete' || event.kind!=='stock' || event.sandbox!==false ||
        terminal?.phase!=='complete' || terminal.kind!=='stock' || terminal.sandbox!==false ||
        event.planId!==room.id || terminal.planId!==room.id || !Number.isSafeInteger(event.sessionId) || event.sessionId<=0 ||
        event.sessionId!==terminal.sessionId || event.station?.id!==station.id || event.id!==station.id ||
        terminal.station?.id!==station.id || distance(ctx.pose,station)>(Number.isFinite(station.radius)?station.radius:1.8)) return false;
    // The single activities owner supplies globally increasing session IDs even
    // across room loads. A scalar rejects old terminals without retaining rooms.
    if(event.sessionId<=maxRecordedSession || room.searched.has(station.id))return false;
    maxRecordedSession=event.sessionId;
    room.searched.add(station.id);
    pendingLoot=Object.freeze({roomId:room.id,serial:++receiptSerial,outcome:'looted',count:room.searched.size,exited:false});
    session.noise=Math.min(100,session.noise+8);
    return true;
  }
  function stepSession(dt,ctx) {
    if(!room || !session)return snapshot();
    if(!healthy(ctx) || ctx.sandbox || ctx.mission || ctx.job || (ctx.interiorId || ctx.planId || ctx.interior?.roomId)!==room.id){clear();return snapshot();}
    if(ctx.paused || !Number.isFinite(dt) || dt<=0)return snapshot();
    const tick=Math.min(dt,.25);
    session.noise=Math.max(0,Math.min(100,session.noise+(ctx.sprinting===true?20:-4)*tick));
    if(Number.isSafeInteger(ctx.attackSerial) && ctx.attackSerial>attackSerial){
      session.noise=Math.min(100,session.noise+35);attackSerial=ctx.attackSerial;
    }
    session.alarm=Math.min(100,session.alarm+Math.max(0,session.noise-20)*tick*({quiet:.08,standard:.12,alarmed:.18}[session.security]));
    if(session.alarm>=100 && !session.alarmed){
      session.alarmed=true;events.push(Object.freeze({type:'alarm',roomId:room.id,point:room.door}));
      if(events.length>32)events.shift();
    }
    return snapshot();
  }
  function exited(roomId,ctx) {
    if(!room || room.id!==roomId || !pendingLoot || !exterior(ctx) || ctx.paused || distance(ctx.pose,room.door)>4)return false;
    pendingLoot=Object.freeze({...pendingLoot,exited:true});
    room=null;session=null;return true;
  }
  function takeHouseLoot(roomId,ctx) {
    if(!exterior(ctx) || ctx.paused || pendingLoot?.roomId!==roomId || !pendingLoot.exited)return null;
    const receipt=pendingLoot; pendingLoot=null; return receipt;
  }
  function clear() { cancel('cleared'); challenge.clear(); drainChallenge(); entry=null; permit=null; consumed=null; room=null; pendingLoot=null; session=null; }
  function leave() { const escaped=pendingLoot?.exited?pendingLoot:null;clear();pendingLoot=escaped; }
  function snapshot() { return Object.freeze({...challenge.snapshot(),sessionPhase:room?'searching':pendingLoot?.exited?'escaped':entry?'casing':'idle',security:session?.security||null,noise:session?.noise||0,alarm:session?.alarm||0,alarmed:session?.alarmed||false,carriedLoot:pendingLoot?.count||0,searchedStations:room?.searched.size||0,totalStations:room?.stations.length||0,house:true,entryId:entry?.id || null,roomId:room?.id || entry?.roomId || null,entryReady:Boolean(permit),pendingLootRoomId:pendingLoot?.roomId || null}); }
  return {hasSearched:id=>room?.searched.has(id)===true,get searching(){return !!room;},get active(){return typeof challenge.active==='boolean'?challenge.active:challenge.snapshot().active;},start,step,cancel,clear,leave,reset:clear,snapshot,consumeEntry,entered,recordLoot,stepSession,exited,takeHouseLoot,drainEvents:()=>events.splice(0)};
}
