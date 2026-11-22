import { rayTargetDistance } from './ballistics.js';
import { appearanceForPerson, PERSON_MODEL } from './person-model.js';

const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const space = p => p?.interiorId ?? p?.space ?? null;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const emptyHit = () => ({hits:0,people:[]});

// One original fictional adult. The controller owns admission, witnesses and rewards.
export function createContractTarget({clipMovement=()=>({dx:0,dz:0,blocked:true}),hasLineOfSight=()=>false,heightAt=()=>0}={}) {
  let actor=null,disposed=false,paused=false,serial=0;
  const events=[];
  const ground=(x,z)=>{const y=heightAt(x,z);return Number.isFinite(y)?y:0;};
  const body=Object.freeze({
    get id(){return actor?.targetId??null;},get personId(){return actor?.personId??null;},get appearanceId(){return actor?.appearanceId??null;},
    get appearance(){return actor?.appearance??null;},get label(){return actor?.label??'';},
    get x(){return actor?.x??0;},get z(){return actor?.z??0;},get y(){return actor?.y??0;},get yaw(){return actor?.yaw??0;},
    get health(){return actor?.health??0;},get active(){return actor!==null&&!disposed;},get dead(){return actor?.health===0;},
    get speed(){return actor?.speed??0;},get phase(){return actor?.phase??0;},get deathTime(){return actor?.deathTime??0;},
    get reaction(){return actor?.health===0?'dead':actor?.reaction>0?'panic':'calm';},
    get height(){return actor?.appearance.height??1;},get standingHeight(){return (PERSON_MODEL.hair.y+PERSON_MODEL.hair.sy)*(actor?.appearance.height??1);},
    get interiorId(){return actor?.space??null;},get space(){return actor?.space??null;},
    mode:'foot',modelId:'contract-target',adult:true,fictional:true,role:'contract-target',radius:.36,
  });
  const shot=Object.freeze({
    get id(){return body.id;},get personId(){return body.personId;},get x(){return body.x;},get z(){return body.z;},
    get feetY(){return body.y;},get height(){return body.standingHeight;},radius:.36,
    get health(){return body.health;},get active(){return body.active&&body.health>0;},get interiorId(){return body.interiorId;},
    damage:(amount,ray)=>hitByShot(body.id,amount,ray),
  });
  const shots=Object.freeze([shot]),noShots=Object.freeze([]);
  function load({missionId,targetId,pose,appearanceId=`contract:${targetId}`,label='Fictional contract target',space:room=null}={}) {
    if(disposed||!point(pose)||typeof missionId!=='string'||!missionId||typeof targetId!=='string'||!targetId||
      typeof appearanceId!=='string'||!appearanceId||typeof label!=='string'||(room!==null&&typeof room!=='string')||
      (pose.yaw!==undefined&&!Number.isFinite(pose.yaw)))return false;
    if(actor?.missionId===missionId&&actor.targetId===targetId)return true;
    actor={missionId,targetId,personId:`contract:${targetId}`,appearanceId,label,appearance:appearanceForPerson(appearanceId),space:room,
      x:pose.x,z:pose.z,y:ground(pose.x,pose.z),yaw:pose.yaw??0,anchor:{x:pose.x,z:pose.z},
      health:100,speed:0,phase:0,time:0,reaction:0,cooldown:0,deathTime:0,attacker:null};
    paused=false;events.length=0;return true;
  }
  function clear(){actor=null;paused=false;events.length=0;}
  function step(dt,ctx={}) {
    if(!Number.isFinite(dt)||dt<0)throw new Error('Contract target dt must be finite and nonnegative.');
    if(disposed||!actor)return;
    if(Object.hasOwn(ctx,'activeMissionId')&&ctx.activeMissionId!==actor.missionId){clear();return;}
    paused=ctx.paused===true;if(paused||!dt)return;
    const delta=Math.min(dt,.1);actor.cooldown=Math.max(0,actor.cooldown-delta);
    if(actor.health<=0){actor.speed=0;actor.deathTime=Math.min(30,actor.deathTime+delta);return;}
    actor.time+=delta;actor.reaction=Math.max(0,actor.reaction-delta);
    let goal;
    if(actor.reaction>0&&point(actor.attacker)){
      const dx=actor.x-actor.attacker.x,dz=actor.z-actor.attacker.z,length=Math.hypot(dx,dz)||1;
      goal={x:actor.x+dx/length*2,z:actor.z+dz/length*2};
      if(distance(goal,actor.anchor)>12)goal=actor.anchor;
    }else goal={x:actor.anchor.x+(Math.floor(actor.time/3)%2?1:-1)*2,z:actor.anchor.z};
    const dx=goal.x-actor.x,dz=goal.z-actor.z,length=Math.hypot(dx,dz),speed=actor.reaction>0?2.2:.6;
    if(length<.12){actor.speed=0;return;}
    const amount=Math.min(length,speed*delta),wantedX=dx/length*amount,wantedZ=dz/length*amount;
    const moved=clipMovement(body,wantedX,wantedZ,.36);
    if(!moved||!Number.isFinite(moved.dx)||!Number.isFinite(moved.dz)||Math.hypot(moved.dx,moved.dz)>amount+1e-6){actor.speed=0;return;}
    actor.x+=moved.dx;actor.z+=moved.dz;actor.y=ground(actor.x,actor.z);actor.yaw=Math.atan2(-dx,-dz);
    actor.speed=Math.hypot(moved.dx,moved.dz)/delta;actor.phase+=actor.speed*delta*3;
  }
  function damage(amount,from) {
    actor.health=Math.max(0,actor.health-Math.min(100,amount));actor.cooldown=.25;actor.reaction=4;actor.attacker={x:from.x,z:from.z};
    if(actor.health===0){actor.speed=0;events.push(Object.freeze({type:'defeated',missionId:actor.missionId,targetId:actor.targetId,serial:++serial,outcome:'killed'}));}
    return {hits:1,people:[Object.freeze({id:actor.targetId,x:actor.x,z:actor.z,health:actor.health,reaction:actor.health===0?'dead':'injured'})]};
  }
  function hitByShot(id,amount,ray) {
    if(disposed||paused||!actor||id!==actor.targetId||actor.health<=0||actor.cooldown>0||!Number.isFinite(amount)||amount<=0||
      !ray||!Number.isFinite(rayTargetDistance(ray,shot))||hasLineOfSight(ray,body)!==true)return emptyHit();
    return damage(amount,ray);
  }
  function strike(spec={}) {
    const {x,z,yaw=0,range=2,damage:amount=20,kind='melee'}=spec;
    if(disposed||paused||!actor||actor.health<=0||actor.cooldown>0||kind!=='melee'||![x,z,yaw,range,amount].every(Number.isFinite)||
      amount<=0||range<=0||space(spec)!==actor.space)return emptyHit();
    const reach=Math.min(2.4,range),gap=distance(actor,spec),forward=(actor.x-x)*-Math.sin(yaw)+(actor.z-z)*-Math.cos(yaw);
    if(gap>reach||forward<gap*.25||hasLineOfSight(spec,body)!==true||(spec.hasLineOfSight&&spec.hasLineOfSight(spec,body)!==true))return emptyHit();
    return damage(amount,spec);
  }
  return Object.freeze({load,step,hitByShot,strike,melee:spec=>strike({...spec,...(spec?.from||{})}),
    get body(){return actor?body:null;},shotTargets:()=>actor&&actor.health>0&&!disposed?shots:noShots,
    snapshot:()=>actor?Object.freeze({missionId:actor.missionId,targetId:actor.targetId,serial,label:actor.label,x:actor.x,z:actor.z,y:actor.y,yaw:actor.yaw,
      health:actor.health,active:true,dead:actor.health===0,appearanceId:actor.appearanceId,mode:'foot',modelId:'contract-target',reaction:body.reaction,deathTime:actor.deathTime}):null,
    drainEvents:()=>events.splice(0),clear,dispose(){if(disposed)return;clear();disposed=true;}});
}
