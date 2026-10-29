// Measured surface queries and actual local prepare/rig/host bridge, CPU only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileGeometry, fittedHeightAt, fittedHit, yawRotate, yawQuaternion } from './fleet-geometry.mjs';
import { createFleet } from './fleet-sim.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
const config = createLocalFleetConfig(), geometries = config.geometry.map(e => compileGeometry(e.descriptor));
const near = (a, b) => assert(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const world = (p, h, x, z) => yawRotate([x, 0, z], h).map((n, i) => n + p[i]);
let probes = 0, gaps = 0;
for (let i = 0; i < geometries.length; i++) {
  const g = geometries[i], d = config.geometry[i].descriptor;
  const bytes = readFileSync(new URL('../' + d.file, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), d.sha256);
  const before = structuredClone(g);
  const maxX = Math.max(...g.boxes.map(b => b.max[0])), hullZ = 0;
  assert.notEqual(fittedHeightAt(g, maxX, hullZ, [0, 0, 0], 0), null, 'inclusive component edge');
  assert.equal(fittedHeightAt(g, maxX + 1e-8, hullZ, [0, 0, 0], 0), null, 'strict outside, no inflated epsilon');
  for (const h of [0, Math.PI / 2, .63, Math.PI * 3]) for (const p of [[0, 0, 0], [307, 17, -291]]) {
    // Grid includes aggregate-island gaps and areas inside clearance but outside every fitted box.
    for (let x = g.clearance.min[0] - 2; x <= g.clearance.max[0] + 2; x += 3.1)
      for (let z = g.clearance.min[2] - 2; z <= g.clearance.max[2] + 2; z += 5.3) {
        const point = world(p, h, x, z);
        const boxes = g.boxes.filter(b => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2]);
        const expected = boxes.length ? p[1] + Math.max(...boxes.map(b => b.max[1])) : null;
        const top = fittedHeightAt(g, point[0], point[2], p, h);
        if (expected === null) assert.equal(top, null); else near(top, expected);
        const a = [point[0], p[1] + 200, point[2]], b = [point[0], p[1] - 200, point[2]];
        const hit = fittedHit(g, a, b, p, h);
        if (top === null) assert.equal(hit, null); else near(a[1] + (b[1] - a[1]) * hit, top);
        if (x > d.collision.island_bounds.min[0] && x < d.collision.island_bounds.max[0] &&
            z > d.collision.island_bounds.min[2] && z < d.collision.island_bounds.max[2] &&
            !g.boxes.slice(2).some(b => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2])) {
          assert(top === null || top < p[1] + d.collision.island_bounds.max[1]); gaps++;
        }
        probes++;
      }
    for (const box of g.boxes) {
      const point = world(p, h, (box.min[0] + box.max[0]) / 2, (box.min[2] + box.max[2]) / 2);
      assert(fittedHeightAt(g, point[0], point[2], p, h) >= p[1] + box.max[1]);
    }
  }
  for (const bad of [NaN, Infinity, -Infinity, 100001, '0', null, undefined]) {
    assert.equal(fittedHeightAt(g, bad, 0, [0, 0, 0], 0), null);
    assert.equal(fittedHeightAt(g, 0, bad, [0, 0, 0], 0), null);
    assert.equal(fittedHeightAt(g, 0, 0, [0, 0, 0], bad), null);
    assert.equal(fittedHeightAt(g, 0, 0, [bad, 0, 0], 0), null);
  }
  assert.deepEqual(g, before);
}
assert(gaps > 0);
console.log(`PASS two pinned derived GLBs: ${probes} vertical/component/yaw/translated probes; ${gaps} island-gap negatives; bounded inputs; no geometry mutation`);

const c = structuredClone(config);
c.units.forEach(u => { u.weapons = []; });
const fleet = createFleet(c), initial = fleet.snapshot(0), replay = fleet.exportReplay();
for (const unit of initial.units) {
  const g = geometries[unit.team];
  const top = fittedHeightAt(g, ...[unit.position[0], unit.position[2]], unit.position, c.units[unit.team].heading);
  assert.equal(fleet.surfaceHeightAt(unit.position[0], unit.position[2]), top);
}
assert.deepEqual(fleet.snapshot(0), initial); assert.deepEqual(fleet.exportReplay(), replay);
const first = initial.units[0], x = first.position[0], z = first.position[2];
initial.units[0].position[0] += 1000;
assert.notEqual(fleet.surfaceHeightAt(x, z), null, 'snapshot clone cannot move authority');
fleet.advance(500);
const moved = fleet.snapshot(0).units[0];
assert.notDeepEqual(moved.position, first.position);
near(fleet.surfaceHeightAt(moved.position[0], moved.position[2]),
  fittedHeightAt(geometries[moved.team], moved.position[0], moved.position[2], moved.position,
    2 * Math.atan2(moved.view.orientation[1], moved.view.orientation[3])));
const segment = { source: 'aircraft_test', team: 1 - moved.team, weapon: 'cannon20', from: [moved.position[0], 200, moved.position[2]],
  to: [moved.position[0], -20, moved.position[2]], damage: 10000, maxFraction: 1 };
assert(fleet.resolveHostSegment(segment));
assert.equal(fleet.surfaceHeightAt(moved.position[0], moved.position[2]), null, 'death excluded immediately');
const fallback = structuredClone(c); fallback.units.forEach(u => { delete u.modelId; u.half = [10, 5, 30]; });
assert.equal(createFleet(fallback).surfaceHeightAt(x, z), null, 'unmodelled proxies deliberately excluded');
console.log('PASS live core current pose, pure snapshot/replay query, cloned snapshots, immediate death, unmodelled null');

assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools');
const root = fileURLToPath(new URL('../../../', import.meta.url)), three = resolve(process.env.THREE_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json'))); assert.equal(manifest.version, '0.186.0');
const T = await import(pathToFileURL(resolve(three, 'build/three.webgpu.js')));
const { build } = await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT, 'lib/main.js')));
const src = resolve(root, 'Games/Wings/source/games/wings/src'), entry = resolve(src, 'ui/local-factions.ts');
const aliases = { name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
    const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    if (typeof target === 'object') target = target.import;
    assert.equal(typeof target, 'string'); return { path: resolve(three, target) };
  });
} };
const options = { bundle: true, write: false, outdir: 'in-memory-height-check', format: 'esm', minify: true, legalComments: 'none',
  define: { 'import.meta.env.BASE_URL': '"./"', 'import.meta.env.DEV': 'false' } };
const result = await build({ ...options, platform: 'node', stdin: { resolveDir: root, contents:
  `export * from ${JSON.stringify(entry)};
   export {withFleetSurface} from ${JSON.stringify(resolve(src, 'sim/fleet-world-query.ts'))};
   export {createFlightState, stepFlight, NEUTRAL_INPUT} from ${JSON.stringify(resolve(src, 'sim/flight.ts'))};
   export {worldQuery} from ${JSON.stringify(resolve(src, 'sim/geography.ts'))};` }, plugins: [{ name: 'manual-room-glb-fixture', setup(api) {
  api.onResolve({ filter: /^three\/addons\/loaders\/GLTFLoader\.js$/ }, () => ({ path: 'loader', namespace: 'fixture' }));
  api.onResolve({ filter: /^\.\.\/sim\/loopback$/ }, args => args.importer === entry ? { path: 'room', namespace: 'fixture' } : undefined);
  api.onResolve({ filter: /retained-host-bridge\.mjs$/ }, args => args.importer === entry ? { path: 'bridge', namespace: 'fixture' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', resolveDir: root, contents:
    args.path === 'loader' ? 'export class GLTFLoader { parseAsync(b) { return globalThis.__heightParse(b) } }' : args.path === 'room' ?
      `import {createLoopbackRoom as actual} from ${JSON.stringify(resolve(src, 'sim/loopback.ts'))};
       export function createLoopbackRoom(c,n,h,o) { return globalThis.__heightRoom=actual(c,n,h,{...o,manual:true}) }` :
      `import {createRetainedHostBridge as actual} from ${JSON.stringify(resolve(root, 'Games/Wings/authoring/retained-host-bridge.mjs'))};
       export function createRetainedHostBridge(o) { globalThis.__heightPublish=o.onSnapshot; return globalThis.__heightBridge=actual(o) }` }));
} }, aliases] });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const saved = new Map(['location', 'fetch', '__heightParse', '__heightRoom', '__heightPublish', '__heightBridge'].map(k => [k, globalThis[k]]));
let local;
try {
  globalThis.location = { href: 'http://127.0.0.1/' };
  globalThis.fetch = async url => {
    const p = new URL(url); assert.equal(p.origin, 'http://127.0.0.1');
    assert.match(p.pathname, /^\/models\/derived\/[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(root, 'Games/Wings', p.pathname.slice(1))));
  };
  globalThis.__heightParse = async bytes => { const { object } = modelGeometryFixture(T, bytes); return { scene: object, scenes: [object] }; };
  const scene = new T.Scene();
  local = await api.prepareLocalFactions({ scene, quality: 'low', effects: { setFleetFrame() {}, fleetStats() { return {} } } });
  assert.equal(local.surfaceHeightAt(x, z), null, 'before frame');
  local.connect('Height CPU', { onMessage() {} });
  const room = globalThis.__heightRoom, bridge = globalThis.__heightBridge;
  room.step(1 / 60);
  let frame = structuredClone(local.debug().frame);
  const publish = f => globalThis.__heightPublish(room.playerId, f);
  for (const u of frame.units) {
    const rig = scene.getObjectByName(`fleet-unit:${u.id}`);
    assert.deepEqual(rig.position.toArray(), u.position);
    const g = geometries[u.team], h = 2 * Math.atan2(rig.quaternion.y, rig.quaternion.w);
    for (const box of g.boxes) {
      const p = world(u.position, h, (box.min[0] + box.max[0]) / 2, (box.min[2] + box.max[2]) / 2);
      near(local.surfaceHeightAt(p[0], p[2]), fittedHeightAt(g, p[0], p[2], rig.position.toArray(), h));
      near(local.surfaceHeightAt(p[0], p[2]), room.engine.combat.hostFleet.surfaceHeightAt(p[0], p[2]));
    }
  }
  const u = frame.units[0], [px, , pz] = u.position;
  const safeWorld = api.withFleetSurface(api.worldQuery, local.surfaceHeightAt);
  assert.strictEqual(api.withFleetSurface(api.worldQuery), api.worldQuery, 'ordinary context identity retained');
  const top = local.surfaceHeightAt(px, pz);
  assert(top > api.worldQuery.groundHeight(px, pz));
  assert.equal(safeWorld.groundHeight(px, pz), top);
  assert.equal(safeWorld.onRunway(px, pz), false, 'escort hull is not a serviced runway');
  assert.equal(safeWorld.isWater(px, pz), false); assert.equal(safeWorld.deckVelocity(px, pz), null);
  const deckBase = { half: 6000, ceiling: 15000, groundHeight: () => 0,
    onRunway: () => true, isWater: () => true, deckVelocity: () => [3, 0, 1] };
  const absent = api.withFleetSurface(deckBase, () => null);
  assert(absent.onRunway(px, pz)); assert(absent.isWater(px, pz)); assert.deepEqual(absent.deckVelocity(px, pz), [3, 0, 1]);
  const highGround = api.withFleetSurface({ ...deckBase, groundHeight: () => top + 10 }, local.surfaceHeightAt);
  assert.equal(highGround.groundHeight(px, pz), top + 10); assert(highGround.onRunway(px, pz));
  for (const invalid of [NaN, Infinity, undefined])
    assert.equal(api.withFleetSurface(deckBase, () => invalid).groundHeight(0, 0), 0);
  function jet() {
    const state = api.createFlightState('f15', { position: [px, top - 1, pz], yaw: 0, onGround: false });
    state.velocity = [0, -60, 0]; state.throttle = 0; state.gearDown = false; return state;
  }
  const miss = jet(); api.stepFlight(miss, api.NEUTRAL_INPUT, 1 / 60, api.worldQuery);
  assert.equal(miss.crashed, null, 'native sea alone misses elevated FC body');
  const hit = jet(); api.stepFlight(hit, api.NEUTRAL_INPUT, 1 / 60, safeWorld);
  assert(hit.crashed, 'actual native flight collides with safe fitted hull surface');
  // Execute the real controller callsites with actual physics, not a copied replay implementation.
  const game = readFileSync(resolve(src, 'ui/game.ts'), 'utf8');
  const liveCall = game.match(/^\s*stepFlight\(p.state, fi, TICK_DT, this.flightWorld\)$/m)?.[0];
  const replayCall = game.match(/^\s*for \(const e of h\) stepFlight\(next, e.input, TICK_DT, this.flightWorld\)$/m)?.[0];
  assert(liveCall && replayCall, 'both actual client flight paths must use the FC context');
  const predicted = { state: jet() };
  new Function('stepFlight', 'p', 'fi', 'TICK_DT', liveCall).call({ flightWorld: safeWorld }, api.stepFlight, predicted, api.NEUTRAL_INPUT, 1 / 60);
  assert(predicted.state.crashed);
  const replayed = jet();
  new Function('stepFlight', 'next', 'h', 'TICK_DT', replayCall).call({ flightWorld: safeWorld }, api.stepFlight, replayed, [{ input: api.NEUTRAL_INPUT }], 1 / 60);
  assert(replayed.crashed);
  room.send({ type: 'spawn', kind: 'f15' });
  const player = room.engine.players.get(room.playerId).info;
  const vehicle = room.engine.vehicles.find(v => v.id === player.vehicleId);
  assert(vehicle?.alive); vehicle.flight = jet(); room.step(1 / 60);
  assert(vehicle.flight.crashed && !vehicle.alive, 'actual RoomEngine authoritative flight uses its trusted FC hook');
  frame = structuredClone(local.debug().frame); // Later privacy fixtures start from the advanced frame, not a rewind.
  console.log('PASS actual RoomEngine/native stepFlight collision plus real client live/replay callsites; safe frame context, no false runway/water/deck semantics; ordinary base identity (CPU pose fixture)');
  const binding = room.engine.combat.hostFleet;
  const before = bridge.snapshot(room.engine, room.playerId), stats = bridge.stats();
  for (const bad of [NaN, Infinity, 100001, '0']) assert.equal(local.surfaceHeightAt(bad, z), null);
  for (let i = 0; i < 10; i++) local.surfaceHeightAt(x, z);
  assert.deepEqual(bridge.snapshot(room.engine, room.playerId), before);
  assert.deepEqual(bridge.stats(), stats);
  assert.equal(binding.surfaceHeightAt(x, z), null, 'rebinding invalidates stale closure');
  const current = room.engine.combat.hostFleet;
  const combat = room.engine.combat; room.engine.combat = { ...combat };
  assert.equal(current.surfaceHeightAt(x, z), null, 'replacement combat invalidates callback'); room.engine.combat = combat;
  publish({ ...frame, units: frame.units.filter(v => v.id !== u.id) });
  assert.equal(local.surfaceHeightAt(u.position[0], u.position[2]), null, 'hidden is not queried through private host');
  assert.notEqual(room.engine.combat.hostFleet.surfaceHeightAt(u.position[0], u.position[2]), null);
  for (const patch of [{ alive: false, hp: 0 }, { kind: 'sub' }, { modelId: 'unknown' }]) {
    publish({ ...frame, units: [{ ...u, ...patch }] }); assert.equal(local.surfaceHeightAt(u.position[0], u.position[2]), null);
  }
  // Safe frame quaternion and translation, not initial config/native mirrored heading.
  for (const h of [0, Math.PI / 2, .63]) {
    const p = [800, 0, 2900], g = geometries[u.team];
    publish({ ...frame, units: [{ ...u, position: p, view: { ...u.view, orientation: yawQuaternion(h) } }] });
    const point = world(p, h, 3, -35);
    near(local.surfaceHeightAt(point[0], point[2]), fittedHeightAt(g, point[0], point[2], p, h));
  }
  publish({ ...frame, tick: frame.tick + 10, units: frame.units });
  for (const target of local.safeTargets()) assert.deepEqual(Object.keys(target).sort(),
    ['id', 'team', 'kind', 'capital', 'position', 'heading', 'hp', 'maxHp'].sort(), 'no added DTO identities or callbacks');
  publish({ ...frame, tick: 0, round: frame.round + 1, units: [] });
  assert.equal(local.surfaceHeightAt(x, z), null, 'round reset cannot cache prior hull');
  const stale = room.engine.combat.hostFleet;
  bridge.reset(room.engine); assert.equal(stale.surfaceHeightAt(x, z), null);
  assert.notEqual(room.engine.combat.hostFleet.surfaceHeightAt(x, z), null, 'new reset authority query');
  const callback = room.engine.combat.hostFleet.surfaceHeightAt;
  local.dispose(); assert.equal(local.surfaceHeightAt(x, z), null); assert.equal(combat.hostFleet, undefined);
  assert.throws(() => callback(x, z), /disposed/);
  console.log('PASS actual prepareLocalFactions + live bridge/rig roots parity; safe visible-only poses; hidden/dead/sub/unmodelled/reset/disposal; stale binding/combat; query purity (CPU, native pixels/input unverified)');
} finally {
  local?.dispose(); for (const [k, v] of saved) if (v === undefined) delete globalThis[k]; else globalThis[k] = v;
}
const compiled = await build({ ...options, platform: 'browser', entryPoints: [resolve(src, 'main.ts')], plugins: [aliases] });
assert(compiled.outputFiles[0].contents.length > 0);
console.log(`PASS actual main.ts write:false compile (${compiled.outputFiles[0].contents.length} in-memory bytes); no native/GPU acceptance`);
