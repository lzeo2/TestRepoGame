// Cheap six-tick same-menu control only. NEVER runs the120s acceptance fixture.
// node scripts/check_wings_phase_attribution.mjs under a10s external resource guard.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { installRetainedHostLoader, retainedRoot } from '../Games/Wings/authoring/retained-host-loader.mjs';
import { installWingsPhaseProfiler, phaseOf } from './wings_phase_profiler.mjs';
assert.equal(process.argv.length, 2, 'no probe overrides');
const loader = installRetainedHostLoader(); let profiler;
const originalStringify = JSON.stringify;
try {
  const load = path => import(new URL(`src/${path}.ts`, retainedRoot));
  const nativeLoopback = await load('sim/loopback');
  const { RoomEngine } = await load('sim/room-engine');
  const { DEFAULT_ROOM_CONFIG } = await load('sim/protocol');
  const { Input } = await load('input');
  const descriptors = Object.fromEntries(['advance', 'broadcastSnapshot', 'flushEvents'].map(k => [k, Object.getOwnPropertyDescriptor(RoomEngine.prototype, k)]));
  const lobby = readFileSync(new URL('src/ui/lobby.ts', retainedRoot), 'utf8'), marker = '{ label: "Boat Combat", run:';
  assert.equal(lobby.split(marker).length, 2);
  const from = lobby.indexOf(marker), to = lobby.indexOf('\n    ],', from); assert(to > from);
  let request;
  new Function('DEFAULT_ROOM_CONFIG', 'opts', `return (${lobby.slice(from, to).trim().replace(/,$/, '')});`)(DEFAULT_ROOM_CONFIG,
    { onStart(value) { request = value; } }).run();
  assert.deepEqual([request.mode, request.aircraft, request.config.vehicleMode, request.config.teams, request.config.bots,
    request.config.botSkill, request.config.maxPerTeam, request.config.scoreLimit, request.config.timeLimit, request.config.listed],
  ['offline', 'speedboat', 'boats', 2, 2, 0.5, 3, 5, 180, false]);
  async function control(createRoom, measured) {
    const messages = [], raw = [], statuses = [];
    const room = createRoom(request.config, 'CPU human pilot', { onMessage(m) { messages.push(structuredClone(m)); },
      onStatus(s) { statuses.push(s); } }, { manual: true });
    try {
      assert.equal(room.engine.humanCount(), 1); assert.equal(room.engine.botCount(), 4);
      room.send({ type: 'spawn', kind: request.aircraft }); await Promise.resolve();
      const sendText = room.engine.hooks.sendText;
      room.engine.hooks.sendText = function (...args) { raw.push(args[1]); return Reflect.apply(sendText, this, args); };
      const controls = Object.create(Input.prototype);
      controls.keys = new Set(); controls.latched = new Set(); controls.mouseL = false;
      if (measured) profiler.start();
      const start = performance.now();
      // One public chat exercises event serialization; no event injection or damage/score grant.
      room.send({ type: 'chat', text: 'phase control' });
      for (let tick = 1; tick <= 6; tick++) {
        room.send({ type: 'input', seq: tick, flight: controls.boatFlightInput({}), seat: controls.boatSeatInput(null, {}) });
        room.step(1 / 60); await Promise.resolve();
      }
      const wallMs = performance.now() - start; if (measured) profiler.stop();
      assert.equal(room.engine.tick, 6); assert.equal(room.engine.matchEndedAt, null);
      const state = structuredClone({ snapshot: room.engine.snapshotFor(room.playerId),
        players: [...room.engine.players.values()].map(p => ({ info: p.info, flight: p.flight, seat: p.seat, queue: p.queue, seq: p.seq, ack: p.ack })),
        vehicles: room.engine.vehicles });
      return { raw, messages, statuses, state, wallMs, livePilots: room.engine.vehicles.filter(v => v.alive && v.seats[0]).length };
    } finally { if (measured) profiler.stop(); room.close(); await Promise.resolve(); }
  }
  const reference = await control(nativeLoopback.createLoopbackRoom, false);
  profiler = installWingsPhaseProfiler(RoomEngine);
  const tracedLoopback = await load('sim/loopback');
  assert.notEqual(tracedLoopback.createLoopbackRoom, nativeLoopback.createLoopbackRoom, 'canonical URL redirected to process-local traced loopback');
  const tested = await control(tracedLoopback.createLoopbackRoom, true), timing = profiler.snapshot();
  assert.deepEqual(tested.raw, reference.raw, 'exact outgoing wire text/order');
  assert.deepEqual(tested.messages, reference.messages, 'decoded delivery data/order');
  assert.deepEqual(tested.statuses, reference.statuses); assert.deepEqual(tested.state, reference.state, 'snapshot, queues/acks, controls and vehicle state');
  const c = timing.groups.combat;
  assert.equal(c.advanceCalls, 6); assert(c.snapshotCalls > 0 && c.eventCalls > 0 && c.stringifyCalls > 0 && c.deliveryCalls > 0);
  assert(c.advanceMs >= c.wireInAdvanceMs && c.wireInAdvanceMs >= c.jsonInAdvanceMs);
  assert(c.windowMs >= c.advanceMs + c.deliveryMs, 'window includes inter-tick caller/scheduler gaps, not just active spans');
  assert(c.advanceExclusiveMs >= 0 && c.wireOtherInAdvanceMs >= 0);
  assert.equal(timing.groups.postscore.advanceCalls, 0); assert.equal(timing.groups.postscore.windowMs, null);
  assert.equal(timing.mixedDeliveryCalls, 0);
  // Classification unit inputs only, not a live room outcome or clock mutation.
  assert.equal(phaseOf({ matchEndedAt: null }), 'combat'); assert.equal(phaseOf({ matchEndedAt: 0 }), 'postscore');
  assert.throws(() => JSON.stringify(1n), TypeError, 'native error propagation');
  profiler.dispose(); profiler = null;
  assert.equal(JSON.stringify, originalStringify);
  for (const [name, d] of Object.entries(descriptors)) assert.deepEqual(Object.getOwnPropertyDescriptor(RoomEngine.prototype, name), d);
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  console.log(JSON.stringify({ status: 'PASS_SOURCE_CONTROL_ONLY_HEAVY_DEFERRED', ticksPerControl: 6,
    menuConfig: request.config, humans: 1, bots: 4, livePilotsAtControlEnd: tested.livePilots,
    exactWireTextEqual: true, decodedMessagesEqual: true, stateQueuesControlsEqual: true, originalsRestored: true,
    wireMessages: tested.raw.length, wireSha256: digest(tested.raw), decodedSha256: digest(tested.messages), stateSha256: digest(tested.state),
    controlWallMs: reference.wallMs, instrumentedWallMs: tested.wallMs, rawDifferenceMs: tested.wallMs - reference.wallMs, timing,
    limit: 'Same menu configuration and default local RNG/code, no override. Initial six-tick prefix plus public chat only; not live five-pilot combat or post-score overhead calibration. Sequential cold/warm wall spans are not a reliable slowdown ratio. No score end, reset, intermission sample, native input/device or120s observation. Original acceptance fixture/assertions untouched.' }));
} finally { profiler?.dispose(); loader.dispose(); }
