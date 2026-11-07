// Source-only posed-bounds experiment, no cache, room, build or renderer.
// node scripts/check_wings_native_broadphase.mjs (10-second external resource guard)
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { installRetainedHostLoader, retainedRoot } from '../Games/Wings/authoring/retained-host-loader.mjs';
assert.equal(process.argv.length, 2, 'no probe overrides');
const loader = installRetainedHostLoader(), began = performance.now();
const geographyURL = new URL('src/sim/geography.ts', retainedRoot).href;
// Counters and the lifted existing rejection predicate exist ONLY in this process's module text.
const tap = registerHooks({ load(url, context, next) {
  const result = next(url, context); if (url !== geographyURL) return result;
  let source = String(result.source);
  const begin = source.indexOf('export function segmentHitsShip('), end = source.indexOf('export function segmentHitsGround(', begin);
  assert(begin >= 0 && end > begin);
  let body = source.slice(begin, end);
  const loop = /for\s*\(let i = 0; i < NS; i\+\+\)\s*\{/.exec(body)?.index;
  const boxes = /for\s*\(const\s*\{\s*center,\s*half\s*\}/.exec(body)?.index;
  assert(loop > 0 && boxes > loop);
  const active = 'if (!ACTIVE[i]) continue;'; assert.equal(body.split(active).length, 2);
  const coarse = body.slice(loop, boxes).replace(active, `${active}\n__broadphase.guardBounds++;`);
  body = body.replace('{', '{\n__broadphase.nativeCalls++;').replace(active, `${active}\n__broadphase.nativeBounds++;`);
  source = source.slice(0, begin) + body + source.slice(end);
  const slab = /function segmentBox\([^)]*\)\s*\{/g;
  assert.equal([...source.matchAll(slab)].length, 1);
  source = source.replace(slab, '$&\n__broadphase.boxCalls++;');
  return { ...result, source: 'export const __broadphase = { nativeCalls:0, nativeBounds:0, boxCalls:0, guardCalls:0, guardBounds:0 };\n' + source +
    `\nexport function __posedOverlap(a,b) { __broadphase.guardCalls++; ${coarse} return true; } return false; }\n` };
} });
try {
  const load = name => import(new URL(`src/sim/${name}.ts`, retainedRoot));
  const { worldQuery, setFleetState, setShipStates, fleetState, SINK_SOLID_TIME, __broadphase: counters, __posedOverlap } = await load('geography');
  const { FLEET, SHIP_SPECS, shipToWorldAt } = await load('fleet');
  const { createBoatState } = await load('boat-native');
  const { stepBoatMovement } = await load('boat-movement');
  const { boatCollisionWorld } = await load('boat-world');
  const { NEUTRAL_INPUT } = await load('flight');
  const native = worldQuery.segmentHitsBoatSolid;
  const candidate = (a, b) => __posedOverlap(a, b) ? native(a, b) : false;
  const alive = FLEET.map(sh => ({ id: sh.id, sunk: false, sunkAt: 0 }));
  setFleetState(0, 2); setShipStates(alive);
  const initial = createBoatState({ position: [-485, 0, -583], yaw: Math.PI / 2 }, worldQuery);
  const others = [[-485, 0, -611], [-485, 0, -639], [-765, 0, -667], [-765, 0, -639]].map((position, i) => ({
    id: `fixture-${i}`, kind: 'speedboat', flight: createBoatState({ position, yaw: i < 2 ? Math.PI / 2 : -Math.PI / 2 }, worldQuery),
  }));
  const peersBefore = structuredClone(others);
  function movement(query) {
    for (const key of Object.keys(counters)) counters[key] = 0;
    const state = structuredClone(initial), order = [], world = { ...worldQuery };
    for (const name of ['groundHeight', 'isWater', 'seabedHeight']) world[name] = (...args) => {
      const answer = worldQuery[name](...args); order.push([name, ...args, answer]); return answer;
    };
    world.segmentHitsBoatSolid = (a, b) => { const answer = query(a, b); order.push(['solid', ...a, ...b, answer]); return answer; };
    const start = performance.now();
    stepBoatMovement(state, NEUTRAL_INPUT, 1 / 60, boatCollisionWorld(world, others, 'own'));
    return { state, order, counters: { ...counters }, elapsedMs: performance.now() - start };
  }
  const reference = movement(native), tested = movement(candidate);
  assert.deepEqual(tested.state, reference.state); assert.deepEqual(tested.order, reference.order);
  assert.deepEqual(others, peersBefore);
  assert.equal(reference.counters.nativeCalls, 6427); assert.equal(tested.counters.guardCalls, 6427);
  assert.equal(reference.counters.boxCalls, 0, 'existing bounds already prevent every narrow-phase box call');
  assert.equal(tested.counters.boxCalls, 0); assert.equal(tested.counters.nativeCalls, 0);
  assert.equal(reference.counters.nativeBounds, 77124);
  assert.equal(tested.counters.guardBounds, reference.counters.nativeBounds, 'same ship-bound work, merely moved outside native function');

  const rows = [];
  function check(label, a, b, expected) {
    const original = native(a, b), actual = candidate(a, b); assert.equal(actual, original, label);
    if (expected !== undefined) assert.equal(original, expected, label);
    rows.push({ label, answer: original });
  }
  const ship = FLEET.find(sh => sh.id === 't0-carrier'), spec = SHIP_SPECS.carrier; assert(ship);
  const edge = shipToWorldAt(ship, 0, [0, 0, spec.halfLength - 0.01]);
  check('initial degenerate edge contact', edge, edge, true);
  setFleetState(1 / 60, 2); check('same point after one tick pose motion', edge, edge, false);
  setFleetState(0, 2);
  const center = [...ship.position], clock = fleetState();
  setShipStates([{ id: ship.id, sunk: true, sunkAt: 0 }], SINK_SOLID_TIME - 1 / 60);
  check('sunk but still solid before cutoff', center, center, true);
  setShipStates([{ id: ship.id, sunk: true, sunkAt: 0 }], SINK_SOLID_TIME);
  check('no longer solid exactly at cutoff', center, center, false); assert.deepEqual(fleetState(), clock);
  setShipStates(alive); check('reactivated solid read afresh', center, center, true);
  const top = shipToWorldAt(ship, 0, [spec.island.center[0], spec.island.center[1] + spec.island.half[1], spec.island.center[2]]);
  check('inclusive superstructure top contact', top, top, true);
  const bottom = shipToWorldAt(ship, 0, [0, -spec.draft, 0]); check('inclusive hull bottom contact', bottom, bottom, true);
  check('long segment crossing ship with both endpoints outside', shipToWorldAt(ship, 0, [-200, 0, 0]), shipToWorldAt(ship, 0, [200, 0, 0]), true);
  setFleetState(0, 0); check('teams removed', center, center, false); setFleetState(0, 2);
  for (const [label, point] of [['signed zero', [center[0], -0, center[2]]], ['NaN x compatibility', [NaN, 0, center[2]]],
    ['positive infinity x compatibility', [Infinity, 0, center[2]]], ['negative infinity y compatibility', [center[0], -Infinity, center[2]]]]) check(label, point, point);
  console.log(JSON.stringify({ status: 'PASS_NEGATIVE_NO_MEANINGFUL_NARROW_PHASE_SAVING_PRODUCTION_UNCHANGED',
    neutral: { movementCalls: 2, logicalSolidQueries: 6427, reference: { ...reference.counters, elapsedMs: reference.elapsedMs },
      candidate: { ...tested.counters, elapsedMs: tested.elapsedMs }, orderedAnswersEqual: true, stateEqual: true, peersUnchanged: true },
    dynamicAndEdgeChecks: rows, wallSeconds: (performance.now() - began) / 1000,
    limits: 'Candidate lifts the already-existing per-ship posed REACH/TOP rejection; every query rereads live geometry, no cache. Native-call suppression is not eliminated work: both paths perform77124 active ship-bound checks and zero narrow-phase segmentBox calls. Instrumentation, traces, module initialization and warm-up prevent timing-speedup claims. Isolated geometry inputs only, no RoomEngine/match, invalid cache replay, five-pilot reset, renderer/device or gameplay acceptance.' }));
} finally { tap.deregister(); loader.dispose(); }
