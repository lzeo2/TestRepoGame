import assert from 'node:assert/strict';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { bridgeDeckEdges, BRIDGE_DECK_BOTTOM, roadProfile } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const map = await loadCapitalMap();
const terrain = createTerrainSampler(map);
const bySource = new Map();
const byEnd = new Map();
const key = point => point.join(',');
for (const road of map.roads) {
  if (!bySource.has(road.sourceId)) bySource.set(road.sourceId, []);
  bySource.get(road.sourceId).push(road);
  for (const point of [road.points[0], road.points.at(-1)]) {
    const end = key(point);
    if (!byEnd.has(end)) byEnd.set(end, []);
    byEnd.get(end).push(road);
  }
}

const deckIds = ['way/4878920','way/75247036','way/75247010','way/4878927','way/4878928','way/76997565'];
const report = {};
let sampledSections = 0;
for (const sourceId of deckIds) {
  const bridge = bySource.get(sourceId)?.find(road => road.sourceTags?.bridge === 'yes');
  assert(bridge, sourceId);
  const scrivener = sourceId === 'way/76997565';
  const profile = roadProfile(bridge);
  const { left, right } = bridgeDeckEdges(bridge, profile);
  const offsets = [left + .1, -profile.driveWidth / 2 + .35, 0, profile.driveWidth / 2 - .35, right - .1];
  let minimum = Infinity, maximum = -Infinity, worstGrade = 0, maxSeam = 0;
  for (let i = 1; i < bridge.points.length; i++) {
    const a = bridge.points[i - 1], b = bridge.points[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const pieces = Math.ceil(length / .5);
    for (const side of offsets) {
      let previous = null;
      for (let j = 0; j <= pieces; j++) {
        const x = a[0] + dx * j / pieces - dz * side / length;
        const z = a[1] + dz * j / pieces + dx * side / length;
        const deck = terrain.roadHeightAt(bridge, x, z);
        assert(Number.isFinite(deck));
        minimum = Math.min(minimum, deck);
        maximum = Math.max(maximum, deck);
        if (previous !== null) worstGrade = Math.max(worstGrade, Math.abs(deck - previous) / (length / pieces));
        previous = deck;
        sampledSections++;
      }
    }
  }
  // Gameplay limits catch an excessive centre crown across each paved strip.
  assert(worstGrade < (scrivener ? .02 : .065), `${sourceId} max deck grade: ${(worstGrade * 100).toFixed(2)}%`);
  assert(minimum >= 8.43 - 1e-6, `${sourceId} minimum deck height must stay above the managed pool`);
  assert(maximum < (scrivener ? 11 : 20), `${sourceId} excessive deck elevation: ${maximum} m`);

  let joins = 0;
  for (const [a, b] of [[bridge.points[0], bridge.points[1]], [bridge.points.at(-1), bridge.points.at(-2)]]) {
    const dx = b[0] - a[0], dz = b[1] - a[1], span = Math.hypot(dx, dz);
    const connected = byEnd.get(key(a)).filter(road => road !== bridge && road.name === bridge.name &&
      road.sourceTags?.bridge !== 'yes' && !road.standalonePath);
    for (const approach of connected) {
      for (const side of offsets) {
        const x = a[0] - dz * side / span, z = a[1] + dx * side / span;
        const gap = Math.abs(terrain.roadHeightAt(bridge, x, z) - terrain.roadHeightAt(approach, x, z));
        maxSeam = Math.max(maxSeam, gap);
        assert(gap < .07, `${sourceId} pavement seam on ${approach.id} at ${side}m: ${gap}m`);
      }
      joins++;
    }
  }
  assert(joins >= 1);
  report[sourceId] = { joins, minimum, maximum, worstGrade, maxSeam };
}

const crossed = [
  ['Barrine Drive', 'way/75247036', '1089981018-north-0', -889.85794, -2936.86563],
  ['Flynn Drive east', 'way/75247036', '23035340-north-0', -937.90166, -2567.52199],
  ['Flynn Drive west', 'way/75247036', '5640616-north-0', -936.29121, -2579.90259],
  ['Bowen Drive', 'way/4878927', '31345303-0', 258.38170, -1742.63895],
];
const clearances = {};
for (const [name, upper, lower, x, z] of crossed) {
  const groundRoad = map.roads.find(road => road.id === lower);
  const deckRoad = bySource.get(upper).find(road => road.sourceTags?.bridge === 'yes');
  assert(groundRoad && deckRoad);
  const below = terrain.roadHeightAt(groundRoad, x, z);
  const soffit = terrain.roadHeightAt(deckRoad, x, z) + BRIDGE_DECK_BOTTOM;
  assert.equal(below, terrain.groundHeightAt(x, z), `${name} keeps its lower paved support`);
  assert(soffit - below > 4.60, `${name} clearance: ${soffit - below}m`);
  clearances[name] = soffit - below;
}
console.log(JSON.stringify({ sampledSections, report, clearances }));
