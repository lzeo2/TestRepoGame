import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createVehicleFlight, stuntVehicleHeightAt } from '../Games/Capital Drive/vehicle-flight.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
const ramp=pose=>pose.z>=0&&pose.z<=18&&Math.abs(pose.x)<4.5?{id:'ramp',height:pose.z*3.2/18,slopeX:0,slopeZ:3.2/18}:null;
const flight=createVehicleFlight({supportAt:ramp,heightAt:()=>0});
const car={x:0,z:0,vx:0,vz:20};
for(let i=0;i<=18;i++) {car.z=i;flight.step(car,.05);assert.equal(car.stuntY,i*3.2/18+.18);}
car.z=19;flight.step(car,.05);
assert(car.stuntY>3.38,'lip launches above ramp');
assert(car.stuntVy>0,'ramp tangent launches upward');
let peak=car.stuntY,airframes=0;
while(car.stuntActive&&airframes<150) {car.z+=1;flight.step(car,.05);peak=Math.max(peak,car.stuntY||0);airframes++;}
assert(peak>3.6&&airframes>10,'meaningful ballistic airtime');
assert(!car.stuntActive&&airframes<150,'lands and clears active height');
assert(!('stuntY' in car),'landing restores normal height ownership');
// Land on actual elevated road ground, not the ramp origin or a visual offset.
let ground=0;
const raised=createVehicleFlight({supportAt:ramp,heightAt:()=>ground});
Object.assign(car,{x:0,z:18,vz:25});raised.step(car,.05);car.z=19;raised.step(car,.05);ground=2;
for(let i=0;i<100&&car.stuntActive;i++)raised.step(car,.05);
assert(!car.stuntActive,'lands on changed actual ground');
Object.assign(car,{z:10});raised.step(car,.05);raised.clear(car);
assert(!Object.keys(car).some(key=>key.startsWith('stunt')),'explicit reset clears flight state');
const map={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},roads:[],buildings:[],areas:[],spawn:{x:0,z:-8,yaw:Math.PI}};
const plain=createSimulation(map,{trafficCount:0});
for(let i=0;i<100;i++)plain.step(1/60,{throttle:1});
assert(!Object.keys(plain.player).some(key=>key.startsWith('stunt')),'no feature callback adds no normal state');
const sim=createSimulation(map,{trafficCount:0,vehicleHeightAt:()=>0,stuntSupportAt:ramp});
sim.player.vz=20;
let airborne=false;
for(let i=0;i<150;i++){sim.step(1/60,{throttle:1});if(sim.player.z>18&&sim.player.stuntY>3.38)airborne=true;}
assert(airborne,'actual simulation horizontal driving launches at lip');
sim.reset();assert(!('stuntY' in sim.player),'simulation reset clears height');
Object.assign(sim.player,{x:0,z:10,vz:20});sim.step(1/60);assert(sim.player.stuntActive);
sim.teleport({x:0,z:-10});assert(!('stuntY' in sim.player),'teleport clears height');
Object.assign(sim.player,{x:0,z:10,vz:20});sim.step(1/60);sim.setPlayerVehicle({modelId:'lantern'});
assert(!('stuntY' in sim.player),'restore/model ownership clears height');
Object.assign(sim.player,{x:0,z:10,vz:20});sim.step(1/60);
sim.setParkedCars([{id:'claim',x:30,z:30,yaw:0,modelId:'lantern'}]);
assert.equal(sim.claimVehicle('claim').ok,true);
assert(!('stuntY' in sim.player),'claim clears height');
// Elevated car envelopes stay elevated during turn and swept movement checks.
Object.assign(sim.player,{x:60,z:60,yaw:0,vx:0,vz:0,stuntActive:true,stuntY:8});
sim.setExternalVehicles([{id:'under',x:60,z:59,yaw:0,modelId:'lantern',length:4.5,width:2,y:.18}]);
assert.equal(sim.moveVehicle(sim.player,0,-.1).blocked,false,'airborne sweep clears car below');
sim.player.stuntY=.18;
assert.equal(sim.moveVehicle(sim.player,0,-.1).blocked,true,'same-level sweep keeps collision');
sim.reset();
console.log('Capital vehicle flight: ramp support, lip launch, gravity, finite landing, reset/restore and actual driving passed');

const sourceURL=new URL('../Games/Capital Drive/simulation.js',import.meta.url);
const priorSource=execFileSync('git',['show','26c6ccb0:Games/Capital Drive/simulation.js'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
const rewritten=priorSource.replace(/from ['"]([^'"]+)['"]/g,(_,path)=>`from ${JSON.stringify(new URL(path,sourceURL).href)}`);
const prior=await import(`data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`);
for(const withHeight of [false,true]) {
  const options={trafficCount:0,...(withHeight?{vehicleHeightAt:()=>0}:{})};
  const old=prior.createSimulation(map,options),current=createSimulation(map,options);
  for(let i=0;i<180;i++) {
    const input={throttle:1,steer:Math.sin(i/20)*.5,brake:i%70>60};
    old.step(1/60,input);current.step(1/60,input);
    assert.deepEqual(current.player,old.player,'all ordinary player scalar state remains exactly equal');
  }
}
console.log('Capital vehicle flight: 360 no-ramp steps exactly match pinned pre-flight player state');

assert.equal(stuntVehicleHeightAt({x:0,z:0,yaw:0}),null,'ordinary car has no stunt height');
const display={x:7,z:9,yaw:.7,vx:12,vz:4};
const displayFlight=createVehicleFlight({supportAt:()=>({id:'probe',height:3,slopeX:.2,slopeZ:.1}),heightAt:()=>0});
displayFlight.step(display,.05);
assert.equal(display.stuntX,7);assert.equal(display.stuntZ,9);
assert.equal(stuntVehicleHeightAt(display),3,'centre uses ramp base convention');
const fx=-Math.sin(display.yaw),fz=-Math.cos(display.yaw);
const front=stuntVehicleHeightAt({...display,x:display.x+fx*2,z:display.z+fz*2});
const back=stuntVehicleHeightAt({...display,x:display.x-fx*2,z:display.z-fz*2});
assert(Math.abs(Math.atan2(front-back,4)-display.stuntPitch)<1e-12,'front/back copied probes recover pitch');
displayFlight.clear(display);
assert.equal(stuntVehicleHeightAt(display),null,'reset removes pitch plane');
assert(!('stuntX' in display)&&!('stuntZ' in display),'reset removes anchors');
const falling={x:0,z:18,yaw:Math.PI,vx:0,vz:0};
const fallingFlight=createVehicleFlight({supportAt:ramp,heightAt:()=>0});
fallingFlight.step(falling,.05);falling.z=19;fallingFlight.step(falling,.05);
for(let i=0;i<5;i++)fallingFlight.step(falling,.05);
assert.equal(falling.stuntPitch,-.6,'display pitch stays bounded at zero horizontal speed');
assert(falling.stuntVy<-.6,'display clamp preserves real vertical velocity');
assert(Number.isFinite(stuntVehicleHeightAt(falling)),'stopped fall retains finite display plane');
console.log('Capital stunt presentation: anchored centre/front/back pitch probes and bounded display pitch passed');
