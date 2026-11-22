import assert from 'node:assert/strict';
import {createAircraft} from '../Games/Capital Drive/aircraft.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';

const map={bounds:{minX:-800,maxX:800,minZ:-800,maxZ:800},spawn:{x:-650,z:0,yaw:0},roads:[],buildings:[],areas:[],
  landmarks:[{id:'canberra-airport',x:0,z:0}],airport:{surfaces:[
    {id:'apron',kind:'apron',closed:true,points:[[-300,-300],[300,-300],[300,300],[-300,300]]},
  ]}};
const simulation=createSimulation(map,{trafficCount:0,parkedCount:0});
let ground=0;
const aircraft=createAircraft(map,simulation,{heightAt:()=>ground});
const initial=aircraft.snapshot();assert.equal(initial.planes.length,3);
const flightState=({challenge,...state})=>state;
const parkedToken=aircraft.captureCheckpoint();assert(parkedToken&&Object.isFrozen(parkedToken));
assert.deepEqual(Object.keys(parkedToken),[],'opaque tokens expose no editable aircraft data');
assert.throws(()=>parkedToken.activeId='jet:1',TypeError);
for(const token of [null,{},Object.freeze({}),JSON.parse(JSON.stringify(parkedToken)),structuredClone(parkedToken)]) {
  const before=aircraft.snapshot();assert.equal(aircraft.canRestoreCheckpoint(token),false);
  assert.equal(aircraft.restoreCheckpoint(token).ok,false);assert.deepEqual(aircraft.snapshot(),before);
}
const foreign=createAircraft(map,simulation).captureCheckpoint();assert.equal(aircraft.restoreCheckpoint(foreign).ok,false);
const door=p=>({x:p.x+Math.cos(p.yaw)*2.1-Math.sin(p.yaw)*1.3,z:p.z-Math.sin(p.yaw)*2.1-Math.cos(p.yaw)*1.3,yaw:p.yaw});
function board(plane) {
  const context={pose:door(plane),onFoot:true,valid:true,sandbox:false};
  assert(aircraft.interact(context).challenge);
  assert.equal(aircraft.captureCheckpoint(),null,'a partial theft challenge is not a completed step checkpoint');
  for(let cue=0;cue<8;cue++) {
    for(let i=0;i<40&&aircraft.challenge.phase!=='cue';i++)aircraft.step(.02,{},context);
    assert.equal(aircraft.challenge.phase,'cue');
    aircraft.step(.02,{challenge:{[aircraft.challenge.expectedKey]:true}},context);
    if(cue<7)aircraft.step(.02,{},context);
  }
  assert.equal(aircraft.active.id,plane.id);
}
const helicopter=initial.planes.find(p=>p.kind==='helicopter');board(helicopter);
assert.equal(aircraft.drainEvents().filter(e=>e.type==='stolen').length,1);
for(let i=0;i<700&&aircraft.active.altitude<18;i++)aircraft.step(.02,{climb:true,throttle:.25,turn:.1},{valid:true});
assert(aircraft.active.altitude>=18&&aircraft.active.airborne);
const airborne=aircraft.snapshot(),flightToken=aircraft.captureCheckpoint();assert(flightToken);
assert(Math.abs(airborne.active.verticalSpeed)>0&&Math.abs(airborne.active.speed)>0);
aircraft.reset();assert.equal(aircraft.active,null);
assert(aircraft.canRestoreCheckpoint(flightToken));assert(aircraft.restoreCheckpoint(flightToken).ok);
assert.deepEqual(flightState(aircraft.snapshot()),flightState(airborne),'active 3D pose, flight values, parked states and theft status return exactly');
assert.equal(aircraft.challenge.phase,'idle','consumed theft challenges are cleared rather than restored');
assert.deepEqual(aircraft.drainEvents(),[],'restoring a flight does not replay a boarding or theft event');
const seat=aircraft.seatPose;
assert.equal(seat.y,airborne.active.y+1.55);assert.equal(seat.yaw,airborne.active.yaw);
aircraft.step(.02,{},{valid:true});assert.notDeepEqual(aircraft.snapshot().active,airborne.active,'restored aircraft continues actual flight physics');
assert(aircraft.restoreCheckpoint(flightToken).ok,'a retry token remains usable for repeated failed attempts');
assert.deepEqual(flightState(aircraft.snapshot()),flightState(airborne));

// Capture the actual landed/exited state before the next aviation objective.
for(let i=0;i<900&&(aircraft.active.airborne||Math.abs(aircraft.active.speed)>.1);i++)aircraft.step(.02,{descend:true},{valid:true});
assert.equal(aircraft.active.airborne,false);assert(Math.abs(aircraft.active.speed)<.1);
assert(aircraft.interact({valid:true}).exited);aircraft.drainEvents();
const landed=aircraft.snapshot(),landedToken=aircraft.captureCheckpoint();assert(landedToken);
assert.equal(landed.activeId,null);assert(landed.planes.find(p=>p.id===helicopter.id).stolen);
board(initial.planes.find(p=>p.kind==='jet'));
const pending=aircraft.snapshot(),jet=landed.planes.find(p=>p.kind==='jet');
simulation.setExternalVehicles([{id:'new-obstruction',x:jet.x,z:jet.z,yaw:jet.yaw,length:4.5,width:2,active:true}]);
assert.equal(aircraft.canRestoreCheckpoint(landedToken),false);
assert.equal(aircraft.restoreCheckpoint(landedToken).ok,false);
assert.deepEqual(aircraft.snapshot(),pending,'a blocked parked plane rejects the whole restore without mutating active flight or fleet');
assert.equal(aircraft.drainEvents().filter(e=>e.type==='stolen').length,1,'failed preflight cannot consume pending live events');
simulation.setExternalVehicles([]);assert(aircraft.restoreCheckpoint(landedToken).ok);
assert.deepEqual(flightState(aircraft.snapshot()),flightState(landed),'landing position and prior unlock are restored while the later jet theft is rolled back');
assert.deepEqual(aircraft.drainEvents(),[]);
ground=NaN;assert.equal(aircraft.captureCheckpoint(),null);assert.equal(aircraft.restoreCheckpoint(parkedToken).ok,false);ground=0;
assert(aircraft.restoreCheckpoint(parkedToken).ok);assert.deepEqual(aircraft.snapshot(),initial);

aircraft.reset({absentAircraft:initial.planes.map(p=>p.id)});
const loans=aircraft.snapshot();assert(loans.planes.every(p=>p.loaner));assert.equal(loans.planes.length,2);
const loanToken=aircraft.captureCheckpoint();assert(loanToken);
aircraft.reset();assert(aircraft.restoreCheckpoint(loanToken).ok);
assert.deepEqual(aircraft.snapshot(),loans,'known bounded loan identities remain compatible with transient retries');
assert.deepEqual(aircraft.drainEvents(),[]);
console.log('PASS opaque aircraft checkpoints: active helicopter 3D flight/landing, all parked states/unlocks, repeated retry, foreign/serialized token rejection, atomic blocked preflight, no repeated theft/events and bounded loan fleet');
