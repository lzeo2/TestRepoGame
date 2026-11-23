import {appearanceForPerson,PERSON_MODEL} from './person-model.js';
const NONE=Object.freeze([]),LIFETIME=60,RANGE=24,DAMAGE=20,COOLDOWN=1.2;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const groundStage=job=>job?.active===true&&['encounter','boss'].includes(job.stage)&&typeof job.missionId==='string'&&!!job.missionId&&typeof job.encounterId==='string'&&!!job.encounterId;

// Effect-only owner. The radio support authority charges once after request()
// succeeds; these actors never debit cash, consume defeat receipts or advance jobs.
export function createSkylineBackup({opponents,heightAt,canStand,hasLineOfSight}={}){
  if(typeof opponents?.hitByShot!=='function'||typeof opponents?.shotTargets!=='function'||[heightAt,canStand,hasLineOfSight].some(fn=>typeof fn!=='function'))throw new TypeError('Backup requires live opponents and ground/cover adapters');
  let records=[],bodies=NONE,missionId=null,remaining=0,serial=0;const events=[];
  const contextValid=(job,ctx)=>ctx.active===true&&ctx.missionId===job.missionId&&ctx.encounterId===job.encounterId&&ctx.paused!==true&&ctx.recovering!==true&&Number.isFinite(ctx.health)&&ctx.health>0&&point(ctx.player)&&!(ctx.player.interiorId||ctx.player.space)&&ctx.interior!==true;
  function placements(ctx){
    const yaw=Number.isFinite(ctx.player.yaw)?ctx.player.yaw:0,c=Math.cos(yaw),s=Math.sin(yaw),accepted=[];
    const fromY=Number.isFinite(ctx.player.y)?ctx.player.y:heightAt(ctx.player.x,ctx.player.z);
    if(!Number.isFinite(fromY))return accepted;
    for(const [side,aft] of [[-2,2],[2,2],[-3.5,0],[3.5,0],[-2,-2],[2,-2]]){
      const x=ctx.player.x+c*side+s*aft,z=ctx.player.z-s*side+c*aft,y=heightAt(x,z),p={x,y,z,yaw,interiorId:null};
      if(!Number.isFinite(y)||Math.abs(y-fromY)>1.5||canStand(p,{radius:.36,height:1.8})!==true||hasLineOfSight({...ctx.player,y:fromY+1.1},{...p,y:y+1.1})!==true)continue;
      accepted.push(p);if(accepted.length===2)break;
    }
    return accepted;
  }
  function canRequest(job={},ctx={}){
    if(!groundStage(job)||!contextValid(job,ctx)||ctx.onFoot!==true||(ctx.player.jumpHeight||0)>.5)return {ok:false,message:'Call backup on foot during the current ground encounter.'};
    if(remaining>0)return {ok:false,message:'Your backup team is already deployed.'};
    if(placements(ctx).length!==2)return {ok:false,message:'Backup needs two clear nearby positions.'};
    return {ok:true,message:'Two allies are ready to deploy.'};
  }
  function request(job={},ctx={}){
    const allowed=canRequest(job,ctx);if(!allowed.ok)return allowed;
    const positions=placements(ctx);if(positions.length!==2)return {ok:false,message:'The backup arrival positions became blocked.'};
    missionId=job.missionId;remaining=LIFETIME;events.length=0;
    records=positions.map((p,i)=>{
      const appearanceId=`contract:skyline-backup-${i}`,appearance=appearanceForPerson(appearanceId);
      const r={...p,id:`${missionId}:backup:${++serial}`,appearanceId,appearance,yaw:p.yaw,phase:0,cooldown:.3+i*.45,shot:null};
      r.body=Object.freeze({id:r.id,personId:r.id,label:`Skylark ally ${i+1}`,role:'contract-guard',adult:true,fictional:true,armed:true,mode:'combat',interiorId:null,space:null,radius:.36,
        appearanceId,appearance,height:appearance.height,standingHeight:(PERSON_MODEL.hair.y+PERSON_MODEL.hair.sy)*appearance.height,
        get x(){return r.x;},get y(){return r.y;},get z(){return r.z;},get yaw(){return r.yaw;},get phase(){return r.phase;},get shot(){return r.shot;},
        get active(){return remaining>0&&records.includes(r);},health:100,speed:0,reaction:'combat',deathTime:0});
      return r;
    });
    bodies=Object.freeze(records.map(r=>r.body));return {ok:true,message:'Two allies deployed for one minute.'};
  }
  function reset(){records=[];bodies=NONE;missionId=null;remaining=0;events.length=0;}
  function step(dt,job={},ctx={}){
    if(!remaining)return;
    if(job.active!==true||job.missionId!==missionId||ctx.missionId!==missionId){reset();return;}
    if(ctx.paused||!Number.isFinite(dt)||dt<=0)return;
    const delta=Math.min(.1,dt);remaining=Math.max(0,remaining-delta);
    if(!remaining){reset();return;}
    const enabled=groundStage(job)&&contextValid(job,ctx)&&ctx.onFoot===true&&(ctx.player.jumpHeight||0)<=.5;
    for(const r of records){
      r.phase+=delta;r.cooldown=Math.max(0,r.cooldown-delta);
      if(r.shot){const left=Math.max(0,r.shot.remaining-delta);r.shot=left?Object.freeze({...r.shot,remaining:left}):null;}
      if(!enabled||r.cooldown>0)continue;
      const targets=opponents.shotTargets().filter(t=>t.active!==false&&t.health>0&&point(t)&&Math.hypot(t.x-r.x,t.z-r.z)<=RANGE).sort((a,b)=>Math.hypot(a.x-r.x,a.z-r.z)-Math.hypot(b.x-r.x,b.z-r.z));
      for(const target of targets){
        const from={x:r.x,y:r.y+1.25,z:r.z,interiorId:null},to={x:target.x,y:target.feetY+Math.min(1.1,target.height*.6),z:target.z,interiorId:null};
        const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
        if(!(distance>0&&distance<=28)||hasLineOfSight(from,to)!==true)continue;
        r.yaw=Math.atan2(r.x-target.x,r.z-target.z);r.cooldown=COOLDOWN;
        const result=opponents.hitByShot(target.id,DAMAGE,{...from,supportMissionId:job.missionId,supportEncounterId:job.encounterId,
          dx:dx/distance,dy:dy/distance,dz:dz/distance,range:Math.min(28,distance+.5)});
        if(result?.hits){r.shot=Object.freeze({from:Object.freeze(from),to:Object.freeze(to),remaining:.16});events.push(Object.freeze({type:'ally-shot',missionId,encounterId:job.encounterId,actorId:r.id,targetId:target.id,from:r.shot.from,to:r.shot.to}));}
        break;
      }
    }
  }
  return Object.freeze({canRequest,request,step,reset,get bodies(){return bodies;},drainEvents:()=>events.splice(0),
    snapshot:()=>Object.freeze({active:remaining>0,missionId,remaining,bodies})});
}
