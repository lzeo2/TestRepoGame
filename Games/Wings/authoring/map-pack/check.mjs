// Browser-free original-map checks. FC profiles are fixtures, not asset capabilities.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {compileGeometry,clearanceBounds} from '../fleet-geometry.mjs';
import {createMap,MAP_IDS,SEA_FLOOR,WORLD_HALF,MESH_CELL} from './maps.mjs';
import {createFleet,replayFleet} from '../fleet-sim.mjs';
const escorts=JSON.parse(readFileSync(new URL('../model-repairs.json',import.meta.url),'utf8')).models;
const submarine=JSON.parse(readFileSync(new URL('../submarine-model.json',import.meta.url),'utf8'));
const geometry=[...escorts,submarine].map((descriptor,i)=>({id:`measured${i}`,descriptor}));
const gun=()=>({id:'gun',medium:'surface',range:1200,speed:200,ttlMs:10000,cooldownMs:1000,damage:.01,depths:['surfaced'],ammo:100});
const uw=()=>({id:'uw',medium:'underwater',range:1200,speed:100,ttlMs:20000,cooldownMs:6000,damage:.01,depths:['surfaced','shallow','deep'],ammo:2});
function profiles() {
  return [0,1].flatMap(team=>['capital','escort','sub'].map(role=>({id:`${role}${team}`,team,kind:role==='sub'?'sub':'surface',capital:role==='capital',
    position:[0,0,0],half:role==='sub'?[10,8,40]:[20,15,80],hp:100,speed:role==='capital'?8:12,
    route:[],weapons:role==='capital'?[gun()]:[...(role==='escort'?[gun()]:[]),uw()],
    sensor:role==='capital'?null:{enabled:true,range:1200,depths:['surfaced','shallow','deep']},
    depth:'surfaced',depthPlan:role==='sub'?[{atMs:1000,depth:'shallow'},{atMs:6000,depth:'deep'},{atMs:12000,depth:'surfaced'},{atMs:18000,depth:'deep'}]:[]})));
}
const config=(map)=>({mode:'factions',arena:map.arena(),units:map.placeFleet('factions',profiles()),
  aircraft:[[{id:'fighterA',weapons:[gun()]}],[{id:'fighterB',weapons:[gun()]}]],matchMs:120000,intermissionMs:1000});
const lerp=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
const digest=map=>createHash('sha256').update(new Uint8Array(map.worldMesh().h.buffer)).digest('hex');
let groups=0,failedGroups=0;
function check(name,fn){
  try {fn();groups++;console.log(`PASS ${name}`);}
  catch(error){failedGroups++;console.error(`FAIL ${name}: ${error.stack}`);}
}
check('strict map/seed/coordinate validation and no non-Factions profile access',()=>{
  for(const [id,seed] of [['unknown',0],[MAP_IDS[0],-1],[MAP_IDS[0],1.5],[MAP_IDS[0],2**32]])assert.throws(()=>createMap(id,seed));
  const m=createMap(MAP_IDS[0]);
  for(const mode of ['normal','solo','custom',undefined])assert.equal(m.placeFleet(mode,new Proxy([],{get(){throw Error('ordinary profiles touched');}})),null);
  assert.throws(()=>m.terrainHeight(NaN,0));assert.equal(m.terrainHeight(5001,0),SEA_FLOOR);
  assert.equal(m.worldQuery.seabedHeight(5001,0),SEA_FLOOR);assert.equal(m.worldQuery.half,WORLD_HALF);
  assert.equal(m.worldQuery.ceiling,3500);assert.equal(m.worldQuery.groundHeight(5001,0),0);
  assert.throws(()=>m.spawnPoint(2,'fighter'));assert.throws(()=>m.spawnPoint(0,'speedboat'));assert.throws(()=>m.spawnPoint(0,'fighter',6));
  assert.throws(()=>m.placeFleet('factions',[]));
  const p=profiles();p[1].team=1;assert.throws(()=>m.placeFleet('factions',p));
  const measured=profiles();measured[0].modelId='fitted';assert.throws(()=>m.placeFleet('factions',measured),/Missing measured model geometry/);
  for(const mode of ['normal','solo','custom'])assert.equal(m.placeFleet(mode,null,new Proxy([],{get(){throw Error('ordinary geometry touched');}})),null);
});
const distinct=[];
for(const id of MAP_IDS) {
  const map=createMap(id,771),m=map.worldMesh();
  check(`${id}: fresh explicit five-preset weather allowance`,()=>{
    const expected=['clear','overcast','rain','fog','storm'];
    assert.deepEqual(map.allowedWeatherPresets(),expected);
    const changed=map.allowedWeatherPresets();changed.splice(0,5,'not-supported');
    assert.deepEqual(map.allowedWeatherPresets(),expected);assert.notEqual(map.allowedWeatherPresets(),map.allowedWeatherPresets());
  });
  check(`${id}: reproducible mesh, distinct terrain, seeded relief, mesh/query triangle parity`,()=>{
    assert.equal(m.n,400);assert.equal(m.stride,401);assert.equal(m.cell,25);assert.equal(m.h.length,401**2);assert.equal(m.diag.length,400**2);
    assert.equal(digest(map),digest(createMap(id,771)));distinct.push(digest(map));
    assert.notEqual(digest(map),digest(createMap(id,772)));
    assert(m.h.every(Number.isFinite));assert(Math.min(...m.h.subarray(0,1000))>=SEA_FLOOR);
    for(let j=0;j<400;j+=7)for(let i=0;i<400;i+=7) {
      const k=j*401+i,x=m.vx[k],z=m.vz[k];
      assert.equal(map.terrainHeight(x,z),m.h[k]);
      for(const [u,v] of [[.2,.3],[.8,.7]]) {
        const expected=u+v<=1?m.h[k]+u*(m.h[k+1]-m.h[k])+v*(m.h[k+401]-m.h[k]):
          m.h[k+402]+(1-u)*(m.h[k+401]-m.h[k+402])+(1-v)*(m.h[k+1]-m.h[k+402]);
        assert(Math.abs(map.terrainHeight(x+25*u,z+25*v)-expected)<1e-6);
      }
    }
    for(let z=-5000;z<=5000;z+=100)for(let x=-5000;x<=5000;x+=100) {
      const h=map.terrainHeight(x,z);assert(h>=SEA_FLOOR);assert(h<=map.heightBound(x,z));
      assert.equal(map.groundHeight(x,z),Math.max(0,h));assert.equal(map.isWater(x,z),h<=0);
    }
  });
  check(`${id}: actual zero-height shoreline, land runways, aircraft slots and unobstructed air routes`,()=>{
    const shores=map.shoreline();assert(shores.length>100);
    for(const segment of shores)for(const [x,,z] of segment)assert(Math.abs(map.terrainHeight(x,z))<1e-7);
    for(const r of map.runways()) {
      for(let along=-700;along<=700;along+=25)for(const across of [-40,0,40]) {
        const x=r.center[0]+across,z=r.center[2]+along;
        assert.equal(map.terrainHeight(x,z),r.center[1]);assert(map.onRunway(x,z));assert.equal(map.surfaceType(x,z),'paved');assert(!map.isWater(x,z));
      }
      const used=new Set();
      for(const kind of ['fighter','f15','f35','apache'])for(let i=0;i<6;i++) {
        const p=map.spawnPoint(r.team,kind,i);assert(p.onGround);assert.equal(p.yaw,0);
        assert(p.position[1]>map.groundHeight(p.position[0],p.position[2]));
        if(kind==='apache')assert.deepEqual([p.position[0],r.center[1],p.position[2]],r.helipads[i]);
        if(kind==='fighter') {assert(map.onRunway(p.position[0],p.position[2]));used.add(p.position.join(','));}
      }
      assert.equal(used.size,6);
      // Full runway plus 500 m straight departure is clear of terrain at a modest climb.
      for(let z=r.center[2]-700;z>=r.center[2]-1200;z-=25)assert(map.terrainHeight(r.center[0],z)<r.center[1]+50);
    }
    for(const route of map.airRoutes())for(let k=1;k<route.points.length;k++)for(let i=0;i<=100;i++) {
      const p=lerp(route.points[k-1],route.points[k],i/100);assert(p[1]>=map.groundHeight(p[0],p[2])+80,route.id);
    }
  });
  check(`${id}: swept ship land/shore rejection, shallow shelf exclusion and deep corridors`,()=>{
    const r=map.runways()[0],x=r.center[0],z=r.center[2];
    assert(!map.navigable([x,0,z],[x,0,z],[20,15,80]));
    assert(!map.navigable([-4900,0,z],[4900,0,z],[20,15,80])); // Clear endpoints do not permit tunnelling through land.
    assert(!map.navigable([0,-239,0],[0,-239,100],[10,8,40],'sub'));
    assert(!map.navigable([4990,0,0],[4990,0,100],[20,15,80]));
    const shelves=map.arena().obstacles.filter(o=>o.max[1]<0);assert.equal(shelves.length,2);
    for(const shelf of shelves) {
      const center=[(shelf.min[0]+shelf.max[0])/2,0,(shelf.min[2]+shelf.max[2])/2];
      assert(map.navigable(center,center,[10,8,40],'surface'));
      center[1]=-156;assert(!map.navigable(center,center,[10,8,40],'sub'));
    }
    const nav=map.navigation();assert.equal(nav.surfaceRoutes.length,4);assert.equal(nav.submarineCorridors.length,2);
    for(const corridor of nav.submarineCorridors)for(const y of Object.values(corridor.depthCenters))for(const offset of [-corridor.halfWidth,0,corridor.halfWidth]) {
      const [a,b]=corridor.centerline.map(p=>[p[0]+offset,y,p[2]]);
      assert(map.navigable(a,b,corridor.maxHullHalf,'sub'));
    }
    const units=map.placeFleet('factions',profiles());
    for(const u of units) {
      const points=[u.position,...u.route,u.position];
      for(let k=1;k<points.length;k++) {
        assert(map.navigable(points[k-1],points[k],u.half,u.kind));
        for(let i=0;i<=100;i++) {
          const p=lerp(points[k-1],points[k],i/100);
          for(const sx of [-u.half[0],u.half[0]])for(const sz of [-u.half[2],u.half[2]])assert(p[1]-u.half[1]>map.seaFloorHeight(p[0]+sx,p[2]+sz));
        }
      }
    }
    const tooLarge=profiles();tooLarge[0].half=[20,240,80];assert.throws(()=>map.placeFleet('factions',tooLarge));
    const arena=map.arena();arena.obstacles.length=0;assert(map.arena().obstacles.length>0);
  });
  check(`${id}: measured surface pairs preserve capabilities, initialize real FC, face routes and replay`,()=>{
    for(const count of [2,4]) {
      const source=profiles().filter(u=>u.kind==='surface'&&(count===4||u.capital)).map(u=>({...u,
        modelId:`measured${u.team}`,half:[.25,.25,.25],heading:1.3,sensor:null,
        weapons:[{...gun(),mount:'main_gun'}]}));
      const before=structuredClone(source),units=map.placeFleet('factions',source,geometry);
      assert.deepEqual(source,before);
      for(let i=0;i<units.length;i++) {
        const u=units[i],g=compileGeometry(geometry[u.team].descriptor),b=clearanceBounds(g,0);
        const radius=Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]);
        assert.deepEqual(u.half,[.25,.25,.25]);assert.equal(u.modelId,source[i].modelId);
        for(const key of ['id','weapons','sensor','hp','speed','depthPlan'])assert.deepEqual(u[key],source[i][key]);
        const target=u.route[0],dx=target[0]-u.position[0],dz=target[2]-u.position[2],distance=Math.hypot(dx,dz);
        assert(Math.abs(-Math.sin(u.heading)-dx/distance)<1e-12);assert(Math.abs(-Math.cos(u.heading)-dz/distance)<1e-12);
        for(let h=-Math.PI;h<=Math.PI;h+=.1) {
          const rotated=clearanceBounds(g,h);assert(rotated.min[0]>=-radius&&rotated.max[0]<=radius);
          assert(rotated.min[2]>=-radius&&rotated.max[2]<=radius);assert.equal(rotated.min[1],b.min[1]);
        }
      }
      const c={...config(map),geometry,units},f=createFleet(c),initial=f.snapshot(0);
      for(let i=0;i<200;i++) {
        f.advance(50);
        for(const team of [0,1])for(const u of f.snapshot(team).units) {
          const g=compileGeometry(geometry[Number(u.modelId.slice(-1))].descriptor);
          const radius=Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]);
          assert(map.navigable(u.position,u.position,[radius,g.clearanceHalf[1],radius],u.kind));
        }
      }
      assert.notDeepEqual(f.snapshot(0).units.map(u=>u.position),initial.units.map(u=>u.position));
      for(const team of [0,1])assert.deepEqual(replayFleet(f.exportReplay()).snapshot(team),f.snapshot(team));
    }
    assert.throws(()=>map.placeFleet('factions',profiles().filter(u=>u.capital)),/explicit measured/);
    const overlap=structuredClone(geometry);for(const entry of overlap.slice(0,2))entry.descriptor.bounds.max[2]=410;
    const four=profiles().filter(u=>u.kind==='surface').map(u=>({...u,modelId:`measured${u.team}`,half:[.25,.25,.25]}));
    const ordinary=map.placeFleet('factions',four,geometry),spread=map.placeFleet('factions',four,overlap);
    assert(Math.abs(spread.find(u=>!u.capital).position[2])>Math.abs(ordinary.find(u=>!u.capital).position[2]),'Larger measured envelopes require larger staging');
    for(let i=0;i<spread.length;i++)for(let j=0;j<i;j++) {
      const a=spread[i],b=spread[j],ga=compileGeometry(overlap[a.team].descriptor),gb=compileGeometry(overlap[b.team].descriptor);
      const ra=Math.hypot(ga.clearanceHalf[0],ga.clearanceHalf[2]),rb=Math.hypot(gb.clearanceHalf[0],gb.clearanceHalf[2]);
      assert(Math.abs(a.position[0]-b.position[0])>ra+rb||Math.abs(a.position[2]-b.position[2])>ra+rb,'Adaptive formation must never overlap');
    }
    // More room does not turn the legacy fixture's anonymous ASW into a measured ship mount.
    assert.throws(()=>createFleet({...config(map),units:spread,geometry:overlap}),/actual compatible mount/);
  });
  function encounter(hp) {
    // Same descriptor ordering and explicit gun capabilities as composition surfaceProfiles(4).
    const source=profiles().filter(u=>u.kind==='surface').map(u=>({...u,
      modelId:`measured${u.capital?u.team:1-u.team}`,half:[12,8,40],hp,speed:30,sensor:null,
      weapons:[{...gun(),mount:'main_gun',speed:500,ttlMs:4000,cooldownMs:500,damage:20,ammo:200,acquisition:'nonvisual'}]}));
    const units=map.placeFleet('factions',source,geometry),c={...config(map),units,geometry,matchMs:60000},fleet=createFleet(c);
    const envelopes=new Map(units.map(u=>{
      const g=compileGeometry(geometry[Number(u.modelId.slice(-1))].descriptor),r=Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]);
      return [u.id,[r,g.clearanceHalf[1],r]];
    }));
    const events=[],trace=[];let final;
    for(const u of units.filter(u=>!u.capital)) {
      assert(u.position[0]===0);assert(u.route.every(p=>p[0]===0));
      assert.equal(u.position[2],u.team?-1025:1025); // Pinned measured v2 fixture, not a universal placement offset.
    }
    for(let i=0;i<1200;i++) {
      fleet.advance(50);final=fleet.snapshot(0);
      events.push(...final.events.filter(e=>e.tick===final.tick));
      if(final.tick<=473)trace.push(final.units.map(u=>({id:u.id,position:u.position,orientation:u.view.orientation})));
      for(const u of final.units.filter(u=>u.alive))assert(map.navigable(u.position,u.position,envelopes.get(u.id)));
      if(final.outcome)break;
    }
    assert.deepEqual(final.outcome,{winner:null,reason:'time'},'Timed draw proves clock lifecycle, not capital victory');
    assert(final.units.filter(u=>u.capital).every(u=>u.alive&&u.hp===hp),'No capital gun damage claimed');
    return {config:c,events,trace,final};
  }
  let lowHealth;
  check(`${id}: HP40 one-sided negative preserves early death before opposing gun eligibility`,()=>{
    lowHealth=encounter(40);
    const shots=lowHealth.events.filter(e=>e.type==='fire');
    assert.equal(shots.length,4);assert(shots.every(e=>e.source==='escort0'));
    const damage=lowHealth.events.filter(e=>e.type==='damage');
    assert.deepEqual(damage.map(e=>[e.source,e.unit,e.tick,e.damage]),[['escort0','escort1',465,20],['escort0','escort1',473,20]]);
    const sunk=lowHealth.events.filter(e=>e.type==='sunk');
    assert.deepEqual(sunk.map(e=>[e.source,e.unit,e.tick]),[['escort0','escort1',473]]);
    assert.equal(lowHealth.final.units.find(u=>u.id==='escort0').hp,40);
    console.log(`  encounter ${id} HP40: escort0 shots4; escort1 shots0, sunk473; one-sided, not reciprocal`);
  });
  check(`${id}: baseline HP1000 real measured guns fire/damage reciprocally and sink with matching early trajectories`,()=>{
    const baseline=encounter(1000);
    assert.deepEqual(baseline.config,{...lowHealth.config,units:lowHealth.config.units.map(u=>({...u,hp:1000}))},'Only profile durability differs');
    assert.equal(baseline.trace.length,473);assert.deepEqual(baseline.trace,lowHealth.trace,'Same positions/headings through HP40 death tick');
    for(const team of [0,1]) {
      const source=`escort${team}`,target=`escort${1-team}`;
      assert(baseline.events.some(e=>e.type==='fire'&&e.source===source&&e.target===target),'Both actual measured escorts must fire');
      assert(baseline.events.some(e=>e.type==='damage'&&e.source===source&&e.unit===target&&e.damage>0),'Both escorts must attribute real hostile damage');
    }
    const shots=baseline.events.filter(e=>e.type==='fire'),sunk=baseline.events.filter(e=>e.type==='sunk');
    assert.equal(shots.find(e=>e.source==='escort1').tick,560);
    assert.deepEqual(sunk.map(e=>[e.source,e.unit,e.tick]),[['escort0','escort1',932]]);
    assert.equal(baseline.final.units.find(u=>u.id==='escort1').hp,0);
    assert.equal(baseline.final.units.find(u=>u.id==='escort0').hp,240);
    console.log(`  encounter ${id} HP1000: escort0 shots${shots.filter(e=>e.source==='escort0').length}, escort1 shots${shots.filter(e=>e.source==='escort1').length}; escort1 sunk932; timed draw, capitals unchanged`);
  });
  check(`${id}: real submarine full depth sweep, synthetic-only legacy counterplay, impossible measured ASW rejects`,()=>{
    // Real escort art used as capitals; unbound escorts alone provide SYNTHETIC legacy ASW.
    const mixed=profiles().map(u=>u.capital?{...u,modelId:`measured${u.team}`,weapons:[{...gun(),mount:'main_gun'}]}:
      u.kind==='sub'?{...u,modelId:'measured2',weapons:[{...uw(),mount:'underwater_launch_port'}]}:u);
    const units=map.placeFleet('factions',mixed,geometry),c={...config(map),units,geometry},f=createFleet(c);
    const minY=compileGeometry(submarine).clearance.min[1];let reachedShallow=false,reachedDeep=false;
    for(let i=0;i<500;i++) {
      f.advance(50);
      for(const team of [0,1])for(const u of f.snapshot(team).units.filter(u=>u.team===team&&u.kind==='sub')) {
        assert(u.position[1]+minY>SEA_FLOOR);
        reachedShallow ||= u.position[1]===-60;reachedDeep ||= u.position[1]===-156;
      }
    }
    assert(reachedShallow&&reachedDeep);
    const impossible=mixed.map(u=>u.kind==='surface'&&!u.capital?{...u,modelId:`measured${u.team}`,weapons:[]} : u);
    const placed=map.placeFleet('factions',impossible,geometry);
    assert.throws(()=>createFleet({...c,units:placed}),/symmetric escort counterplay/);
    const invented=impossible.map(u=>u.kind==='surface'&&!u.capital?{...u,weapons:[{...uw(),mount:'main_gun'}]}:u);
    assert.throws(()=>createFleet({...c,units:map.placeFleet('factions',invented,geometry)}),/actual compatible mount/);
    const broken=structuredClone(geometry);delete broken[2].descriptor.continuous_swept_bounds_root;
    assert.throws(()=>map.placeFleet('factions',mixed,broken),/Continuous swept/);
    const noBounds=structuredClone(geometry);delete noBounds[0].descriptor.bounds;
    assert.throws(()=>map.placeFleet('factions',mixed,noBounds),/Full measured clearance/);
    const invalid=structuredClone(geometry);invalid[0].descriptor.axes.forward='+Z';
    assert.throws(()=>map.placeFleet('factions',mixed,invalid),/Invalid measured descriptor/);
    assert.throws(()=>map.placeFleet('factions',mixed,[geometry[0],geometry[0]]),/Unique measured geometry/);
    const seabed=structuredClone(geometry);seabed[2].descriptor.continuous_swept_bounds_root.min[1]=-100;
    assert.throws(()=>map.placeFleet('factions',mixed,seabed),/depth sweep/);
    const enormous=structuredClone(geometry);enormous[0].descriptor.bounds.max[0]=6000;
    assert.throws(()=>map.placeFleet('factions',mixed,enormous),/water envelope/);
    const shore=structuredClone(geometry);shore[2].descriptor.continuous_swept_bounds_root.max[0]=1600;
    assert.throws(()=>map.placeFleet('factions',mixed,shore),/water envelope/);
  });
  check(`${id}: real FC acceptance, 30s continuous depth/motion, combat, objectives, partition and replay`,()=>{
    const c=config(map),fleet=createFleet(c),partitioned=createFleet(c),start=fleet.snapshot(0),fired=new Set();
    for(let elapsed=0;elapsed<30000;elapsed+=50) {
      fleet.advance(50);
      for(const team of [0,1]) {
        const snap=fleet.snapshot(team);
        for(const e of snap.events)if(e.type==='fire')fired.add(e.source);
        for(const u of snap.units.filter(u=>u.team===team)) {
          const half=c.units.find(v=>v.id===u.id).half;
          assert(map.navigable(u.position,u.position,half,u.kind));
          assert(u.position[1]-half[1]>map.seaFloorHeight(u.position[0],u.position[2]));
        }
        assert(!snap.units.some(u=>u.team!==team&&u.kind==='sub'&&u.depth!=='surfaced'));
      }
    }
    for(let i=0;i<300;i++){partitioned.advance(31);partitioned.advance(69);}
    for(const team of [0,1]) {
      assert.deepEqual(fleet.snapshot(team),partitioned.snapshot(team));
      assert.deepEqual(fleet.snapshot(team),replayFleet(fleet.exportReplay()).snapshot(team));
    }
    assert.notDeepEqual(start.units[0].position,fleet.snapshot(0).units[0].position);
    assert(fired.has('escort0')&&fired.has('escort1'));
    assert(fleet.snapshot(0).units.some(u=>u.hp<u.maxHp));
    const ids=new Set(c.units.map(u=>u.id));
    for(const o of map.objectives(c.units)){assert(ids.has(o.attack)&&ids.has(o.defend));assert.notEqual(o.attack,o.defend);}
    const renamed=map.placeFleet('factions',profiles().map(u=>({...u,id:`renamed_${u.id}`})));
    assert.equal(map.objectives(renamed)[0].defend,'renamed_capital0');
    const ending=createFleet({...c,matchMs:1000});ending.advance(1000);
    assert.equal(ending.snapshot(0).outcome.reason,'time');ending.advance(1000);
    assert.equal(ending.snapshot(0).round,1);assert.equal(ending.snapshot(0).outcome,null);
    assert.deepEqual(ending.snapshot(0).units.map(u=>u.position),start.units.map(u=>u.position));
    assert.deepEqual(map.replayKey(),{mapPackVersion:2,mapId:id,seed:771});
  });
}
assert.equal(new Set(distinct).size,3);
console.log(`PASS ${groups} map-pack CPU groups / 3 original maps; no served/native integration claimed`);
assert.equal(failedGroups,0,`${failedGroups} map-pack CPU groups failed`);
