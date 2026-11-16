import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {applyMapExpansion,expansionPlaces} from '../Games/Capital Drive/map-expansion.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createCampaignScenes,campaignPassengerCapacity} from '../Games/Capital Drive/campaign-scenes.js';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
import * as WORLD_THREE from '../assets/car-arcade/vendor/three.module.js';
import {createNeighbourhoodDetails} from '../Games/Capital Drive/neighbourhood.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {selectStoryHomes} from '../Games/Capital Drive/mission-locations.js';
import {generateParkedCars} from '../Games/Capital Drive/parking-layout.js';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const map=applyMapExpansion(JSON.parse(await read('../Games/Capital Drive/data/canberra.json')),JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json')));
const barriers=JSON.parse(await read('../Games/Capital Drive/data/highway-barriers.json')).barriers.filter(item=>item.sourceLayer==='0'&&['no','false','0'].includes(item.sourceBridge));
map.barriers=[...(map.barriers||[]),...barriers];
const simulation=createSimulation(map,{trafficCount:0});
simulation.setParkedCars(generateParkedCars(map,{isClear:(x,z,radius,pose)=>simulation.canOccupy(pose,{length:4.8,width:2})}));
const scenes=createCampaignScenes(map,simulation), kingston=map.landmarks.find(place=>place.id==='kingston');
assert(scenes.meetingPoint&&Object.isFrozen(scenes.meetingPoint));
assert(simulation.canOccupy({...scenes.meetingPoint,yaw:0},{length:1,width:.8}),'meeting goal itself is physically clear');
assert(Math.hypot(scenes.meetingPoint.x-kingston.x,scenes.meetingPoint.z-kingston.z)<60,'authored approach remains in Kingston');
const mission={id:'three-receipts',stage:0,target:{...scenes.meetingPoint,radius:16}},pose={x:mission.target.x+6,z:mission.target.z+6,yaw:0};
const ctx={mode:'campaign',mission,character:'student',pose}, before=structuredClone(ctx);
scenes.update(ctx,.1);assert.deepEqual(ctx,before,'cast never changes player pose or campaign state');
assert.equal(scenes.people.length,2,'actual expanded-map Kingston supports both other protagonists with source rails and parked cars');
assert.deepEqual(scenes.people.map(p=>p.appearanceId),['player:corporate','player:basement']);
assert(Object.isFrozen(scenes.people)&&scenes.people.every(Object.isFrozen));
for(const person of scenes.people){
 assert(simulation.canOccupy(person,{length:1,width:.8}),'cast avoids source bodies/water/barriers and cars');
 assert(Math.hypot(person.x-mission.target.x,person.z-mission.target.z)<=12);
 assert(map.roads.some(road=>String(road.id)===person.sourceRoadId));
}
assert(Math.hypot(scenes.people[0].x-scenes.people[1].x,scenes.people[0].z-scenes.people[1].z)>=1.2);
assert.equal(scenes.dialogueLines.length,2);assert(Object.isFrozen(scenes.dialogueLines));
const paused=scenes.people;scenes.update(ctx,0);assert.equal(scenes.people,paused,'zero dt freezes cast descriptors');
scenes.update({...ctx,paused:true},.1);assert.equal(scenes.people,paused,'pause freezes gestures');
scenes.update(ctx,.1);assert(scenes.people[0].gesturePhase>paused[0].gesturePhase);
for(const invalid of [{mode:'free'},{recovering:true},{interior:{}},{mission:null},{mission:{...mission,stage:1}},{mission:{...mission,id:'late-parcel'}}]){
 scenes.update({...ctx,...invalid},.1);assert.equal(scenes.people.length,0,'scene exists only in the outside campaign meeting stage');scenes.update(ctx,.1);
}
scenes.update({...ctx,character:'basement'},.1);assert.deepEqual(scenes.people.map(p=>p.appearanceId),['player:student','player:corporate']);
// Sweep against the two live bodies without changing either authority's state.
const castBefore=structuredClone(scenes.people), person=scenes.people[0], other=scenes.people[1];
const separation=Math.hypot(person.x-other.x,person.z-other.z),nx=(person.x-other.x)/separation,nz=(person.z-other.z)/separation,tx=-nz,tz=nx;
const walking={x:person.x+nx*3,z:person.z+nz*3}, walkingBefore={...walking};
const stopped=scenes.clipMovement(walking,-nx*6,-nz*6);
assert(stopped.blocked,'a long sweep cannot pass through a meeting actor');
assert(Math.hypot(walking.x+stopped.dx-person.x,walking.z+stopped.dz-person.z)>=.79-1e-6);
assert(Math.hypot(stopped.dx,stopped.dz)<2.22,'sweep stops at the first body rather than tunnelling to the far side');
const sliding={x:person.x+nx*.99-tx,z:person.z+nz*.99-tz};
const slide=scenes.clipMovement(sliding,-nx*.6+tx*2,-nz*.6+tz*2);
assert(slide.blocked&&slide.dx*tx+slide.dz*tz>1,'contact preserves useful tangent movement');
assert(Math.hypot(sliding.x+slide.dx-person.x,sliding.z+slide.dz-person.z)>=.79-1e-5);
const touching={x:person.x+nx*.6,z:person.z+nz*.6};
const escape=scenes.clipMovement(touching,nx,nz);
assert(!escape.blocked&&Math.abs(escape.dx-nx)<1e-8&&Math.abs(escape.dz-nz)<1e-8,'an overlapping actor can move outward');
const physicalBeforePause=scenes.clipMovement(walking,-nx*6,-nz*6);scenes.update({...ctx,character:'basement',paused:true},.1);
assert.deepEqual(scenes.clipMovement(walking,-nx*6,-nz*6),physicalBeforePause,'pausing animation retains physical bodies');
assert.deepEqual(walking,walkingBefore);assert.deepEqual(scenes.people,castBefore,'movement clipping never mutates cast or player');
assert.deepEqual(scenes.clipMovement({x:NaN,z:0},1,0),{dx:0,dz:0,blocked:false});
scenes.clear();const free=scenes.clipMovement(walking,3,2);assert.deepEqual(free,{dx:3,dz:2,blocked:false},'clear removes physical bodies immediately');
scenes.update({...ctx,character:'basement'},.1);scenes.update({...ctx,mode:'free'},.1);
assert.deepEqual(scenes.clipMovement(walking,3,2),{dx:3,dz:2,blocked:false},'mode exit removes physical bodies immediately');
scenes.update({...ctx,character:'basement'},.1);
const blocked=createCampaignScenes(map,{canOccupy:()=>false,moveActor:()=>{throw Error('blocked candidates must not sweep');}});
blocked.update(ctx,.1);assert.equal(blocked.people.length,0,'blocked cast is omitted rather than teleported');
const original=createCampaignScenes(map,simulation);original.update({...ctx,mission:{...mission,target:{...kingston,radius:16}}},.1);assert.equal(original.people.length,0,'unsafe schematic landmark centre does not invent source pavement');
const saved={version:2,character:'student',intros:{student:['student-paper-chase','student-extra-credit'],corporate:['corporate-present-tense','corporate-lunch-breakpoint'],basement:['basement-touch-grass','basement-first-delivery']},meeting:false,legacy:false,completed:[]};
const campaign=createCampaign({...map,landmarks:[...map.landmarks,{id:'fixture-coals',name:'Coals',store:true,x:0,z:0}]},saved,{meetingPoint:scenes.meetingPoint});assert.equal(campaign.current().stages[0].x,scenes.meetingPoint.x);
// Companions recruit at a real public approach, then retain their identities and
// physical world positions across objective changes and indoor transitions.
const crewMission={id:'fixture-heist',stage:0,target:{...scenes.meetingPoint,radius:16},companions:['student','corporate','basement']};
const crewCtx={...ctx,mission:crewMission,health:100,playerMode:'foot',hostiles:[]};
const actualCrew=createCampaignScenes(map,simulation);actualCrew.update(crewCtx,.1);
assert.equal(actualCrew.people.length,2);assert.deepEqual(actualCrew.people.map(p=>p.id),['campaign-ally:corporate','campaign-ally:basement']);
for(const ally of actualCrew.people){assert.equal(ally.health,100);assert(ally.armed);assert(simulation.canOccupy(ally,{length:1,width:.8}));assert(map.roads.some(road=>String(road.id)===ally.sourceRoadId));}
for(const ally of actualCrew.people)assert(Math.hypot(ally.x-crewCtx.pose.x,ally.z-crewCtx.pose.z)<15,'initial crew recruits beside the actual player');
const actualBefore=actualCrew.people;
actualCrew.update({...crewCtx,mission:{...crewMission,stage:1,target:{x:9999,z:9999}}},.1);
for(let i=0;i<2;i++)assert(Math.hypot(actualCrew.people[i].x-actualBefore[i].x,actualCrew.people[i].z-actualBefore[i].z)<=.381,'next target cannot teleport an ally');
const mappedStores=JSON.parse(await read('../Games/Capital Drive/data/stores.json')).stores;
const mappedCoals=mappedStores.find(store=>/coals/i.test(store.name));
const fullMap={...map,landmarks:[...map.landmarks,...expansionPlaces(map),{...mappedCoals,store:true}]};
fullMap.terrainTiles=[JSON.parse(await read('../Games/Capital Drive/data/north-terrain.json')).terrain];
const fullTerrain=createTerrainSampler(fullMap),fullSim=createSimulation(fullMap,{trafficCount:0,isOnBridge:fullTerrain.isOnBridge});
fullSim.setParkedCars(generateParkedCars(fullMap,{isClear:(x,z,radius,car)=>fullSim.canOccupy(car,{length:4.8,width:2})}));
const fullHood=createNeighbourhoodDetails(new WORLD_THREE.Scene(),fullMap,fullTerrain.heightAt,{streaming:true,lowGraphics:true});
fullMap.interiorEntries=fullHood.entries;
const fullInteriors=createInteriors(fullMap,{heightAt:fullTerrain.heightAt,stores:mappedStores});
fullMap.storyHomes=selectStoryHomes(fullMap,fullInteriors.entries,{
 canApproach:outside=>!fullSim.moveActor({...outside},0,0,.45).blocked,
 roadName:outside=>fullSim.nearestRoad(outside.x,outside.z)?.road.name||''
});
const actualHome=fullMap.storyHomes.basement;
assert(actualHome&&fullInteriors.entries.some(entry=>entry.id===actualHome.roomId&&entry.buildingId===actualHome.buildingId),'finale uses a real rendered and physically approachable house');
assert(fullHood.entries.length>=4200&&fullInteriors.entries.filter(entry=>entry.type==='house').length>=2700,'full source door metadata remains present before selecting the actual story home');
fullHood.dispose();
const sharedCampaign=createCampaign(fullMap,{version:1,completed:[]}),sharedCrew=createCampaignScenes(fullMap,fullSim);
assert.equal(sharedCampaign.chapters.length,15);
for(const chapter of sharedCampaign.chapters){
 sharedCrew.clear();sharedCrew.update({mode:'campaign',character:chapter.character,mission:{...chapter,target:chapter.stages[0]},pose:fullMap.spawn},.1);
 assert.equal(sharedCrew.people.length,2,`${chapter.id} recruits both allies near the actual player`);
 for(const ally of sharedCrew.people){assert(fullSim.canOccupy(ally,{length:1,width:.8}));assert(fullMap.roads.some(road=>String(road.id)===ally.sourceRoadId));}
}
const actualTravel={...crewCtx,pose:fullMap.spawn,mission:{...crewMission,target:{x:9999,z:9999}}};
const sourceTravel=createCampaignScenes(fullMap,fullSim);sourceTravel.update({...actualTravel,pose:{...scenes.meetingPoint,yaw:0}},.1);
const sourceBefore=sourceTravel.people;
assert(sourceBefore.every(ally=>Math.hypot(ally.x-fullMap.spawn.x,ally.z-fullMap.spawn.z)>35));
sourceTravel.update(actualTravel,.1);
assert.equal(sourceTravel.people.length,2);
for(let i=0;i<2;i++) {
 const ally=sourceTravel.people[i];assert.equal(ally.id,sourceBefore[i].id);
 assert(Math.hypot(ally.x-fullMap.spawn.x,ally.z-fullMap.spawn.z)<15,'actual merged-map travel catches crew up near the player, independent of objective');
 assert(fullSim.canOccupy(ally,{length:1,width:.8}),'actual source buildings, water, rails and parked cars exclude unsafe landings');
 for(const door of fullMap.interiorEntries)assert(Math.hypot(ally.x-door.x,ally.z-door.z)>=1.4,'actual source doors retain clear space');
}
sourceTravel.dispose();sharedCrew.dispose();
console.log(`PASS all ${sharedCampaign.chapters.length} heist crews beside the actual player; ${actualHome.name}, ${actualHome.street}, ${actualHome.roomId}, door ${actualHome.x.toFixed(3)},${actualHome.z.toFixed(3)}, approach ${actualHome.approach.x.toFixed(3)},${actualHome.approach.z.toFixed(3)}`);
const fixtureMap={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},spawn:{x:-50,z:-50,yaw:0},landmarks:[{id:'kingston',x:0,z:5}],roads:[{id:'public',type:'residential',width:6,points:[[-50,0],[50,0]]}],buildings:[{id:'wall',points:[[6,-20],[6.3,-20],[6.3,20],[6,20]],height:4}]};
const crewSim=createSimulation(fixtureMap,{trafficCount:0}),crew=createCampaignScenes(fixtureMap,crewSim);
const fc={...crewCtx,mission:{...crewMission,target:{x:0,z:5,radius:16}},pose:{x:-4,z:8,yaw:0}};
crew.update(fc,.1);assert.equal(crew.people.length,2);
const frozenCrew=crew.people;crew.update(fc,0);assert.equal(crew.people,frozenCrew);
crew.update({...fc,paused:true},.1);assert.equal(crew.people,frozenCrew);assert.equal(crew.receiveHit({kind:'shot',targetId:frozenCrew[0].id,from:{x:-2,z:5},to:frozenCrew[0],damage:10}),false,'paused allies cannot take damage');
crew.update(fc,.1);
const live=crew.people[0],cop={id:'police:fixture',x:live.x+2,z:live.z,yaw:0,health:100,mode:'foot',active:true};
for(let i=0;i<20;i++)crew.update({...fc,hostiles:[cop],hasLOS:()=>false},.1);
assert.equal(crew.drainEvents().length,0,'occluded police never receive an ally shot');
for(const hostile of [{...cop,id:'civilian:1'},{...cop,mode:'vehicle'},{...cop,health:0},{...cop,active:false},{...cop,x:NaN},{...cop,x:80}]){
 for(let i=0;i<12;i++)crew.update({...fc,hostiles:[hostile]},.1);
 assert.equal(crew.drainEvents().length,0,'only bounded living foot police are eligible');
}
for(let i=0;i<20;i++)crew.update({...fc,hostiles:[cop]},.1);
const allyShots=crew.drainEvents();assert(allyShots.length>0&&allyShots.length<=4);assert.equal(crew.drainEvents().length,0);
for(const shot of allyShots){assert.equal(shot.kind,'ally-shot');assert.equal(shot.targetId,cop.id);assert.equal(shot.damage,12);assert.equal(shot.range,28);assert(Object.isFrozen(shot)&&Object.isFrozen(shot.from)&&Object.isFrozen(shot.to));assert(shot.actorId.startsWith('campaign-ally:'));assert(Math.hypot(shot.from.x-shot.to.x,shot.from.z-shot.to.z)<28);}
const cooldownCrew=createCampaignScenes(fixtureMap,crewSim);cooldownCrew.update(fc,.1);
const lastFire=new Map();let emitted=0;
for(let tick=0;tick<40;tick++){
 cooldownCrew.update({...fc,hostiles:[cop]},.1);
 for(const event of cooldownCrew.drainEvents()){
  assert(!lastFire.has(event.actorId)||tick-lastFire.get(event.actorId)>=11,'each ally observes its supplied-time firing cooldown');
  lastFire.set(event.actorId,tick);emitted++;
 }
}
assert(emitted>=4&&emitted<=8);cooldownCrew.dispose();
const combatPeople=crew.people;assert(combatPeople.every(p=>p.mode==='combat'));
const victim=combatPeople[0],hit={kind:'shot',targetId:victim.id,from:{x:victim.x+2,z:victim.z},to:{x:victim.x,z:victim.z},damage:25};
for(const bad of [{...hit,targetId:'player'},{...hit,kind:'punch'},{...hit,damage:NaN},{...hit,damage:31},{...hit,from:{x:80,z:0}},{...hit,to:{x:NaN,z:0}},{...hit,to:{x:80,z:0}},{...hit,from:{x:10,z:victim.z}}])assert.equal(crew.receiveHit(bad),false);
assert(crew.receiveHit(hit));assert.equal(crew.people[0].health,75);assert.equal(victim.health,100,'published descriptors are detached');
for(let i=0;i<3;i++)assert(crew.receiveHit(hit));assert.equal(crew.people[0].health,0);assert.equal(crew.people[0].active,false);assert.equal(crew.people[0].mode,'down');assert.equal(crew.receiveHit(hit),false);
crew.drainEvents();for(let i=0;i<20;i++)crew.update({...fc,hostiles:[cop]},.1);assert(crew.drainEvents().every(shot=>shot.actorId!==victim.id),'downed companions never shoot');
crew.update({...fc,interior:{roomId:'fixture'}},.1);assert.equal(crew.people.length,0);assert.equal(crew.receiveHit({...hit,targetId:combatPeople[1].id,to:combatPeople[1]}),false);
crew.update(fc,.1);assert.equal(crew.people[0].health,0,'entering a room cannot resurrect companions');
crew.clear();crew.update(fc,.1);assert.equal(crew.people[0].health,100,'a new mission can recruit a fresh crew');
const obstacle={id:'fixture-person',x:3,z:5,radius:.6,active:true};
crewSim.setParkedCars([{id:'fixture-car',x:1,z:9,yaw:Math.PI/2,active:true,length:4.8,width:2}]);
let moved=0;
for(let i=0;i<100;i++){
 const prior=crew.people;crewSim.setExternalPeople([...prior,obstacle]);
 crew.update({...fc,pose:{x:15,z:5,yaw:0}},.1);
 for(let j=0;j<2;j++){
  const ally=crew.people[j],travel=Math.hypot(ally.x-prior[j].x,ally.z-prior[j].z);moved+=travel;
  assert(travel<=.381,'supplied dt bounds each foot sweep');
  assert(!(ally.x>5.68&&ally.x<6.62&&ally.z>-20&&ally.z<20),'real wall cannot be crossed');
  assert(Math.hypot(ally.x-obstacle.x,ally.z-obstacle.z)>=.92-1e-6,'indexed adult bodies block ally motion');
  assert(crewSim.canOccupy(ally,{length:1,width:.8,ignorePersonId:ally.id}),'each live ally stays clear of the real car/wall/people');
 }
}
assert(moved>1,'followers actually walk using the swept world collider');
for(const exit of [{mission:null},{mode:'free'},{recovering:true},{health:0}]){crew.update({...fc,...exit},.1);assert.equal(crew.people.length,0);assert.equal(crew.drainEvents().length,0);crew.update(fc,.1);}
crew.dispose();crew.dispose();crew.update(fc,.1);assert.equal(crew.people.length,0);assert.equal(crew.receiveHit(hit),false);

// Catch-up uses real Simulation collision and supplied time, without replacing
// crew identity/health or pulling them toward a changed objective.
const travelMap={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},spawn:{x:-150,z:-150,yaw:0},landmarks:[],
 roads:[{id:'travel-road',type:'residential',width:6,points:[[-190,-30],[190,-30]]}],
 buildings:[{id:'long-wall',points:[[-.2,-100],[.2,-100],[.2,100],[-.2,100]],height:4}],
 barriers:[{id:'landing-rail',points:[[46,13],[54,13],[54,13.3],[46,13.3]]}],
 areas:[{id:'landing-water',type:'water',points:[[54,6],[59,6],[59,12],[54,12]]}],
 interiorEntries:[{x:50,z:12.5}]};
const travelSim=createSimulation(travelMap,{trafficCount:0});
travelSim.setParkedCars([{id:'landing-car',x:50,z:6,yaw:0,length:4.8,width:2,active:true}]);
const travel=createCampaignScenes(travelMap,travelSim),travelCtx={...fc,pose:{x:-50,z:10,yaw:0},mission:{...crewMission,target:{x:150,z:150}}};
travel.update(travelCtx,.1);assert.equal(travel.people.length,2);
for(const ally of travel.people)assert(Math.hypot(ally.x-travelCtx.pose.x,ally.z-travelCtx.pose.z)<=6,'distant first objective cannot recruit distant crew');
const initialTravel=travel.people,injured=initialTravel[0],dead=initialTravel[1];
const wound=ally=>({kind:'shot',targetId:ally.id,from:{x:ally.x+1,z:ally.z},to:ally,damage:25});
assert(travel.receiveHit(wound(injured)));for(let i=0;i<4;i++)assert(travel.receiveHit(wound(dead)));
const farCtx={...travelCtx,pose:{x:50,z:10,yaw:0},playerMode:'passenger'},deadBefore=travel.people[1];
const held=travel.people;
for(const frozen of [{paused:true},{}, {interior:{id:'test-room'}}]) {
 travel.update({...farCtx,...frozen},Object.keys(frozen).length? .1:0);
 if(frozen.interior)assert.equal(travel.people.length,0);else assert.equal(travel.people,held,'pause and zero dt freeze relocation');
}
const adult={id:'adult-at-landing',x:52.5,z:10,radius:.5,active:true};travelSim.setExternalPeople([...held,adult]);
travel.update(farCtx,.1);
const caught=travel.people[0];assert.equal(caught.id,injured.id);assert.equal(caught.appearanceId,injured.appearanceId);assert.equal(caught.health,75);assert.equal(caught.armed,true);
assert(Math.hypot(caught.x-farCtx.pose.x,caught.z-farCtx.pose.z)<=6,'passenger travel catches up the living crew');
assert.equal(caught.speed,0);assert.equal(caught.shot,null);assert.equal(travel.drainEvents().length,0);
assert(travelSim.canOccupy(caught,{length:1,width:.8,ignorePersonId:caught.id}));
assert(Math.hypot(caught.x-adult.x,caught.z-adult.z)>=.9);assert(Math.hypot(caught.x-50,caught.z-12.5)>=1.4,'landing leaves real doorway clear');
assert.deepEqual(travel.people[1],deadBefore,'catch-up and interior return never move or resurrect a downed ally');
travel.update({...farCtx,pose:{x:100,z:10,yaw:0},playerMode:'vehicle'},.1);
assert(Math.hypot(travel.people[0].x-caught.x,travel.people[0].z-caught.z)<=.381,'driving travel observes the shared retry cooldown');
for(let i=0;i<13;i++)travel.update({...farCtx,pose:{x:100,z:10,yaw:0},playerMode:'vehicle'},.1);
assert(Math.hypot(travel.people[0].x-100,travel.people[0].z-10)<7,'driving crew catches up after the cooldown');
travel.dispose();

const shotSim=createSimulation(travelMap,{trafficCount:0}),shotCrew=createCampaignScenes(travelMap,shotSim);
shotCrew.update(travelCtx,.1);
const nearbyCop={id:'police:catchup-fixture',mode:'foot',active:true,health:100,x:-48,z:10};
let fireFrame=null;
for(let i=0;i<15;i++) {
 const prior=shotCrew.people;shotCrew.update({...travelCtx,hostiles:[nearbyCop]},.1);
 assert(shotCrew.people.every((ally,index)=>Math.hypot(ally.x-prior[index].x,ally.z-prior[index].z)<=.381),'nearby combat engagement never snaps companions');
 if(shotCrew.people.some(ally=>ally.shot)){fireFrame=shotCrew.people;break;}
}
assert(fireFrame,'real nearby police produces a queued shot and tracer');
shotCrew.update({...travelCtx,pose:{x:80,z:30,yaw:0},hostiles:[nearbyCop]},.1);
assert.equal(shotCrew.drainEvents().length,0,'relocation discards queued shots from the old position');
for(let i=0;i<2;i++) {
 assert.equal(shotCrew.people[i].shot,null);assert.equal(shotCrew.people[i].cooldown,Math.max(0,fireFrame[i].cooldown-.1),'relocation preserves the remaining firing cooldown');
}
shotCrew.dispose();

// The wall spans the entire local fan. Actual failed foot progress for three
// seconds permits a checked landing on the player's side, below the 35m trigger.
const stuckSim=createSimulation(travelMap,{trafficCount:0}),stuckCrew=createCampaignScenes(travelMap,stuckSim);
const stuckCtx={...travelCtx,pose:{x:-12,z:10,yaw:0}};stuckCrew.update(stuckCtx,.1);
const across={...stuckCtx,pose:{x:12,z:10,yaw:0}};let caughtAcross=false;
for(let tick=0;tick<110;tick++) {
 const prior=stuckCrew.people;stuckSim.setExternalPeople(prior);stuckCrew.update(across,.1);
 for(let i=0;i<2;i++) {
  const ally=stuckCrew.people[i],distance=Math.hypot(ally.x-prior[i].x,ally.z-prior[i].z);
  if(distance>.381) {
   assert(tick>=30,'stuck catch-up requires actual attempted following time');
   assert(Math.hypot(prior[i].x-across.pose.x,prior[i].z-across.pose.z)<35,'this exercises stuck rather than distant catch-up');
   assert(ally.x>1&&Math.hypot(ally.x-12,ally.z-10)<=6);assert(stuckSim.canOccupy(ally,{length:1,width:.8,ignorePersonId:ally.id}));caughtAcross=true;
  } else assert(!(ally.x>-.52&&ally.x<.52),'ordinary foot movement cannot cross the wall');
 }
}
assert(caughtAcross,'stuck living companions escape a real wall with a checked local landing');stuckCrew.dispose();

// A completely blocked fan retains existing actors and retries on the shared
// cooldown. Count local nearest-road queries, excluding ordinary foot sweeps.
let roadQueries=0;
const retrySim=createSimulation(travelMap,{trafficCount:0}),retryAdapter={...retrySim,
 nearestRoad(x,z){roadQueries++;return retrySim.nearestRoad(x,z);}};
retrySim.setParkedCars([66,70,74].map(x=>({id:`blocked-pad:${x}`,x,z:30,yaw:0,length:16,width:4,active:true})));
const retryCrew=createCampaignScenes(travelMap,retryAdapter);retryCrew.update(travelCtx,.1);assert.equal(retryCrew.people.length,2);roadQueries=0;
const distant={...travelCtx,pose:{x:70,z:30,yaw:0},playerMode:'passenger'},retryBefore=retryCrew.people;
retryCrew.update(distant,.1);assert(roadQueries>0&&roadQueries<=50,'two actors use at most two fixed 24-candidate fans plus centre queries');
assert.deepEqual(retryCrew.people.map(p=>[p.id,p.x,p.z,p.health]),retryBefore.map(p=>[p.id,p.x,p.z,p.health]),'blocked catch-up does not invent a spawn');
const firstQueries=roadQueries;
for(let i=0;i<12;i++)retryCrew.update(distant,.1);
assert.equal(roadQueries,firstQueries,'blocked retries do not scan on every frame');
retrySim.setParkedCars([]);retryCrew.update(distant,.1);assert(roadQueries>firstQueries&&roadQueries-firstQueries<=50);
assert(retryCrew.people.every(ally=>Math.hypot(ally.x-70,ally.z-30)<=6),'a later clear fan recovers both existing allies');
assert(Math.hypot(retryCrew.people[0].x-retryCrew.people[1].x,retryCrew.people[0].z-retryCrew.people[1].z)>=1.2);
retryCrew.dispose();
let admitRecruit=false,recruitQueries=0;
const blockedRecruit=createCampaignScenes(travelMap,{...retrySim,
 nearestRoad(x,z){recruitQueries++;return retrySim.nearestRoad(x,z);},
 canOccupy(p,options){return admitRecruit&&retrySim.canOccupy(p,options);}},
 {entrances:[{id:'public-school-door',x:-50,z:12.5}]});
blockedRecruit.update(travelCtx,.1);assert.equal(blockedRecruit.people.length,0);assert(recruitQueries<=50);
const failedRecruitQueries=recruitQueries;
for(let i=0;i<12;i++)blockedRecruit.update(travelCtx,.1);
assert.equal(recruitQueries,failedRecruitQueries,'initially blocked recruitment uses the same retry cooldown');
admitRecruit=true;blockedRecruit.update(travelCtx,.1);assert.equal(blockedRecruit.people.length,2,'missing identities recruit when the fan becomes clear');
for(const ally of blockedRecruit.people)assert(Math.hypot(ally.x+50,ally.z-12.5)>=1.4,'public entry descriptors supplied by the controller stay clear');
blockedRecruit.dispose();
console.log('PASS bounded crew catch-up: actual merged-map travel, safe local fan, source doors/walls/cars/water/adults, stuck3s, passenger/driving cooldown, blocked retry query bound, pause/zero dt, indoor return and no healing/resurrection');

// Crew seats are transient attachments to the actual manual car, with checked
// paths at boarding and exit. Other transport never supplies this car authority.
assert.equal(campaignPassengerCapacity('lantern'),2);
for(const id of ['morrow','parcel','dockside','atlas'])assert.equal(campaignPassengerCapacity(id),1);
assert.equal(campaignPassengerCapacity('unknown'),0);
const seatMap={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},spawn:{x:0,z:0,yaw:0},roads:[],buildings:[],landmarks:[]};
const seatSim=createSimulation(seatMap,{trafficCount:0});
const seatCrew=createCampaignScenes(seatMap,seatSim);
const seatContext={...fc,pose:{x:0,z:6,yaw:0},car:seatSim.player,carKey:1,playerMode:'foot'};
const seatTick=(overrides={},dt=.1)=>{
 seatSim.setExternalPeople(seatCrew.people.filter(person=>!person.seated));
 seatCrew.update({...seatContext,...overrides},dt);
};
seatTick();assert.equal(seatCrew.people.length,2);
const seatIdentity=seatCrew.people.map(person=>[person.id,person.appearanceId]);
const driving={playerMode:'vehicle',pose:seatSim.player};
for(let i=0;i<80&&!seatCrew.people.every(person=>person.seated);i++)seatTick(driving);
assert(seatCrew.people.every(person=>person.seated),'both living crew actually board a stopped saloon');
assert.deepEqual(seatCrew.people.map(person=>person.seatIndex).sort(),[0,1]);
assert(seatCrew.people.every(person=>person.mode==='passenger'&&person.vehicleId==='player'&&person.vehicleKey===1&&person.carModelId==='lantern'));
assert.deepEqual(seatCrew.people.map(person=>[person.id,person.appearanceId]),seatIdentity);
const aboard=seatCrew.people;
assert(Object.isFrozen(aboard)&&aboard.every(Object.isFrozen));
const seatedHit={kind:'shot',targetId:aboard[0].id,from:{x:2,z:0},to:aboard[0],damage:25};
assert.equal(seatCrew.receiveHit({...seatedHit,from:{x:-2,z:0}}),false,'closed opposite side rejects shots through the car');
assert(seatCrew.receiveHit(seatedHit),'exposed right-side windows permit real return fire');
assert.deepEqual(seatCrew.clipMovement({x:-3,z:0},6,0),{dx:6,dz:0,blocked:false},'seats do not block street walking');
Object.assign(seatSim.player,{x:20,z:10,yaw:Math.PI/2,speed:8});
seatTick({...driving,hostiles:[{id:'police:seat',x:22,z:10,health:100,active:true,mode:'foot'}]});
for(const person of seatCrew.people){assert.equal(person.x,20);assert.equal(person.z,10);assert.equal(person.yaw,Math.PI/2);assert.equal(person.health,person.id===aboard[0].id?75:100);assert.equal(person.shot,null);}
assert.equal(seatCrew.drainEvents().length,0,'opposite-side police cannot be shot through the car');
const windowCop={id:'police:window',x:20,z:4,health:100,active:true,mode:'foot'};
for(let i=0;i<15;i++)seatTick({...driving,hostiles:[windowCop],hasLOS:()=>false});
assert.equal(seatCrew.drainEvents().length,0,'walls occlude passenger window shots');
for(let i=0;i<15;i++)seatTick({...driving,hostiles:[windowCop]});
const windowShots=seatCrew.drainEvents();assert(windowShots.length>0&&windowShots.length<=4,'armed passengers shoot at exposed-side police');
for(const shot of windowShots){assert.equal(shot.damage,12);assert(shot.from.z<9,'shot starts outside the right window');assert.equal(shot.targetId,windowCop.id);}
for(const person of seatCrew.people)assert(person.seated&&person.mode==='passenger','window fire never detaches a rider');
const frozenSeats=seatCrew.people;seatTick(driving,0);assert.equal(seatCrew.people,frozenSeats);
seatTick({...driving,paused:true});assert.equal(seatCrew.people,frozenSeats);
seatTick(driving,-1);assert.equal(seatCrew.people,frozenSeats);
Object.assign(seatSim.player,{speed:0});
// A complete occupied pad leaves both riders attached. It does not seek an
// unrelated roadside spawn, and supplied zero/negative time cannot release them.
seatSim.setParkedCars([{id:'blocked-exit-pad',x:20,z:10,yaw:0,length:16,width:4,active:true}]);
let exitQueries=0;const seatCanOccupy=seatSim.canOccupy;
seatSim.canOccupy=(...args)=>{exitQueries++;return seatCanOccupy(...args);};
for(let i=0;i<20;i++)seatTick({pose:{x:24,z:10,yaw:0},playerMode:'foot'});
assert(exitQueries>0&&exitQueries<=60,'blocked exits use bounded paths and half-second retries');
seatSim.canOccupy=seatCanOccupy;
assert(seatCrew.people.every(person=>person.seated),'blocked exits keep the actual riders seated');
seatSim.setParkedCars([]);
for(let i=0;i<10&&seatCrew.people.some(person=>person.seated);i++)seatTick({pose:{x:24,z:10,yaw:0},playerMode:'foot'});
assert(seatCrew.people.every(person=>!person.seated&&person.mode==='following'),'a later physically clear door releases existing companions');
for(const person of seatCrew.people){assert(seatSim.canOccupy(person,{length:1,width:.8,ignorePersonId:person.id}));assert(Math.hypot(person.x-20,person.z-10)<5);}
const afterExitHealth=seatCrew.people.map(person=>person.health);
for(let i=0;i<50&&!seatCrew.people.every(person=>person.seated);i++)seatTick(driving);
assert(seatCrew.people.every(person=>person.seated),'the same living companions can reenter after a checked exit');
assert.deepEqual(seatCrew.people.map(person=>person.health),afterExitHealth,'reentry preserves actual wounds');
const retainedCarPose=seatCrew.people.map(person=>[person.x,person.z]);
seatTick({...driving,car:{...seatSim.player,x:70,z:70},carKey:99});
assert(seatCrew.people.every(person=>person.vehicleKey!==99),'replacing a model/car cannot silently carry old passengers');
for(let i=0;i<seatCrew.people.length;i++)assert(Math.hypot(seatCrew.people[i].x-retainedCarPose[i][0],seatCrew.people[i].z-retainedCarPose[i][1])<5,'old-car replacement uses its retained checked exit');
seatCrew.clear();Object.assign(seatSim.player,{x:0,z:0,yaw:0,speed:0});seatTick();
for(let i=0;i<20;i++)seatTick({...driving,playerMode:'passenger'});
assert(seatCrew.people.every(person=>!person.seated),'bus/Yoober passenger mode cannot recruit manual-car seats');
for(let i=0;i<20;i++)seatTick({...driving,car:{...seatSim.player,id:'yoober-driver'}});
assert(seatCrew.people.every(person=>!person.seated),'an external driver car cannot be mistaken for the player car');
// One-seat cars never invent a second seat, dead crew stay dead, and changing
// missions clears the entire transient attachment even while hidden indoors.
seatCrew.clear();Object.assign(seatSim.player,{x:0,z:0,yaw:0,speed:0,modelId:'morrow'});
seatTick();
for(let i=0;i<80;i++)seatTick({...driving,carKey:2});
assert.equal(seatCrew.people.filter(person=>person.seated).length,1);
assert.equal(seatCrew.people.filter(person=>!person.seated).length,1);
seatCrew.clear();Object.assign(seatSim.player,{modelId:'lantern'});seatTick();
const deadSeat=seatCrew.people[0];for(let i=0;i<4;i++)assert(seatCrew.receiveHit({kind:'shot',targetId:deadSeat.id,from:{x:deadSeat.x+1,z:deadSeat.z},to:deadSeat,damage:25}));
for(let i=0;i<80;i++)seatTick(driving);
assert.equal(seatCrew.people.find(person=>person.id===deadSeat.id).health,0);
assert.equal(seatCrew.people.filter(person=>person.seated).length,1,'dead crew never revive into free seats');
seatTick({mission:{...seatContext.mission,id:'next-heist'},interior:true});assert.equal(seatCrew.people.length,0);
seatTick({mission:{...seatContext.mission,id:'next-heist'}});assert(seatCrew.people.every(person=>person.health===100&&!person.seated),'mission transition releases previous seats');
seatTick({mission:null});assert.equal(seatCrew.people.length,0);assert.equal(seatCrew.drainEvents().length,0);
seatCrew.dispose();
console.log('PASS manual-car crew seats: bounded capacity, distinct seats, identity/health preservation, live pose, no ghost bodies, window-side combat, dt/pause, blocked exit retry, downed exclusion and mission teardown');

// Leadership transfers the real two bodies. It does not recreate the third
// companion, reset a wounded hero, move the car or advance the campaign.
const exchangeSim=createSimulation({...seatMap,spawn:{x:-80,z:-80,yaw:0}},{trafficCount:0});
const exchangeScenes=createCampaignScenes(seatMap,exchangeSim);
const exchangeCtx={...fc,mission:{...fc.mission,companions:['corporate','basement']},pose:{x:0,z:10,yaw:0},health:61};
exchangeScenes.update(exchangeCtx,.1);assert.equal(exchangeScenes.people.length,2);
const initialSelected=exchangeScenes.people[0];
assert(exchangeScenes.receiveHit({kind:'shot',targetId:initialSelected.id,from:{x:initialSelected.x+1,z:initialSelected.z},to:initialSelected,damage:25}));
const selectedBefore=exchangeScenes.people[0],thirdBefore=exchangeScenes.people[1],playerCarBefore={...exchangeSim.player};
const exchangeContacts=context=>exchangeSim.setExternalPeople([...exchangeScenes.people.filter(person=>!person.seated),{id:'player-body',...context.pose,radius:.45}]);
exchangeContacts(exchangeCtx);
assert(exchangeScenes.canExchangeLeader('corporate',{...exchangeCtx,paused:true}),'choosing in the paused campaign dialog permits a checked live transfer');
for(const invalid of [{interior:true},{recovering:true},{health:0},{playerMode:'vehicle'},{mode:'free'},{pose:{x:90,z:90,yaw:0}}])assert.equal(exchangeScenes.canExchangeLeader('corporate',{...exchangeCtx,...invalid}),false);
assert.equal(exchangeScenes.canExchangeLeader('student',exchangeCtx),false);
const promoted=exchangeScenes.exchangeLeader('campaign-ally:corporate',{...exchangeCtx,paused:true,armed:false});
assert(promoted&&Object.isFrozen(promoted));assert.equal(promoted.health,75);assert.equal(promoted.id,selectedBefore.id);
assert.deepEqual(exchangeScenes.people.find(person=>person.id===thirdBefore.id),thirdBefore,'the uninvolved ally retains exact health, cooldown and shot state');
const formerLead=exchangeScenes.people.find(person=>person.id==='campaign-ally:student');
assert.equal(formerLead.armed,false,'demotion retains the supplied actual armed state');
assert.equal(formerLead.health,61);assert.equal(formerLead.x,exchangeCtx.pose.x);assert.equal(formerLead.z,exchangeCtx.pose.z);
assert.deepEqual(exchangeSim.player,playerCarBefore,'leadership never relocates or claims the player car');
assert.deepEqual(exchangeCtx.pose,{x:0,z:10,yaw:0},'scene transfer never moves the caller body');
const secondCtx={...exchangeCtx,mission:{...exchangeCtx.mission,companions:['student','basement']},character:'corporate',pose:{x:promoted.x,z:promoted.z,yaw:promoted.yaw},health:55};
exchangeContacts(secondCtx);exchangeScenes.update(secondCtx,.1);
assert.equal(exchangeScenes.people.length,2);assert(!exchangeScenes.people.some(person=>person.id===promoted.id));
assert.equal(exchangeScenes.people.find(person=>person.id===formerLead.id).health,61,'the next ordinary tick retains the transferred roster');
const returnThird=exchangeScenes.people.find(person=>person.id===thirdBefore.id);
exchangeContacts(secondCtx);
const returnPromotion=exchangeScenes.exchangeLeader('student',secondCtx);assert(returnPromotion);assert.equal(returnPromotion.health,61);
const restoredCorporate=exchangeScenes.people.find(person=>person.id==='campaign-ally:corporate');
assert.equal(restoredCorporate.health,55,'demotion uses the actual wounded player health');
assert.equal(restoredCorporate.cooldown,selectedBefore.cooldown,'returning a leader restores the existing companion cooldown');
assert.deepEqual(exchangeScenes.people.find(person=>person.id===thirdBefore.id),returnThird);
const denyCanOccupy=exchangeSim.canOccupy;exchangeSim.canOccupy=()=>false;
assert.equal(exchangeScenes.canExchangeLeader('corporate',exchangeCtx),false,'failed physical preflight denies the exchange');
assert.equal(exchangeScenes.exchangeLeader('corporate',exchangeCtx),null);exchangeSim.canOccupy=denyCanOccupy;
exchangeScenes.update({...exchangeCtx,mission:null},.1);assert.equal(exchangeScenes.people.length,0);assert.equal(exchangeScenes.canExchangeLeader('corporate',exchangeCtx),false);
exchangeScenes.dispose();
// Pose resynchronization fixes the post-physics seat anchor without ticking any
// cooldown, adding fire, releasing a door or exposing a hidden indoor roster.
const syncScenes=createCampaignScenes(seatMap,seatSim);Object.assign(seatSim.player,{x:0,z:0,yaw:0,speed:0,modelId:'lantern'});
const syncCtx={...seatContext,car:seatSim.player,pose:seatSim.player,playerMode:'vehicle'};
syncScenes.update(syncCtx,.1);
for(let i=0;i<80&&!syncScenes.people.every(person=>person.seated);i++){syncScenes.update(syncCtx,.1);seatSim.setExternalPeople(syncScenes.people.filter(person=>!person.seated));}
const syncBefore=syncScenes.people;
Object.assign(seatSim.player,{x:9,z:12,yaw:.7});assert(syncScenes.syncCarPose(seatSim.player,1));
for(let i=0;i<2;i++){assert.equal(syncScenes.people[i].x,9);assert.equal(syncScenes.people[i].z,12);assert.equal(syncScenes.people[i].yaw,.7);assert.equal(syncScenes.people[i].cooldown,syncBefore[i].cooldown);assert.equal(syncScenes.people[i].health,syncBefore[i].health);}
assert.equal(syncScenes.canExchangeLeader('corporate',{...syncCtx,playerMode:'foot',pose:{x:14,z:12,yaw:0}}),false,'seated crew cannot be promoted as a ground body');
assert.equal(syncScenes.drainEvents().length,0);assert.equal(syncScenes.syncCarPose({...seatSim.player,x:99},2),false,'other car identities cannot steal attachments');
syncScenes.update({...syncCtx,interior:true},.1);assert.equal(syncScenes.people.length,0);syncScenes.syncCarPose({...seatSim.player,x:10},1);assert.equal(syncScenes.people.length,0,'resynchronizing a hidden carrier does not republish indoor crew');
syncScenes.dispose();
console.log('PASS live leader exchanges: paused choice, real body clearance, wounded health and existing cooldown retention, stable third ally, subsequent tick/roundtrip, no car/caller writes, denied transitions and post-physics no-clock seat sync');

const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const personURL=url((await read('../Games/Capital Drive/person-model.js')).replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)));
const {appearanceForPerson}=await import(personURL);
const utilsURL=url((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace("'./three.module.js'",JSON.stringify(threeURL)));
const fleetURL=url(await read('../assets/car-arcade/fleet.js'));
const modelsURL=url((await read('../assets/car-arcade/models.js')).replace("'./vendor/three.module.js'",JSON.stringify(threeURL)).replace("'./vendor/BufferGeometryUtils.js'",JSON.stringify(utilsURL)).replace("'./fleet.js'",JSON.stringify(fleetURL)));
const {createCampaignScenesView}=await import(url((await read('../Games/Capital Drive/campaign-scenes-view.js')).replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)).replace("'../../assets/car-arcade/models.js'",JSON.stringify(modelsURL)).replace("'../../assets/car-arcade/fleet.js'",JSON.stringify(fleetURL)).replace("'./person-model.js'",JSON.stringify(personURL))));
const scene=new THREE.Scene(),view=createCampaignScenesView(scene,()=>4),root=scene.children[0];
view.update(scenes.people,mission.target);assert.equal(view.stats.people,2);assert.equal(view.stats.drawCalls,7);assert.equal(view.stats.geometries,3);assert.equal(view.stats.materials,1);
const torso=root.getObjectByName('Meeting torso'),tint=new THREE.Color();
scenes.people.forEach((p,i)=>{torso.getColorAt(i,tint);assert.equal(tint.getHex(),appearanceForPerson(p.appearanceId).shirt);});
const resources=root.children.map(mesh=>[mesh.geometry,mesh.instanceMatrix.array,mesh.instanceColor.array]);
const initialArm=[...root.getObjectByName('Meeting arms').instanceMatrix.array];scenes.update({...ctx,character:'basement'},.1);view.update(scenes.people,mission.target);assert.notDeepEqual([...root.getObjectByName('Meeting arms').instanceMatrix.array],initialArm,'supplied gesture phase animates a talking hand');
for(let i=0;i<200;i++){scenes.update({...ctx,character:'basement'},.1);view.update(scenes.people,mission.target);root.children.forEach((mesh,n)=>{assert.equal(mesh.geometry,resources[n][0]);assert.equal(mesh.instanceMatrix.array,resources[n][1]);assert.equal(mesh.instanceColor.array,resources[n][2]);});}
view.update(combatPeople,fc.pose);assert.equal(view.stats.people,2);assert.equal(view.stats.drawCalls,7);assert(root.getObjectByName('Meeting shoes').count>=10,'pooled gun silhouettes share existing box batch');
view.update(combatPeople.map(p=>({...p,shot:{from:{x:p.x,z:p.z},to:{x:p.x+2,z:p.z},remaining:.1}})),fc.pose);assert(root.getObjectByName('Meeting shoes').count>=12,'live ally shots render pooled tracers');
view.update(scenes.people,{x:9999,z:9999});assert.equal(view.stats.drawCalls,0);
view.update([{...scenes.people[0],x:NaN}],mission.target);assert.equal(view.stats.people,0);
const geometries=new Set(root.children.map(mesh=>mesh.geometry));let released=0,instances=0,materials=0;
geometries.forEach(g=>g.addEventListener('dispose',()=>released++));root.children.forEach(m=>m.addEventListener('dispose',()=>instances++));root.children[0].material.addEventListener('dispose',()=>materials++);
view.dispose();view.dispose();view.update(scenes.people,mission.target);assert.equal(released,3);assert.equal(instances,7);assert.equal(materials,1);assert.equal(scene.children.length,0);
console.log('PASS companion recruitment/following: actual source-road clearance, real swept walls/cars/people, immutable identities, bounded live-police LOS shots, cooldown/event cap, own health/death, pause/interior/cancel/recovery/dispose and seven pooled gun/tracer draws');
console.log(`PASS transient three-character meeting: actual expanded Kingston source roads/rails/parked clearance, immutable guards/pause, swept foot contacts/sliding, shared identities, gestures, seven stable pooled draws and exact disposal; approach ${scenes.meetingPoint.x.toFixed(3)},${scenes.meetingPoint.z.toFixed(3)}`);
