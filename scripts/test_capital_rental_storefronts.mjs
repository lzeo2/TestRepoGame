import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { buildRentalStorefronts } from '../Games/Capital Drive/rental-storefronts.js';
import { createRentalStorefrontsView } from '../Games/Capital Drive/rental-storefronts-view.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyStreetAssetRoofs } from '../Games/Capital Drive/street-assets.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const load = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const [south, north, profiles, airport, airportTerrain, northTerrain] = await Promise.all(
  ['canberra', 'canberra-north', 'road-profiles', 'airport', 'airport-terrain', 'north-terrain'].map(load),
);
const map = applyStreetAssetRoofs(applyMapExpansion(applyRoadProfiles(south, profiles), north));
map.terrainTiles = [northTerrain.terrain];
const world = applyAirport(map, airport, airportTerrain);
const { heightAt } = createTerrainSampler(world);
const initial = createSimulation(world, { trafficCount: 0 });
const { sites, barriers } = buildRentalStorefronts(initial, heightAt);
assert.deepEqual(sites.map(site => site.road), ['Kennedy Street', 'Brindabella Circuit', 'Bunda Street']);
assert.equal(barriers.length, sites.length);
const simulation = createSimulation({ ...world, barriers: [...(world.barriers || []), ...barriers] }, { trafficCount: 0 });
const body = { length: 5.2, width: 2.2, ignoreId: 'player' };
for (const site of sites) {
  assert.equal(site.returnBay, site.pickup);
  assert(simulation.hasLineOfSight(site.pickup, site));
  for (const depth of [7, 5, 3, 1, -1]) assert(simulation.canOccupy(site.point(0, depth), body), `${site.name} vehicle exit must clear`);
  assert(!simulation.canOccupy(site.point(0, 18.5), body), `${site.name} walls must be solid`);
  const actor = site.point(0, 11);
  assert(simulation.moveActor(actor, site.x - actor.x, site.z - actor.z).moved, `${site.name} door must be reachable on foot`);
  const inside = site.point(0, 17);
  assert(simulation.moveActor(actor, inside.x - actor.x, inside.z - actor.z).blocked, `${site.name} walls must stop pedestrians`);
}

const scene = new THREE.Scene();
const view = createRentalStorefrontsView(scene, heightAt, sites);
const [batch] = scene.children;
for (const site of sites) {
  view.update(site);
  assert.equal(view.stats.storefronts, 1);
  assert.equal(view.stats.drawCalls, 1);
  assert(view.stats.instances > 40 && view.stats.instances <= 112);
  const version = batch.instanceMatrix.version;
  view.update(site);
  assert.equal(batch.instanceMatrix.version, version, 'stationary view does not reupload storefronts');
}
view.update({ x: Infinity, z: 0 });
assert.equal(view.stats.drawCalls, 0);
view.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS three source-road rental storefronts, clear checked doors and vehicle exits, solid walls, and one reusable culled draw');
