import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDrone } from '../Games/Capital Drive/drone.js';
import { createSecurityCameras } from '../Games/Capital Drive/security-cameras.js';
import { createShotObstacles } from '../Games/Capital Drive/shot-obstacles.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { weaponById } from '../Games/Capital Drive/weapons.js';
import { createBuses } from '../Games/Capital Drive/buses.js';
import { createDeliveryService } from '../Games/Capital Drive/delivery-service.js';
import { createRideService } from '../Games/Capital Drive/ride-service.js';
import { BY_ID } from '../assets/car-arcade/fleet.js';

// Execute exact controller helpers with bounded owner doubles. This is adapter
// evidence, not a browser boot, native travel or graphics performance claim.
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function helper(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  let depth = 0, quote = null, escape = false;
  let endParams=source.indexOf('(',start),params=0;
  do { const c=source[endParams++];if(c==='(')params++;else if(c===')')params--; } while(params);
  const body = source.indexOf('{', endParams);
  for (let i = body; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if ('\'"`'.includes(c)) { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed helper ${name}`);
}
function owner(names, context) {
  const scope = vm.createContext({ droneActive:false,delivery:null,houseController:null,burglaryContext:()=>({}),...context });
  vm.runInContext(names.map(helper).join('\n'), scope);
  return scope;
}
const room = { id: 'house-1' }, car = { id: 'parked:1' }, ray = { x: 0, z: 0, range: 30 };
const traceCalls = [];
const shots = owner(['shotVehicles', 'traceWorldShot', 'tracePlayerShot'], {
  interiors: { active: null }, simulation: { nearbyVehicles: () => [car] }, buses: { vehicles: [] }, rideService: { vehicles: [] },
  gameplay: { state: { police: [] } }, aircraft: { snapshot: () => ({ planes: [] }) },
  shotObstacles: { trace: (...args) => { traceCalls.push(args); return 4; }, traceHit: (...args) => { traceCalls.push(args); return { distance: 4, vehicleId: car.id }; } },
});
assert.equal(shots.traceWorldShot(ray), 4, 'LOS keeps its numeric obstruction contract');
assert.equal(shots.tracePlayerShot(ray).vehicleId, car.id, 'player shot preserves exact vehicle identity');
assert.equal(traceCalls.at(-1)[2][0], car);
shots.interiors.active = room;
shots.tracePlayerShot(ray);
assert.equal(traceCalls.at(-1)[1], room);
assert.equal(traceCalls.at(-1)[2].length, 0, 'indoor shots cannot hit exterior vehicles');

const samples = [], road = { id: 'bridge-road' };
const heights = owner(['placeCar'], { world: { vehicleHeightAt: (pose, ownerRoad) => { samples.push({ pose, ownerRoad }); return pose.z + 10; } } });
const carPose = { x: 5, z: 20, yaw: 0, speed: 0, edge: { road } };
const mesh = { position: { set: (...args) => { mesh.positionValue = args; } }, rotation: { set: (...args) => { mesh.rotationValue = args; } }, userData: { wheels: [] } };
heights.placeCar(mesh, carPose, 0);
assert.equal(mesh.positionValue[1], 30.18);
assert.equal(samples.length, 3, 'body and both pitch probes use vehicle surface ownership');
assert(samples.every(sample => sample.ownerRoad === road));
assert.deepEqual(samples.map(sample => sample.pose.z), [20, 18, 22]);

const lights = owner(['headlightsEnabled', 'toggleHeadlights'], { headlightsOverride: null, viewRevision: 0, atmosphere: { snapshot: () => ({ hour: 23 }) } });
for (const [hour, enabled] of [[0, true], [6.99, true], [7, false], [17.99, false], [18, true]]) assert.equal(lights.headlightsEnabled(hour), enabled);
lights.toggleHeadlights();
assert.equal(lights.headlightsOverride, false);
assert.equal(lights.headlightsEnabled(0), false);
lights.toggleHeadlights();
assert.equal(lights.headlightsOverride, true);
assert.equal(lights.viewRevision, 2);

const calls = [];
const plan = { id: 'house-1', floorY: 2, name: 'Fixture house' }, entry = { id: plan.id };
const outside = { x: 5, z: 8, yaw: 0 };
const rooms = owner(['enterInterior', 'leaveInterior'], {
  burglary:{leave:()=>{}},
  gameplay: { state: { actor: { ...outside }, wanted: 0, police: [] } },
  interiors: { active: plan, exteriorPose: outside, enter: () => plan, leave: () => true },
  map: { storyHomes: {} }, CAMPUS_GATES: [], compatibility: true,
  policeRooms: { enter: () => {}, leave: () => {}, prune: () => {} },
  interiorView: { load: () => {}, clear: () => {} }, activities: { load: () => {}, clear: () => {} },
  roomPeople: { load: () => {}, clear: () => {} }, roomPeopleView: { load: () => {}, clear: () => {} },
  campaignScenes: { enterInterior: (...args) => calls.push(['enter', ...args]), leaveInterior: () => calls.push(['leave']) },
  indoorCampaignScenesView: { dispose: () => calls.push(['dispose']) }, indoorActorView: null,
  recallDrone: () => {}, syncPlayerAppearance: () => {}, clearInput: () => {}, notify: () => {}, stopMini: () => {},
  progression: { cancelActivity: () => {}, isSafehouse: () => false }, cameraReady: true, activeCrewEntry: null,
});
rooms.enterInterior(entry);
assert.equal(calls[0][0], 'enter');
assert.equal(calls[0][1], plan);
assert.equal(calls[0][2], entry);
assert.equal(calls[0][3], outside, 'crew receives actual captured exterior pose');
assert.equal(rooms.indoorCampaignScenesView, null);
rooms.indoorCampaignScenesView = { dispose: () => calls.push(['dispose-leave']) };
rooms.leaveInterior();
assert(calls.some(call => call[0] === 'leave'));
assert(calls.some(call => call[0] === 'dispose-leave'));
assert.equal(rooms.indoorCampaignScenesView, null);
assert(source.includes('onVehicleShot:({vehicleId,damage})=>damageWorldVehicle(vehicleId,damage),onVehicleExplosion:damageExplosionVehicles'));
assert(source.includes("if(event.code==='KeyL'&&!paused()){activatePower();return;}"));
assert(source.includes("if(event.code==='KeyN'&&!paused()){toggleHeadlights();return;}"));
assert(source.includes('attacksAllowed:canCrewAttack()'));
assert(source.includes('if(!person.seated&&!person.interiorId)add(person,.32)'));
console.log('PASS city controller helpers: numeric/identity shot separation, indoor exclusion, pose-aware bridge pitch, night/manual headlights, actual room hooks/disposal and preserved power key');

const tinyMap={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[{id:'main',name:'Example Street',points:[[-400,0],[400,0]],nodes:[1,2],width:12,speed:40}],buildings:[],spawn:{x:0,z:0,yaw:0},landmarks:[]};
const home={id:'house-fixture',type:'house',name:'Fixture house',x:0,z:10,yaw:0};
const commerce=createProgression(tinyMap,null,{homes:[home]});commerce.state.cash=50000;
const physical=createSimulation(tinyMap,{trafficCount:0});
const game=createGameplay(tinyMap,physical,{hasWeapon:id=>commerce.state.equipment[id]===true});
game.state.mode='foot';game.state.health=60;game.state.actor.x=0;game.state.actor.z=10;
commerce.state.equipment.pistol=true;game.addAmmo(24,'pistol');
let writes=0,menuPaused=true;
const control=owner(['cityAction','recallDrone','stepDrone','canCrewAttack','canPlayerAttack','walkingInput','input','interact'],{
  jetpack:null,
  developerReturn:null,progression:commerce,gameplay:game,interiors:{active:null},campaignScenes:{people:[]},
  careerContext:()=>({pose:{x:game.state.actor.x,z:game.state.actor.z},onFoot:true,health:game.state.health,vehicleHealth:100,wanted:0,respawnSerial:0,interior:control.interiors.active?{roomId:home.id}:null}),
  saveCareer:()=>writes++,clearInput:()=>{},notify:()=>{},cityUI:{render:()=>{}},
  closeDialogs:()=>{menuPaused=false;},paused:()=>menuPaused,isSandbox:()=>false,
  cutscenes:{snapshot:()=>({active:false})},protectedWork:()=>false,activities:{snapshot:()=>({active:false})},streetChallenge:()=>null,micromobility:{snapshot:()=>({active:false})},
  drone:createDrone({heightAt:()=>0}),clearRecon:()=>{},cameraReady:true,
  moveStick:{snapshot:()=>({x:0,y:0})},keys:new Set(),touch:new Set(),footCameraYaw:0,
  droneInput:{forward:0,right:0,lift:0,yaw:0,body:null,paused:false,interiorId:null},
  THREE:{MathUtils:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}},
});
assert(control.cityAction('buy-property',home.id).ok);assert.equal(writes,1);
control.interiors.active=home;
const beforeAmmo=game.inventorySnapshot().pistol;
assert(control.cityAction('stash',{action:'deposit',kind:'ammo',id:'pistol',amount:10}).ok);
assert.equal(writes,2);
assert.equal(commerce.state.stashes[home.id].ammo.pistol,10);
assert.equal(game.inventorySnapshot().pistol.ammo+game.inventorySnapshot().pistol.reserveAmmo,beforeAmmo.ammo+beforeAmmo.reserveAmmo-10);
const noWrite=game.inventorySnapshot();
assert.equal(control.cityAction('stash',{action:'deposit',kind:'ammo',id:'pistol',amount:1000}).ok,false);
assert.deepEqual(game.inventorySnapshot(),noWrite);assert.equal(writes,2,'denied stash never invokes the writer or mutates inventory');
assert(control.cityAction('stash',{action:'withdraw',kind:'ammo',id:'pistol',amount:10}).ok);
assert.equal(writes,3,'native inventory return and successful save dispatch remain paired');
const savedBody={mode:'foot',actor:{x:0,z:10,yaw:0},vehicle:{x:0,z:0,yaw:0,modelId:'lantern',color:'#e7e6df',health:100,stolen:false},health:60,weapon:'pistol',ammunition:game.inventorySnapshot()};
assert(control.cityAction('stash',{action:'deposit',kind:'weapon',id:'pistol',amount:1}).ok);
assert.equal(game.restoreProtagonist(savedBody).reason,'unowned-weapon');
const sanitize=Function('progression','weaponById',`${helper('resumeCheckpoint')};return resumeCheckpoint;`)(commerce,weaponById);
const resumable=sanitize(savedBody);
assert.equal(resumable.weapon,'unarmed');assert.equal(savedBody.weapon,'pistol');
assert.equal(resumable.ammunition,savedBody.ammunition,'only selected equipment changes; saved ammo remains exact');
assert(game.restoreProtagonist(resumable).ok,'actual Gameplay admits a valid stashed-weapon checkpoint as unarmed');
assert.deepEqual(game.inventorySnapshot(),savedBody.ammunition);assert.equal(game.state.health,60);
const corrupt={...savedBody,weapon:'carbine'};
assert.equal(sanitize(corrupt),corrupt,'unowned weapons absent from real storage remain rejected');
assert.equal(game.restoreProtagonist(sanitize(corrupt)).reason,'unowned-weapon');
assert(control.cityAction('hire','merc-river').ok);
control.campaignScenes.people=[{id:'merc-river',hired:true,health:0,renewalSerial:commerce.crewRenewalSerial('merc-river')}];
assert(control.cityAction('rehire','merc-river').ok);
const afterRenewal=commerce.state.cash,renewalWrites=writes;
assert.equal(control.cityAction('rehire','merc-river').ok,false,'a paused dead render body cannot buy the same pending renewal twice');
assert.equal(commerce.state.cash,afterRenewal);assert.equal(writes,renewalWrites);
const inventory=owner(['inventoryProfile','captureCareerInventory','restoreCareerInventory'],{
  developerReturn:null,started:true,isSandbox:()=>false,gameMode:'campaign',campaign:{state:{character:'student',active:{id:'mission'}}},
  progression:commerce,gameplay:game,campaignScenes:control.campaignScenes,
});
game.state.wanted=4;inventory.captureCareerInventory();
assert.deepEqual(commerce.getInventory('student'),game.inventorySnapshot(),'wanted active missions still save inventory without a body checkpoint');
assert.equal(commerce.getCrewHealth('merc-river'),100,'old dead body cannot overwrite pending paid renewal');
const exactInventory=game.inventorySnapshot();game.addAmmo(10,'pistol');inventory.restoreCareerInventory();
assert.deepEqual(game.inventorySnapshot(),exactInventory);assert.equal(game.state.wanted,4);
inventory.developerReturn={};game.addAmmo(10,'pistol');inventory.captureCareerInventory();
assert.deepEqual(commerce.getInventory('student'),exactInventory,'preview inventory cannot overwrite career');
inventory.developerReturn=null;inventory.gameMode='street';inventory.captureCareerInventory();
assert.deepEqual(commerce.getInventory('street'),game.inventorySnapshot(),'Street Life has a separate durable ammunition profile');
control.campaignScenes.people=[];
game.state.wanted=0;
const afterWeaponWrite=writes;
control.developerReturn={mode:'campaign'};
assert.equal(control.cityAction('stash',{action:'deposit',kind:'cash',amount:10}).ok,false);
assert.equal(control.cityAction('hire','merc-river').ok,false);
assert.equal(writes,afterWeaponWrite,'mission previews cannot persist the new commerce actions');
control.developerReturn=null;
control.interiors.active=null;
assert.equal(control.cityAction('launch-drone').ok,false,'unowned drone cannot launch');
assert.equal(control.droneActive,false);
commerce.state.gear.drone=true;
assert(control.cityAction('launch-drone').ok);
assert.equal(menuPaused,false,'launch closes phone before the module checks paused context');
assert.equal(writes,afterWeaponWrite,'transient flight never writes the career');
const bodyBefore={...game.state.actor};
assert.equal(control.canPlayerAttack(),false);
assert.equal(control.canCrewAttack(),true,'guards can defend the vulnerable drone operator');
assert.equal(Object.keys(control.walkingInput()).length,0);
assert.equal(control.input().throttle,0);assert.equal(control.input().steer,0);
assert.equal(control.interact(),undefined,'active drone blocks entry/interaction before body owners');
control.keys.add('KeyW');control.stepDrone(1);
assert(control.drone.snapshot().z<game.state.actor.z);
assert.deepEqual(game.state.actor,bodyBefore,'flight moves the drone while the authoritative body stays behind');
game.state.health=0;control.stepDrone(.1);
assert.equal(control.droneActive,false,'body death recalls rather than shielding or healing the player');
assert.equal(game.state.health,0);
game.state.health=60;control.cityAction('launch-drone');
const pausedFlight=control.drone.snapshot();control.drone.step(1,{paused:true});
assert.deepEqual(control.drone.snapshot(),pausedFlight);
assert(control.recallDrone('test'));assert.equal(control.droneActive,false);
control.drone.dispose();assert(control.drone.snapshot().disposed);

const solids=createShotObstacles({buildings:[{id:'wall',height:4,points:[[-1,-1],[1,-1],[1,1],[-1,1]]}]},{heightAt:()=>0});
const collision=owner(['droneCanOccupy'],{world:{groundHeightAt:()=>0},shotObstacles:solids});
assert.equal(collision.droneCanOccupy({x:0,y:3,z:0},{from:{x:0,y:3,z:-2}}),false,'real 3D building wall stops a flight sweep');
assert.equal(collision.droneCanOccupy({x:0,y:6,z:0},{from:{x:0,y:6,z:-2}}),true,'flying above an actual roof remains legal');
assert.equal(collision.droneCanOccupy({x:0,y:3,z:0},{from:{x:0,y:6,z:0}}),false,'descending through the roof is blocked');
let coverQueries=0;
const cameraCover=owner(['cameraSight'],{focus:()=>({x:100,z:100}),interiors:{active:null},aircraft:null,buses:null,rideService:null,gameplay:{state:{mode:'foot'}},ordnance:{blocksSight:()=>false},traceWorldShot:ray=>{coverQueries++;return solids.trace(ray,null,[]);}});
assert.equal(cameraCover.cameraSight({x:0,y:3,z:-3},{x:0,y:3,z:3}),false);
assert.equal(cameraCover.cameraSight({x:0,y:6,z:-3},{x:0,y:6,z:3}),true);
const beforeCover=coverQueries;
assert.equal(cameraCover.cameraSight({x:0,y:3,z:0},{x:100,y:3,z:0}),false);
assert.equal(cameraCover.cameraSight({x:0,y:3,z:0},{x:0,y:3,z:-3,interiorId:'other'}),false);
assert.equal(coverQueries,beforeCover,'far and cross-room camera observations stop before physical queries');

const hardware=createSecurityCameras([{id:'fixture-camera',x:0,z:0,yaw:0}],{heightAt:()=>0,hasLineOfSight:()=>true});
const reports=[],sightings=[];
const surveillance=owner(['recordCameraCrime','stepSecurityCameras','shotTargets'],{
  securityCameras:hardware,cameraCrimeSerial:0,interiors:{active:null},focus:()=>({x:0,z:-10}),
  gameplay:{state:{wanted:0},reportOffence:(...args)=>reports.push(args),reportSighting:event=>sightings.push(event)},
  pedestrians:{shotTargets:()=>[]},streetDealers:{shotTargets:()=>[]},rideService:{shotTargets:()=>[]},
});
surveillance.stepSecurityCameras(1);assert.equal(reports.length,0,'ordinary visible walking supplies no crime receipt or stars');
surveillance.recordCameraCrime('gunfire');surveillance.stepSecurityCameras(.5);
assert.equal(reports.length,1);assert.equal(reports[0][0],'camera report');assert.equal(reports[0][2].witnessed,true);
surveillance.stepSecurityCameras(1);assert.equal(reports.length,1,'one actual attack receipt reports once');
surveillance.gameplay.state.wanted=1;surveillance.stepSecurityCameras(1);
assert.equal(sightings.length,1,'wanted sightings update search through the owner without granting new stars');
const cameraTarget=surveillance.shotTargets()[0];assert.equal(cameraTarget.id,'camera:fixture-camera');
assert.equal(cameraTarget.damage(100,{interiorId:null}).destroyed,true);
surveillance.recordCameraCrime('gunfire');surveillance.stepSecurityCameras(1);
assert.equal(reports.length,1,'destroyed hardware cannot report new attacks');
assert.equal(surveillance.shotTargets().length,0);
hardware.dispose();assert.equal(hardware.snapshot().length,0);
assert(source.includes('dialogs.push(...cityUI.dialogs)'));
assert(source.includes('droneView?.dispose();securityCameras?.dispose();securityCamerasView?.dispose();cityUI?.dispose()'));
assert(source.includes("event.kind==='attack'&&(event.weapon||event.hits>0)&&event.offenceReported===false"));
assert(source.includes("['mugging-started','robbery-started'].includes(event.type)"));
console.log('PASS city owner adapters: native stash callbacks/writer denial, owned transient drone/body vulnerability/neutral input/pause/3D walls and roofs, evidence-only cameras, identity damage, once-only reports and disposal');

const vehicleMap={...tinyMap,spawn:{x:-100,z:-100,yaw:0},roads:[
  {id:'a',points:[[0,0],[400,0]],nodes:[1,2],oneway:1,width:11},
  {id:'b',points:[[400,0],[400,400]],nodes:[2,3],oneway:1,width:11},
  {id:'c',points:[[400,400],[0,400]],nodes:[3,4],oneway:1,width:11},
  {id:'d',points:[[0,400],[0,0]],nodes:[4,1],oneway:1,width:11},
]};
const carSimulation=createSimulation(vehicleMap,{trafficCount:1}),carGameplay=createGameplay(vehicleMap,carSimulation);
const actualBus=createBuses(vehicleMap,carSimulation),actualRide=createRideService(vehicleMap,carSimulation),actualDelivery=createDeliveryService(vehicleMap,carSimulation);
const courier=actualDelivery.vehicles[0];Object.assign(courier,{x:200,z:200,yaw:0,active:true,health:100});
const npc=carSimulation.traffic[0],taxi=actualRide.vehicles[0],bus=actualBus.vehicles[0];
Object.assign(npc,{x:4,z:0,yaw:0,active:true,health:100});
Object.assign(taxi,{x:40,z:40,active:true});
actualBus.vehicles.forEach((car,i)=>Object.assign(car,{x:60+i*20,z:60,active:true}));
const patrol={id:'police:test',modelId:'relay',x:30,z:30,yaw:0,active:true,health:100};
carGameplay.state.police.push({id:'officer:test',health:100,mode:'vehicle',car:patrol});
let colliders;
const damage=owner(['damageWorldVehicle','damageExplosionVehicles','shotVehicles','syncExternalVehicles','updateAbandonedMeshes'],{
  simulation:carSimulation,gameplay:carGameplay,buses:actualBus,rideService:actualRide,delivery:actualDelivery,aircraft:{snapshot:()=>({planes:[]})},
  aircraftObstacles:()=>[],BY_ID,handledVehicleBlasts:new WeakSet(),
  world:{heightAt:()=>0,vehicleHeightAt:()=>0},shotObstacles:createShotObstacles(vehicleMap,{heightAt:()=>0}),
  abandonedMeshes:new Map(),createCar:(modelId,{color})=>({modelId,color,visible:false}),addCarShadow:()=>{},
  scene:{add:()=>{},remove:()=>{}},placeCar:()=>{},
});
assert(damage.damageWorldVehicle(npc.id,10));assert.equal(npc.health,90);
assert(damage.damageWorldVehicle(patrol.id,10));assert.equal(patrol.health,90);
assert(damage.damageWorldVehicle(taxi.id,10));assert.equal(taxi.health,90);
assert(damage.damageWorldVehicle(bus.id,10));assert.equal(bus.health,90);
assert(damage.damageWorldVehicle(courier.id,10));assert.equal(courier.health,90,'physical courier damage routes to its authoritative owner');
assert(damage.shotVehicles({x:200,z:200,range:5},null).some(car=>car.id===courier.id),'active physical courier remains shot cover');
assert(damage.damageWorldVehicle('player',10));assert.equal(carGameplay.state.vehicleHealth,90);
assert.equal(damage.damageWorldVehicle('missing',10),false);
const blast={type:'explosion',x:0,y:.8,z:0,radius:8,maxDamage:100};
npc.health=100;
assert.equal(damage.damageExplosionVehicles({...blast,interiorId:'room'}),0);assert.equal(npc.health,100);
const wall=createShotObstacles({...vehicleMap,buildings:[{id:'blast-wall',height:4,points:[[1.7,-3],[2.1,-3],[2.1,3],[1.7,3]]}]},{heightAt:()=>0});
damage.shotObstacles=wall;
assert.equal(damage.damageExplosionVehicles({...blast}),0);assert.equal(npc.health,100,'real wall blocks the vehicle blast adapter');
damage.shotObstacles=createShotObstacles(vehicleMap,{heightAt:()=>0});
assert.equal(damage.damageExplosionVehicles(blast),1);
assert(npc.health>0&&npc.health<100,'falloff reaches the nearest finite rotated vehicle hull');
const onceHealth=npc.health;
assert.equal(damage.damageExplosionVehicles(blast),0);assert.equal(npc.health,onceHealth,'the same physical event cannot damage a vehicle twice');
assert.equal(carGameplay.state.vehicleHealth,90,'external blast callback never double-charges the player car');
Object.assign(taxi,{x:2,z:0,yaw:0,health:100});npc.health=100;
damage.damageExplosionVehicles({...blast});
assert.equal(npc.health,100,'another vehicle remains physical blast cover');
assert(taxi.health<100,'the intentional hull target alone is exempted from its own cover');
assert(damage.damageWorldVehicle(patrol.id,100));carGameplay.state.police.length=0;
assert(damage.shotVehicles({x:30,z:30,range:5},null).some(car=>car.id===patrol.id),'retained police wreck stays bullet cover after pursuit clears');
const originalSet=carSimulation.setExternalVehicles;
carSimulation.setExternalVehicles=list=>{colliders=list;};damage.syncExternalVehicles();carSimulation.setExternalVehicles=originalSet;
assert(colliders.some(car=>car.id===courier.id),'active courier is registered with collision owner');
assert(colliders.some(car=>car.id===patrol.id),'the same visible retained wreck remains a collider');
damage.updateAbandonedMeshes({x:30,z:30},0);
assert.equal(damage.abandonedMeshes.get(patrol.id).visible,true);
assert.equal(damage.abandonedMeshes.get(patrol.id).modelId,'relay');
assert.equal(damage.abandonedMeshes.get(patrol.id).color,0x64707b);
carSimulation.abandonedCars.push(...Array.from({length:25},(_,i)=>({id:`fixture-wreck:${i}`,x:0,z:0,yaw:0,modelId:'invalid',color:0x777777,active:true})));
damage.updateAbandonedMeshes({x:0,z:0},0);
assert.equal(damage.abandonedMeshes.size,18,'render map capacity follows the twelve abandoned plus six patrol bound');
assert([...damage.abandonedMeshes.values()].every(mesh=>mesh.modelId==='lantern'),'unknown patrol models have a visible valid fleet fallback');
assert(source.includes('vehicleWrecks:freezeCopy({police:gameplay.policeWrecks,meshes:abandonedMeshes.size,capacity:18})'));
console.log('PASS vehicle controller owners: NPC/patrol/ride/bus/player routing, physical wall/foreign-car blast cover, room exclusion, nearest-hull falloff, once-only damage and bounded visible collider wrecks');

// Execute the actual map adapter: couriers appear without enabling map follow.
const paint = [], translations = [];
const canvasContext = new Proxy({
  fillRect(...args){paint.push({kind:'rect',color:this.fillStyle,args});},
  fill(){paint.push({kind:'fill',color:this.fillStyle});},
  translate(x,z){translations.push({x,z});},measureText:()=>({width:50}),
}, {get:(object,key)=>key in object?object[key]:()=>{}});
let courierTracking={car:{x:100,z:0,yaw:0},dropoff:{x:50,z:0},distance:50,eta:9,phase:'approaching'};
const mini=owner(['drawMap'],{
  mapImage:{},map:{bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},landmarks:[]},
  focus:()=>({x:0,z:0,yaw:0}),mapView:{zoom:1,x:null,z:null},
  createMapProjection:()=>({scale:1,cx:0,cz:0}),route:[],destination:{},
  rideService:{activeFare:null},delivery:{tracking:()=>courierTracking},progression:null,mapSelection:null,
  guideState:{point:{x:0,z:-40},incomingYaw:0,outgoingYaw:0},equipment:null,gameplay:{state:{police:[]}},
});
const canvas={width:200,height:200,getContext:()=>canvasContext};
mini.drawMap(canvas,false);
assert(paint.some(item=>item.kind==='rect'&&item.color==='#a16a19'),'active courier gets minimap van marker automatically');
assert(paint.some(item=>item.color==='#ffd23f'),'courier preserves existing navigation turn arrow');
paint.length=0;translations.length=0;courierTracking.car.x=5000;
mini.drawMap(canvas,false);
assert(!paint.some(item=>item.kind==='rect'&&item.color==='#a16a19'));
assert(paint.some(item=>item.kind==='fill'&&item.color==='#a16a19'),'out-of-range courier gets directional edge arrow');
assert(translations.some(p=>p.x>170&&p.x<200&&p.z===100),'edge arrow points east inside minimap boundary');
paint.length=0;courierTracking=null;mini.drawMap(canvas,false);
assert(!paint.some(item=>item.color==='#a16a19'),'terminal orders remove courier marker');
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{open:false,textContent:''});return nodes.get(id);};
let cleared=0,closed=0;
const courierOwner={busy:true,vehicles:[{active:true}],tracking:()=>({car:{x:70,z:80,yaw:1}})};
const following=owner(['trackCourier','trackYoober','liveTracking'],{
  delivery:courierOwner,rideService:{activeFare:{},vehicles:[{x:90,z:100,active:true}]},
  started:true,document:{hidden:false},followYoober:true,followCourier:false,mapView:{},$:node,
  closeDialogs:()=>closed++,clearInput:()=>cleared++,openDialog:id=>node(id).open=true,
});
assert.equal(following.trackCourier().ok,true);
assert.equal(following.followCourier,true);assert.equal(following.followYoober,false);
assert.equal(following.mapView.x,70);assert.equal(following.mapView.z,80);assert.equal(following.mapView.zoom,6);
assert.equal(closed,1);assert.equal(cleared,1);assert.equal(following.liveTracking(),true);
following.document.hidden=true;assert.equal(following.liveTracking(),false,'hidden tabs cannot advance tracked courier');
following.document.hidden=false;node('map-dialog').open=false;
assert.equal(following.liveTracking(),false,'ordinary minimap tracking does not bypass pause');
node('map-dialog').open=true;courierOwner.busy=false;
assert.equal(following.liveTracking(),false,'completed/cancelled courier cannot keep world ticking');
following.trackYoober();assert.equal(following.followCourier,false);assert.equal(following.followYoober,true);
courierOwner.tracking=()=>null;
assert.equal(following.trackCourier().ok,false,'no stale full-map follow after terminal order');
const orderEvents=[];
const orderController=owner(['handleDeliveryEvents','orderDelivery'],{
  delivery:{order:()=>({ok:true,orderId:'courier-1',dropoff:{x:4,z:8}}),drainEvents:()=>orderEvents.splice(0)},
  progression:{quoteDelivery:()=>({ok:true}),reserveDelivery:()=>({ok:true}),completeDelivery:()=>({ok:true})},
  destination:null,route:[],followCourier:false,deliveryReceipts:new Map(),careerContext:()=>({}),deliveryContext:()=>({}),
  saveCareer(){},closeDialogs(){},clearInput(){},notify(){},streetUI:null,$:node,
  routeTo:point=>{orderController.destination=point;orderController.route=[[0,0],[point.x,point.z]];},
  drawMap:(canvas,full)=>{assert.equal(canvas,node('full-map'));assert.equal(full,true);redraws++;},
});
let redraws=0;
assert.equal(orderController.orderDelivery({}).ok,true);
assert.equal(orderController.destination.courierOrderId,'courier-1');
orderController.followCourier=true;orderEvents.push({type:'failed',orderId:'courier-1'});
orderController.handleDeliveryEvents();
assert.equal(orderController.destination,null);assert.equal(orderController.route.length,0);assert.equal(redraws,1);
const manualRoute={id:'manual'};orderController.destination=manualRoute;
orderEvents.push({type:'cancelled',orderId:'courier-2'});orderController.handleDeliveryEvents();
assert.equal(orderController.destination,manualRoute);
console.log('PASS courier map/controller: automatic minimap van, directional edge arrow, preserved turn guidance, optional live follow, input clearing, hidden/closed-map pause and terminal cleanup');

const strikeBody={mode:'foot',health:100,actor:{x:0,z:0,yaw:0}};
const strikeOwner=createDrone({heightAt:()=>0});assert(strikeOwner.deploy(strikeBody,{owned:true}));
let blastCalls=0,visualCalls=0,offenceCalls=0;
const strikeAdapter=owner(['strikeDrone'],{
  drone:strikeOwner,gameplay:{state:strikeBody,applyExplosion:event=>{blastCalls++;assert.equal(event.radius,8);},reportOffence:()=>offenceCalls++},
  progression:{state:{gear:{drone:true,droneStrike:true},activeJob:null,activity:null}},
  campaign:{state:{active:null}},developerReturn:null,interiors:{active:null},isSandbox:()=>false,paused:()=>false,
  canCrewAttack:()=>true,ordnance:{showExplosion:()=>visualCalls++},notify:()=>{},
});
strikeAdapter.campaign.state.active={id:'mission'};assert.equal(strikeAdapter.strikeDrone().ok,false);
strikeAdapter.campaign.state.active=null;strikeAdapter.progression.state.activeJob={id:'job'};
assert.equal(strikeAdapter.strikeDrone().ok,false);strikeAdapter.progression.state.activeJob=null;
assert(strikeAdapter.strikeDrone().ok);assert.equal(blastCalls,1);assert.equal(visualCalls,1);assert.equal(offenceCalls,1);
assert.equal(strikeAdapter.strikeDrone().ok,false);assert.equal(blastCalls,1,'cooldown prevents a second area-damage call');
console.log('PASS drone strike controller: protected job/mission denial, one authoritative blast, one visual cue/offence and cooldown replay guard');
