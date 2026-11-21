import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { FUEL_STATIONS, applyStreetAssetRoofs, selectStreetAssets } from '../Games/Capital Drive/street-assets.js';
import { createStreetAssetsView } from '../Games/Capital Drive/street-assets-view.js';
import { createNitroStations, NITRO_REFILL_COST } from '../Games/Capital Drive/nitro-stations.js';
import { createProgression } from '../Games/Capital Drive/progression.js';

const json = async key => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${key}.json`, import.meta.url), 'utf8'));
const [south, north, profiles, airport, terrain] = await Promise.all(
  ['canberra', 'canberra-north', 'road-profiles', 'airport', 'airport-terrain'].map(json),
);
const map = applyAirport(applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(south, profiles), north)), airport, terrain);
const simulation = createSimulation(map, { trafficCount: 0, nitroAutoRecharge: false });
const nitroStations = createNitroStations(FUEL_STATIONS, simulation);
assert.equal(NITRO_REFILL_COST, 45);
assert.equal(nitroStations.length, FUEL_STATIONS.filter(site => site.category === 'petrol').length);
assert.equal(new Set(nitroStations.map(site => site.id)).size, nitroStations.length);
assert(Object.isFrozen(nitroStations));
for (const bay of nitroStations) {
  assert(Object.isFrozen(bay));
  const site = FUEL_STATIONS.find(source => source.id === bay.id);
  assert.equal(site.category, 'petrol');
  assert(Math.hypot(bay.x - site.x, bay.z - site.z) <= 22);
  const road = simulation.nearestRoad(bay.x, bay.z);
  assert(simulation.hasLineOfSight(bay, road));
  assert(road.road.type === 'service' || road.distance >= roadProfile(road.road).driveWidth / 2 + 3.5);
  assert(simulation.canOccupy(bay, { length: 5.2, width: 2.1 }));
}
const kingston = nitroStations.find(bay => bay.sourceName === 'BP Express Kingston');
assert(kingston && simulation.teleport(kingston).ok);
assert(Math.hypot(simulation.player.x - kingston.x, simulation.player.z - kingston.z) <= kingston.radius);
const context = {
  pose: simulation.player, onFoot: false, sandbox: false, passenger: false, recovering: false,
  interior: false, airborne: false, health: 100, vehicleHealth: 100, wanted: 5, respawnSerial: 0,
};
let visible = true;
const career = createProgression(map, null, {
  nitroStations,
  hasLineOfSight: (car, bay) => visible && simulation.hasLineOfSight(car, bay),
});
const tank = simulation.driving;
tank.nitroFuel = .25;
const cash = career.state.cash;
for (const overrides of [{ onFoot: true }, { airborne: true }, { recovering: true }, { vehicleHealth: 0 },
  { passenger: true }, { interior: true }, { health: 0 }, { pose: { ...context.pose, vx: 2 } },
  { pose: { ...context.pose, x: context.pose.x + 100 } }]) {
  assert(!career.refillNitro(tank, { ...context, ...overrides }).ok);
  assert.equal(career.state.cash, cash);
  assert.equal(tank.nitroFuel, .25);
}
visible = false;
assert(!career.refillNitro(tank, context).ok, 'obstructed bays cannot refill across walls');
visible = true;
assert.equal(career.nitroOffer(tank, context).station.id, kingston.id);
assert.equal(career.refillNitro(tank, context).cost, NITRO_REFILL_COST, 'wanted players can pay when stopped');
assert.equal(tank.nitroFuel, 1);
assert.equal(career.state.cash, cash - NITRO_REFILL_COST);
assert(!career.refillNitro(tank, context).ok, 'repeated interaction on a full tank never charges');
assert.equal(career.state.cash, cash - NITRO_REFILL_COST);
tank.nitroFuel = .25;
career.state.cash = 0;
assert(!career.refillNitro(tank, context).ok);
assert.equal(tank.nitroFuel, .25);
assert.equal(career.refillNitro(tank, { ...context, sandbox: true }).cost, 0);
assert.equal(tank.nitroFuel, 1);
assert.equal(career.state.cash, 0);

tank.nitroFuel = .25;
for (let step = 0; step < 60; step++) simulation.step(1 / 60);
assert.equal(tank.nitroFuel, .25, 'stopped career vehicle never refills itself');
simulation.setNitroAutoRecharge(true);
for (let step = 0; step < 60; step++) simulation.step(1 / 60);
assert(Math.abs(tank.nitroFuel - .30) < 1e-9, 'Free roam retains existing automatic recharge');

const scene = new THREE.Scene(), original = createStreetAssetsView(scene, () => 0),
  marked = createStreetAssetsView(scene, () => 0, { nitroStations });
original.update(kingston); marked.update(kingston);
const visibleBayCount = selectStreetAssets(kingston).fuelStations.length;
assert(visibleBayCount > 0);
assert.equal(marked.stats.instances, original.stats.instances + 4 * visibleBayCount);
assert.equal(marked.stats.drawCalls, 1, 'nitro paint reuses the street furniture geometry, material and draw');
marked.dispose(); original.dispose();
console.log(`PASS ${nitroStations.length} checked petrol bays, actual stop/LOS/cash/wanted refill guards, no double charge, Free roam recharge and one instanced marker draw`);
