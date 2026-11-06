// Cheap source cost diagnostic: isolated factory poses/one movement step, NOT a room/match replay.
// node scripts/check_wings_boat_cost.mjs (10-second external cap recommended)
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from '../Games/Wings/authoring/retained-host-loader.mjs';
assert.equal(process.argv.length, 2, 'no probe overrides');
const loader = installRetainedHostLoader(), began = performance.now();
try {
  const load = path => import(new URL(`src/sim/${path}.ts`, retainedRoot));
  const { worldQuery, setFleetState } = await load('geography');
  const { createBoatState } = await load('boat-native');
  const { boatNavigable, stepBoatMovement } = await load('boat-movement');
  const { boatCollisionWorld } = await load('boat-world');
  const { NEUTRAL_INPUT } = await load('flight');
  setFleetState(0, 2); // Initial ordinary geography; no RoomEngine, assigned match clock or result.
  const spawn = { position: [-485, 0, -583], yaw: Math.PI / 2 };
  const initial = createBoatState(spawn, worldQuery);
  // Declared separated water-spawn collider fixtures, not spawned players, HP or accepted gameplay.
  const others = [[-485, 0, -611], [-485, 0, -639], [-765, 0, -667], [-765, 0, -639]].map((position, i) => ({
    id: `fixture-${i}`, kind: 'speedboat', flight: createBoatState({ position, yaw: i < 2 ? Math.PI / 2 : -Math.PI / 2 }, worldQuery),
  }));
  const frozenOthers = structuredClone(others), rows = [];
  function measured(label, body, includeOthers = false) {
    const counts = {}, unique = new Set(); let nativeMs = 0, zeroSegments = 0;
    const base = { ...worldQuery };
    for (const name of ['groundHeight', 'isWater', 'seabedHeight', 'segmentHitsBoatSolid']) {
      const actual = worldQuery[name]; assert.equal(typeof actual, 'function');
      base[name] = function (...args) {
        counts[name] = (counts[name] ?? 0) + 1;
        if (name !== 'segmentHitsBoatSolid') return actual.apply(worldQuery, args);
        const [from, to] = args;
        if (from.every((n, i) => n === to[i])) zeroSegments++;
        unique.add(JSON.stringify(args)); // Count duplicates; NEVER cache/skip a production query.
        const t = performance.now();
        try { return actual.apply(worldQuery, args); }
        finally { nativeMs += performance.now() - t; }
      };
    }
    const world = includeOthers ? boatCollisionWorld(base, others, 'own') : base;
    const start = performance.now(), result = body(world);
    const elapsedMs = performance.now() - start;
    const nativeCalls = counts.segmentHitsBoatSolid ?? 0;
    rows.push({ label, counts, nativeCalls, uniqueExactSegments: unique.size,
      repeatedExactSegments: nativeCalls - unique.size, zeroSegments, nativeMs, elapsedMs });
    return result;
  }
  assert.equal(measured('one-current-pose-navigability', w => boatNavigable(w, ...[spawn.position[0], spawn.position[2], spawn.yaw])), true);
  assert.equal(rows[0].nativeCalls, 467, 'existing full conservative current-pose stencil');
  function step(world, input) { const s = structuredClone(initial); stepBoatMovement(s, input, 1 / 60, world); return s; }
  for (const [label, input] of [['neutral', NEUTRAL_INPUT], ['throttle', { ...NEUTRAL_INPUT, throttle: 1 }]]) {
    const control = step(worldQuery, input);
    const direct = measured(`${label}-one-native-step`, w => step(w, input));
    const adapted = measured(`${label}-one-step-four-separated-colliders`, w => step(w, input), true);
    assert.deepEqual(direct, control); assert.deepEqual(adapted, control, 'diagnostic wrappers/separated colliders preserve actual step output');
    assert.equal(control.tick, 1); assert.equal(control.crashed, null);
    for (const r of rows.slice(-2)) {
      assert.equal(r.nativeCalls, 467 + 4 * 1490, 'current pose plus retained yaw/X/Z/buoyancy sweeps');
      assert(r.repeatedExactSegments > 0, 'hypothesis requires genuinely repeated endpoints');
    }
  }
  assert.deepEqual(others, frozenOthers);
  console.log(JSON.stringify({ status: 'PASS_ISOLATED_QUERY_DIAGNOSTIC_NOT_GAMEPLAY',
    rows, movementStepsMeasured: 4, uninstrumentedControlSteps: 2,
    wallSeconds: (performance.now() - began) / 1000,
    limits: 'Declared initial geography/poses; no RoomEngine/AI/match/prediction/JSON gameplay executed. No cache applied. Counts are direct world-query interface calls, not internal call-tree counts. nativeMs includes timer effects; elapsedMs includes diagnostic key/allocation overhead. No full-match share, speedup, reset or device/FPS proof.' }));
} finally { loader.dispose(); }
