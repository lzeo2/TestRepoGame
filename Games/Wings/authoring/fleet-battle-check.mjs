// Actual original-module AI battle fixtures. Not served Wings, natural flight or native pixels.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { createFactionsComposition } from './fleet-composition.mjs';
import { createFleet, replayFleet } from './fleet-sim.mjs';
import { compileGeometry, clearanceBounds, mountPose } from './fleet-geometry.mjs';
import { createWeather } from './weather/weather.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { MAP_IDS } from './map-pack/maps.mjs';
assert(process.env.THREE_ROOT, 'Set existing approved THREE_ROOT; install nothing');
const T = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.module.js')).href);
assert.equal(T.REVISION, '186');
const read = name => readFile(new URL(name, import.meta.url));
const plain = x => JSON.parse(JSON.stringify(x));
const hash = x => createHash('sha256').update(x).digest('hex');
const source = (await read('fleet-integration-preview.mjs')).toString();
const roster = source.match(/const AIRCRAFT_FIXTURE = (.*?);/);
const builders = source.match(/(const gun = \(\).*?)(?=async function rebuild\()/s);
const call = source.match(/app = createFactionsComposition\(\{([\s\S]*?)host:/);
assert(roster && builders && call, 'Actual preview declarations/options required');
const aircraft = plain(vm.runInNewContext('('+roster[1]+')'));
const profiles = plain(vm.runInNewContext(builders[1]+'\nprofiles()', { $: () => ({ value: 'surface' }) }));
if (profiles.length !== 2 || profiles.some(p => !p.capital || p.speed !== 15 || p.turnRateRadS !== .045 || p.route.length !== 1)) {
  console.error('PENDING: actual preview is not yet the agreed two measured flagships/explicit objective-route source. No substituted fixture run.');
  process.exit(2);
}
assert.deepEqual(profiles.map(p => p.id).sort(), ['capital0', 'capital1']);
assert.deepEqual(profiles.map(p => p.modelId).sort(), ['type054', 'type45']);
for (const p of profiles) {
  assert.equal(p.hp, 1000); assert.deepEqual(p.route, [[0, 0, 0]]); assert.equal(p.weapons.length, 1);
  assert.deepEqual(p.weapons[0], { id: 'gun', medium: 'surface', range: 1200, speed: 500, ttlMs: 4000,
    cooldownMs: 500, damage: 20, depths: ['surfaced'], ammo: 200, acquisition: 'nonvisual', mount: 'main_gun' });
}
assert(aircraft.length === 2 && aircraft.every(a => a.length === 1 && a[0].weapons.length === 0));
const seed = Number(call[1].match(/seed:\s*(\d+)/)?.[1]);
const matchMs = Number(call[1].match(/matchMs:\s*(\d+)/)?.[1]);
const intermissionMs = Number(call[1].match(/intermissionMs:\s*(\d+)/)?.[1]);
const weatherText = call[1].match(/weather:\s*(\{[^}]+\})/)?.[1];
assert(Number.isInteger(seed) && matchMs === 180000 && intermissionMs > 0 && weatherText, 'Actual 180s preview options required');
const weatherOptions = plain(vm.runInNewContext('('+weatherText+')', { $: () => ({ value: 'clear' }) }));
const descriptors = [...JSON.parse(await read('model-repairs.json')).models, JSON.parse(await read('submarine-model.json'))];
const models = [], originals = new Map();
for (const [i, descriptor] of descriptors.entries()) {
  const bytes = await read('../'+descriptor.file); assert.equal(hash(bytes), descriptor.sha256); originals.set(descriptor.file, hash(bytes));
  models.push({ id: ['type45', 'type054', 'originalSub'][i], descriptor, object: modelGeometryFixture(T, bytes).object });
}
const geometry = models.map(({ id, descriptor }) => ({ id, descriptor }));
const compiled = new Map(models.map(m => [m.id, compileGeometry(m.descriptor)]));
const close = (a, b, epsilon = 1e-5) => { assert.equal(a.length, b.length); a.forEach((n, i) => assert(Math.abs(n-b[i]) < epsilon)); };
let groups = 0, firstReplay = null;
const started = performance.now();
try {
  for (const mapId of MAP_IDS) {
    const identity = {}, actor = {}, opponent = {}, scenes = [new T.Scene(), new T.Scene()]; let app, sequence = 0;
    const make = () => createFactionsComposition({ mode: 'factions', mapId, seed, profiles: plain(profiles), models,
      aircraft: plain(aircraft), matchMs, intermissionMs, weather: plain(weatherOptions), THREE: T,
      host: { identity, authenticate: c => c === actor ? { id: 'previewObserver', team: 0 } : c === opponent ? { id: 'opponentObserver', team: 1 } : null,
        deriveAircraftAttack() { throw Error('No flight host or aircraft attacks in AI battle'); } },
      createPresentation: principal => ({ parent: scenes[principal.team], applyEnvironment(frame) { assert.equal(frame.simulationMs % 50, 0); },
        presentation: { quality: 'low', reducedMotion: true, lightning: 'off' } }) });
    app = make();
    try {
      let lease = app.start(identity); app.join(actor); app.join(opponent);
      const map = app.world(identity), placed = map.placeFleet('factions', plain(profiles), geometry);
      for (const u of placed) assert.deepEqual(u.route, [[0, 0, 0]], 'Actual map must retain the actual preview objective course');
      const initial = app.snapshot(actor), [a, b] = initial.units;
      assert.equal(initial.units.length, 2); assert.equal(initial.aircraft.length, 0);
      const radii = initial.units.map(u => { const bounds = clearanceBounds(compiled.get(u.modelId), 0); return Math.hypot(...[0, 2].map(i => Math.max(Math.abs(bounds.min[i]), Math.abs(bounds.max[i])))); });
      const gap = Math.hypot(...a.position.map((n, i) => n-b.position[i]));
      const minimumGap = 1200+radii[0]+radii[1]+30*10;
      assert(gap > minimumGap, `Initial hull/origin/10s approach gap ${gap} must exceed ${minimumGap}`);
      for (const u of placed) assert(map.navigable(u.position, u.route[0], [Math.max(...radii), 0, Math.max(...radii)]));
      let state = initial;
      const events = new Map(), fire = new Map(), damage = new Map(), sinks = new Map();
      let muzzleChecks = 0, projectileChecks = 0, approached = false;
      for (let tick = 1; tick <= 3600; tick++) {
        app.update(lease, { sequence: ++sequence, elapsedMs: 50 }); state = app.snapshot(actor);
        assert.equal(state.tick, tick); assert.equal(state.aircraft.length, 0); assert.equal(app.stats().viewFailures, 0);
        const frames = [state, app.snapshot(opponent)];
        const fresh = new Map();
        for (const frame of frames) for (const e of frame.events) if (!fresh.has(e.id) || e.source != null) fresh.set(e.id, e);
        for (const e of fresh.values()) if (!events.has(e.id)) {
          events.set(e.id, e);
          if (e.type === 'fire') {
            assert(['capital0', 'capital1'].includes(e.source)); const list = fire.get(e.source) ?? [];
            if (list.length) assert((e.tick-list.at(-1).tick)*50 >= 500, 'Actual cooldown spacing');
            list.push(e); fire.set(e.source, list); assert(list.length <= 200, 'Actual fire-event ammo ledger cannot exceed source magazine');
            const scene = scenes[e.team], u = frames[e.team].units.find(u => u.id === e.source), heading = 2*Math.atan2(u.view.orientation[1], u.view.orientation[3]);
            const pose = mountPose(compiled.get(u.modelId), u.position, heading, 'main_gun', u.view.angles);
            close(pose.position, e.position);
            const body = scene.getObjectByName('fleet-unit:'+u.id); scene.updateWorldMatrix(true, true);
            close(body.getObjectByName('main_gun_muzzle').getWorldPosition(new T.Vector3()).toArray(), pose.position); muzzleChecks++;
            assert(scene.getObjectByName('fleet-fire:'+e.id), 'Real rig must consume actual fire event');
          }
          if (e.type === 'damage') { assert.equal(e.source, e.unit === 'capital0' ? 'capital1' : 'capital0'); damage.set(e.source, (damage.get(e.source) ?? 0)+e.damage); }
          if (e.type === 'sunk') sinks.set(e.unit, e);
        }
        for (const [team, frame] of frames.entries()) for (const p of frame.projectiles) { const mesh = scenes[team].getObjectByName('fleet-projectile:'+p.id); assert(mesh); close(mesh.position.toArray(), p.position); projectileChecks++; }
        if (tick <= 200) assert(![...events.values()].some(e => e.type === 'fire'), 'No fire in first ten actual simulation seconds');
        if (tick === 200) {
          approached = state.units.every(u => Math.hypot(...u.position.map((n, i) => n-initial.units.find(v => v.id === u.id).position[i])) > 100);
          assert(approached, 'Both actual measured hulls must navigate during approach');
        }
        if (state.outcome) break;
      }
      assert(fire.has('capital0') && fire.has('capital1'), 'Both AI flagships must fire autonomously');
      assert(damage.has('capital0') && damage.has('capital1'), 'Reciprocal attributed damage required');
      assert(sinks.size >= 1 && [0, 1].includes(state.outcome?.winner) && state.outcome.reason === 'capitals', 'Actual capital destruction/victory, not timeout');
      assert(state.tick*50 <= 180000 && muzzleChecks >= 2 && projectileChecks > 0);
      for (const [id, event] of sinks) assert((fire.get(id) ?? []).every(e => e.tick <= event.tick), 'Destroyed target/source must stop new attacks');
      const result = { mapId, gap, firstFire: Object.fromEntries([...fire].map(([id, list]) => [id, list[0].tick])),
        shots: Object.fromEntries([...fire].map(([id, list]) => [id, list.length])),
        remainingAmmoFromEvents: Object.fromEntries([...fire].map(([id, list]) => [id, 200-list.length])),
        damage: Object.fromEntries(damage), sunk: Object.fromEntries([...sinks].map(([id, e]) => [id, e.tick])), outcome: state.outcome, tick: state.tick, muzzleChecks, projectileChecks };
      // Current public unit DTO does not expose private weapon ammo: this is an honest actual-fire ledger, not a claimed private read.
      const endTick = state.tick;
      for (let n = 0; n < 10; n++) app.update(lease, { sequence: ++sequence, elapsedMs: 50 });
      for (const who of [actor, opponent]) assert(app.snapshot(who).events.every(e => e.type !== 'fire' || e.tick <= endTick), 'No new target/fire after capital destruction');
      app.setPaused(identity, true); const paused = app.snapshot(actor); app.update(lease, { sequence: ++sequence, elapsedMs: 250 }); assert.deepEqual(app.snapshot(actor), paused);
      if (!firstReplay) firstReplay = { config: { mode: 'factions', arena: map.arena(), units: placed, geometry, aircraft: plain(aircraft), matchMs, intermissionMs,
        weather: { config: createWeather({ ...weatherOptions, allowedPresets: map.allowedWeatherPresets() }).config } }, durationMs: state.tick*50 };
      lease = app.restart(identity); sequence = 0; const reset = app.snapshot(actor);
      assert.equal(reset.tick, 0); assert.equal(reset.outcome, null); assert.equal(reset.events.length, 0); assert.equal(reset.projectiles.length, 0); assert.equal(reset.aircraft.length, 0);
      assert(reset.units.every(u => u.hp === 1000 && u.alive));
      console.log('PASS actual AI battle '+JSON.stringify(result)); groups++;
    } finally { app.dispose(identity); assert(scenes.every(scene => scene.children.length === 0)); }
  }
  const a = createFleet(firstReplay.config), b = createFleet(firstReplay.config);
  let remaining = firstReplay.durationMs;
  while (remaining) { const n = Math.min(50, remaining); a.advance(n); remaining -= n; }
  remaining = firstReplay.durationMs; let index = 0;
  while (remaining) { const n = Math.min([17, 33, 100, 250][index++ % 4], remaining); b.advance(n); remaining -= n; }
  assert.deepEqual(a.snapshot(0), b.snapshot(0)); assert.deepEqual(a.snapshot(1), b.snapshot(1));
  assert.deepEqual(replayFleet(a.exportReplay()).snapshot(0), a.snapshot(0));
  console.log('PASS actual placed-input authority partition/replay determinism'); groups++;
  for (const [file, expected] of originals) assert.equal(hash(await read('../'+file)), expected);
  console.log(`PASS ${groups} AI-battle CPU groups; duration ${(performance.now()-started).toFixed(0)}ms; REAL original authority/rig/model fixtures, NOT served/natural gameplay.`);
} finally {
  const resources = new Set();
  for (const model of models) model.object.traverse(node => { if (node.isMesh) { resources.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) resources.add(m); } });
  for (const r of resources) r.dispose();
}
