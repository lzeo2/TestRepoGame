import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
import {coveredCentrePassage} from '../Games/Capital Drive/covered-passage.js';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
const json=async n=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${n}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];map.lakeWaterLevel=5.93;
const terrain=createTerrainSampler(map),samplers={heightAt:terrain.heightAt,groundHeightAt:terrain.groundHeightAt,vehicleHeightAt:terrain.vehicleHeightAt,bridgeSegments:terrain.bridgeSegments};
const shots=createShotObstacles({},samplers);
for(const [id,x,z]of [['23035340-north-0',-945.1485714285715,-2568.940857142857],['1369503180-0',992.7118715706183,-2130.5979771120838]]) {
 const road=map.roads.find(r=>r.id===id),a=road.points[0],b=road.points[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
 const car={id:'lower',x,z,yaw:Math.atan2(-dx,-dz),modelId:'lantern',length:4.5,width:1.8,active:true,edge:{road}};
 const lower=terrain.vehicleHeightAt(car,road),upper=terrain.heightAt(x,z);assert(upper-lower>2,'actual source crossing separates vehicle heights');
 const ray={x:x-dx*8,y:lower+1,z:z-dz*8,dx,dy:0,dz,range:16,interiorId:null};
 const result=shots.traceHit(ray,null,[car]);assert.equal(result.vehicleId,'lower',`${id}: shot hits visible lower car`);assert(result.distance>3&&result.distance<8);
 const old=createShotObstacles({},{heightAt:terrain.heightAt});assert.notEqual(old.traceHit(ray,null,[car]).vehicleId,'lower','legacy global deck reproduces immunity');
 assert.equal(shots.traceHit(ray,null,[{...car,edge:undefined,y:lower+.18}]).vehicleId,'lower','canonical snapshot Y preserves owner without graph cycles');
 const upperRoad=map.roads.find(r=>r.id===(id.startsWith('230')?'75247036-north-0':'1290354429-0'));
 const world={bounds:{minX:x-100,maxX:x+100,minZ:z-100,maxZ:z+100},roads:[],buildings:[],areas:[],spawn:{x:x-50,z:z-50,yaw:0}};
 const sim=createSimulation(world,{trafficCount:0,vehicleHeightAt:terrain.vehicleHeightAt});sim.player.active=false;
 const overhead={id:'overhead',x,z,yaw:Math.atan2(-(upperRoad.points[1][0]-upperRoad.points[0][0]),-(upperRoad.points[1][1]-upperRoad.points[0][1])),modelId:'lantern',length:4.5,width:1.8,edge:{road:upperRoad},active:true};
 sim.setExternalVehicles([overhead]);assert(sim.canOccupy(car),'different source levels do not collide at identical X/Z');
 const moving={...car,x:x-dx*2,z:z-dz*2};assert(!sim.moveVehicle(moving,dx*4,dz*4).blocked,'swept candidate retains road owner and crosses beneath car');
 sim.setExternalVehicles([{...car,id:'same-level'}]);assert(!sim.canOccupy(car),'same-level rotated body contact remains live');
 sim.setExternalVehicles([{...overhead,id:'same-upper-level'}]);assert(!sim.canOccupy(overhead),'cars on the same upper bridge retain normal physical contact');
 const flat=createSimulation(world,{trafficCount:0});flat.player.active=false;flat.setExternalVehicles([overhead]);assert(!flat.canOccupy(car),'default flat collision contract remains unchanged');
 const walkers=createSimulation(world,{trafficCount:0,...samplers,bridgeHeightAt:terrain.bridgeHeightAt,
   actorHeightAt:body=>terrain.heightAt(body.x,body.z),actorKeepsBridgeLayer:()=>true});
 walkers.player.active=false;
 walkers.setExternalVehicles([overhead]);
 const walker={x:x-dx*2,z:z-dz*2,yaw:car.yaw};
 walkers.setActorSupport(walker,terrain.roadHeightAt(road,walker.x,walker.z));
 assert(!walkers.moveActor(walker,dx*4,dz*4).blocked,'tracked lower walker clears the real crossing under a deck vehicle');
 assert(walkers.actorSupportAt(walker)<upper-1.8,'tracked actor stays at the real lower elevation');
 console.log(`${id}: actual lower car ${lower.toFixed(3)}m, foreign deck ${upper.toFixed(3)}m; live shot and swept layer separation PASS`);
}
const segment=terrain.bridgeSegments.find(s=>s.roadId==='4878920-north-0'&&Math.hypot((s.a[0]+s.b[0])/2+906,(s.a[1]+s.b[1])/2+2784)<60);
assert(segment);const x=(segment.a[0]+segment.b[0])/2,z=(segment.a[1]+segment.b[1])/2,y=(segment.y0+segment.y1)/2;
for(const [origin,dy]of [[y-1,1],[y+1,-1]])assert(shots.trace({x,y:origin,z,dx:0,dy,dz:0,range:3,interiorId:null})<1,'source bridge slab blocks upward/downward fire');
// The real Centre ground passage and the retained overhead commercial mass use
// the shared geometry decomposition, rather than a bullet-only wall exemption.
const passage=coveredCentrePassage(map);assert(passage);
const centreShots=createShotObstacles({buildings:[passage.building],roads:map.roads},samplers);
const start=passage.a,centreY=Math.max(...passage.building.points.map(p=>terrain.heightAt(...p)))+.12+1.5;
const corridor={x:start[0],y:centreY,z:start[1],dx:passage.tx,dy:0,dz:passage.tz,range:passage.length,interiorId:null};
assert.equal(centreShots.trace(corridor),corridor.range,'Bunda passage does not retain an invisible bullet wall');
const overhead=centreShots.trace({...corridor,x:(passage.a[0]+passage.b[0])/2,z:(passage.a[1]+passage.b[1])/2,dx:0,dy:1,dz:0,range:30});assert(overhead<30,'retained Centre roof/mass provides overhead cover');
assert.equal(centreShots.trace({...corridor,x:-340,z:-4200,range:2}),0,'retained ground mass remains solid outside passage');
console.log('Capital bridge vehicle layers: PASS (actual Flynn/Parkes shots, canonical poses, swept different-level/no same-level exemption, legacy flat control, source bridge slabs and shared Centre passage)');
const empty={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[],buildings:[],areas:[],spawn:{x:0,z:0,yaw:0}};
for(const optIn of [false,true]) {
 const sim=createSimulation(empty,{trafficCount:0,...(optIn?{vehicleHeightAt:()=>0}:{})});
 Object.assign(sim.player,{x:0,z:0,y:10,vx:0,vz:0,speed:0});
 sim.setParkedCars([{id:'ground-parked',x:.5,z:0,y:0,yaw:0,modelId:'lantern'}]);
 sim.step(.05,{});
 if(optIn){assert.equal(sim.player.x,0);assert.equal(sim.player.z,0,'separate level avoids legacy post-step parked impulse');
  assert.equal(sim.nearbyVehicles(.5,0,2).find(c=>c.id==='ground-parked').y,0,'canonical live snapshots preserve explicit base height');}
 else assert(Math.hypot(sim.player.x,sim.player.z)>0,'flat default retains original parked impact');
}
const groundRoad={id:'ground-road',type:'primary',width:8,speed:50,points:[[-200,0],[200,0]]};
const trafficMap={...empty,roads:[groundRoad],spawn:{x:0,z:0,yaw:0}};
const sim=createSimulation(trafficMap,{trafficCount:1,vehicleHeightAt:()=>0});assert.equal(sim.traffic.length,1);
const edge=sim.graph.edges.find(e=>e.dx>0),car=sim.traffic[0];
Object.assign(car,{active:true,edge,position:195,x:-5,z:-edge.laneOffset,yaw:Math.atan2(-edge.dx,-edge.dz),speed:0,health:100});
Object.assign(sim.player,{x:-4,z:car.z,y:10,vx:0,vz:0,speed:0});
sim.step(.05,{});assert(car.speed>0,'ground traffic neither brakes for nor hits overhead player');
console.log('Capital bridge vehicle intervals: PASS (post-step impact level filter, canonical live height and local traffic braking)');

const bridgeRoad={id:'layered-bridge',type:'primary',width:10,points:[[-20,0],[20,0]],sourceTags:{bridge:'yes',layer:'1'}};
const rail={id:'test-parapet',kind:'bridge-parapet',roadContext:{id:bridgeRoad.id},height:1,
  points:[[-12,4.3],[12,4.3],[12,4.5],[-12,4.5]]};
const crossing={...empty,roads:[bridgeRoad],barriers:[rail],spawn:{x:0,z:4.4,yaw:0}};
const options={
  trafficCount:0, bridgeHeightAt:(x,z)=>Math.abs(z)<=5?6:null, groundHeightAt:()=>0,
  isOnBridge:(x,z,radius=0)=>Math.abs(z)+radius<=5,
  vehicleHeightAt:(body,road)=>road===bridgeRoad?6:body.supportY??0,preserveVehicleSupport:true,
  actorHeightAt:body=>Math.abs(body.z)<=5?6:0,actorKeepsBridgeLayer:()=>true,
};
const underpass=createSimulation(crossing,options);
assert(underpass.canOccupy(underpass.player),'lower car has geometric clearance beneath the parapet');
underpass.step(.05,{});
assert.equal(underpass.player.z,4.4,'live post-step overlap pass does not eject a lower car beneath a parapet');
underpass.player.supportY=6;
assert(!underpass.canOccupy(underpass.player),'upper car still hits its own parapet');
underpass.step(.05,{});
assert.notEqual(underpass.player.z,4.4,'same-layer post-step contact still resolves');

const foot=createSimulation({...crossing,spawn:{x:0,z:0,yaw:0}},options);
const gameplay=createGameplay(crossing,foot,{heightAt:(x,z)=>options.actorHeightAt({x,z})});
assert(gameplay.interact(),'can step out of a lower car underneath the deck');
assert.equal(foot.actorSupportAt(gameplay.state.actor),0,'vehicle exit inherits the lower foot level');
assert(gameplay.interact()&&gameplay.state.mode==='vehicle','can re-enter that lower car without snapping to the deck');
foot.player.active=false;
foot.setExternalVehicles([{id:'upper',x:0,z:0,y:6.18,yaw:0,active:true,modelId:'lantern'}]);
const walker={x:0,z:7};
assert(!foot.moveActor(walker,0,-7).blocked);
assert.equal(foot.actorSupportAt(walker),0,'ordinary movement from the lower approach retains its ground');
const upperWalker={x:0,z:3};
assert(foot.moveActor(upperWalker,0,2).blocked,'upper walker still hits the deck rail');

const wet={...crossing,barriers:[],areas:[{id:'sample-water',type:'water',surfaceY:1,
  points:[[-20,-4],[20,-4],[20,4],[-20,4]]}]};
const river=createSimulation(wet,options);
river.player.active=false;
const swimmer={x:5,z:7};
const result=river.moveSwimmingActor(swimmer,0,-7);
assert.equal(result.water?.y,1,'a person approaching from lower dry land enters water beneath the deck');
assert(Math.abs(river.actorSupportAt(swimmer)-.15)<1e-9,'swimmer support follows the actual water level');
const walkerOver={x:-5,z:0};river.setActorSupport(walkerOver,6);
assert.equal(river.moveSwimmingActor(walkerOver,1,0).water,null,'upper deck stays dry at the same X/Z');
assert(!river.canOccupy({x:0,z:0,yaw:0,supportY:0}),'car below the deck does not get a free road over water');
assert(river.canOccupy({x:0,z:0,yaw:0,supportY:6}),'car on the upper deck clears submerged ground');
console.log('Capital map layers: PASS (lower cars through overhead rails, lower exit and entry, sourced lower foot crossings, water below and dry deck above)');
