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
import { createNorthPlacesView } from '../Games/Capital Drive/north-places-view.js';
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

assert.deepEqual(sites.slice(0, 2).map(({ id, kind, road }) => [id, kind, road]), [
  ['civic-bank', 'bank', 'Akuna Street'],
  ['manuka-jewels', 'jeweller', 'Flinders Way'],
]);
assert.deepEqual(sites.slice(2, 3).map(({id, kind}) => [id, kind]), [['black-mountain-archive', 'tower']]);
assert.deepEqual(sites.slice(3).map(({ id, kind }) => [id, kind]), [['memorial-workshop', 'memorial'], ['manuka-bank', 'bank']]);
assert.equal(barriers.length, 2, 'only standalone bank and jeweller add physical exterior bodies');
simulation.registerStaticBarriers(barriers);
for (const [index, site] of sites.entries()) {
  const nearestRoad = simulation.nearestRoad(site.x, site.z);
  if (!site.landmarkExterior) assert.equal(nearestRoad.road.name, site.road);
  assert(nearestRoad.distance >= roadProfile(nearestRoad.road).driveWidth / 2 + .8, 'interaction is clear of the road');
  const actor = { ...site.streetPoint };
  const dx=site.x-actor.x,dz=site.z-actor.z,steps=Math.ceil(Math.hypot(dx,dz)/4);
  for(let i=0;i<steps;i++)assert(!simulation.moveActor(actor,dx/steps,dz/steps).blocked,'public approach is walkable');
  assert(Math.hypot(actor.x-site.x,actor.z-site.z)<.1);
  if(site.landmarkExterior){
    const building=map.buildings.find(b=>b.id===site.sourceBuildingId);
    assert(building && building.sourceId===site.sourceId);
    const a=building.points[site.sourceFacadeEdge],b=building.points[site.sourceFacadeEdge+1];
    const front=site.point(0,0);
    const fraction=site.sourceFacadeFraction??.5;
    assert(Math.hypot(front.x-a[0]-(b[0]-a[0])*fraction,front.z-a[1]-(b[1]-a[1])*fraction)<1e-8,'entry uses the actual source facade');
    assert(Math.abs(Math.hypot(site.x-front.x,site.z-front.z)-(site.approachDistance??2.05))<1e-8,'admitted pose stays outside the real building');
    assert.equal(site.apron.length,0,'no invented second-landmark apron');
    assert(!barriers.some(barrier=>barrier.id===`${site.id}-walls`),'mapped landmark retains sole exterior collision owner');
    assert.equal(site.floor,heightAt(front.x,front.z),'entry uses local source terrain, no raised storefront platform');
    assert.deepEqual(site.exits.map(exit=>exit.id),site.kind==='bank'?[]:['main','side']);
    if(site.vaultPuzzle){
      assert.equal(site.road,'Captain Cook Crescent');
      assert.equal(site.sourcePlaceId,'node/439239484');
      assert.equal(site.sourceBuildingId,'act-87705-0');
    }
    for(const exit of site.exits){
      const walker={x:site.x,z:site.z},dx=exit.x-walker.x,dz=exit.z-walker.z,n=Math.ceil(Math.hypot(dx,dz)/.2);
      for(let j=0;j<n;j++)assert(!simulation.moveActor(walker,dx/n,dz/n).blocked,'both authored extraction points are physically reachable');
      assert(Math.hypot(walker.x-exit.x,walker.z-exit.z)<.1);
    }
    const roomYaw=site.yaw+Math.PI,local=site.point(2,3);
    assert(Math.hypot(local.x-front.x-Math.cos(roomYaw)*2-Math.sin(roomYaw)*3,
      local.z-front.z+Math.sin(roomYaw)*2-Math.cos(roomYaw)*3)<1e-8,'site.point exactly agrees with the lazy interior room transform');
    const interior=createInteriors(map,{heightAt,heistSites:[site]});
    const admitted={x:site.x,z:site.z,yaw:site.yaw},entry=interior.findEntry(admitted);
    assert.equal(entry?.heistSiteId,site.id,'normal public pose finds this landmark room entry');
    assert.equal(entry.buildingId,site.sourceBuildingId,'entry retains the real source body owner');
    const plan=interior.enter(entry,admitted);
    assert.equal(plan.buildingId,site.sourceBuildingId,'lazy room plan retains source body metadata');
    assert.equal(plan.heistSiteId,site.id);
    interior.leave(admitted);
    assert(Math.hypot(admitted.x-site.x,admitted.z-site.z)<1e-8,'room exit returns the exact admitted public pose');
    assert(simulation.canOccupy(admitted,{length:.6,width:.6,ignoreId:'player'}),'normal room exit is clear of the unchanged landmark body');
  }
  assert(!simulation.canOccupy({ ...site.centre, yaw: site.yaw }, { length: 4.7, width: 2.2, ignoreId: 'player' }));
  assert(simulation.moveActor(actor, site.centre.x - actor.x, site.centre.z - actor.z).blocked, 'solid original facade');
  if(!site.landmarkExterior){
    const barrier=barriers.find(barrier=>barrier.id===`${site.id}-walls`);
    assert.equal(barrier.height, site.floor - site.foundation + site.height, 'collision and visual height agree');
    assert.equal(site.apron.length, 4, 'small landscaping exclusion follows the fictional storefront');
  }
}

const scene = new THREE.Scene();
const view = createHeistSitesView(scene, sites);
const [mesh] = scene.children;
for (const site of sites) {
  view.update(site);
  const visible=sites.filter(other=>Math.hypot(site.x-other.x,site.z-other.z)<340).length;
  assert.equal(view.stats.sites, visible);
  assert.equal(view.stats.drawCalls, 1);
  assert(view.stats.instances > 20 && view.stats.instances <= 172*visible);
  if(site.landmarkExterior){
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
    let attached=0;
    for(let j=0;j<mesh.count;j++){
      mesh.getMatrixAt(j,matrix);matrix.decompose(position,rotation,scale);
      if(visible>1&&Math.hypot(position.x-site.front.x,position.z-site.front.z)>5)continue;
      assert(scale.z<=.23,'landmark marker has no separate building shell/apron');
      assert(Math.hypot(position.x-site.front.x,position.z-site.front.z)<2,'all doorway art remains attached to mapped facade');
      attached++;
    }
    assert(attached>20,'source doorway includes a readable cue in the pooled batch');
  }
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

const towerSite=sites.find(site=>site.kind==='tower');
const tower=map.landmarks.find(place=>place.id==='black-mountain-tower');
const towerFootprint=map.buildings.find(building=>building.id===towerSite.sourceBuildingId).points;
assert.equal(tower.buildingId,towerSite.sourceBuildingId,'tower mesh and door use the same source body');
const towerVisual=createNorthPlacesView(scene,{tower,towerFootprint,heightAt});
scene.updateMatrixWorld(true);
const podium=scene.getObjectByName('Tower podium on the mapped footprint');
const podiumVertices=podium.geometry.getAttribute('position');
for(let i=0;i<podiumVertices.count;i++){
  const p=podium.localToWorld(new THREE.Vector3().fromBufferAttribute(podiumVertices,i));
  assert(towerFootprint.some(([x,z])=>Math.hypot(p.x-x,p.z-z)<.001),'podium geometry extends to the source facade');
}
assert(new THREE.Box3().setFromObject(podium).max.y>towerSite.floor+3.87,'the attached entrance fits below the podium roof');
towerVisual.dispose();

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
console.log('PASS two landmark doors, source-backed Manuka bank and two standalone sites: public walking routes, unchanged source collision, exact lazy rooms, bounded door art, gallery puzzle and single payout');
