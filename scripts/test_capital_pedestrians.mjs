import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const threeSource = await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8');
const threeURL = `data:text/javascript;base64,${Buffer.from(threeSource).toString('base64')}`;
const THREE = await import(threeURL);
const source = (await readFile(new URL('../Games/Capital Drive/pedestrians.js', import.meta.url), 'utf8'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL));
const { createPedestrians } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const bounds = { minX: -500, maxX: 500, minZ: -500, maxZ: 500 };
const road = { id: 'street', name: 'Example Street', type: 'residential', width: 8, points: [[-350, 0], [0, 0], [350, 0]] };
const fixture = { bounds, roads: [road], spawn: { x: 0, z: 0, yaw: 0 }, buildings: [
  { points: [[30, 4], [60, 4], [60, 20], [30, 20]] }
], landmarks: [] };
const heightAt = (x, z) => x * 0.001 + z * 0.002;
const scene = new THREE.Scene();
const pedestrians = createPedestrians(scene, fixture, heightAt);
assert.equal(pedestrians.stats.count, 80);
assert(pedestrians.stats.visible >= 20, 'population appears near the initial player');
assert.equal(scene.children[0].children.length, 8, 'body parts share eight instanced batches');
assert(pedestrians.stats.drawCalls <= 8);
assert(pedestrians.stats.detailed <= 20);
function checkFixture() {
  for (const p of pedestrians.snapshot()) {
    assert(Math.abs(Math.abs(p.z) - (5.2 + p.escape)) < 1e-8, 'walkers stay at road half-width plus 1.2m on straight sidewalks');
    assert(!(p.x > 30 && p.x < 60 && p.z > 4 && p.z < 20), 'building footprint is avoided');
    assert(Math.abs(p.y - heightAt(p.x, p.z) - 0.05) < 1e-8, 'feet follow terrain and pavement lift');
    assert(p.x > bounds.minX && p.x < bounds.maxX && p.z > bounds.minZ && p.z < bounds.maxZ);
    assert([p.x, p.y, p.z, p.yaw, p.phase].every(Number.isFinite));
  }
}
checkFixture();
const shoeBatch = scene.children[0].children.find(mesh => mesh.name === 'Pedestrian shoes');
const shoeMatrix = new THREE.Matrix4(), shoeCenter = new THREE.Vector3(), shoeScale = new THREE.Vector3(), shoeRotation = new THREE.Quaternion();
for (let i = 0; i < shoeBatch.count; i++) {
  shoeBatch.getMatrixAt(i, shoeMatrix);
  shoeMatrix.decompose(shoeCenter, shoeRotation, shoeScale);
  assert(Math.abs(shoeCenter.y - shoeScale.y / 2 - heightAt(shoeCenter.x, shoeCenter.z) - 0.05) < 1e-5,
    'each individual shoe sole rests on its own terrain sample');
}
const initial = pedestrians.snapshot();
assert(Object.isFrozen(initial) && Object.isFrozen(initial[0]), 'snapshots cannot mutate the simulation');
const repeated = createPedestrians(new THREE.Scene(), fixture, heightAt);
assert.deepEqual(repeated.snapshot(), initial, 'fixed seed reproduces population');
repeated.dispose();
for (let i = 0; i < 600; i++) pedestrians.update({ x: 0, z: -30, speed: 0 }, 1 / 30);
checkFixture();
assert.notDeepEqual(pedestrians.snapshot(), initial, 'walkers advance along the street');
const paused = pedestrians.snapshot();
const matrices = scene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]);
for (let i = 0; i < 20; i++) pedestrians.update({ x: 400, z: 400, speed: 30 }, 0);
assert.deepEqual(pedestrians.snapshot(), paused, 'zero dt freezes movement, reactions and animation');
assert.deepEqual(scene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]), matrices, 'pause freezes rendered poses too');
const near = pedestrians.snapshot()[0];
pedestrians.update({ x: near.x, z: near.z, speed: 0 }, 0.1);
const reacted = pedestrians.snapshot()[0];
assert(reacted.stopped && reacted.escape > 0, 'nearby car stops walkers and they retreat into the pavement');
pedestrians.dispose(); pedestrians.dispose();
assert.equal(scene.children.length, 0, 'dispose removes all pedestrian batches');
console.log('PASS deterministic sidewalk offsets, building avoidance, terrain, walking, car response, pause and disposal');

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const actual = createPedestrians(new THREE.Scene(), map, heightAt);
assert.equal(actual.stats.count, 80);
assert(actual.stats.visible >= 20, 'actual map starts with nearby pedestrians');
const initialStats = { ...actual.stats };
assert(actual.stats.triangles < 60000, 'population stays within a modest low-poly budget');
const outlines = map.buildings.map(building => ({ points: building.points,
  minX: Math.min(...building.points.map(p => p[0])), maxX: Math.max(...building.points.map(p => p[0])),
  minZ: Math.min(...building.points.map(p => p[1])), maxZ: Math.max(...building.points.map(p => p[1])) }));
function insideOutline(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > p.z) !== (b[1] > p.z) && p.x < (b[0] - a[0]) * (p.z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const named = new Map(map.roads.map(r => [r.id, r]));
function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a[0] - dx * t, p.z - a[1] - dz * t);
}
function checkActual() {
  for (const p of actual.snapshot()) {
    assert([p.x, p.y, p.z, p.yaw].every(Number.isFinite));
    assert(p.x > map.bounds.minX && p.x < map.bounds.maxX && p.z > map.bounds.minZ && p.z < map.bounds.maxZ);
    assert(!outlines.some(b => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ && insideOutline(p, b.points)),
      'actual mapped building outlines are never occupied');
    const r = named.get(p.roadId);
    assert(r.name && ['residential', 'tertiary'].includes(r.type));
    const distance = Math.min(...r.points.slice(1).map((b, i) => distanceToSegment(p, r.points[i], b)));
    assert(distance >= r.width / 2 + 0.5, 'actual-map walkers remain off asphalt');
    assert(distance <= r.width / 2 + 1.75, 'walkers remain within the pavement ribbon');
  }
}
checkActual();
function aheadCount(player) {
  const fx = -Math.sin(player.yaw || 0), fz = -Math.cos(player.yaw || 0);
  return actual.snapshot().filter(p => {
    const dx = p.x - player.x, dz = p.z - player.z;
    const forward = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
    return forward >= 10 && forward <= 60 && lateral < forward * 0.5 + 3;
  }).length;
}
assert(aheadCount(map.spawn) >= 6, 'several pedestrians begin on sidewalks within the chase camera view ahead');
const manuka = { ...map.landmarks.find(p => p.id === 'manuka'), yaw: 0 };
actual.resetPopulation(manuka);
assert.equal(actual.stats.count, 80, 'teleports reuse the same population');
assert(actual.stats.visible >= 40, 'Manuka arrival immediately has nearby walkers');
assert(aheadCount(manuka) >= 4, 'Manuka arrival places walkers ahead as well as around the destination');
checkActual();
const arrived = actual.snapshot();
actual.update({ x: 3000, z: 2000, yaw: 0 }, 0);
assert.deepEqual(actual.snapshot(), arrived, 'pause still freezes an explicitly reset population');
actual.resetPopulation(manuka);
assert.deepEqual(actual.snapshot(), arrived, 'repeating the same teleport is deterministic');
actual.resetPopulation(map.spawn);
console.log('PASS immediate Manuka population reset, forward sidewalk visibility and deterministic paused arrivals');
for (let i = 0; i < 1800; i++) actual.update(map.spawn, 1 / 30);
checkActual();
const far = { x: map.spawn.x + 1300, z: map.spawn.z + 300, speed: 0 };
for (let i = 0; i < 35; i++) actual.update(far, 1 / 30);
assert(actual.stats.recycled > 0, 'far pedestrians are reused near the player');
checkActual();
for (const p of actual.snapshot()) {
  const gap = Math.hypot(p.x - far.x, p.z - far.z);
  assert(gap > 180, 'recycled pedestrians enter outside the visible radius');
}
console.log(`PASS actual Canberra map: ${actual.stats.count} adults, ${actual.stats.paths} safe paths, ${actual.stats.recycled} recycled, ${initialStats.visible} initially visible, ${initialStats.triangles} initial triangles, <=8 draws`);
actual.alert({ x: far.x, z: far.z, radius: 100, kind: 'gunshot' });
for (let i = 0; i < 120; i++) actual.update(far, 1 / 30);
checkActual();
actual.dispose();

const combat = createPedestrians(new THREE.Scene(), fixture, heightAt);
const origin = fixture.spawn;
const calmPopulation = combat.snapshot();
const target = calmPopulation[0];
const attack = { x: target.x, z: target.z + 1, yaw: 0, range: 1.2, damage: 40, kind: 'melee' };
assert.equal(combat.strike({ ...attack, hasLineOfSight: () => false }).hits, 0, 'occluded strikes cannot hit');
assert.equal(combat.strike({ ...attack, damage: NaN }).hits, 0, 'invalid damage cannot corrupt health');
const hit = combat.strike(attack);
assert.equal(hit.hits, 1, 'forward close melee hits only the nearby adult');
assert.equal(hit.people[0].health, 60);
assert.equal(combat.snapshot()[0].reaction, 'knockdown');
assert.equal(combat.strike(attack).hits, 0, 'hit cooldown prevents repeated same-frame damage');
const witnesses = combat.drainEvents();
assert(witnesses.some(event => event.type === 'witness'), 'nearby adults witness the strike');
assert.deepEqual(combat.drainEvents(), [], 'events drain exactly once');
combat.alert({ x: attack.x, z: attack.z, radius: 16, kind: 'gunshot' });
assert.deepEqual(combat.drainEvents(), [], 'witness cooldown prevents repeated instant reports');
const pausedCombat = combat.snapshot();
combat.update({ x: target.x, z: target.z, speed: 30 }, 0);
assert.deepEqual(combat.snapshot(), pausedCombat, 'zero dt freezes damage and every reaction timer');
for (let i = 0; i < 120; i++) combat.update({ x: 0, z: -100, speed: 0 }, 0.1);
assert.equal(combat.snapshot()[0].health, 100, 'bounded recovery restores health');
assert.equal(combat.snapshot()[0].reaction, 'calm');
combat.resetPopulation(origin);
assert.deepEqual(combat.snapshot(), calmPopulation, 'reset clears damage, timers and reactions deterministically');
assert.deepEqual(combat.drainEvents(), []);
assert(combat.alert({ x: target.x, z: target.z, radius: 30, kind: 'gunshot' }) > 0);
assert(combat.snapshot().some(p => p.reaction === 'panic'), 'firing immediately raises visible arms');
combat.update({ x: 0, z: -100 }, 0.1);
assert(combat.snapshot().some(p => p.reaction === 'flee'), 'panic turns into sidewalk fleeing');
for (let i = 0; i < 120; i++) combat.update({ x: 0, z: -100 }, 0.1);
for (const p of combat.snapshot()) {
  assert(Math.abs(Math.abs(p.z) - (5.2 + p.escape)) < 1e-8, 'fleeing stays on generated safe sidewalk');
  assert(!(p.x > 30 && p.x < 60 && p.z > 4 && p.z < 20), 'fleeing never enters buildings');
}
combat.resetPopulation(origin);
const angry = combat.snapshot()[0];
combat.strike({ x: angry.x, z: angry.z + 1, yaw: 0, range: 1.2, damage: 10 });
combat.drainEvents();
for (let i = 0; i < 8; i++) combat.update({ x: angry.x, z: angry.z + 1 }, 0.1);
const retaliation = combat.drainEvents().filter(event => event.type === 'retaliation');
assert.equal(retaliation.length, 1, 'occasional angry adult retaliates after stun');
assert.equal(retaliation[0].damage, 5);
for (let i = 0; i < 10; i++) combat.update({ x: angry.x, z: angry.z + 1 }, 0.1);
assert.equal(combat.drainEvents().filter(event => event.type === 'retaliation').length, 0, 'retaliation has cooldown');
combat.resetPopulation(origin);
const carTarget = combat.snapshot()[0];
combat.update({ x: carTarget.x, z: carTarget.z, speed: 20 }, 0.1);
assert.notEqual(combat.snapshot()[0].reaction, 'calm', 'reckless cars trigger panic');
combat.resetPopulation(origin);
combat.strike({ x: target.x, z: target.z + 1, yaw: 0, range: 1.2, damage: 100, kind: 'pistol' });
assert.equal(combat.snapshot()[0].health, 0);
for (let i = 0; i < 180; i++) combat.update({ x: 0, z: -100 }, 0.1);
assert.equal(combat.snapshot()[0].health, 100, 'defeated fictional adults recover without permanent pool loss');
combat.dispose();
assert.equal(combat.alert({ x: 0, z: 0 }), 0);
assert.equal(combat.strike(attack).hits, 0);
assert.deepEqual(combat.drainEvents(), []);
console.log('PASS street reactions: hit/LOS/cooldowns, witnesses drain once, panic/flee safe paths, recovery/reset, retaliation and disposal');
