// CPU geometry and real combat-authority checks, not native visual acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorldData, rampHeight } from './world-data.mjs';
import { matchWorld } from './match-world.mjs';
import { BODY, capsuleIntersects, surfaceHeight, createTraveler, interact, stepTraveler } from './traversal.mjs';
import { createSystems } from './systems.mjs';

const world=createWorldData(),routed=matchWorld(world),arena=world.arena;
const original=JSON.parse(readFileSync(new URL('../../docs/jank3d-spawns.json',import.meta.url)));
let groups=0,samples=0;
function test(name,run){run();console.log(`ok ${++groups} - ${name}`);}
const covers=arena.coverIds.map(id=>world.boxes.find(b=>b.id===id));
const expected=[['midway-baffle',0,3,0,8,2.2,8]];
for(const x of [-18,18])for(const z of [-21,21])expected.push([`midway-pod-${x}-${z}`,x,3,z,4,1.8,5]);
for(const x of [-25,25])for(const z of [-70,70])expected.push([`midway-entry-${x}-${z}`,x,0,z,10,2.2,3]);
for(const z of [-100,100])expected.push([`midway-reentry-${z}`,-18,0,z,14,2.4,3]);
function clear(p){
  for(const b of world.boxes)assert.ok(!capsuleIntersects(p,b),`capsule intersects ${b.id} at ${JSON.stringify(p)}`);
  // Traversal permits contact with a supporting slab, but not entry through its side/underside.
  for(const r of world.ramps)if(p.y<rampHeight(r,p.x,p.z)-.02)assert.ok(!capsuleIntersects(p,r),`capsule enters ramp ${r.id}`);
  samples++;
}
function segment(a,b,offset=0,newCoverOnly=false){
  const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);
  for(let i=0;i<=n;i++){
    const t=n?i/n:0,x=a.x+(b.x-a.x)*t+offset,z=a.z+(b.z-a.z)*t;
    const y=surfaceHeight(world,x,z,4),expectedY=a.y+(b.y-a.y)*t;
    if(newCoverOnly){
      // Check actual interpolated squad feet against additions; old approach-platform overlap is outside this slice.
      for(const cover of covers)assert.ok(!capsuleIntersects({x,y:expectedY,z},cover),`formation intersects ${cover.id}`);
      samples++;
    }else{
      assert.ok(Math.abs(y-expectedY)<1e-8,`route leaves measured surface at ${x},${z}: ${y}/${expectedY}`);
      clear({x,y,z});
    }
  }
}

test('exact shared cover boxes, unique IDs and frozen arena metadata',()=>{
  assert.equal(covers.length,11);
  assert.equal(new Set(world.boxes.map(b=>b.id)).size,world.boxes.length);
  assert.deepEqual(covers,expected.map(([id,x,y,z,w,h,d])=>({id,minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2,kind:'cover'})));
  assert.deepEqual(arena.bounds,{minX:-50,maxX:50,minZ:-125,maxZ:125});
  assert.deepEqual(arena.protectedEntries,[-115,115].map(z=>({x:-18,y:0,z})));
  assert.deepEqual(arena.routeBends,[-16,16].map(z=>({x:-10,y:3,z})));
  assert.ok(Object.isFrozen(arena)&&Object.isFrozen(arena.routeBends[0]));
  for(const b of covers){
    const x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2;
    assert.equal(surfaceHeight({...world,boxes:world.boxes.filter(p=>p!==b)},x,z,b.minY),b.minY,'cover rests on real terrain/deck');
    assert.ok(capsuleIntersects({x,y:b.minY,z},b),'rendered solid is movement solid');
  }
});

test('original district, spawns, objectives, ramps and rail endpoints remain exact',()=>{
  const {arena:added,...district}=world;
  assert.deepEqual({...district,boxes:world.boxes.filter(b=>!added.coverIds.includes(b.id))},original);
  for(const lane of routed.lanes.filter(l=>l.id!=='midway')){
    const edges=world.ramps.filter(r=>r.axis==='z'&&lane.x>=r.minX&&lane.x<=r.maxX).flatMap(r=>[r.minZ,r.maxZ]);
    assert.deepEqual(lane.waypoints[0],{x:lane.x,y:0,z:-390});
    assert.deepEqual(lane.waypoints.at(-1),{x:lane.x,y:0,z:390});
    for(const z of edges)assert.ok(lane.waypoints.some(p=>p.z===z),'original ramp edges remain sampled');
    assert.ok(lane.waypoints.every(p=>p.x>=lane.x-2&&p.x<=lane.x),'only measured approach clearance shifts other lanes');
  }
  assert.equal(world.lanes[1].waypoints,undefined);
});

test('both formations clear all geometry along every lane, including guardian approaches',()=>{
  assert.deepEqual(routed.lanes.find(l=>l.id==='midway').waypoints.filter(p=>Math.abs(p.z)===16),arena.routeBends);
  assert.equal(BODY.radius,.45);
  for(const lane of routed.lanes){
    const points=lane.waypoints;
    for(const path of [points,[...points].reverse()])for(const offset of [-3,-1,1,3])for(let i=1;i<path.length;i++){
      segment(path[i-1],path[i],offset,true);
      segment(path[i-1],path[i],offset);
    }
  }
  // Verify the actual systems-owned squad paths, not only a parallel test route.
  const sim=createSystems(routed);sim.step(30);
  for(const lane of routed.lanes)for(const team of ['carbon','ivory']){
    const points=lane.waypoints,squad=sim.troopers.filter(t=>t.team===team&&t.lane===lane.id);
    assert.equal(squad.length,4);
    squad.forEach((trooper,i)=>assert.deepEqual(trooper.path,(team==='carbon'?points:[...points].reverse()).map(p=>({...p,x:p.x+(i-1.5)*2}))));
  }
});

test('each protected entry has two separate six-metre ground exits around its shield',()=>{
  for(const entry of arena.protectedEntries){
    clear(entry);assert.equal(surfaceHeight(world,entry.x,entry.z,4),entry.y);
    const sign=Math.sign(entry.z);
    for(const centerX of [-31,-5]){
      // A full 6m-wide strip plus the real .45m capsule radius, not a centerline-only claim.
      for(let offset=-3;offset<=3;offset+=.5)segment({x:centerX,y:0,z:entry.z},{x:centerX,y:0,z:sign*85},offset);
      segment(entry,{x:centerX,y:0,z:entry.z});
    }
  }
});

test('every cover blocks real basic-attack LOS while its open side permits damage',()=>{
  for(const b of covers){
    const sim=createSystems(routed);sim.step(30);
    const x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2;
    const source=sim.addHero({id:'shooter',team:'carbon',position:{x,y:b.minY,z:b.minZ-1}});
    const target=sim.addHero({id:'target',team:'ivory',position:{x,y:b.minY,z:b.maxZ+1}});
    const hp=target.hp,ammo=source.ammo;
    assert.equal(sim.damage(target.id,10,source.id).reason,'world cover blocks attack',b.id);
    assert.equal(target.hp,hp);assert.equal(source.ammo,ammo);
    sim.moveHero(source.id,{x:b.maxX+1,y:b.minY,z:b.minZ-1});
    sim.moveHero(target.id,{x:b.maxX+1,y:b.minY,z:b.maxZ+1});
    const hit=sim.damage(target.id,10,source.id);
    assert.equal(hit.ok,true,`${b.id} open bypass`);
    assert.equal(hit.amount,9,'existing default ten-percent armor remains authoritative');
    assert.equal(target.hp,hp-9);
  }
});

test('all rail paths remain unchanged and reusable through the covered slice',()=>{
  assert.deepEqual(world.stations,original.stations);
  for(const line of world.stations){
    const traveler=Object.assign(createTraveler(world),line.a);
    for(const end of ['b','a']){
      interact(world,traveler);assert.equal(traveler.mode,'zip');
      for(let t=0;t<34;t+=.025)stepTraveler(world,traveler,{},.025);
      assert.equal(traveler.mode,'free');assert.equal(traveler.x,line[end].x);assert.equal(traveler.z,line[end].z);assert.equal(traveler.y,line[end].y);
      for(let t=0;t<1;t+=.025)stepTraveler(world,traveler,{},.025);
    }
  }
});
console.log(`arena-layout-test: ${groups} groups passed; ${samples} capsule/surface samples (CPU only)`);
