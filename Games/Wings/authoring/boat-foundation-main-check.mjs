// CPU fixtures only. Reviewed 8ece movement checks plus pilot-only native/AI checks.
// No runtime registration, browser, renderer, private install or emitted files.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loader = installRetainedHostLoader();
let passed = 0;
try {
  const { BoatHandling: H, boatNavigable, stepBoatMovement: step } = await import(new URL('src/sim/boat-movement.ts', retainedRoot));
  const neutral = { aim: null, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: false };
  const input = values => ({ ...neutral, ...values });
  const state = () => ({ kind: 'speedboat', position: [0, 0, 0], velocity: [0, 0, 0], orientation: [0, 0, 0, 1],
    angularVelocity: [0, 0, 0], throttle: 0, onGround: false, gearDown: false, crashed: null, tick: 0 });
  const sea = { groundHeight: () => 0, seabedHeight: () => -20, isWater: () => true, onRunway: () => false, half: 10000, ceiling: 3000 };
  const yaw = s => { const [x, y, z, w] = s.orientation; return Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y)); };
  const speed = s => Math.hypot(s.velocity[0], s.velocity[2]);
  const run = (s, inp, ticks, world = sea, dt = 1 / 60) => { for (let i = 0; i < ticks; i++) step(s, inp, dt, world); return s; };
  const near = (a, b, tolerance = 1e-9) => assert(Math.abs(a - b) <= tolerance, `${a} != ${b} (tol ${tolerance})`);
  const group = (name, fn) => { fn(); passed++; console.log(`PASS ${name}`); };

  group('actual retained GLB bytes, decoded hull, waterline and composed geometry-backed anchors', () => {
    const bytes = readFileSync(new URL('../models/speedboat.glb', import.meta.url));
    assert.equal(bytes.length, 1411020);
    assert.equal(sha(bytes), '7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee');
    assert.equal(bytes.readUInt32LE(0), 0x46546c67); assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const length = bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20, 20 + length));
    assert.equal(bytes.readUInt32LE(24 + length), 0x004e4942);
    const bin = bytes.subarray(28 + length), anchors = new Map(), points = [], hull = [], waterline = [];
    function visit(index, parent) {
      const node = doc.nodes[index];
      assert(!node.matrix && !node.rotation && !node.scale, 'inspected model uses translation only; do not ignore future TRS');
      const position = parent.map((n, i) => n + (node.translation?.[i] ?? 0));
      anchors.set(node.name, position);
      if (node.mesh !== undefined) for (const primitive of doc.meshes[node.mesh].primitives) {
        const a = doc.accessors[primitive.attributes.POSITION], view = doc.bufferViews[a.bufferView];
        assert.equal(a.componentType, 5126); assert.equal(a.type, 'VEC3'); assert(!a.sparse); assert.equal(view.buffer, 0);
        const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? 12;
        for (let k = 0; k < a.count; k++) {
          const p = position.map((n, i) => n + bin.readFloatLE(start + k * stride + i * 4));
          assert(p.every(Number.isFinite)); points.push(p);
          if (node.name.startsWith('hull_')) hull.push(p);
          if (node.name.startsWith('waterline_')) waterline.push(p);
        }
      }
      node.children?.forEach(child => visit(child, position));
    }
    doc.scenes[doc.scene ?? 0].nodes.forEach(i => visit(i, [0, 0, 0]));
    const bounds = pts => [0, 1, 2].map(i => [Math.min(...pts.map(p => p[i])), Math.max(...pts.map(p => p[i]))]);
    const hb = bounds(hull), all = bounds(points), trim = bounds(waterline);
    near(-hb[0][0], H.halfBeam, 1e-6); near(hb[0][1], H.halfBeam, 1e-6);
    near(-hb[1][0], H.draft, 1e-6); near(hb[1][1], H.hullTop, 1e-6);
    near(-hb[2][0], H.halfLength, 1e-6); near(hb[2][1], H.halfLength, 1e-6);
    near(all[0][1], 1.6091200113296509); near(all[2][1], 5.015999794006348);
    assert(trim[1][0] > 0 && trim[1][1] > 0.29, 'paint trim is sloped, not root waterline');
    assert.equal(H.waterline, 0); assert.equal(H.seaLevel, 0);
    assert.deepEqual(anchors.get('helm_eye'), [...H.helmEye]);
    assert.deepEqual(anchors.get('cannon_pitch'), [...H.gunPivot]);
    anchors.get('gun_muzzle').forEach((n, i) => near(n, H.gunPivot[i] + H.gunTip[i]));
    assert.deepEqual(anchors.get('stern_exit'), [...H.stern]);
    ['L', 'R'].forEach((side, i) => {
      assert.deepEqual(anchors.get(`prop_${side}`), [...H.props[i]]);
      assert.deepEqual(anchors.get(`wake_${side}`), [...H.wakes[i]]);
    });
    const source = readFileSync(new URL('src/sim/boat-movement.ts', retainedRoot), 'utf8');
    assert(!/Math\.random|Date\.|performance\.|setInterval|setTimeout|VEHICLES|from ["']\.\/flight/.test(source));
  });

  group('normal held W/S, coasting, capped reverse and no boost/pitch lift', () => {
    const s = run(state(), input({ throttle: 1 }), 600);
    assert(s.position[2] < -100 && speed(s) > 25 && speed(s) <= H.cruise);
    const before = speed(s); run(s, neutral, 120); assert(speed(s) < before && speed(s) > 0);
    const r = run(state(), input({ throttle: -1 }), 180); near(speed(r), H.reverse); assert(r.position[2] > 5);
    const plain = run(state(), input({ throttle: 1 }), 120);
    const boosted = run(state(), input({ throttle: 1, boost: true, pitch: 1 }), 120);
    assert.deepEqual(plain, boosted); assert(Math.abs(plain.position[1]) < H.bob);
  });
  group('brake beats coasting and releases signed throttle', () => {
    const s = run(state(), input({ throttle: 1 }), 180), coast = structuredClone(s);
    run(s, input({ throttle: 1, brake: true }), 180); run(coast, neutral, 180);
    near(speed(s), 0); near(s.throttle, 0); assert(speed(coast) > 5);
  });
  group('yaw and A/D aliases, reverse steering and mouse heading without thrust', () => {
    const a = run(state(), input({ throttle: 1, yaw: 1 }), 120);
    const b = run(state(), input({ throttle: 1, roll: 1 }), 120); assert.deepEqual(a, b);
    assert(yaw(a) < -0.5 && a.position[0] > 1);
    const r = run(state(), input({ throttle: -1, yaw: 1 }), 90); assert(yaw(r) > 0);
    const mouse = run(state(), input({ throttle: 1, aim: [1, 0, 0] }), 240);
    assert(yaw(mouse) < -1.4 && mouse.position[0] > 10);
    const idle = run(state(), input({ roll: 1, aim: [1, 100, 0] }), 60); near(speed(idle), 0); near(yaw(idle), 0);
  });
  group('speed-dependent turning and retained lateral drift damping', () => {
    const slow = state(), fast = state(); slow.velocity[2] = -1; fast.velocity[2] = -20;
    step(slow, input({ yaw: 1 }), 1 / 60, sea); step(fast, input({ yaw: 1 }), 1 / 60, sea);
    assert(Math.abs(fast.angularVelocity[1]) > 5 * Math.abs(slow.angularVelocity[1]));
    const drift = state(); drift.velocity = [5, 0, -10]; run(drift, neutral, 60);
    near(drift.velocity[0], 5 * Math.exp(-H.lateralDrag), 1e-10); assert(drift.position[0] > 0);
  });
  group('60Hz tick buoyancy, bounded planing/bank, no teleport and exact deterministic replay', () => {
    const s = state(), other = state(); s.position[1] = other.position[1] = 0.5;
    for (let tick = 0; tick < 600; tick++) {
      const prev = s.position[1], inp = input({ throttle: tick > 120 ? 1 : 0, yaw: tick > 300 ? 0.5 : 0 });
      step(s, inp, 1 / 60, sea); step(other, inp, 1 / 60, sea);
      assert(Math.abs(s.position[1] - prev) <= H.verticalLimit / 60 + 1e-12);
      assert(Math.abs(s.position[1]) < 0.501); near(Math.hypot(...s.orientation), 1);
    }
    assert.deepEqual(s, other); near(s.tick, 600); assert(Math.abs(s.position[1]) < H.bob);
    const neutralBoat = run(state(), neutral, 1200); assert(Math.abs(neutralBoat.position[1]) <= H.bob);
    near(speed(neutralBoat), 0); assert.equal(neutralBoat.crashed, null);
    assert(Math.abs(s.orientation[0]) > 0.001 && Math.abs(s.orientation[2]) > 0.001);
  });
  group('dt partition tolerance at 30/60/120Hz, no second clock', () => {
    const a = run(state(), input({ throttle: 1, yaw: 0.3 }), 240);
    const b = run(state(), input({ throttle: 1, yaw: 0.3 }), 120, sea, 1 / 30);
    const c = run(state(), input({ throttle: 1, yaw: 0.3 }), 480, sea, 1 / 120);
    assert.deepEqual(a, b); near(a.tick, c.tick);
    assert(Math.hypot(...a.position.map((n, i) => n - c.position[i])) < 0.25);
    assert(Math.abs(yaw(a) - yaw(c)) < 0.01); assert(Math.abs(a.position[1] - c.position[1]) < 0.001);
  });
  group('finite inputs, dt validation, zero dt, crash immutability and unit quaternion', () => {
    const s = run(state(), input({ throttle: NaN, yaw: NaN, roll: NaN, aim: [NaN, 0, Infinity] }), 10);
    assert([...s.position, ...s.velocity, ...s.orientation].every(Number.isFinite));
    const before = structuredClone(s); step(s, neutral, 0, sea); assert.deepEqual(s, before);
    for (const dt of [-1, NaN, Infinity, 0.251]) assert.throws(() => step(s, neutral, dt, sea), RangeError);
    assert.deepEqual(s, before); s.orientation[3] = 0; assert.throws(() => step(s, neutral, 1 / 60, sea), RangeError);
    s.crashed = 'terrain'; const dead = structuredClone(s); step(s, neutral, 1 / 60, sea); assert.deepEqual(s, dead);
  });
  group('whole corner/perimeter, draft, nonfinite world and point sea-height semantics', () => {
    assert(boatNavigable(sea, 0, 0, 0));
    const corner = { ...sea, isWater: (x, z) => !(x > 1.4 && z > 4.8) };
    assert(!boatNavigable(corner, 0, 0, 0));
    assert(!boatNavigable({ ...sea, seabedHeight: () => -0.69 }, 0, 0, 0));
    assert(boatNavigable({ ...sea, seabedHeight: () => -0.71 }, 0, 0, 0));
    assert(boatNavigable({ ...sea, seabedHeight: undefined }, 0, 0, 0), 'clamped ocean is not zero draft');
    assert(!boatNavigable({ ...sea, seabedHeight: undefined, groundHeight: () => -0.2 }, 0, 0, 0));
    assert(!boatNavigable({ ...sea, groundHeight: () => NaN }, 0, 0, 0));
    assert(!boatNavigable(sea, NaN, 0, 0)); assert(!boatNavigable(sea, 0, 0, Infinity));
  });
  group('high-speed narrow shore crossing, stop and ordinary reverse escape', () => {
    const world = { ...sea, isWater: (x, z) => !(z > -12.15 && z < -11.95) };
    const s = state(); s.velocity[2] = -H.cruise;
    run(s, input({ throttle: 1 }), 90, world); assert(s.position[2] > -7.1); near(s.velocity[2], 0); assert.equal(s.crashed, null);
    const contact = s.position[2]; run(s, input({ throttle: -1 }), 90, world);
    assert(s.position[2] > contact + 2, 'reverse escapes without teleport');
  });
  group('high-speed sideways drift cannot tunnel across shore when whole-call endpoints are clear', () => {
    const world = { ...sea, isWater: x => !(x >= 2.8 && x <= 3.0) };
    assert(boatNavigable(world, 0, 0, 0)); assert(boatNavigable(world, 5, 0, 0));
    const s = state(); s.velocity[0] = H.cruise; step(s, neutral, 0.25, world);
    assert(s.position[0] < 2.8 - H.halfBeam); near(s.velocity[0], 0); assert.equal(s.crashed, null);
  });
  group('diagonal shoreline slide and rotated boundary never wrap or climb', () => {
    const world = { ...sea, isWater: x => x < 10 };
    const s = state(); s.velocity = [12, 0, -12]; run(s, input({ throttle: 1 }), 180, world);
    assert(s.position[0] < 8.5 && s.position[2] < -20 && s.position[1] < 0.02);
    const edge = { ...sea, half: 25 }, b = state(); b.orientation = [0, Math.sin(-Math.PI / 8), 0, Math.cos(-Math.PI / 8)];
    run(b, input({ throttle: 1 }), 600, edge);
    assert(boatNavigable(edge, b.position[0], b.position[2], yaw(b))); assert(b.position[0] < 25 && b.position[2] > -25);
    assert(!boatNavigable(edge, 24, 0, Math.PI / 4));
    const invalid = state(); invalid.position[0] = 24;
    step(invalid, neutral, 1 / 60, edge);
    assert.equal(invalid.crashed, 'boundary', 'hull boundary contact is not terrain even when center is inside');
    assert.deepEqual(invalid.position, [24, 0, 0]);
  });
  group('absent-from queries omit covered points; contacts and every explicit-from sweep remain', () => {
    const calls = [], world = { ...sea, segmentHitsBoatSolid(a, b) { calls.push([a, b]); return false; } };
    const zero = ([a, b]) => a.every((n, i) => n === b[i]);
    assert(boatNavigable(world, 0, 0, 0));
    const stationary = calls.splice(0);
    assert.equal(stationary.filter(zero).length, 0, 'absent from must not query zero-length points');
    assert.equal(stationary.length, 467, '341 vertical + 126 cross-hull queries, formerly 1490');
    step(state(), neutral, 1 / 60, world);
    assert.deepEqual(calls.slice(0, 467), stationary, 'current-pose check uses the same reduced stencil');
    assert.equal(calls.length, 467 + 4 * 1490, 'yaw, X, Z and buoyancy retain full explicit-from queries');
    assert.equal(calls.filter(zero).length, 3 * 1023, 'same-pose yaw/X/Z sweeps must remain');
    const [low, high] = stationary[0];
    for (const y of [low[1], H.seaLevel, high[1]]) {
      const point = [low[0], y, low[2]], contact = { ...sea, segmentHitsBoatSolid: (a, b) =>
        point.every((n, i) => n >= Math.min(a[i], b[i]) && n <= Math.max(a[i], b[i])) };
      assert(!boatNavigable(contact, 0, 0, 0), 'vertical segment retains endpoint/interior point contact');
      const s = state(); step(s, neutral, 1 / 60, contact); assert.equal(s.crashed, 'terrain');
    }
    const wall = { ...sea, segmentHitsBoatSolid: (a, b) =>
      Math.min(a[0], b[0]) <= 0.147 && Math.max(a[0], b[0]) >= 0.147 };
    assert(!boatNavigable(wall, 0, 0, 0), 'cross-hull wall contact remains conservative');
    calls.length = 0;
    const moving = state(); moving.velocity = [3, 0, -8]; moving.position[1] = 0.5;
    step(moving, input({ yaw: 0.4 }), 1 / 60, world);
    assert.equal(calls.length, 467 + 4 * 1490);
    const sweeps = calls.slice(467).filter((_, i) => i % 1490 === 1);
    assert.equal(sweeps.length, 4);
    assert(sweeps[0][0][0] !== sweeps[0][1][0] && sweeps[0][0][2] !== sweeps[0][1][2], 'rotation sweep retained');
    assert(sweeps[1][0][0] !== sweeps[1][1][0], 'X motion sweep retained');
    assert(sweeps[2][0][2] !== sweeps[2][1][2], 'Z motion sweep retained');
    assert(sweeps[3][0][1] !== sweeps[3][1][1], 'buoyancy sweep retained');
  });
  group('physical segment oracle catches sub-stencil wall between endpoints', () => {
    let sweeps = 0;
    const wall = -12.013, world = { ...sea, segmentHitsBoatSolid: (a, b) => {
      if (a[2] !== b[2]) sweeps++;
      return Math.min(a[2], b[2]) <= wall && Math.max(a[2], b[2]) >= wall;
    } };
    const s = state(); s.velocity[2] = -H.cruise; run(s, input({ throttle: 1 }), 90, world);
    assert(s.position[2] > wall + H.halfLength && sweeps > 0); near(s.velocity[2], 0);
  });
  group('continuous physical perimeter catches stationary thin wall between grid columns', () => {
    const wall = 0.147, world = { ...sea, segmentHitsBoatSolid: (a, b) =>
      Math.min(a[0], b[0]) <= wall && Math.max(a[0], b[0]) >= wall };
    assert(!boatNavigable(world, 0, 0, 0));
    const s = state(); step(s, neutral, 1 / 60, world); assert.equal(s.crashed, 'terrain');
    assert.deepEqual(s.position, [0, 0, 0]);
  });
  group('moving hull intrusion crashes at actual unchanged contact, no immunity or escape teleport', () => {
    let intruded = false, calls = 0;
    const world = { ...sea, segmentHitsBoatSolid: (a, b) => { calls++; return intruded && Math.abs(a[0]) < 0.4 && Math.abs(a[2]) < 0.4; } };
    const s = state(); step(s, neutral, 1 / 60, world); const p = [...s.position];
    intruded = true; step(s, input({ throttle: 1, roll: 1 }), 1 / 60, world);
    assert.equal(s.crashed, 'terrain'); assert.deepEqual(s.position, p); near(speed(s), 0); assert(calls > 0);
    // Adapter fixture: a 2m-wide hull traverses X=-10 to +10 between room ticks. Its
    // endpoints miss the boat, but its physical swept volume crosses it. No pose enters module.
    const temporal = { ...sea, swept: false, segmentHitsBoatSolid(a, b) {
      return this.swept && Math.min(a[0], b[0]) <= 11 && Math.max(a[0], b[0]) >= -11
        && Math.min(a[2], b[2]) <= 0.5 && Math.max(a[2], b[2]) >= -0.5
        && Math.min(a[1], b[1]) <= 1 && Math.max(a[1], b[1]) >= -1;
    } };
    const crossed = state(); step(crossed, neutral, 1 / 60, temporal);
    temporal.swept = true; const contact = [...crossed.position];
    step(crossed, input({ throttle: 1 }), 1 / 60, temporal);
    assert.equal(crossed.crashed, 'terrain'); assert.deepEqual(crossed.position, contact);
    const miss = state(); miss.position[2] = 9; step(miss, neutral, 1 / 60, temporal);
    assert.equal(miss.crashed, null, 'real swept-hull near miss is not a crash');
  });

  // Independent numeric reference from inspected legacy coefficients. New bob/attitude are intentionally excluded.
  group('eligible legacy straight/reverse/brake response at 60Hz (independent equations)', () => {
    const s = state(); let along = 0, z = 0;
    for (let i = 0; i < 900; i++) {
      const throttle = i < 300 ? 1 : i < 600 ? -1 : 0, brake = i >= 600;
      along += ((brake ? 0 : throttle) * 6 - along * (0.08 + 0.12 * Math.abs(along) / 28)) / 60;
      along = Math.max(-7, Math.min(28, along));
      if (brake) along = Math.sign(along) * Math.max(0, Math.abs(along) - 10 / 60);
      z -= along / 60; step(s, input({ throttle, brake }), 1 / 60, sea);
      near(s.velocity[2], -along, 1e-10); near(s.position[2], z, 1e-9);
    }
  });

  if (process.argv.length > 2) {
    assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--legacy-flight');
    const source = readFileSync(process.argv[3], 'utf8');
    assert.equal(sha(source), '14d3ce1cee0e1f6457ce66d7b9a219992d66ad7e3068eda482cdf3323cd82d30');
    // Execute exact read-only legacy math and boat branches in memory, not a copied engine or installation.
    const math = source.slice(source.indexOf('const clamp ='), source.indexOf('export function createFlightState'));
    const boat = source.slice(source.indexOf('export function boatNavigable'), source.indexOf('/** Thin-air factor:'));
    assert(math.includes('function basis') && boat.includes('function stepBoat'));
    const prefix = `const WATER_LEVEL=0; const VEHICLES={speedboat:{cruise:28,water:{halfLength:5,halfBeam:1.6,draft:.7,waterline:0}}};`;
    const code = stripTypeScriptTypes(prefix + math + boat + '\nexport {stepBoat};', { mode: 'transform' });
    const legacy = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    group('exact hash-pinned private legacy branch executed: 1200 mixed propulsion/brake/yaw ticks', () => {
      const s = state(), old = state();
      for (let i = 0; i < 1200; i++) {
        const inp = input({ throttle: i < 450 ? 1 : i < 800 ? -1 : 0, yaw: i > 100 && i < 700 ? 0.35 : 0, brake: i > 1000 });
        step(s, inp, 1 / 60, sea); legacy.stepBoat(old, inp, 1 / 60, sea);
        for (const index of [0, 2]) { near(s.position[index], old.position[index], 1e-8); near(s.velocity[index], old.velocity[index], 1e-8); }
        near(yaw(s), yaw(old), 1e-9); near(s.angularVelocity[1], old.angularVelocity[1], 1e-9);
      }
    });
  }
  const native = await import(new URL('src/sim/boat-native.ts', retainedRoot));
  const { boatAIInput } = await import(new URL('src/sim/boat-ai.ts', retainedRoot));
  group('pilot-only native spec, stationary validated water spawn and sole gun controller', () => {
    const spec = native.BOAT_NATIVE_SPEC;
    assert.equal(spec.maxHp, 650); assert.equal(spec.radius, 5); assert.equal(spec.cruise, 28);
    assert.equal(spec.boost, 28); assert.equal(spec.flares, 0);
    assert.deepEqual(spec.seatWeapons, [['cannon20', null], [null, null]]);
    assert.deepEqual(spec.seatNames, ['Helm', 'Unused']);
    for (const [seats, expected] of [ [[null, null], null], [['pilot', null], 0], [[null, 'blocked'], null], [['pilot', 'blocked'], 0] ]) {
      assert.equal(native.boatGunController(seats), expected);
    }
    const spawn = { position: [0, 0, 0], yaw: 0 }, before = structuredClone(spawn);
    const s = native.createBoatState(spawn, sea);
    assert.deepEqual(s, state()); assert.deepEqual(spawn, before);
    for (const bad of [{ position: [0, 1, 0], yaw: 0 }, { position: [NaN, 0, 0], yaw: 0 }, { position: [0, 0, 0], yaw: Infinity }]) {
      assert.throws(() => native.createBoatState(bad, sea), RangeError);
    }
    assert.throws(() => native.createBoatState(spawn, { ...sea, isWater: () => false }), RangeError);
  });
  group('full body-quaternion gun/anchor math, validation and signed wet prop channels', () => {
    const s = state(), gun = native.boatGunPose(s, null);
    assert.deepEqual(gun.direction, [0, 0, -1]);
    gun.origin.forEach((v, i) => near(v, H.gunPivot[i] + H.gunTip[i]));
    const pose = { position: [3, 4, 5], orientation: [Math.sin(0.2), 0, 0, Math.cos(0.2)] };
    const local = [1, 2, -3], point = native.boatWorldPoint(pose, local);
    near(point[0], 4); near(point[1], 4 + 2 * Math.cos(0.4) + 3 * Math.sin(0.4));
    near(point[2], 5 + 2 * Math.sin(0.4) - 3 * Math.cos(0.4));
    const pitched = native.boatGunPose(pose, null);
    near(pitched.direction[1], Math.sin(0.4)); near(pitched.direction[2], -Math.cos(0.4));
    const limited = native.boatGunPose(s, [1, 100, 0]);
    assert(limited.pitch <= native.BOAT_GUN_LIMITS.maxPitch && Math.abs(limited.yaw) <= native.BOAT_GUN_LIMITS.yaw);
    assert.throws(() => native.boatGunPose(s, [NaN, 0, 0]), RangeError);
    assert.throws(() => native.boatWorldPoint({ ...s, orientation: [0, 0, 0, 2] }, local), RangeError);
    s.velocity[2] = -14; s.throttle = 1;
    const forward = native.boatMotionChannels(s, sea); assert(forward.wet && forward.wake > 0);
    near(forward.drive, 0.5); near(forward.propLeft, -forward.propRight); assert(forward.propLeft > 0);
    s.velocity[2] = 7; const reverse = native.boatMotionChannels(s, sea);
    assert(reverse.drive < 0 && reverse.propLeft < 0 && reverse.propRight > 0);
    const dry = native.boatMotionChannels(s, { ...sea, isWater: () => false });
    assert(!dry.wet); near(dry.drive, 0); near(dry.wake, 0); near(dry.wash, 0);
    s.crashed = 'terrain'; const dead = native.boatMotionChannels(s, sea);
    near(dead.load, 0); near(dead.drive, 0); near(dead.wake, 0);
  });
  group('AI deterministic input-only contacts, friendly/hidden rejection and actual LOS gate', () => {
    const s = state(), contacts = [
      { id: 'enemy', team: 1, alive: true, visible: true, position: [0, 0, -400], velocity: [0, 0, 0] },
      { id: 'friendly', team: 0, alive: true, visible: true, position: [0, 0, -20], velocity: [0, 0, 0] },
      { id: 'hidden', team: 1, alive: true, visible: false, position: [0, 0, -10], velocity: [0, 0, 0] },
    ];
    const before = structuredClone({ s, contacts }), calls = [];
    const world = { ...sea, lineOfSight(from, to, id) { calls.push({ from, to, id }); return true; } };
    const out = boatAIInput(s, 0, contacts, world);
    assert.equal(out.targetId, 'enemy'); assert(out.seat.firePrimary); assert(out.flight.throttle > 0);
    assert(!out.flight.boost && !out.seat.fireSecondary && !out.seat.flares && !out.seat.ability);
    assert.equal(calls.length, 1); assert.equal(calls[0].id, 'enemy');
    assert.deepEqual(boatAIInput(s, 0, contacts, world), out);
    const blocked = boatAIInput(s, 0, contacts, { ...world, lineOfSight: () => false });
    assert(!blocked.seat.firePrimary); assert.equal(blocked.targetId, 'enemy');
    const idle = boatAIInput(s, 0, contacts.slice(1), world);
    assert.equal(idle.targetId, null); assert(idle.flight.brake && !idle.seat.firePrimary);
    assert.deepEqual({ s, contacts }, before);
    assert.throws(() => boatAIInput(s, 0, [], world, [NaN, 0, 0]), RangeError);
    const crashed = { ...s, crashed: 'terrain' };
    assert(boatAIInput(crashed, 0, contacts, world).flight.brake);
  });
  console.log(`PASS ${passed} boat foundation groups (17 reviewed movement + 3 pilot-only native/AI); CPU only, no native acceptance.`);
} catch (error) {
  console.error(`FAIL boat foundation after ${passed} groups: ${error.message}`); process.exitCode = 1;
} finally { loader.dispose(); }
