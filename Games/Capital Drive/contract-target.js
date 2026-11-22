import {createContractStealth} from './contract-stealth.js';
import { rayTargetDistance } from './ballistics.js';
import { appearanceForPerson, PERSON_MODEL } from './person-model.js';

const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const space = p => p?.interiorId ?? p?.space ?? null;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const emptyHit = () => ({hits:0,people:[]});

// One original fictional adult. The controller owns admission, witnesses and rewards.
export function createContractTarget({clipMovement=()=>({dx:0,dz:0,blocked:true}),hasLineOfSight=()=>false,heightAt=()=>0}={}) {
  let actor=null,disposed=false,paused=false,serial=0;
  const stealth=createContractStealth({clipMovement,hasLineOfSight,heightAt});
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
  const guardShot=Object.freeze({
    get id(){return stealth.guardBody?.id??null;},get personId(){return stealth.guardBody?.personId??null;},
    get x(){return stealth.guardBody?.x??0;},get z(){return stealth.guardBody?.z??0;},get feetY(){return stealth.guardBody?.y??0;},
    get height(){return stealth.guardBody?.standingHeight??1.8;},radius:.36,
    get health(){return stealth.guardBody?.health??0;},get active(){return (stealth.guardBody?.health??0)>0;},interiorId:null,
    damage:(amount,ray)=>hitByShot(guardShot.id,amount,ray),
  });
  const shots=Object.freeze([shot]),guardShots=Object.freeze([guardShot]),bothShots=Object.freeze([shot,guardShot]),noShots=Object.freeze([]);
  function load({missionId,targetId,pose,appearanceId=`contract:${targetId}`,label='Fictional contract target',space:room=null,stealth:settings=null}={}) {
    if(disposed||!point(pose)||typeof missionId!=='string'||!missionId||typeof targetId!=='string'||!targetId||
      typeof appearanceId!=='string'||!appearanceId||typeof label!=='string'||(room!==null&&typeof room!=='string')||
      (pose.yaw!==undefined&&!Number.isFinite(pose.yaw)))return false;
    if(actor?.missionId===missionId&&actor.targetId===targetId)return true;
    actor={missionId,targetId,personId:`contract:${targetId}`,appearanceId,label,appearance:appearanceForPerson(appearanceId),space:room,
      x:pose.x,z:pose.z,y:ground(pose.x,pose.z),yaw:pose.yaw??0,anchor:{x:pose.x,z:pose.z},
      health:100,speed:0,phase:0,time:0,reaction:0,cooldown:0,deathTime:0,attacker:null};
    stealth.clear();if(settings)stealth.load({missionId,targetId,config:settings,targetPose:pose});
    paused=false;events.length=0;return true;
  }
  function clear(){actor=null;stealth.clear();paused=false;events.length=0;}
  function step(dt,ctx={}) {
    if(!Number.isFinite(dt)||dt<0)throw new Error('Contract target dt must be finite and nonnegative.');
    if(disposed||!actor)return;
    if(Object.hasOwn(ctx,'activeMissionId')&&ctx.activeMissionId!==actor.missionId){clear();return;}
    paused=ctx.paused===true;
    stealth.step(dt,{...ctx,target:body});
    if(paused||!dt)return;
    const delta=Math.min(dt,.1);actor.cooldown=Math.max(0,actor.cooldown-delta);
    if(actor.health<=0){actor.speed=0;actor.deathTime=Math.min(30,actor.deathTime+delta);return;}
    actor.time+=delta;actor.reaction=Math.max(0,actor.reaction-delta);
    let goal;
    if(actor.reaction>0&&point(actor.attacker)){
      const dx=actor.x-actor.attacker.x,dz=actor.z-actor.attacker.z,length=Math.hypot(dx,dz)||1;
      goal={x:actor.x+dx/length*2,z:actor.z+dz/length*2};
      if(distance(goal,actor.anchor)>12)goal=actor.anchor;
    }else goal=stealth.targetGoal()||{x:actor.anchor.x+(Math.floor(actor.time/3)%2?1:-1)*2,z:actor.anchor.z};
    const dx=goal.x-actor.x,dz=goal.z-actor.z,length=Math.hypot(dx,dz),speed=actor.reaction>0?2.2:.6;
    if(length<.12){actor.speed=0;if(Number.isFinite(goal.yaw))actor.yaw=goal.yaw;return;}
    const amount=Math.min(length,speed*delta),wantedX=dx/length*amount,wantedZ=dz/length*amount;
    const moved=clipMovement(body,wantedX,wantedZ,.36);
    if(!moved||!Number.isFinite(moved.dx)||!Number.isFinite(moved.dz)||Math.hypot(moved.dx,moved.dz)>amount+1e-6){actor.speed=0;return;}
    actor.x+=moved.dx;actor.z+=moved.dz;actor.y=ground(actor.x,actor.z);actor.yaw=Math.atan2(-dx,-dz);
    actor.speed=Math.hypot(moved.dx,moved.dz)/delta;actor.phase+=actor.speed*delta*3;
  }
  function damage(amount,from,kind='melee') {
    stealth.noteAttack(kind);events.push(...stealth.drainEvents());
    actor.health=Math.max(0,actor.health-Math.min(100,amount));actor.cooldown=.25;actor.reaction=4;actor.attacker={x:from.x,z:from.z};
    if(actor.health===0){actor.speed=0;events.push(Object.freeze({type:'defeated',missionId:actor.missionId,targetId:actor.targetId,serial:++serial,outcome:'killed',...(stealth.guardBody?{stealthOutcome:stealth.alerted?'alerted':'clean'}:{})}));}
    return {hits:1,people:[Object.freeze({id:actor.targetId,x:actor.x,z:actor.z,health:actor.health,reaction:actor.health===0?'dead':'injured'})]};
  }
  function hitByShot(id,amount,ray) {
    if(!disposed&&!paused&&stealth.guardBody?.id===id&&guardShot.active&&ray&&Number.isFinite(rayTargetDistance(ray,guardShot))&&hasLineOfSight(ray,stealth.guardBody)===true)return stealth.damageGuard(amount,ray,'shot');
    if(disposed||paused||!actor||id!==actor.targetId||actor.health<=0||actor.cooldown>0||!Number.isFinite(amount)||amount<=0||
      !ray||!Number.isFinite(rayTargetDistance(ray,shot))||hasLineOfSight(ray,body)!==true)return emptyHit();
    return damage(amount,ray,'shot');
  }
  function strikeTarget(spec={}) {
    const {x,z,yaw=0,range=2,damage:amount=20,kind='melee'}=spec;
    if(disposed||paused||!actor||actor.health<=0||actor.cooldown>0||kind!=='melee'||![x,z,yaw,range,amount].every(Number.isFinite)||
      amount<=0||range<=0||space(spec)!==actor.space)return emptyHit();
    const reach=Math.min(2.4,range),gap=distance(actor,spec),forward=(actor.x-x)*-Math.sin(yaw)+(actor.z-z)*-Math.cos(yaw);
    if(gap>reach||forward<gap*.25||hasLineOfSight(spec,body)!==true||(spec.hasLineOfSight&&spec.hasLineOfSight(spec,body)!==true))return emptyHit();
    return damage(amount,spec);
  }
  function strike(spec={}){
    const hit=strikeTarget(spec);if(hit.hits)return hit;
    const guard=stealth.guardBody,{x,z,yaw=0,range=2,damage:amount=20,kind='melee'}=spec;
    if(disposed||paused||!guard||guard.health<=0||kind!=='melee'||![x,z,yaw,range,amount].every(Number.isFinite)||space(spec)!==null)return emptyHit();
    const gap=distance(guard,spec),forward=(guard.x-x)*-Math.sin(yaw)+(guard.z-z)*-Math.cos(yaw);
    if(gap>Math.min(2.4,range)||forward<gap*.25||hasLineOfSight(spec,guard)!==true||(spec.hasLineOfSight&&spec.hasLineOfSight(spec,guard)!==true))return emptyHit();
    return stealth.damageGuard(amount,spec,'melee');
  }
  function canTakedown(ctx={}){
    if(disposed||paused||!actor||!stealth.guardBody||actor.health<=0||actor.cooldown>0||ctx.paused||ctx.recovering||ctx.onFoot!==true||!Number.isFinite(ctx.health)||ctx.health<=0||ctx.crouching!==true||ctx.sprinting||ctx.aiming||
      !point(ctx.player)||space(ctx.player)!==actor.space||Math.abs(ctx.player.speed||0)>.2||distance(actor,ctx.player)>1.5||stealth.alerted||stealth.sees(ctx.player))return false;
    const dx=ctx.player.x-actor.x,dz=ctx.player.z-actor.z,gap=Math.hypot(dx,dz);
    return gap>.15&&Number.isFinite(ctx.player.yaw)&&dx*-Math.sin(actor.yaw)+dz*-Math.cos(actor.yaw)<-gap*.55&&
      (-dx)*-Math.sin(ctx.player.yaw)+(-dz)*-Math.cos(ctx.player.yaw)>=gap*.6&&hasLineOfSight(ctx.player,body)===true;
  }
  function availableAction(ctx={}){
    if(canTakedown(ctx))return Object.freeze({id:'takedown',label:'Silent takedown'});
    return stealth.availableAction(ctx);
  }
  function interact(id,ctx={}){
    if(id!=='takedown')return stealth.interact(id,ctx);
    if(!canTakedown(ctx))return {ok:false,message:'Crouch still behind Voss, close enough to reach him without being watched.'};
    const hit=damage(100,ctx.player,'takedown');return {ok:hit.hits===1,message:'Silent takedown. Reach the pickup before the body is found.',kind:'takedown'};
  }
  return Object.freeze({load,step,hitByShot,strike,interact,availableAction,heardShot:pose=>!paused&&actor&&space(pose)===actor.space?stealth.heardShot(pose):false,melee:spec=>strike({...spec,...(spec?.from||{})}),
    get body(){return actor?body:null;},get guardBody(){return stealth.guardBody;},shotTargets:()=>disposed?noShots:actor?.health>0?guardShot.active?bothShots:shots:guardShot.active?guardShots:noShots,
    snapshot:()=>actor?Object.freeze({missionId:actor.missionId,targetId:actor.targetId,serial,label:actor.label,x:actor.x,z:actor.z,y:actor.y,yaw:actor.yaw,
      health:actor.health,active:true,dead:actor.health===0,stealth:stealth.snapshot(),appearanceId:actor.appearanceId,mode:'foot',modelId:'contract-target',reaction:body.reaction,deathTime:actor.deathTime}):null,
    drainEvents:()=>[...events.splice(0),...stealth.drainEvents()],clear,dispose(){if(disposed)return;clear();stealth.dispose();disposed=true;}});
}
