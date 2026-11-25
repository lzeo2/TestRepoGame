import assert from 'node:assert/strict';
import {createMissionFootpath,createFootTraversal} from '../Games/Capital Drive/mission-footpath.js';
const target=Object.freeze({entryId:'door',indoors:false,point:Object.freeze({x:0,z:20}),instruction:'Enter the door',distance:20});
const pose={x:0,z:0},context={pose,onFoot:true,stage:'opening'};
const calls=[];
const aid=createMissionFootpath({canTraverse:(a,b,r)=>{assert(Object.isFrozen(a)&&Object.isFrozen(b));assert.equal(r,.45);calls.push([a,b]);return !(a.x===0&&b.x===0&&Math.min(a.z,b.z)<10&&Math.max(a.z,b.z)>10);}});
const dto=aid.guide(target,context);assert(dto.footpath);assert.notDeepEqual(dto.point,target.point);assert.deepEqual(dto.doorPoint,target.point);
assert.equal(dto.entryId,target.entryId);assert(Object.isFrozen(dto)&&Object.isFrozen(dto.point));
assert(calls.length<=29,'bounded direct plus 14 two-leg candidates');
const before=aid.stats;assert.deepEqual(aid.guide(target,context),dto);assert.deepEqual(aid.stats,before,'stationary redraw does not repeat probes');
assert.equal(aid.guide(target,{...context,pose:dto.point}),target,'reaching verified corner converges to real door');
aid.guide(target,context);const planned=aid.stats.plans;aid.guide(target,{...context,blocked:true});assert.equal(aid.stats.plans,planned+1);
aid.guide(target,{...context,obstructionRevision:1});assert.equal(aid.stats.plans,planned+2);
aid.guide(target,{...context,stage:'next'});assert.equal(aid.stats.plans,planned+3);
const closed=createMissionFootpath({canTraverse:()=>false});assert.equal(closed.guide(target,context),target,'no clear path preserves original door marker');assert(closed.stats.probes<=29);
const direct=createMissionFootpath({canTraverse:()=>true});assert.equal(direct.guide(target,context),target);assert.equal(direct.stats.probes,1);
for(const extra of [{onFoot:false},{indoors:true},{pose:{x:0,z:-40}},{pose:{x:NaN,z:0}}])assert.equal(aid.guide(target,{...context,...extra}),target);
assert.equal(aid.guide({...target,entryId:null},context).point,target.point);
assert.equal(createMissionFootpath().guide(target,context),target);
let moves=0;
const traversal=createFootTraversal((actor,dx,dz)=>{
  assert(Math.hypot(dx,dz)<=4.000001);assert.equal(actor.id,'foot');moves++;
  actor.x+=dx;actor.z+=dz;return {blocked:false};
});
const body={id:'foot',x:0,z:0,y:7};assert(traversal(body,{x:0,z:25}));assert.equal(moves,7);assert.deepEqual(body,{id:'foot',x:0,z:0,y:7});
assert(!createFootTraversal(actor=>({blocked:false}))({x:0,z:0},{x:0,z:5}),'partial/no movement cannot pass');
assert(!createFootTraversal(actor=>({blocked:true}))({x:0,z:0},{x:0,z:5}));
console.log('PASS bounded local mission footpath: swept two-leg verification, cache, waypoint convergence, obstruction/stage refresh, and unmodified door fallback.');

if(process.argv.includes('--actual')){
  const {loadCapitalMap}=await import('./capital-map-fixture.mjs');
  const {createTerrainSampler}=await import('../Games/Capital Drive/terrain.js');
  const {addCapitalWorldObstacles}=await import('./capital-world-obstacles-fixture.mjs');
  const {createInteriors}=await import('../Games/Capital Drive/interiors.js');
  const map=await loadCapitalMap(),terrain=createTerrainSampler(map),{simulation}=addCapitalWorldObstacles(map,terrain);
  Object.assign(simulation.player,{x:449.103819646784,z:-156.513841470215,yaw:-.62223062294,active:true});
  const start={x:446.3410464140123,z:-158.49552864640572};
  const entry=createInteriors(map,{heightAt:terrain.heightAt}).entries.find(e=>e.id==='house-act-101738-0');assert(entry);
  const door={...target,entryId:entry.id,point:{x:entry.x-Math.sin(entry.yaw)*1.8,z:entry.z-Math.cos(entry.yaw)*1.8}};
  const canTraverse=createFootTraversal((actor,dx,dz,radius)=>simulation.moveActor(actor,dx,dz,radius));
  assert(!canTraverse(start,door.point,.45),'actual opening direct sweep is blocked');
  const actual=createMissionFootpath({canTraverse}),route=actual.guide(door,{pose:start,onFoot:true,stage:'opening'});
  assert(route.footpath,'actual opening has a verified bounded one-corner approach');
  assert(canTraverse(start,route.point,.45)&&canTraverse(route.point,door.point,.45));
  assert.equal(actual.guide(door,{pose:route.point,onFoot:true,stage:'opening'}),door,'next step points to the actual door');
  const walker={...start};actual.reset();let steps=0;
  while(Math.hypot(walker.x-door.point.x,walker.z-door.point.z)>.05&&steps<80){
    const guidance=actual.guide(door,{pose:walker,onFoot:true,stage:'opening'}),dx=guidance.point.x-walker.x,dz=guidance.point.z-walker.z,length=Math.hypot(dx,dz),scale=Math.min(1,2/length);
    assert(!simulation.moveActor(walker,dx*scale,dz*scale,.45).blocked,'ordinary bounded movement follows verified guidance');steps++;
  }
  assert(steps<80,'cached movement guidance converges to exact real door approach');
  console.log('PASS actual Milo door approach '+JSON.stringify({start,waypoint:route.point,door:door.point,steps,stats:actual.stats,limits:'explicit opening pose and domain collision sweeps; no native travel claim'}));
}
