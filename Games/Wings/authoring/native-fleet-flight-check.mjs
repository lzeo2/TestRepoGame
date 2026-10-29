// Unforced actual carrier spawn -> native bot controls -> retained Factions. CPU, not GPU/input acceptance.
import assert from 'node:assert/strict';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
try {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { DEFAULT_ROOM_CONFIG } = await import(new URL('src/sim/protocol.ts', retainedRoot));
  let totalStrike = 0, totalImpacts = 0, demonstratedStrike = false;
  for (const code of ['fc-targets-boundary', 'fc-natural-flight-1', 'fc-natural-flight-2']) {
    const config = createLocalFleetConfig();
    const bridge = createRetainedHostBridge({ mode: 'factions', config,
      rosters: config.aircraft.map(r => r.map(a => a.id)) });
    const records = new Map(), seen = new Set(), impactEvidence = [];
    const births = new WeakMap(), launches = [], pendingHits = [], projectileImpacts = [];
    const observer = { ...bridge, beforeStep(host) {
      bridge.beforeStep(host);
      const binding = host.combat.hostFleet, resolve = binding.resolveProjectile;
      binding.resolveProjectile = function(projectile, ...args) {
        let birth = births.get(projectile);
        if (!birth && !projectile.ship) {
          const player = host.players.get(projectile.owner);
          assert(player?.info.bot && player.info.vehicleId === projectile.vehicle,
            'observe only actual native bot projectiles');
          assert(projectile.age <= 1 / 60 + 1e-8, 'first callback must include launch tick, even immediate hits');
          birth = Object.freeze({ nativeProjectileID: projectile.id, vehicle: projectile.vehicle,
            weapon: projectile.weapon, launchTick: host.tick, ageAtFirstCallback: projectile.age,
            phase: player.brain.state.phase, strikeShip: player.brain.state.strikeShip });
          births.set(projectile, birth); launches.push(birth);
        }
        const hit = resolve.call(this, projectile, ...args);
        assert.strictEqual(host.combat.hostFleet, binding, 'preserve original binding identity guard');
        if (hit && birth) pendingHits.push({ ...birth, hitTick: host.tick, position: [...hit.position] });
        return hit;
      };
    } };
    const room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, teams: 2, bots: 2, botFill: 0,
      listed: false, timeLimit: config.matchMs / 1000 }, 'Natural CPU', { onMessage(message) {
        if (message.type !== 'events') return;
        for (const e of message.events) if (e.type === 'fire') {
          const r = records.get(e.vehicle);
          if (r) r.nativeFire[e.weapon] = (r.nativeFire[e.weapon] ?? 0) + 1;
        }
      } }, { manual: true, code, hostBridge: observer });
    let impacts = 0, outcome = null, hp = [], aircraftDamage = 0;
    try {
      for (let tick = 0; tick < 10800 && room.engine.matchEndedAt === null; tick++) {
        room.step(1 / 60);
        const contacts = room.engine.combat.hostFleet.botTargets(0);
        assert(contacts.length > 0, 'actual bridge target path must stay live');
        assert(contacts.every(t => t.id === 'home' || t.id === 'enemy'), 'never legacy ship IDs');
        for (const p of room.engine.players.values()) {
          if (!p.info.bot || !p.info.vehicleId) continue;
          const v = room.engine.vehicles.find(v => v.id === p.info.vehicleId);
          if (!v || !p.brain) continue;
          const s = p.brain.state;
          let r = records.get(v.id);
          if (!r) {
            r = { id: v.id, kind: v.kind, team: v.team, role: s.role, defender: s.defender,
              start: [...v.flight.position], spawnedOnGround: v.flight.onGround, end: [], phases: {}, strikeIds: [], minRange: Infinity,
              strikeMinRange: Infinity, triggers: 0, strikeTriggers: 0, nativeFire: {}, ammoSpent: 0,
              initialAmmo: v.weapons.flat().map(w => w?.ammo ?? null),
              minimumAmmo: v.weapons.flat().map(w => w?.ammo ?? null),
              ammo: v.weapons.flat().map(w => w?.ammo ?? null), samples: [] };
            records.set(v.id, r);
          }
          if (s.vehicleId === v.id) { r.role = s.role; r.defender = s.defender; }
          assert(records.size <= 64, 'bounded native respawn roster');
          assert(v.flight.position.every(Number.isFinite), 'native trajectory finite');
          r.end = [...v.flight.position];
          r.phases[s.phase] = (r.phases[s.phase] ?? 0) + 1;
          if (s.strikeShip && !r.strikeIds.includes(s.strikeShip)) r.strikeIds.push(s.strikeShip);
          const target = room.engine.combat.hostFleet.botTargets(v.team).find(t => t.team !== v.team);
          if (target) {
            const d = Math.hypot(...target.aimPosition.map((n, i) => n - v.flight.position[i]));
            r.minRange = Math.min(r.minRange, d);
            if (s.phase === 'strike') r.strikeMinRange = Math.min(r.strikeMinRange, d);
          }
          const seat = p.info.seat === 0 ? p.brain.out.pilotSeat : p.brain.out.gunnerSeat;
          if (seat.firePrimary || seat.fireSecondary) { r.triggers++; if (s.phase === 'strike') r.strikeTriggers++; }
          if (tick % 1200 === 0) r.samples.push({ seconds: tick / 60, phase: s.phase, leg: s.strikePhase,
            target: s.targetId, strike: s.strikeShip, position: v.flight.position.map(Math.round) });
          const ammo = v.weapons.flat().map(w => w?.ammo ?? null);
          ammo.forEach((n, i) => {
            if (n !== null && r.ammo[i] !== null && n < r.ammo[i]) r.ammoSpent += r.ammo[i] - n;
            if (n !== null) r.minimumAmmo[i] = Math.min(r.minimumAmmo[i], n);
          });
          r.ammo = ammo;
        }
        const frame = bridge.snapshot(room.engine, room.playerId);
        outcome = frame.outcome;
        hp = frame.units.map(u => ({ id: u.id, hp: u.hp, alive: u.alive }));
        for (const e of frame.events) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          if ((e.type === 'impact' || e.type === 'damage') && e.source?.startsWith('aircraft_')) {
            const r = records.get(e.source.slice('aircraft_'.length));
            assert(r, 'FC impact attributed to actual spawned bot');
            assert.equal(e.unit, r.team === 0 ? 'enemy' : 'home', 'actual hostile FC hull');
            if (e.type === 'impact') {
              impacts++;
              const index = pendingHits.findIndex(h => `aircraft_${h.vehicle}` === e.source &&
                h.weapon === e.weapon && h.hitTick === room.engine.tick &&
                h.position.every((n, i) => n === e.position[i]));
              assert(index >= 0, 'safeCore impact must match actual resolver projectile/source/weapon/position/tick');
              assert.equal(e.tick, frame.tick, 'impact belongs to current authority tick');
              const [hit] = pendingHits.splice(index, 1);
              assert(hit.launchTick <= hit.hitTick);
              projectileImpacts.push({ ...hit, impactEvent: e.id, authorityTick: e.tick, unit: e.unit });
            } else {
              assert(e.damage > 0); aircraftDamage += e.damage;
              const hit = projectileImpacts.find(h => h.impactEvent === e.id - 1 &&
                `aircraft_${h.vehicle}` === e.source && h.weapon === e.weapon &&
                h.authorityTick === e.tick && h.unit === e.unit);
              assert(hit, 'positive damage must pair with the same actual projectile impact');
              hit.damage = e.damage;
            }
            if (impactEvidence.length < 24) impactEvidence.push({ seconds: room.engine.time, ...e });
          }
        }
        await Promise.resolve(); // Observe normal serialized native fire events, without replacing hooks.
      }
      assert.equal(room.engine.botCount(), 4);
      const rows = [...records.values()];
      assert(rows.some(r => (r.phases.transit ?? 0) + (r.phases.engage ?? 0) + (r.phases.strike ?? 0) > 0), 'native takeoff must progress');
      for (const r of rows) for (const id of r.strikeIds) assert(id === (r.team === 0 ? 'enemy' : 'home'));
      totalStrike += rows.reduce((n, r) => n + (r.phases.strike ?? 0), 0);
      totalImpacts += impacts;
      assert.equal(pendingHits.length, 0, 'every actual resolver hit has safeCore impact evidence');
      assert.equal(outcome?.reason, 'capitals', 'retain actual core capital outcome');
      const deliberateImpacts = projectileImpacts.filter(h => h.damage > 0 &&
        h.phase === 'strike' && h.strikeShip === h.unit);
      demonstratedStrike ||= deliberateImpacts.some(h => {
        const r = records.get(h.vehicle);
        return r.role === 'strike' && r.strikeTriggers > 0 && r.ammoSpent > 0 && r.nativeFire[h.weapon] > 0;
      });
      console.log(JSON.stringify({ code, seconds: room.engine.time, outcome, hp, impacts, aircraftDamage,
        launchCount: launches.length, deliberateImpactCount: deliberateImpacts.length,
        launches, projectileImpacts, impactEvidence, aircraft: rows }));
    } finally { room.close(); }
  }
  assert(totalStrike > 0, 'unforced native role/navigation must select actual FC targets');
  assert(demonstratedStrike, 'unforced FC strike commands, native fire/ammo and source-attributed fitted impacts must all occur');
  console.log(`PASS unforced native spawn/navigation, actual FC strike IDs, native fire/ammo and attributed fitted impacts=${totalImpacts}; CPU only, not GPU/input acceptance.`);
} finally { loader.dispose(); }
