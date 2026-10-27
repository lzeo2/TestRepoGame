// Independent original-composition staging checks. CPU fixtures, not served gameplay/native realism.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { createFactionsComposition } from './fleet-composition.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { compileGeometry, clearanceBounds, mountPose } from './fleet-geometry.mjs';
import { createMap, MAP_IDS, MESH_CELL } from './map-pack/maps.mjs';
assert(process.env.THREE_ROOT,'Use existing approved THREE_ROOT; install nothing');
const T=await import(pathToFileURL(resolve(process.env.THREE_ROOT,'build/three.module.js')).href);
assert.equal(T.REVISION,'186');
const read=name=>readFile(new URL(name,import.meta.url));
const clone=x=>structuredClone(x),digest=x=>createHash('sha256').update(x).digest('hex');
const source=(await read('fleet-integration-preview.mjs')).toString();
const declarations=source.match(/(const gun = \(\).*?)(?=async function rebuild\()/s);
const roster=source.match(/const AIRCRAFT_FIXTURE = (.*?);/);
assert(declarations&&roster,'Actual preview profile declarations/roster required');
const aircraft=clone(vm.runInNewContext('('+roster[1]+')'));
function profiles(kind) {
  if(kind==='mixed6')return clone(vm.runInNewContext(declarations[1]+'\nprofiles()',{$:()=>({value:'submarine'})}));
  // Stable straight fixture matching fleet-composition-check, independent of preview camera pacing edits.
  const gun=()=>({id:'gun',medium:'surface',range:1200,speed:500,ttlMs:4000,cooldownMs:500,damage:20,depths:['surfaced'],ammo:200,acquisition:'nonvisual',mount:'main_gun'});
  const surface=(id,team,capital,modelId)=>({id,team,capital,modelId,kind:'surface',position:[0,0,0],half:[12,8,40],hp:1000,speed:30,
    route:[],weapons:[gun()],sensor:null,depth:'surfaced',depthPlan:[]});
  return [0,1].flatMap(team=>[surface('capital'+team,team,true,team?'type054':'type45'),
    ...(kind==='surface4'?[surface('escort'+team,team,false,team?'type45':'type054')]:[])]);
}
const descriptors=[...JSON.parse(await read('model-repairs.json')).models,JSON.parse(await read('submarine-model.json'))];
const descriptorBefore=JSON.stringify(descriptors),models=[],geometry=[],fitted=new Map();let modelDisposals=0;
for(const [i,descriptor] of descriptors.entries()) {
  const bytes=await read('../'+descriptor.file);assert.equal(digest(bytes),descriptor.sha256);
  const parsed=modelGeometryFixture(T,bytes),id=['type45','type054','originalSub'][i];
  parsed.object.traverse(n=>{if(n.isMesh){n.geometry.addEventListener('dispose',()=>modelDisposals++);n.material.addEventListener('dispose',()=>modelDisposals++);}});
  models.push({id,descriptor,object:parsed.object});geometry.push({id,descriptor});fitted.set(id,compileGeometry(descriptor));
}
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const close=(a,b,e=1e-6)=>assert(a.length===b.length&&a.every((n,i)=>Math.abs(n-b[i])<=e),`${a} != ${b}`);
function envelope(u,bindings=fitted) {
  const g=bindings.get(u.modelId);
  if(!g)return {radius:Math.hypot(u.half[0],u.half[2]),minY:-u.half[1],maxY:u.half[1]};
  const b=clearanceBounds(g,0);
  return {radius:Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]),minY:b.min[1],maxY:b.max[1]};
}
function validatePlacement(map,placed,input,bindings=fitted) {
  const relevantRange=Math.max(0,...input.flatMap(u=>u.weapons.map(w=>w.range)));
  for(const u of placed) {
    const e=envelope(u,bindings),sign=u.team===0?1:-1;
    assert(u.position[2]*sign>e.radius,`${map.id}: ${u.id} starts outside its own separated faction band`);
    if(placed.length===2 && u.capital && input.find(p=>p.id===u.id).route.length===0)
      assert.deepEqual(u.route,[[0,0,0]],'Two-capital default must converge on the shared contact point');
    else assert(u.route.length&&u.route.some(p=>p[2]*sign<0),'Patrol never approaches opposing side');
    const y=u.kind==='sub'?map.arena().bottomY*.65:0;
    close(u.position,[u.position[0],y,u.position[2]]);
    assert(u.position[1]+e.minY>map.arena().bottomY,'Full body penetrates seabed');
    // Symmetric conservative query encloses full/static/swept geometry at every allowed yaw and depth.
    const half=[e.radius,Math.max(Math.abs(e.minY),Math.abs(e.maxY)),e.radius];
    const points=[u.position,...u.route,u.position];
    for(let i=1;i<points.length;i++)for(const depth of u.kind==='sub'?[0,map.arena().bottomY*.25,map.arena().bottomY*.65]:[0]) {
      const a=[points[i-1][0],depth,points[i-1][2]],b=[points[i][0],depth,points[i][2]];
      assert(map.navigable(a,b,half,u.kind),`${map.id}: ${u.id} full-envelope route/depth invalid`);
      const samples=Math.max(1,Math.ceil(distance(a,b)/MESH_CELL));
      for(let j=0;j<=samples;j++) {
        const p=a.map((n,k)=>n+(b[k]-n)*j/samples);
        for(const [dx,dz] of [[0,0],[-e.radius,-e.radius],[-e.radius,e.radius],[e.radius,-e.radius],[e.radius,e.radius]]) {
          assert(map.isWater(p[0]+dx,p[2]+dz),'Sampled full envelope crosses land');
          assert(p[1]+e.minY>map.seaFloorHeight(p[0]+dx,p[2]+dz),'Sampled full envelope reaches seabed');
        }
      }
    }
  }
  for(let i=0;i<placed.length;i++)for(let j=0;j<i;j++) {
    const a=placed[i],b=placed[j],ea=envelope(a,bindings),eb=envelope(b,bindings);
    const horizontal=Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2]);
    assert(horizontal>ea.radius+eb.radius,`${map.id}: conservative initial hull envelopes overlap ${a.id}/${b.id}`);
    if(a.team!==b.team)assert(distance(a.position,b.position)>relevantRange+ea.radius+eb.radius,`${map.id}: opposing ${a.id}/${b.id} starts inside relevant range plus full hull envelopes`);
  }
  const stages=map.staging(),navigation=map.navigation();
  for(const u of placed) {
    const actual=stages.find(s=>s.id===u.id);assert(actual,'Deployment absent from staging metadata');close(actual.position,u.position);assert.deepEqual(actual.route,u.route);
    const route=u.kind==='sub'?navigation.submarineCorridors.find(s=>s.team===u.team).centerline:navigation.surfaceRoutes.find(s=>s.id===u.id).route;
    assert.deepEqual(route,u.route,'Navigation does not reflect successful deployment');
  }
  const before=map.staging();stages[0].position[0]=999999;
  assert.deepEqual(map.staging(),before,'Staging metadata is not an isolated clone');
}
function setup(mapId,seed,profileInput) {
  const identity={},actors=[{},{}],frames=[null,null];let seq=0;
  const app=createFactionsComposition({mode:'factions',mapId,seed,profiles:profileInput,models,aircraft,matchMs:180000,intermissionMs:3000,
    weather:{seed:31,initialPreset:'clear',holdMs:90000,transitionMs:30000},THREE:T,
    host:{identity,authenticate:actor=>actors.includes(actor)?{id:actors.indexOf(actor)?'bob':'alice',team:actors.indexOf(actor)}:null,
      deriveAircraftAttack(){throw Error('No flight host in staging check');}},
    createPresentation({team}){return {parent:new T.Group(),applyEnvironment(frame){frames[team]=frame;}};}});
  const lease=app.start(identity);actors.forEach(actor=>app.join(actor));app.setPaused(identity,false);
  return {app,identity,actors,frames,world:app.world(identity),advance(ms){app.update(lease,{sequence:++seq,elapsedMs:ms});},
    snapshots:()=>actors.map(actor=>app.snapshot(actor)),dispose:()=>app.dispose(identity)};
}
function unionOwn(states){return states.flatMap((s,team)=>s.units.filter(u=>u.team===team));}
let groups=0;
async function check(name,fn){try{await fn();groups++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name+': '+error.message);throw error;}}
await check('ordinary normal/solo/custom decline before inspecting profiles/models/geometry',()=>{
  const map=createMap(MAP_IDS[0],71);
  for(const mode of ['normal','solo','custom']) {
    assert.equal(createFactionsComposition({mode,get host(){throw Error('ordinary host inspected');},get models(){throw Error('ordinary models inspected');}}),null);
    assert.equal(map.placeFleet(mode,new Proxy([],{get(){throw Error('ordinary profiles inspected');}}),new Proxy([],{get(){throw Error('ordinary geometry inspected');}})),null);
  }
});
const replayCases=[];
for(const mapId of MAP_IDS)for(const seed of [71])for(const kind of ['surface2','surface4','mixed6']) {
  await check(`${mapId}/${seed}/${kind}: legal separated approach then real measured reciprocal combat`,()=>{
    const input=profiles(kind),before=JSON.stringify(input),f=setup(mapId,seed,input);
    try {
      const initial=unionOwn(f.snapshots());validatePlacement(f.world,initial.map(u=>({...input.find(p=>p.id===u.id),...u,route:f.world.staging().find(s=>s.id===u.id).route})),input);
      const initialGap=Math.min(...initial.filter(u=>u.team===0&&u.kind==='surface').flatMap(a=>initial.filter(u=>u.team===1&&u.kind==='surface').map(b=>distance(a.position,b.position))));
      const seen=new Map();let firstFireMs=null,ten=null,sinkBy60=false;
      for(let ms=250;ms<=120000;ms+=250) {
        f.advance(250);const states=f.snapshots();assert.equal(f.app.stats().viewFailures,0);
        for(const s of states)for(const e of s.events){seen.set(e.id,e);if(e.type==='fire')firstFireMs??=e.tick*50;if(e.type==='sunk'&&e.tick*50<=60000)sinkBy60=true;}
        if(ms<=10000)assert(!states.some(s=>s.events.some(e=>e.type==='fire'||e.type==='damage')),'AI combat began inside the 10-second approach interval');
        if(ms===10000)ten=unionOwn(states);
        if(kind==='mixed6')for(const team of [0,1])assert(!states[team].units.some(u=>u.id===`sub${1-team}`),'Private submarine pose disclosed');
        const measuredIds=input.filter(u=>u.modelId&&u.kind==='surface').map(u=>u.id);
        const fireTeams=new Set([...seen.values()].filter(e=>e.type==='fire'&&measuredIds.includes(e.source)).map(e=>e.team));
        const damagedTeams=new Set([...seen.values()].filter(e=>e.type==='damage'&&measuredIds.includes(e.unit)).map(e=>input.find(u=>u.id===e.unit).team));
        if(fireTeams.size===2&&damagedTeams.size===2&&(kind==='mixed6'||sinkBy60))break;
        if(ms===60000&&kind!=='mixed6')assert(sinkBy60,'Production 1000HP surface fixture did not sink by 60 seconds');
      }
      console.log(JSON.stringify({mapId,seed,kind,firstFireMs,initialGap,sinkBy60,finalUnits:unionOwn(f.snapshots()).map(u=>({id:u.id,position:u.position,hp:u.hp}))}));
      assert(firstFireMs>10000&&firstFireMs<=120000,'No bounded post-approach combat');
      const tenGap=Math.min(...ten.filter(u=>u.team===0&&u.kind==='surface').flatMap(a=>ten.filter(u=>u.team===1&&u.kind==='surface').map(b=>distance(a.position,b.position))));
      assert(tenGap<initialGap,'Fleets did not actually approach');
      const measuredIds=input.filter(u=>u.modelId&&u.kind==='surface').map(u=>u.id),events=[...seen.values()];
      for(const team of [0,1]) {
        assert(events.some(e=>e.type==='fire'&&e.team===team&&measuredIds.includes(e.source)),'No actual measured reciprocal fire');
        assert(events.some(e=>e.type==='damage'&&input.find(u=>u.id===e.unit)?.team===team&&measuredIds.includes(e.unit)),'No actual measured reciprocal damage');
      }
      if(kind!=='mixed6')assert(sinkBy60,'Production 1000HP surface fixture did not sink by 60 seconds');
      // Match the real first-shot pose by replaying up to its tick, not granting position/HP.
      if(seed===71&&kind==='surface4')replayCases.push({mapId,seed,input:clone(input),firstFireMs});
      assert.equal(JSON.stringify(input),before,'Caller profiles mutated');assert.equal(JSON.stringify(descriptors),descriptorBefore);
    } finally {f.dispose();}
  });
}
await check('seed72 optional placement-only coverage on every map/roster (no duplicate full battle)',()=>{
  for(const mapId of MAP_IDS)for(const kind of ['surface2','surface4','mixed6']) {
    const input=profiles(kind),before=JSON.stringify(input),f=setup(mapId,72,input);
    try {
      const initial=unionOwn(f.snapshots());
      validatePlacement(f.world,initial.map(u=>({...input.find(p=>p.id===u.id),...u,route:f.world.staging().find(s=>s.id===u.id).route})),input);
      assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(descriptors),descriptorBefore);
    }finally{f.dispose();}
  }
});
await check('same map/seed/profile replay and partitioned inputs preserve actual moving mount origins',()=>{
  for(const c of replayCases) {
    const a=setup(c.mapId,c.seed,c.input),b=setup(c.mapId,c.seed,clone(c.input));
    try {
      for(let ms=0;ms<c.firstFireMs;ms+=250)a.advance(Math.min(250,c.firstFireMs-ms));
      let remaining=c.firstFireMs,index=0;const pieces=[17,33,101,149,50,250];
      while(remaining){const n=Math.min(remaining,pieces[index++%pieces.length]);b.advance(n);remaining-=n;}
      assert.deepEqual(a.snapshots(),b.snapshots());assert.deepEqual(a.world.replayKey(),b.world.replayKey());
      const states=a.snapshots(),units=unionOwn(states);
      const fired=states.flatMap(s=>s.events).filter(e=>e.type==='fire'&&e.tick*50===c.firstFireMs);assert(fired.length>0,'No replayed first-fire event');
      for(const event of fired) {
        const unit=units.find(u=>u.id===event.source),g=fitted.get(unit.modelId);assert(g);
        const q=unit.view.orientation,heading=2*Math.atan2(q[1],q[3]);
        close(event.position,mountPose(g,unit.position,heading,'main_gun',unit.view.angles).position);
        assert(distance(event.position,unit.position)>30,'Unit-center launch substituted for measured mount');
      }
    } finally {a.dispose();b.dispose();}
  }
});
await check('range and physical envelope variants increase computed start gap or reject illegal water; bad depth/size fail closed',()=>{
  for(const mapId of MAP_IDS) {
    const map=createMap(mapId,71),input=profiles('surface4'),base=map.placeFleet('factions',input,geometry);
    const gap=units=>Math.min(...units.filter(u=>u.team===0).flatMap(a=>units.filter(u=>u.team===1).map(b=>distance(a.position,b.position))));
    const oldGap=gap(base),ranged=clone(input);ranged.forEach(u=>u.weapons.forEach(w=>{w.range=1800;}));
    function largerOrIllegal(profileInput,geometries) {
      const oldStage=map.staging();let placed;
      try{placed=map.placeFleet('factions',profileInput,geometries);}
      catch(error){assert.match(error.message,/water|bounds|envelope|staging|corridor|overlap/i);assert.deepEqual(map.staging(),oldStage);return;}
      assert(gap(placed)>oldGap,'Larger range/full physical envelope did not increase actual initial separation');
    }
    largerOrIllegal(ranged,geometry);
    // Explicit synthetic bounds stress case ONLY; no GLB/art change or model acceptance claim.
    const larger=clone(geometry);
    for(const entry of larger.filter(e=>e.id!=='originalSub'))for(const field of ['bounds','static_bounds_root','continuous_swept_bounds_root'])if(entry.descriptor[field])
      for(const key of ['min','max'])entry.descriptor[field][key]=entry.descriptor[field][key].map(n=>n*3);
    largerOrIllegal(input,larger);
    const huge=clone(geometry);huge[0].descriptor.bounds.min[0]=-6000;huge[0].descriptor.bounds.max[0]=6000;
    const beforeInvalid=map.staging();assert.throws(()=>map.placeFleet('factions',input,huge));assert.deepEqual(map.staging(),beforeInvalid);
    const badDepth=clone(geometry);badDepth[2].descriptor.continuous_swept_bounds_root.min[1]=-300;
    assert.throws(()=>map.placeFleet('factions',profiles('mixed6'),badDepth));assert.deepEqual(map.staging(),beforeInvalid);
  }
});
assert.equal(modelDisposals,0,'Composition disposed caller model resources');
assert.equal(JSON.stringify(descriptors),descriptorBefore);
for(const model of models)assert.equal(digest(await read('../'+model.descriptor.file)),model.descriptor.sha256);
for(const model of models)model.object.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
console.log(`PASS ${groups} independent staging groups; actual profiles/3 GLBs/3 maps; CPU original composition only, not native/served flight or measured ASW acceptance`);
