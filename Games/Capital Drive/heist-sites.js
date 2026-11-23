import { roadProfile } from './road-network.js';
import { projectSegment } from './simulation.js';

const STOREFRONTS = [
  {
    id: 'civic-bank', kind: 'bank', name: 'Civic Mutual Bank', area: 'canberra-centre',
    aliases: ['heist', 'bank robbery', 'Civic bank'], width: 12.8, depth: 7.6, height: 5.15,
  },
  {
    id: 'manuka-jewels', kind: 'jeweller', name: 'Manuka Facets', area: 'manuka',
    aliases: ['heist', 'jeweller', 'jewelry store', 'jewellery shop', 'Manuka gems'], width: 10.4, depth: 6.4, height: 4.45,
  },
  {
    id: 'black-mountain-archive', kind: 'tower', name: 'Black Mountain Tower', area: 'black-mountain-tower',
    aliases: ['tower heist', 'archive heist', 'Black Mountain robbery'], sourceBuildingId: 'osm-37693613',
    sourceFacadeEdge: 1, sourceLabel: 'Black Mountain Tower', width: 10.4, depth: 7.6, height: 4.2,
  },
  {
    id: 'memorial-workshop', kind: 'memorial', name: 'War Memorial Gallery', area: 'australian-war-memorial',
    aliases: ['Australian War Memorial', 'gallery heist', 'memorial heist'], sourceBuildingId: 'osm-5090724',
    sourceFacadeEdge: 36, sourceLabel: 'Australian War Memorial', width: 11, depth: 8.4, height: 4.6,
  },
  {
    id: 'manuka-bank', kind: 'bank', name: 'Civic Mutual Bank · Manuka', area: 'manuka',
    aliases: ['Manuka bank', 'Manuka branch', 'bank robbery'], vaultPuzzle: true, road: 'Captain Cook Crescent',
    sourceBuildingId: 'act-87705-0', sourcePlaceId: 'node/439239484', sourceFacadeEdge: 22,
    sourceFacadeFraction: .5562313318541364, approachDistance: 2.7, width: 12.8, depth: 7.6, height: 5.15,
  },
];
const SITE_TYPES = {bank:'bank',jeweller:'jewellery shop'};
const PUBLIC_STREETS = new Set(['residential', 'tertiary', 'secondary', 'unclassified']);
const SEARCH_RADIUS = 230;
const BOUNDS_MARGIN = 45;
const DISTANCES = [4.6, 7.1, 10.1];
const FRACTIONS = [.5, .33, .67];

function nearbySegments(segments, anchor) {
  const radius = SEARCH_RADIUS + BOUNDS_MARGIN;
  return segments.filter(({ a, b }) => Math.min(a[0], b[0]) <= anchor.x + radius &&
    Math.max(a[0], b[0]) >= anchor.x - radius &&
    Math.min(a[1], b[1]) <= anchor.z + radius && Math.max(a[1], b[1]) >= anchor.z - radius)
    .map(segment => ({
      segment,
      halfWidth: roadProfile(segment.road).driveWidth / 2,
      distance: projectSegment(anchor.x, anchor.z, segment.a, segment.b).distance,
    }));
}

function makeSite(spec, host, fraction, side, setback, nearby, simulation, heightAt) {
  const { segment: { a, b, road }, halfWidth } = host;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const tangentX = (b[0] - a[0]) / length;
  const tangentZ = (b[1] - a[1]) / length;
  const outX = -tangentZ * side;
  const outZ = tangentX * side;
  const roadX = a[0] + (b[0] - a[0]) * fraction;
  const roadZ = a[1] + (b[1] - a[1]) * fraction;
  const frontOffset = halfWidth + setback;
  const point = (across, depth) => ({
    x: roadX + tangentX * across + outX * (frontOffset + depth),
    z: roadZ + tangentZ * across + outZ * (frontOffset + depth),
  });
  const { width, depth, height } = spec;
  const corners = [point(-width / 2, 0), point(width / 2, 0), point(width / 2, depth), point(-width / 2, depth)];
  const approach = point(0, -2.05);
  const centre = point(0, depth / 2);
  const floorProbes = [...corners, approach, centre];
  const heights = floorProbes.map(({ x, z }) => heightAt(x, z));
  if (!heights.every(Number.isFinite) || Math.max(...heights) - Math.min(...heights) > 1.15) return null;
  if (!floorProbes.every(({ x, z }) => nearby.every(({ segment: s, halfWidth: width }) =>
    projectSegment(x, z, s.a, s.b).distance >= width + .8))) return null;
  const yaw = Math.atan2(-outX, -outZ);
  const body = { length: depth + .8, width: width / 3 + .25, ignoreId: 'player' };
  const footprintClear = [-width / 3, 0, width / 3].every(across =>
    simulation.canOccupy({ ...point(across, depth / 2), yaw }, body));
  if (!footprintClear || !simulation.canOccupy({ ...approach, yaw }, { length: 1.4, width: 1.4, ignoreId: 'player' })) return null;
  if (!simulation.hasLineOfSight({ x: roadX, z: roadZ }, approach)) return null;
  const foundation = Math.min(...heights.slice(0, 4)) - .03;
  const floor = Math.max(...heights.slice(0, 4)) + .03;
  const points = corners.map(({ x, z }) => [x, z]);
  const barrier = { id: `${spec.id}-walls`, type: 'building', points, y: foundation, height: floor - foundation + height };
  const apron = [point(-width / 2 - .4, -3.4), point(width / 2 + .4, -3.4),
    point(width / 2 + .4, depth + .4), point(-width / 2 - .4, depth + .4)].map(({ x, z }) => [x, z]);
  // Source streets anchor the entirely fictional architecture and game interaction.
  const site = Object.freeze({
    id: spec.id, kind: spec.kind, name: spec.name, aliases: [...spec.aliases, road.name], road: road.name,
    ...approach, yaw, radius: 2.6, description: `Fictional ${SITE_TYPES[spec.kind]} near ${road.name}`,
    sourceRoad: road.sourceId || road.id, streetPoint: { x: roadX, z: roadZ },
    centre, point, floor, foundation, width, depth, height, apron,
    rotation: -Math.atan2(tangentZ, tangentX), readingDirection: -side,
  });
  return { site, barrier };
}

function placeSite(spec, anchor, simulation, heightAt) {
  const nearby = nearbySegments(simulation.graph.segments, anchor);
  const streets = nearby.filter(({ segment: { a, b, road }, distance, halfWidth }) =>
    PUBLIC_STREETS.has(road.type) && road.name && (!spec.road||road.name===spec.road) && !road.bridge && !road.tunnel &&
    roadProfile(road).trafficAllowed && distance < SEARCH_RADIUS &&
    Math.hypot(b[0] - a[0], b[1] - a[1]) >= spec.width + halfWidth)
    .sort((a, b) => a.distance - b.distance);
  for (const host of streets) {
    for (const fraction of FRACTIONS) for (const side of [-1, 1]) for (const setback of DISTANCES) {
      const placement = makeSite(spec, host, fraction, side, setback, nearby, simulation, heightAt);
      if (placement) return placement;
    }
  }
  return null;
}

// Doors are authored game choices on the actual source outline, not
// observed entrances or real floorplans. Existing landmark bodies stay solid;
// the ordinary room switch admits the player from the public exterior pose.
function placeSourceSite(spec, map, simulation, heightAt) {
  const {sourceBuildingId:buildingId, sourceFacadeEdge:edge, sourceFacadeFraction:fraction=.5} = spec;
  const building = map.buildings?.find(item => item.id === buildingId);
  if (!building?.points?.[edge + 1]) return null;
  const ring = building.points, a = ring[edge], b = ring[edge + 1];
  const area = ring.slice(1).reduce((sum, point, index) => sum + ring[index][0] * point[1] - point[0] * ring[index][1], 0);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 3) return null;
  const outX = (b[1] - a[1]) / length * (area > 0 ? 1 : -1);
  const outZ = -(b[0] - a[0]) / length * (area > 0 ? 1 : -1);
  const front = {x: a[0] + (b[0] - a[0]) * fraction, z: a[1] + (b[1] - a[1]) * fraction};
  const yaw = Math.atan2(outX, outZ), rotation = yaw + Math.PI;
  const point = (across, depth) => ({x: front.x - outZ * across - outX * depth,
    z: front.z + outX * across - outZ * depth});
  const approach = {...point(0, -(spec.approachDistance ?? 2.05)), yaw};
  const canWalk = (start, end) => {
    if (!simulation.canOccupy({...end, yaw}, {length: 1.4, width: 1.4, ignoreId: 'player'})) return false;
    const actor = {x: start.x, z: start.z};
    const dx = end.x - start.x, dz = end.z - start.z, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .3));
    for (let i = 0; i < steps; i++) if (simulation.moveActor(actor, dx / steps, dz / steps).blocked) return false;
    return Math.hypot(actor.x - end.x, actor.z - end.z) < .1;
  };
  const streets = nearbySegments(simulation.graph.segments,approach).map(item=>item.segment).filter(({road}) => !road.bridge && !road.tunnel &&
    (!spec.road || road.name === spec.road) &&
    ['residential', 'tertiary', 'secondary', 'unclassified', 'service'].includes(road.type) &&
    !['access', 'vehicle', 'motor_vehicle'].some(tag => ['no', 'private'].includes(road.sourceTags?.[tag])))
    .map(segment => ({segment, projection: projectSegment(approach.x, approach.z, segment.a, segment.b)}))
    .filter(({projection}) => projection.distance < 120).sort((a, b) => a.projection.distance - b.projection.distance);
  const host = streets.find(({projection}) => canWalk(projection, approach));
  if (!host) return null;
  const exits = spec.kind === 'bank' ? [] : [{id: 'main', name: 'Public approach', ...point(0, -5), yaw},
    {id: 'side', name: 'Public side approach', ...point(7, -5), yaw}];
  if (!exits.every(exit => canWalk(approach, exit))) return null;
  const floor = heightAt(front.x, front.z);
  if (!Number.isFinite(floor) || !Number.isFinite(heightAt(approach.x, approach.z))) return null;
  const road = host.segment.road;
  return {site: Object.freeze({...spec, ...approach, approach: Object.freeze(approach), front: Object.freeze(front),
    aliases: [...spec.aliases, ...(road.name ? [road.name] : [])],
    landmarkExterior: true, sourceBuildingId: buildingId, sourceId: building.sourceId,
    sourceFacadeEdge: edge, sourceRoad: road.sourceId || road.id, road: road.name || '',
    streetPoint: {x: host.projection.x, z: host.projection.z},
    radius: 2.6, description: spec.sourceLabel ? `Heist inside ${spec.sourceLabel}.` : 'Bank robbery on Captain Cook Crescent.',
    centre: point(0, spec.depth / 2), point, floor, foundation: floor, rotation,
    readingDirection: 1, apron: [], exits: Object.freeze(exits.map(Object.freeze))})};
}

export function buildHeistSites(map, simulation, heightAt) {
  const sites = [];
  const barriers = [];
  for (const spec of STOREFRONTS) {
    const anchor = map.landmarks?.find(landmark => landmark.id === spec.area);
    if (!anchor) continue;
    const placement = spec.sourceBuildingId ? placeSourceSite(spec, map, simulation, heightAt) : placeSite(spec, anchor, simulation, heightAt);
    if (!placement) continue;
    sites.push(placement.site);
    if (placement.barrier) barriers.push(placement.barrier);
  }
  return { sites: Object.freeze(sites), barriers };
}
