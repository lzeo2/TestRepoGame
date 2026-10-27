// Original adapter for the retained RoomEngine ABI. No upstream implementation or UI imports.
import { createFleet } from './fleet-sim.mjs';

const kinds = new Set(['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35']);
const guns = new Set(['cannon20', 'chaingun30', 'gau8']);
export function createRetainedHostBridge(options) {
  if (options?.mode !== 'factions') return null;
  const { config, rosters, onSnapshot } = options;
  if (!Array.isArray(rosters) || rosters.length !== 2 || rosters.some(r => !Array.isArray(r) || !r.length ||
      new Set(r).size !== r.length || r.some(k => !kinds.has(k))) ||
      (onSnapshot !== undefined && typeof onSnapshot !== 'function')) throw new TypeError('Two retained aircraft rosters required');
  const allowed = rosters.map(r => new Set(r));
  const baseline = structuredClone(config);
  // The host owns all aircraft, seats, ammo and cooldowns. FC aircraft profiles are not mirrored.
  let fleet = createFleet(baseline), room = null, staticBots = null, originTick = 0, elapsedMs = 0;
  let disposed = false, paused = false, generations = 1;
  const bindings = new Set();
  let provenance = new WeakMap();
  function live() { if (disposed) throw new Error('Host bridge disposed'); }
  function bind(host) {
    live();
    if (!host || host.config?.teams !== 2 || !Number.isInteger(host.config?.bots) ||
        host.config.bots < 0 || host.config.bots > 2 || host.config?.botFill ||
        !Number.isSafeInteger(host.tick) || !Array.isArray(host.vehicles) || !(host.players instanceof Map))
      throw new TypeError('Retained two-team RoomEngine with 0..2 static bots per team required');
    if (room && room !== host) throw new TypeError('One room per bridge');
    if (staticBots !== null && staticBots !== host.config.bots) throw new TypeError('Static bot count required');
    room = host; staticBots = host.config.bots;
    const combat = host.combat;
    if (combat.hostFleet && !bindings.has(combat)) throw new TypeError('CombatState already bound');
    combat.hostFleet = { resolveProjectile(projectile, from, to, maxFraction, damage) {
      live();
      if (combat !== host.combat || paused || host.matchEndedAt !== null || fleet.snapshot(0).outcome ||
          !guns.has(projectile.weapon) || !combat.projectiles.includes(projectile) || projectile.ship) return false;
      let origin = provenance.get(projectile);
      if (!origin) {
        const player = host.players.get(projectile.owner)?.info;
        const vehicle = host.vehicles.find(v => v.id === projectile.vehicle);
        if (!player || !vehicle?.alive || player.team !== projectile.team || vehicle.team !== player.team ||
            player.vehicleId !== vehicle.id || !vehicle.seats.includes(player.id) ||
            !allowed[player.team]?.has(vehicle.kind)) return false;
        // Authenticate once at the actual resolver boundary; accepted rounds outlive their launcher.
        origin = Object.freeze({ owner: projectile.owner, vehicle: projectile.vehicle, team: player.team,
          weapon: projectile.weapon, source: `aircraft_${vehicle.id}` });
        provenance.set(projectile, origin);
      }
      if (projectile.owner !== origin.owner || projectile.vehicle !== origin.vehicle ||
          projectile.team !== origin.team || projectile.weapon !== origin.weapon) return false;
      return fleet.resolveHostSegment({ source: origin.source, team: origin.team,
        weapon: origin.weapon, from: [...from], to: [...to], maxFraction, damage }) !== null;
    } };
    bindings.add(combat);
  }
  function principal(host, id) {
    if (host !== room) throw new TypeError('Bound room required');
    const p = host.players.get(id)?.info;
    if (!p || (p.team !== 0 && p.team !== 1)) throw new TypeError('Current host player/faction required');
    return p;
  }
  const api = {
    beforeStep(host) {
      bind(host);
      const next = Math.floor((host.tick - originTick) * 1000 / 60);
      if (next < elapsedMs || next - elapsedMs > 250) throw new TypeError('Sequential retained 60Hz clock required');
      // Keep the existing fleet tick. No wall clock, timers, RAF or second flight simulation.
      if (host.matchEndedAt === null) fleet.advance(next - elapsedMs);
      elapsedMs = next;
    },
    afterStep(host) {
      live(); if (host !== room) throw new TypeError('Bound room required');
      if (onSnapshot) for (const p of host.players.values()) onSnapshot(p.info.id, fleet.snapshot(p.info.team));
      return fleet.snapshot(0).outcome;
    },
    allow(host, id, message) {
      bind(host);
      const p = principal(host, id);
      if (!message || typeof message !== 'object') return false;
      if (message.type === 'man-turret' || message.type === 'team') return false;
      if (message.type === 'hello' && message.team !== undefined && message.team !== p.team) return false;
      if (message.type === 'spawn') return allowed[p.team].has(message.kind);
      if (message.type === 'board') {
        const v = host.vehicles.find(v => v.id === message.vehicle);
        return !!v?.alive && v.team === p.team && allowed[p.team].has(v.kind);
      }
      return ['hello', 'input', 'ping', 'chat', 'switch-seat', 'leave-vehicle'].includes(message.type);
    },
    reset(host) {
      live(); if (host !== room) throw new TypeError('Bound room required');
      for (const combat of bindings) delete combat.hostFleet;
      bindings.clear(); provenance = new WeakMap();
      fleet = createFleet(baseline); originTick = host.tick; elapsedMs = 0; generations++;
      bind(host);
    },
    snapshot(host, id) { live(); bind(host); return fleet.snapshot(principal(host, id).team); },
    paused: () => paused,
    setPaused(value) { live(); if (typeof value !== 'boolean') throw new TypeError('Boolean pause required'); paused = value; },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const combat of bindings) delete combat.hostFleet;
      bindings.clear(); provenance = new WeakMap(); room = null; fleet = null;
    },
    stats: () => ({ disposed, paused, generations, bindings: bindings.size, elapsedMs }),
  };
  return Object.freeze(api);
}
