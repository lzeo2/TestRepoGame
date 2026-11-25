import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createProtagonistState, PROTAGONIST_IDS } from '../Games/Capital Drive/protagonist-state.js';
import { WEAPONS } from '../Games/Capital Drive/weapons.js';

const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function controller(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must remain owned by the controller`);
  let end = source.indexOf('{', start) + 1, depth = 1;
  while (depth) { assert(end < source.length); depth += (source[end] === '{') - (source[end] === '}'); end++; }
  return source.slice(start, end);
}

const map = { bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }, spawn: { x: 0, z: 0 }, landmarks: [
  { id: 'coals', name: 'Coals', store: true, x: 100, z: 10 },
  { id: 'canberra-centre', x: 200, z: -400 },
  { id: 'store-5656111023', name: 'Lambzhou 1919', x: 300, z: -420 },
] };
let campaign = createCampaign(map);
const progression = createProgression(map);
const initialContext = { pose: { x: 0, z: 0, speed: 0 }, onFoot: true, wanted: 0,
  respawnSerial: 0, campaign: true, sandbox: false, health: 71, vehicleHealth: 63 };
assert(campaign.selectCharacter('student', initialContext).ok);
const entry = { id: 'actual-room', x: 7, z: 9, yaw: .1, y: 0 };
const initialRoom = { id: entry.id, floorY: .14 };
const outside = { x: 7, z: 7, yaw: .3 };
const actorInside = { x: 9, z: 11, yaw: 1, y: .14, speed: 0, jumpHeight: 0, impactTime: 0 };
const copy = value => JSON.parse(JSON.stringify(value));
const nearly = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < .001;
const ammoPools = Object.fromEntries(WEAPONS.map(weapon => [weapon.id, { ammo: 0, reserveAmmo: 0 }]));
ammoPools.pistol = { ammo: 7, reserveAmmo: 19 };
const startAmmo = copy(ammoPools);
const vehicle = { modelId: 'lantern', color: '#e7e6df', stolen: false };
const state = { mode: 'foot', recovery: null, health: 71, vehicleHealth: 63, weapon: 'pistol', wanted: 2,
  offencePressure: 4, pursuit: 'search', heat: 3,
  actor: { ...actorInside }, respawnSerial: 0, vehicle: { ...vehicle } };
const simulation = { player: { x: 4, z: 12, yaw: .3 }, driving: { nitroFuel: 22 },
  abandonedCars: [{ id: 'old-car', x: 20, z: 40, active: true }], moveActor: () => ({ blocked: false }) };
const interiors = { active: initialRoom, entries: [entry], exteriorPose: outside,
  findEntry: pose => !interiors.active && nearly(pose, outside) ? entry : null,
  moveActor: () => ({ blocked: false }) };
progression.state.equipment.pistol = true;
progression.state.cash = 760;
const write = [], notices = [], initialDestination = { id: 'private-route', x: 70, z: 80 };
let obstructed = true, placementChecks = 0, hadWeapon = false;
const env = {
  started: true, clearingProgress:false, gameMode: 'campaign', careerError: '', missionCheckpoint: null, developerReturn: null,
  campaignWorld:null,streetWorld:null,campaignAftermath:null,heists:null,lightRail:null,
  inquiryOfficer:null,inquiryHarm:false,policeStations:null,shotObstacles:null,
  campaign, progression, simulation, interiors, map, PROTAGONIST_IDS,
  createProtagonistState: (saved, { bounds }) => createProtagonistState(saved, { bounds }),
  protagonists: createProtagonistState(null, { bounds: map.bounds }),
  isSandbox: () => false, streetChallenge: () => null, CAREER_KEY: 'fixture-save',
  selectedPaint: vehicle.color, playerCarKey: 9, lastJobTarget: '', mapSelection: null,
  destination: initialDestination, route: [], accumulator: 3, footCameraYaw: .5, footLookPitch: 0,
  orbit: .2, orbitHeight: 0, orbitHold: 0, lookPitch: 0, cockpitCamera: false, cameraReady: true,
  previousActorMode: 'foot', aircraftRescueHealth: null, followYoober: false, fireWarningKey: null,
  aircraft: { active: null, reset() {}, snapshot: () => ({planes:[]}) }, delivery: { busy: true },
  jetpack: null, buses: null, micromobility: null, equipment: null, ordnance: null,
  skylineLease: null, MISSION_FAILURE_HOLD: 1.6, MISSION_FAILURE_FADE: .8, missionFailureTitle: null,
  beginMissionFailureTitle: () => {}, updateMissionFailureTitle: () => {}, clearMissionFailureTitle: () => {},
  gameplay: {
    state, setWeapon(id) { state.weapon = id; },
    missionRecoverySnapshot: () => ({ wanted: state.wanted, offencePressure: state.offencePressure, heat: state.heat, pursuit: state.pursuit, equipped: ['pistol'] }),
    restoreMissionCheckpoint(body, { canRestoreWeapon, commit }) {
      placementChecks++;
      assert.deepEqual(simulation.abandonedCars.map(car => car.id), ['old-car']);
      hadWeapon = canRestoreWeapon('pistol');
      assert(hadWeapon, 'owned prelaunch weapon remains recoverable after storing it during the mission');
      if (obstructed) return { ok: false, reason: 'vehicle-blocked' };
      assert.equal(commit(), true);
      assert(progression.state.equipment.pistol, 'career rollback owns restored weapon before body commit');
      Object.assign(state, { mode: body.mode, health: body.health, weapon: body.weapon, wanted: body.wanted,
        vehicleHealth: body.vehicle.health, vehicle: { modelId: body.vehicle.modelId, color: body.vehicle.color, stolen: body.vehicle.stolen }, recovery: null });
      Object.assign(state.actor, body.actor);
      Object.assign(simulation.player, { x: body.vehicle.x, z: body.vehicle.z, yaw: body.vehicle.yaw });
      Object.assign(ammoPools, copy(body.ammunition));
      return { ok: true, adjusted: false };
    },
    reportOffence() {},
  },
  protagonistCheckpoint() {
    const pose = interiors.exteriorPose || state.actor;
    return { mode: state.mode, actor: { x: pose.x, z: pose.z, yaw: pose.yaw },
      vehicle: { ...simulation.player, ...state.vehicle, health: state.vehicleHealth },
      health: state.health, weapon: state.weapon, ammunition: copy(ammoPools) };
  },
  careerContext: () => ({ ...initialContext, pose: state.actor, health: state.health, wanted: state.wanted,
    respawnSerial: state.respawnSerial, recovering: Boolean(state.recovery) }),
  activities: { snapshot: () => ({ active: false }) }, campaignScenes: { people: [], clear() {} }, contractTarget: null,
  rideService: { drainEvents: () => [], reset() {} }, heroPowers: { cancelActive() {} }, vehicleDamage: { reset() {} }, watercraft: null,
  clearRecon() {}, closeDialogs() {}, clearInput() {}, resetDelivery() {}, syncExternalVehicles() {}, syncExternalPeople() {},
  clearInterior() { interiors.active = null; interiors.exteriorPose = null; },
  enterInterior(selected) { assert.equal(selected, entry); interiors.exteriorPose = { ...state.actor }; interiors.active = initialRoom; },
  pedestrians: { resetPopulation() {} }, refreshProtagonistVehicle() {}, syncPlayerAppearance() {}, streetUI: { refresh() {} },
  focus: () => state.actor,
  notify: message => notices.push(message),
  captureCareerInventory: () => progression.saveInventory('student', ammoPools), captureActiveProtagonist() {},
  localStorage: { setItem(key, value) { assert.equal(key, 'fixture-save'); write.push(JSON.parse(value)); } },
  campaignNavigationTarget: () => campaign.state.active?.target, routeTo(target) { assert(target); env.destination = target; },
  finishDeveloperPreview() {}, recordCameraWorkEvent() {},
};
vm.createContext(env);
vm.runInContext([
  'missionLaunchReason', 'startCampaignMission', 'reportCampaignIncident', 'captureMissionPosition', 'rememberMissionStep', 'advanceCampaign',
  'activeWorldRecord', 'resetCampaignWorld', 'acceptMissionCheckpoint', 'prepareFailedMissionReturn',
  'restoreMissionRoom', 'restoreFailedMission', 'endCampaignAttempt', 'saveCareer', 'updateCareer',
].map(controller).join('\n'), env);

env.startCampaignMission();
assert.equal(campaign.state.active, null, 'an outstanding delivery cannot start overlapping transactional activity');
assert.equal(write.length, 0);
env.delivery.busy = false;
env.startCampaignMission();
assert(campaign.state.active);
assert.equal(write.length, 1);
const before = write[0];
const startedBody = env.missionCheckpoint.body;
assert.equal(startedBody.health, 71);
assert.equal(startedBody.wanted, 2);
assert.equal(startedBody.weapon, 'pistol');
progression.state.equipment.pistol = false;
progression.state.cash += 300;
progression.state.gear.grenades = 4;
progression.state.ownedVehicles[0].health = 4;
env.protagonists.capture('corporate', env.protagonistCheckpoint());
Object.assign(simulation.player, { x: 400, z: 400, yaw: 0 });
Object.assign(state.actor, { x: 360, z: 400 });
simulation.abandonedCars.push({ id: 'during-mission-car', x: 4, z: 12, active: true });
simulation.driving.nitroFuel = 0;
env.playerCarKey = 28;
env.footCameraYaw = 2;
ammoPools.pistol = { ammo: 0, reserveAmmo: 0 };
state.health = 0; state.wanted = 5; state.recovery = { phase: 'out' };
env.saveCareer();
assert.equal(write.length, 1, 'autosave never records partial mission gains/spending');
campaign.update(.1, env.careerContext());
assert.equal(campaign.state.active, null);
env.updateCareer(.016);
assert.equal(placementChecks, 1);
assert.equal(progression.state.cash, 1060, 'obstructed placement cannot partially roll back economy');
assert.equal(simulation.abandonedCars.length, 2);
assert(env.missionCheckpoint?.failure);
env.updateCareer(.25); assert.equal(placementChecks, 1, 'retry cadence is bounded');
obstructed = false;
env.updateCareer(.25);
assert.equal(placementChecks, 2);
assert.equal(campaign.state.active?.stage, 0, 'step 1 automatically starts again at the original launch');
assert(env.missionCheckpoint, 'retry retains the prelaunch transaction');
assert.equal(state.recovery, null, 'mission recovery preempts penalty and safehouse transfer');
assert.equal(state.health, 71); assert.equal(state.weapon, 'unarmed'); assert.equal(state.wanted, 2);
assert.equal(state.vehicleHealth, 63);
assert.deepEqual(ammoPools, startAmmo);
assert.deepEqual(state.actor, actorInside);
assert.deepEqual(simulation.player, { x: 4, z: 12, yaw: .3 });
assert.equal(simulation.abandonedCars.length, 1);
assert.equal(simulation.driving.nitroFuel, 22); assert.equal(env.playerCarKey, 9); assert.equal(env.footCameraYaw, .5);
assert.equal(interiors.active, initialRoom);
assert.deepEqual(copy(env.destination), copy(campaign.state.active.target), 'retry routes to the restored step');
assert.equal(env.protagonists.get('corporate'), null, 'shared ally changes do not alter other protagonist checkpoints');
assert.equal(write.length, 1, 'a retry does not persist partial progress');
assert.match(notices.at(-1), /Retrying step 1/);
assert.equal(env.restoreFailedMission(20), true); assert.equal(placementChecks, 2);

assert(campaign.state.active);
progression.state.cash = 999;
assert(env.endCampaignAttempt());
assert.equal(progression.state.cash, before.cash, 'manual abandon returns the checkpoint as well');
assert.equal(campaign.state.active, null);
assert.equal(env.missionCheckpoint, null);
assert.deepEqual(copy(env.destination), initialDestination);
assert.equal(write.length, 2); assert.deepEqual(write.at(-1), before);
// Completion commits transaction effects, then publishes reward and career together.
env.startCampaignMission();
assert(campaign.state.active);
progression.state.cash = 999;
campaign.state.active = null;
const actualDrain = campaign.drainEvents;
campaign.drainEvents = () => [{ type: 'complete', reward: 120, message: 'Completed' }];
env.updateCareer(.02);
campaign.drainEvents = actualDrain;
assert.equal(env.missionCheckpoint, null);
assert.equal(progression.state.cash, 1119);
assert.equal(write.at(-1).cash, 1119);
assert.equal(placementChecks, 3);
const completedWrites = write.length;
env.clearingProgress = true;
env.saveCareer();
assert.equal(write.length, completedWrites, 'autosave cannot recreate progress while the clear action reloads');

// Drive an authored four-step optional flight through the same controller.
env.clearingProgress = false;
const story = campaign.journal().shared.map(chapter => chapter.id);
campaign = createCampaign(map, { version: 1, completed: story });
env.campaign = campaign;
env.clearInterior();
const helicopter={id:'test-heli',kind:'helicopter',x:22,z:40,altitude:2,airborne:false,wrecked:false};
const jet={id:'test-jet',kind:'jet',x:50,z:70,altitude:0,airborne:false,wrecked:false};
Object.assign(env.aircraft,{
  snapshot:()=>({planes:[helicopter,jet]}),
  captureCheckpoint(){return {active:this.active&&copy(this.active)};},
  restoreCheckpoint(token){this.active=token.active&&copy(token.active);return {ok:true};},
  reset(){this.active=null;state.passenger=false;},
});
env.careerContext=()=>({...initialContext,pose:env.aircraft.active||state.actor,aircraft:env.aircraft.active,
  health:state.health,onFoot:!env.aircraft.active,wanted:state.wanted,respawnSerial:state.respawnSerial,recovering:Boolean(state.recovery)});
state.wanted=0;
const beforeFlight=progression.state.cash,groundActor={x:state.actor.x,z:state.actor.z,yaw:state.actor.yaw};
env.startCampaignMission('above-the-paperwork');
const flightWrites=write.length;
env.aircraft.active={...helicopter};
state.passenger=true;
for(let i=0;i<18;i++)env.advanceCampaign(.1);
assert.equal(campaign.state.active.stage,1);
assert.equal(env.missionCheckpoint.steps.at(-1).inFlight,true,'seated aircraft gets a retry checkpoint');
assert.deepEqual(copy(env.missionCheckpoint.steps.at(-1).body.actor),groundActor,'flight checkpoint keeps a clear ground body anchor');
progression.state.cash+=200;
env.aircraft.active={...helicopter,altitude:17,airborne:true};
for(let i=0;i<18;i++)env.advanceCampaign(.1);
assert.equal(campaign.state.active.stage,2);
const failFlight=()=>{
  state.recovery={phase:'out'};state.health=0;
  env.advanceCampaign(.1);
  env.updateCareer(.016);
};
failFlight();
assert.equal(campaign.state.active.stage,1,'failure at step 3 retries step 2');
assert.equal(env.aircraft.active.altitude,2,'retry recovers the prior stage aircraft');
assert.equal(progression.state.cash,beforeFlight,'retry reverses spending and gains after the selected step');
assert.equal(write.length,flightWrites,'retry keeps the disk prelaunch snapshot');
state.passenger=true;
failFlight();
assert.equal(campaign.state.active.stage,0,'repeated failure at step 2 can still retry step 1');
assert.equal(env.aircraft.active,null,'step 1 restores the starting foot state');
assert(env.endCampaignAttempt(),'the same attempt can still cancel back to its original state');
assert.equal(progression.state.cash,beforeFlight);
console.log('PASS actual mission checkpoint controller: precise launch/step rewind, blocked retry, exact aircraft and economy restore, cancellation and completion.');
