import { rayTargetDistance } from './ballistics.js';
import { appearanceForPerson, PERSON_MODEL } from './person-model.js';

const MAX_ACTORS=4,HIT_COOLDOWN=.25,ATTACK_COOLDOWN=2,ATTACK_RANGE=18;
const point=p=>p&&[p.x,p.z].every(Number.isFinite);
const room=p=>p?.interiorId??p?.space??null;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const empty=()=>({hits:0,people:[]});
const NONE=Object.freeze([]);

// Bounded fictional adult game opponents. The job owns admission and rewards;
// this owner only controls live HP, ordinary hit adapters and supplied-time AI.
export function createSkylineOpponents({heightAt=()=>undefined,hasLineOfSight=()=>false,clipMovement,onPlayerHit}={}){
  let records=[],bodies=NONE,shots=NONE,key=null,enabled=false,disposed=false,serial=0;
  const events=[];
  const ground=(x,z,fallback=0)=>{const y=heightAt(x,z);return Number.isFinite(y)?y:fallback;};
  const refreshShots=()=>{shots=Object.freeze(records.filter(r=>r.health>0).map(r=>r.shot));};
  function clear(){records=[];bodies=shots=NONE;key=null;enabled=false;events.length=0;}
  function load(snapshot){
    const accepted=[],ids=new Set();
    for(const source of (snapshot.enemies||[]).slice(0,MAX_ACTORS)){
      if(!point(source)||source.missionId!==snapshot.missionId||source.encounterId!==snapshot.encounterId||
        typeof source.targetId!=='string'||!source.targetId||ids.has(source.targetId)||!Number.isFinite(source.health)||source.health<=0)continue;
      ids.add(source.targetId);
      const appearanceId=typeof source.appearanceId==='string'?source.appearanceId:`contract:${source.targetId}`;
      const r={missionId:source.missionId,encounterId:source.encounterId,targetId:source.targetId,
        personId:`skyline:${source.targetId}`,label:source.label||'Fictional Skylark crew',appearanceId,appearance:appearanceForPerson(appearanceId),
        x:source.x,z:source.z,y:ground(source.x,source.z,Number.isFinite(source.y)?source.y:0),yaw:Number.isFinite(source.yaw)?source.yaw:0,
        health:Math.min(300,source.health),cooldown:0,attackCooldown:1+accepted.length*.35,phase:0,speed:0,time:0,deathTime:0,anchor:{x:source.x,z:source.z}};
      r.body=Object.freeze({
        id:r.targetId,personId:r.personId,label:r.label,appearanceId:r.appearanceId,appearance:r.appearance,
        mode:'foot',modelId:'skyline-opponent',role:'contract-target',adult:true,fictional:true,armed:true,radius:.36,interiorId:null,space:null,
        get x(){return r.x;},get z(){return r.z;},get y(){return r.y;},get yaw(){return r.yaw;},get health(){return r.health;},
        get active(){return !disposed&&records.includes(r);},get dead(){return r.health===0;},get speed(){return r.speed;},get phase(){return r.phase;},
        get reaction(){return r.health===0?'dead':'combat';},get deathTime(){return r.deathTime;},
        height:r.appearance.height,standingHeight:(PERSON_MODEL.hair.y+PERSON_MODEL.hair.sy)*r.appearance.height,
      });
      r.shot=Object.freeze({id:r.targetId,personId:r.personId,interiorId:null,radius:.36,
        get x(){return r.x;},get z(){return r.z;},get feetY(){return r.y;},get height(){return r.body.standingHeight;},
        get health(){return r.health;},get active(){return enabled&&r.body.active&&r.health>0;},damage:(amount,ray)=>hitByShot(r.targetId,amount,ray)});
      accepted.push(r);
    }
    records=accepted;bodies=Object.freeze(records.map(r=>r.body));refreshShots();
  }
  function step(dt,snapshot={},ctx={}){
    if(disposed)return;
    if(snapshot.active!==true||typeof snapshot.missionId!=='string'||!snapshot.encounterId){clear();return;}
    const nextKey=`${snapshot.missionId}|${snapshot.encounterId}`;
    if(nextKey!==key){clear();key=nextKey;load(snapshot);}
    enabled=ctx.active===true&&ctx.onFoot===true&&ctx.paused!==true&&ctx.recovering!==true&&Number.isFinite(ctx.health)&&ctx.health>0&&
      ['encounter','boss'].includes(snapshot.stage)&&point(ctx.player)&&room(ctx.player)===null&&
      (!ctx.missionId||ctx.missionId===snapshot.missionId)&&(!ctx.encounterId||ctx.encounterId===snapshot.encounterId);
    if(!Number.isFinite(dt)||dt<=0||ctx.paused===true)return;
    const delta=Math.min(dt,.1);
    for(const r of records){
      r.cooldown=Math.max(0,r.cooldown-delta);
      if(r.health<=0){r.speed=0;r.deathTime=Math.min(30,r.deathTime+delta);continue;}
      r.speed=0;
      if(!enabled)continue;
      r.time+=delta;r.attackCooldown=Math.max(0,r.attackCooldown-delta);
      const distance=gap(r,ctx.player);r.yaw=Math.atan2(r.x-ctx.player.x,r.z-ctx.player.z);
      if(clipMovement&&distance>3){
        const goal={x:r.anchor.x+Math.sin(r.time*.4)*1.2,z:r.anchor.z+Math.cos(r.time*.4)*1.2},dx=goal.x-r.x,dz=goal.z-r.z,length=Math.hypot(dx,dz)||1;
        const amount=Math.min(length,.65*delta),moved=clipMovement(r.body,dx/length*amount,dz/length*amount,.36);
        if(moved&&[moved.dx,moved.dz].every(Number.isFinite)&&Math.hypot(moved.dx,moved.dz)<=amount+1e-6&&Math.hypot(r.x+moved.dx-r.anchor.x,r.z+moved.dz-r.anchor.z)<=2){
          r.x+=moved.dx;r.z+=moved.dz;r.y=ground(r.x,r.z,r.y);r.speed=Math.hypot(moved.dx,moved.dz)/delta;r.phase+=r.speed*delta*3;
        }
      }
      if(distance>ATTACK_RANGE||r.attackCooldown>0)continue;
      const from={x:r.x,y:r.y+1.35,z:r.z,interiorId:null},to={...ctx.player,y:(Number.isFinite(ctx.player.y)?ctx.player.y:ground(ctx.player.x,ctx.player.z))+1.1,interiorId:null};
      if(hasLineOfSight(from,to)!==true)continue;
      r.attackCooldown=ATTACK_COOLDOWN;onPlayerHit?.(8,Object.freeze(from));
    }
  }
  function damage(r,amount){
    r.health=Math.max(0,r.health-Math.min(100,amount));r.cooldown=HIT_COOLDOWN;
    if(!r.health){
      r.speed=0;refreshShots();
      events.push(Object.freeze({type:'defeated',missionId:r.missionId,targetId:r.targetId,encounterId:r.encounterId,serial:++serial,outcome:'killed'}));
    }
    return {hits:1,people:[Object.freeze({id:r.targetId,x:r.x,z:r.z,health:r.health,reaction:r.health?'injured':'dead'})]};
  }
  function hitByShot(id,amount,ray){
    const r=records.find(r=>r.targetId===id);
    if(!enabled||disposed||!r||r.health<=0||r.cooldown>0||!Number.isFinite(amount)||amount<=0||
      !Number.isFinite(rayTargetDistance(ray,r.shot))||hasLineOfSight(ray,r.body)!==true)return empty();
    return damage(r,amount);
  }
  function strike(spec={}){
    const {x,z,yaw=0,range=2,damage:amount=20,kind='melee'}=spec;
    if(!enabled||disposed||kind!=='melee'||room(spec)!==null||![x,z,yaw,range,amount].every(Number.isFinite)||range<=0||amount<=0)return empty();
    const candidates=records.filter(r=>r.health>0&&r.cooldown<=0&&gap(r,spec)<=Math.min(2.4,range)).sort((a,b)=>gap(a,spec)-gap(b,spec));
    for(const r of candidates){
      const distance=gap(r,spec),forward=(r.x-x)*-Math.sin(yaw)+(r.z-z)*-Math.cos(yaw);
      if(forward<distance*.25||(Number.isFinite(spec.y)&&Math.abs(spec.y-r.y)>1.8)||hasLineOfSight(spec,r.body)!==true||
        (spec.hasLineOfSight&&spec.hasLineOfSight(spec,r.body)!==true))continue;
      return damage(r,amount);
    }
    return empty();
  }
  return Object.freeze({step,hitByShot,strike,shotTargets:()=>enabled?shots:NONE,drainEvents:()=>events.splice(0),clear,
    get bodies(){return bodies;},snapshot:()=>bodies,
    dispose(){if(disposed)return;clear();disposed=true;}});
}
