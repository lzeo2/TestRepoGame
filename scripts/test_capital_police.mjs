import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load = async path => import(await moduleURL(new URL(path, import.meta.url)));
const {createGameplay}=await load('../Games/Capital Drive/gameplay.js');
const {createPolice}=await load('../Games/Capital Drive/police.js');
const {createSimulation,pointOnLane}=await load('../Games/Capital Drive/simulation.js');
const map={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},spawn:{x:0,z:0,yaw:-Math.PI/2},buildings:[],roads:[
  {id:'bend',name:'Bend',type:'residential',points:[[-100,0],[0,0],[0,100],[100,100]],nodes:[1,2,3,4],width:12,speed:40,oneway:1}
]};
const simulation=createSimulation(map,{trafficCount:0});
Object.assign(simulation.player,{x:-150,z:-150});
const edge=simulation.graph.edges[0],start=pointOnLane(edge,10);
const unit={id:'police:fixture',...start,speed:0,health:100,mode:'vehicle',car:{id:'police:fixture',...start,speed:0,active:true,length:4.8,width:1.9}};
// Disabled units fill the other slots without replacing physical queries.
const disabled=()=>[1,2,3].map(i=>({id:`disabled:${i}`,x:-150,z:-150,health:0,mode:'vehicle'}));
const state={police:[unit,...disabled()],wanted:1,sandbox:false,mode:'vehicle',heat:100};
const target={x:90,z:102,speed:12};
const controller=createPolice(simulation);controller.report(target);
let maximumStep=0,maximumTurn=0,turned=false,moved=0;
for(let i=0;i<1200;i++) {
  const before={...unit.car};controller.step(1/60,state,target);
  const step=Math.hypot(unit.car.x-before.x,unit.car.z-before.z);
  maximumStep=Math.max(maximumStep,step);maximumTurn=Math.max(maximumTurn,Math.abs(Math.atan2(Math.sin(unit.car.yaw-before.yaw),Math.cos(unit.car.yaw-before.yaw))));moved+=step;
  if(unit.car.z>8 && unit.car.z<80) { turned=true; assert(unit.car.x>-20 && unit.car.x<20,'turn stays beside the routed vertical road'); }
  if(unit.car.z<70) assert(unit.car.x<20,'does not cut diagonally toward the target');
}
assert(moved>50);assert(turned);assert(maximumStep<0.4);assert(maximumTurn<=1.1/60+1e-8);
// An actual patrol turning at the bend must keep its corner clear of a standing adult.
const turning=createSimulation(map,{trafficCount:0});
Object.assign(turning.player,{x:-150,z:-150});
const turnStart=pointOnLane(turning.graph.edges[0],98);
const patrol={id:'turning-patrol',...turnStart,speed:6,length:4.8,width:1.9,active:true};
const turningUnit={id:patrol.id,...turnStart,health:100,mode:'vehicle',car:patrol};
const turningState={police:[turningUnit,...disabled()],wanted:3,mode:'vehicle',heat:100};
const standing={id:'standing-adult',x:patrol.x+2.2,z:patrol.z+1.302,radius:.35};
function personGap(pose) {
  const dx=standing.x-pose.x,dz=standing.z-pose.z;
  const across=Math.abs(Math.cos(pose.yaw)*dx-Math.sin(pose.yaw)*dz)-patrol.width/2;
  const along=Math.abs(Math.sin(pose.yaw)*dx+Math.cos(pose.yaw)*dz)-patrol.length/2;
  return Math.hypot(Math.max(0,across),Math.max(0,along))+Math.min(0,Math.max(across,along))-standing.radius;
}
assert(personGap(patrol)>0,'adult begins just clear of the patrol corner');
turning.setExternalVehicles([patrol]);turning.setExternalPeople([standing]);
const turnController=createPolice(turning);turnController.report(target);
let acceptedTurns=0;
for(let i=0;i<120;i++) {
  const before={...patrol};turnController.step(1/60,turningState,target);
  if(i===0) assert.equal(patrol.yaw,before.yaw,'blocked corner rotation preserves the prior heading');
  if(patrol.yaw!==before.yaw) acceptedTurns++;
  for(let sample=0;sample<=40;sample++) {
    const t=sample/40;
    assert(personGap({...before,yaw:before.yaw+(patrol.yaw-before.yaw)*t})>=-1e-8,'every sampled turning corner stays clear');
    assert(personGap({...patrol,x:before.x+(patrol.x-before.x)*t,z:before.z+(patrol.z-before.z)*t})>=-1e-8,'translation after heading selection stays clear');
  }
  assert(Math.hypot(patrol.x-before.x,patrol.z-before.z)<.5,'person contact never teleports the patrol');
}
assert(acceptedTurns>0,'patrol resumes turning once its corner clears the adult');
assert.deepEqual(standing,{id:'standing-adult',x:turnStart.x+2.2,z:turnStart.z+1.302,radius:.35},'patrol never pushes the adult');
console.log('Capital police: registered standing adult blocks corner rotation with dense turn/translation clearance PASS');
// A stopped patrol leaves a persistent car, pursues on foot and returns to it.
Object.assign(unit,{x:0,z:0,mode:'vehicle'});Object.assign(unit.car,{x:0,z:0,speed:0,yaw:0});
state.mode='foot';state.wanted=1;target.x=3;target.z=0;target.speed=0;
controller.step(1/60,state,target);assert.equal(unit.mode,'foot');assert.equal(unit.car.active,true);
const carPose={x:unit.car.x,z:unit.car.z};
controller.step(1/60,state,target);assert.deepEqual({x:unit.car.x,z:unit.car.z},carPose);
state.mode='vehicle';target.x=100;target.z=100;target.speed=15;
Object.assign(unit,{x:unit.car.x,z:unit.car.z-5});simulation.setExternalVehicles([unit.car]);
for(let i=0;i<300 && unit.mode==='foot';i++) controller.step(1/60,state,target);
assert.equal(unit.mode,'vehicle','officer reaches a door and reboards around its real external car collider');
simulation.setExternalVehicles([]);
// Real polygon LOS, lost sight and finite cooling are independent of road targeting.
const wallMap={...map,buildings:[{id:'wall',points:[[10,-30],[13,-30],[13,30],[10,30]],height:8}]};
const wallSim=createSimulation(wallMap,{trafficCount:0});wallSim.nearestRoad=()=>null;wallSim.canOccupy=()=>false;
const hidden={police:[{id:'hidden',x:20,z:0,yaw:0,speed:0,health:100,mode:'foot'}],wanted:3,sandbox:false,mode:'foot',heat:0.2};
const search=createPolice(wallSim);search.report({x:0,z:0});search.step(0.05,hidden,{x:0,z:0,speed:0});
assert.equal(hidden.police[0].seesPlayer,false);assert.equal(hidden.pursuit,'search');
for(let i=0;i<10;i++)search.step(0.05,hidden,{x:0,z:0,speed:0});assert.equal(hidden.wanted,0);
const shorterSearch=createPolice(wallSim,{getSearchDuration:wanted=>wanted===2?32:26});
assert.equal(shorterSearch.searchDuration(4),64,'serious escalation keeps the ordinary search timer');
const shorterState={police:[],wanted:2,mode:'foot',heat:46};
shorterSearch.report({x:0,z:0});
for(let i=0;i<639;i++)shorterSearch.step(.05,shorterState,{x:0,z:0,speed:0});
assert.equal(shorterState.wanted,2,'a shorter search still requires breaking line of sight and cooling');
shorterSearch.step(.05,shorterState,{x:0,z:0,speed:0});
shorterSearch.step(.05,shorterState,{x:0,z:0,speed:0});
assert.equal(shorterState.wanted,0);
const storyGameplay=createGameplay(map,simulation,{getSearchDuration:wanted=>wanted===2?32:undefined});
assert(storyGameplay.reportOffence('suspect vehicle',2,{witnessed:true}));
assert.equal(storyGameplay.state.heat,32);
// Equipment, recovery actions and occupied taking use public gameplay interfaces.
const game=createGameplay(map,simulation);assert.equal(game.setWeapon('pistol'),false);assert.equal(game.state.ammo,0);
let owns=false, exits=[],penalties=[];
const armed=createGameplay(map,simulation,{hasPistol:()=>owns,onCarjacked:p=>exits.push(p),onRespawn:r=>penalties.push(r)});
assert(armed.addAmmo(24));assert.equal(armed.setWeapon('pistol'),false);owns=true;assert(armed.setWeapon('pistol'));assert.equal(armed.state.ammo,12);assert.equal(armed.state.reserveAmmo,12);
armed.setWeapon('unarmed');armed.setWeapon('pistol');assert.equal(armed.state.reserveAmmo,12,'switching never grants ammunition');
armed.interact();Object.assign(armed.state.actor,{x:0,z:0});
let moving=4,claimed=0,stops=0;
const originalNear=simulation.nearbyVehicles,originalClaim=simulation.claimVehicle;
simulation.nearbyVehicles=()=>[{id:'traffic:fixture',x:3,z:0,yaw:0,speed:moving,occupied:true}];
simulation.requestVehicleStop=()=>{stops++;};
simulation.claimVehicle=()=>{claimed++;return {ok:true,vehicle:{modelId:'relay'},stolen:true};};
assert.equal(armed.interact(),false);for(let i=0;i<150;i++)armed.step(1/60);assert.equal(claimed,0);assert(stops>100);
moving=0;armed.step(1/60);assert.equal(armed.state.carjacking,null,'taking an occupied stopped car has no puzzle');
assert.equal(claimed,1);assert.equal(exits.length,1);assert.equal(exits[0].x,5);
simulation.nearbyVehicles=originalNear;simulation.claimVehicle=originalClaim;
armed.state.health=0;const before={x:simulation.player.x,z:simulation.player.z};armed.step(1/60);
assert.equal(armed.state.recovery.phase,'out');assert.deepEqual({x:simulation.player.x,z:simulation.player.z},before);assert.equal(penalties.length,0);
assert.equal(armed.interact(),false);assert.equal(armed.setWeapon('unarmed'),false);assert.equal(armed.heal(50),false);assert.equal(armed.addAmmo(50),false);assert.equal(armed.reload(),false);
for(let i=0;i<100;i++)armed.step(1/60,{fire:true});assert.equal(penalties.length,0);
for(let i=0;i<20;i++)armed.step(1/60);assert.equal(penalties.length,1);assert.equal(armed.state.recovery.phase,'in');
for(let i=0;i<100;i++)armed.step(1/60);assert.equal(armed.state.recovery,null);assert.equal(penalties.length,1);
console.log('Capital police: directed turn/brake inertia, persistent patrol/dismount/reboard, polygon LOS/cooling, gated ammo, occupied carjacking after a stop and single delayed recovery PASS');
// Exact source geography/profiles and the real swept collision API, including patrol blockers.
const {applyRoadProfiles,roadProfile}=await load('../Games/Capital Drive/road-network.js');
const actualSource=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
const profiles=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/road-profiles.json',import.meta.url),'utf8'));
const actual=createSimulation(applyRoadProfiles(actualSource,profiles),{trafficCount:0});
let chaseResult=null;
for(const e of actual.graph.edges.filter(e=>e.length>110 && roadProfile(e.road).trafficAllowed).slice(0,30)) {
  const carPose=pointOnLane(e,8),end=pointOnLane(e,Math.min(e.length-10,95));
  const target={x:end.x+Math.cos(e.yaw)*3.5,z:end.z-Math.sin(e.yaw)*3.5,speed:0};
  if(!actual.canOccupy(carPose,{length:4.8,width:1.9}) || actual.moveActor({...target},0,0,0.45).blocked || !actual.hasLineOfSight(carPose,target))continue;
  const car={id:'measured-patrol',...carPose,speed:0,length:4.8,width:1.9,active:true};
  const officer={id:car.id,...carPose,speed:0,health:100,mode:'vehicle',car};
  // Three disabled units occupy the other capacity slots; only this unit is under test.
  const measured={police:[officer,...[1,2,3].map(i=>({id:`disabled:${i}`,x:actualSource.spawn.x,z:actualSource.spawn.z,health:0,mode:'vehicle'}))],wanted:3,mode:'foot',heat:100};
  const chase=createPolice(actual);chase.report(target);let travelled=0,dismounted=false,largestStep=0;
  for(let i=0;i<1800;i++) {
    actual.setExternalVehicles([car]);
    const before={x:car.x,z:car.z};chase.step(1/60,measured,target);
    const step=Math.hypot(car.x-before.x,car.z-before.z);travelled+=step;largestStep=Math.max(largestStep,step);
    if(officer.mode==='foot') {dismounted=true;break;}
  }
  actual.setExternalVehicles([]);
  if(travelled>30 && dismounted) {chaseResult={road:e.road.id,travelled,dismounted,largestStep,target};break;}
}
assert(chaseResult,'a source-road patrol travels over30m and dismounts for a reachable stationary adult');
assert(chaseResult.largestStep<0.5,'real patrol collision never teleports');
console.log('Capital police actual profile chase:',JSON.stringify(chaseResult));
const actualSpawnState={police:[],wanted:3,mode:'foot',heat:100};
createPolice(actual).step(1/60,actualSpawnState,chaseResult.target);
assert(actualSpawnState.police.length>0 && actualSpawnState.police.length<=4,'clear actual public lanes spawn bounded patrols');
for(const unit of actualSpawnState.police) {
  const d=Math.hypot(unit.car.x-chaseResult.target.x,unit.car.z-chaseResult.target.z);
  assert(d>=69.9 && d<=200.1);
  assert(actual.canOccupy(unit.car,{length:unit.car.length,width:unit.car.width}));
}
console.log('Capital police actual public-lane spawn:',actualSpawnState.police.length);

// An immovable car produces bounded braking/reverse/replan attempts, never a position reset.
const blockedSimulation=createSimulation(map,{trafficCount:0});Object.assign(blockedSimulation.player,{x:-150,z:-150});
const blockedStart=pointOnLane(blockedSimulation.graph.edges[0],15);
const blockedCar={id:'blocked-unit',...blockedStart,speed:0,length:4.8,width:1.9,active:true};
const blocker={id:'obstacle',...pointOnLane(blockedSimulation.graph.edges[0],45),length:5,width:2,active:true};
const blockedUnit={id:blockedCar.id,...blockedStart,speed:0,mode:'vehicle',health:100,car:blockedCar};
const blockedState={police:[blockedUnit,...[1,2,3].map(i=>({id:`inactive:${i}`,x:-150,z:-150,health:0}))],wanted:3,mode:'vehicle',heat:100};
const retry=createPolice(blockedSimulation);const fleeing={x:95,z:100,speed:15};retry.report(fleeing);
let reversed=false;
for(let i=0;i<1800;i++) {
  blockedSimulation.setExternalVehicles([blockedCar,blocker]);const before={x:blockedCar.x,z:blockedCar.z};retry.step(1/60,blockedState,fleeing);
  reversed ||= blockedCar.speed<0;
  assert(Math.hypot(blockedCar.x-before.x,blockedCar.z-before.z)<0.5);
  assert(blockedCar.x<blocker.x,'stuck recovery never phases through the parked obstacle');
}
assert(reversed,'stationary destination still triggers a bounded recovery retry');
console.log('Capital police: real external-car door boarding and bounded obstacle retry PASS');

// Fleeing foot targets use the same physical door and a cached route ETA decision.
const chaseMap={bounds:{minX:-500,maxX:500,minZ:-200,maxZ:200},spawn:{x:0,z:-150},buildings:[],roads:[
  {id:'long',type:'residential',points:[[-400,0],[400,0]],nodes:[1,2],width:12,speed:40,oneway:1}]};
function returnFixture({carDistance=10,targetDistance=100,blocked=false,offRoad=false,speed=6.8}={}) {
  const sim=createSimulation(chaseMap,{trafficCount:0});Object.assign(sim.player,{x:0,z:-150});
  const pose=pointOnLane(sim.graph.edges[0],150);
  const car={id:'eta-patrol',...pose,x:pose.x-carDistance+10,speed:0,length:4.8,width:1.9,active:true};
  if(offRoad)car.z=100;
  const officer={id:car.id,x:pose.x+10,z:pose.z+3,yaw:0,speed:0,health:100,mode:'foot',car};
  const status={police:[officer,...disabled()],wanted:1,mode:'foot',weapon:'unarmed',heat:100};
  const fleeing={x:officer.x+targetDistance,z:pose.z+3,speed};
  sim.setExternalVehicles([car]);
  let probes=0;const canOccupy=sim.canOccupy;
  sim.canOccupy=(...args)=>{probes++;return !blocked && canOccupy(...args);};
  const ai=createPolice(sim);ai.report(fleeing);
  return {sim,officer,status,fleeing,ai,probes:()=>probes};
}
const efficient=returnFixture();const originalX=efficient.officer.x;
efficient.ai.step(1/60,efficient.status,efficient.fleeing);
assert(efficient.officer.x<originalX,'a fleeing foot target makes the officer return when car ETA wins');
const firstProbes=efficient.probes();
for(let i=0;i<25;i++)efficient.ai.step(1/60,efficient.status,efficient.fleeing);
assert(efficient.probes()-firstProbes<=26,'door safety may refresh but route/probe decision is cached for one second');
const frozenPolice=structuredClone(efficient.status);efficient.ai.step(0,efficient.status,efficient.fleeing);
assert.deepEqual(efficient.status,frozenPolice,'pause freezes return decisions and movement');
for(let i=0;i<600 && efficient.officer.mode==='foot';i++)efficient.ai.step(1/60,efficient.status,efficient.fleeing);
assert.equal(efficient.officer.mode,'vehicle','fleeing foot pursuit reaches a clear door before driving');
for(const settings of [{targetDistance:40},{carDistance:95},{blocked:true},{offRoad:true},{speed:0}]) {
  const fixture=returnFixture(settings),x=fixture.officer.x;
  fixture.ai.step(1/60,fixture.status,fixture.fleeing);
  assert(fixture.officer.x>x,`no pointless return for ${JSON.stringify(settings)}`);
}
// Start close to the stopped patrol, then actually advance the sprinting target.
// A static-distance ETA would keep running until the car becomes too far away.
const sprinting=returnFixture({targetDistance:15,speed:0});
sprinting.fleeing.yaw=-Math.PI/2;
for(let i=0;i<20;i++)sprinting.ai.step(1/60,sprinting.status,sprinting.fleeing);
sprinting.fleeing.speed=6.8;
let returned=false,walkedBack=false,maxCarGap=0;
for(let frame=0;frame<900;frame++) {
  sprinting.fleeing.x+=sprinting.fleeing.speed/60;
  const beforeX=sprinting.officer.x;
  sprinting.ai.step(1/60,sprinting.status,sprinting.fleeing);
  if(sprinting.officer.mode==='foot') {
    walkedBack ||= sprinting.officer.x<beforeX;
    maxCarGap=Math.max(maxCarGap,Math.hypot(sprinting.officer.x-sprinting.officer.car.x,sprinting.officer.z-sprinting.officer.car.z));
  } else {returned=true;break;}
}
assert(walkedBack && returned,'a near sprinting fugitive triggers a real walk back and boarding');
assert(maxCarGap<25,'the officer chooses the fresh patrol before running beyond its return radius');
const boardedX=sprinting.officer.car.x;
for(let frame=0;frame<120;frame++) {
  sprinting.fleeing.x+=sprinting.fleeing.speed/60;
  sprinting.ai.step(1/60,sprinting.status,sprinting.fleeing);
}
assert(sprinting.officer.car.x>boardedX+3,'the returned officer actually drives the routed patrol after the moving fugitive');

const approaching=returnFixture({targetDistance:15,speed:6.8});approaching.fleeing.yaw=Math.PI/2;
const approachingX=approaching.officer.x;approaching.ai.step(1/60,approaching.status,approaching.fleeing);
assert(approaching.officer.x>approachingX,'a fast target approaching the officer still has a cheap foot interception');
// Actual sidearm fire requires a live visible target and proportional force.
const firing=returnFixture({targetDistance:20,speed:0});firing.status.health=100;
for(let i=0;i<120;i++)firing.ai.step(1/60,firing.status,firing.fleeing);
assert.equal(firing.ai.drainEvents().length,0,'one-star unarmed alarm never authorizes gunfire');
firing.status.wanted=3;firing.fleeing.x=firing.officer.x+15;
for(let i=0;i<80;i++)firing.ai.step(1/60,firing.status,firing.fleeing);
const shots=firing.ai.drainEvents();assert(shots.length>0 && shots.length<=2);
for(const shot of shots) {assert.equal(shot.targetId,'player');assert.equal(shot.damage,9);assert(firing.sim.hasLineOfSight(shot.from,shot.to));}
const armedThreat=returnFixture({targetDistance:20,speed:0});
armedThreat.status.health=100;armedThreat.status.weapon='pistol';armedThreat.status.aiming=true;
for(let i=0;i<45;i++)armedThreat.ai.step(1/60,armedThreat.status,armedThreat.fleeing);
assert(armedThreat.ai.drainEvents().some(shot=>shot.targetId==='player'),'actual low-star aimed firearm authorizes defensive gunfire');
const pauseFire=structuredClone(firing.status);firing.ai.step(0,firing.status,firing.fleeing);
assert.deepEqual(firing.status,pauseFire);assert.deepEqual(firing.ai.drainEvents(),[]);
const coverSim=createSimulation(wallMap,{trafficCount:0});
const covered={id:'cover-officer',x:23,z:0,health:100,mode:'foot',yaw:0,speed:0,car:{id:'cover-car',x:25,z:0,yaw:0,speed:0,length:4.8,width:1.9}};
const coverState={police:[covered,...disabled()],wanted:3,mode:'foot',weapon:'unarmed',health:100,heat:100};
const ally={id:'campaign-ally:test',x:24,z:10,health:100,active:true,armed:true};
const coverAI=createPolice(coverSim,{getAllies:()=>[ally]});coverAI.report({x:0,z:0});
for(let i=0;i<70;i++)coverAI.step(1/60,coverState,{x:0,z:0,speed:0});
const allyShots=coverAI.drainEvents();assert(allyShots.some(shot=>shot.targetId===ally.id));
assert(allyShots.every(shot=>shot.targetId!=='player'),'wall blocks actual player-target shots');
ally.health=0;for(let i=0;i<80;i++)coverAI.step(1/60,coverState,{x:0,z:0,speed:0});
assert.equal(coverAI.drainEvents().length,0,'dead allies cannot be targeted');
ally.health=100;coverState.wanted=1;ally.mode='idle';
for(let i=0;i<80;i++)coverAI.step(1/60,coverState,{x:0,z:0,speed:0});
assert.equal(coverAI.drainEvents().length,0,'a low-star idle armed ally is not an active threat');
ally.mode='combat';
for(let i=0;i<80;i++)coverAI.step(1/60,coverState,{x:0,z:0,speed:0});
assert(coverAI.drainEvents().some(shot=>shot.targetId===ally.id),'actual ally combat authorizes defensive fire below three stars');
ally.mode='idle';ally.shot={remaining:.1};
for(let i=0;i<80;i++)coverAI.step(1/60,coverState,{x:0,z:0,speed:0});
assert(coverAI.drainEvents().some(shot=>shot.targetId===ally.id),'a live ally shot also authorizes defensive fire');
console.log('Capital police: cached foot/car ETA, physical door, refusal cases, pause, proportional sidearm fire, covered player and live ally target PASS');

// Room coordinates are deliberately distant from the real outside door: only the
// checked door transition may cross spaces; ordinary steps remain swept movement.
function indoorFixture({known=true,safehouse=false}={}) {
  const sim=createSimulation(chaseMap,{trafficCount:0});
  Object.assign(sim.player,{x:-300,z:-150});
  let paths=0,moves=0,los=true,clear=true;
  const room={id:'room:a',known,safehouse,playerInside:true,
    outside:{x:0,z:10,yaw:0},inside:{x:1000,z:1000},exit:{x:1000,z:1000},floorY:0,
    moveActor(actor,dx,dz){moves++; if(!clear)return {blocked:true}; actor.x+=dx;actor.z+=dz;return {blocked:false};},
    hasLineOfSight:()=>los,
    nextWaypoint(from,to){paths++;return to;}};
  let active=room;
  const car={id:'room-officer',x:0,z:7,yaw:0,speed:0,length:4.8,width:1.9,active:true};
  const officer={id:car.id,x:0,z:15,yaw:0,speed:0,health:100,mode:'foot',interiorId:null,car};
  const status={police:[officer,...disabled()],wanted:3,mode:'foot',weapon:'unarmed',health:100,heat:100};
  const player={x:1008,z:1000,speed:0};
  const ai=createPolice(sim,{getInterior:()=>active,resolveInterior:id=>id===room.id?room:null});
  return {sim,room,officer,status,player,ai,paths:()=>paths,moves:()=>moves,
    setActive:value=>{active=value;},setLOS:value=>{los=value;},setClear:value=>{clear=value;}};
}
const indoor=indoorFixture();
indoor.ai.step(1/60,indoor.status,indoor.player);
assert.equal(indoor.officer.interiorId,null,'distant foot officer cannot remotely enter');
assert.equal(indoor.ai.drainEvents().length,0,'outside police cannot shoot across room boundary');
for(let i=0;i<100 && !indoor.officer.interiorId;i++)indoor.ai.step(1/60,indoor.status,indoor.player);
assert.equal(indoor.officer.interiorId,indoor.room.id,'officer walks to the checked outside door before entry');
assert.equal(indoor.officer.mode,'foot');assert.equal(indoor.officer.car.z,7,'car remains outside');
const indoorStart={...indoor.officer};
indoor.ai.step(1/60,indoor.status,indoor.player);
assert(indoor.paths()>0 && indoor.moves()>0,'retained room navigation and mover own indoor pursuit');
assert(Math.hypot(indoor.officer.x-indoorStart.x,indoor.officer.z-indoorStart.z)<.1,'indoor pursuit uses bounded walking');
indoor.ai.drainEvents();indoor.setLOS(false);
for(let i=0;i<80;i++)indoor.ai.step(1/60,indoor.status,indoor.player);
assert.equal(indoor.ai.drainEvents().length,0,'interior walls block police gunfire');
assert.equal(indoor.status.arrestProgress,0,'interior walls block arrest');
indoor.setLOS(true);indoor.player.x=indoor.officer.x+10;
for(let i=0;i<70;i++)indoor.ai.step(1/60,indoor.status,indoor.player);
const roomShots=indoor.ai.drainEvents();
assert(roomShots.length>0 && roomShots.length<=2);
assert(roomShots.every(shot=>shot.interiorId===indoor.room.id && shot.damage===9),'room shots retain space and original damage');
const frozenRoom=structuredClone(indoor.status);const beforePaths=indoor.paths();
indoor.ai.step(0,indoor.status,indoor.player);
assert.deepEqual(indoor.status,frozenRoom);assert.equal(indoor.paths(),beforePaths,'pause never invokes navigation');
// A new current room cannot drag officers across the city: they walk to their
// original exit through the retained context, then cross its own door only.
indoor.room.playerInside=false;
indoor.setActive({...indoor.room,id:'room:b',outside:{x:200,z:10},inside:{x:2000,z:2000}});
let exited=false;
for(let i=0;i<240;i++) {
  const before={...indoor.officer};indoor.ai.step(1/60,indoor.status,{x:2008,z:2000,speed:0});
  assert.equal(indoor.ai.drainEvents().length,0,'old-room police cannot fire into a different room');
  if(!indoor.officer.interiorId){assert(Math.hypot(before.x-1000,before.z-1000)<=1.5);exited=true;break;}
  assert(Math.hypot(indoor.officer.x-before.x,indoor.officer.z-before.z)<.1);
  assert.equal(indoor.officer.mode,'foot','inside police cannot reboard their outside car');
}
assert(exited,'retained-room officer physically reaches the old exit');
assert(Math.hypot(indoor.officer.x,indoor.officer.z-10)<.1);
const unseen=indoorFixture({known:false});Object.assign(unseen.officer,unseen.room.outside);
for(let i=0;i<60;i++)unseen.ai.step(1/60,unseen.status,unseen.player);
assert.equal(unseen.officer.interiorId,null,'unwitnessed entry never grants room knowledge');
unseen.ai.report(unseen.player);
for(let i=0;i<90 && !unseen.officer.interiorId;i++)unseen.ai.step(1/60,unseen.status,unseen.player);
assert.equal(unseen.officer.interiorId,unseen.room.id,'real reported indoor offense identifies its room');
const protectedRoom=indoorFixture({safehouse:true});Object.assign(protectedRoom.officer,protectedRoom.room.outside);
for(let i=0;i<120;i++)protectedRoom.ai.step(1/60,protectedRoom.status,protectedRoom.player);
assert.equal(protectedRoom.officer.interiorId,null,'safehouse is never entered');
assert.equal(protectedRoom.ai.drainEvents().length,0);assert.equal(protectedRoom.status.arrestProgress,0);
assert(protectedRoom.status.wanted>0,'safehouse does not instantly clear wanted state');
const blockedRoom=indoorFixture();Object.assign(blockedRoom.officer,blockedRoom.room.outside);blockedRoom.setClear(false);
blockedRoom.ai.step(1/60,blockedRoom.status,blockedRoom.player);
assert.equal(blockedRoom.officer.interiorId,null,'blocked interior landing refuses entry');
const occupiedDoor=indoorFixture();Object.assign(occupiedDoor.officer,occupiedDoor.room.outside);
Object.assign(occupiedDoor.player,occupiedDoor.room.inside);
occupiedDoor.ai.step(1/60,occupiedDoor.status,occupiedDoor.player);
assert.equal(occupiedDoor.officer.interiorId,null,'entry never overlaps player at the inside landing');
occupiedDoor.room.known=false;occupiedDoor.ai.reset();
occupiedDoor.player.x+=4;
occupiedDoor.ai.step(1/60,occupiedDoor.status,occupiedDoor.player);
assert.equal(occupiedDoor.officer.interiorId,null,'reset clears remembered indoor reports');
console.log('Capital police: checked room entry, same-space fire/arrest, wall LOS, retained-room exit, safehouse, unseen entry, landing clearance, pause/reset PASS');

// Native regression: the nearest legal school road stops 37 metres from its
// actual door. The car must stop there, then use the mapped gate on foot.
const {CAMPUS_BARRIERS,CAMPUS_GATES}=await load('../Games/Capital Drive/campus.js');
const schoolMap=applyRoadProfiles({...actualSource,barriers:[...CAMPUS_BARRIERS]},profiles);
const schoolSim=createSimulation(schoolMap,{trafficCount:0});
Object.assign(schoolSim.player,{x:-600,z:-600});
const gate=CAMPUS_GATES.find(gate=>gate.id==='telopea-gate-11');
const schoolRoom={id:'interior-telopea-school',known:true,safehouse:false,playerInside:true,
  outside:{x:-296.17964979456633,z:-378.60790990665384},inside:{x:1000,z:1000},exit:{x:1000,z:1000},
  approach:[{x:gate.path[1][0],z:gate.path[1][1]},{x:gate.x,z:gate.z},
    {x:gate.path[0][0],z:gate.path[0][1]},{x:-296.17964979456633,z:-378.60790990665384}],
  moveActor(actor,dx,dz){actor.x+=dx;actor.z+=dz;return {blocked:false};},
  hasLineOfSight:()=>true,nextWaypoint:(from,to)=>to};
const schoolCar={id:'school-road-stop',x:-330.35607248374134,z:-361.84808383543935,
  yaw:-2.5639754106958317,speed:0,length:4.8,width:1.9,active:true};
const schoolOfficer={id:schoolCar.id,...schoolCar,health:100,mode:'vehicle',interiorId:null,car:schoolCar};
const schoolState={police:[schoolOfficer,...disabled()],wanted:1,mode:'foot',weapon:'unarmed',health:100,heat:37};
const schoolTarget={x:1008,z:1000,speed:0};
const schoolAI=createPolice(schoolSim,{getInterior:()=>schoolRoom,resolveInterior:()=>schoolRoom});
schoolAI.report(schoolTarget);
let schoolDismount=null,schoolEntry=null,schoolGateGap=Infinity,schoolPrevious={...schoolCar};
for(let frame=0;frame<1800;frame++) {
  schoolSim.setExternalVehicles([schoolCar]);
  const before={...schoolOfficer};schoolAI.step(1/60,schoolState,schoolTarget);
  if(schoolOfficer.mode==='foot' && schoolDismount===null) {
    schoolDismount=frame/60;
    assert(Math.hypot(schoolOfficer.x-schoolCar.x,schoolOfficer.z-schoolCar.z)<2.1,'dismount is beside the real stopped patrol');
  }
  if(schoolOfficer.mode==='vehicle')assert(Math.hypot(schoolCar.x-schoolPrevious.x,schoolCar.z-schoolPrevious.z)<.5,'approach never teleports the car');
  if(schoolOfficer.mode==='foot' && !schoolOfficer.interiorId) {
    schoolGateGap=Math.min(schoolGateGap,Math.hypot(schoolOfficer.x-gate.x,schoolOfficer.z-gate.z));
    if(before.mode==='foot')assert(Math.hypot(schoolOfficer.x-before.x,schoolOfficer.z-before.z)<.1,'gate approach is continuous swept walking');
  }
  schoolPrevious={...schoolCar};
  if(schoolOfficer.interiorId){schoolEntry=frame/60;break;}
}
assert(schoolDismount!==null && schoolDismount<5,'known room dismounts on its stalled legal road within seconds');
assert(schoolGateGap<2.3,'school pursuit physically crosses gate11 rather than its fence');
assert(schoolEntry!==null && schoolEntry<30,'37-metre road stop continues through gate to checked room entry');
assert.equal(schoolAI.drainEvents().length,0,'one-star school search preserves proportional gunfire rules');
console.log('Capital police: actual school stalled-road dismount, physical gate11 approach and checked entry PASS',JSON.stringify({dismount:schoolDismount,entry:schoolEntry,gateGap:schoolGateGap}));
for(const protectedHouse of [false,true]) {
  const room={...schoolRoom,known:protectedHouse,safehouse:protectedHouse};
  const car={...schoolCar,id:`school-guard:${protectedHouse}`,x:-330.35607248374134,z:-361.84808383543935,speed:0};
  const officer={id:car.id,...car,health:100,mode:'vehicle',interiorId:null,car};
  const state={...schoolState,police:[officer,...disabled()],wanted:1,heat:37};
  const ai=createPolice(schoolSim,{getInterior:()=>room,resolveInterior:()=>room});
  if(protectedHouse)ai.report(schoolTarget);
  for(let frame=0;frame<120;frame++){schoolSim.setExternalVehicles([car]);ai.step(1/60,state,schoolTarget);}
  assert.equal(officer.mode,'vehicle',`${protectedHouse?'safehouse':'unknown room'} cannot use expanded entrance dismount`);
  assert.equal(officer.interiorId,null);
}
console.log('Capital police: expanded road arrival excludes unknown rooms and protected safehouse PASS');
