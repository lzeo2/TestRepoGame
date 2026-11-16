import assert from 'node:assert/strict';

// Collision differentials must use the same route graph. The historical contact
// arithmetic stays intact; the separate covered-road suite tests the route change.
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
  return historical.replace(oldGraph, newGraph).replace(oldLine, newLine)
    .replace('export function createSimulation(', guard + 'export function createSimulation(');
}
