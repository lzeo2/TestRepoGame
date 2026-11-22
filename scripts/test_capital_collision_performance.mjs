import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import {withCurrentFleet} from './capital-collision-baseline.mjs';

const sourceURL = new URL('../Games/Capital Drive/simulation.js', import.meta.url);
const source = await readFile(sourceURL, 'utf8');
const gridSource = source.slice(source.indexOf('class SpatialGrid {'), source.indexOf('// Shared OSM node IDs'));
const Grid = vm.runInNewContext(`${gridSource}\nSpatialGrid`);
const grid = new Grid(48), rectangles = [];
for (let i = 0; i < 600; i++) {
  const x = (i * 31 % 247) - 124, z = (i * 47 % 239) - 120;
  const box = { minX: x, minZ: z, maxX: x + i % 13, maxZ: z + i % 17 };
  const item = { id: i }; rectangles.push({ item, ...box });
  grid.insert(item, box.minX, box.minZ, box.maxX, box.maxZ);
}
for (let i = 0; i < 300; i++) {
  const x = (i * 19 % 239) - 120, z = (i * 43 % 251) - 126, r = i % 33;
  const expected = rectangles.filter(box => box.maxX >= x-r && box.minX <= x+r && box.maxZ >= z-r && box.minZ <= z+r).map(box => box.item.id).sort((a,b)=>a-b);
  assert.deepEqual([...grid.query(x,z,r)].map(item=>item.id).sort((a,b)=>a-b), expected, 'exact inclusive AABB query across positive/negative cells');
}
const boundary = new Grid(48), touching = {};
boundary.insert(touching, 1, -1, 2, 1);
assert(boundary.query(0,0,1).has(touching), 'touching AABBs remain candidates');

const fixture = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, roads: [],
  spawn: { x: -50, z: -50, yaw: 0 }, buildings: Array.from({ length: 200 }, (_, i) => ({ id: `same-cell-${i}`,
    points: [[30+i*.01,30],[31+i*.01,30],[31+i*.01,31],[30+i*.01,31]] })) };
const local = createSimulation(fixture, { trafficCount: 0 });
let polygonReads = 0;
for (const building of fixture.buildings) {
  const points = building.points;
  Object.defineProperty(building, 'points', { get() { polygonReads++; return points; } });
}
assert(local.canOccupy({ id: 'probe', x: 0, z: 0, yaw: 0, modelId: 'lantern' }));
assert(!local.moveActor({ x: 0, z: 0 }, 1, 1).blocked);
assert.equal(polygonReads, 0, 'same-cell distant polygons never reach polygon narrow phase');
assert(!local.canOccupy({ id: 'probe', x: 30.5, z: 30.5, yaw: 0, modelId: 'lantern' }));
assert(polygonReads > 0, 'nearby polygons retain physical contact');

async function simulationAt(revision,alignFleet=false) {
  const historical = execFileSync('git', ['show', `${revision}:Games/Capital Drive/simulation.js`],
    { cwd: new URL('../', import.meta.url), encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const prepared=alignFleet?withCurrentFleet(historical,source):historical;
  const moduleSource = prepared.replace(/from ['"]([^'"]+)['"]/g, (_, path) => `from ${JSON.stringify(new URL(path, sourceURL).href)}`);
  return (await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)).createSimulation;
}
// Keep the original broad-phase comparator. The traffic replay uses the
// pre-pursuit build, which already includes later driving and traffic rules.
const baselineRevision = '87b5d21325de3acb2ef51df1653c32ca8012f8eb';
const trafficRevision = '68c00062b86c7266980d5fc4b9466155cae09c0c';
const baselineSimulation = await simulationAt(baselineRevision);
const trafficSimulation = await simulationAt(trafficRevision,true);
const openMap = { ...fixture, buildings: [] };
const satBefore = baselineSimulation(openMap, { trafficCount: 0 }), satAfter = createSimulation(openMap, { trafficCount: 0 });
for (let i = 0; i < 2500; i++) {
  const obstacle = { id: 'external-body', x: (i*17%401)/10-20, z: (i*29%397)/10-20,
    yaw: i*.43, length: 1+i%16, width: .5+(i%8)/2 };
  satBefore.setExternalVehicles([obstacle]); satAfter.setExternalVehicles([obstacle]);
  const pose = { id: 'sat-probe', x: Math.sin(i)*3, z: Math.cos(i)*3, yaw: i*.71, modelId: ['lantern','atlas','finch'][i%3] };
  assert.equal(satAfter.canOccupy(pose), satBefore.canOccupy(pose), 'far-pair rejection preserves actual near/far rotated rectangle SAT');
}
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'), await json('road-profiles')), await json('canberra-north'));
map.terrainTiles = [(await json('north-terrain')).terrain]; map.lakeWaterLevel = 5.93;
const terrain = createTerrainSampler(map);
const options = { trafficCount: 40, seed: 20261112, isOnBridge: terrain.isOnBridge };
const beforeStart = performance.now(), before = baselineSimulation(map, options), baselineInitMs = performance.now() - beforeStart;
const afterStart = performance.now(), after = createSimulation(map, options), optimizedInitMs = performance.now() - afterStart;
const traffic = sim => sim.traffic.map(car => Object.fromEntries(['id','active','x','z','yaw','speed','position','overtake','anger','honks'].map(key=>[key,car[key]])));
assert.deepEqual(traffic(after), traffic(before), 'actual-map seeded 40-car initialization stays exact');
let checks = 0;
for (let i = 0; i < 600; i++) {
  const road = map.roads[i * 37 % map.roads.length], point = road.points[i % road.points.length];
  const pose = { id: 'differential-probe', modelId: ['lantern','atlas','finch'][i%3], x: point[0]+i%7-3, z: point[1]+i%11-5, yaw: i*.71 };
  assert.equal(after.canOccupy(pose), before.canOccupy(pose));
  const a = { ...pose }, b = { ...pose };
  assert.deepEqual(after.moveActor(a, Math.sin(i)*5, Math.cos(i)*5), before.moveActor(b, Math.sin(i)*5, Math.cos(i)*5));
  assert.deepEqual(a,b);
  const end = { x: pose.x+Math.cos(i)*30, z: pose.z+Math.sin(i)*30 };
  assert.equal(after.hasLineOfSight(pose,end), before.hasLineOfSight(pose,end));
  assert.deepEqual(after.nearestRoad(pose.x,pose.z), before.nearestRoad(pose.x,pose.z));
  checks += 4;
}
const replay = (sim, verify) => {
  const start = performance.now();
  for (let frame = 0; frame < 600; frame++) { sim.step(1/60, { throttle: .25, steer: Math.sin(frame/90)*.2 }); verify?.(frame); }
  return performance.now()-start;
};
const recorded = [], reference = trafficSimulation(map, options);
const baselineReplayMs = replay(reference, frame => { if (frame%60===0) recorded.push({ player: { ...reference.player }, traffic: traffic(reference) }); });
let sample = 0;
const optimizedReplayMs = replay(after, frame => {
  if (frame%60===0) { assert.deepEqual({ player: { ...after.player }, traffic: traffic(after) }, recorded[sample++], 'actual-map 40-car physical replay remains exact'); }
});
console.log(`PASS collision broad phase: 300 exact AABB queries, same-cell polygon rejection, 2500 rotated-body SAT comparisons, ${checks} actual-map differential probes and 600-frame/40-car exact replay.`);
console.log(JSON.stringify({ measurementOnly: true, baselineRevision, trafficRevision, baselineInitMs, optimizedInitMs, baselineReplayMs, optimizedReplayMs }));
