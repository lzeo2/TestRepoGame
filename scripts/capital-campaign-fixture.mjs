// Source-domain fixture. Placements are explicit test setup, never native travel.
import { readFile } from 'node:fs/promises';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { EXTRA_STORES, BARRIERS as SKATE_BARRIERS, SKATE_BUILDING_OPENING } from '../Games/Capital Drive/civic-extras.js';
import { CIVIC_INTERIOR_ENTRIES, CIVIC_LANDMARKS } from '../Games/Capital Drive/civic-view.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createInteriors, createSchoolEntry } from '../Games/Capital Drive/interiors.js';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createNeighbourhoodDetails } from '../Games/Capital Drive/neighbourhood.js';
import { POOL_BARRIERS, MANUKA_POOL_BASIN } from '../Games/Capital Drive/landmarks.js';
import { CAMPUS_BARRIERS, CAMPUS_BUILDING_IDS } from '../Games/Capital Drive/campus.js';
import { HIGHWAY_BARRIERS } from '../Games/Capital Drive/highway-barriers.js';
import { selectStoryHomes } from '../Games/Capital Drive/mission-locations.js';
import { createMissionGuide } from '../Games/Capital Drive/mission-locations.js';
import { createCampaignScenes } from '../Games/Capital Drive/campaign-scenes.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';

export async function createCampaignFixture() {
  const read = name => readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8').then(JSON.parse);
  const [base, north, profiles] = await Promise.all(['canberra', 'canberra-north', 'road-profiles'].map(read));
  const map = applyMapExpansion(applyRoadProfiles(base, profiles), north);
  const stores = [...MAPPED_STORES, ...EXTRA_STORES];
  map.landmarks.push(...stores.map(s => ({ ...s, store: true })));
  for (const point of CIVIC_LANDMARKS) {
    const index = map.landmarks.findIndex(old => old.id === point.id);
    if (index < 0) map.landmarks.push(point); else map.landmarks[index] = point;
  }
  map.barriers = [...POOL_BARRIERS, ...CAMPUS_BARRIERS, ...HIGHWAY_BARRIERS];
  map.barriers.push(...SKATE_BARRIERS.map(b => {
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], d = Math.hypot(dx, dz) || 1;
    const nx = -dz / d * b.width / 2, nz = dx / d * b.width / 2;
    return { ...b, points: [[b.a[0]+nx,b.a[1]+nz],[b.b[0]+nx,b.b[1]+nz],[b.b[0]-nx,b.b[1]-nz],[b.a[0]-nx,b.a[1]-nz]] };
  }));
  map.collisionReplacedBuildingIds = ['act-75267-0', 'osm-584970595'];
  map.buildings = map.buildings.map(b => b.id === SKATE_BUILDING_OPENING.buildingId ? { ...b, innerRings: [{ points: SKATE_BUILDING_OPENING.polygon }] } : b);
  map.campusBuildingIds = CAMPUS_BUILDING_IDS;
  map.areas.push({ id: 'manuka-pool-water', type: 'water', points: MANUKA_POOL_BASIN });
  const neighbourhood = createNeighbourhoodDetails(new THREE.Scene(), map, () => 0, { lowGraphics: true, streaming: true });
  map.interiorEntries = neighbourhood.entries;
  map.barriers.push(...neighbourhood.backyardBarriers);
  map.schoolEntry = createSchoolEntry(map);
  const simulation = createSimulation(map, { trafficCount: 0 });
  const interiors = createInteriors(map, { stores, publicEntries: [...CIVIC_INTERIOR_ENTRIES, ...(map.schoolEntry ? [map.schoolEntry] : [])] });
  map.storyHomes = selectStoryHomes(map, interiors.entries, {
    canApproach: p => !simulation.moveActor({ ...p }, 0, 0, .45).blocked,
    roadName: p => simulation.nearestRoad(p.x, p.z)?.road.name || '' });
  const guide = createMissionGuide(interiors.entries, map.storyHomes);
  neighbourhood.dispose();
  const scenes = createCampaignScenes(map, simulation, { entrances: interiors.entries });
  const campaignOptions = scenes.meetingPoint ? { meetingPoint: scenes.meetingPoint } : {};
  scenes.dispose();
  const routeProof = (from, to, radius = 20) => {
    const route = findRoute(simulation.graph, from, to);
    const endpoint = route.at(-1);
    const length = route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0);
    const gap = endpoint ? Math.hypot(endpoint[0] - to.x, endpoint[1] - to.z) : null;
    let closestRouteDistanceMetres = endpoint ? Math.hypot(route[0][0] - to.x, route[0][1] - to.z) : null;
    let firstDistanceAlongRouteEnteringRadius = closestRouteDistanceMetres !== null && closestRouteDistanceMetres <= radius ? 0 : null;
    let along = 0;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], dx = b[0] - a[0], dz = b[1] - a[1], lengthSquared = dx * dx + dz * dz;
      const segmentLength = Math.sqrt(lengthSquared), ax = a[0] - to.x, az = a[1] - to.z;
      const projection = Math.max(0, Math.min(1, -(ax * dx + az * dz) / (lengthSquared || 1)));
      const distance = Math.hypot(ax + projection * dx, az + projection * dz);
      closestRouteDistanceMetres = Math.min(closestRouteDistanceMetres, distance);
      if (firstDistanceAlongRouteEnteringRadius === null && lengthSquared > 0) {
        const linear = 2 * (ax * dx + az * dz), constant = ax * ax + az * az - radius * radius;
        const discriminant = linear * linear - 4 * lengthSquared * constant;
        if (discriminant >= 0) {
          const entry = (-linear - Math.sqrt(discriminant)) / (2 * lengthSquared);
          const exit = (-linear + Math.sqrt(discriminant)) / (2 * lengthSquared);
          if (exit >= 0 && entry <= 1) firstDistanceAlongRouteEnteringRadius = along + Math.max(0, entry) * segmentLength;
        }
      }
      along += segmentLength;
    }
    const nearestDestinationRoad = simulation.nearestRoad(to.x, to.z);
    const failedCarVertices = [];
    const playerBody = simulation.player;
    const probe = (p, yaw) => simulation.canOccupy({ ...playerBody, x: p[0], z: p[1], yaw }, { ignoreId: 'player' });
    const checked = route.map((p, i) => {
      const q = route[Math.min(i + 1, route.length - 1)] ?? p;
      const previous = route[Math.max(0, i - 1)] ?? p;
      const yaw = Math.atan2(q[0] - previous[0], q[1] - previous[1]);
      if (probe(p, yaw)) return true;
      const beforeYaw = Math.atan2(p[0] - previous[0], p[1] - previous[1]);
      const afterYaw = Math.atan2(q[0] - p[0], q[1] - p[1]);
      const adjacentHeadingClear = probe(p, beforeYaw) || probe(p, afterYaw);
      const road = simulation.nearestRoad(p[0], p[1]);
      const width = road ? roadProfile(road.road).driveWidth : 8, offset = Math.min(2.3, width * .23);
      const laneOffsetClear = [-1, 1].some(sign => probe([p[0] + Math.cos(yaw) * offset * sign,
        p[1] - Math.sin(yaw) * offset * sign], yaw));
      failedCarVertices.push({ index: i, x: p[0], z: p[1], yaw,
        distanceFromPlayerMetres: Math.hypot(p[0] - playerBody.x, p[1] - playerBody.z),
        modelId: playerBody.modelId, adjacentHeadingClear, laneOffsetClear,
        nearestRoad: road?.road.name ?? null,
        classification: adjacentHeadingClear ? 'bisected turn heading; adjacent segment heading clears' : laneOffsetClear ?
          'centerline probe blocked; lateral road-width probe clears' : 'all bounded body probes blocked; obstacle/geometry inspection required' });
      return false;
    });
    return { connected: route.length > 0, vertices: route.length, distanceMetres: length, endpointGapMetres: gap,
      reachesRadius: gap !== null && gap <= radius,
      closestRouteDistanceMetres, reachesRouteRadius: closestRouteDistanceMetres !== null && closestRouteDistanceMetres <= radius,
      firstDistanceAlongRouteEnteringRadius, goalRadiusMetres: radius,
      nearestDestinationRoadGapMetres: nearestDestinationRoad?.distance ?? null,
      nearestDestinationRoadType: nearestDestinationRoad?.road.type ?? null,
      destinationSpurNeeded: closestRouteDistanceMetres !== null && closestRouteDistanceMetres > radius,
      destinationSpurScope: 'No physical spur traversal claimed; graph excludes service-road destination nodes.',  clearCarVertices: checked.filter(Boolean).length,
      carVertices: checked.length, failedCarVertices, ignoredVehicleId: 'player', carModelId: playerBody.modelId, sweptCarRoute: false, scope: 'directed graph; static car bodies checked only at vertices; boot decorative barriers absent' };
  };
  // A bounded local flood uses the live room collider, including all furniture.
  function interiorPath(actor, target, radius = 1) {
    const origin = { ...actor }, size = .3, queue = [{ x: origin.x, z: origin.z, steps: 0 }], seen = new Set(['0,0']);
    const priority = p => Math.hypot(p.x - target.x, p.z - target.z) + p.steps * size * .05;
    const push = node => {
      let index = queue.length; queue.push(node);
      while (index > 0) { const parent = (index - 1) >> 1;
        if (priority(queue[parent]) <= priority(node)) break;
        queue[index] = queue[parent]; index = parent;
      }
      queue[index] = node;
    };
    const pop = () => {
      const first = queue[0], last = queue.pop();
      if (queue.length) { let index = 0;
        while (index * 2 + 1 < queue.length) { let child = index * 2 + 1;
          if (child + 1 < queue.length && priority(queue[child + 1]) < priority(queue[child])) child++;
          if (priority(last) <= priority(queue[child])) break;
          queue[index] = queue[child]; index = child;
        }
        queue[index] = last;
      }
      return first;
    };
    let visited = 0;
    while (queue.length && visited++ < 24000) {
      const p = pop();
      if (Math.hypot(p.x - target.x, p.z - target.z) <= radius) return { reachable: true, distanceMetres: p.steps * size, visited, pose: { x: p.x, z: p.z } };
      for (const [dx, dz] of [[size, 0], [-size, 0], [0, size], [0, -size]]) {
        const next = { ...p };
        const plan = interiors.active, dxWorld = p.x + dx - plan.origin.x, dzWorld = p.z + dz - plan.origin.z;
        const localX = dxWorld * Math.cos(plan.origin.yaw) - dzWorld * Math.sin(plan.origin.yaw);
        const localZ = dxWorld * Math.sin(plan.origin.yaw) + dzWorld * Math.cos(plan.origin.yaw);
        if (Math.abs(localX) > plan.width / 2 || localZ < 0 || localZ > plan.depth) continue;
        interiors.moveActor(next, dx, dz, .45);
        if (Math.hypot(next.x - p.x - dx, next.z - p.z - dz) > .02) continue;
        const key = `${Math.round((next.x - origin.x) / size)},${Math.round((next.z - origin.z) / size)}`;
        if (!seen.has(key)) { seen.add(key); push({ ...next, steps: p.steps + 1 }); }
      }
    }
    return { reachable: false, distanceMetres: null, visited };
  }
  return { map, stores, simulation, interiors, guide, routeProof, interiorPath, campaignOptions,
    limits: ['Generated neighbourhood door/backyard metadata is included; rendered civic/campus/store obstacles, terrain, airport and parked cars remain absent.',
      'Source fixture placements do not prove native travel, police evasion, player damage survival, or ease.',
      'Graph distance / assumed speed is an optimistic planning estimate, never measured driving time.'] };
}
