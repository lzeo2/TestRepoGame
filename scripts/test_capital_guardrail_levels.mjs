import assert from 'node:assert/strict';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { selectHighwayBarrierPanels } from '../Games/Capital Drive/highway-barriers.js';
import { createHighwayBarriersView } from '../Games/Capital Drive/highway-barriers-view.js';

const map = await loadCapitalMap(), terrain = createTerrainSampler(map);
const simulation = createSimulation(map, { trafficCount: 0, isOnBridge: terrain.isOnBridge,
  groundHeightAt: terrain.groundHeightAt, vehicleHeightAt: terrain.vehicleHeightAt,
  actorHeightAt: pose => Number.isFinite(pose.y) ? pose.y : terrain.heightAt(pose.x, pose.z) });
for (const [id, segment, fraction] of [['31345303-0', 5, .1], ['4844798-0', 0, .9]]) {
  const edge = simulation.graph.edges.find(e => e.road.id === id && e.segment.index === segment && e.direction === 1);
  assert(edge, `mapped Bowen Drive edge ${id}`);
  const pose = { ...simulation.player, ...pointOnLane(edge, edge.length * fraction), edge, y: undefined, supportY: undefined };
  assert(simulation.canOccupy(pose, { ignoreId: 'player' }), `${id} passes below Kings Avenue rail`);
}
const rail = map.barriers.find(b => b.id === 'osm-guard-rail-1337307982-4');
assert(rail, 'upper rail remains in collision map');
const owner = map.roads.find(r => r.id === rail.roadContext.id);
const x = (rail.a[0] + rail.b[0]) / 2, z = (rail.a[1] + rail.b[1]) / 2;
const upperY = terrain.roadHeightAt(owner, x, z), groundY = terrain.groundHeightAt(x, z);
assert(upperY - groundY > 4, 'confirmed deck clearance');
const scene = new THREE.Scene();
// Force the unowned fallback onto the lower level. A closer new pedestrian
// deck can otherwise hide a view which accidentally ignores the road owner.
const roadView = createHighwayBarriersView(scene,terrain.groundHeightAt,{roads:map.roads,roadHeightAt:terrain.roadHeightAt});
const panels = selectHighwayBarrierPanels({x,z});
roadView.update({x,z});
const beams = scene.getObjectByName('Source highway guard rails');
const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3();
let matched = 0;
for (const [index,panel] of panels.entries()) {
  if (panel.rail.id !== rail.id) continue;
  assert(index < beams.count);
  beams.getMatrixAt(index,matrix);
  for (const [end,point] of [[-.5,panel.a],[.5,panel.b]]) {
    vertex.set(end,0,0).applyMatrix4(matrix);
    assert(Math.hypot(vertex.x-point[0],vertex.z-point[1])<.001);
    assert(Math.abs(vertex.y-terrain.roadHeightAt(owner,...point)-rail.height+.14)<.001,
      'rendered rail support matches the retained deck owner at both ends');
  }
  matched++;
}
assert(matched>0,'mapped rail appears in the rendered focus');
roadView.dispose();
const yaw = Math.atan2(-(rail.b[0] - rail.a[0]), -(rail.b[1] - rail.a[1]));
const car = { ...simulation.player, x, z, yaw, y: upperY + .18, edge: { road: owner } };
assert.equal(simulation.canOccupy(car, { ignoreId: 'player' }), false, 'upper deck car still hits rail');
assert.equal(simulation.canOccupy({ ...car, y: groundY + .18 }, { ignoreId: 'player' }), true, 'lower car clears the same retained rail');
assert.equal(simulation.moveActor({ x, z, y: groundY, height: 1.8 }, 0, 0, .4).blocked, false, 'walker passes below rail');
assert.equal(simulation.moveActor({ x, z, y: upperY, height: 1.8 }, 0, 0, .4).blocked, true, 'upper deck walker still hits rail');
console.log('PASS Kings Avenue guardrail preserves upper contacts and lower Bowen Drive passage');

const { addCapitalWorldObstacles } = await import('./capital-world-obstacles-fixture.mjs');
const world = addCapitalWorldObstacles(map, terrain);
for (const id of ['31345303-0', '4844798-0', '673080483-0', '5640616-north-0']) {
  const formerlyBlocked = id === '31345303-0' ? [4, 5, 6] : id === '4844798-0' ? [0, 1] : id === '673080483-0' ? [1] : [13];
  for (const edge of world.simulation.graph.edges.filter(e => e.road.id === id && formerlyBlocked.includes(e.segment.index))) {
    for (const t of [.1, .5, .9]) {
      const pose = { ...world.simulation.player, ...pointOnLane(edge, edge.length * t), edge, y: undefined, supportY: undefined };
      assert(world.simulation.canOccupy(pose, { ignoreId: 'player' }), `production ${id}:${edge.segment.index}:${edge.direction}:${t} clears elevated parapets`);
    }
  }
}
const parapet = map.barriers.find(b => b.id === 'civic-parapet-1');
assert(parapet?.roadContext?.id, 'generated parapet retains exact road owner');
const deck = map.roads.find(r => r.id === parapet.roadContext.id);
const a = parapet.points[0], b = parapet.points[1], px = (a[0] + b[0]) / 2, pz = (a[1] + b[1]) / 2;
const py = terrain.roadHeightAt(deck, px, pz), gy = terrain.groundHeightAt(px, pz);
const parapetCar = { ...world.simulation.player, x: px, z: pz, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])), y: py + .18, edge: { road: deck } };
assert.equal(world.simulation.canOccupy(parapetCar, { ignoreId: 'player' }), false, 'generated upper deck parapet still blocks car');
assert.equal(world.simulation.canOccupy({ ...parapetCar, y: gy + .18 }, { ignoreId: 'player' }), true, 'same generated parapet clears lower car');
assert.equal(world.simulation.moveActor({ x: px, z: pz, y: py, height: 1.8 }, 0, 0, .4).blocked, true, 'generated upper deck parapet still blocks walker');
assert.equal(world.simulation.moveActor({ x: px, z: pz, y: gy, height: 1.8 }, 0, 0, .4).blocked, false, 'same generated parapet clears lower walker');
console.log('PASS production parapets retain upper contacts and clear Bowen/Flynn lower lane probes');
