import assert from 'node:assert/strict';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';

const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, roads: [], buildings: [],
  spawn: { x: 200, z: 200, yaw: 0 } };
const create = () => createSimulation(map, { trafficCount: 0 });
// Independent full rectangle/circle gap, including end faces and corners.
function gap(person, car) {
  const dx=person.x-car.x,dz=person.z-car.z;
  const x=Math.abs(Math.cos(car.yaw)*dx-Math.sin(car.yaw)*dz)-car.width/2;
  const z=Math.abs(Math.sin(car.yaw)*dx+Math.cos(car.yaw)*dz)-car.length/2;
  return Math.hypot(Math.max(x,0),Math.max(z,0))+Math.min(0,Math.max(x,z))-person.radius;
}
function local(car,x,z) { return {x:car.x+Math.cos(car.yaw)*x-Math.sin(car.yaw)*z,
  z:car.z-Math.sin(car.yaw)*x-Math.cos(car.yaw)*z}; }

for (const radius of [.32,.35,.38]) for (const yaw of [0,.7,-1.2,Math.PI/2]) {
  for (const [x,z] of [[0,2.15],[1.15,0],[1.15,2.15]]) {
    const sim=create(),car={id:'car',x:0,z:0,yaw,length:4,width:2};
    const person={id:'adult',...local(car,x,z),radius};
    sim.setExternalPeople([person]);
    assert(!sim.canOccupy(car),`full OBB end/side/corner ${radius}/${yaw}/${x}/${z}`);
  }
  const sim=create(),car={id:'car',x:0,z:10,yaw,length:4,width:2};
  const person={id:'on-foot-player',...local(car,0,7),radius};
  sim.setExternalPeople([person]);
  const result=sim.moveVehicle(car,-Math.sin(yaw)*8,-Math.cos(yaw)*8);
  assert(result.blocked&&gap(person,car)>=-1e-8,'moving car stops before stationary adult');
  assert.deepEqual(person,{id:'on-foot-player',...local({x:0,z:10,yaw},0,7),radius},'physics never pushes/teleports the adult');
}

// Both directions remain physical, including external bus/ride descriptors.
for (const [id,length,width] of [['player',4,2],['traffic',4.5,1.8],['bus',10.6,2.45],['yoober',4.5,1.8]]) {
  const sim=create(),car={id,x:0,z:10,yaw:0,length,width,active:true};
  sim.setExternalVehicles([car]);
  const person={id:'adult',x:0,z:0,radius:.35};
  sim.setExternalPeople([person]);
  const result=sim.moveVehicle(car,0,-1000);
  assert(result.blocked&&gap(person,car)>=0,'bounded high displacement cannot tunnel through a person');
  for(let i=0;i<80;i++) sim.moveVehicle(car,0,-1);
  assert(gap(person,car)>=0,`${id} repeated approach stops at the adult`);
  const walker={x:car.x,z:car.z-length/2-2};
  const feet=sim.moveActor(walker,0,4,.35);
  assert(feet.blocked&&gap({...walker,radius:.35},car)>=-1e-8,`${id} also stops walking approaches`);
}

const driven=create();
Object.assign(driven.player,{x:0,z:10,yaw:0,length:4,width:2,vx:0,vz:-20});
const streetAdult={id:'pedestrian',x:0,z:0,radius:.32};
driven.setExternalPeople([streetAdult]);
for(let i=0;i<180;i++) { driven.step(.05,{throttle:1}); assert(gap(streetAdult,driven.player)>=-1e-8,'normal player driving cannot cross a stationary pedestrian'); }
const pushed=create();
Object.assign(pushed.player,{x:2.1,z:0,yaw:0,length:4,width:2});
pushed.setParkedCars([{id:'small-parked',x:0,z:0,yaw:0,length:1,width:.5}]);
const beside={id:'beside-car',x:4.5,z:0,radius:.35};
pushed.setExternalPeople([beside]);
pushed.step(.01);
assert(gap(beside,pushed.player)>=-1e-8,'legacy parked-car correction cannot push the vehicle into an adult');

// A near-tangent corner intersection can lie between every .2m endpoint.
const grazing=create(),grazingCar={id:'grazing-car',x:0,z:0,yaw:0,length:1,width:.5};
const grazer={id:'grazing-adult',x:.3207105,z:.5707105,radius:.1};
grazing.setExternalPeople([grazer]);
const grazingStart={...grazingCar,x:-.05,z:.05},grazingEnd={...grazingCar,x:.05,z:-.05};
assert(grazing.canOccupy(grazingStart)&&grazing.canOccupy(grazingEnd));
assert(!grazing.canOccupy(grazingEnd,{fromPose:grazingStart}),'exact continuous translation catches a tiny rounded-corner grazing contact');

// A corner can clip a circle between clear endpoints, even during an enormous turn request.
const turning=create(),long={id:'bus',x:0,z:0,yaw:.77,length:10.6,width:2.45};
const turnPerson={id:'corner-adult',x:5.3,z:0,radius:.32};
turning.setExternalPeople([turnPerson]);
assert(turning.canOccupy(long));
const after={...long,yaw:2.37};
assert(turning.canOccupy(after));
assert(!turning.canOccupy(after,{fromPose:long}),'angular sweep catches the body between clear endpoints');
for(let angle=.77;angle<2.37;angle+=.003) {
  const next={...long,yaw:angle};
  if(turning.canOccupy(next,{fromPose:long})) {
    for(let t=0;t<=1;t+=.002) assert(gap(turnPerson,{...long,yaw:long.yaw+(angle-long.yaw)*t})>=-1e-7,'accepted rotation stays clear at dense independent samples');
    Object.assign(long,next);
  }
}

const escape=create(),car={id:'car',x:0,z:0,yaw:0,length:4,width:2};
const touching={id:'same-owner-does-not-hide-body',x:1.2,z:0,radius:.35};
escape.setExternalPeople([touching]);
assert(!escape.canOccupy(car));
assert(!escape.moveVehicle(car,.1,0).moved,'existing overlap cannot deepen');
assert(escape.moveVehicle(car,-.1,0).moved,'braking contact can escape monotonically');
assert(!escape.moveVehicle(car,.1,0).moved,'reversing back into the same contact stays blocked');
escape.moveVehicle(car,-1,0);
assert(escape.canOccupy(car),'escaping eventually restores a clear whole body');

const ownBody=create(),footProxy={id:'player-body',x:0,z:0,yaw:0,length:1,width:.5};
ownBody.setExternalPeople([{id:'player-body',x:0,z:0,radius:.35}]);
assert(!ownBody.canOccupy(footProxy),'matching vehicle/person id never implicitly hides the person');
assert(ownBody.canOccupy(footProxy,{ignorePersonId:'player-body'}),'explicit foot proxy ignores its own body');
ownBody.setExternalPeople([{id:'player-body',x:0,z:0,radius:.35},{id:'other-adult',x:.4,z:0,radius:.35}]);
assert(!ownBody.canOccupy(footProxy,{ignorePersonId:'player-body'}),'explicit self exclusion retains every other adult');
assert(!ownBody.canOccupy(footProxy,{ignorePersonId:'wrong-body'}),'wrong identity cannot bypass contact');
assert(!ownBody.moveVehicle(footProxy,.1,0).moved,'car movement never automatically excludes a person id');

const fresh=create(),pose={id:'car',x:7.95,z:7.95,yaw:.7,length:16,width:4};
assert.equal(fresh.setExternalPeople([{id:'edge',...local(pose,0,8.1),radius:.38}]),1);
assert(!fresh.canOccupy(pose),'spatial index includes a long rotated end across cell boundaries');
assert.equal(fresh.setExternalPeople([{id:'moved',x:-100,z:-100,radius:.35}]),1);
assert(fresh.canOccupy(pose),'refresh removes the previous position without ghost contact');
assert.equal(fresh.setExternalPeople([{id:'inactive',x:pose.x,z:pose.z,active:false},
  {id:'nan',x:NaN,z:0},{id:'radius',x:0,z:0,radius:Infinity},{id:'outside',x:1e12,z:0}]),0);
assert(fresh.canOccupy(pose));
assert.equal(fresh.setExternalPeople([{id:'down-body',x:pose.x,z:pose.z,down:true,health:0}]),1);
assert(!fresh.canOccupy(pose),'down state does not silently erase a physical body');
assert.equal(fresh.setExternalPeople([]),0);
assert(fresh.canOccupy(pose),'explicit clear removes all contacts');
assert.equal(fresh.setExternalPeople(Array.from({length:1000},(_,i)=>({id:`adult:${i}`,x:-300+i%10,z:-300,radius:.35}))),256,'descriptor admission is bounded');
assert(fresh.canOccupy(pose),'distant dense crowd cannot block a local car');
assert.equal(fresh.peopleContacts.count,256);
assert(fresh.peopleContacts.cells>0);
assert.equal(fresh.peopleContacts.lastCandidates,0,'local queries never inspect distant adults');
assert(fresh.peopleContacts.maxCandidates>=1&&fresh.peopleContacts.queries>0&&fresh.peopleContacts.blocked>0);
assert.throws(()=>{fresh.peopleContacts.count=10000;},TypeError,'diagnostic statistics cannot mutate physics');
fresh.setExternalPeople([]);
assert.equal(fresh.peopleContacts.count,0);
assert.equal(fresh.peopleContacts.cells,0);

const trafficMap={...map,roads:[{id:'road',type:'residential',speed:50,oneway:1,points:[[-200,0],[200,0]]}]};
const traffic=createSimulation(trafficMap,{trafficCount:1,seed:3}),moving=traffic.traffic[0],edge=traffic.graph.edges[0];
Object.assign(moving,pointOnLane(edge,100),{edge,position:100,speed:15,active:true,length:4,width:2});
const held={id:'foot-player',...pointOnLane(edge,113),radius:.35};
traffic.setExternalPeople([held]);
for(let i=0;i<180;i++) { traffic.step(i===0?1000:1/30); assert(gap(held,moving)>=-1e-7,'live traffic never traverses stationary foot player'); }
const stopped=moving.x;
const state={...moving}; traffic.step(0); assert.deepEqual(moving,state,'zero-dt never advances or resolves bodies');
traffic.setExternalPeople([]);
for(let i=0;i<120;i++) traffic.step(1/30);
assert(moving.x>stopped+2,'clearing the contact releases traffic without stale positions');
console.log('PASS vehicle people: .32/.35/.38 radii, full OBB ends/sides/corners, both directions, high-dt caps, bus/ride bodies, dense angular sweep, monotonic escape, fresh/cleared/invalid/bounded spatial contacts, live traffic and zero-dt');
