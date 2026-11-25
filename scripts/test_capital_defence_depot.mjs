import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {createDefenceDepotView,createDepotTankView} from '../Games/Capital Drive/defence-depot-view.js';
import {createDepotTank} from '../Games/Capital Drive/depot-tank.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {buildRoadGraph,createSimulation} from '../Games/Capital Drive/simulation.js';
import {applyStreetAssetRoofs} from '../Games/Capital Drive/street-assets.js';
import {applyRoadProfiles,createRoutePlanner} from '../Games/Capital Drive/road-network.js';
const data=async n=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${n}.json`,import.meta.url)));
const source=applyAirport(applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(await data('canberra'),await data('road-profiles')),await data('canberra-north'))),await data('airport'),await data('airport-terrain'));
const before=JSON.stringify(source),start=performance.now(),map=applyDefenceDepot(source),depot=map.defenceDepot;
const placementMilliseconds=performance.now()-start;
assert.equal(JSON.stringify(source),before,'source map remains untouched');assert.equal(applyDefenceDepot(map),map,'idempotent integration');
const missing={...source,roads:source.roads.filter(r=>r.id!=='5036453-airport-0')};
assert.equal(applyDefenceDepot(missing),missing,'missing pinned source leaves original map available');
const obstructed={...source,buildings:[...source.buildings,{id:'future-source-building',points:depot.outline}]};
assert.equal(applyDefenceDepot(obstructed),obstructed,'new source obstacle safely omits depot');
assert(Math.abs(depot.landmark.x-6001.201314547463)<1e-8&&Math.abs(depot.landmark.z+1287.8535423644714)<1e-8,'pinned depot retains proven coordinates');
assert.equal(map.roads.length,source.roads.length+1);assert.equal(map.buildings.length,source.buildings.length+3);
assert.equal(depot.gatewayWidth,12);assert(depot.landmark.aliases.includes('military base'));
assert.equal(depot.parkedVehicles.filter(v=>v.kind==='tank').length,2);
assert.equal(depot.parkedVehicles.filter(v=>v.kind==='plane').length,0,'the depot jet belongs to the flight controller');
assert(Number.isFinite(depot.jetStand?.x)&&Number.isFinite(depot.jetStand?.z));
map.barriers=[...(source.barriers||[]),...depot.fences,...depot.vehicleBarriers];
const terrain=createTerrainSampler(map),simulation=createSimulation(map,{trafficCount:0,parkedCount:0,isOnBridge:terrain.isOnBridge});
const spur=map.roads.at(-1),yaw=Math.atan2(-(spur.points[1][0]-spur.points[0][0]),-(spur.points[1][1]-spur.points[0][1]));
for(let i=1;i<spur.points.length;i++)for(let t=0;t<=1;t+=.025){const a=spur.points[i-1],b=spur.points[i],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert(simulation.canOccupy({x,z,yaw},{length:4.5,width:1.8}),'actual car body clears approach, gate and central aisle');}
for(const footprint of [...depot.fences,...depot.buildings,...depot.vehicleBarriers]){const p=footprint.points,centre=p.reduce((a,p)=>({x:a.x+p[0]/4,z:a.z+p[1]/4}),{x:0,z:0});assert.equal(simulation.canOccupy({...centre,yaw},{length:4.5,width:1.8}),false,'rendered depot fence, hangar and parked vehicle footprints remain physical');}
assert(simulation.canOccupy(depot.helipad,{length:8,width:4}),'the marked rotorcraft stand fits the ground hull');
for(const u of [-5,-2.5,0,2.5,5]){const [x,z]=depot.point(u,64);assert(simulation.canOccupy({x,z,yaw},{length:10,width:1}),'rotor clearance does not touch the hangars');}
const planner=createRoutePlanner(buildRoadGraph(map.roads)),out=planner.findEdges(map.spawn,depot.landmark),back=planner.findEdges(depot.landmark,map.spawn);
assert(out.length>40&&back.length>40,'fictional depot connects both ways to existing city road graph');
assert(out.some(e=>e.road.id==='fictional-depot-access'),'route reaches the authored entrance spur');
const scene=new THREE.Scene(),view=createDefenceDepotView(scene,map,terrain.heightAt);
assert.equal(view.stats.residentBytes,0,'distant base has no GPU buffers');view.update(depot.landmark);
assert.equal(view.stats.draws,1);assert(view.stats.triangles<1500);assert(view.stats.residentBytes<125000);
const expected={...view.stats};let geometryDigest;
scene.traverse(mesh=>{if(!mesh.isMesh)return;assert.equal(mesh.material.map,null);for(const attribute of Object.values(mesh.geometry.attributes))for(const n of attribute.array)assert(Number.isFinite(n));geometryDigest=Array.from(mesh.geometry.attributes.position.array);
  const p=mesh.geometry.attributes.position;
  let apronTriangles=0;
  for(let i=0;i<p.count;i+=3){
    const vertices=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]);
    if(!vertices.every(([x,y,z])=>Math.abs(y-terrain.heightAt(x,z)-.18)<.002))continue;
    apronTriangles++;
    const us=vertices.map(([x,,z])=>(x-depot.connection[0])*depot.tx+(z-depot.connection[1])*depot.tz);
    assert(Math.max(...us)<=-9.99||Math.min(...us)>=9.99,'apron stays clear of central asphalt and shoulders');
  }
  assert.equal(apronTriangles,48,'only the side apron tiles are rendered');});
for(let i=0;i<20;i++)view.update(depot.landmark);assert.equal(view.stats.loads,1,'idle view reuses the existing batch');
view.update({x:0,z:0});assert.equal(view.stats.residentBytes,0);view.update(depot.landmark);assert.equal(view.stats.loads,2);
scene.traverse(mesh=>{if(mesh.isMesh)assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),geometryDigest,'eviction/revisit regenerates identical original props');});
view.dispose();view.dispose();assert.equal(scene.children.length,0);
console.log('PASS fictional defence depot: preserved source, both-way route, full vehicle approach/gateway, physical fences/hangars, finite original props, one draw, eviction/revisit/disposal',JSON.stringify({placementMilliseconds:Math.round(placementMilliseconds),triangles:expected.triangles,bufferBytes:expected.residentBytes,outboundEdges:out.length,inboundEdges:back.length,place:depot.landmark}));

const tank=createDepotTank(map,simulation,{heightAt:terrain.heightAt}),model=tank.vehicle;
const tankView=createDepotTankView(scene);
assert(model?.active && !tank.isActive);
assert.equal(depot.parkedVehicles.filter(v=>v.drivable).length,1);
assert(!depot.vehicleBarriers.some(part=>part.id==='fictional-depot-parked-0-0'),'the dynamic hull owns its only collider');
simulation.setExternalVehicles([model]);
assert(!simulation.canOccupy({...model,id:'probe'},{length:4.5,width:1.8}),'parked dynamic tank blocks other vehicles');
assert.equal(tank.nearest(map.spawn),null);
const [px,pz]=depot.point(-16,23);
const startContext={pose:{x:px,z:pz},onFoot:true,valid:true};
assert(!simulation.moveActor({...startContext.pose},0,0,.45).blocked,'boarding approach is walkable');
assert(!tank.interact({...startContext,indoors:true}).ok);
assert(!tank.interact({...startContext,onFoot:false}).ok);
assert(tank.interact(startContext).stolen);
assert(tank.isActive&&tank.seatPose.id===model.id);
assert.equal(tank.seatPose,tank.seatPose,'idle seat reads reuse one pose');
tank.step(.05,{throttle:1},{valid:true,paused:true});
assert.equal(model.speed,0,'paused input leaves the tank parked');
const live={valid:true};
function driveNear([x,z]) {
  for(let i=0;i<1400&&Math.hypot(x-model.x,z-model.z)>1;i++){
    const desired=Math.atan2(model.x-x,model.z-z);
    const angle=Math.atan2(Math.sin(desired-model.yaw),Math.cos(desired-model.yaw));
    tank.step(1/60,{steer:Math.max(-1,Math.min(1,angle*4)),throttle:Math.abs(angle)<.2?.8:0},live);
  }
  assert(Math.hypot(x-model.x,z-model.z)<1.2,'actual tank hull drives through physical depot access');
}
driveNear(depot.point(0,25));
driveNear(depot.point(0,6));
driveNear(depot.point(0,-8));
assert(Math.hypot(model.x-depot.drivableTank.x,model.z-depot.drivableTank.z)>25);
assert(!tank.interact(live).ok,'a rolling tank cannot be left');
tankView.update(model,model);
assert.equal(tankView.stats.draws,1);
assert(tankView.stats.triangles<=180);
for(let i=0;i<40;i++)tank.step(1/60,{brake:true},live);
const leave=tank.interact(live);
assert(leave.ok&&leave.pose&&!tank.isActive&&tank.seatPose===null);
assert(!simulation.moveActor({...leave.pose},0,0,.45).blocked,'leaving uses a physical standable pose');
assert.equal(tank.interact({...startContext,pose:leave.pose}).stolen,false,'reboarding does not report a second theft');
tankView.update(model,map.spawn);
assert.equal(tankView.stats.draws,0);
tankView.dispose();tankView.dispose();assert.equal(scene.children.length,0);
tank.reset();assert.equal(tank.vehicle,model,'reset keeps the registered body identity');assert.equal(model.x,depot.drivableTank.x);
console.log('PASS driveable depot tank: visual and physical hull, actual gateway traversal, safe boarding/braking/exits, single theft and bounded draw');
