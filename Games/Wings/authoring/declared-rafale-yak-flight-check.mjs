// Declared coverage fixture, not unforced full-pool, strike, renderer or native acceptance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = new URL('../../../', import.meta.url), preflight = process.argv.includes('--preflight');
assert(process.argv.slice(2).every(arg => arg === '--preflight'), 'only --preflight is supported; no seed/retry options');
const output = 'docs/wings-local-native/declared-rafale-yak-flight.json';
if (!preflight) assert(!existsSync(new URL(output, root)), 'receipt exists: never overwrite or retry');
const started = performance.now(), sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 2000000 }).trim();
const shaFile = path => sha(readFileSync(new URL(path, root)));
const available = () => Number(execFileSync('df', ['-B1', '/', '--output=avail'], { encoding: 'utf8' }).trim().split('\n').at(-1));
const tracked = () => git(['ls-files', 'Games/Wings/source', 'Games/Wings/authoring', 'Games/Wings/models', 'Games/Wings/verification', 'scripts/*wings*']).split('\n').filter(Boolean).sort();
const historical = ['named', 'expanded', 'six-aircraft', 'four-vessel', 'eight-aircraft', 'five-vessel', 'ten-aircraft', 'twelve-aircraft', 'six-vessel', 'thirteen-aircraft', 'fourteen-aircraft', 'fifteen-aircraft', 'sixteen-aircraft']
  .map(name => `docs/wings-local-native/${name}-coalition-flight.json`);
const declarations = [['nato', 'declared-rafale-yak-nato', ['rafale', 'yak130']], ['eastern', 'declared-rafale-yak-eastern', ['yak130', 'rafale']]];
const receipt = { command: 'timeout 240s node Games/Wings/authoring/declared-rafale-yak-flight-check.mjs',
  fixtureDeclaration: 'PREDECLARED one legal actual kind per team; ONLY test config.aircraft is restricted. Changes coverage, not production chooser, weights, RNG or flight. Historical random-pool FAIL remains immutable.',
  naturalPoolCoverage: false, fullPoolUnforced: false, naturalStrikeAcceptance: false,
  nativeAcceptance: false, nativePixels: false, battleOutcomeAcceptance: false, grants: [],
  limits: { simulatedSecondsPerCase: 120, ticksPerCase: 7200, stepSeconds: 1 / 60, wallSeconds: 230, commandTimeoutSeconds: 240, evidenceBytes: 250000, sampleSeconds: 10 },
  declarations, node: process.version, stdout: [], stderr: [], cases: [] };
const log = text => { receipt.stdout.push(text); console.log(text); };
let loader, paths = [], exitCode = 0;
try {
  receipt.storageBeforeBytes = available(); assert(receipt.storageBeforeBytes >= 2147483648, 'strict 2 GiB floor');
  receipt.head = git(['rev-parse', 'HEAD']); paths = tracked();
  receipt.hashesBefore = Object.fromEntries(paths.map(path => [path, shaFile(path)]));
  receipt.historicalBefore = Object.fromEntries(historical.map(path => [path, shaFile(path)]));
  receipt.historicalSixteenKindExitCode = JSON.parse(readFileSync(new URL(historical.at(-1), root))).exitCode;
  assert.equal(receipt.historicalSixteenKindExitCode, 1, 'historical random sixteen-kind coverage remains FAIL');
  receipt.glbCount = paths.filter(path => path.endsWith('.glb')).length;
  assert(receipt.glbCount >= 54, 'all tracked models, at least 54 GLBs; appended legitimate models allowed');
  assert.equal(git(['status', '--porcelain', '--untracked-files=all', '--', 'Games/Wings']), '', 'freeze and commit ALL Wings source before preflight/execution');
  const { installRetainedHostLoader, retainedRoot } = await import('./retained-host-loader.mjs');
  const { createRetainedHostBridge } = await import('./retained-host-bridge.mjs');
  const { createLocalFleetConfig } = await import('./local-host-scenario.mjs');
  const { coalitionPair } = await import('./coalition-rosters.mjs');
  const { HOST_FILES } = await import('./retained-host-wiring.mjs');
  loader = installRetainedHostLoader();
  const { VEHICLES, NATIVE_FIGHTER_MODELS, NATIVE_BOMBER_MODELS, NATIVE_HELICOPTER_MODELS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { ARMOR } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const supplied = JSON.parse(readFileSync(new URL('Games/Wings/authoring/supplied-fighters/models.json', root))).assets;
  assert(Object.keys(VEHICLES).every(kind => Number.isFinite(ARMOR[kind]) && ARMOR[kind] > 0), 'mandatory native armor, including all appended kinds');
  const sourceIds = { rafale: 'wings.original.rafale-c.v1', yak130: 'wings.original.yak-130.v1' };
  receipt.registeredAircraft = Object.entries(NATIVE_FIGHTER_MODELS).map(([kind, model]) => {
    const source = supplied.find(asset => asset.model_id === model.source_model_id);
    assert(source && VEHICLES[kind], `${kind}: genuine registered supplied source`);
    const raw = `Games/Wings/models/supplied/${source.model_file.split('/').at(-1)}`, derived = `Games/Wings/${model.file}`;
    assert(paths.includes(raw) && paths.includes(derived), `${kind}: tracked actual model bytes`);
    assert.equal(shaFile(raw), model.source_sha256); assert.equal(source.sha256, model.source_sha256);
    assert.equal(shaFile(derived), model.sha256); assert.equal(VEHICLES[kind].model, model.file);
    if (sourceIds[kind]) assert.equal(model.source_model_id, sourceIds[kind]);
    return { kind, source: model.source_model_id, raw, derived, sourceSha256: model.source_sha256, sha256: model.sha256, armor: ARMOR[kind] };
  });
  for (const kind of Object.keys(sourceIds)) assert(receipt.registeredAircraft.some(row => row.kind === kind));
  const setups = declarations.map(([choice, code, kinds]) => {
    const production = createLocalFleetConfig(choice), config = structuredClone(production), profiles = coalitionPair(choice);
    const productionRosters = production.aircraft.map(row => row.map(aircraft => aircraft.id));
    assert.equal(production.units.length, 10); assert.equal(production.geometry.length, 10);
    assert.deepEqual(production.units.map(unit => unit.modelId).sort(), ['aquitaine', 'cb90', 'cdg', 'kuz', 'liaoning', 'qe', 'type022', 'type054a', 'type055', 'type45']);
    profiles.forEach((profile, team) => {
      assert.deepEqual(productionRosters[team], profile.aircraft);
      assert.equal(productionRosters[team].length, 10);
      const helicopter = profile.id === 'nato' ? 'ah64d' : 'mi28n';
      assert.equal(productionRosters[team].at(-1), helicopter);
      assert.equal(NATIVE_HELICOPTER_MODELS[helicopter].source_model_id,
        profile.id === 'nato' ? 'wings.original.ah-64d-apache.v1' : 'wings.original.mi-28n.v1');
      assert(productionRosters[team].includes(kinds[team]), 'declared restriction must be legal in full production roster');
      for (const kind of productionRosters[team]) assert(profile.aircraftModels.includes((NATIVE_FIGHTER_MODELS[kind] ?? NATIVE_BOMBER_MODELS[kind] ?? NATIVE_HELICOPTER_MODELS[kind])?.source_model_id));
      assert.deepEqual(production.units.filter(unit => unit.team === team).map(unit => [unit.modelId, unit.capital]), profile.vessels.map(v => [v.id, v.capital]));
    });
    config.aircraft = production.aircraft.map((row, team) => row.filter(aircraft => aircraft.id === kinds[team]));
    assert.deepEqual(config.aircraft.map(row => row.map(a => a.id)), kinds.map(kind => [kind]));
    const withoutAircraft = ({ aircraft, ...rest }) => rest;
    assert.deepEqual(withoutAircraft(config), withoutAircraft(production), 'EVERY other field and all ten ships exact');
    const result = { choice, code, status: 'not-run', productionRosters, rosters: kinds.map(kind => [kind]),
      configDiff: { aircraft: { before: production.aircraft, after: config.aircraft } }, changedFields: ['aircraft'],
      unchangedFieldsSha256: sha(JSON.stringify(withoutAircraft(config))), productionConfigSha256: sha(JSON.stringify(production)),
      fixtureConfigSha256: sha(JSON.stringify(config)), units: structuredClone(config.units), aircraft: [] };
    receipt.cases.push(result); return { config, result };
  });
  receipt.staticPreflight = { passed: true, simulation: false, receiptWrites: false };
  if (preflight) log('PASS write-free preflight: two declared cases, legal genuine Rafale/Yak-130, full production rosters, ten exact ships; NO simulation or receipt writes.');
  else {
    const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
    const { DEFAULT_ROOM_CONFIG } = await import(new URL('src/sim/protocol.ts', retainedRoot));
    const { posedShip } = await import(new URL('src/sim/geography.ts', retainedRoot));
    for (const { config, result } of setups) {
      const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters: result.rosters });
      const records = new Map(); let room;
      try {
        result.status = 'running';
        room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, teams: 2, bots: 2, botFill: 0, listed: false, timeLimit: config.matchMs / 1000 },
          'Declared coverage observer', { onMessage() {} }, { manual: true, code: result.code, hostBridge: bridge });
        result.roomConfig = { ...room.engine.config }; assert.equal(room.engine.config.botSkill, undefined);
        for (let tick = 0; tick < 7200 && room.engine.matchEndedAt === null; tick++) {
          assert(performance.now() - started < 230000, '230s total wall budget'); room.step(1 / 60);
          const host = room.engine;
          for (const v of host.vehicles) {
            assert(result.rosters[v.team]?.includes(v.kind), 'actual native spawn legal');
            assert(v.flight.position.every(Number.isFinite) && Number.isFinite(v.hp) && Number.isFinite(v.maxHp));
            let row = records.get(v.id);
            if (!row) {
              assert(records.size < 64, 'bounded actual births');
              const pilot = host.players.get(v.seats[0]);
              assert(pilot?.info.bot && pilot.brain, 'birth has actual native bot pilot');
              assert.equal(pilot.info.seat, 0); assert.equal(pilot.info.vehicleId, v.id); assert.equal(pilot.info.team, v.team);
              assert.equal(pilot.brain.state.skill, .5); assert.equal(v.hp, VEHICLES[v.kind].maxHp);
              assert.equal(v.flight.onGround, true, 'normal on-ground birth is mandatory');
              assert.equal(host.onOwnDeck(v), true, 'actual native own-carrier deck predicate');
              const carrier = host.spawnCarrier(v.team), deck = posedShip(carrier); assert(deck && deck.team === v.team && deck.kind === 'carrier');
              row = { id: v.id, kind: v.kind, team: v.team, pilot: pilot.info.id, birthTick: host.tick, spawnedOnGround: true,
                carrier, carrierPose: { position: [...deck.position], heading: deck.heading }, start: [...v.flight.position],
                initialHP: v.hp, hp: v.hp, maxHp: v.maxHp, maxDistance: 0, airborneTicks: 0, samples: [] };
              records.set(v.id, row); result.aircraft.push(row);
            }
            row.hp = v.hp; row.end = [...v.flight.position]; row.alive = v.alive;
            row.maxDistance = Math.max(row.maxDistance, Math.hypot(...v.flight.position.map((n, i) => n - row.start[i])));
            if (v.alive && !v.flight.onGround) row.airborneTicks++;
            if (v.alive && host.tick % 600 === 0) row.samples.push({ tick: host.tick, position: [...v.flight.position], hp: v.hp, onGround: v.flight.onGround });
            for (const id of v.seats.filter(Boolean)) {
              const p = host.players.get(id); assert(p?.info.bot && p.brain, 'observer never controls aircraft');
              assert.equal(p.info.vehicleId, v.id); assert.equal(p.info.team, v.team); assert.equal(p.brain.state.skill, .5);
            }
          }
          result.outcome = bridge.snapshot(host, room.playerId).outcome;
          if (tick % 120 === 0) await Promise.resolve();
        }
        const host = room.engine, human = host.players.get(room.playerId).info;
        result.human = { team: human.team, vehicleId: human.vehicleId, inputSent: false }; assert.equal(human.vehicleId, null);
        assert.equal(host.botCount(), 4);
        result.botsByTeam = [0, 1].map(team => [...host.players.values()].filter(p => p.info.bot && p.info.team === team).length);
        assert.deepEqual(result.botsByTeam, [2, 2]);
        result.tick = host.tick; result.seconds = host.time; result.matchEndedAt = host.matchEndedAt;
        result.stopReason = host.matchEndedAt === null ? 'simulation-limit' : 'actual-authoritative-outcome';
        if (host.matchEndedAt === null) { assert.equal(host.tick, 7200); assert(Math.abs(host.time - 120) < 1e-7); assert.equal(result.outcome, null); }
        else { assert(result.outcome); assert.equal(host.matchEndedAt, host.time); assert(host.tick <= 7200); }
        result.coverage = result.rosters.map(([kind], team) => ({ kind, team, births: result.aircraft.filter(r => r.kind === kind && r.team === team).length,
          airborneMoving: result.aircraft.filter(r => r.kind === kind && r.team === team && r.airborneTicks > 60 && r.maxDistance > 100).length }));
        for (const row of result.coverage) { assert(row.births > 0, `${row.kind}/team${row.team}: mandatory birth`); assert(row.airborneMoving > 0, `${row.kind}/team${row.team}: mandatory airborne >60 ticks and distance >100m`); }
        result.status = 'PASS';
        log(JSON.stringify({ code: result.code, tick: result.tick, seconds: result.seconds, stopReason: result.stopReason, coverage: result.coverage }));
      } catch (error) {
        result.status = 'FAIL'; result.error = String(error).replaceAll(root.pathname, '<repo>/'); result.tick = room?.engine.tick ?? null; result.seconds = room?.engine.time ?? null;
        result.matchEndedAt = room?.engine.matchEndedAt ?? null; result.stopReason = performance.now() - started >= 230000 ? 'wall-budget-FAIL' : 'check-FAIL'; throw error;
      } finally { if (room) room.close(); else bridge.dispose(); }
    }
    assert.deepEqual([...loader.loaded].sort(), [...HOST_FILES].sort(), 'actual retained hooks loaded');
    log('PASS declared Rafale/Yak-130 legal bot flight on both teams across two fixed cases; NOT random full-pool or native acceptance.');
  }
} catch (error) { exitCode = 1; receipt.error = String(error).replaceAll(root.pathname, '<repo>/'); receipt.stderr.push(receipt.error); console.error(receipt.error); }
finally {
  receipt.loadedNativeHooks = [...(loader?.loaded ?? [])].sort(); loader?.dispose();
  try {
    receipt.hashesAfter = Object.fromEntries(paths.map(path => [path, existsSync(new URL(path, root)) ? shaFile(path) : null]));
    receipt.historicalAfter = Object.fromEntries(historical.map(path => [path, existsSync(new URL(path, root)) ? shaFile(path) : null]));
    receipt.headAfter = git(['rev-parse', 'HEAD']);
    receipt.sourceAndToolsUnchanged = JSON.stringify(receipt.hashesBefore) === JSON.stringify(receipt.hashesAfter) && JSON.stringify(paths) === JSON.stringify(tracked()) && receipt.head === receipt.headAfter && git(['status', '--porcelain', '--untracked-files=all', '--', 'Games/Wings']) === '';
    receipt.historicalReceiptsUnchanged = JSON.stringify(receipt.historicalBefore) === JSON.stringify(receipt.historicalAfter);
    if (!receipt.sourceAndToolsUnchanged || !receipt.historicalReceiptsUnchanged) { exitCode = 1; receipt.integrityError = 'Source/tool/model path set, bytes or historical receipt changed'; }
    receipt.storageAfterBytes = available(); receipt.durationSeconds = (performance.now() - started) / 1000;
    if (receipt.durationSeconds > 230 || receipt.storageAfterBytes < 2147483648) { exitCode = 1; receipt.guardError = 'Wall budget or strict disk floor failed'; }
    receipt.exitCode = exitCode; receipt.stdoutSha256 = sha(receipt.stdout.join('\n') + '\n');
    if (!preflight) {
      const text = JSON.stringify(receipt) + '\n'; assert(Buffer.byteLength(text) < 250000, 'bounded evidence, never truncate');
      assert(receipt.storageAfterBytes >= 2147483648, 'strict disk floor before receipt write');
      writeFileSync(new URL(output, root), text, { flag: 'wx' });
      console.log(`receipt=${output} sha256=${sha(text)} exit=${exitCode}`);
    }
  } catch (error) { exitCode = 1; console.error(String(error)); }
  process.exitCode = exitCode;
}
