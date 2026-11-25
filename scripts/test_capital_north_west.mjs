import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyDefenceDepot } from '../Games/Capital Drive/defence-depot.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { createMapProjection, mapPointFromClient } from '../Games/Capital Drive/map-projection.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';
import { applyNorthWest } from '../Games/Capital Drive/north-west.js';
import { applyRoadProfiles, createRoutePlanner, roadProfile } from '../Games/Capital Drive/road-network.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const names = ['canberra', 'canberra-north', 'road-profiles', 'north-terrain', 'airport', 'airport-terrain',
  'north-west', 'north-west-terrain'];
const inputs = new Map(await Promise.all(names.map(async name => {
  const bytes = await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url));
  return [name, { data: JSON.parse(bytes), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
})));
const data = name => inputs.get(name).data;
const overlay = data('north-west'), elevation = data('north-west-terrain');
assert.equal(elevation.terrain.streetSidecarSha256, inputs.get('north-west').sha256);
assert.equal(elevation.terrain.sourceSha256, overlay.terrainRequirements.sourceSha256);
assert(overlay.meta.source.files.length > 1 && overlay.meta.source.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
assert.equal(overlay.meta.source.license, 'ODbL-1.0');
for (const { file, sha256 } of overlay.meta.existingSnapshots) {
  assert.equal(inputs.get(file.slice(0, -5)).sha256, sha256, `seam source revision for ${file}`);
}

const civic = applyMapExpansion(applyRoadProfiles(data('canberra'), data('road-profiles')), data('canberra-north'));
civic.terrainTiles = [data('north-terrain').terrain];
const prior = applyDefenceDepot(applyAirport(civic, data('airport'), data('airport-terrain')));
const map = applyNorthWest(prior, overlay, elevation);
assert.equal(map.mapExpansion, prior.mapExpansion);
assert.deepEqual(map.terrainTiles.slice(0, -1), prior.terrainTiles);
assert.deepEqual(map.terrainTiles.at(-1).heights, elevation.terrain.heights);
assert.equal(overlay.buildings.length,33,'bounded selected northern premises, not a full raw-cache building import');
assert.equal(map.buildings.length,prior.buildings.length+overlay.buildings.length);
assert.equal(map.northWestExpansion.addedBuildings,33);
assert.equal(overlay.meta.selectedFootprints.exported,33);
assert.deepEqual(overlay.meta.selectedFootprints.missing,[]);assert.deepEqual(overlay.meta.selectedFootprints.skipped,[]);
assert.equal(overlay.areas.length,0,'no unrelated park, water or Belconnen import');
const expectedCarriers=[1222397180,37413372,37413371,37413373,72857408,52869378,52869377,52869381,809149688,1084336287,50637169];
for(const id of expectedCarriers)assert(overlay.buildings.some(b=>b.id===`osm-${id}`),`exact northern store carrier ${id}`);
const priorBuildingIds=new Set(prior.buildings.map(b=>b.id));
for(const building of overlay.buildings){
 assert(!priorBuildingIds.has(building.id));assert.match(building.sourceId,/^way\/\d+$/);
 assert.equal(building.source,'osm');assert.equal(building.points.length,building.nodes.length);
 assert.deepEqual(building.points[0],building.points.at(-1));assert.equal(building.nodes[0],building.nodes.at(-1));
 assert(building.points.length>=4&&building.points.flat().every(Number.isFinite));
 assert(Number.isFinite(building.height)&&building.height>=1&&building.height<=250);assert(building.heightSource);
 assert(!['email','phone','contact:email','website'].some(key=>key in building.sourceTags),'contact metadata stays outside bundled source data');
}
for(const id of ['dickson-library','dickson-village','daramalan-college','dickson-college','lyneham-high-school','st-ninians-church','abc-canberra','black-mountain-tower']){
 const place=overlay.landmarks.find(p=>p.id===id);assert(place&&/^way\/\d+$/.test(place.sourceId));
 assert(place.sourceBuildingIds.length>0);for(const buildingId of place.sourceBuildingIds)assert(map.buildings.some(b=>b.id===buildingId));
 assert.equal(place.buildingId,place.sourceBuildingId);assert(/not a verified/.test(place.anchorType));
}
const tower=overlay.buildings.find(b=>b.id==='osm-37693613');assert.equal(tower.height,195.2);assert.equal(tower.sourceTags.man_made,'communications_tower');
assert.equal(overlay.landmarks.find(p=>p.id==='black-mountain-tower').sourceBuildingId,tower.id);
const repeated=applyNorthWest(map,overlay,elevation);assert.equal(repeated.buildings.length,map.buildings.length,'repeated composition cannot duplicate source building bodies');
assert(map.bounds.minX < prior.bounds.minX && map.bounds.minZ < prior.bounds.minZ);

const sourcePair = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
const previousPairs = new Set(), previousPositions = new Map(), previousIds = new Set();
for (const road of prior.roads) {
  previousIds.add(road.id);
  for (const [i, id] of (road.nodes || []).entries()) {
    previousPositions.set(id, road.points[i]);
    if (i) previousPairs.add(sourcePair(road.nodes[i - 1], id));
  }
}
const addedPairs = new Set(), seamNodes = new Set();
for (const road of overlay.roads) {
  assert.match(road.sourceId, /^way\/\d+$/);
  assert(!previousIds.has(road.id) && road.nodes.length === road.points.length);
  for (const [i, id] of road.nodes.entries()) {
    if (previousPositions.has(id)) {
      assert.deepEqual(road.points[i], previousPositions.get(id), 'retained source nodes meet at the exact coordinates');
      seamNodes.add(id);
    }
    if (!i) continue;
    const pair = sourcePair(road.nodes[i - 1], id);
    assert(!previousPairs.has(pair) && !addedPairs.has(pair), `exact source segment repeated: ${pair}`);
    addedPairs.add(pair);
  }
}
assert(seamNodes.size >= 20, 'neighbouring datasets share real source intersections');
assert.equal(addedPairs.size, map.northWestExpansion.addedSegments);
assert(inputs.get('north-west').bytes < 1_750_000, 'new road snapshot is bounded');

const terrain = createTerrainSampler(map), priorTerrain = createTerrainSampler(prior);
const priorSim = createSimulation(prior, { trafficCount: 0 });
const simulation = createSimulation(map, { seed: 20261121, isOnBridge: terrain.isOnBridge, vehicleHeightAt: terrain.vehicleHeightAt });
assert(simulation.graph.nodes.size > priorSim.graph.nodes.size);
assert(simulation.graph.edges.length > priorSim.graph.edges.length);
assert(simulation.graph.edges.length < priorSim.graph.edges.length + addedPairs.size * 2 + 1);
const planner = createRoutePlanner(simulation.graph);
const publicNamed = edge => edge.road.name && edge.road.type !== 'service' && roadProfile(edge.road).trafficAllowed;
const nodes = [...simulation.graph.nodes.values()].filter(node => node.outgoing.some(publicNamed));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nearestNamed = point => nodes.reduce((best, node) => gap(point, node) < gap(point, best) ? node : best);
const origin = nearestNamed(map.spawn);
assert(origin.outgoing.some(edge => edge.road.name === 'New South Wales Crescent'));
const isNew = edge => String(edge.road.id).includes('-north-west-');
function checkRoadTrip(node, label, { crossesNew = true, corridor = [] } = {}) {
  const outward = planner.findEdges(origin, node), home = planner.findEdges(node, origin);
  for (const [path, target] of [[outward, node], [home, origin]]) {
    assert(path.length > 20 && path.at(-1).to === target, `directed public route for ${label}`);
    assert(path.every((edge, i) => (!i || edge.from === path[i - 1].to) && roadProfile(edge.road).trafficAllowed));
    if (crossesNew) {
      assert(path.some(isNew) && path.some(edge => !isNew(edge)), `real seam crossed for ${label}`);
    }
    for (const name of corridor) assert(path.some(edge => edge.road.name === name), `${label} uses ${name}`);
  }
  assert(findRoute(simulation.graph, origin, node).length > 20, `GPS route for ${label}`);
  assert(findRoute(simulation.graph, node, origin).length > 20, `return GPS route for ${label}`);
  return [outward.length, home.length];
}
const approaches = new Map();
for (const [name, maximum, crossesNew, corridor] of [
  ['Dickson', 40, true, ['Commonwealth Avenue', 'Northbourne Avenue']],
  ['Lyneham', 350, true, ['Commonwealth Avenue', 'Northbourne Avenue']],
  ["O'Connor", 45, true, []],
  ['Turner', 110, false, []],
  ['Yarralumla', 45, true, []],
  ['Black Mountain', 200, true, ['Black Mountain Drive']],
]) {
  const label = overlay.landmarks.find(place => place.name === name);
  assert(label && /^node\/\d+$/.test(label.sourceId), `exact source label for ${name}`);
  const node = nearestNamed(label);
  assert(gap(label, node) < maximum, `public-road approach for ${name}`);
  assert(simulation.previewTeleport(label).ok, `Free roam can reach the exact mapped district through normal placement for ${name}`);
  approaches.set(name, { node, routeCounts: checkRoadTrip(node, name, { crossesNew, corridor }) });
}
const west = simulation.graph.nodes.get('2043311314');
assert(west?.x < -5600 && west.outgoing.some(edge => isNew(edge) && edge.road.sourceId === 'way/50845453' && edge.road.name === 'Lady Denman Drive'));
const westRoute = checkRoadTrip(west, 'western Lady Denman Drive', { corridor: ['Lady Denman Drive'] });

const lake = map.areas.find(area => area.id === 'osm-relation-3400115-0');
assert(lake && lake.points.length > 2000);
assert.equal(lake, prior.areas.find(area => area.id === lake.id), 'the complete retained multipolygon remains in use');
for (const [width, height] of [[1160, 640], [390, 410]]) {
  const projection = createMapProjection(map.bounds, width, height);
  const rect = { left: 0, top: 0, width, height };
  const retained = [map.spawn, west, ...Array.from(approaches.values(), place => place.node)];
  for (const coordinate of retained) {
    const canvas = projection.toCanvas(coordinate.x, coordinate.z);
    const world = mapPointFromClient(projection, rect, canvas.x, canvas.y, map.bounds);
    assert(world && gap(world, coordinate) < 1e-6, 'full-map projection and pointer transforms agree');
  }
  for (const [x, z] of lake.points) {
    assert(x >= map.bounds.minX && x <= map.bounds.maxX && z >= map.bounds.minZ && z <= map.bounds.maxZ,
      'the complete western lake must fit inside the baked map raster');
    const p = projection.toCanvas(x, z);
    assert(p.x >= 24 && p.x <= width - 24 && p.y >= 24 && p.y <= height - 24);
  }
  const center = projection.toCanvas(projection.cx, projection.cz);
  const offset = projection.toCanvas(projection.cx + 100, projection.cz + 100);
  assert(Math.abs((offset.x - center.x) - (offset.y - center.y)) < 1e-6, 'map metres use one pixel scale on both axes');
}
for (const road of map.roads.filter(road => road.sourceId === 'way/4878920' || road.sourceId === 'way/4878927')) {
  for (const [x, z] of road.points) {
    assert.equal(terrain.groundHeightAt(x, z), priorTerrain.groundHeightAt(x, z));
    assert.equal(terrain.roadHeightAt(road, x, z), priorTerrain.roadHeightAt(road, x, z), 'existing bridge deck heights are preserved');
  }
}
const formerWest = prior.terrain.minX, formerNorth = data('north-terrain').terrain.minZ;
for (const z of [-5450, -4575, -4150, -3025, -2150, -1500, -450]) {
  const inside = terrain.groundHeightAt(formerWest + .02, z);
  const outside = terrain.groundHeightAt(formerWest - .02, z);
  assert.equal(inside, priorTerrain.groundHeightAt(formerWest + .02, z));
  assert(Math.abs(inside - outside) < .12, `west terrain remains continuous at z=${z}`);
}
for (const x of [-3013.3, -2738.3, -1128.4, -569, 428]) {
  const inside = terrain.groundHeightAt(x, formerNorth + .02);
  const outside = terrain.groundHeightAt(x, formerNorth - .02);
  assert.equal(inside, priorTerrain.groundHeightAt(x, formerNorth + .02));
  assert(Math.abs(inside - outside) < .12, `north terrain remains continuous at x=${x}`);
}

const cars = simulation.traffic.slice(), remoteRoad = west.outgoing.find(publicNamed).road;
assert.equal(cars.length, 40);
const originalTags = Object.getOwnPropertyDescriptor(remoteRoad, 'sourceTags');
let distantReads = 0;
Object.defineProperty(remoteRoad, 'sourceTags', { configurable: true, get() { distantReads++; return originalTags.value; } });
for (let i = 0; i < 130; i++) simulation.step(1 / 60, { brake: true }, origin);
Object.defineProperty(remoteRoad, 'sourceTags', originalTags);
assert.equal(distantReads, 0, 'ambient updates around Telopea never inspect a distant western road');
for (const target of [approaches.get('Dickson').node, west]) {
  for (let i = 0; i < 130; i++) simulation.step(1 / 60, { brake: true }, target);
  assert(cars.every((car, i) => car === simulation.traffic[i]), 'moving focus does not grow or replace the fixed fleet');
  assert(cars.filter(car => car.active && isNew(car.edge) && gap(car, target) < 650).length >= 4,
    'the existing fleet redistributes into the new road network');
}
console.log(`Capital north/west PASS: ${addedPairs.size} unique source segments, ${seamNodes.size} exact seam nodes, ` +
  `${priorSim.graph.nodes.size}→${simulation.graph.nodes.size} nodes, ${priorSim.graph.edges.length}→${simulation.graph.edges.length} edges, ` +
  `six return routes and far-west Lady Denman Drive ${westRoute.join('/')} edges, ${overlay.buildings.length} exact premises/nine named site pins, untwisted lake map and fixed ${cars.length}-car fleet.`);
console.log(`Road snapshot SHA-256 ${inputs.get('north-west').sha256}, terrain SHA-256 ${inputs.get('north-west-terrain').sha256}`);
