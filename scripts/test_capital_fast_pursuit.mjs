import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const moduleURL=async url=>{
  let source=await readFile(url,'utf8');
  for(const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source=source.replace(match[1],await moduleURL(new URL(match[1],url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const {createSimulation,pointOnLane}=await import(await moduleURL(new URL('../Games/Capital Drive/simulation.js',import.meta.url)));
const {createPolice}=await import(await moduleURL(new URL('../Games/Capital Drive/police.js',import.meta.url)));
function fixture(points,wanted=3,buildings=[],type='primary') {
  const simulation=createSimulation({bounds:{minX:-1500,maxX:1500,minZ:-1500,maxZ:1500},spawn:{x:-1200,z:-1200},buildings,
    roads:[{id:'chase',type,points,nodes:points.map((_,i)=>i+1),width:12,speed:80,oneway:1}]},{trafficCount:0});
  Object.assign(simulation.player,{x:-1200,z:-1200});
  const start=pointOnLane(simulation.graph.edges[0],10);
  const car={id:'chase-car',...start,speed:0,active:true,length:4.8,width:1.9};
  const unit={id:car.id,...start,health:100,mode:'vehicle',speed:0,car};
  const state={police:[unit,...Array.from({length:5},(_,i)=>({id:`disabled:${i}`,x:-1200,z:-1200,health:0}))],wanted,mode:'vehicle',heat:100};
  simulation.setExternalVehicles([car]);
  return {simulation,car,unit,state,police:createPolice(simulation)};
}
const straight=fixture([[-1000,0],[1000,0]],5),target={x:-950,z:straight.car.z,yaw:-Math.PI/2,speed:34};
straight.police.report(target);
let peak=0,initial=target.x-straight.car.x;
for(let i=0;i<1200;i++) {
  target.x+=target.speed/60;straight.police.step(1/60,straight.state,target);peak=Math.max(peak,straight.car.speed);
}
assert(peak>38,'interceptor exceeds old cruise while chasing actual fast driver');
assert(target.x-straight.car.x<initial,'interceptor closes on a 34 m/s driver after acceleration');
assert.equal(straight.unit.drivingRole,'interceptor');assert.equal(straight.unit.role,'swat','driving role preserves SWAT equipment role');
const snapshot=JSON.stringify({car:straight.car,state:straight.state});
for(const dt of [0,-1,NaN]) straight.police.step(dt,straight.state,target);
assert.equal(JSON.stringify({car:straight.car,state:straight.state}),snapshot,'no supplied time means no movement or heat');
for(const wanted of [1,2]) {
  const ordinary=fixture([[-1000,0],[1000,0]],wanted), driver={x:-930,z:ordinary.car.z,speed:30};
  ordinary.police.report(driver);ordinary.police.step(1/60,ordinary.state,driver);
  assert(Math.abs(ordinary.car.speed-3.5/60)<1e-10,'ordinary acceleration is unchanged');
  for(let i=0;i<360;i++) {driver.x+=.5;ordinary.police.step(1/60,ordinary.state,driver);}
  assert(Math.abs(ordinary.car.speed-(12+wanted*2))<1e-8,'ordinary cruise is unchanged');
}
const residential=fixture([[-1000,0],[1000,0]],5,[],'residential');
const localDriver={x:-950,z:residential.car.z,speed:28};residential.police.report(localDriver);
let localPeak=0;
for(let i=0;i<600;i++){localDriver.x+=28/60;residential.police.step(1/60,residential.state,localDriver);localPeak=Math.max(localPeak,residential.car.speed);}
assert(localPeak<=30,'residential roads retain a lower straight speed ceiling');
const bend=fixture([[-250,0],[0,0],[0,250],[250,250]],3,[{id:'outside-wall',points:[[12,-50],[17,-50],[17,220],[12,220]],height:8}]);
const bendTarget={x:220,z:252,speed:38};bend.police.report(bendTarget);
let approachSpeed=Infinity,turned=false;
for(let i=0;i<1800;i++) {
  bend.police.step(1/60,bend.state,bendTarget);
  if(bend.car.x>-12 && bend.car.z<8) approachSpeed=Math.min(approachSpeed,bend.car.speed);
  if(bend.car.z>15 && bend.car.z<180) {turned=true;assert(bend.car.x<10,'bend does not overshoot through outside wall');}
  assert(bend.simulation.canOccupy(bend.car,{length:4.8,width:1.9,ignoreId:bend.car.id}),'full hull remains outside physical wall');
}
assert(approachSpeed<12,'interceptor brakes in advance of sharp turn');assert(turned,'interceptor negotiates connected bend');
straight.police.damageVehicle(straight.state,straight.car.id,100);
const wreckPose={x:straight.car.x,z:straight.car.z};
straight.police.step(1/60,straight.state,target);
assert.equal(straight.car.speed,0);assert.deepEqual({x:straight.car.x,z:straight.car.z},wreckPose);assert.equal(straight.unit.mode,'foot');
const search=fixture([[-250,0],[250,0]],3,[{id:'cover',points:[[-5,-50],[5,-50],[5,50],[-5,50]],height:8}]);
search.unit.mode='foot';Object.assign(search.unit,{x:20,z:0});search.state.heat=.2;
search.police.report({x:20,z:0});const hidden={x:-20,z:0,speed:40};
search.police.step(.05,search.state,hidden);
assert.equal(search.state.pursuit,'search');assert.equal(search.unit.seesPlayer,false);
for(let i=0;i<5;i++)search.police.step(.05,search.state,hidden);
assert.equal(search.state.wanted,0,'hidden driver cools heat instead of receiving perpetual pursuit');
console.log(`Capital fast pursuit PASS: straight peak ${peak.toFixed(1)} m/s, closing gap ${(target.x-straight.car.x).toFixed(1)} m, bend approach ${approachSpeed.toFixed(1)} m/s; collision, dt, wreck and search checks`);
