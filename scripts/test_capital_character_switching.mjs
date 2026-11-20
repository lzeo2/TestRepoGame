import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProgression} from '../Games/Capital Drive/progression.js';
const moduleURL=async url=>{
  let source=await readFile(url,'utf8');
  for(const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)])source=source.replace(match[1],await moduleURL(new URL(match[1],url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load=async path=>import(await moduleURL(new URL(path,import.meta.url)));
const [{createGameplay},{createSimulation},{createProtagonistState,PROTAGONIST_IDS},{prepareCharacterStart},{WEAPONS,weaponById}]=await Promise.all([
  load('../Games/Capital Drive/gameplay.js'),load('../Games/Capital Drive/simulation.js'),load('../Games/Capital Drive/protagonist-state.js'),
  load('../Games/Capital Drive/character-start.js'),load('../Games/Capital Drive/weapons.js')]);
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const map={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[{id:'main',points:[[-400,0],[400,0]],nodes:[1,2],width:12,speed:40}],buildings:[],spawn:{x:0,z:0,yaw:0},landmarks:[]};
const simulation=createSimulation(map,{trafficCount:0});
const gameplay=createGameplay(map,simulation,{hasWeapon:()=>true});
const heroes=PROTAGONIST_IDS.map((id,i)=>({id,start:{x:i*100-100,z:12,yaw:0}}));
const campaign={state:{character:'student',active:null},characters:heroes,selectCharacter(id){this.state.character=id;return {ok:true};},companionSwitchReason:()=> 'Finish or cancel the active mission before switching characters.'};
let capturedOutside=null;
const interiors={active:null,get exteriorPose(){return capturedOutside;},entries:[{id:'test-room'}]};
const counters={mesh:0,population:0,save:0};
const progression=createProgression(map);progression.state.cash=5432;progression.state.equipment.pistol=true;
const env={aircraft:null,resetDelivery(){},gameplay,simulation,campaign,interiors,protagonists:createProtagonistState(null,{bounds:map.bounds}),PROTAGONIST_IDS,WEAPONS,weaponById,recallDrone(){},prepareCharacterStart,CIVIC_INTERIOR_ENTRIES:[],
  heroPowers:{cancelActive(){}},ordnance:{reset(){}},campaignScenes:{people:[],canExchangeLeader:()=>false},
  developerReturn:null,started:true,gameMode:'campaign',progression,isSandbox:()=>false,
  activities:{snapshot:()=>({active:null})},micromobility:{snapshot:()=>({active:null}),reset(){}},buses:{reset(){}},rideService:{reset(){}},equipment:{reset(){}},
  cutscenes:{snapshot:()=>({active:false})},streetChallenge:()=>null,careerContext:()=>({}),
  selectVehicle(){counters.mesh++;},selectedPaint:'#e7e6df',followYoober:true,destination:{},route:[1],lastJobTarget:'old',mapSelection:{},dialogueId:'old',cameraReady:true,
  footCameraYaw:0,orbit:2,orbitHeight:3,orbitHold:2,lookPitch:.2,clearInput(){},pedestrians:{resetPopulation(){counters.population++;}},focus:()=>gameplay.focus(),syncPlayerAppearance(){},streetUI:{refresh(){}},
  leaveInterior(){Object.assign(gameplay.state.actor,capturedOutside);interiors.active=null;capturedOutside=null;},
  enterInterior(entry){interiors.active={id:entry.id};capturedOutside={...gameplay.state.actor};}};
// Execute the checked-in controller functions, rather than a copied implementation.
const body=source.slice(source.indexOf('function inventoryProfile('),source.indexOf('function stepDrone('))+source.slice(source.indexOf('function protagonistCheckpoint(){'),source.indexOf('function renderCharacterChoices(){'));
const controller=Function('env',`with(env){${body};return {selectCampaignCharacter,captureActiveProtagonist,captureCareerInventory,protagonistCheckpoint,characterSwitchReason};}`)(env);
gameplay.reset({startPose:{x:-80,z:12,yaw:.3},onFoot:true});
gameplay.state.vehicle.color='#d4d7d3';gameplay.state.health=73;gameplay.addAmmo(53,'pistol');gameplay.setWeapon('pistol');
const student=controller.protagonistCheckpoint(),cash=env.progression.state.cash;
assert(controller.selectCampaignCharacter('corporate').ok);
assert.equal(gameplay.state.health,100);assert.equal(gameplay.state.vehicle.modelId,'lantern');assert.equal(gameplay.state.mode,'foot');
assert(Math.abs(gameplay.state.actor.x-student.actor.x)>30,'first visit uses the new hero opening');
assert.deepEqual(env.protagonists.get('student'),student);assert.equal(env.route.length,0);assert.equal(env.followYoober,false);assert.equal(env.footCameraYaw,gameplay.state.actor.yaw);assert.equal(env.orbit,0);
Object.assign(gameplay.state.actor,{x:130,z:13,yaw:.8});gameplay.state.health=61;gameplay.addAmmo(24,'pistol');gameplay.setWeapon('pistol');
const corporate=controller.protagonistCheckpoint();
assert(controller.selectCampaignCharacter('student').ok);
assert.deepEqual(controller.protagonistCheckpoint(),student,'return restores own health, ammunition, foot and parked-car positions');
assert(controller.selectCampaignCharacter('corporate').ok);assert.deepEqual(controller.protagonistCheckpoint(),corporate);
assert.equal(env.progression.state.cash,cash,'switches do not award money');
const beforeSame=JSON.stringify(gameplay.snapshot()),meshes=counters.mesh;
assert(controller.selectCampaignCharacter('corporate').unchanged);assert.equal(JSON.stringify(gameplay.snapshot()),beforeSame);assert.equal(counters.mesh,meshes);
for(const [set,clear,reason] of [
  [()=>gameplay.state.wanted=1,()=>gameplay.state.wanted=0,'police'],
  [()=>gameplay.state.recovery={},()=>gameplay.state.recovery=null,'Recover'],
  [()=>gameplay.state.health=0,()=>gameplay.state.health=61,'Recover'],
  [()=>gameplay.state.actor.impactTime=1,()=>gameplay.state.actor.impactTime=0,'Recover'],
  [()=>campaign.state.active={},()=>campaign.state.active=null,'mission'],
  [()=>env.progression.state.activeJob={},()=>env.progression.state.activeJob=null,'work'],
  [()=>env.progression.state.activity={},()=>env.progression.state.activity=null,'activity'],
  [()=>gameplay.state.carjacking={},()=>gameplay.state.carjacking=null,'challenge'],
  [()=>env.rideService.activeFare={},()=>env.rideService.activeFare=null,'passenger']]){
  set();assert.match(controller.selectCampaignCharacter('student').message,new RegExp(reason));assert.equal(campaign.state.character,'corporate');clear();
}
// An interior captures the actual checked entrance return pose, never an invented doorway offset.
interiors.active={id:'test-room'};capturedOutside={x:123,z:13,yaw:.7};Object.assign(gameplay.state.actor,{x:350,z:350});
assert(controller.selectCampaignCharacter('student').ok);
assert.deepEqual(env.protagonists.get('corporate').actor,{x:123,z:13,yaw:.7});assert.equal(interiors.active,null);
// Actual gameplay placement failure leaves selection and physical state intact.
const previousPlayer={...simulation.player},previousState=gameplay.snapshot(),oldCanOccupy=simulation.canOccupy;
simulation.canOccupy=()=>false;
assert.equal(controller.selectCampaignCharacter('corporate').ok,false);
assert.equal(campaign.state.character,'student');assert.deepEqual(simulation.player,previousPlayer);assert.deepEqual(gameplay.snapshot(),previousState);
simulation.canOccupy=oldCanOccupy;
// A failed first visit can mutate the proposed car placement; controller restores it exactly.
const originalPrepare=env.prepareCharacterStart;
env.prepareCharacterStart=()=>{simulation.player.x=444;return null;};
assert.equal(controller.selectCampaignCharacter('basement').ok,false);assert.deepEqual(simulation.player,previousPlayer);assert.deepEqual(gameplay.snapshot(),previousState);env.prepareCharacterStart=originalPrepare;
// Mission/pagehide saves retain the last resumable checkpoint, and legacy is never captured as a normal hero.
const stored=env.protagonists.serialize();campaign.state.active={};gameplay.state.actor.x=99;controller.captureActiveProtagonist();assert.deepEqual(env.protagonists.serialize(),stored);
campaign.state.active=null;campaign.state.character='legacy';controller.captureActiveProtagonist();assert.deepEqual(env.protagonists.serialize(),stored);
let written;Object.assign(env,{careerError:'',isSandbox:()=>false,CAREER_KEY:'fixture',localStorage:{setItem(key,value){written=JSON.parse(value);}},$:()=>({}),notify(){}});
env.progression.state.ownedVehicles=[];env.progression.serialize=()=>({cash:env.progression.state.cash});campaign.serialize=()=>({version:2,character:campaign.state.character});
Function('env',`with(env){${source.slice(source.indexOf('function saveCareer() {'),source.indexOf('function routeTo(point) {'))};saveCareer();}`)(Object.assign(env,controller));
assert.equal(written.cash,cash);assert.deepEqual(written.protagonists,stored);assert.equal(written.campaign.version,2);
const {campaign:storedCampaign,protagonists:storedHeroes,...careerRecord}=written;assert.deepEqual(careerRecord,{cash});assert.equal(storedCampaign.version,2);assert.deepEqual(createProtagonistState(storedHeroes,{bounds:map.bounds}).serialize(),stored);
assert(source.includes('protagonists:savedProtagonists,...careerSave'),'outer optional record is removed before strict career validation');
assert(source.includes('!isSandbox()&&!heroCheckpoint'),'resume does not replay starter ammunition');
assert(!body.includes('applyPlayerVehicle('),'restore only refreshes the mesh, preserving parked car placement');
assert(source.includes("button.disabled=choice.id==='fight'&&protectedWork()"),'dialog pause cannot disable Fight');
assert(source.includes("if(hostile)return 'F punch · Move to dodge'"));
heroes.find(hero=>hero.id==='basement').onFoot=false;campaign.state.character='student';
assert(controller.selectCampaignCharacter('basement').ok);assert.equal(gameplay.state.mode,'vehicle','Milo first visit starts behind the wheel');
assert(source.includes('onFoot:!!hero&&hero.onFoot!==false'),'initial Campaign Start respects authored vehicle mode');
// A blocked preview return retains the original checkpoint without frame-loop retries.
const originalBody=controller.protagonistCheckpoint(),returnCampaign={version:2,character:'student'},returnControls=new Map();
Object.assign(env,{developerReturn:{mode:'campaign',body:originalBody,campaign:returnCampaign},selectedGameMode:'campaign',
  clearInterior(){},syncExternalVehicles(){},refreshProtagonistVehicle(){},refreshModeUI(){},
  isSandbox:()=>false,$:id=>{if(!returnControls.has(id))returnControls.set(id,{});return returnControls.get(id);}});
const previewReturn=Function('env',`with(env){${source.slice(source.indexOf('function finishDeveloperPreview('),source.indexOf("$('mission-dev-return').addEventListener"))};return finishDeveloperPreview;}`)(env);
gameplay.reset();simulation.player.x=220;simulation.player.z=12;gameplay.state.health=89;
let blockedCalls=0;simulation.canOccupy=()=>{blockedCalls++;return false;};
assert.equal(previewReturn(),false);assert.equal(env.developerReturn.blocked,true);
assert.deepEqual(env.developerReturn.body,originalBody,'failure retains full original car/health/ammunition snapshot');
assert.deepEqual(env.developerReturn.campaign,returnCampaign);assert.equal(returnControls.get('mission-dev-return').hidden,false);
const attempts=blockedCalls;assert.equal(previewReturn(),false);assert.equal(blockedCalls,attempts,'ordinary frames do not repeat failed placement work');
assert.match(controller.characterSwitchReason(),/Return from/,'pending return cannot be overwritten by a hero switch');
simulation.canOccupy=oldCanOccupy;
assert.equal(previewReturn(true),true,'explicit retry uses actual checked Gameplay restoration');
assert.equal(env.developerReturn,null);assert.equal(returnControls.get('mission-dev-return').hidden,true);
assert.deepEqual(controller.protagonistCheckpoint(),originalBody,'successful retry restores original mode, body, car, health and ammo');
console.log('Capital character controller: actual controller + Simulation/Gameplay/checkpoint integration passed.');
