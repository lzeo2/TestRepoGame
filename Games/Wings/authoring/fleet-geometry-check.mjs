// Actual measured descriptors/GLB node frames; CPU geometry and authority, not native play.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileGeometry, mountPose, solveMount, fittedHit, yawQuaternion } from './fleet-geometry.mjs';
import { createFleet, replayFleet } from './fleet-sim.mjs';
assert(process.env.THREE_ROOT,'Use existing THREE_ROOT; install nothing');
const T=await import(pathToFileURL(resolve(process.env.THREE_ROOT,'build/three.module.js')).href);
assert.equal(T.REVISION,'186');
const json=async url=>JSON.parse(await readFile(url,'utf8'));
const escorts=(await json(new URL('./model-repairs.json',import.meta.url))).models;
const submarine=await json(new URL('./submarine-model.json',import.meta.url));
const descriptors=[...escorts,submarine],compiled=descriptors.map(compileGeometry);
const near=(a,b,e=1e-6)=>assert(a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<e),`${a} != ${b}`);
let groups=0;
const check=async(name,fn)=>{await fn();groups++;console.log('PASS '+name);};
function tree(doc) {
  const nodes=doc.nodes.map(n=>{
    const o=new T.Object3D();o.name=n.name??'';
    if(n.matrix)new T.Matrix4().fromArray(n.matrix).decompose(o.position,o.quaternion,o.scale);
    else {o.position.fromArray(n.translation??[0,0,0]);o.quaternion.fromArray(n.rotation??[0,0,0,1]);o.scale.fromArray(n.scale??[1,1,1]);}
    return o;
  });
  doc.nodes.forEach((n,i)=>(n.children??[]).forEach(j=>nodes[i].add(nodes[j])));
  const root=new T.Group();doc.scenes[doc.scene??0].nodes.forEach(i=>root.add(nodes[i]));return root;
}
await check('three actual GLB hashes and identity/rotated geometry-backed anchors match native Three node matrices',async()=>{
  for(let i=0;i<descriptors.length;i++) {
    const d=descriptors[i],g=compiled[i],bytes=await readFile(new URL('../'+d.file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),d.sha256);
    const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    for(const heading of [0,.7,-1.2]) {
      const object=tree(doc),body=new T.Group();body.position.set(32,-7,19);body.quaternion.fromArray(yawQuaternion(heading));body.add(object);
      const angles={};
      for(const c of g.controls)if(c.limits_rad){angles[c.node]=(c.limits_rad[0]+c.limits_rad[1])/2;
        object.getObjectByName(c.node).quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...c.axis_local),angles[c.node]));}
      body.updateMatrixWorld(true);
      for(const key of i<2?['main_gun']:g.launches.map(l=>l.node)) {
        const actual=mountPose(g,[32,-7,19],heading,key,angles),node=object.getObjectByName(key==='main_gun'?g.gun.muzzle_node:key);
        near(actual.position,node.getWorldPosition(new T.Vector3()).toArray());
        const basis=key==='main_gun'?object.getObjectByName(g.gun.pitch_node):node;
        const direction=key==='main_gun'?g.gun.bore_direction_pitch_local:g.launches.find(l=>l.node===key).direction_local;
        near(actual.direction,new T.Vector3(...direction).transformDirection(basis.matrixWorld).toArray());
      }
    }
  }
});
await check('signed measured gun solver supports reachable poses and rejects unreachable pitch/yaw',()=>{
  for(const g of compiled.slice(0,2))for(const heading of [0,.9]) {
    const angles={[g.gun.yaw_node]:.2,[g.gun.pitch_node]:-.2};
    const pose=mountPose(g,[0,0,0],heading,'main_gun',angles);
    const target=pose.position.map((n,i)=>n+pose.direction[i]*300);
    const solved=solveMount(g,[0,0,0],heading,'main_gun',target);assert(solved);
    near(solved.position,pose.position,1e-5);near(solved.direction,pose.direction,1e-7);
    near(Object.values(solved.angles),Object.values(angles),1e-6);
  }
  assert.equal(solveMount(compiled[0],[0,0,0],0,'main_gun',[0,-20,-300]),null);
  assert.equal(solveMount(compiled[0],[0,0,0],0,'main_gun',[300,10,0]),null);
});
await check('fitted rotated hull/island OBB hits differ from axis-aligned proxy, including translation sweep',()=>{
  const g=compiled[0];
  assert.equal(fittedHit(g,[60,0,200],[60,0,-200],[0,0,0],0),null);
  assert.notEqual(fittedHit(g,[60,0,200],[60,0,-200],[0,0,0],Math.PI/2),null);
  assert.notEqual(fittedHit(g,[0,42,-100],[0,42,100],[0,0,0],0),null);
  assert.equal(fittedHit(g,[20,42,-100],[20,42,100],[0,0,0],0),null);
  assert.notEqual(fittedHit(g,[70,0,-200],[70,0,200],[20,0,0],Math.PI/2,[0,0,0]),null);
});
const gun={id:'gun',medium:'surface',range:1000,speed:200,ttlMs:10000,cooldownMs:500,damage:10,depths:['surfaced'],ammo:100,mount:'main_gun'};
function config() {
  return {mode:'factions',arena:{minX:-1000,maxX:1000,minZ:-1000,maxZ:1000,bottomY:-150,cell:20,obstacles:[]},
    geometry:escorts.map((descriptor,i)=>({id:'escort'+i,descriptor})),
    units:escorts.map((_,i)=>({id:i?'b':'a',modelId:'escort'+i,team:i,kind:'surface',capital:true,position:[0,0,i?-180:180],
      heading:i?Math.PI:0,half:[12,5,12],hp:60,speed:0,route:[],weapons:[{...gun}],sensor:null,depth:'surfaced',depthPlan:[]})),
    aircraft:[[{id:'planeA',weapons:[]}],[{id:'planeB',weapons:[]}]],matchMs:600000,intermissionMs:15000};
}
await check('real reciprocal measured-origin shots use signed mount view pose and damage fitted superstructure',()=>{
  const c=config();c.units.forEach(u=>{u.capital=false;});
  for(const team of [0,1])c.units.push({id:'capital'+team,team,kind:'surface',capital:true,position:[team?700:-700,0,600],half:[10,5,30],hp:100,
    speed:0,route:[],weapons:[],sensor:null,depth:'surfaced',depthPlan:[]});
  const f=createFleet(c),seen=new Map();
  for(let i=0;i<240;i++) {f.advance(50);for(const e of f.snapshot(0).events)seen.set(e.id,e);}
  const events=[...seen.values()];
  for(const id of ['a','b']) {
    assert(events.some(e=>e.type==='fire'&&e.source===id));
    assert(events.some(e=>e.type==='damage'&&e.unit===id));
    assert.equal(events.filter(e=>e.type==='sunk'&&e.unit===id).length,1);
    const fire=events.find(e=>e.type==='fire'&&e.source===id);
    const source=c.units.find(u=>u.id===id);assert(Math.hypot(...fire.position.map((n,i)=>n-source.position[i]))>40,'No unit-center launch');
  }
  const first=createFleet(c);first.advance(500);const snap=first.snapshot(0);
  for(const u of snap.units.filter(u=>u.modelId)) {
    const g=compiled[u.team],fire=snap.events.find(e=>e.type==='fire'&&e.source===u.id);
    const pose=mountPose(g,u.position,c.units[u.team].heading,'main_gun',u.view.angles);
    near(fire.position,pose.position);
    const projectile=snap.projectiles.find(p=>p.source===u.id);
    near(projectile.velocity.map(n=>n/gun.speed),pose.direction);
    assert(Object.keys(u.view.angles).includes(g.gun.pitch_node));
  }
  assert.deepEqual(replayFleet(JSON.parse(JSON.stringify(f.exportReplay()))).snapshot(0),f.snapshot(0));
});
await check('actual-origin range, clearance/friendly rejection and unsupported capability fail closed',()=>{
  const c=config();c.units.forEach(u=>{u.weapons[0].range=100;});
  const f=createFleet(c);f.advance(1000);assert(!f.snapshot(0).events.some(e=>e.type==='fire'));
  const blocked=config();blocked.arena.obstacles=[{min:[-30,0,-20],max:[30,80,20]}];
  const b=createFleet(blocked);b.advance(1000);assert(!b.snapshot(0).events.some(e=>e.type==='fire'));
  const ff=config();ff.units.push({...structuredClone(ff.units[0]),id:'friendly',capital:false,position:[0,0,0],weapons:[]});
  const guarded=createFleet(ff);guarded.advance(1000);assert(!guarded.snapshot(0).events.some(e=>e.type==='fire'&&e.source==='a'));
  const phantom=config();phantom.units[0].weapons[0]={...gun,medium:'underwater',cooldownMs:6000,ammo:2};assert.throws(()=>createFleet(phantom),/actual compatible mount/);
});
await check('motion generates continuous orientation/propeller phase and actual sub depth/control-plane channels',()=>{
  const c=config();c.units.forEach(u=>{u.weapons=[];});
  c.units[0].speed=5;c.units[0].route=[[50,0,-300]];
  const f=createFleet(c);f.advance(500);const a=f.snapshot(0).units.find(u=>u.id==='a');
  assert(Math.abs(a.view.orientation[1])>0);assert(a.position[2]<180);
  const node=compiled[0].controls.find(c=>!c.limits_rad).node;
  assert(a.view.spinners[node].rateRadS>0);f.advance(500);
  const next=f.snapshot(0).units.find(u=>u.id==='a');assert(Math.abs((next.view.spinners[node].phaseRad-a.view.spinners[node].phaseRad+2*Math.PI)%(2*Math.PI)-4)<1e-8);
  const sub=config();sub.units.forEach(u=>{u.weapons=[{id:'asw',medium:'underwater',range:1,speed:200,ttlMs:20000,cooldownMs:6000,damage:1,depths:['shallow','deep'],ammo:2}];delete u.modelId;
    u.sensor={enabled:true,range:1,depths:['shallow','deep']};});
  sub.geometry.push({id:'subModel',descriptor:submarine});
  sub.units.push({id:'s',modelId:'subModel',team:0,kind:'sub',capital:false,position:[300,0,0],heading:0,half:[8,10,43],hp:40,speed:4,
    route:[[300,0,-400]],weapons:[],sensor:null,depth:'surfaced',depthPlan:[{atMs:100,depth:'deep'}]});
  const s=createFleet(sub);s.advance(1000);const view=s.snapshot(0).units.find(u=>u.id==='s').view;
  assert(view.angles.stern_dive_port<0);assert(view.spinners.propulsion_rotor.rateRadS>0);
  assert(!s.snapshot(1).units.some(u=>u.id==='s'));
});
await check('actual submarine outlet launches a finite straight underwater hit; no model-name ASW inference',()=>{
  const c=config(),g=compiled[2],pose=mountPose(g,[0,0,0],0,'underwater_launch_port');
  const asw={id:'asw',medium:'underwater',range:1,speed:200,ttlMs:20000,cooldownMs:6000,damage:1,depths:['shallow','deep'],ammo:2};
  const basic=(id,team,position)=>({id,team,position,kind:'surface',capital:true,half:[12,5,12],hp:60,speed:0,route:[],weapons:[{...asw}],
    sensor:{enabled:true,range:1,depths:['shallow','deep']},depth:'surfaced',depthPlan:[]});
  const target=pose.position.map((n,i)=>n+pose.direction[i]*200);target[1]=0;
  c.units=[basic('capitalA',0,[300,0,300]),basic('capitalB',1,target),{
    id:'sub',modelId:'subModel',team:0,position:[0,0,0],heading:0,kind:'sub',capital:false,half:[8,10,43],hp:40,speed:0,route:[],
    weapons:[{id:'outlet',mount:'underwater_launch_port',medium:'underwater',range:600,speed:100,ttlMs:10000,cooldownMs:6000,damage:10,depths:['surfaced'],ammo:2}],
    sensor:null,depth:'surfaced',depthPlan:[]}];
  c.geometry.push({id:'subModel',descriptor:submarine});
  const f=createFleet(c);f.advance(500);
  const shot=f.snapshot(0).events.find(e=>e.type==='fire'&&e.source==='sub');assert(shot);near(shot.position,pose.position);
  const projectile=f.snapshot(0).projectiles.find(p=>p.source==='sub');near(projectile.velocity.map(n=>n/100),pose.direction);
  f.advance(2500);assert.equal(f.snapshot(1).units.find(u=>u.id==='capitalB').hp,50);
});
function boundaryConfig(bottomY) {
  const asw={id:'asw',medium:'underwater',range:1,speed:10,ttlMs:1000,cooldownMs:6000,damage:1,depths:['shallow','deep'],ammo:2};
  const capital=(id,team,x)=>({id,team,kind:'surface',capital:true,position:[x,0,300],half:[5,2,5],hp:100,speed:0,route:[],
    weapons:[{...asw}],sensor:{enabled:true,range:1,depths:['shallow','deep']},depth:'surfaced',depthPlan:[]});
  return {mode:'factions',arena:{minX:-1000,maxX:1000,minZ:-1000,maxZ:1000,bottomY,cell:50,obstacles:[]},
    geometry:[{id:'realSub',descriptor:submarine}],units:[capital('a',0,-500),capital('b',1,500),{
      id:'s',team:0,kind:'sub',capital:false,position:[0,0,0],half:[8,10,43],modelId:'realSub',hp:100,speed:0,route:[],
      weapons:[],sensor:null,depth:'deep',depthPlan:[]}],aircraft:[[{id:'planeA',weapons:[]}],[{id:'planeB',weapons:[]}]],
    matchMs:100000,intermissionMs:1000};
}
await check('W16 full swept appendage bounds reject seabed/obstacle penetration and block invalid descent',()=>{
  const c=boundaryConfig(-25),deepY=-25*.65;
  assert(deepY+submarine.collision.hull.min[1]>-25);
  assert(deepY+submarine.continuous_swept_bounds_root.min[1]<-25);
  assert.throws(()=>createFleet(c),/Hull outside validated water/);
  const safe=createFleet(boundaryConfig(-30));
  const s=safe.snapshot(0).units.find(u=>u.id==='s');
  assert(s.position[1]+submarine.continuous_swept_bounds_root.min[1]>-30);
  const descending=boundaryConfig(-25);descending.units[2].depth='surfaced';descending.units[2].depthPlan=[{atMs:0,depth:'deep'}];
  const f=createFleet(descending);f.advance(4500);const stopped=f.snapshot(0).units.find(u=>u.id==='s');
  assert(stopped.position[1]+submarine.continuous_swept_bounds_root.min[1]>-25);
  assert(f.snapshot(0).events.some(e=>e.type==='depth-blocked'&&e.unit==='s'));
  const obstacle=boundaryConfig(-100);obstacle.units[2].depth='surfaced';
  obstacle.arena.obstacles=[{min:[-8,-10.5,-45],max:[8,-9,45]}];
  assert.throws(()=>createFleet(obstacle),/Hull outside validated water/);
});
await check('W16 resurfacing root -8.125 retains hidden pose until measured top reaches water',()=>{
  const c=boundaryConfig(-100);c.units[2].depthPlan=[{atMs:0,depth:'surfaced'}];
  const f=createFleet(c);f.advance(3500);const own=f.snapshot(0).units.find(u=>u.id==='s');
  assert.equal(own.position[1],-8.125);
  assert(own.position[1]+submarine.static_bounds_root.max[1]<0);
  assert.notEqual(own.depth,'surfaced');
  assert(!f.snapshot(1).units.some(u=>u.id==='s'));
  assert(!f.snapshot(1).events.some(e=>e.source==='s'||e.unit==='s'));
  f.advance(100);const exposed=f.snapshot(1).units.find(u=>u.id==='s');
  assert(exposed && exposed.position[1]+submarine.static_bounds_root.max[1]>=0);
  assert.equal(exposed.depth,'surfaced');
  assert.deepEqual(replayFleet(JSON.parse(JSON.stringify(f.exportReplay()))).snapshot(1),f.snapshot(1));
});
console.log(`PASS ${groups} measured-geometry groups; GLB frames/CPU authority only, no upstream RoomEngine/native acceptance`);
