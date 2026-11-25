// Composes live house owners; input, placement, health and persistence stay injected.
export function createHouseController({burglary,activities,progression,getPlan,save,heal}) {
  let pendingRest=null, receiptSerial=0, maxRestSession=0;
  const liveRoom=(roomId,ctx)=>{
    const plan=getPlan();
    return plan?.id===roomId && plan.type==='house' && ctx?.interior?.roomId===roomId &&
      (!ctx.planId || ctx.planId===roomId) && ctx.onFoot===true && ctx.sandbox===false && !ctx.preview && !ctx.paused && !ctx.recovering && !ctx.recovery &&
      Number.isFinite(ctx.health) && ctx.health>0 && ctx.health<=100 ? plan:null;
  };
  function takeRestReceipt(roomId,ctx) {
    if(pendingRest?.roomId!==roomId || !liveRoom(roomId,ctx) || !progression.isSafehouse(roomId))return null;
    const receipt=pendingRest;pendingRest=null;return receipt;
  }
  function recordActivity(event,ctx) {
    const terminal=activities.snapshot();
    if(event?.kind==='stock') {
      if(!burglary.recordLoot(event,terminal,ctx))return {handled:false};
      const count=burglary.snapshot().carriedLoot;
      return {handled:true,message:`Carrying ${count} valuables. Leave through the door to collect the loot.`};
    }
    if(event?.kind!=='rest')return {handled:false};
    const roomId=event.planId,plan=liveRoom(roomId,ctx);
    const station=plan?.activities?.find(s=>s.id===`${roomId}-rest` && s.kind==='rest');
    if(!station || !progression.isSafehouse(roomId) || event.type!=='complete' || event.sandbox!==false ||
        event.outcome!=='rested' || event.id!==station.id || event.stationId!==station.id || event.station?.id!==station.id ||
        terminal.phase!=='complete' || terminal.kind!=='rest' || terminal.outcome!=='rested' || terminal.sandbox!==false ||
        terminal.planId!==roomId || terminal.station?.id!==station.id || event.sessionId!==terminal.sessionId ||
        !Number.isSafeInteger(event.sessionId) || event.sessionId<=maxRestSession || !ctx.pose ||
        !Number.isFinite(ctx.pose.x) || !Number.isFinite(ctx.pose.z) || Math.hypot(ctx.pose.x-station.x,ctx.pose.z-station.z)>(Number.isFinite(station.radius)&&station.radius>0?station.radius:1.8))
      return {handled:true,message:'Finish resting at your safehouse bed.'};
    maxRestSession=event.sessionId;
    pendingRest=Object.freeze({roomId,outcome:'rested',serial:++receiptSerial});
    const result=progression.restSafehouse(roomId,ctx);
    pendingRest=null;
    if(result.ok){heal(result.heal);save();}
    return {handled:true,...result};
  }
  function afterExit(roomId,ctx) {
    let result={handled:false};
    if(burglary.exited(roomId,ctx)){
      const claimed=progression.claimHouseLoot({...ctx,burglaryRoomId:roomId});
      if(claimed.ok)save();
      result={handled:true,...claimed};
    }
    pendingRest=null;burglary.leave();return result;
  }
  function usePantry(roomId,ctx){
    if(!liveRoom(roomId,ctx))return {ok:false,message:'Eat inside your safehouse.'};
    const result=progression.useHomePantry(roomId,ctx);
    if(result.ok){heal(result.heal);save();}
    return result;
  }
  function reset(){pendingRest=null;}
  return {recordActivity,takeRestReceipt,afterExit,usePantry,reset};
}
