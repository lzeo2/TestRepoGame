import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createDeliveryService,deliverySources} from '../Games/Capital Drive/delivery-service.js';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createStreetDealers} from '../Games/Capital Drive/street-dealers.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
import {applyStreetAssetRoofs} from '../Games/Capital Drive/street-assets.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {generateParkedCars} from '../Games/Capital Drive/parking-layout.js';
const read=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`,import.meta.url),'utf8'));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const begin=performance.now(),cpuBegin=process.cpuUsage();
let map=applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(await read('canberra.json'),await read('road-profiles.json')),await read('canberra-north.json')));
map.terrainTiles=[(await read('north-terrain.json')).terrain];
map=applyAirport(map,await read('airport.json'),await read('airport-terrain.json'));
map.trafficSignals=await read('traffic-signals.json');map.lakeWaterLevel=5.93;
const sim=createSimulation(map,{trafficCount:40});sim.player.active=false;
const parked=generateParkedCars(map,{isClear:(x,z,radius,pose)=>sim.canOccupy(pose,{length:4.8,width:2})});
sim.setParkedCars(parked);
const dealers=createStreetDealers(map),career=createProgression(map,null,{extraServices:dealers.services});
const sources=deliverySources(career.services,dealers.services);
const courier=createDeliveryService(map,sim,{sources});sim.setExternalVehicles(courier.vehicles);
const dealerBodies=dealers.snapshot().map(p=>({...p,radius:.34}));sim.setExternalPeople(dealerBodies);
const report={fixture:'actual-source-domain',mode:process.argv.includes('--plan-only')?'planning':'physical',setupWallMs:performance.now()-begin,traffic:sim.traffic.length,parked:sim.parkedCars.length,signalHeads:sim.trafficLights.heads.length,
  limits:['no rendered world or native input','initial body checkpoint fixture; no player travel proof','no pedestrians, police or buses','no pool/campus/skate controller barriers'],orders:[]};
const budgetArg=process.argv.find(arg=>arg.startsWith('--cpu-budget='));
const cpuBudget=budgetArg?Number(budgetArg.split('=')[1]):Infinity;
process.on('uncaughtException',error=>{
  report.failure={message:error.message};report.interrupted=courier.snapshot();
  report.wallMs=performance.now()-begin;report.cpuMs=Object.values(process.cpuUsage(cpuBegin)).reduce((a,b)=>a+b,0)/1000;
  console.log(JSON.stringify(report,null,2));console.error(error.stack);process.exitCode=1;
});
function cpuGuard(){
  const cpu=process.cpuUsage(cpuBegin);
  if((cpu.user+cpu.system)/1e6>=cpuBudget){
    report.cpuMs=(cpu.user+cpu.system)/1000;report.wallMs=performance.now()-begin;
    report.interrupted=courier.snapshot();
    throw Error('Bounded CPU lease exceeded; partial actual-source diagnostic retained');
  }
}
function clearFoot(pose){return !sim.moveActor({...pose},0,0,.45).blocked;}
for(const kind of ['food','arms']) {
  cpuGuard();
  const candidates=sources.filter(s=>s.kind===kind).sort((a,b)=>distance(a,map.spawn)-distance(b,map.spawn));
  let chosen=null,ctx,request,quote,planMs=0,attempts=0;
  for(const source of candidates.slice(0,8)) {
    const nearby=sim.graph.edges.filter(e=>roadProfile(e.road).trafficAllowed&&e.length>18)
      .map(edge=>({edge,x:(edge.from.x+edge.to.x)/2,z:(edge.from.z+edge.to.z)/2}))
      .filter(p=>distance(p,source)>=100&&distance(p,source)<=350).sort((a,b)=>distance(a,source)-distance(b,source));
    for(const p of nearby.slice(0,10)) {
      const edge=p.edge;
      for(const side of [1,-1]) {
        const pose={x:p.x+edge.dz*(roadProfile(edge.road).driveWidth/2+1.3)*side,
          z:p.z-edge.dx*(roadProfile(edge.road).driveWidth/2+1.3)*side,yaw:edge.yaw};
        if(!clearFoot(pose))continue;
        ctx={pose,onFoot:true,sandbox:false,wanted:3};
        request={kind,sourceId:source.id,itemId:kind==='food'?'food':source.weaponIds[0]};
        const stamp=performance.now();quote=courier.quote(request,ctx);planMs+=performance.now()-stamp;attempts++;cpuGuard();
        if(quote.ok&&quote.metres<=400){chosen=source;break;}
      }
      if(chosen)break;
    }
    if(chosen)break;
  }
  assert(chosen,`No valid ${kind} actual-source quote in bounded candidate search`);
  const bookingStart=performance.now(),booking=courier.order(request,ctx),bookingMs=performance.now()-bookingStart;
  assert(booking.ok,booking.reason);
  const order={kind,source:chosen,checkpoint:ctx.pose,quoteAttempts:attempts,planMs,bookingMs,quote,booking,phase:null};report.orders.push(order);
  if(process.argv.includes('--plan-only')){order.phase=courier.phase;courier.reset();continue;}
  sim.setExternalPeople([...dealerBodies,{id:'player-body',...ctx.pose,radius:.45,active:true}]);
  let ticks=0,maxMotion=0;order.stoppedSamples=0;order.redStoppedSamples=0;
  while(courier.phase==='approaching'&&ticks<600*60) {
    const car=courier.vehicles[0],before={...car};
    sim.step(1/60,{brake:true},car);courier.step(1/60,ctx);ticks++;
    maxMotion=Math.max(maxMotion,distance(before,car));assert(maxMotion<=10/60+.001,'no teleport');
    if(ticks%60===0){
      order.seconds=ticks/60;order.finalCar={...car};order.phase=courier.phase;
      if(car.speed<.05){order.stoppedSamples++;if(Number.isFinite(sim.trafficLights.stopDistance(car,{length:car.length})))order.redStoppedSamples++;}
      cpuGuard();
    }
  }
  const final=courier.snapshot();order.phase=final.phase;order.reason=final.reason;order.seconds=ticks/60;order.finalCar=final.car;order.maxStepMetres=maxMotion;
  // The checkpoint remains fixed while the physical courier travels. Test a real,
  // clear local handover pose as a separate component fixture, without moving the car.
  let handover=null;
  if(final.phase==='waiting')for(const side of [1,-1])for(const reach of [2.6,3,3.5]) {
    const pose={x:final.car.x+Math.cos(final.car.yaw)*reach*side,z:final.car.z-Math.sin(final.car.yaw)*reach*side,yaw:final.car.yaw};
    if(!clearFoot(pose))continue;
    sim.setExternalPeople([...dealerBodies,{id:'player-body',...pose,radius:.45,active:true}]);
    const result=courier.interact({...ctx,pose});if(result.ok){handover={pose,result};break;}
  }
  order.handover=handover;order.events=courier.drainEvents();
  if(!handover)throw Error(`${kind}: ${final.phase} ${final.reason}; actual handover unavailable`);
  assert.equal(order.events.filter(e=>e.type==='completed').length,1);
  courier.reset();sim.setExternalPeople(dealerBodies);
}
report.wallMs=performance.now()-begin;report.cpuMs=Object.values(process.cpuUsage(cpuBegin)).reduce((a,b)=>a+b,0)/1000;
console.log(JSON.stringify(report,null,2));
