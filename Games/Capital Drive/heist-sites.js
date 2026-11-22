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
];
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
    ...approach, yaw, radius: 2.6, description: `Fictional ${spec.kind === 'bank' ? 'bank' : 'jewellery shop'} near ${road.name}`,
    sourceRoad: road.sourceId || road.id, streetPoint: { x: roadX, z: roadZ },
    centre, point, floor, foundation, width, depth, height, apron,
    rotation: -Math.atan2(tangentZ, tangentX), readingDirection: -side,
  });
  return { site, barrier };
}

function placeSite(spec, anchor, simulation, heightAt) {
  const nearby = nearbySegments(simulation.graph.segments, anchor);
  const streets = nearby.filter(({ segment: { a, b, road }, distance, halfWidth }) =>
    PUBLIC_STREETS.has(road.type) && road.name && !road.bridge && !road.tunnel &&
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

export function buildHeistSites(map, simulation, heightAt) {
  const sites = [];
  const barriers = [];
  for (const spec of STOREFRONTS) {
    const anchor = map.landmarks?.find(landmark => landmark.id === spec.area);
    if (!anchor) continue;
    const placement = placeSite(spec, anchor, simulation, heightAt);
    if (!placement) continue;
    sites.push(placement.site);
    barriers.push(placement.barrier);
  }
  return { sites: Object.freeze(sites), barriers };
}
