import assert from 'node:assert/strict';

// Collision differentials share current map preparation and routing. Historical
// contact arithmetic stays intact; the passage suite tests the geometry change.
export function withCurrentRouting(historical, current) {
  const between = (text, start, end) => {
    const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
    assert(a >= 0 && b > a, `Expected source boundary: ${start}`);
    return text.slice(a, b);
  };
  const graphStart = 'export function buildRoadGraph(', graphEnd = 'export function pointOnLane(';
  const oldGraph = between(historical, graphStart, graphEnd);
  const newGraph = between(current, graphStart, graphEnd);
  const guard = between(current, 'function coveredCentreRoutingGuard(', 'export function createSimulation(');
  const oldLine = 'const graph = buildRoadGraph(map.roads || []);';
  const newLine = 'const graph = buildRoadGraph(map.roads || [], { excludeSegment: coveredCentreRoutingGuard(map) });';
  assert.equal(historical.split(oldLine).length, 2, 'Exactly one historical graph constructor');
  assert(current.includes(newLine), 'Current graph constructor remains explicit');
  assert(!historical.includes('function coveredCentreRoutingGuard('), 'Pinned baseline has no route guard');
  const oldBuildings = 'for (const building of map.buildings || []) {';
  const newBuildings = 'const passage = coveredCentrePassage(map);\n  for (const building of (map.buildings || []).flatMap(b => b === passage?.building ? passage.groundParts : [b])) {';
  assert.equal(historical.split(oldBuildings).length, 2, 'Exactly one historical building index');
  assert(current.includes(newBuildings), 'Current map preparation remains explicit');
  return "import { coveredCentrePassage } from './covered-passage.js';\n" + historical
    .replace(oldBuildings, newBuildings).replace(oldGraph, newGraph).replace(oldLine, newLine)
    .replace('export function createSimulation(', guard + 'export function createSimulation(');
}
