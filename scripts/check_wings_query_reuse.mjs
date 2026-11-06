// Rejected in-memory candidate only. No production cache, room/match, build or renderer.
// Run node scripts/check_wings_query_reuse.mjs under a 10-second external resource guard.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from '../Games/Wings/authoring/retained-host-loader.mjs';
assert.equal(process.argv.length, 2, 'no probe overrides');
const loader = installRetainedHostLoader(), began = performance.now();
try {
  const load = name => import(new URL(`src/sim/${name}.ts`, retainedRoot));
  const { worldQuery, setFleetState, setShipStates, fleetState, SINK_SOLID_TIME } = await load('geography');
  const { FLEET, SHIP_SPECS, shipToWorldAt } = await load('fleet');
  const { createBoatState } = await load('boat-native');
  const { stepBoatMovement } = await load('boat-movement');
  const { boatCollisionWorld } = await load('boat-world');
  const { NEUTRAL_INPUT } = await load('flight');
  const alive = FLEET.map(sh => ({ id: sh.id, sunk: false, sunkAt: 0 }));
  setFleetState(0, 2); setShipStates(alive);
  const initial = createBoatState({ position: [-485, 0, -583], yaw: Math.PI / 2 }, worldQuery);
  const others = [[-485, 0, -611], [-485, 0, -639], [-765, 0, -667], [-765, 0, -639]].map((position, i) => ({
    id: `fixture-${i}`, kind: 'speedboat', flight: createBoatState({ position, yaw: i < 2 ? Math.PI / 2 : -Math.PI / 2 }, worldQuery),
  }));
  const beforeOthers = structuredClone(others);
  // A new map per single movement invocation, never per adapter/world/room lifetime.
  function experiment(start, reuse, peers, onWater = () => {}) {
    const state = structuredClone(start), cache = new Map(), queries = [], order = [];
    let nativeCalls = 0, hits = 0, waterCalls = 0;
    const world = { ...worldQuery };
    for (const name of ['groundHeight', 'isWater', 'seabedHeight']) world[name] = (...args) => {
      const answer = worldQuery[name](...args); order.push([name, ...args, answer]);
      if (name === 'isWater') onWater(++waterCalls);
      return answer;
    };
    world.segmentHitsBoatSolid = (from, to) => {
      assert([...from, ...to].every(Number.isFinite));
      // Ordered six finite coordinates, retaining signed zero; no approximate/reversed keys.
      const key = [...from, ...to].map(n => Object.is(n, -0) ? '-0' : n).join(',');
      let answer;
      if (reuse && cache.has(key)) { answer = cache.get(key); hits++; }
      else { answer = worldQuery.segmentHitsBoatSolid(from, to); nativeCalls++; if (reuse) cache.set(key, answer); }
      queries.push({ from: [...from], to: [...to], answer }); order.push(['solid', ...from, ...to, answer]);
      return answer;
    };
    stepBoatMovement(state, NEUTRAL_INPUT, 1 / 60, boatCollisionWorld(world, peers, 'own'));
    return { state, queries, order, nativeCalls, hits, waterCalls };
  }
  const reference = experiment(initial, false, others), candidate = experiment(initial, true, others);
  assert.deepEqual(candidate.state, reference.state);
  assert.deepEqual(candidate.order, reference.order, 'all logical oracle answers/order retained in fixed geometry');
  assert.deepEqual(others, beforeOthers);
  assert.equal(reference.nativeCalls, 6427); assert.equal(candidate.nativeCalls, 2980); assert.equal(candidate.hits, 3447);

  // Actual native mutations: retaining endpoint-only entries across these boundaries is stale.
  const ship = FLEET.find(sh => sh.id === 't0-carrier'); assert(ship);
  const edge = shipToWorldAt(ship, 0, [0, 0, SHIP_SPECS.carrier.halfLength - 0.01]);
  const beforeMotion = worldQuery.segmentHitsBoatSolid(edge, edge); assert.equal(beforeMotion, true);
  setFleetState(1 / 60, 2);
  const afterMotion = worldQuery.segmentHitsBoatSolid(edge, edge); assert.equal(afterMotion, false);
  setFleetState(0, 2);
  const center = [...ship.position], clockBeforeSink = fleetState();
  setShipStates([{ id: ship.id, sunk: true, sunkAt: 0 }], SINK_SOLID_TIME - 1 / 60);
  assert.equal(worldQuery.segmentHitsBoatSolid(center, center), true);
  setShipStates([{ id: ship.id, sunk: true, sunkAt: 0 }], SINK_SOLID_TIME);
  assert.equal(worldQuery.segmentHitsBoatSolid(center, center), false);
  assert.deepEqual(fleetState(), clockBeforeSink, 'solid cutoff changes answers without changing fleetState tuple');

  // Countermodel for the public callback contract, NOT observed ordinary RoomEngine ordering.
  // A geometry synchronization hook can run between logical queries even inside one movement call.
  // Reactivation models a native reset-state update, not a gameplay kill/respawn or HP grant.
  function prepareDynamic() {
    setFleetState(0, 2); setShipStates(alive);
    setShipStates([{ id: ship.id, sunk: true, sunkAt: 0 }], SINK_SOLID_TIME);
    return createBoatState({ position: [...ship.position], yaw: 0 }, worldQuery);
  }
  const dynamicInitial = prepareDynamic(), fleetBefore = fleetState();
  const activate = n => { if (n === 342) setShipStates([{ id: ship.id, sunk: false, sunkAt: 0 }], SINK_SOLID_TIME); };
  const dynamicReference = experiment(dynamicInitial, false, [], activate);
  assert.deepEqual(prepareDynamic(), dynamicInitial);
  const dynamicCandidate = experiment(dynamicInitial, true, [], activate);
  const i = dynamicReference.queries.findIndex((q, i) => q.answer !== dynamicCandidate.queries[i]?.answer);
  assert(i >= 0, 'must actually demonstrate a stale answer, not merely speculate');
  const expected = dynamicReference.queries[i], stale = dynamicCandidate.queries[i];
  assert.deepEqual(stale.from, expected.from); assert.deepEqual(stale.to, expected.to);
  assert.equal(expected.answer, true); assert.equal(stale.answer, false);
  assert.equal(worldQuery.segmentHitsBoatSolid(stale.from, stale.to), true, 'fresh native query confirms collision');
  assert.deepEqual(fleetState(), fleetBefore, 'fleet clock/team tuple alone cannot invalidate ship solidity');
  assert.throws(() => assert.deepEqual(dynamicCandidate.order, dynamicReference.order), assert.AssertionError,
    'the candidate fails its required logical-query equivalence assertion');
  setFleetState(0, 2); setShipStates(alive);
  console.log(JSON.stringify({ status: 'PASS_COUNTEREXAMPLE_REJECT_UNVERSIONED_REUSE_PRODUCTION_UNCHANGED',
    ordinaryNeutral: { movementCalls: 2, dt: 1 / 60, logicalQueries: reference.queries.length,
      referenceNativeCalls: reference.nativeCalls, candidateNativeCalls: candidate.nativeCalls, reused: candidate.hits,
      orderedAnswersEqual: true, outputEqual: true, separatedCollidersUnchanged: true },
    nativeInvalidationBoundaries: { motion: { geometrySeconds: [0, 1 / 60], point: edge, before: beforeMotion, after: afterMotion },
      solidCutoff: { geometryAgeSeconds: [SINK_SOLID_TIME - 1 / 60, SINK_SOLID_TIME], point: center, before: true, after: false, unchangedFleetState: clockBeforeSink } },
    counterexample: { kind: 'declared reentrant WorldQuery geometry-hook fixture, not ordinary room execution',
      movementCalls: 2, change: 'setShipStates reactivates native carrier after water query342, between hull checks',
      fleetBefore, fleetAfter: fleetBefore, logicalQueryOneBased: i + 1, from: stale.from, to: stale.to,
      cachedAnswer: stale.answer, referenceAnswer: expected.answer, freshNativeAnswer: true,
      logicalOrderEquivalent: false, finalStateEqual: JSON.stringify(dynamicCandidate.state) === JSON.stringify(dynamicReference.state) },
    wallSeconds: (performance.now() - began) / 1000,
    limits: 'Ordinary fixed-geometry single-step equality is not a public WorldQuery purity/invalidation guarantee. The counterexample exercises a callback representable by the current interface with explicit native geometry updates; no claim that stock ordinary RoomEngine changes geometry mid-movement. No production cache, timing benefit/full-match share, score/reset/kill, event-stream, save, device or five-pilot acceptance established.' }));
} finally { loader.dispose(); }
