import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load = async path => import(await moduleURL(new URL(path, import.meta.url)));
const { createShotRays, rayTargetDistance, resolveShotRay, MAX_AIM_PITCH } = await load('../Games/Capital Drive/ballistics.js');
const { createShotObstacles } = await load('../Games/Capital Drive/shot-obstacles.js');
const { createGameplay } = await load('../Games/Capital Drive/gameplay.js');
const { createSimulation } = await load('../Games/Capital Drive/simulation.js');
const makeRay = (pitch=0,extra={}) => createShotRays({x:0,y:1.35,z:0,yaw:0,pitch,range:95,...extra})[0];
const person={id:'near',x:0,z:-10,feetY:0,height:1.8,radius:.36,health:100,interiorId:null};
assert(Number.isFinite(rayTargetDistance(makeRay(),person)));
for(const bad of [null,undefined,{}, {...makeRay(),dx:0,dy:0,dz:0},{...makeRay(),range:-1}])assert.equal(rayTargetDistance(bad,person),Infinity);
for(const pitch of [-.5,.5,MAX_AIM_PITCH,-MAX_AIM_PITCH])assert.equal(rayTargetDistance(makeRay(pitch),person),Infinity,'pavement adults cannot be hit above/below body');
const elevated={...person,feetY:6};
assert(Number.isFinite(rayTargetDistance(makeRay(Math.atan2(6,10)),elevated)));
assert.equal(rayTargetDistance(makeRay(),elevated),Infinity);
assert.equal(rayTargetDistance(makeRay(),{...person,interiorId:'other'}),Infinity);
assert.equal(resolveShotRay(makeRay(),{targets:[{...person,id:'far',z:-15},person]}).target.id,'near');
assert.equal(resolveShotRay(makeRay(),{targets:[person],blockDistance:5}).target,null);
const fan=aiming=>createShotRays({x:0,y:1.35,z:0,yaw:0,pitch:.3,range:50,pellets:6,spread:.16,aiming,serial:4});
assert.deepEqual(fan(false),fan(false));assert(fan(true).every(ray=>Math.abs(ray.yaw)<=.16*.42+1e-9));
assert(fan(true).every(ray=>Math.abs(Math.hypot(ray.dx,ray.dy,ray.dz)-1)<1e-9));
const wall={points:[[-3,-6],[3,-6],[3,-5],[-3,-5]],height:3};
const terrain=createShotObstacles({buildings:[wall]});
assert(terrain.trace(makeRay())<5);
assert(terrain.trace(makeRay(Math.atan2(5,5)))>5,'ray clears finite roof');
assert(terrain.trace(makeRay(-.6))<3,'ground prevents underground fire');
const courtyard={points:[[-5,-20],[5,-20],[5,-3],[-5,-3]],height:8,innerRings:[{points:[[-3,-18],[3,-18],[3,-4],[-3,-4]]}]};
const hole=createShotObstacles({buildings:[courtyard]});
assert(hole.trace(makeRay(0,{z:-8,range:5}))>4.9,'courtyard remains clear');
const room={id:'room',origin:{x:0,z:0,yaw:0},width:12,depth:20,floorY:0,walls:[],furniture:[{x:0,z:10,width:4,depth:1,height:.6,y:0,yaw:0}]};
const indoor=createShotObstacles({});
const roomRay=(pitch=0)=>makeRay(pitch,{z:2,yaw:Math.PI,interiorId:'room'});
assert(indoor.trace(roomRay(),room)>17,'horizontal shot clears low table');
assert(indoor.trace(roomRay(.5),room)<3,'ceiling blocks upward fire');
assert(indoor.trace(roomRay(-.5),room)<3,'floor blocks downward fire');
room.walls.push({x:0,z:7,width:4,depth:.2,height:2.65,y:0,yaw:.3});
assert(indoor.trace(roomRay(),room)<6,'rotated wall blocks body-height shot');
const map={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[{id:'r',points:[[-90,0],[90,0]],width:12,speed:40}],buildings:[],spawn:{x:0,z:0,yaw:0},landmarks:[]};
{
  const lowWall = {points:[[-3,-3],[3,-3],[3,-2.8],[-3,-2.8]],height:1.1};
  const coverMap = {...map,barriers:[lowWall]}, obstacle = createShotObstacles(coverMap);
  const arrivals = [], target = {...person,z:-6,damage:()=>{arrivals.push(1);return true;}};
  const sim = createSimulation(coverMap,{trafficCount:0}), rays = [];
  Object.assign(sim.player,{x:50,z:50});
  const game = createGameplay(coverMap,sim,{sandbox:true,heightAt:()=>0,getShotTargets:()=>[target],
    traceShot:ray=>{rays.push(ray);return obstacle.trace(ray);}});
  const preparing = () => {
    game.reset({sandbox:true,onFoot:true,startPose:{x:5,z:0,yaw:0}});
    Object.assign(game.state.actor,{x:0,z:0});game.setWeapon('pistol');
  };
  preparing();game.step(.05,{crouch:true,sprint:true,jump:true,moveZ:-1});
  assert(game.state.actor.crouching);assert.equal(game.state.actor.jumpHeight,0);
  assert(Math.abs(game.state.actor.speed-1.65)<1e-9,'crouching prevents sprinting and jumping');
  game.step(.05,{});assert.equal(game.state.actor.crouching,false,'release returns to standing');
  preparing();game.step(.01,{aim:true,aimYaw:0,fire:true});
  assert.equal(rays[0].y,1.35);assert.equal(arrivals.length,1,'standing fire clears the low wall');
  preparing();game.step(.01,{crouch:true,aim:true,aimYaw:0,fire:true});
  assert.equal(rays.at(-1).y,.9);assert.equal(arrivals.length,1,'crouched fire is blocked by the same physical wall');
}
function fixture({targets=[],modifier=1,blocked=false,playerFeetY,heightAt=()=>0}={}) {
  const sim=createSimulation(map,{trafficCount:0}),events=[];
  const obstacle=createShotObstacles(map);
  const game=createGameplay(map,sim,{sandbox:true,heightAt,playerFeetY,getShotTargets:()=>targets,traceShot:r=>blocked?3:obstacle.trace(r),powerModifiers:()=>({gunAttack:modifier}),onEvent:e=>events.push(e)});
  game.reset({sandbox:true,onFoot:true,startPose:{x:5,z:0,yaw:0}});Object.assign(game.state.actor,{x:0,z:0});game.setWeapon('shotgun');
  return {game,events};
}
let hits=0;
const victim={...person,z:-5,damage:()=>{hits++;return true;}};
let {game}=fixture({targets:[victim]});
game.step(.01,{fire:true});assert.equal(hits,1,'six pellets damage the same victim once');
assert.equal(game.state.combatFeedback.hitSerial,1);assert.equal(game.state.combatFeedback.shotSerial,1);
assert(game.state.shots.every(s=>Number.isFinite(s.y)&&Number.isFinite(s.endY)));
const paused=game.snapshot();game.step(0,{fire:true,aimPitch:1});assert.deepEqual(game.snapshot(),paused);
{
  const {game:flight}=fixture({playerFeetY:()=>3,heightAt:()=>12});
  flight.setWeapon('pistol');
  flight.state.actor.jumpHeight=3;
  const ammo=flight.state.ammo;
  flight.step(.01,{externalFlight:true,aim:true,aimYaw:0,aimPitch:.1,fire:true});
  assert.equal(flight.state.ammo,ammo-1);
  assert.equal(flight.state.shots[0].y,4.35,'aerial shot leaves the actual muzzle below an overhead road surface');
  assert.equal(flight.state.actor.jumpHeight,3,'combat does not take vertical authority from flight');
}
hits=0;({game}=fixture({targets:[victim]}));game.step(.01,{fire:true,aimPitch:1});assert.equal(hits,0);assert.equal(game.state.aimPitch,1);
hits=0;({game}=fixture({targets:[victim],blocked:true}));game.step(.01,{fire:true});assert.equal(hits,0);
let farHits=0;({game}=fixture({targets:[{...victim,id:'far',z:-10,damage:()=>{farHits++;return true;}},victim]}));
game.setWeapon('pistol');game.step(.01,{fire:true});assert.equal(farHits,0,'nearby bodies stop the ray');
// The scope extends the same geometry-aware hitscan.
const distantTarget={...victim,z:-130,damage:()=>{farHits++;return true;}};
farHits=0;
({game}=fixture({targets:[distantTarget]}));
game.setWeapon('sniper');game.step(.01,{fire:true});
assert.equal(farHits,0,'the unaimed sniper cannot hit distant targets');
({game}=fixture({targets:[distantTarget]}));
game.setWeapon('sniper');game.step(.01,{fire:true,aim:true,aimYaw:0});
assert.equal(farHits,1,'the scope supports a distant one-shot hit');
({game}=fixture({targets:[distantTarget],blocked:true}));
game.setWeapon('sniper');game.step(.01,{fire:true,aim:true,aimYaw:0});
assert.equal(farHits,1,'the scope still respects indexed obstruction');
// Automatic cadence carries supplied-time overshoot; short Focus intervals stay frame-rate consistent.
function sustain(dt) {
  const {game}=fixture({modifier:.5});game.setWeapon('smg');
  game.step(.001,{fire:true});
  for(let time=0;time<.9-1e-9;time+=dt)game.step(Math.min(dt,.9-time),{fire:true});
  return game.state.combatFeedback.shotSerial;
}
assert.equal(sustain(.01),sustain(.05));assert.equal(sustain(.01),21);
console.log('Capital ballistics PASS: vertical capsules, nearest victim, aimed spread, indexed walls/roofs/courtyards, terrain/floor/ceiling, per-shot damage, zero-dt, finite traces and supplied-time automatic cadence');
