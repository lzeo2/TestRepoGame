import { ADDITIONAL_BRIDGE_CROSSINGS } from './bridge-grade-crossings.js';
// Canonical source-pack composition shared by browser boot and domain audits.
// No DOM, network, actors or renderer: callers own loading and live-world setup.
import { GAME_DATA_FILES } from './game-data.js';
import { createStuntRamps } from './stunt-ramps.js';
import { applyAirport } from './airport.js';
import { applyDefenceDepot } from './defence-depot.js';
import { LANDMARKS, LANDMARK_CLEARINGS, replacedBuildingIds, POOL_BARRIERS, MANUKA_POOL_BASIN } from './landmarks.js';
import { applyRoadProfiles } from './road-network.js';
import { prepareWarMemorial } from './war-memorial.js';
import { MAPPED_STORES } from './stores.js';
import { SHOPPING_BUILDING_IDS } from './shopping-precincts.js';
import { SHOPPING_CLEARINGS } from './shopping-view.js';
import { CAMPUS_BARRIERS, CAMPUS_BUILDING_IDS } from './campus.js';
import { EXTRA_STORES, SKATEPARK_LANDMARK, SKATE_BUILDING_OPENING, BARRIERS as SKATE_BARRIERS } from './civic-extras.js';
import { GENERIC_SERVICES, SOURCE_GYM_SERVICES } from './services.js';
import { BUS_STOPS, applyStreetAssetRoofs } from './street-assets.js';
import { HIGHWAY_BARRIERS } from './highway-barriers.js';
import { applyMapExpansion, expansionPlaces } from './map-expansion.js';
import { applyNorthWest } from './north-west.js';
import { applyRegionalExpansion } from './regional-expansion.js';
import { WEST_BRIDGE_LINKS } from './west-bridge-links.js';
import { applyResidentialExpansion } from './residential-expansion.js';
import { applyAnuCampus } from './anu-campus.js';
import { MACQUARIE_SHOPS_REFERENCE } from './macquarie-shops-view.js';
import { createTerrainSampler } from './terrain.js';
import { CIVIC_BUILDING_IDS, CIVIC_LANDMARKS } from './civic-view.js';

const ALL_STORES = [...MAPPED_STORES, ...EXTRA_STORES];

// Decode each response once. Fixtures can omit address indexing, which does not
// affect geometry; production keeps the addresses for createAddressSearch.
export async function decodeCapitalMapResponses(responses, { includeAddresses = true } = {}) {
  if (!Array.isArray(responses) || responses.length !== GAME_DATA_FILES.length) throw new Error('Capital map requires the complete local source pack.');
  const packs = {};
  for (let index = 0; index < GAME_DATA_FILES.length; index++) {
    const file = GAME_DATA_FILES[index];
    if (includeAddresses || file !== 'data/addresses.json') packs[file] = await responses[index].json();
  }
  return packs;
}

// Input consists only of decoded local packs. The returned terrain sampler and
// stunt state are the same instances subsequently used by the production loop.
export function composeCapitalMap(packs) {
  const get = name => packs[`data/${name}.json`];
  let map = applyStreetAssetRoofs(applyMapExpansion(
    applyRoadProfiles(get('canberra'), get('road-profiles')), get('canberra-north')));
  map.terrainTiles = [get('north-terrain').terrain];
  map = applyDefenceDepot(applyAirport(map, get('airport'), get('airport-terrain')));
  map = applyNorthWest(map, get('north-west'), get('north-west-terrain'), get('giant-spray'));
  const regions = GAME_DATA_FILES.filter(file => file.startsWith('data/region-'));
  map = applyRegionalExpansion(map, regions.map(file => packs[file]));
  const bridged = applyMapExpansion(map, WEST_BRIDGE_LINKS);
  for (let i = 0; i < map.roads.length; i++) bridged.roads[i] = map.roads[i];
  map = { ...map, roads: bridged.roads, bounds: bridged.bounds };
  map = applyResidentialExpansion(map, get('residential-supplement'));
  map = applyAnuCampus(map);

  const { id, name, x, z, radius } = MACQUARIE_SHOPS_REFERENCE;
  map.landmarks.push({ id, name, x, z, radius, aliases: ['Macquarie Place', 'Macquarie shops'] });
  map.trafficSignals = get('traffic-signals');
  map.lakeWaterLevel = 5.93;
  map.additionalBridgeCrossings = ADDITIONAL_BRIDGE_CROSSINGS;
  // Preserve the production support sampler's creation point before decoration.
  const terrainSampler = createTerrainSampler(map);

  map.landmarks = [
    ...map.landmarks,
    ...LANDMARKS.filter(place => !map.landmarks.some(old => old.id === place.id)),
    ...ALL_STORES.map(store => ({
      id: store.id, name: store.name, aliases: [...store.aliases, store.sourceName],
      x: store.x, z: store.z, radius: store.radius, store: true,
      description: store.road + ' · parody store',
    })),
  ];
  map.searchPlaces = [
    ...BUS_STOPS.map(stop => ({
      id: stop.id, name: stop.name, aliases: [stop.sourceName, `Stop ${stop.ref}`],
      x: stop.x, z: stop.z, radius: 8, description: 'Mapped bus stop',
    })),
    ...[...SOURCE_GYM_SERVICES, ...GENERIC_SERVICES.filter(site => site.type === 'gym')].map(site => ({
      id: site.id, name: site.name, aliases: [site.sourceName, 'gym', 'fitness', 'training'],
      x: site.x, z: site.z, radius: 15, description: 'Gym',
    })),
  ];
  for (const landmark of [...CIVIC_LANDMARKS, SKATEPARK_LANDMARK, ...expansionPlaces(map)]) {
    const index = map.landmarks.findIndex(old => old.id === landmark.id);
    if (index >= 0) map.landmarks[index] = { ...map.landmarks[index], ...landmark };
    else map.landmarks.push(landmark);
  }
  applyCapitalStaticObstacles(map);

  const tower = map.landmarks.find(place => place.id === 'black-mountain-tower');
  map.landmarkBuildingIds = [
    ...replacedBuildingIds(map), ...SHOPPING_BUILDING_IDS, ...CIVIC_BUILDING_IDS,
    map.airport.terminalBuildingId, ...(map.defenceDepot?.buildings || []).map(building => building.id),
    ...(tower?.buildingId ? [tower.buildingId] : []),
  ];
  map.landmarkTreeExclusions = [
    ...LANDMARK_CLEARINGS, ...SHOPPING_CLEARINGS, map.airport.aerodrome.points,
    ...(map.defenceDepot ? [map.defenceDepot.outline] : []),
    ...(map.giantSpray ? [map.giantSpray.points] : []),
  ];
  map = prepareWarMemorial(map);
  if (map.defenceDepot) map.searchPlaces.push(map.defenceDepot.landmark);
  const stunts = createStuntRamps(map, terrainSampler);
  for (const ramp of stunts.ramps) {
    map.searchPlaces.push({
      id: ramp.id, name: 'Stunt ramp ' + ramp.id.split('-').at(-1), aliases: ['ramp', 'stunt jump'],
      x: ramp.x, z: ramp.z - 25, radius: 10, description: 'Fictional park stunt ramp',
    });
    map.landmarkTreeExclusions.push([
      [ramp.x - 15, ramp.z - 45], [ramp.x + 15, ramp.z - 45],
      [ramp.x + 15, ramp.z + 75], [ramp.x - 15, ramp.z + 75],
    ]);
  }
  return { map, terrainSampler, stunts, addressData: get('addresses') };
}

function skateBarrierPolygon(barrier) {
  const dx = barrier.b[0] - barrier.a[0], dz = barrier.b[1] - barrier.a[1];
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length * barrier.width / 2, nz = dx / length * barrier.width / 2;
  return { ...barrier, points: [
    [barrier.a[0] + nx, barrier.a[1] + nz], [barrier.b[0] + nx, barrier.b[1] + nz],
    [barrier.b[0] - nx, barrier.b[1] - nz], [barrier.a[0] - nx, barrier.a[1] - nz],
  ] };
}

export const CAPITAL_COLLISION_REPLACEMENTS = Object.freeze(['act-75267-0', 'osm-584970595']);

// Also used directly by bounded physics fixtures to exercise the actual setup.
export function applyCapitalStaticObstacles(map) {
  map.barriers = [
    ...(map.defenceDepot?.fences || []), ...(map.defenceDepot?.vehicleBarriers || []),
    ...POOL_BARRIERS, ...CAMPUS_BARRIERS, ...SKATE_BARRIERS.map(skateBarrierPolygon),
  ];
  map.collisionReplacedBuildingIds = [...CAPITAL_COLLISION_REPLACEMENTS];
  map.buildings = map.buildings.map(building => building.id === SKATE_BUILDING_OPENING.buildingId
    ? { ...building, innerRings: [{ points: SKATE_BUILDING_OPENING.polygon }] } : building);
  map.shoppingManagedBuildingIds = SHOPPING_BUILDING_IDS;
  map.campusBuildingIds = CAMPUS_BUILDING_IDS;
  map.areas = [...map.areas, { id: 'manuka-pool-water', type: 'water', points: MANUKA_POOL_BASIN }];

  return map;
}

// Production calls this after local-detail placement, which tests earlier
// barriers when choosing notice locations. Fixtures have no scene placement.
export function appendCapitalHighwayBarriers(map) {
  map.barriers.push(...HIGHWAY_BARRIERS);
  return map;
}
