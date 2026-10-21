// Deterministic module fixtures, not native-browser evidence. No production setters.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorldData, LANES, WALK_SPEED, ZIP_SPEED, terrainHeight, rampHeight } from './world-data.mjs';
import { BODY, createTraveler, capsuleIntersects, moveCapsule, surfaceHeight, interact, stepTraveler, travelerSnapshot } from './traversal.mjs';
const world=createWorldData();
let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const close=(a,b,tolerance=.03)=>check(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function at(position){return Object.assign(createTraveler(world),position);}
function run(s,seconds,input={}){for(let t=0;t<seconds-1e-8;t+=.025)stepTraveler(world,s,input,.025);return s;}
check(Object.isFrozen(world)&&Object.isFrozen(world.spawns[0].position),'deep-frozen data');
check(world.footprint.width===900&&world.footprint.depth===900,'900 m footprint');
check(world.spawns.length===42,'7 structures per team per lane');
for(const team of world.teams)for(const lane of LANES){
  const types=world.spawns.filter(s=>s.team===team&&s.lane===lane.id).map(s=>s.type);
  check(types.filter(t=>t==='base-guardian').length===2&&types.filter(t=>t==='shrine').length===2,'paired base structures');
  for(const type of ['guardian','walker','patron'])check(types.includes(type),type);
}
check(world.buildings.every(b=>b.height>=10&&b.height<=30),'building heights');
for(const building of world.buildings){
  const r=world.ramps.find(r=>r.id===`roof-access-${building.id.split('-')[1]}`);
  close(rampHeight(r,r.maxX,r.maxZ),building.height);
  close(surfaceHeight(world,building.x,building.z,building.height+.01),building.height);
  const climber=at({x:(r.minX+r.maxX)/2,y:0,z:r.minZ});
  run(climber,5.85,{forward:1,yaw:Math.PI});
  close(climber.y,building.height,.15);check(climber.grounded,`${building.id} roof landing`);
  run(climber,1,{side:1,yaw:Math.PI});
  close(climber.y,building.height,.15);check(climber.x<building.maxX,'step from landing onto roof');
}
const wall=world.buildings[0];
check(capsuleIntersects({x:wall.x,y:0,z:wall.z},wall),'capsule interior');
check(!capsuleIntersects({x:wall.x,y:wall.height,z:wall.z},wall),'capsule above roof');
const blocked=moveCapsule({x:wall.minX-2,y:0,z:wall.z},100,0,world);
check(blocked.x<=wall.minX-BODY.radius+.01,'swept move cannot tunnel');
const roofMove=moveCapsule({x:wall.x,y:wall.height,z:wall.z},2,0,world);
close(roofMove.x,wall.x+2);
for(const lane of LANES){
  const station=world.stations.find(s=>s.id===lane.id);
  const s=at(station.a);interact(world,s);check(s.mode==='zip','station boards');
  run(s,1);close(s.z,station.a.z+ZIP_SPEED,.01);
  run(s,34);check(s.mode==='free','full zip completes');close(s.z,station.b.z);close(s.y,0);
  run(s,1);interact(world,s);run(s,1);check(s.mode==='zip'&&s.ride.direction===-1,'return ride');
  stepTraveler(world,s,{jump:true},.025);check(s.mode==='free'&&s.vy>0&&!s.grounded,'jump interrupts zip');
  // End-to-end lane walking uses the same capsule and bridge ramps as gameplay.
  const walker=at({x:lane.x-10,y:0,z:-380});
  run(walker,95,{forward:1,yaw:Math.PI});check(walker.z>375,`${lane.id} lane walkable`);
}
close(ZIP_SPEED/WALK_SPEED,3);
for(const r of world.ramps.filter(r=>r.id.endsWith('-ramp')&&r.id.includes('carbon')||r.id.endsWith('-ramp')&&r.id.includes('ivory'))){
  const s=at({x:(r.minX+r.maxX)/2,y:0,z:r.start===0?r.minZ:r.maxZ});
  const yaw=r.start===0?Math.PI:0;
  run(s,3,{forward:1,yaw});close(s.y,3);check(s.grounded,'Guardian ramp elevation');
}
const roofRamp=world.ramps.find(r=>r.id==='roof-access-1');
const roofWalker=at({x:(roofRamp.minX+roofRamp.maxX)/2,y:0,z:roofRamp.minZ});
run(roofWalker,5.85,{forward:1,yaw:Math.PI});close(roofWalker.y,roofRamp.end,.15);
const p=at(world.portals[0]);interact(world,p);close(p.x,world.portals[1].x);close(p.z,world.portals[1].z);
interact(world,p);close(p.x,world.portals[1].x);check(p.cooldown>0,'teleport cooldown prevents bounce');
for(const vent of world.vents){const s=at(vent);interact(world,s);run(s,2.1);check(s.mode==='free','vent lands');close(s.x,vent.target.x);close(s.y,vent.target.y);close(s.z,vent.target.z);}
const rope=at({x:world.rope.x,y:0,z:world.rope.z});interact(world,rope);run(rope,4.5);close(rope.y,30);close(rope.x,world.rope.landing.x);
run(rope,2,{side:-1});close(rope.y,30);check(rope.x<-90,'tower roof routeable');
interact(world,rope);check(rope.collected.has('tower-soul')&&rope.event==='bell','tower crate rings original bell event');
const crate=world.crates.find(c=>c.kind==='breakable'),breaker=at({x:crate.x-3,y:0,z:crate.z});
interact(world,breaker);check(breaker.broken.has(crate.id),'camp crate breaks');
const onlyCrate={...world,boxes:world.boxes.filter(b=>b.id===crate.id)};
check(moveCapsule(breaker,6,0,onlyCrate,breaker.broken).x>crate.x,'broken crate collision removed');
const sewer=at({x:90,y:0,z:0});run(sewer,6.2,{side:-1});check(sewer.x<41&&sewer.y<-9.5,'sewer ramp descends continuously');
close(terrainHeight(65,0),-5);close(terrainHeight(170,85),-6);
const plaza=at({x:205,y:0,z:85});run(plaza,6,{side:-1});check(plaza.y<=-5.9&&plaza.stamina<99,'plaza ramp and stamina drain');
const under=at({x:0,y:-10,z:0});run(under,2,{jump:true});check(under.y+BODY.height<2,'bridge underside remains closed');
check(Object.isFrozen(travelerSnapshot(plaza)),'read-only observation');
if(process.argv.includes('--json'))console.log(JSON.stringify(world,null,2));
else {
  const exported=JSON.parse(readFileSync(new URL('../../docs/jank3d-spawns.json',import.meta.url),'utf8'));
  assert.deepEqual(exported,world);assertions++;
  console.log(`world-test: ${assertions} assertions passed (module fixtures; native evidence separate)`);
}
