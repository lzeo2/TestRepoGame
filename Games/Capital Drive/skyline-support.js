import { SKYLINE_JOB_ID } from './skyline-job.js';

export const SKYLINE_SUPPORT_OFFERS=Object.freeze({
  backup:Object.freeze({id:'backup',name:'Friendly squad',cost:600}),
  resupply:Object.freeze({id:'resupply',name:'Ammo and medical resupply',cost:350}),
  jammer:Object.freeze({id:'jammer',name:'Drone jammer',cost:500,duration:20}),
});
const GRANT_STAGES=new Set(['approach','safe-approach']);
const BUY_STAGES=new Set(['approach','search','response','encounter','capture','safe-approach','safe','loot','boss','helipad']);
const KNOWN_STAGES=new Set(['freefall','flare','landing',...BUY_STAGES,'boarding','flight','complete','failed','cancelled']);
const result=(ok,message)=>({ok,message});
const trusted=ctx=>ctx.paused!==true&&ctx.preview!==true&&ctx.uiOnly!==true&&ctx.recovering!==true&&ctx.dead!==true;
const accepted=value=>value===true||value?.ok===true;
const frozen=value=>Object.freeze(value);

// Ephemeral mission bookkeeping only. Purchases reduce the eventual award;
// neither this authority nor UI reads write the career wallet.
export function createSkylineSupport({canUse=()=>false,apply=()=>false}={}){
  let current=null,lastAttempt=0,disposed=false,applying=false;
  const events=[];
  function clear(){if(applying)return;current=null;events.length=0;}
  function validSnapshot(snapshot){
    return snapshot?.jobId===SKYLINE_JOB_ID&&typeof snapshot.missionId==='string'&&KNOWN_STAGES.has(snapshot.stage)&&
      Number.isSafeInteger(snapshot.attempt)&&snapshot.attempt>0&&snapshot.missionId===`${SKYLINE_JOB_ID}:${snapshot.attempt}`;
  }
  function step(dt,snapshot={},ctx={}){
    if(disposed||applying||!Number.isFinite(dt)||dt<=0||!validSnapshot(snapshot)||ctx.missionId!==snapshot.missionId||!trusted(ctx))return;
    if(!snapshot.active){
      if(current?.missionId===snapshot.missionId){
        if(snapshot.stage==='complete')current.stage='complete';
        else if(['failed','cancelled'].includes(snapshot.stage))clear();
      }
      return;
    }
    if(ctx.active!==true)return;
    if(current?.missionId!==snapshot.missionId){
      if(snapshot.attempt<=lastAttempt)return;
      const roster=snapshot.layout?.searches;
      if(!Array.isArray(roster)||roster.length!==3||roster.some(p=>typeof p?.id!=='string'||!p.id)||new Set(roster.map(p=>p.id)).size!==roster.length)return;
      const award=snapshot.layout?.reward;
      if(!Number.isSafeInteger(award)||award<0)return;
      clear();lastAttempt=snapshot.attempt;
      current={missionId:snapshot.missionId,stage:snapshot.stage,roster:roster.map(p=>p.id),award,claimed:0,earned:0,spent:0,used:new Set(),jammerRemaining:0,finalized:false};
    }
    current.stage=snapshot.stage;
    if(current.finalized)return;
    if(GRANT_STAGES.has(snapshot.stage)&&ctx.onFoot===true){
      const caches=snapshot.caches;
      if(Array.isArray(caches)&&caches.length===current.roster.length&&caches.every((p,i)=>p?.stationId===current.roster[i])){
        let count=0;
        for(const cache of caches){if(cache.captured!==true||cache.alerted!==true||cache.reinforcementsCleared!==true)break;count++;}
        if(count>current.claimed){current.claimed=count;current.earned=Math.min(current.award,count*750);}
      }
    }
    if(Number.isFinite(dt)&&dt>0)current.jammerRemaining=Math.max(0,current.jammerRemaining-Math.min(dt,1));
  }
  function eligibility(id,ctx){
    const offer=Object.hasOwn(SKYLINE_SUPPORT_OFFERS,id)?SKYLINE_SUPPORT_OFFERS[id]:null;
    if(!offer)return result(false,'Unknown support option.');
    if(disposed||applying||!current||current.finalized||ctx.active!==true||ctx.missionId!==current.missionId||ctx.onFoot!==true||!trusted(ctx)||!BUY_STAGES.has(current.stage))return result(false,'Use support during the active ground retrieval.');
    if(current.used.has(id))return result(false,'Already used this retrieval.');
    if(current.earned-current.spent<offer.cost)return result(false,'Capture more caches to fund this support.');
    let check;
    applying=true;
    try{check=canUse(id,ctx);}catch{return result(false,'Support is unavailable here.');}finally{applying=false;}
    return accepted(check)?result(true,'Ready.'):result(false,check?.message||check?.reason||'Support is unavailable here.');
  }
  function buy(id,ctx={}){
    if(applying)return result(false,'Support request already in progress.');
    const checked=eligibility(id,ctx);if(!checked.ok)return checked;
    let effect;applying=true;
    try{effect=apply(id,ctx);}catch{effect=null;}finally{applying=false;}
    if(!accepted(effect))return result(false,effect?.message||effect?.reason||'Support could not be applied. Nothing was spent.');
    const offer=SKYLINE_SUPPORT_OFFERS[id];current.spent+=offer.cost;current.used.add(id);
    if(id==='jammer')current.jammerRemaining=offer.duration;
    events.push(frozen({type:'support-used',missionId:current.missionId,offerId:id,cost:offer.cost,...(id==='jammer'?{cancelWarning:true,duration:offer.duration}:{})}));
    return result(true,effect?.message||`${offer.name} received.`);
  }
  function offers(ctx={}){
    return frozen(Object.values(SKYLINE_SUPPORT_OFFERS).map(offer=>{
      const check=eligibility(offer.id,ctx);return frozen({...offer,used:current?.used.has(offer.id)||false,available:check.ok,reason:check.message});
    }));
  }
  function complete(snapshot={},ctx={}){
    if(disposed||applying||!current||current.finalized||!validSnapshot(snapshot)||snapshot.active!==false||snapshot.stage!=='complete'||
      snapshot.missionId!==current.missionId||ctx.missionId!==current.missionId||!trusted(ctx)||!Array.isArray(snapshot.caches)||snapshot.caches.length!==current.roster.length||
      !snapshot.caches.every((cache,i)=>cache.stationId===current.roster[i]&&cache.captured===true&&cache.alerted===true&&cache.reinforcementsCleared===true))return null;
    current.finalized=true;current.stage='complete';current.jammerRemaining=0;
    return frozen({missionId:current.missionId,baseReward:current.award,spent:current.spent,reward:Math.max(0,current.award-current.spent)});
  }
  function snapshot(){
    return frozen({missionId:current?.missionId||null,earned:current?.earned||0,spent:current?.spent||0,balance:(current?.earned||0)-(current?.spent||0),
      jammerRemaining:current?.jammerRemaining||0,claimedCaches:frozen(current?.roster.slice(0,current.claimed)||[]),
      offers:frozen(Object.values(SKYLINE_SUPPORT_OFFERS).map(offer=>frozen({...offer,used:current?.used.has(offer.id)||false})))});
  }
  return frozen({step,buy,offers,snapshot,complete,clear,drainEvents:()=>events.splice(0),get jammerActive(){return (current?.jammerRemaining||0)>0;},
    dispose(){if(disposed||applying)return;clear();disposed=true;}});
}
