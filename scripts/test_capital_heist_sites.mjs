import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { CIVIC_LANDMARKS } from '../Games/Capital Drive/civic-view.js';
import { buildHeistSites } from '../Games/Capital Drive/heist-sites.js';
import { createHeistSitesView } from '../Games/Capital Drive/heist-sites-view.js';
import { createHeistActivities } from '../Games/Capital Drive/heist-activities.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { prepareWarMemorial } from '../Games/Capital Drive/war-memorial.js';
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
const map = prepareWarMemorial(applyNorthWest(applyAirport(base, airport, airportTerrain), northWest, northWestTerrain));
map.landmarks = [...CIVIC_LANDMARKS, ...map.landmarks];
const { heightAt, isOnBridge, groundHeightAt, vehicleHeightAt } = createTerrainSampler(map);
const simulation = createSimulation(map, { heightAt, isOnBridge, groundHeightAt, vehicleHeightAt, trafficCount: 0 });
simulation.registerStaticBarriers(buildRentalStorefronts(simulation, heightAt).barriers);
simulation.registerStaticBarriers(createPoliceStations(map, simulation, heightAt).barriers);
const { sites, barriers } = buildHeistSites(map, simulation, heightAt);

assert.deepEqual(sites.slice(0, 3).map(({ id, kind, road }) => [id, kind, road]), [
  ['civic-bank', 'bank', 'Akuna Street'],
  ['manuka-jewels', 'jeweller', 'Flinders Way'],
  ['black-mountain-archive', 'tower', 'Black Mountain Drive'],
]);
assert.deepEqual(sites.slice(3).map(({ id, kind }) => [id, kind]), [['memorial-workshop', 'memorial']]);
assert.equal(barriers.length, sites.length);
simulation.registerStaticBarriers(barriers);
for (const [index, site] of sites.entries()) {
  const nearestRoad = simulation.nearestRoad(site.x, site.z);
  assert.equal(nearestRoad.road.name, site.road);
  assert(nearestRoad.distance >= roadProfile(nearestRoad.road).driveWidth / 2 + .8, 'interaction is clear of the road');
  const actor = { ...site.streetPoint };
  const dx=site.x-actor.x,dz=site.z-actor.z,steps=Math.ceil(Math.hypot(dx,dz)/4);
  for(let i=0;i<steps;i++)assert(!simulation.moveActor(actor,dx/steps,dz/steps).blocked,'public approach is walkable');
  assert(Math.hypot(actor.x-site.x,actor.z-site.z)<.1);
  if(site.kind==='tower'){
    const tower=map.landmarks.find(place=>place.id==='black-mountain-tower');
    assert(Math.hypot(site.x-tower.x,site.z-tower.z)<230,'archive stays on the mapped tower approach');
    assert(site.floor-heightAt(site.x,site.z)<=1.03,'mountain foundation keeps the entrance in reach');
  }
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

const workshop = sites.find(site => site.kind === 'memorial');
const rooms = createInteriors({ buildings: [] }, { heightAt, heistSites: [workshop] });
const actor = { x: workshop.x, z: workshop.z, yaw: workshop.yaw };
const plan = rooms.enter(rooms.findEntry(actor), actor);
assert.equal(plan.heistSiteId, workshop.id);
const heat = [], rewards = [];
const heists = createHeistActivities({ sites, onHeat: event => heat.push(event), onReward: event => rewards.push(event),
  canSee: (from, to) => from.interiorId ? rooms.hasLineOfSight(from, to) : simulation.hasLineOfSight(from, to) });
const room = { id: plan.id, storeId: plan.storeId, heistSiteId: plan.heistSiteId,
  employeeId: plan.heist.employee.id, loot: plan.heist.loot };
const context = { pose: actor, indoors: true, onFoot: true, room, wanted: 0 };
assert.equal(heists.interact(context), null, 'case interaction requires being within reach');
Object.assign(actor, room.loot);
assert(heists.interact(context).ok);
assert.equal(heists.hostageAction(context), null);
assert.equal(heists.step(.03, { ...context, indoors: false, room: null }).ok, false, 'leaving interrupts the case puzzle');
assert.equal(heat.length, 0);
assert(heists.interact(context).ok);
for (const key of heists.snapshot().challenge.sequence) {
  heists.step(.03, context);
  heists.step(.03, context, { [key]: true });
}
assert.equal(heists.snapshot().phase, 'escape');
assert.equal(heat.length, 1);
assert.equal(heat[0].kind, 'memorial');
rooms.leave(actor);
const outside = { ...context, indoors: false, room: null, wanted: 2 };
heists.step(.03, outside);
actor.x += 55;
assert.equal(heists.step(.03, outside), null, 'leaving the area alone does not satisfy the wanted condition');
assert(heists.step(.03, { ...outside, wanted: 0 }).ok);
heists.step(.03, { ...outside, wanted: 0 });
assert.deepEqual(rewards, [{ id: workshop.id, kind: 'memorial', amount: 1800 }]);
console.log('PASS four fictional heist storefronts on mapped public streets with solid facades and one reusable draw, plus the workshop puzzle and single payout');
