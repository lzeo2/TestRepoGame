import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { CIVIC_LANDMARKS } from '../Games/Capital Drive/civic-view.js';
import { buildHeistSites } from '../Games/Capital Drive/heist-sites.js';
import { createHeistSitesView } from '../Games/Capital Drive/heist-sites-view.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyNorthWest } from '../Games/Capital Drive/north-west.js';
import { createPoliceStations } from '../Games/Capital Drive/police-stations.js';
import { buildRentalStorefronts } from '../Games/Capital Drive/rental-storefronts.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyStreetAssetRoofs } from '../Games/Capital Drive/street-assets.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const load = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const [south, north, profiles, airport, airportTerrain, northTerrain, northWest, northWestTerrain] = await Promise.all(
  ['canberra', 'canberra-north', 'road-profiles', 'airport', 'airport-terrain', 'north-terrain', 'north-west', 'north-west-terrain'].map(load),
);
const base = applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(south, profiles), north));
base.terrainTiles = [northTerrain.terrain];
const map = applyNorthWest(applyAirport(base, airport, airportTerrain), northWest, northWestTerrain);
map.landmarks = [...CIVIC_LANDMARKS, ...map.landmarks];
const { heightAt, isOnBridge, groundHeightAt, vehicleHeightAt } = createTerrainSampler(map);
const simulation = createSimulation(map, { heightAt, isOnBridge, groundHeightAt, vehicleHeightAt, trafficCount: 0 });
simulation.registerStaticBarriers(buildRentalStorefronts(simulation, heightAt).barriers);
simulation.registerStaticBarriers(createPoliceStations(map, simulation, heightAt).barriers);
const { sites, barriers } = buildHeistSites(map, simulation, heightAt);

assert.deepEqual(sites.map(({ id, kind, road }) => [id, kind, road]), [
  ['civic-bank', 'bank', 'Akuna Street'],
  ['manuka-jewels', 'jeweller', 'Flinders Way'],
]);
assert.equal(barriers.length, sites.length);
simulation.registerStaticBarriers(barriers);
for (const [index, site] of sites.entries()) {
  const nearestRoad = simulation.nearestRoad(site.x, site.z);
  assert.equal(nearestRoad.road.name, site.road);
  assert(nearestRoad.distance >= roadProfile(nearestRoad.road).driveWidth / 2 + .8, 'interaction is clear of the road');
  const actor = { ...site.streetPoint };
  const step = simulation.moveActor(actor, site.x - actor.x, site.z - actor.z);
  assert(step.moved && !step.blocked && Math.hypot(actor.x - site.x, actor.z - site.z) < .1, 'public approach is walkable');
  assert(!simulation.canOccupy({ ...site.centre, yaw: site.yaw }, { length: 4.7, width: 2.2, ignoreId: 'player' }));
  assert(simulation.moveActor(actor, site.centre.x - actor.x, site.centre.z - actor.z).blocked, 'solid original facade');
  assert.equal(barriers[index].height, site.floor - site.foundation + site.height, 'collision and visual height agree');
  assert.equal(site.apron.length, 4, 'small landscaping exclusion follows the fictional storefront');
}

const scene = new THREE.Scene();
const view = createHeistSitesView(scene, sites);
const [mesh] = scene.children;
for (const site of sites) {
  view.update(site);
  assert.equal(view.stats.sites, 1);
  assert.equal(view.stats.drawCalls, 1);
  assert(view.stats.instances > 35 && view.stats.instances <= 172);
  const firstMatrix = new THREE.Matrix4();
  mesh.getMatrixAt(0, firstMatrix);
  assert(firstMatrix.elements.every(Number.isFinite));
  const version = mesh.instanceMatrix.version;
  view.update(site);
  assert.equal(mesh.instanceMatrix.version, version, 'stationary view reuses static instance data');
}
view.update(null);
assert.equal(view.stats.drawCalls, 0);
view.dispose();
view.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS two fictional heist storefronts on mapped public streets, solid facade, clear walk-up approach, and one bounded reusable draw');
