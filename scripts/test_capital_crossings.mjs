import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const folder = new URL('Games/Capital Drive/', root);
const moduleCache = new Map();
async function localModule(url) {
  const key = url.href;
  if (moduleCache.has(key)) return moduleCache.get(key);
  let source = await readFile(url, 'utf8');
  const imports = [...source.matchAll(/\bfrom\s*(['"])(\.[^'"]+)\1/g)];
  for (const [, , relative] of imports) source = source.replaceAll(`'${relative}'`, JSON.stringify(await localModule(new URL(relative, url))))
    .replaceAll(`"${relative}"`, JSON.stringify(await localModule(new URL(relative, url))));
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  moduleCache.set(key, result);
  return result;
}
const load = async relative => import(await localModule(new URL(relative, folder)));
const [{ applyMapExpansion }, { applyRoadProfiles }, { createTerrainSampler }, simulationModule, civicModule, THREE] = await Promise.all([
  load('map-expansion.js'), load('road-network.js'), load('terrain.js'), load('simulation.js'), load('civic-view.js'),
  load('../../assets/car-arcade/vendor/three.module.js'),
]);
const { createSimulation, pointOnLane } = simulationModule;
const json = async name => JSON.parse(await readFile(new URL(`data/${name}`, folder), 'utf8'));
const [base, north, profiles, terrain] = await Promise.all(['canberra.json', 'canberra-north.json', 'road-profiles.json', 'north-terrain.json'].map(json));
const map = applyMapExpansion(applyRoadProfiles(base, profiles), north);
map.terrainTiles = [terrain.terrain];
// NCA normal operating level, distinct from transient works levels:
// https://www.nca.gov.au/attractions/scrivener-dam
map.lakeWaterLevel = 5.93; // 555.93m AHD, relative to the 550m terrain datum.
map.collisionReplacedBuildingIds = ['act-75267-0', 'osm-584970595'];
const sampler = createTerrainSampler(map), scene = new THREE.Scene();
const civic = civicModule.createCivicView(scene, map, sampler.heightAt);
map.barriers = [...civic.barriers];
const sim = createSimulation(map, { trafficCount: 0, isOnBridge: sampler.isOnBridge });
assert(map.buildings.length > base.buildings.length && map.areas.some(area => area.id === 'osm-relation-3400115-0'));
assert(map.buildings.some(building => building.id === 'osm-584970595'), 'source elevated connector remains retained, with its ground collider replaced');
assert(map.barriers.length > 100, 'actual rendered bridge parapets participate in the physics fixture');

const selectedSources = new Set(['way/4878920', 'way/75247036', 'way/75247010', 'way/75247037', 'way/4878927', 'way/4878928']);
const edges = sim.graph.edges.filter(edge => selectedSources.has(edge.road.sourceId));
const incoming = new Map();
for (const edge of edges) incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
const starts = edges.filter(edge => !incoming.has(edge.from));
assert.equal(starts.length, 4, 'two directed Commonwealth and two directed Kings carriageway chains');
const routes = starts.map(start => {
  const route = [start], seen = new Set([start]);
  while (true) {
    const next = edges.find(edge => edge.from === route.at(-1).to && !seen.has(edge));
    if (!next) break;
    seen.add(next); route.push(next);
  }
  return route;
});
assert.equal(routes.flat().length, edges.length, 'every selected bridge and mapped expansion joint is covered');

const at = (edge, distance, lane) => lane ? pointOnLane(edge, distance) : ({ x: edge.from.x + edge.dx * distance, z: edge.from.z + edge.dz * distance, yaw: edge.yaw });
let samples = 0, sweptMetres = 0;
const failure = (kind, edge, p, result) => `${kind} blocked on ${edge.road.sourceId}/${edge.road.id} at (${p.x.toFixed(3)},${p.z.toFixed(3)}), result=${JSON.stringify(result)}`;
try {
  for (const route of routes) for (const lane of [false, true]) {
    // Pure fixture placement exercises the actual physical APIs with all source
    // water/buildings and renderer parapets present. It is not browser play proof.
    sim.reset({ ...map.spawn });
    const initial = at(route[0], 0, lane);
    const car = { id: 'crossing-external', ...initial, length: 4.5, width: 1.8, active: true };
    const actor = { id: 'crossing-actor', x: initial.x, z: initial.z };
    for (const edge of route) {
      const first = at(edge, 0, lane), last = at(edge, edge.length, lane);
      car.yaw = edge.yaw;
      // Width changes can offset the lane at a source-way joint. Sweep this
      // small lateral join too; never replace the previous body's position.
      for (const [pose, move] of [[car, sim.moveVehicle], [actor, sim.moveActor]]) {
        const dx = first.x - pose.x, dz = first.z - pose.z;
        if (Math.hypot(dx, dz) > .001) {
          const result = move(pose, dx, dz);
          assert(!result.blocked && Math.hypot(pose.x - first.x, pose.z - first.z) < .001, failure('source-way joint sweep', edge, pose, result));
        }
      }
      assert(sim.canOccupy(car), failure('car occupancy', edge, first, {}));
      for (let distance = 0; distance <= edge.length; distance += 2) {
        const p = at(edge, Math.min(distance, edge.length), lane);
        assert(sampler.isOnBridge(p.x, p.z, .9), failure('bridge corridor', edge, p, {}));
        assert(sim.canOccupy({ ...p, id: 'occupancy' }), failure('sample occupancy', edge, p, {}));
        const y = sampler.heightAt(p.x, p.z);
        assert(Number.isFinite(y) && y >= 8.43 - 1e-8, failure('deck clearance', edge, p, { y }));
        const ahead = at(edge, Math.min(distance + .1, edge.length), lane);
        assert(Math.abs(sampler.heightAt(ahead.x, ahead.z) - y) < .1, failure('continuous road bed', edge, p, { y }));
        samples++;
      }
      while (Math.hypot(car.x - last.x, car.z - last.z) > .001) {
        const remaining = Math.hypot(car.x - last.x, car.z - last.z), step = Math.min(2, remaining);
        const result = sim.moveVehicle(car, (last.x - car.x) / remaining * step, (last.z - car.z) / remaining * step);
        assert(!result.blocked && Math.abs(result.distance - step) < .001, failure('swept external car', edge, car, result));
        sweptMetres += result.distance;
      }
      while (Math.hypot(actor.x - last.x, actor.z - last.z) > .001) {
        const remaining = Math.hypot(actor.x - last.x, actor.z - last.z), step = Math.min(2, remaining);
        const result = sim.moveActor(actor, (last.x - actor.x) / remaining * step, (last.z - actor.z) / remaining * step);
        assert(!result.blocked && Math.abs(result.distance - step) < .001, failure('swept walking actor', edge, actor, result));
      }
      // Player uses the production driving step and its swept vehicle path.
      sim.reset(first);
      while ((sim.player.x - first.x) * edge.dx + (sim.player.z - first.z) * edge.dz < edge.length - .4) {
        sim.player.yaw = edge.yaw;
        sim.player.vx = edge.dx * 12; sim.player.vz = edge.dz * 12;
        const before = { x: sim.player.x, z: sim.player.z };
        sim.step(1 / 30, {});
        const moved = Math.hypot(sim.player.x - before.x, sim.player.z - before.z);
        assert(moved > .35 && sim.player.crashes === 0, failure('swept player driving', edge, sim.player, { moved, crashes: sim.player.crashes }));
      }
      sim.reset(map.spawn);
    }
  }
} finally {
  civic.dispose();
}
for (const route of routes) for (let i = 1; i < route.length; i++) {
  const previous = route[i - 1], next = route[i];
  assert.equal(previous.to, next.from, 'actual source graph joints connect exactly');
  const a = at(previous, previous.length - .001, false), b = at(next, .001, false);
  assert(Math.abs(sampler.heightAt(a.x, a.z) - sampler.heightAt(b.x, b.z)) < .01, 'bridge deck is continuous across source-way expansion joints');
}

const lake = map.areas.find(area => area.id === 'osm-relation-3400115-0');
const contains = (x, z, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
};
const holes = lake.innerRings.map(ring => ring.points || ring);
assert.equal(holes.length, 7, 'complete real lake multipolygon retains seven island holes');
const inWater = (x, z) => contains(x, z, lake.points) && !holes.some(ring => contains(x, z, ring));
// A second fixture isolates the water boundary from the independently verified
// parapets. All real buildings and lake geometry remain present.
const waterMap = { ...map, barriers: [] };
const waterSim = createSimulation(waterMap, { trafficCount: 0, isOnBridge: sampler.isOnBridge });
const drySim = createSimulation({ ...waterMap, areas: map.areas.filter(area => area !== lake) }, { trafficCount: 0, isOnBridge: sampler.isOnBridge });
const edge = routes.find(route => route[0].road.name === 'Kings Avenue')[0];
const middle = at(edge, edge.length / 2, false), normal = { x: -edge.dz, z: edge.dx };
const openWater = { x: middle.x + normal.x * 40, z: middle.z + normal.z * 40, yaw: Math.atan2(-normal.x, -normal.z) };
assert(inWater(openWater.x, openWater.z) && !sampler.isOnBridge(openWater.x, openWater.z), 'off-bridge fixture is real open lake water');
assert(drySim.canOccupy(openWater), 'open-water fixture has no unrelated building obstacle');
assert(!waterSim.canOccupy(openWater), 'open lake water blocks a full vehicle body');
for (const kind of ['external', 'actor']) {
  const pose = { id: `leave-bridge-${kind}`, x: middle.x, z: middle.z, yaw: openWater.yaw, length: 4.5, width: 1.8 };
  let blocked = false;
  for (let i = 0; i < 20; i++) {
    const result = kind === 'actor' ? waterSim.moveActor(pose, normal.x * 2, normal.z * 2) : waterSim.moveVehicle(pose, normal.x * 2, normal.z * 2);
    blocked ||= result.blocked;
  }
  assert(blocked && Math.hypot(pose.x - middle.x, pose.z - middle.z) < 10, `${kind} sweep cannot leave the narrow bridge exemption for open water`);
}
waterSim.reset({ ...middle, yaw: openWater.yaw });
for (let i = 0; i < 80; i++) {
  waterSim.player.vx = normal.x * 12; waterSim.player.vz = normal.z * 12;
  waterSim.step(1 / 30, {});
}
assert(waterSim.player.crashes > 0 && Math.hypot(waterSim.player.x - middle.x, waterSim.player.z - middle.z) < 10, 'player sweep stops at water after leaving the deck corridor');

let island;
search: for (const ring of holes) {
  const xs = ring.map(point => point[0]), zs = ring.map(point => point[1]);
  for (let x = Math.min(...xs) + 4; x < Math.max(...xs); x += 8) for (let z = Math.min(...zs) + 4; z < Math.max(...zs); z += 8) {
    if (![[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]].every(([dx, dz]) => contains(x + dx, z + dz, ring))) continue;
    const pose = { x, z, yaw: 0, id: 'island-probe' };
    if (waterSim.canOccupy(pose) && waterSim.canOccupy({ ...pose, x: x + 2 })) { island = pose; break search; }
  }
}
assert(island && !inWater(island.x, island.z) && contains(island.x, island.z, lake.points), 'real lake island hole has clear playable land inside the outer lake ring');
assert(!sampler.isOnBridge(island.x, island.z), 'island movement is not relying on bridge exemption');
assert(waterSim.moveVehicle({ ...island }, 2, 0).distance > 1.99, 'vehicle can move on source island land');
assert(waterSim.moveActor({ ...island }, 2, 0).distance > 1.99, 'walking actor can move on source island land');
console.log(JSON.stringify({ result: 'PASS', routes: routes.length, directedSourceEdges: edges.length, samples,
  sweptExternalMetres: Math.round(sweptMetres), sourceBuildings: map.buildings.length, sourceAreas: map.areas.length,
  parapets: map.barriers.length, sourceIslandPoint: [island.x, island.z], openWaterPoint: [openWater.x, openWater.z],
  note: 'Pure actual-source collision/height regressions; no normal-input browser or surveyed deck-height claim.' }));
