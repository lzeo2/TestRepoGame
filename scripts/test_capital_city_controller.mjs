import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute exact controller helpers with bounded owner doubles. This is adapter
// evidence, not a browser boot, native travel or graphics performance claim.
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
function helper(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  let depth = 0, quote = null, escape = false;
  const body = source.indexOf('{', start);
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
  const scope = vm.createContext(context);
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
  gameplay: { state: { actor: { ...outside }, wanted: 0, police: [] } },
  interiors: { active: plan, exteriorPose: outside, enter: () => plan, leave: () => true },
  map: { storyHomes: {} }, CAMPUS_GATES: [], compatibility: true,
  policeRooms: { enter: () => {}, leave: () => {}, prune: () => {} },
  interiorView: { load: () => {}, clear: () => {} }, activities: { load: () => {}, clear: () => {} },
  roomPeople: { load: () => {}, clear: () => {} }, roomPeopleView: { load: () => {}, clear: () => {} },
  campaignScenes: { enterInterior: (...args) => calls.push(['enter', ...args]), leaveInterior: () => calls.push(['leave']) },
  indoorCampaignScenesView: { dispose: () => calls.push(['dispose']) }, indoorActorView: null,
  syncPlayerAppearance: () => {}, clearInput: () => {}, notify: () => {}, stopMini: () => {},
  progression: { cancelActivity: () => {} }, cameraReady: true, activeCrewEntry: null,
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
assert(source.includes("traceShot:tracePlayerShot,onVehicleShot:({vehicleId,damage})=>vehicleId==='player'?gameplay.damageVehicle(damage):simulation.damageVehicle(vehicleId,damage)"));
assert(source.includes("if(event.code==='KeyL'&&!paused()){activatePower();return;}"));
assert(source.includes("if(event.code==='KeyN'&&!paused()){toggleHeadlights();return;}"));
assert(source.includes('attacksAllowed:canPlayerAttack()'));
assert(source.includes('if(!person.seated&&!person.interiorId)add(person,.32)'));
console.log('PASS city controller helpers: numeric/identity shot separation, indoor exclusion, pose-aware bridge pitch, night/manual headlights, actual room hooks/disposal and preserved power key');
