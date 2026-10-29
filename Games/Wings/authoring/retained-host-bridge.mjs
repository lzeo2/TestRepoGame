// Original adapter for the retained RoomEngine ABI. No upstream implementation or UI imports.
import { createFleet } from './fleet-sim.mjs';
import { compileGeometry, yawRotate } from './fleet-geometry.mjs';

const kinds = new Set(['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35', 'f16c', 'mig29', 'typhoon', 'su35s', 'rafale', 'jf17', 'gripen', 'mig31', 'mirage2000', 'su34', 'fa50', 'yak130', 'hawkt2', 'su25sm', 'a10c', 'f35a', 'j20', 'tu160', 'ah64d', 'mi28n']);
const acceptedWeapons = new Set(['cannon20', 'chaingun30', 'gau8', 'rockets', 'bomb']);
export function createRetainedHostBridge(options) {
  if (options?.mode !== 'factions') return null;
  const { config, rosters, onSnapshot } = options;
  if (!Array.isArray(rosters) || rosters.length !== 2 || rosters.some(r => !Array.isArray(r) || !r.length ||
      new Set(r).size !== r.length || r.some(k => !kinds.has(k))) ||
      (onSnapshot !== undefined && typeof onSnapshot !== 'function')) throw new TypeError('Two retained aircraft rosters required');
  const aircraftRosters = rosters.map(r => Object.freeze([...r]));
  const allowed = aircraftRosters.map(r => new Set(r));
  const baseline = structuredClone(config);
  // The host owns all aircraft, seats, ammo and cooldowns. FC aircraft profiles are not mirrored.
  let fleet = createFleet(baseline), room = null, staticBots = null, originTick = 0, elapsedMs = 0;
  const targetGeometry = new Map((baseline.geometry ?? []).map(({ id, descriptor }) => [id, compileGeometry(descriptor)]));
  let disposed = false, paused = false, generations = 1;
  const bindings = new Set();
  let provenance = new WeakMap(), spentImpacts = new WeakSet();
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
    const targets = new Map(); // One immutable safe projection per faction in this binding/tick.
    function eligible(projectile, authenticate = false) {
      if (room !== host || combat !== host.combat || combat.hostFleet !== binding || paused || host.matchEndedAt !== null || fleet.snapshot(0).outcome ||
          !acceptedWeapons.has(projectile.weapon) || !combat.projectiles.includes(projectile) || projectile.ship || spentImpacts.has(projectile) ||
          !Number.isFinite(projectile.age) || projectile.age < 0 || projectile.age > projectile.ttl) return null;
      let origin = provenance.get(projectile);
      if (!origin && authenticate) {
        const player = host.players.get(projectile.owner)?.info;
        const vehicle = host.vehicles.find(v => v.id === projectile.vehicle);
        if (!player || !vehicle?.alive || player.team !== projectile.team || vehicle.team !== player.team ||
            player.vehicleId !== vehicle.id || !vehicle.seats.includes(player.id) ||
            !allowed[player.team]?.has(vehicle.kind)) return null;
        // Accepted rounds outlive their launcher; blast callbacks cannot establish provenance.
        origin = Object.freeze({ owner: projectile.owner, vehicle: projectile.vehicle, team: player.team,
          weapon: projectile.weapon, source: `aircraft_${vehicle.id}` });
        provenance.set(projectile, origin);
      }
      return origin && projectile.owner === origin.owner && projectile.vehicle === origin.vehicle &&
        projectile.team === origin.team && projectile.weapon === origin.weapon ? origin : null;
    }
    const binding = { botTargets(team) {
      live();
      if (team !== 0 && team !== 1) throw new TypeError('Bound faction required');
      if (room !== host || combat !== host.combat || combat.hostFleet !== binding) return Object.freeze([]);
      if (!targets.has(team)) {
        const list = [];
        for (const unit of fleet.snapshot(team).units) {
          const g = targetGeometry.get(unit.modelId), q = unit.view?.orientation;
          if (!g || unit.kind !== 'surface' || !unit.alive || !(unit.hp > 0) || !Array.isArray(q) || q.length !== 4) continue;
          const heading = Math.atan2(2 * (q[0] * q[2] + q[3] * q[1]), 1 - 2 * (q[0] * q[0] + q[1] * q[1]));
          const box = g.descriptor.collision.deck ? g.boxes[1] : g.boxes[0];
          const center = box.min.map((n, i) => (n + box.max[i]) / 2);
          const aim = yawRotate(center, heading).map((n, i) => n + unit.position[i]);
          if (aim[1] <= 0) continue; // No manufactured above-water aim point for submerged geometry.
          list.push(Object.freeze({ id: unit.id, team: unit.team, kind: 'surface', capital: unit.capital === true,
            position: Object.freeze([...unit.position]), aimPosition: Object.freeze(aim),
            bombAimRadius: Math.min(box.max[0] - box.min[0], box.max[2] - box.min[2]) / 2 }));
          if (list.length === 12) break;
        }
        targets.set(team, Object.freeze(list));
      }
      return targets.get(team);
    }, surfaceSegment(a, b) {
      live();
      if (room !== host || combat !== host.combat || combat.hostFleet !== binding) return null;
      return fleet.surfaceSegment(a, b);
    }, surfaceHeightAt(x, z) {
      live();
      // Host physics only. Old callbacks cannot query a replacement combat/round/binding.
      if (room !== host || combat !== host.combat || combat.hostFleet !== binding) return null;
      return fleet.surfaceHeightAt(x, z);
    }, resolveProjectile(projectile, from, to, maxFraction, damage) {
      live();
      const origin = eligible(projectile, true);
      if (!origin) return false;
      const hit = fleet.resolveHostSegment({ source: origin.source, team: origin.team,
        weapon: origin.weapon, from: [...from], to: [...to], maxFraction, damage });
      if (hit) { spentImpacts.add(projectile); targets.clear(); }
      return hit ? Object.freeze({ fraction: hit.fraction, position: Object.freeze([...hit.position]) }) : false;
    }, resolveBombNearMiss(projectile, position, radius, damage) {
      live();
      const origin = eligible(projectile);
      if (!origin || origin.weapon !== 'bomb') return false;
      const affected = fleet.resolveHostBombNearMiss({ source: origin.source, team: origin.team, weapon: 'bomb',
        position: [...position], radius, damage });
      spentImpacts.add(projectile);
      if (affected) targets.clear();
      return affected;
    } };
    combat.hostFleet = binding;
    bindings.add(combat);
  }
  function principal(host, id) {
    if (host !== room) throw new TypeError('Bound room required');
    const p = host.players.get(id)?.info;
    if (!p || (p.team !== 0 && p.team !== 1)) throw new TypeError('Current host player/faction required');
    return p;
  }
  const api = {
    aircraftRoster(host, team) {
      live();
      if (host !== room || (team !== 0 && team !== 1)) throw new TypeError('Bound room and faction required');
      return aircraftRosters[team];
    },
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
      bindings.clear(); provenance = new WeakMap(); spentImpacts = new WeakSet();
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
      bindings.clear(); provenance = new WeakMap(); spentImpacts = new WeakSet(); room = null; fleet = null;
    },
    stats: () => ({ disposed, paused, generations, bindings: bindings.size, elapsedMs }),
  };
  return Object.freeze(api);
}
