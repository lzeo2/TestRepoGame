import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {applyMapExpansion,expansionPlaces} from '../Games/Capital Drive/map-expansion.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createCampaignScenes} from '../Games/Capital Drive/campaign-scenes.js';
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
assert.equal(sharedCampaign.chapters.length,6);
for(const chapter of sharedCampaign.chapters){
 sharedCrew.clear();sharedCrew.update({mode:'campaign',character:chapter.character,mission:{...chapter,target:chapter.stages[0]},pose:fullMap.spawn},.1);
 assert.equal(sharedCrew.people.length,2,`${chapter.id} recruits both allies at its actual first objective`);
 for(const ally of sharedCrew.people){assert(fullSim.canOccupy(ally,{length:1,width:.8}));assert(fullMap.roads.some(road=>String(road.id)===ally.sourceRoadId));}
}
sharedCrew.dispose();
console.log(`PASS all six heist crews at actual source objectives; ${actualHome.name}, ${actualHome.street}, ${actualHome.roomId}, door ${actualHome.x.toFixed(3)},${actualHome.z.toFixed(3)}, approach ${actualHome.approach.x.toFixed(3)},${actualHome.approach.z.toFixed(3)}`);
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

const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL=url(await read('../assets/car-arcade/vendor/three.module.js')),THREE=await import(threeURL);
const personURL=url((await read('../Games/Capital Drive/person-model.js')).replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)));
const {appearanceForPerson}=await import(personURL);
const {createCampaignScenesView}=await import(url((await read('../Games/Capital Drive/campaign-scenes-view.js')).replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(threeURL)).replace("'./person-model.js'",JSON.stringify(personURL))));
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
