import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createInteriorCollider, createInteriorNavigation } from '../Games/Capital Drive/interior-navigation.js';
import { createInteriorView } from '../Games/Capital Drive/interior-view.js';
import { createNeighbourhoodDetails } from '../Games/Capital Drive/neighbourhood.js';
const area = points => Math.abs(points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]; return sum + p.x * q.z - q.x * p.z;
}, 0) / 2);
function check(map, entry, safe = false) {
  const houses = createInteriors(map), door = houses.entries.find(e => e.id === entry.id);
  const actor = { x: door.x - Math.sin(door.yaw) * 1.4, z: door.z - Math.cos(door.yaw) * 1.4, yaw: .4, y: 0 };
  const outside = { ...actor }, plan = houses.enter(door, actor);
  assert(plan && Object.isFrozen(plan.footprint));
  const building = map.buildings.find(b => b.id === door.buildingId);
  assert(Math.abs(area(plan.footprint) - area(building.points.map(([x, z]) => ({ x, z })))) < .0001, 'source area retained at scale one');
  for (const p of plan.footprint) {
    const x = door.x + Math.cos(door.yaw) * p.x + Math.sin(door.yaw) * p.z;
    const z = door.z - Math.sin(door.yaw) * p.x + Math.cos(door.yaw) * p.z;
    assert(building.points.some(q => Math.hypot(q[0] - x, q[1] - z) < 1e-7), 'each interior vertex is an exterior source vertex');
  }
  const collider = createInteriorCollider(plan), navigation = createInteriorNavigation(plan);
  const shell = createInteriorCollider({ ...plan, walls: [], furniture: [] });
  for (const fixture of plan.furniture) for (const dx of [-fixture.width / 2, fixture.width / 2]) for (const dz of [-fixture.depth / 2, fixture.depth / 2]) {
    const corner = { x: fixture.x + Math.cos(fixture.yaw) * dx + Math.sin(fixture.yaw) * dz,
      z: fixture.z - Math.sin(fixture.yaw) * dx + Math.cos(fixture.yaw) * dz };
    assert(shell.canOccupy(corner, .1), `${fixture.kind} corners remain in the source shell`);
  }
  assert(collider.canOccupy(plan.spawn), `${plan.id} has a clear physical landing`);
  assert(collider.canOccupy(plan.exit), `${plan.id} exit has a clear standing pose`);
  assert(!collider.canOccupy(outside), 'outside cannot occupy interior');
  const stock = plan.activities.find(s => s.id === `${plan.id}-${safe ? 'stash' : 'valuables'}`);
  assert(stock, `${plan.id} has its physical stock task`);
  assert.equal(stock.label, safe ? 'Pack the ledger case' : 'Search for valuables');
  if (safe) assert(!plan.activities.some(s => s.id.endsWith('-valuables')));
  for (const station of plan.activities) {
    assert(collider.canOccupy(station), `${station.id} has player clearance`);
    assert(navigation.nextWaypoint(plan.spawn, station), `${station.id} is physically reachable`);
    assert(plan.furniture.some(f => Math.hypot(f.x - station.x, f.z - station.z) < 2), 'task is beside furniture');
  }
  // The one room mesh retains exact source floor triangles rather than a bounding rectangle.
  const scene = new THREE.Scene(), view = createInteriorView(scene);
  view.load(plan); assert.equal(view.stats.draws, 1);
  const geometry = scene.children[0].children[0].geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal, index = geometry.index;
  let floorArea = 0;
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (ids.every(j => Math.abs(positions.getY(j) - plan.floorY) < 1e-6 && normals.getY(j) > .99)) floorArea += area(ids.map(j => ({ x: positions.getX(j), z: positions.getZ(j) })));
  }
  assert(Math.abs(floorArea - area(plan.footprint)) < .1, 'rendered floor area matches source polygon');
  let disposed = 0; geometry.addEventListener('dispose', () => disposed++);
  houses.leave(actor); view.clear(); assert.equal(disposed, 1); view.dispose();
  assert.deepEqual(actor, { ...outside, speed: 0 });
  const again = houses.enter(door, actor); assert.deepEqual(again, plan, 'deterministic lazy rebuild'); houses.reset(actor);
  return plan;
}
const irregular = { buildings: [{ id: 'irregular', type: 'house', height: 4,
  points: [[-4, 0], [4, 0], [4, 7], [1, 7], [1, 11], [-4, 11]] }],
  interiorEntries: [{ buildingId: 'irregular', x: 0, z: -.16, nx: 0, nz: 1 }] };
const irregularEntry = createInteriors(irregular).entries[0];
const irregularPlan = check(irregular, irregularEntry);
assert(!createInteriorCollider(irregularPlan).canOccupy({ x: 3, z: 9 }), 'concave bounding-box corner is outside');
irregular.storyHomes = { basement: { roomId: irregularEntry.id, buildingId: irregularEntry.buildingId, name: "Milo's safehouse" } };
check(irregular, irregularEntry, true);
const actual = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url)));
const exteriorScene = new THREE.Scene(), exterior = createNeighbourhoodDetails(exteriorScene, actual, () => 0, { lowGraphics: true, streaming: true });
actual.interiorEntries = exterior.entries;
const entries = createInteriors(actual).entries;
assert(entries.length > 100);
for (const entry of entries.slice(0, 12)) check(actual, entry);
actual.storyHomes = { basement: { roomId: entries[0].id, buildingId: entries[0].buildingId, name: "Milo's safehouse" } };
check(actual, entries[0], true);
exterior.dispose(); assert.equal(exteriorScene.children.length, 0);
console.log('PASS house source footprints: exact exterior vertices/area, concave outside collision, reachable furniture tasks, safe ledger, one-draw polygon floor and deterministic disposal; 12 actual rendered house doors');
