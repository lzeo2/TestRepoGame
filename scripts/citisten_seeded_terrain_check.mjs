// CPU/source regression only. No renderer/native/pixel acceptance.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRiverTerrain } from '../Games/Citisten3D/river-data.mjs';
import { createRiverGroundGeometry } from '../Games/Citisten3D/river-render.mjs';
import { createSimulation } from '../Games/Citisten3D/sim.mjs';
import { RoadGrid } from '../Games/Citisten3D/roads.mjs';
import { SCENARIOS } from '../Games/Citisten3D/production.mjs';
import { applyTool } from '../Games/Citisten3D/native-actions.mjs';
import { SAVE_KEY, readSave, saveTown } from '../Games/Citisten3D/persistence.mjs';

// Published ancestor has the exact same baseline game tree as source f66c65c6.
const baseline = '017e4a47e6235917ee21c46d221caa230855615f';
const source = name => execFileSync('git', ['show', `${baseline}:Games/Citisten3D/${name}`], { encoding: 'utf8' });
const originalSource = source('river-data.mjs');
const original = (await import(`data:text/javascript;base64,${Buffer.from(originalSource).toString('base64')}`)).createRiverTerrain;
const originalSimSource = source('sim.mjs').replace(/from '(\.\/[^']+)'/g, (_, path) => `from '${new URL(path, pathToFileURL(`${process.cwd()}/Games/Citisten3D/sim.mjs`)).href}'`);
const originalSimulation = (await import(`data:text/javascript;base64,${Buffer.from(originalSimSource).toString('base64')}`)).createSimulation;
const seeds = [0, 1, 2, 42, 0xffffffff];
const mask = t => Array.from({ length: t.size * t.size }, (_, i) => Number(t.isWater(i % t.size, Math.floor(i / t.size))));
let legacySamples = 0, rowCases = 0, geometryCases = 0, corruptions = 0, saveCycles = 0, legacySnapshots = 0;

// The old API ignores a supplied third argument: reproduce the reported root cause.
assert.deepEqual(mask(original(200, 'river-v1', 1)), mask(original(200, 'river-v1', 42)));
for (let size = 12; size <= 200; size++) {
  const old = original(size), omitted = createRiverTerrain(size), zero = createRiverTerrain(size, 'river-v1', 0);
  assert(!Object.hasOwn(omitted, 'seed')); assert.equal(zero.seed, 0);
  assert.deepEqual(omitted.rows, old.rows);
  for (const z of old.rows) for (let x = -.5; x <= size - .5; x += .5) {
    legacySamples++;
    for (const t of [omitted, zero]) {
      assert.equal(t.centerAt(z), old.centerAt(z));
      assert.equal(t.heightAt(x, z), old.heightAt(x, z));
      assert.equal(t.isWater(x, z), old.isWater(x, z));
      assert.equal(t.isBank(x, z), old.isBank(x, z));
    }
  }
  for (const seed of seeds) {
    const t = createRiverTerrain(size, 'river-v1', seed), repeat = createRiverTerrain(size, 'river-v1', seed), mid = Math.floor(size / 2);
    for (let z = mid - 2; z <= mid + 2; z++) for (let x = mid - 2; x <= mid + 2; x++) {
      assert(!t.isWater(x, z) && !t.isBank(x, z)); assert.equal(t.heightAt(x, z), 0);
    }
    for (let z = 0; z < size; z++) {
      rowCases++;
      assert.equal(t.centerAt(z), repeat.centerAt(z));
      const wet = Array.from({ length: size }, (_, x) => x).filter(x => t.isWater(x, z));
      assert(wet.length > 0); assert.equal(wet.at(-1) - wet[0] + 1, wet.length);
      assert(wet[0] > 0 && wet.at(-1) < size - 1);
      assert.equal(t.heightAt(0, z), 0); assert.equal(t.heightAt(size - 1, z), 0);
      assert(t.isBank(t.centerAt(z) - t.halfWidth - .5, z));
      assert(t.isBank(t.centerAt(z) + t.halfWidth + .5, z));
    }
    if ([12, 13, 40, 200].includes(size)) {
      geometryCases++;
      const g = createRiverGroundGeometry(t, 10), p = g.attributes.position, index = g.index;
      const again = createRiverGroundGeometry(repeat, 10);
      assert.deepEqual(p.array, again.attributes.position.array);
      for (const n of p.array) assert(Number.isFinite(n));
      for (let i = 0; i < p.count; i++) {
        assert(p.getX(i) >= -size * 5 && p.getX(i) <= size * 5);
        assert(p.getZ(i) >= -size * 5 && p.getZ(i) <= size * 5);
        assert(p.getY(i) >= -2.400001 && p.getY(i) <= 0);
      }
      for (let i = 0; i < index.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map(n => index.getX(i + n));
        const crossY = (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) - (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a));
        assert(crossY > 0, 'nondegenerate upward terrain');
        const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 30 + size / 2 - .5;
        const z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 30 + size / 2 - .5;
        assert(Math.abs(t.heightAt(x, z) - (p.getY(a) + p.getY(b) + p.getY(c)) / 3) < .0001, 'render geometry uses authoritative height');
      }
      g.dispose(); again.dispose();
    }
  }
}
// Deterministic fuzz across every supported size, including between render rows.
let fuzzCases = 0, fuzzSeed = 0x63c17157;
for (let size = 12; size <= 200; size++) for (let sample = 0; sample < 32; sample++) {
  fuzzSeed = (Math.imul(fuzzSeed, 1664525) + 1013904223) >>> 0;
  const t = createRiverTerrain(size, 'river-v1', fuzzSeed), old = original(size), mid = Math.floor(size / 2);
  const z = -.5 + size * (sample + .5) / 32, x = -.5 + size * ((fuzzSeed >>> 8) / 16777216);
  const legacy = createRiverTerrain(size), zero = createRiverTerrain(size, 'river-v1', 0);
  for (const terrain of [legacy, zero]) {
    assert.equal(terrain.heightAt(x, z), old.heightAt(x, z));
    assert.equal(terrain.isWater(x, z), old.isWater(x, z));
    assert.equal(terrain.isBank(x, z), old.isBank(x, z));
  }
  assert(Number.isFinite(t.centerAt(z)));
  assert(t.centerAt(z) - t.halfWidth - t.bankWidth > 0);
  assert(t.centerAt(z) + t.halfWidth + t.bankWidth < mid - 2);
  for (const xx of [mid - 2, mid, mid + 2]) assert.equal(t.heightAt(xx, z), 0);
  assert.equal(t.heightAt(0, z), 0); assert.equal(t.heightAt(size - 1, z), 0);
  fuzzCases++;
}
const terrains = seeds.map(seed => createRiverTerrain(200, 'river-v1', seed));
const masks = terrains.map(mask), visibility = [];
for (let a = 0; a < seeds.length; a++) for (let b = a + 1; b < seeds.length; b++) {
  const different = masks[a].filter((n, i) => n !== masks[b][i]).length;
  const course = Math.max(...Array.from({ length: 200 }, (_, z) => Math.abs(terrains[a].centerAt(z) - terrains[b].centerAt(z))));
  assert(different > 400, 'measurable changed water cells, not resource/hash noise');
  assert(course > 1, 'course differs by more than one lot');
  const ga = createRiverGroundGeometry(terrains[a], 10), gb = createRiverGroundGeometry(terrains[b], 10);
  assert.notDeepEqual(ga.attributes.position.array, gb.attributes.position.array, 'actual CPU render vertices differ');
  ga.dispose(); gb.dispose();
  visibility.push(`${seeds[a]}/${seeds[b]}:${different}cells/${course.toFixed(2)}lots`);
}
assert.deepEqual(masks[0], mask(original(200)), 'seed 0 full 40k legacy mask');
for (const value of [-1, 1.5, '1', NaN, Infinity, 0x100000000, null]) {
  assert.throws(() => createRiverTerrain(40, 'river-v1', value), RangeError);
  const roads = new RoadGrid(40); roads.set(0, 0);
  const cells = roads.cells, version = roads.version;
  assert.throws(() => createSimulation({ size: 40, roads, terrainSeed: value }), RangeError);
  assert.equal(roads.cells, cells); assert.deepEqual([...cells], [0]); assert.equal(roads.version, version);
}

// Current default API remains snapshot-identical to the pinned source, regardless
// of economy seed. Legacy field absence never acquires the optional metadata.
for (const layout of ['legacy-flat', 'river-v1']) for (const seed of seeds) {
  const options = { size: 40, terrainLayout: layout, seed };
  const old = originalSimulation(options), current = createSimulation(options);
  for (const dt of [0, .13, .25, 2.7]) {
    old.update(dt); current.update(dt);
    const snapshot = old.snapshot(); legacySnapshots++;
    assert.deepEqual(current.snapshot(), snapshot);
    const restored = createSimulation({ snapshot, terrainLayout: 'river-v1', terrainSeed: 42, seed: 123 });
    assert.deepEqual(restored.snapshot(), snapshot);
    assert(!Object.hasOwn(restored.state, 'terrainSeed'));
    assert.deepEqual(createSimulation({ snapshot, terrainSeed: -1 }).snapshot(), snapshot, 'saved absence overrides even invalid new-town seed');
    assert.deepEqual(mask(restored.terrain), mask(old.terrain));
    let slot;
    const legacyStorage = { getItem: () => slot, setItem: (_key, value) => { slot = value; } };
    assert(saveTown(old, { storage: legacyStorage }).ok);
    const bytes = slot;
    const fromSlot = createSimulation({ snapshot: readSave(legacyStorage).snapshot, terrainSeed: 42 });
    assert.deepEqual(fromSlot.snapshot(), snapshot);
    assert(!Object.hasOwn(fromSlot.state, 'terrainSeed'));
    assert.equal(slot, bytes, 'Continue preserves original legacy slot bytes');
  }
}
for (const seed of seeds) {
  const old = originalSimulation({ seed, terrainLayout: 'river-v1' });
  assert(applyTool(old, 'bridge', { x: 83, z: 100 }, { x: 95, z: 100 }).ok);
  assert(old.place('park', 80, 99).ok);
  const snapshot = old.snapshot();
  const restored = createSimulation({ snapshot, terrainSeed: 42 });
  assert.deepEqual(restored.snapshot(), snapshot); legacySnapshots++;
  assert.deepEqual(mask(restored.terrain), mask(old.terrain));
  assert(restored.roads.path({ x: 83, z: 100 }, { x: 95, z: 100 }).length > 0);
}
const missingLayout = originalSimulation({ size: 40 }).snapshot(); delete missingLayout.state.terrainLayout;
assert.equal(createSimulation({ snapshot: missingLayout, terrainSeed: 42 }).terrain.layout, 'legacy-flat');

const memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
const mapFor = seed => mask(createRiverTerrain(40, 'river-v1', seed));
const fresh = (terrainSeed, seed = 19) => createSimulation({ size: 40, terrainLayout: 'river-v1', terrainSeed, seed, timedConstruction: true, expansionEnabled: true, scenario: 'balanced' });
for (const seed of seeds) {
  let sim = fresh(seed);
  assert.deepEqual(sim.snapshot(), fresh(seed).snapshot());
  for (const scenario of Object.keys(SCENARIOS)) {
    const options = { size: 40, terrainLayout: 'river-v1', terrainSeed: seed, seed: 19, expansionEnabled: true, scenario };
    const a = createSimulation(options), b = createSimulation(options);
    assert.deepEqual(a.snapshot(), b.snapshot()); assert.deepEqual(mask(a.terrain), mapFor(seed));
  }
  assert.deepEqual(mask(sim.terrain), mask(fresh(seed, 888).terrain), 'economy/UI seed is independent');
  const mapBefore = mask(sim.terrain);
  assert(applyTool(sim, 'road', { x: 18, z: 23 }, { x: 32, z: 23 }).ok);
  for (const [type, x, z] of [['power', 24, 24], ['water', 25, 24], ['commercial', 23, 22], ['residential', 22, 22], ['park', 26, 24]]) assert(sim.place(type, x, z).ok);
  for (let round = 0; round < 3; round++) {
    sim.update(1.13);
    assert(sim.state.buildings.some(b => b.constructionRemaining > 0));
    assert(saveTown(sim, { storage }).ok);
    const bytes = memory.get(SAVE_KEY), snapshot = sim.snapshot();
    const resumed = createSimulation({ snapshot: readSave(storage).snapshot, terrainSeed: seed === 42 ? 1 : 42, seed: 999 });
    assert.deepEqual(resumed.snapshot(), snapshot, 'money/IDs/clocks/construction exact');
    assert.deepEqual(mask(resumed.terrain), mapBefore);
    assert.equal(memory.get(SAVE_KEY), bytes);
    resumed.update(.25); sim.update(.25); assert.deepEqual(resumed.snapshot(), sim.snapshot());
    sim = resumed; saveCycles++;
  }
  const rngBefore = sim.snapshot().runtime.seed;
  sim.update(60);
  assert.notEqual(sim.snapshot().runtime.seed, rngBefore, 'real traffic advanced gameplay RNG');
  assert.deepEqual(mask(createSimulation({ snapshot: sim.snapshot(), terrainSeed: 123 }).terrain), mapBefore);
  const z = 5, wet = Array.from({ length: 40 }, (_, x) => x).filter(x => sim.terrain.isWater(x, z));
  assert(applyTool(sim, 'bridge', { x: wet[0] - 2, z }, { x: wet.at(-1) + 2, z }).ok);
  assert(sim.roads.path({ x: wet[0] - 2, z }, { x: wet.at(-1) + 2, z }).length > 0);
  assert.deepEqual(createSimulation({ snapshot: sim.snapshot() }).snapshot(), sim.snapshot(), 'seeded bridge validation uses same water mask');
  const left = wet[0] - 2, right = wet.at(-1) + 2;
  assert(sim.place('power', left, z - 1).ok); assert(sim.place('water', left, z + 1).ok);
  const home = sim.place('residential', right, z - 1); assert(home.ok);
  sim.update(20); assert(home.building.powered && home.building.watered, 'seeded crossing carries both utilities');
  assert.deepEqual(createSimulation({ snapshot: sim.snapshot() }).snapshot(), sim.snapshot());
  assert(applyTool(sim, 'bulldoze', { x: wet[0], z }).ok);
  sim.update(1); assert(!home.building.powered && !home.building.watered, 'cut seeded crossing disconnects utilities');
}
// Published native fixture remains unchanged for explicit seed 0.
const native = createSimulation({ terrainLayout: 'river-v1', terrainSeed: 0 });
assert(applyTool(native, 'bridge', { x: 83, z: 100 }, { x: 95, z: 100 }).ok);

const good = fresh(42).snapshot();
assert.deepEqual(createSimulation({ snapshot: good, terrainSeed: -1 }).snapshot(), good, 'saved explicit seed overrides caller');
assert.equal(createSimulation({ snapshot: fresh(0).snapshot(), terrainSeed: 42 }).terrain.seed, 0, 'saved explicit zero overrides caller');
for (const value of [-1, 1.5, '1', NaN, Infinity, 0x100000000, null, undefined]) {
  const bad = structuredClone(good); bad.state.terrainSeed = value;
  const roads = new RoadGrid(40); roads.set(0, 0);
  const cells = roads.cells, before = [...cells], version = roads.version;
  const stored = JSON.stringify(bad); memory.set(SAVE_KEY, stored);
  assert.throws(() => createSimulation({ roads, snapshot: bad }), RangeError);
  if (value !== undefined) assert.throws(() => createSimulation({ roads, snapshot: readSave(storage).snapshot }), RangeError);
  assert.equal(roads.cells, cells); assert.deepEqual([...cells], before); assert.equal(roads.version, version);
  assert.equal(memory.get(SAVE_KEY), stored); corruptions++;
}
for (const layout of [undefined, null, 'unknown', 42]) {
  const bad = structuredClone(good); bad.state.terrainLayout = layout;
  const roads = new RoadGrid(40); roads.set(0, 0);
  const cells = roads.cells, version = roads.version, bytes = memory.get(SAVE_KEY);
  assert.throws(() => createSimulation({ roads, snapshot: bad }), RangeError);
  assert.equal(roads.cells, cells); assert.deepEqual([...cells], [0]); assert.equal(roads.version, version);
  assert.equal(memory.get(SAVE_KEY), bytes); corruptions++;
}
console.log(`SEEDED TERRAIN PASS: ${legacySamples} pinned legacy samples; ${rowCases} seeded rows; ${geometryCases} CPU geometries; ${visibility.length} 40k-mask pairs`);
console.log(`FUZZ PASS: ${fuzzCases} deterministic size/seed/continuous-point cases; dry edges/starter and legacy interpolation`);
console.log(`VISIBLE DATA: ${visibility.join(', ')}`);
console.log(`SAVE PASS: ${legacySnapshots} pinned legacy snapshots; ${saveCycles} partial-build save/continue restarts; 5 independent RNG/bridge/utility replays; ${corruptions} atomic corruptions; native seed0 bridge 83..95`);
console.log(`BASELINE river-data SHA256 ${createHash('sha256').update(originalSource).digest('hex')}; CPU only, native/pixels OPEN`);
