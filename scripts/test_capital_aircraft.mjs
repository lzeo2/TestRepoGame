import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createAircraft, JET_TAKEOFF_SPEED } from '../Games/Capital Drive/aircraft.js';
import { createAircraftView } from '../Games/Capital Drive/aircraft-view.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';

const data = async file => JSON.parse(await readFile(new URL('../Games/Capital Drive/data/' + file, import.meta.url)));
const map = applyAirport(applyMapExpansion(await data('canberra.json'), await data('canberra-north.json')), await data('airport.json'));
const terrain = createTerrainSampler(map);
const sim = createSimulation(map, { trafficCount: 0, parkedCount: 0, isOnBridge: terrain.isOnBridge });
const jets = createAircraft(map, sim, { heightAt: terrain.heightAt });
const fleet = jets.snapshot().planes;
const parked = fleet.filter(plane=>plane.kind==='jet');
const helicopter=fleet.find(plane=>plane.kind==='helicopter');
assert.equal(parked.length, 2, 'two checked sourced apron stands');
assert(helicopter,'checked airport apron fallback supplies one helicopter');
assert.equal(jets.active, null);
for (const p of parked) {
  assert.equal(p.y, terrain.heightAt(p.x, p.z));
  assert(map.airport.surfaces.some(s => s.id === p.apronId && s.kind === 'apron'));
  assert(sim.canOccupy(p, { length: p.length, width: 4 }));
}
const door = p => ({ x: p.x + Math.cos(p.yaw)*2.1-Math.sin(p.yaw)*1.3,
  z: p.z-Math.sin(p.yaw)*2.1-Math.cos(p.yaw)*1.3, yaw:p.yaw });
const ctx = { pose: door(parked[0]), onFoot: true, valid: true, sandbox: true };
assert.equal(jets.interact({ ...ctx, pose: map.spawn }).ok, false, 'no remote boarding');
assert.equal(jets.interact({ ...ctx, onFoot: false }).ok, false, 'must really be on foot');
assert.equal(jets.interact(ctx).challenge, true);
assert.equal(jets.challenge.sequence.length, 8);
const paused = jets.challenge;
jets.step(0, { challenge: { [paused.expectedKey]:true } }, ctx);
assert.equal(jets.challenge.index, 0, 'pause cannot solve cues');
jets.step(.02, {}, ctx);
function solve(system, context) {
  for (let cue = 0; cue < 8; cue++) {
    for (let i = 0; i < 40 && system.challenge.phase !== 'cue'; i++) system.step(.02, {}, context);
    assert.equal(system.challenge.phase, 'cue', system.challenge.reason);
    system.step(.02, { challenge: { [system.challenge.expectedKey]:true } }, context);
    if(cue<7)system.step(.02, {}, context);
  }
}
function checkSteering(system,context,label){
  const token=system.captureCheckpoint(),start=system.active;assert(token,label+' checkpoint');
  for(const turn of [-1,-.35,.35,1]){
    assert(system.restoreCheckpoint(token).ok);
    system.step(.1,{turn,throttle:start.kind==='helicopter'?.3:0},context);
    const next=system.active,heading=Math.atan2(Math.sin(next.yaw-start.yaw),Math.cos(next.yaw-start.yaw));
    assert(heading*turn<0,label+': positive/right input reduces -Z-forward yaw');
    const right=(next.x-start.x)*Math.cos(start.yaw)-(next.z-start.z)*Math.sin(start.yaw);
    assert(right*turn>0,label+': world-space motion bends toward the requested side');
    if(start.airborne)assert(next.bank*turn<0,label+': roll and actual turn agree');
    assert(!next.wrecked,label+': small real steering probe remains clear');
  }
  assert(system.restoreCheckpoint(token).ok);system.step(.1,{turn:0},context);
  assert.equal(system.active.yaw,start.yaw,label+': neutral input preserves heading');
  assert(system.restoreCheckpoint(token).ok);
}
solve(jets, ctx);
assert.equal(jets.active.id, parked[0].id);
assert.equal(jets.active.stolen, true);
const theft = jets.drainEvents().filter(e => e.type === 'stolen');
assert.equal(theft.length, 1, 'exactly one validated theft');
assert.equal(theft[0].sandbox, true);
assert.equal(jets.seatPose.y, jets.active.y + 1.55);
assert.equal(jets.seatPose.speed, 0);
const pilot = { ...ctx, onFoot: false };
const still = jets.snapshot();
jets.step(0, { throttle:1,climb:true,turn:1 }, pilot);
assert.deepEqual(jets.snapshot(), still, 'zero supplied time freezes flight');
// Register the actual ground bodies through the same external ABI as runtime.
const sync = () => sim.setExternalVehicles(jets.snapshot().planes.filter(p=>!p.airborne).map(p=>({...p,width:4})));
sync();
for(let i=0;i<70;i++)jets.step(.02,{climb:true},pilot);
assert.equal(jets.active.speed,0);assert.equal(jets.active.airborne,false,'Space alone cannot lift a parked jet');
for(let i=0;i<110&&jets.active.speed<12;i++)jets.step(.02,{throttle:1},pilot);
assert(jets.active.takeoffRoll>0 && jets.active.speed<JET_TAKEOFF_SPEED && !jets.active.airborne,'actual ground roll precedes takeoff');
checkSteering(jets,pilot,'jet ground steering');
for(let i=0;i<500 && jets.active.altitude<10;i++){jets.step(.02,{throttle:1,climb:true},pilot);sync();}
assert(jets.active.airborne && jets.active.y>terrain.heightAt(jets.active.x,jets.active.z)+3,
  'normal throttle and climb take off from the checked source apron');
assert(jets.active.speed>=JET_TAKEOFF_SPEED && jets.active.takeoffRoll>=22);
assert.equal(jets.active.wrecked,false,'source apron takeoff is clear');
checkSteering(jets,pilot,'jet airborne steering');
assert.equal(jets.interact(pilot).ok,false,'no airborne exit');
for(let i=0;i<500 && jets.active.airborne;i++){
  const throttle=jets.active.speed>38?-1:jets.active.speed<30?1:0;
  jets.step(.02,{descend:true,throttle},pilot);sync();
}
assert.equal(jets.active.airborne,false,'held descent can land');
assert.equal(jets.active.wrecked,false,'a normal four metre/second descent lands safely');
for(let i=0;i<240 && jets.active.speed>.5;i++){jets.step(.02,{throttle:-1},pilot);sync();}
assert(jets.active.speed<=.5,'S brakes to a stop');
const exited = jets.interact(pilot);
assert.equal(exited.exited,true,'checked ground exit');
assert(Number.isFinite(exited.exitPose.y));
assert.equal(jets.active,null);
assert.equal(jets.drainEvents().filter(e=>e.type==='stolen').length,0,'flying cannot repeat theft');
jets.reset();
assert.deepEqual(jets.snapshot().planes,fleet,'reset restores finite original pool');
assert.equal(jets.interact(ctx).challenge,true);
jets.step(.02,{}, {...ctx,pose:map.spawn});
assert.equal(jets.challenge.active,false,'walking away cancels admission');
assert.equal(jets.active,null);

const rotorContext={...ctx,pose:door(helicopter)};
assert(jets.interact(rotorContext).challenge);
assert.equal(jets.challenge.aircraftKind,'helicopter');
solve(jets,rotorContext);
assert.equal(jets.active.id,helicopter.id);
assert.equal(jets.drainEvents().filter(event=>event.type==='stolen').length,1);
const rotorPilot={...rotorContext,onFoot:false};
for(let i=0;i<60;i++)jets.step(.02,{throttle:1},rotorPilot);
assert.equal(jets.active.x,helicopter.x);assert.equal(jets.active.z,helicopter.z);
assert.equal(jets.active.airborne,false,'helicopter translates only after takeoff');
for(let i=0;i<150;i++)jets.step(.02,{climb:true},rotorPilot);
assert(jets.active.airborne && jets.active.altitude>10 && !jets.active.wrecked);
assert.equal(jets.active.speed,0,'helicopter takes off vertically from rest');
assert.equal(jets.interact(rotorPilot).ok,false);
checkSteering(jets,rotorPilot,'helicopter steering');
for(let i=0;i<30;i++)jets.step(.02,{turn:.4},rotorPilot);
for(let i=0;i<100;i++)jets.step(.02,{throttle:1},rotorPilot);
assert(Math.hypot(jets.active.x-helicopter.x,jets.active.z-helicopter.z)>10 && !jets.active.wrecked);
// Backtrack to the checked pad before descending. The outbound path can
// cross real nearby buildings while the helicopter is above their roofs.
for(let i=0;i<100;i++)jets.step(.02,{throttle:-1},rotorPilot);
for(let i=0;i<160;i++)jets.step(.02,{},rotorPilot);
assert(Math.abs(jets.active.speed)<.5 && Math.abs(jets.active.verticalSpeed)<.5,'neutral input holds a slow hover');
assert(Math.hypot(jets.active.x-helicopter.x,jets.active.z-helicopter.z)<1,'reverse controls return to the clear pad');
const scene = new THREE.Scene(), view = createAircraftView(scene,terrain.heightAt);
view.update(jets.snapshot(),jets.active,.02);
const rotorMesh=scene.getObjectByName('Wattle main rotor');
assert(rotorMesh.rotation.y>0);
const bladeAngle=rotorMesh.rotation.y;
view.update(jets.snapshot(),jets.active,0);
assert.equal(rotorMesh.rotation.y,bladeAngle,'paused frames freeze rotor animation');
for(let i=0;i<540 && jets.active.airborne;i++)jets.step(.02,{descend:true},rotorPilot);
assert(!jets.active.airborne && !jets.active.wrecked);
assert(jets.interact(rotorPilot).exited);
view.update(jets.snapshot(),parked[0]);
const resources = view.stats;
assert.equal(resources.models,3); assert.equal(resources.meshes,4); assert.equal(resources.drawCalls,4);
assert(resources.triangles<1000 && resources.bufferBytes<100000,'small merged original models');
const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
for(const mesh of meshes)assert(mesh.geometry.boundingSphere && mesh.geometry.boundingBox);
for(let i=0;i<300;i++)view.update(jets.snapshot(),parked[0]);
assert.deepEqual(view.stats,resources,'no frame model allocations');
view.update(jets.snapshot(),{x:map.bounds.minX,z:map.bounds.minZ});assert.equal(view.stats.drawCalls,0,'distant pool is culled');
sim.setExternalVehicles([]);
jets.reset({absentAircraft:[helicopter.id,...parked.map(p=>p.id)]});
const reserves=jets.snapshot().planes;
assert.deepEqual(reserves.map(p=>p.id),['loan:jet','loan:helicopter'],'missing aircraft are never recreated as the original IDs');
const loanRotor=reserves.find(p=>p.kind==='helicopter');
assert(Math.hypot(loanRotor.x-helicopter.x,loanRotor.z-helicopter.z)>31,'loan aircraft uses a different checked stand');
assert.equal(jets.nearest(door(helicopter)),null,'stolen rotorcraft no longer has a boarding point at the original stand');
assert.equal(jets.interact({...rotorContext,pose:door(loanRotor),sandbox:false}).boarded,true,'loaner boards directly');
assert.equal(jets.drainEvents().some(event=>event.type==='stolen'),false,'loan flight is not a fresh theft');
view.update(jets.snapshot(),loanRotor);
assert.equal(view.stats.drawCalls,3,'replacement jet/rotorcraft reuse the existing mesh pool');
jets.reset();
assert.deepEqual(jets.snapshot().planes,fleet,'isolating a Campaign save leaves the Free roam fleet available');
view.dispose();view.dispose();assert.equal(view.stats.bufferBytes,0);assert.equal(scene.children.length,0);
console.log(`Capital aircraft PASS: two checked jet stands, visible ground roll, fixed-wing landing, helicopter hijack/vertical lift/hover/land/exit, Campaign aircraft removal with distinct loaners, pooled view (${resources.triangles} triangles).`);

// Transient retrieval loaners have a checked physical stand and exact attempt ID.
// They use the same nearby E boarding, supplied-time piloting and safe exit owner.
const jobMap={bounds:{minX:-400,maxX:400,minZ:-400,maxZ:400},spawn:{x:0,z:0,yaw:0},roads:[],areas:[],landmarks:[],
  buildings:[{id:'job-test-solid',height:12,points:[[90,90],[110,90],[110,110],[90,110]]}]};
const jobSimulation=createSimulation(jobMap,{trafficCount:0});let blockJobExit=false;
const jobAircraft=createAircraft(jobMap,{
  canOccupy:(...args)=>jobSimulation.canOccupy(...args),hasLineOfSight:(...args)=>jobSimulation.hasLineOfSight(...args),
  moveActor:(...args)=>blockJobExit?{blocked:true}:jobSimulation.moveActor(...args),moveVehicle:(...args)=>jobSimulation.moveVehicle(...args),
},{heightAt:()=>0});
const baseCheckpoint=jobAircraft.captureCheckpoint();assert(baseCheckpoint);
for(const id of ['',null,'jet:1','helicopter:1','loan:helicopter','bad id'])assert.equal(jobAircraft.addJobHelicopter(id,{x:-80,z:-80,yaw:0}).ok,false);
assert.equal(jobAircraft.addJobHelicopter('job:blocked',{x:100,z:100,yaw:0}).ok,false,'solid stand rejects creation');
assert.equal(jobAircraft.addJobHelicopter('job:edge',{x:399,z:0,yaw:0}).ok,false,'rotor/air clearance retains the map edge');
assert.equal(jobAircraft.addJobHelicopter('job:invalid',{x:NaN,z:0,yaw:0}).ok,false);
const attemptId='job:skylark:1:helicopter',jobPose={x:-80,z:-80,yaw:0,y:500,id:'wrong'};
const added=jobAircraft.addJobHelicopter(attemptId,jobPose);assert(added.ok);assert.equal(added.aircraft.id,attemptId);
assert.equal(added.aircraft.y,0,'controller pose cannot override checked terrain height');assert(added.aircraft.jobLoaner&&added.aircraft.loaner&&!added.aircraft.stolen);
assert.throws(()=>{added.aircraft.id='different';},TypeError);jobPose.x=200;
assert.equal(jobAircraft.snapshot().planes.find(p=>p.id===attemptId).x,-80,'mutating an input/returned copy cannot relocate the stand');
assert.equal(jobAircraft.addJobHelicopter(attemptId,{x:150,z:150,yaw:0}).ok,false,'same attempt cannot be replaced or remotely moved');
assert.equal(jobAircraft.addJobHelicopter('job:skylark:2:helicopter',{x:180,z:180,yaw:0}).ok,false,'transient live pool is bounded to one');
assert.deepEqual(jobAircraft.drainEvents(),[],'creation is not theft, payment or a teleport event');
const staged=jobAircraft.captureCheckpoint();assert(staged);assert(jobAircraft.restoreCheckpoint(baseCheckpoint).ok);
assert(jobAircraft.snapshot().planes.some(p=>p.id===attemptId),'unrelated checkpoint restore leaves the live unsaved loaner in place');
const jobDoor=door(added.aircraft),remote={valid:true,onFoot:true,pose:{x:200,z:200}};
const stagedBefore=jobAircraft.snapshot();assert.equal(jobAircraft.interact(remote).ok,false);
assert.deepEqual(jobAircraft.snapshot(),stagedBefore,'remote interaction cannot board or warp the craft');
assert.equal(jobAircraft.nearest(jobDoor).id,attemptId);
assert(jobAircraft.interact({valid:true,onFoot:true,pose:jobDoor}).boarded,'nearby loaner boards without a lock');
assert.equal(jobAircraft.challenge.phase,'idle');assert.equal(jobAircraft.active.id,attemptId);
assert.equal(jobAircraft.drainEvents().filter(e=>e.type==='stolen').length,0,'job loaner never emits a theft crime');
assert.equal(jobAircraft.captureCheckpoint(),null,'active job pilot is never serialized into normal aircraft checkpoints');
assert.equal(jobAircraft.restoreCheckpoint(baseCheckpoint).ok,false,'normal checkpoint cannot eject an active job pilot');
for(let i=0;i<180;i++)jobAircraft.step(.02,{climb:true},{valid:true});
assert(jobAircraft.active.airborne&&jobAircraft.active.altitude>10,'normal manual input takes off');
const departure=jobAircraft.active,release=jobAircraft.releaseJobHelicopter(attemptId);
assert(release.ok&&release.deferred&&!release.removed);assert.equal(jobAircraft.active.id,attemptId);
assert.equal(jobAircraft.active.y,departure.y,'completion cleanup does not eject or move an airborne pilot');
assert.equal(jobAircraft.interact({valid:true}).ok,false,'pending release cannot bypass ordinary airborne exit guard');
for(let i=0;i<600&&jobAircraft.active.airborne;i++)jobAircraft.step(.02,{descend:true},{valid:true});
assert(!jobAircraft.active.airborne&&!jobAircraft.active.wrecked);
blockJobExit=true;assert.equal(jobAircraft.interact({valid:true}).ok,false);
assert.equal(jobAircraft.active.id,attemptId,'blocked safe exit retains the pending craft and pilot');
blockJobExit=false;assert(jobAircraft.interact({valid:true}).exited);assert.equal(jobAircraft.active,null);
assert(!jobAircraft.snapshot().planes.some(p=>p.id===attemptId),'pending cleanup removes only after the actual safe exit');
assert(jobAircraft.releaseJobHelicopter(attemptId).ok,'cleanup is idempotent for an already released attempt');
assert.equal(jobAircraft.addJobHelicopter(attemptId,{x:-80,z:-80,yaw:0}).ok,false,'released attempt ID cannot be reused');
assert(jobAircraft.restoreCheckpoint(staged).ok);assert.equal(jobAircraft.snapshot().planes.length,0,'checkpoint never resurrects a staged temporary craft');
const nextId='job:skylark:2:helicopter';assert(jobAircraft.addJobHelicopter(nextId,{x:-80,z:-80,yaw:0}).ok,'fresh attempt can repeat normally');
assert(jobAircraft.releaseJobHelicopter(nextId).removed,'unoccupied job helicopter is removed immediately');
assert.equal(jobAircraft.releaseJobHelicopter('helicopter:1').ok,false,'cleanup cannot remove an original identity');
assert(jobAircraft.addJobHelicopter('job:reset',{x:-80,z:-80,yaw:0}).ok);jobAircraft.reset();assert.equal(jobAircraft.snapshot().planes.length,0);
assert(jobAircraft.addJobHelicopter('job:reset',{x:-80,z:-80,yaw:0}).ok,'reset clears the transient session identity history');
jobAircraft.reset();
console.log('PASS transient job helicopter: exact immutable IDs/checked placement, one live loaner, nearby lock-free boarding/no crime, normal piloting, deferred safe-exit cleanup, no checkpoint persistence and repeat/reset lifecycle');
