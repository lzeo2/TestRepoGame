import {rayTargetDistance} from './ballistics.js';
import {SKYLINE_JOB_ID} from './skyline-job.js';

// Original arcade pressure rules. The controller owns impact rendering/damage.
const NONE=Object.freeze([]),WARNING=5,LOCK_DELAY=2,RADIUS=7,HP=90;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=180;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const miss=()=>({hits:0,people:[]});

export function createSkylinePressure({hasLineOfSight=()=>true}={}){
  let current=null,mission=null,attempt=0,serial=0,events=[],cached=null,enabled=false,disposed=false;
  const seen=new Set();
  const dirty=()=>{cached=null;};
  const clear=()=>{current=null;enabled=false;events=[];dirty();};
  const emit=(type,data={})=>{if(events.length<16)events.push(freeze({type,missionId:mission,encounterId:current?.encounterId,serial:++serial,...data}));};
  const descriptor=()=>current?.drone.health>0?freeze({id:current.drone.id,x:current.drone.x,y:current.drone.y,z:current.drone.z,
    feetY:current.drone.y-.65,height:1.3,radius:.65,health:current.drone.health,active:true,interiorId:null}):null;
  function step(dt,snapshot={},ctx={}){
    if(disposed)return;
    if(snapshot.active!==true||snapshot.jobId!==SKYLINE_JOB_ID||!validId(snapshot.missionId)||
      !Number.isSafeInteger(snapshot.attempt)||snapshot.attempt<1||snapshot.attempt<attempt){clear();return;}
    if(snapshot.attempt>attempt){clear();attempt=snapshot.attempt;mission=snapshot.missionId;seen.clear();}
    if(snapshot.missionId!==mission){clear();return;}
    if(ctx.active!==true||ctx.recovering===true||ctx.dead===true||Number.isFinite(ctx.health)&&ctx.health<=0||
      (ctx.player?.interiorId??null)!==null){clear();return;}
    const matching=validId(snapshot.encounterId)&&(!ctx.missionId||ctx.missionId===mission)&&(!ctx.encounterId||ctx.encounterId===snapshot.encounterId);
    if(!matching||current&&current.encounterId!==snapshot.encounterId){clear();}
    if(!matching)return;
    const defeated=new Set(Array.isArray(snapshot.defeated)?snapshot.defeated.slice(0,4):[]);
    const hostile=snapshot.stage==='encounter'&&snapshot.encounterKind==='reinforcement'&&
      Array.isArray(snapshot.enemies)&&snapshot.enemies.slice(0,4).some(enemy=>enemy?.missionId===mission&&enemy.encounterId===snapshot.encounterId&&
        enemy.reinforcement===true&&validId(enemy.targetId)&&Number.isFinite(enemy.health)&&enemy.health>0&&!defeated.has(enemy.targetId));
    const held=snapshot.stage==='capture'&&current?.encounterId===snapshot.encounterId&&current.strike?.active===true;
    if(!hostile&&!held){clear();return;}
    enabled=ctx.active===true&&ctx.paused!==true&&ctx.recovering!==true&&ctx.dead!==true&&Number.isFinite(ctx.health)&&ctx.health>0&&
      finite(ctx.player)&&(ctx.player.interiorId??null)===null;
    if(!enabled||!Number.isFinite(dt)||dt<=0)return;
    const delta=Math.min(dt,.1);
    if(!current){
      if(seen.has(snapshot.encounterId)||seen.size>=3)return;
      seen.add(snapshot.encounterId);
      current={encounterId:snapshot.encounterId,time:0,lockRemaining:LOCK_DELAY,used:false,jammed:false,cooldown:0,strike:null,
        drone:{id:`skyline-drone:${snapshot.encounterId}`,x:ctx.player.x+18,y:ctx.player.y+12,z:ctx.player.z-8,yaw:0,health:HP,maxHealth:HP,active:true,hostile:true}};
      emit('drone-arrived',{id:current.drone.id});
    }
    current.time+=delta;current.cooldown=Math.max(0,current.cooldown-delta);current.jammed=ctx.jammed===true;
    if(current.jammed){
      if(!current.used||current.strike?.active){current.used=true;if(current.strike)current.strike.active=false;emit('airstrike-cancelled',{reason:'jammer'});}
    }
    const drone=current.drone;
    if(drone.health>0){
      const goal={x:ctx.player.x+Math.cos(current.time*.55)*14,y:ctx.player.y+11,z:ctx.player.z+Math.sin(current.time*.55)*14};
      const dx=goal.x-drone.x,dy=goal.y-drone.y,dz=goal.z-drone.z,d=Math.hypot(dx,dy,dz),scale=Math.min(1,6*delta/(d||1));
      drone.x+=dx*scale;drone.y+=dy*scale;drone.z+=dz*scale;drone.yaw=Math.atan2(-dx,-dz);
      if(!current.used&&hostile&&!current.jammed){
        current.lockRemaining=Math.max(0,current.lockRemaining-delta);
        if(current.lockRemaining<=1e-8){
          current.used=true;current.strike={active:true,id:`skyline-strike:${current.encounterId}`,x:ctx.player.x,y:ctx.player.y,z:ctx.player.z,radius:RADIUS,remaining:WARNING,total:WARNING};
          emit('airstrike-warning',{...current.strike});dirty();return;
        }
      }
    }
    if(current.strike?.active){
      current.strike.remaining=Math.max(0,current.strike.remaining-delta);
      if(current.strike.remaining<=1e-8){current.strike.remaining=0;current.strike.active=false;emit('airstrike-impact',{id:current.strike.id,x:current.strike.x,y:current.strike.y,z:current.strike.z,radius:RADIUS,damage:45});}
    }
    dirty();
  }
  function hitByShot(id,amount,ray){
    const target=descriptor();
    if(disposed||!enabled||!target||id!==target.id||current.cooldown>0||!Number.isFinite(amount)||amount<=0||
      !Number.isFinite(rayTargetDistance(ray,target))||hasLineOfSight(ray,target)!==true)return miss();
    current.drone.health=Math.max(0,current.drone.health-Math.min(100,amount));current.cooldown=.15;
    if(!current.drone.health){current.drone.active=false;current.used=true;if(current.strike)current.strike.active=false;emit('drone-destroyed',{id});}
    dirty();return {hits:1,people:[freeze({id,x:current.drone.x,y:current.drone.y,z:current.drone.z,health:current.drone.health})]};
  }
  function snapshot(){
    if(!cached)cached=freeze({active:!!current,missionId:current?mission:null,encounterId:current?.encounterId??null,
      drone:current?{...current.drone}:null,strike:current?.strike?{...current.strike}:null,jammed:current?.jammed??false,
      status:!current?'':current.jammed?'Drone signal jammed':current.drone.health<=0?'Drone disabled':current.strike?.active?'Airstrike marked — move outside the ring':current.used?'Drone strike spent':'Hostile drone acquiring a mark'});
    return cached;
  }
  return {step,snapshot,hitByShot,shotTargets(){const target=enabled&&!disposed?descriptor():null;return target?Object.freeze([target]):NONE;},
    drainEvents(){const out=events;events=[];return out;},reset:clear,dispose(){clear();disposed=true;}};
}
