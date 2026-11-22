import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRecon} from '../Games/Capital Drive/recon.js';
import {createInteriorPeople} from '../Games/Capital Drive/interior-people.js';
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
function extract(name){const start=source.indexOf(`function ${name}(`);assert(start>=0);const body=source.indexOf('){',start)+1;let depth=1,end=body+1;for(;depth;end++)depth+=(source[end]==='{')-(source[end]==='}');return source.slice(start,end);}
const state={mode:'foot',passenger:false,health:80,recovery:null,respawnSerial:0};
const active={id:'survey',stage:0,target:{kind:'recon',targetId:'notice'}};
const descriptor={targetId:'notice',x:0,z:-8,y:1.6,space:null,hold:1.1};
const env={droneActive:false,securityCameras:null,reconnaissance:createRecon(),reconGuideKey:'',reconOutcome:{serial:0},evidenceOutcome:{serial:0},evidenceSessionKey:'',scanHeld:false,
  campaign:{state:{active}},gameMode:'campaign',missionLocations:{guide:()=>({recon:descriptor})},interiors:{active:null},
  world:{heightAt:()=>10},focus:()=>({x:0,z:0,yaw:0,speed:0}),footCameraYaw:0,footLookPitch:0,
  gameplay:{state},activities:{snapshot:()=>({active:false})},streetChallenge:()=>null,paused:()=>false,isSandbox:()=>false,
  keys:new Set(),reconSight:()=>true,notify(){}};
const api=Function('env',`with(env){${['clearRecon','updateRecon','recordEvidence','shotTargets'].map(extract).join('\n')};return {clearRecon,updateRecon,recordEvidence,shotTargets};}`)(env);
for(let i=0;i<80;i++)api.updateRecon(1/60);
assert(env.reconnaissance.snapshot().ready);assert.equal(env.reconOutcome.serial,0,'waiting cannot grant recon');
assert.equal(env.reconnaissance.snapshot().objective.y,11.6,'controller resolves relative marker height through actual terrain');
env.keys.add('KeyI');api.updateRecon(1/60);assert.equal(env.reconOutcome.serial,1);assert.equal(env.reconOutcome.missionId,'survey');
for(let i=0;i<20;i++)api.updateRecon(1/60);assert.equal(env.reconOutcome.serial,1,'held scan cannot repeat');
api.clearRecon();env.keys.clear();api.updateRecon(1/60);for(let i=0;i<80;i++)api.updateRecon(1/60);
env.paused=()=>true;api.updateRecon(0);assert(!env.reconnaissance.snapshot().ready,'pause resets the observation baseline');
env.paused=()=>false;for(let i=0;i<80;i++)api.updateRecon(1/60);env.scanHeld=true;api.updateRecon(1/60);assert.equal(env.reconOutcome.serial,2,'same mission retry needs and accepts a new real scan');
env.campaign.state.active={id:'heist',target:{kind:'evidence',storeId:'coals'}};
env.interiors.active={id:'coals-room',storeId:'coals'};
const terminal={sessionId:3,station:{id:'coals-room-evidence'},kind:'evidence',phase:'complete'};env.activities.snapshot=()=>terminal;
const event={kind:'evidence',type:'complete',outcome:'secured',planId:'coals-room',stationId:'coals-room-evidence',sessionId:3};
assert(!api.recordEvidence({...event,sessionId:2}));assert(!api.recordEvidence({...event,stationId:'coals-room-stock'}));
state.passenger=true;assert(!api.recordEvidence(event));state.passenger=false;
assert(api.recordEvidence(event));assert.equal(env.evidenceOutcome.serial,1);assert.equal(env.evidenceOutcome.missionId,'heist');
assert(!api.recordEvidence(event),'one terminal session cannot grant two receipts');
assert.equal(env.evidenceOutcome.roomId,'coals-room');
let call;env.interiors.active=null;env.pedestrians={shotTargets:()=>[{id:5,x:0,z:-4,health:100}],hitByShot(...args){call=args;return {hits:1};}};
env.streetDealers={shotTargets:()=>[]};env.rideService={shotTargets:()=>[]};const targets=api.shotTargets();
assert.equal(targets[0].id,'ped:5');assert.equal(targets[0].damage(30,{pitch:.2}).hits,1);assert.deepEqual(call,[5,30,{pitch:.2,targetId:5}]);
assert(source.includes('aimPitch:footLookPitch'),'actual walking input supplies pitch');
console.log('PASS combat controller: terrain-resolved deliberate scans, neutral/pause/retry/hold authority, exact case-session/mission binding and native adult damage IDs');

let traced,query;
const coverEnv={interiors:{active:null},simulation:{nearbyVehicles(x,z,radius){query={x,z,radius};return [{id:'player',x:0,z:0}];}},
 lightRail:null,depotTank:null,
 buses:{vehicles:[{id:'bus:1'}],passenger:false},delivery:{vehicles:[{id:'courier'}]},rideService:{vehicles:[{id:'yoober'}],passenger:false},
 aircraft:{active:null,snapshot:()=>({planes:[{id:'jet:1',y:15}]})},campaignScenes:{people:[{id:'ally',seated:true,vehicleId:'player'}]},
 gameplay:{state:{mode:'foot',police:[{health:100,car:{id:'patrol'}},{health:0,car:{id:'dead'}}]}},
 shotObstacles:{trace(ray,room,cars){traced={ray,room,cars};return ray.range;}}};
const coverAPI=Function('env',`with(env){${['shotVehicles','traceWorldShot','tracePlayerShot','policeShotClear'].map(extract).join('\n')};return {traceWorldShot,tracePlayerShot,policeShotClear};}`)(coverEnv);
assert(coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'player',x:0,y:1.2,z:-20}));
assert.equal(query.radius,traced.ray.range+12);assert.deepEqual(traced.ray.ignoreVehicleIds,[],'an on-foot target cannot bypass their parked car');
assert.deepEqual(traced.cars.map(car=>car.id),['player','bus:1','yoober','courier','patrol','jet:1']);
assert.equal(traced.cars[5].y,15,'live aircraft altitude reaches cover trace');
coverEnv.gameplay.state.mode='vehicle';coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'player',x:0,y:1.2,z:-20});
assert.deepEqual(traced.ray.ignoreVehicleIds,['player'],'only the actual occupied target body is exempt');
coverEnv.aircraft.active={id:'jet:1'};coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'player',x:0,y:17,z:-20});
assert.deepEqual(traced.ray.ignoreVehicleIds,['jet:1']);assert(traced.ray.dy>0,'police retain absolute airborne target height');
coverEnv.aircraft.active=null;coverEnv.gameplay.state.mode='foot';
coverEnv.lightRail={vehicles:[{id:'rail:one'},{id:'rail:two'}],seatPose:{id:'rail:two'}};
coverEnv.depotTank={vehicle:{id:'tank:depot'},seatPose:null};
coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'player',x:0,y:2,z:-20});
assert.deepEqual(traced.ray.ignoreVehicleIds,['rail:two'],'only the passenger’s occupied carriage is exempt');
assert.deepEqual(traced.cars.slice(1,4).map(car=>car.id),['rail:one','rail:two','tank:depot']);
coverEnv.lightRail.seatPose=null;coverEnv.depotTank.seatPose={id:'tank:depot'};
coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'player',x:0,y:2,z:-20});
assert.deepEqual(traced.ray.ignoreVehicleIds,['tank:depot'],'a live tank gunner keeps the correct occupied target identity');
coverAPI.policeShotClear({x:0,y:1.35,z:0},{id:'ally',x:0,y:1.2,z:-20});assert.deepEqual(traced.ray.ignoreVehicleIds,['player']);
const room={id:'active-room'};coverAPI.policeShotClear({x:0,y:5,z:0},{id:'player',x:0,y:5,z:-10},{room,interiorId:room.id});
assert.equal(traced.room,room);assert.equal(traced.ray.interiorId,room.id);assert.deepEqual(traced.cars,[],'exterior vehicle bodies never leak into an interior');
coverEnv.shotObstacles.trace=()=>0;assert(!coverAPI.policeShotClear({x:0,y:1,z:0},{id:'player',x:0,y:1,z:-10}));
assert(source.includes('policeShotClear,')&&source.includes('traceShot:tracePlayerShot'),'actual controller binds both firing owners to live cover');
coverEnv.shotObstacles.traceHit=(ray,room,cars)=>({distance:3,vehicleId:cars[0]?.id});
assert.equal(coverAPI.tracePlayerShot({x:0,z:0,range:10}).vehicleId,'player','player shot keeps selected vehicle identity while police/recon use numeric cover');
console.log('PASS controller cover: local indexed cars plus bounded external vehicles, absolute aircraft height, occupied-target-only exclusions and room isolation');

const indoorPlan={id:'bound-room',storeId:'noodles',type:'shop',variant:'noodles',floorY:3,
 origin:{x:0,z:0,yaw:0},width:10,depth:14,walls:[],doors:[],activities:[],boothGuest:{x:3,z:8,yaw:0},
 furniture:[{kind:'banquette',x:3,z:8,yaw:0,width:.6,depth:.6}]};
const roomOwner=createInteriorPeople();roomOwner.load(indoorPlan);env.interiors.active=indoorPlan;env.roomPeople=roomOwner;
const guest=roomOwner.snapshot().find(person=>person.character==='booth-guest');
const boundTarget=api.shotTargets().find(person=>person.id===`room:${guest.id}`);
const ray={x:guest.x,y:4.35,z:guest.z-3,dx:0,dy:0,dz:1,range:6,interiorId:indoorPlan.id,targetId:boundTarget.id};
assert.equal(boundTarget.damage(25,ray),true,'selected global target delegates a real room hit using the native target id');
assert.equal(roomOwner.snapshot().find(person=>person.id===guest.id).health,75);
assert.equal(ray.targetId,boundTarget.id,'adapter does not mutate the global shot identity');
assert.equal(boundTarget.damage(25,{...ray,interiorId:'other'}),false,'native room authority remains intact');
console.log('PASS real indoor shot handoff: global resolution, native validated damage, unchanged trace identity and wrong-room rejection');

const hudEnv={gameplay:{state:{mode:'vehicle',passenger:false,recovery:null}},focus:()=>({x:0,z:0}),paused:()=>false};
const hudGate=Function('env',`with(env){${extract('reconCameraVisible')};return reconCameraVisible;}`)(hudEnv);
const subject={active:true,objective:{x:0,z:5}};
assert.equal(hudGate(subject),false,'travel in a car retains navigation rather than the scanning panel');
hudEnv.gameplay.state.mode='foot';assert.equal(hudGate(subject),true);
assert.equal(hudGate({...subject,objective:{x:0,z:41}}),false,'far on-foot travel retains normal route UI');
hudEnv.gameplay.state.passenger=true;assert.equal(hudGate(subject),false);hudEnv.gameplay.state.passenger=false;
hudEnv.paused=()=>true;assert.equal(hudGate(subject),false);hudEnv.paused=()=>false;
hudEnv.gameplay.state.recovery={};assert.equal(hudGate(subject),false);
assert.equal(hudGate({active:false,objective:null}),false);
console.log('PASS recon camera admission: nearby on-foot framing only; far travel, driving, passengers, pause and recovery keep normal UI');

let sightQueries=0,smokeQueries=0;
const sightEnv={interiors:{active:null},world:{heightAt:()=>0},ordnance:{blocksSight(){smokeQueries++;return false;}},traceWorldShot(ray){sightQueries++;return ray.range;}};
const sightGate=Function('env',`with(env){${extract('reconSight')};return reconSight;}`)(sightEnv);
assert.equal(sightGate({x:0,z:0},{x:5000,z:5000,y:1.6}),false);assert.equal(sightGate({x:0,z:0},{x:0,z:2,y:Infinity}),false);
assert.equal(sightQueries,0);assert.equal(smokeQueries,0,'oversized or invalid recon rays stop before all physical queries');
assert.equal(sightGate({x:0,z:0},{x:0,z:8,y:1.6}),true);assert.equal(sightQueries,1);assert.equal(smokeQueries,1);
console.log('PASS controller recon sight bound: nonfinite/over40m rays never query smoke, cars, terrain or solids; real near sight remains authoritative');
