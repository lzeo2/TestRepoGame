import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { FUEL_STATIONS, applyStreetAssetRoofs, selectStreetAssets } from '../Games/Capital Drive/street-assets.js';
import { createStreetAssetsView } from '../Games/Capital Drive/street-assets-view.js';
import { createNitroStations, createNitroStationDamage, nitroRefillQuote, NITRO_REFILL_COST, PUMP_DAMAGE_SCALE, PUMP_FIRE_HEALTH } from '../Games/Capital Drive/nitro-stations.js';
import { createVehicleFires } from '../Games/Capital Drive/vehicle-damage.js';
import { buildPetrolForecourts } from '../Games/Capital Drive/petrol-forecourts.js';
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
assert.equal(marked.stats.instances, original.stats.instances + 8 * visibleBayCount);
assert.equal(marked.stats.drawCalls, 1, 'nitro paint reuses the street furniture geometry, material and draw');
const {sites: petrolForecourts, barriers} = buildPetrolForecourts(nitroStations, FUEL_STATIONS, simulation, () => 0, map.buildings);
assert.equal(petrolForecourts.length, nitroStations.length);
assert(petrolForecourts.every(site => site.canopy && site.sign && site.pumps.length > 0));
assert(petrolForecourts.every(site => site.paving.length <= 25), 'checked paving remains a small forecourt surface');
assert.equal(petrolForecourts.filter(site=>site.canopy.existing).length,5,'five mapped roofs retain their source geometry');
const bodyProbe={length:1,width:.5,ignoreId:'player'};
const solidProbes=barriers.map(({points})=>({
  x:points.reduce((sum,point)=>sum+point[0],0)/points.length,
  z:points.reduce((sum,point)=>sum+point[1],0)/points.length,yaw:0,
}));
assert(solidProbes.length>0 && solidProbes.every(p=>simulation.canOccupy(p,bodyProbe)),'supports and islands fit the clear source forecourt');
simulation.registerStaticBarriers(barriers);
assert(solidProbes.every(p=>!simulation.canOccupy(p,bodyProbe)),'rendered grounded forecourt objects have matching solid colliders');
for (const bay of nitroStations) {
  assert(simulation.canOccupy(bay,{length:5.2,width:2.1,ignoreId:'player'}),'a full-size car fits under each overhead canopy');
  assert(simulation.previewTeleport(bay).ok,'Free roam can still reach every bay');
}
const sampleCourt = petrolForecourts.find(site => site.id === kingston.id);
assert(sampleCourt && !sampleCourt.canopy.existing, 'Kingston needs an original canopy beside the retained solid building');
assert(sampleCourt.paving.some(tile => tile.x === kingston.x && tile.z === kingston.z));
const courtScene = new THREE.Scene();
const courts = createStreetAssetsView(courtScene, () => 0, { nitroStations, petrolForecourts });
for (const bay of nitroStations) {
  const nearbyIds = new Set(selectStreetAssets(bay).fuelStations.map(station => station.id));
  const nearby = petrolForecourts.filter(site => nearbyIds.has(site.id));
  courts.update(bay);
  assert.equal(courts.stats.petrolCanopies, nearby.filter(site => !site.canopy.existing).length);
  assert.equal(courts.stats.petrolPylons, nearby.length);
  assert.equal(courts.stats.drawCalls, 1, 'forecourts keep the existing instanced draw');
  assert(courts.stats.instances < 2048);
}
courts.update(kingston);
const [courtMesh] = courtScene.children;
assert.equal(courtScene.children.length, 1);
const meshPose = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
let roof = false, column = false, signFace = false, pavement = false;
for (let i = 0; i < courtMesh.count; i++) {
  courtMesh.getMatrixAt(i, meshPose);
  position.setFromMatrixPosition(meshPose);
  scale.setFromMatrixScale(meshPose);
  if (Math.hypot(position.x - sampleCourt.canopy.x, position.z - sampleCourt.canopy.z) < .01 &&
      Math.abs(scale.x - sampleCourt.canopy.width) < .01 && Math.abs(scale.z - sampleCourt.canopy.depth) < .01) roof ||= position.y - scale.y / 2 >= 4.19;
  const [foot] = sampleCourt.canopy.feet;
  if (Math.hypot(position.x - foot.x, position.z - foot.z) < .01 && scale.y > 3.8) column = true;
  if (Math.hypot(position.x - sampleCourt.sign.x, position.z - sampleCourt.sign.z) < .01 &&
      scale.x > 2.5 && position.y > 3) signFace = true;
  if (Math.hypot(position.x - kingston.x, position.z - kingston.z) < .01 &&
      position.y > 0 && scale.x > 1 && scale.y < .05) pavement = true;
}
assert(roof && column && signFace && pavement, 'actual instance transforms include the canopy, support, pylon board and slab beneath the car');
courts.update(null);
assert.equal(courts.stats.petrolCanopies + courts.stats.petrolPylons, 0);
courts.dispose();
assert.equal(courtScene.children.length, 0);
marked.dispose(); original.dispose();

const stationDamage = createNitroStationDamage(nitroStations, { groundHeightAt: () => 2 });
const pump = stationDamage.pumpFor(`pump:${kingston.id}`);
assert(pump && pump.health === PUMP_FIRE_HEALTH && !stationDamage.outOfService(kingston.id));
assert(stationDamage.near(kingston.x, kingston.z, 12).some(entry => entry.id === pump.id));
assert(!stationDamage.near(kingston.x + 500, kingston.z, 12).some(entry => entry.id === pump.id));
const stationFires = createVehicleFires({ resolve: id => stationDamage.pumpFor(id),
  damage: (id, amount) => stationDamage.burn(id, amount), heightAt: car => car.y });
const strike = amount => {
  const previous = pump.health;
  if (!stationDamage.damage(pump.id, amount)) return false;
  const ignited = stationFires.recordShot(pump, previous);
  if (ignited) stationDamage.markBurning(pump.id);
  return ignited;
};
assert(!strike(55), 'a single pistol round only wounds the small pump fixture');
assert.equal(pump.health, PUMP_FIRE_HEALTH - 55 * PUMP_DAMAGE_SCALE);
assert(strike(55), 'a second sustained round reaches the shared ignition band');
assert(stationDamage.outOfService(kingston.id));
stationFires.step(.1);
const pool = stationFires.snapshot({ x: pump.x, z: pump.z });
assert.equal(pool.length, 1, 'a burning station claims exactly one shared fire pool slot');
assert.equal(pool[0].fire, 1); assert.equal(pool[0].length, pump.length); assert.equal(pool[0].y, 2);
for (let step = 0; step < 60; step++) stationFires.step(.1);
assert.equal(pump.health, 0, 'the shared burn tick consumes the pump budget');
const blasts = stationFires.drainExplosions();
assert.equal(blasts.length, 1); assert.equal(blasts[0].kind, 'vehicle-fire');
assert.equal(blasts[0].sourceVehicleId, pump.id);
assert(Math.abs(blasts[0].x - kingston.x) < .01 && Math.abs(blasts[0].z - kingston.z) < .01);
assert(Number.isFinite(blasts[0].y));
for (let step = 0; step < 80; step++) stationFires.step(.1);
assert.equal(stationFires.tracked, 0, 'wreck smoke expires exactly like wrecked vehicles');
assert(stationDamage.outOfService(kingston.id), 'a burned pump stays out of service for the session');
assert(!stationFires.recordShot(pump, pump.health), 'wrecked pumps never reignite');
tank.nitroFuel = .25;
const closedQuote = nitroRefillQuote(nitroStations, tank, context, 500, () => true, id => stationDamage.outOfService(id));
assert(!closedQuote.ok && closedQuote.reason === 'The petrol station is burning.' && closedQuote.station.id === kingston.id);
const burningCareer = createProgression(map, null, {
  nitroStations,
  hasLineOfSight: (car, bay) => visible && simulation.hasLineOfSight(car, bay),
  isNitroStationDestroyed: id => stationDamage.outOfService(id),
});
const beforeCash = burningCareer.state.cash;
const refusal = burningCareer.refillNitro(tank, context);
assert(!refusal.ok && refusal.message === 'The petrol station is burning.');
assert.equal(tank.nitroFuel, .25); assert.equal(burningCareer.state.cash, beforeCash);
const otherBays = createNitroStationDamage(nitroStations, { groundHeightAt: () => 0 });
for (const bay of nitroStations) if (bay.id !== kingston.id) otherBays.pumpFor(`pump:${bay.id}`).burning = true;
assert(nitroRefillQuote(nitroStations, tank, context, 500, () => true, id => otherBays.outOfService(id)).ok,
  'an intact bay still refills while every other station burns');

console.log(`PASS ${nitroStations.length} checked petrol bays, actual refill guards, cyan paint, pylon and supported canopy geometry in one bounded draw, destroyable pumps with gunfire ignition, session refusal and one bounded fire pool slot`);
