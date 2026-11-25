import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url)));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
map.terrainTiles = [(await json('north-terrain')).terrain];
const terrain = createTerrainSampler(map);
const lower = map.roads.find(road => road.id === '23035340-north-0');
const upper = map.roads.find(road => road.id === '75247036-north-0');
const pose = { x: -946.1485714285715, z: -2564.940857142857, yaw: 0, length: 4, width: 2 };
const ground = terrain.roadHeightAt(lower, pose.x, pose.z), deck = terrain.roadHeightAt(upper, pose.x, pose.z);
assert(deck > ground + 2.5);
assert.equal(terrain.heightAt(pose.x, pose.z), ground, 'ordinary rendered adult stands below the real Commonwealth Avenue deck');
const simulation = createSimulation(map, { trafficCount: 0, vehicleHeightAt: terrain.vehicleHeightAt,
  actorHeightAt: body => terrain.heightAt(body.x, body.z), isOnBridge: terrain.isOnBridge });
simulation.player.active = false;
// Actual source crossing, staged bodies: lower Flynn Drive and upper deck.
const car = { ...pose, id: 'crossing-car', y: deck + .18, speed: 12 };
simulation.setExternalPeople([{ id: 'player-body', x: pose.x, z: pose.z, radius: .35 }]);
assert(simulation.canOccupy(car), 'ordinary x/z-only lower adult cannot block the upper car');
assert(simulation.moveVehicle(car, .1, 0).moved, 'ordinary upper car sweeps above rendered lower adult');
assert.equal(simulation.drainVehicleImpacts().length, 0, 'separate levels create no impact');
simulation.setExternalPeople([{ id: 'player-body', x: pose.x, z: pose.z, radius: .35, y: deck, height: 1.8 }]);
assert(!simulation.canOccupy(car), 'explicit ordinary upper adult still blocks the upper car');
assert(!simulation.moveVehicle(car, -.1, 0).moved, 'same-level vehicle sweep remains blocked');
assert(simulation.drainVehicleImpacts().length > 0, 'same-level approaching car retains actual impact authority');
simulation.setExternalPeople([{ id: 'player-body', x: pose.x, z: pose.z, y: deck }]);
assert(!simulation.canOccupy({ ...car, y: deck + .18 }), 'upper adult blocks the upper car');
// Reverse direction through the production foot sweep. Its ordinary actor base
// comes from the same heightAt used by street presentation.
simulation.setExternalPeople([]);
simulation.setExternalVehicles([{ ...pose, id: 'upper-hull', y: deck + .18 }]);
const actor = { x: pose.x, z: pose.z };
assert(simulation.moveActor(actor, .1, 0).moved, 'x/z-only lower actor walks below upper car');
simulation.setExternalVehicles([{ ...pose, id: 'upper-hull', y: deck + .18 }]);
simulation.setExternalVehicles([{ ...pose, id: 'lower-hull', y: ground + .18 }]);
assert(simulation.moveActor({ x: pose.x, z: pose.z, y: deck }, .1, 0).moved, 'explicit upper actor walks above lower hull');
simulation.setExternalVehicles([{ ...pose, id: 'upper-hull', y: deck + .18 }]);
assert(simulation.moveActor({ x: pose.x, z: pose.z, y: deck }, 0, 0).blocked, 'same deck foot contact remains solid');
assert(simulation.moveActor({ x: pose.x + 1.6, z: pose.z, y: deck }, -.2, 0).blocked, 'approaching foot sweep cannot enter a same-deck hull');
assert(simulation.moveActor({ x: pose.x, z: pose.z, y: deck - 1 }, 0, 0).blocked, 'overlapping adult/hull floor intervals remain solid');
// Detached fixture isolates finite-height and workload guards from geographic
// terrain work. Empty sets and planar misses must not sample contact heights.
let actorQueries = 0, carQueries = 0;
const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, roads: [], buildings: [], spawn: { x: 80, z: 80, yaw: 0 } };
const sim = createSimulation(world, { trafficCount: 0, vehicleHeightAt: () => { carQueries++; return 0; },
  actorHeightAt: () => { actorQueries++; return 10; } });
sim.player.active = false;
carQueries = 0;
const body = { id: 'test-car', x: 0, z: 0, yaw: 0, length: 4, width: 2 };
assert(sim.canOccupy(body));
assert(sim.moveActor({ x: 0, z: 0 }, .1, 0).moved);
assert.equal(actorQueries + carQueries, 0, 'empty contact candidates sample no heights');
sim.setExternalPeople([{ id: 'near-cell', x: 4, z: 0 }]);
assert(sim.canOccupy(body));
sim.setExternalVehicles([{ ...body, id: 'near-car', x: 4 }]);
assert(sim.moveActor({ x: 0, z: 0 }, .1, 0).moved);
assert.equal(actorQueries + carQueries, 0, 'nearby planar misses sample no heights');
sim.setExternalVehicles([]);
sim.setExternalPeople([{ id: 'ordinary', x: 0, z: 0 }]);
assert(sim.canOccupy(body));
assert.equal(actorQueries, 1, 'ordinary contacting adult resolves the supplied visual base');
actorQueries = 0; carQueries = 0;
assert(sim.canOccupy({ ...body, yaw: 1 }, { fromPose: body }));
assert.equal(actorQueries, 1, 'rotating separated hull samples each adult height once');
assert.equal(carQueries, 2, 'rotating separated hull samples its two envelope ends once');
sim.setExternalPeople([{ id: 'explicit', x: 0, z: 0, y: 0, height: 1 }]);
assert(!sim.canOccupy(body), 'explicit feet and height survive without stunt support');
sim.setExternalPeople([{ id: 'invalid', x: 0, z: 0, y: NaN, height: Infinity }]);
assert(sim.canOccupy(body), 'malformed supplied height falls back to the configured actor sampler');
sim.setExternalPeople([{ id: 'tall', x: 0, z: 0, y: -3, height: 4 }]);
assert(!sim.canOccupy(body), 'overlapping vertical intervals cannot be dismissed by their feet');
sim.setExternalPeople([{ id: 'crossed-level', x: 0, z: 0, y: 4, height: 1 }]);
assert(!sim.canOccupy({ ...body, y: 8 }, { fromPose: { ...body, y: 0 } }), 'continuous vertical envelope retains crossed-floor contact');
console.log('Capital contact levels: PASS (real source crossing, ordinary rendered bases, both movement directions, explicit/floor/same-level guards and lazy height queries)');
