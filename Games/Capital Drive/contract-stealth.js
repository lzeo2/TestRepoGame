import {appearanceForPerson,PERSON_MODEL} from './person-model.js';
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const sameSpace=p=>(p?.interiorId??p?.space??null)===null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function inside(p,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}

// One guard and one fictional target routine. No clocks, rewards or campaign
// advancement live here; all movement goes through the supplied collision sweep.
export function createContractStealth({clipMovement,hasLineOfSight=()=>false,heightAt=()=>0}={}){
 let state=null,config=null,paused=false,disposed=false;const events=[];
 const ground=(x,z)=>{const y=heightAt(x,z);return Number.isFinite(y)?y:0;};
 const body=Object.freeze({
  get id(){return state?.guard.id??null;},get personId(){return state?.guard.id??null;},appearanceId:'contract:blackthorn-guard',appearance:appearanceForPerson('contract:blackthorn-guard'),
  get x(){return state?.guard.x??0;},get z(){return state?.guard.z??0;},get y(){return state?.guard.y??0;},get yaw(){return state?.guard.yaw??0;},
  get speed(){return state?.guard.speed??0;},get phase(){return state?.guard.phase??0;},get health(){return state?.guard.health??0;},get active(){return !!state&&!disposed;},get dead(){return state?.guard.health===0;},
  get reaction(){return state?.guard.health===0?'dead':state?.alerted?'panic':'calm';},get deathTime(){return state?.guard.deathTime??0;},
  get height(){return body.appearance.height;},get standingHeight(){return (PERSON_MODEL.hair.y+PERSON_MODEL.hair.sy)*body.appearance.height;},
  interiorId:null,space:null,mode:'foot',role:'contract-guard',modelId:'contract-guard',adult:true,fictional:true,radius:.36,
 });
 function load({missionId,targetId,config:settings,targetPose}={}){
  if(disposed||!point(settings?.guardPost)||!point(targetPose)||typeof missionId!=='string'||typeof targetId!=='string')return false;
  const patrol=(settings.patrol||[]).filter(p=>point(p)&&gap(p,targetPose)<=12).slice(0,8);
  config={...settings,patrol,restrictedPolygon:Array.isArray(settings.restrictedPolygon)?settings.restrictedPolygon:[]};
  state={missionId,targetId,target:{x:targetPose.x,z:targetPose.z,health:100},time:0,alerted:false,reason:null,suspicion:0,disguised:false,diversion:0,diversionUsed:false,patrolIndex:0,wait:0,bodySeen:0,
   guard:{id:`contract-guard:${targetId}`,x:settings.guardPost.x,z:settings.guardPost.z,y:ground(settings.guardPost.x,settings.guardPost.z),yaw:settings.guardPost.yaw??0,health:100,speed:0,phase:0,cooldown:0,deathTime:0,mode:'watching'}};
  paused=false;events.length=0;return true;
 }
 function clear(){state=null;config=null;events.length=0;paused=false;}
 function alert(reason){if(!state||state.alerted)return false;state.alerted=true;state.reason=reason;state.suspicion=1;events.push(Object.freeze({type:'alerted',missionId:state.missionId,targetId:state.targetId,reason}));return true;}
 function sees(p,range=12){
  if(!state||state.guard.health<=0||!point(p)||!sameSpace(p)||gap(state.guard,p)>range)return false;
  const dx=p.x-state.guard.x,dz=p.z-state.guard.z,length=Math.hypot(dx,dz),forward=dx*-Math.sin(state.guard.yaw)+dz*-Math.cos(state.guard.yaw);
  return (length<1.25||forward>=length*.5)&&hasLineOfSight(body,p)===true;
 }
 function canAct(ctx){return state&&!paused&&!ctx.paused&&ctx.onFoot===true&&!ctx.recovering&&Number.isFinite(ctx.health)&&ctx.health>0&&point(ctx.player)&&sameSpace(ctx.player);}
 function nearLandmark(site,ctx){return point(site)&&gap(site,ctx.player)<=(site.radius??1.5)&&hasLineOfSight(ctx.player,site)===true;}
 function availableAction(ctx={}){
  if(!canAct(ctx))return null;
  if(!state.disguised&&!state.alerted&&!ctx.armed&&!ctx.aiming&&nearLandmark(config.uniform,ctx))return Object.freeze({id:config.uniform.id,label:'Put on worker coveralls'});
  if(!state.diversionUsed&&nearLandmark(config.distraction,ctx))return Object.freeze({id:config.distraction.id,label:'Start the generator diversion'});
  return null;
 }
 function interact(id,ctx={}){
  const action=availableAction(ctx);if(!action||action.id!==id)return {ok:false,message:'Move beside the marked equipment on foot.'};
  if(config.uniform?.id===id){if(ctx.armed||ctx.aiming)return {ok:false,message:'Put your weapon away before changing.'};state.disguised=true;return {ok:true,message:'Worker coveralls on. Walk normally and keep your weapon hidden.',kind:'uniform'};}
  state.diversionUsed=true;state.diversion=18;return {ok:true,message:'The guard is checking the generator.',kind:'diversion'};
 }
 function moveGuard(goal,dt){
  const g=state.guard,dx=goal.x-g.x,dz=goal.z-g.z,length=Math.hypot(dx,dz);g.speed=0;
  if(length<.15){if(Number.isFinite(goal.yaw))g.yaw=goal.yaw;return;}
  const amount=Math.min(length,1.15*dt),step=clipMovement?.(body,dx/length*amount,dz/length*amount,.36);
  if(!step||![step.dx,step.dz].every(Number.isFinite)||Math.hypot(step.dx,step.dz)>amount+1e-6)return;
  g.x+=step.dx;g.z+=step.dz;g.y=ground(g.x,g.z);g.yaw=Math.atan2(-dx,-dz);g.speed=Math.hypot(step.dx,step.dz)/dt;g.phase+=g.speed*dt*3;
 }
 function step(dt,ctx={}){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Contract stealth dt must be finite and nonnegative.');
  if(!state||disposed)return;
  if(Object.hasOwn(ctx,'activeMissionId')&&ctx.activeMissionId!==state.missionId){clear();return;}
  paused=ctx.paused===true;if(paused||!dt)return;
  const delta=Math.min(dt,.1);if(point(ctx.target))state.target={x:ctx.target.x,z:ctx.target.z,health:ctx.target.health};state.time+=delta;state.diversion=Math.max(0,state.diversion-delta);state.guard.cooldown=Math.max(0,state.guard.cooldown-delta);
  const guard=state.guard;
  if(guard.health<=0){guard.speed=0;guard.deathTime=Math.min(30,guard.deathTime+delta);return;}
  guard.mode=state.alerted?'alerted':state.diversion>0?'investigating':'watching';
  const investigate=point(config.investigate)?config.investigate:config.guardPost;
  moveGuard(state.diversion>0?investigate:config.guardPost,delta);
  const player=ctx.player,visible=sees(player),restricted=point(player)&&inside(player,config.restrictedPolygon);
  const suspicious=!!(ctx.armed||ctx.aiming||ctx.sprinting||Math.abs(player?.speed||0)>4.5||ctx.crouching);
  const notice=visible&&(restricted||suspicious);
  if(notice&&!ctx.recovering){
   const rate=(ctx.armed||ctx.aiming)?1.2:state.disguised&&!suspicious ? .025 : ctx.crouching&&!state.disguised ? .6 : .35;
   state.suspicion=clamp(state.suspicion+delta*rate,0,1);
   if(state.suspicion>=1)alert(ctx.armed||ctx.aiming?'weapon seen':state.disguised?'suspicious worker':'intruder seen');
  }else if(!state.alerted)state.suspicion=Math.max(0,state.suspicion-delta*.2);
  if(ctx.target?.health===0&&sees(ctx.target,7)){state.bodySeen+=delta;if(state.bodySeen>=.8)alert('body found');}else state.bodySeen=0;
  if(!point(ctx.target)||!config.patrol.length)return;
  const goal=config.patrol[state.patrolIndex];
  if(gap(ctx.target,goal)<.12){state.wait+=delta;if(state.wait>=clamp(Number.isFinite(goal.wait)?goal.wait:3,3,6)){state.wait=0;state.patrolIndex=(state.patrolIndex+1)%config.patrol.length;}}else state.wait=0;
 }
 function targetGoal(){
  if(!state||!config.patrol.length)return null;
  if(state.diversion>0)return config.patrol.at(-1);
  if(state.alerted)return config.patrol[Math.floor(config.patrol.length/2)];
  return config.patrol[state.patrolIndex];
 }
 function heardShot(pose){
  if(!state||disposed||paused||state.guard.health<=0||!point(pose)||!sameSpace(pose))return false;
  const nearGuard=gap(pose,state.guard)<=22,nearTarget=state.target.health>0&&gap(pose,state.target)<=22;
  return (nearGuard||nearTarget)&&alert('gunshot');
 }
 function noteAttack(kind){if(state&&kind!=='takedown')alert(kind==='shot'?'gunshot':'fight');}
 function damageGuard(amount,from,kind='shot'){
  if(!state||paused||state.guard.health<=0||state.guard.cooldown>0||!Number.isFinite(amount)||amount<=0)return {hits:0,people:[]};
  state.guard.health=Math.max(0,state.guard.health-Math.min(100,amount));state.guard.cooldown=.25;noteAttack(kind);
  return {hits:1,people:[Object.freeze({id:state.guard.id,x:state.guard.x,z:state.guard.z,health:state.guard.health,reaction:state.guard.health===0?'dead':'injured'})]};
 }
 return {load,clear,step,availableAction,interact,targetGoal,noteAttack,heardShot,damageGuard,sees,
  get guardBody(){return state?body:null;},get alerted(){return state?.alerted??false;},
  snapshot:()=>state?Object.freeze({alerted:state.alerted,reason:state.reason,suspicion:state.suspicion,disguised:state.disguised,diversion:state.diversion,diversionUsed:state.diversionUsed,
   guard:Object.freeze({...state.guard,appearanceId:body.appearanceId,adult:true,fictional:true,role:body.role}),patrolIndex:state.patrolIndex}):null,
  drainEvents:()=>events.splice(0),dispose(){if(disposed)return;clear();disposed=true;}};
}
