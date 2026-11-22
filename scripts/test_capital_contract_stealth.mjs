import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContractTarget} from '../Games/Capital Drive/contract-target.js';
import {createContractStealth} from '../Games/Capital Drive/contract-stealth.js';
const config={guardPost:{x:3,z:3,yaw:0},investigate:{x:-3,z:3,yaw:Math.PI/2},patrol:[{x:0,z:6,yaw:0,wait:2},{x:1,z:6,yaw:0,wait:2}],
 uniform:{id:'uniform',x:-6,z:0,radius:1.4},distraction:{id:'diversion',x:-6,z:4,radius:1.4},restrictedPolygon:[[-5,0],[5,0],[5,8],[-5,8]]};
const missionId='blackthorn-account',targetId='blackthorn-voss',spec={missionId,targetId,pose:{x:0,z:6,yaw:0},stealth:config};
let visible=true,blocked=false,probes=0;
const adapters={heightAt:()=>2,hasLineOfSight:()=>visible,clipMovement:(body,dx,dz)=>{probes++;assert(Object.isFrozen(body));return {dx:blocked?0:dx,dz:blocked?0:dz};}};
const context=(x,z,extra={})=>({activeMissionId:missionId,onFoot:true,health:100,crouching:false,sprinting:false,armed:false,aiming:false,player:{x,z,yaw:0,speed:0,interiorId:null},...extra});
const runtime=readFileSync(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const contextSource=runtime.slice(runtime.indexOf('function contractContext(){'),runtime.indexOf('function availableContractAction(){'));
const playerState={mode:'foot',health:100,weapon:'unarmed',actor:{}};
const liveContext=Function('env',`with(env){${contextSource}return contractContext;}`)({
 gameplay:{state:playerState},campaign:{state:{active:{id:missionId}}},keys:new Set(['KeyZ']),mouseAim:false,
 actionTouch:new Set(),touch:new Set(),interiors:{active:null},jetpack:null,paused:()=>false,focus:()=>context(3,1).player,
});
assert.equal(liveContext().aiming,false,'camera movement with no weapon does not look armed to the guard');
playerState.weapon='pistol';
assert.equal(liveContext().aiming,true,'aiming with a drawn weapon remains suspicious');
const tick=(actor,seconds,ctx)=>{for(let i=0;i<Math.round(seconds*10);i++)actor.step(.1,ctx);};
const target=createContractTarget(adapters);assert(target.load(spec));
assert(Object.isFrozen(target.guardBody));assert.equal(target.guardBody.role,'contract-guard');assert.equal(target.guardBody.health,100);
assert.equal(target.shotTargets().length,2,'guard and target have real stable shot capsules');
const guard=target.guardBody,originalGuard=target.snapshot().stealth.guard;
tick(target,1,context(3,1));assert(target.snapshot().stealth.suspicion>0);assert(!target.snapshot().stealth.alerted);
const suspicion=target.snapshot().stealth.suspicion;visible=false;tick(target,1,context(3,1));assert(target.snapshot().stealth.suspicion<suspicion,'occlusion drains suspicion');visible=true;
const frozen=target.snapshot();target.step(10,{...context(3,1),paused:true});assert.deepEqual(target.snapshot(),frozen,'pause owns no hidden clocks');target.step(0,context(3,1));
tick(target,5,context(3,1));assert(target.snapshot().stealth.alerted);const alert=target.drainEvents();assert.equal(alert.filter(e=>e.type==='alerted').length,1);assert.equal(alert[0].reason,'intruder seen');
tick(target,5,context(3,1));assert.equal(target.drainEvents().length,0,'one detection event per attempt');assert.equal(target.body.health,100,'awareness never completes the mission');
// Worker disguise changes observer behavior; an exposed weapon invalidates it.
target.clear();target.load(spec);assert.equal(target.availableAction(context(-6,0)).id,'uniform');
assert(!target.interact('uniform',context(-20,0)).ok);assert(!target.interact('uniform',context(-6,0,{paused:true})).ok);
assert(target.interact('uniform',context(-6,0)).ok);assert(target.snapshot().stealth.disguised);
tick(target,5,context(3,1));assert(target.snapshot().stealth.suspicion<.2,'ordinary disguised worker is tolerated');
tick(target,1,context(3,1,{armed:true}));assert(target.snapshot().stealth.alerted);assert.equal(target.drainEvents()[0].reason,'weapon seen');
// The diversion actually moves a clipped guard and changes the target routine.
target.clear();target.load(spec);assert(target.interact('diversion',context(-6,4)).ok);
assert(!target.interact('diversion',context(-6,4)).ok,'one physical generator use per attempt');
blocked=true;tick(target,1,context(-20,0));assert.equal(guard.x,originalGuard.x,'blocked guard is never teleported');blocked=false;
tick(target,3,context(-20,0));assert(target.guardBody.x<originalGuard.x-2);assert.equal(target.snapshot().stealth.guard.mode,'investigating');
assert.equal(target.guardBody,guard,'guard descriptor stable across movement/reloads');assert(target.body.x>.2,'target moves to the configured diverted routine point');
assert.equal(target.body.health,100);assert(target.drainEvents().every(e=>e.type!=='defeated'));
// Silent takedown requires the actual target back, player facing/reach, still crouch and no guard witness.
target.clear();target.load(spec);const behind=context(0,7,{crouching:true});
assert.equal(target.availableAction(behind).id,'takedown');
for(const denied of [context(0,5,{crouching:true}),context(0,7),context(0,9,{crouching:true}),{...behind,player:{...behind.player,yaw:Math.PI}},
 {...behind,player:{...behind.player,speed:1}},{...behind,player:{...behind.player,interiorId:'room'}},{...behind,health:0},{...behind,paused:true}])assert(!target.interact('takedown',denied).ok);
visible=false;assert(!target.interact('takedown',behind).ok);visible=true;
assert(target.interact('takedown',behind).ok);assert.equal(target.body.health,0);assert(!target.interact('takedown',behind).ok);
const killed=target.drainEvents();assert.equal(killed.length,1);assert.equal(killed[0].type,'defeated');assert.equal(killed[0].outcome,'killed');assert.equal(killed[0].stealthOutcome,'clean');assert.equal(killed[0].serial,1);
assert.equal(target.shotTargets().length,1,'corpse removed from shot targets while live guard remains');
// Corpse discovery can alert after terminal HP, until the owner clears the attempt.
const watched=createContractTarget(adapters);watched.load({...spec,stealth:{...config,guardPost:{x:0,z:3,yaw:Math.PI}}});
assert(!watched.interact('takedown',behind).ok,'guard watching the actual player denies silent takedown');watched.dispose();
const corpseConfig={...config,investigate:{x:0,z:8},distraction:{id:'diversion',x:0,z:7,radius:1.4}};
const corpse=createContractTarget(adapters);corpse.load({...spec,stealth:corpseConfig});
assert(corpse.interact('diversion',context(0,7)).ok);assert(corpse.interact('takedown',behind).ok);
assert.equal(corpse.drainEvents()[0].stealthOutcome,'clean');
tick(corpse,1,context(-20,0));assert.equal(corpse.drainEvents()[0].reason,'body found','actual corpse can be discovered after defeat receipt');
const pure=createContractStealth(adapters);pure.load({missionId,targetId,config,targetPose:spec.pose});
const beforeBehind=pure.snapshot().suspicion;tick(pure,2,context(3,6));assert.equal(pure.snapshot().suspicion,beforeBehind,'guard cannot see through its back');
// A real missed shot is audible only in this small active exterior encounter.
const hearing=createContractTarget(adapters);hearing.load(spec);
assert(!hearing.heardShot({x:NaN,z:3,interiorId:null}));
assert(!hearing.heardShot({x:3,z:3,interiorId:'another-room'}));
assert(!hearing.heardShot({x:90,z:90,interiorId:null}),'distant gunfire cannot alert the compound');
hearing.step(0,{...context(-20,0),paused:true});assert(!hearing.heardShot({x:3,z:3,interiorId:null}));
hearing.step(0,context(-20,0));visible=false;
assert(hearing.heardShot({x:3,z:10,interiorId:null}),'nearby real gunfire is audible even when the ray misses behind cover');visible=true;
assert(!hearing.heardShot({x:3,z:10,interiorId:null}),'missed gunfire cannot duplicate the alert');
assert.equal(hearing.drainEvents().filter(e=>e.type==='alerted'&&e.reason==='gunshot').length,1);
assert.equal(hearing.body.health,100,'hearing never damages or defeats the target');
hearing.clear();assert(!hearing.heardShot({x:3,z:3,interiorId:null}),'inactive encounter ignores gunfire');hearing.dispose();
// A predictable waypoint stop gives a real E-action window, not a moving timer.
const routine=createContractTarget(adapters);routine.load(spec);
const stopped={x:routine.body.x,z:routine.body.z,yaw:routine.body.yaw};
for(let i=0;i<29;i++){
 routine.step(.1,context(-20,0));assert.equal(routine.body.x,stopped.x);assert.equal(routine.body.z,stopped.z);assert.equal(routine.body.speed,0);
 assert.equal(routine.availableAction(behind)?.id,'takedown','standing target remains reachable throughout the waypoint pause');
}
tick(routine,1,context(-20,0));assert(routine.body.speed>0||routine.body.x!==stopped.x,'routine resumes its actual patrol after the short stop');routine.dispose();
// Loud real damage alerts and only HP zero emits a defeat receipt.
target.clear();target.load(spec);const shot=target.shotTargets().find(s=>s.id===targetId);const shotRay=()=>({x:target.body.x,y:3,z:target.body.z+4,dx:0,dy:0,dz:-1,range:10,interiorId:null});
assert.equal(shot.damage(25,shotRay()).hits,1);assert.equal(target.body.health,75);assert.equal(target.drainEvents()[0].reason,'gunshot');
target.step(.1,context(-20,0));target.step(.1,context(-20,0));target.step(.1,context(-20,0));assert.equal(shot.damage(100,shotRay()).hits,1);
assert.equal(target.drainEvents().find(e=>e.type==='defeated').stealthOutcome,'alerted');
const guardShot=target.shotTargets()[0],g=target.guardBody;
const guardRay={x:g.x,y:g.y+1,z:g.z+4,dx:0,dy:0,dz:-1,range:10,interiorId:null};assert.equal(guardShot.damage(100,guardRay).hits,1);assert.equal(g.health,0);assert.equal(target.shotTargets().length,0);
assert(!target.drainEvents().some(e=>e.type==='defeated'),'guard defeat cannot complete Voss objective');
target.clear();target.load(spec);target.step(0,{activeMissionId:'other'});assert.equal(target.body,null);assert.equal(target.guardBody,null);
assert(probes<1000,'two actors use a fixed movement budget');pure.dispose();corpse.dispose();target.dispose();assert.equal(target.guardBody,null);
console.log('PASS Blackthorn stealth: facing/LOS suspicion, pause/reset, worker disguise and exposed weapons, physical diversion, bounded clipped actors, guarded behind-only HP takedown, once-only clean/alerted defeat, corpse discovery, bounded missed-shot hearing, predictable waypoint stops, real target/guard shot health and cancellation.');
