// Exhaustive source-segment census; finite static probes do not prove native travel.
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { buildRoadGraph, createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { roadProfile, roadSpeed } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const map = await loadCapitalMap();
const failures = [], notes = [], ids = new Set(), byType = {}, byRegion = {};
const fail = (id, problem) => failures.push({ id, problem });
let sourceSegments = 0, shortSegments = 0;
for (const road of map.roads) {
  if (ids.has(road.id)) fail(road.id, 'duplicate road ID');
  ids.add(road.id);
  byType[road.type || 'unspecified'] = (byType[road.type || 'unspecified'] || 0) + 1;
  const region = road.region || road.district || 'unspecified';
  byRegion[region] = (byRegion[region] || 0) + 1;
  if (!Array.isArray(road.points) || road.points.length < 2) { fail(road.id, 'fewer than two source vertices'); continue; }
  if (road.points.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) fail(road.id, 'nonfinite source geometry');
  if (![undefined, null, 0, 1, -1].includes(road.oneway)) fail(road.id, `unsupported oneway ${road.oneway}`);
  const profile = roadProfile(road);
  if (!Number.isFinite(profile.driveWidth) || profile.driveWidth < 2.5 || profile.driveWidth > 24) fail(road.id, 'invalid effective carriageway width');
  if (![roadSpeed(road, 1).kmh, roadSpeed(road, -1).kmh].every(v => Number.isFinite(v) && v > 0)) fail(road.id, 'invalid directional speed');
  for (let i = 1; i < road.points.length; i++) {
    sourceSegments++;
    const length = Math.hypot(road.points[i][0] - road.points[i - 1][0], road.points[i][1] - road.points[i - 1][1]);
    if (length < .1) { shortSegments++; notes.push({ id: road.id, segment: i - 1, problem: 'source segment below graph 0.1m threshold' }); }
  }
}
// Fail malformed data before invoking spatial indexes with invalid coordinates.
if (failures.length) {
  console.log(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}
const terrain = createTerrainSampler(map);
const raw = buildRoadGraph(map.roads);
const worldObstacles = process.argv.includes('--world-obstacles')
  ? (await import('./capital-world-obstacles-fixture.mjs')).addCapitalWorldObstacles(map, terrain) : null;
const simulation = worldObstacles?.simulation || createSimulation(map, {
  trafficCount: 0, isOnBridge: terrain.isOnBridge,
  groundHeightAt: terrain.groundHeightAt, vehicleHeightAt: terrain.vehicleHeightAt,
});
const graph = simulation.graph;
const runtimeSegments = new Map(graph.segments.map(s => [`${s.road.id}:${s.index}`, s]));
let directionChecks = 0, supportChecks = 0, clearanceChecks = 0, excludedSegments = 0;
const blocked = new Map(), excessiveGrades = [], ineligible = new Set(), nonmotor = [];
const nonmotorTypes = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'bridleway']);
for (const road of map.roads) {
  if (!roadProfile(road).trafficAllowed) ineligible.add(road.id);
  if (nonmotorTypes.has(road.type)) nonmotor.push(road.id);
  for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], heights = [];
    for (const t of [0, .5, 1]) {
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const y = terrain.roadHeightAt(road, x, z);
      supportChecks++;
      if (!Number.isFinite(y) || y !== terrain.roadHeightAt(road, x, z)) fail(`${road.id}:${i - 1}`, 'nonfinite or unstable support height');
      heights.push(y);
    }
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const grade = length > .1 ? Math.max(Math.abs(heights[1] - heights[0]), Math.abs(heights[2] - heights[1])) / (length / 2) : 0;
    if (grade > .35) excessiveGrades.push({ id: road.id, segment: i - 1, grade: Number(grade.toFixed(3)) });
  }
}
for (const segment of raw.segments) {
  const id = `${segment.road.id}:${segment.index}`;
  const actual = runtimeSegments.get(id);
  if (!actual) { fail(id, 'source graph segment missing from runtime graph'); continue; }
  const length = Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]);
  if (!actual.edges.length && segment.edges.length) { excludedSegments++; notes.push({ id, problem: 'runtime covered-passage routing exclusion' }); continue; }
  const expected = length < .1 ? [] : segment.road.oneway === 1 ? [1] : segment.road.oneway === -1 ? [-1] : [-1, 1];
  const directions = actual.edges.map(e => e.direction).sort();
  directionChecks++;
  if (String(expected) !== String(directions)) fail(id, `directions expected ${expected}; received ${directions}`);
  for (const edge of actual.edges) {
    if (![edge.length, edge.dx, edge.dz, edge.yaw, edge.laneOffset].every(Number.isFinite) || !edge.from.outgoing.includes(edge)) fail(id, 'invalid directed edge geometry/adjacency');
    if (!roadProfile(edge.road).trafficAllowed) continue;
    for (const t of [.1, .5, .9]) {
      const pose = { ...simulation.player, ...pointOnLane(edge, edge.length * t), edge, supportY: undefined, y: undefined };
      clearanceChecks++;
      if (!simulation.canOccupy(pose, { ignoreId: 'player' })) {
        let row = blocked.get(edge.road.id);
        if (!row) { row = { id: edge.road.id, name: edge.road.name || '', type: edge.road.type, probes: 0, segments: new Set(), examples: [] }; blocked.set(edge.road.id, row); }
        row.probes++; row.segments.add(edge.segment.index);
        if (row.examples.length < 3) row.examples.push({ segment: edge.segment.index, direction: edge.direction, t, x: Number(pose.x.toFixed(2)), z: Number(pose.z.toFixed(2)) });
      }
    }
  }
}

// Weak components expose source islands without pretending nearby crossings are junctions.
function components(edges) {
  const adjacent = new Map();
  for (const edge of edges) {
    for (const [a, b] of [[edge.from.id, edge.to.id], [edge.to.id, edge.from.id]]) {
      if (!adjacent.has(a)) adjacent.set(a, []);
      adjacent.get(a).push(b);
    }
  }
  const visited = new Set(), groups = [], membership = new Map();
  for (const start of adjacent.keys()) {
    if (visited.has(start)) continue;
    const stack = [start], index = groups.length; let nodes = 0;
    visited.add(start);
    while (stack.length) {
      const id = stack.pop(); nodes++; membership.set(id, index);
      for (const next of adjacent.get(id)) if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
    groups.push({ nodes, roads: new Set(), directedEdges: 0 });
  }
  for (const edge of edges) { const g = groups[membership.get(edge.from.id)]; g.roads.add(edge.road.id); g.directedEdges++; }
  return groups.map(g => ({ nodes: g.nodes, directedEdges: g.directedEdges, roadIds: [...g.roads].sort() })).sort((a, b) => b.nodes - a.nodes || a.roadIds[0].localeCompare(b.roadIds[0]));
}
const allComponents = components(graph.edges);
const eligibleEdges = graph.edges.filter(e => roadProfile(e.road).trafficAllowed);
const carComponents = components(eligibleEdges);
const outgoing = new Set(eligibleEdges.map(e => e.from.id));
const sinkNodes = [...new Set(eligibleEdges.map(e => e.to.id))].filter(id => !outgoing.has(id)).sort();
const blockers = [...blocked.values()].map(r => ({ ...r, segments: [...r.segments].sort((a, b) => a - b) })).sort((a, b) => a.id.localeCompare(b.id));
const blockedByType = {};
for (const row of blockers) {
  const group = blockedByType[row.type] ||= { roads: 0, probes: 0 };
  group.roads++; group.probes += row.probes;
}
const strict = process.argv.includes('--strict-clearance');
const result = {
  status: failures.length || (strict && blockers.length) ? 'FAIL' : 'PASS',
  scope: 'All composed roads, all consecutive source segments, all legal graph directions; static saloon lane probes at 10%, 50%, 90% of every traffic-eligible directed edge.',
  counts: { roads: map.roads.length, sourceSegments, shortSegments, graphNodes: graph.nodes.size, directedEdges: graph.edges.length, graphSegments: graph.segments.length, collapsedSourceSegments: sourceSegments - raw.segments.length, eligibleDirectedEdges: eligibleEdges.length, directedSinkNodes: sinkNodes.length, excludedSegments, directionChecks, supportChecks, clearanceChecks, blockedProbes: blockers.reduce((n, r) => n + r.probes, 0), blockedRoads: blockers.length, trafficIneligibleRoads: ineligible.size, nonmotorRoads: nonmotor.length, allComponents: allComponents.length, carComponents: carComponents.length, steepSegments: excessiveGrades.length },
  byType, byRegion, failures,
  worldObstacles: worldObstacles ? { enabled: true, counts: worldObstacles.counts, exclusions: worldObstacles.exclusions } : { enabled: false, staticBarriers: map.barriers.length },
  limitations: ['PASS gates structure, finite support and legal edge directions; clearance findings fail only with --strict-clearance.', 'Weak disconnected source components are classified, not silently connected; weak connectivity does not establish directed reachability.', 'Static occupancy includes fixture buildings, water and barriers, excludes spawned traffic, people, later mission obstacles and native input. Probe failures do not identify the responsible collider.', 'Three finite lane probes cannot prove swept turn clearance, continuous support, vehicle-specific clearance, or mission reachability. Grades above 35% are findings, not surveyed-road defects.'],
  clearance: { status: blockers.length ? 'FINDINGS' : 'PASS', byType: blockedByType, roads: blockers },
  topology: { all: allComponents, trafficEligible: carComponents, directedSinkNodeIds: sinkNodes, trafficIneligibleRoadIds: [...ineligible].sort(), nonmotorRoadIds: nonmotor.sort() },
  steepSegments: excessiveGrades, notes,
};
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${result.status} Capital Drive all-road structural audit`);
  console.log(JSON.stringify(result.counts));
  if (worldObstacles) console.log(`Production static obstacles: ${JSON.stringify(worldObstacles.counts)}`);
  console.log(`Static clearance: ${result.clearance.status}; ${blockers.length} roads with occupied probes. Use --json for every road/component ID and --strict-clearance to gate these findings.`);
  for (const row of blockers.slice(0, 12)) console.log(`CLEARANCE ${row.id} ${row.name}: ${row.probes} occupied probes (${row.segments.length} segments)`);
  for (const failure of failures) console.log(`FAIL ${failure.id}: ${failure.problem}`);
  for (const limitation of result.limitations) console.log(`LIMIT ${limitation}`);
}
process.exitCode = result.status === 'PASS' ? 0 : 1;
