import assert from 'node:assert/strict';

// Fleet composition is a controlled replay input, not a contact/routing oracle.
// Share both dimensions and model ordering so the same seed spawns the same cars.
export function withCurrentFleet(historical,current) {
  const fleetImport=/^import \{[^;\n]*\} from ['"]\.\.\/\.\.\/assets\/car-arcade\/fleet\.js['"];$/gm;
  const modelSetup=/const traffic = \[\], models = (?:\[[^\]\n]+\]|TRAFFIC_CAR_IDS);/g;
  const one=(text,pattern,label)=>{
    const matches=[...text.matchAll(pattern)];
    assert.equal(matches.length,1,`Exactly one ${label}`);return matches[0][0];
  };
  const oldImport=one(historical,fleetImport,'historical fleet import');
  const newImport=one(current,fleetImport,'current fleet import');
  const oldModels=one(historical,modelSetup,'historical traffic model list');
  const newModels=one(current,modelSetup,'current traffic model list');
  const cruiseSetup=/cruiseFactor: [0-9.]+ \+ random\(\) \* [0-9.]+/g;
  const oldCruise=one(historical,cruiseSetup,'historical traffic cruise input');
  const newCruise=one(current,cruiseSetup,'current traffic cruise input');
  assert(newImport.includes('CAPITAL_BY_ID as BY_ID')&&newImport.includes('TRAFFIC_CAR_IDS'),'Current Capital fleet ABI remains explicit');
  assert.equal(newModels,'const traffic = [], models = TRAFFIC_CAR_IDS;');
  assert(oldModels===newModels||oldModels==="const traffic = [], models = ['lantern', 'orchard', 'gravel', 'relay', 'atlas', 'finch'];",'Pinned six-model roster or already aligned current roster');
  assert.equal(newCruise,'cruiseFactor: 0.88 + random() * 0.12');
  assert(oldCruise===newCruise||oldCruise==='cruiseFactor: 0.78 + random() * 0.2','Pinned historical cruise distribution or already aligned input');
  return historical.replace(oldImport,newImport).replace(oldModels,newModels).replace(oldCruise,newCruise);
}

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
  const newLine = 'const motorRoads = (map.roads || []).filter(road => !road.standalonePath);\n' +
    '  const graph = buildRoadGraph(motorRoads, { excludeSegment: coveredCentreRoutingGuard(map) });';
  assert.equal(historical.split(oldLine).length, 2, 'Exactly one historical graph constructor');
  assert(current.includes(newLine), 'Current graph constructor remains explicit');
  assert(!historical.includes('function coveredCentreRoutingGuard('), 'Pinned baseline has no route guard');
  const oldBuildings = 'for (const building of map.buildings || []) {';
  const newBuildings = 'const passage = coveredCentrePassage(map);\n  for (const building of (map.buildings || []).flatMap(b => b === passage?.building ? passage.groundParts : [b])) {';
  assert.equal(historical.split(oldBuildings).length, 2, 'Exactly one historical building index');
  assert(current.includes(newBuildings), 'Current map preparation remains explicit');
  return "import { coveredCentrePassage } from './covered-passage.js';\n" + withCurrentFleet(historical,current)
    .replace(oldBuildings, newBuildings).replace(oldGraph, newGraph).replace(oldLine, newLine)
    .replace('export function createSimulation(', guard + 'export function createSimulation(');
}
