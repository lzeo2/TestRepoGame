// Original host/session glue for original FC authority and fleet-rig ABI; no upstream game imports.
import { createFleet, LIMITS } from './fleet-sim.mjs';

const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const idOK = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/.test(value);
function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new TypeError('Unexpected session command fields');
}
function launchVector(value) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 100000))
    throw new TypeError('Invalid trusted launch vector');
  return [...value];
}

// Return null without touching config/host/view for normal, solo, custom or any non-Factions mode.
export function createFleetSession(options) {
  if (options?.mode !== 'factions') return null;
  fields(options, ['mode', 'config', 'host', 'createView']);
  const { host, createView } = options;
  if (!object(host) || !object(host.identity) || typeof host.authenticate !== 'function' ||
      typeof host.deriveAircraftAttack !== 'function' || typeof createView !== 'function' ||
      (host.stepAircraft !== undefined && typeof host.stepAircraft !== 'function')) throw new TypeError('Trusted host capabilities required');
  const config = clone(options.config);
  if (JSON.stringify(config).length > 262144) throw new TypeError('Session config exceeds bounded envelope');
  const identity = host.identity, authenticate = host.authenticate, deriveAttack = host.deriveAircraftAttack;
  const stepAircraft = host.stepAircraft;
  const registered = new Map(), clients = new Map();
  let authority = null, lease = null, status = 'new', paused = false, sequence = 0, pendingMs = 0, generation = 0;
  let busy = false, viewFailures = 0;
  function owner(actor) { if (actor !== identity) throw new TypeError('Trusted host identity required'); }
  function running() { if (status !== 'running') throw new Error(`Fleet session ${status}`); }
  function locked(body) {
    if (busy) throw new Error('Reentrant session operation forbidden');
    busy = true;
    try { return body(); } finally { busy = false; }
  }
  function principal(connection) {
    const p = authenticate(connection);
    if (!object(p) || !idOK(p.id) || (p.team !== 0 && p.team !== 1)) throw new TypeError('Authenticated host identity/faction required');
    return { id: p.id, team: p.team };
  }
  function client(connection) {
    running();
    const p = principal(connection), c = clients.get(p.id);
    if (!c || c.team !== p.team) throw new TypeError('Player is not joined in authenticated faction');
    return c;
  }
  function closeView(c) {
    try { c.view.dispose(); } catch { viewFailures++; }
  }
  function publish() {
    // Each failed pass removes a client. Restart ALL survivors after cleanup mutates authority,
    // including views already updated earlier in insertion order. Event cursors remain intact.
    for (let remaining = clients.size; remaining > 0; remaining--) {
      const teamSnapshots = new Map();
      let failed = false;
      for (const c of clients.values()) {
        if (!teamSnapshots.has(c.team)) teamSnapshots.set(c.team, authority.snapshot(c.team));
        const safe = clone(teamSnapshots.get(c.team));
        if (c.round !== safe.round) { c.round = safe.round; c.lastEvent = 0; }
        safe.events = safe.events.filter(event => event.round === safe.round && event.id > c.lastEvent);
        if (safe.events.length) c.lastEvent = Math.max(...safe.events.map(event => event.id));
        safe.paused = paused;
        try { c.view.update(safe); }
        catch {
          viewFailures++; authority.request(c.id, { type: 'leave' });
          closeView(c); clients.delete(c.id); failed = true;
          break; // Cached snapshots predate the authority mutation and must not be reused.
        }
      }
      if (!failed || clients.size === 0) return;
    }
  }
  function initialize() {
    // Config, replay and authority handles never cross the presentation boundary.
    const next = createFleet(clone(config));
    for (const c of clients.values()) next.addPlayer(c.id, c.team);
    authority = next; registered.clear();
    for (const c of clients.values()) {
      registered.set(c.id, c.team); c.lastEvent = 0; c.round = null;
      try { c.view.reset(); } catch { viewFailures++; closeView(c); clients.delete(c.id); }
    }
    generation++; sequence = 0; pendingMs = 0; paused = false; lease = Object.freeze({ generation });
    status = 'running'; publish();
    return lease;
  }
  function reject(message) { return { ok: false, error: message }; }
  const api = {
    start(actor) {
      owner(actor);
      return locked(() => { if (status !== 'new') throw new Error('Start once; restart explicitly'); return initialize(); });
    },
    restart(actor) {
      owner(actor);
      return locked(() => { if (status === 'disposed' || status === 'new') throw new Error('Cannot restart this session'); return initialize(); });
    },
    join(connection) {
      return locked(() => {
        running(); const p = principal(connection);
        if (clients.has(p.id)) throw new TypeError('Player already joined');
        if (registered.has(p.id) && registered.get(p.id) !== p.team) throw new TypeError('Faction change requires host session restart');
        if (!registered.has(p.id)) {
          if (registered.size >= 32) throw new TypeError('Session player cap');
          authority.addPlayer(p.id, p.team); registered.set(p.id, p.team);
        }
        const view = createView(Object.freeze({ playerId: p.id, team: p.team }));
        if (!view || ['update', 'reset', 'dispose'].some(name => typeof view[name] !== 'function')) throw new TypeError('Fleet-rig ABI required');
        const c = { ...p, view, lastEvent: 0, round: null }; clients.set(p.id, c);
        publish();
        if (!clients.has(p.id)) throw new Error('View failed initial faction snapshot');
        return { id: p.id, team: p.team };
      });
    },
    request(connection, command) {
      if (command?.type === 'leave') { fields(command, ['type']); return api.leave(connection); }
      return locked(() => {
        const c = client(connection);
        // Faction identity is host-owned; only the existing aircraft lifecycle is accepted here.
        const allowed = { spawn: ['type', 'kind'], board: ['type', 'aircraft', 'seat'], 'switch-seat': ['type', 'seat'] };
        if (!Object.hasOwn(allowed, command?.type)) return reject('Only validated aircraft requests are allowed');
        fields(command, allowed[command.type]);
        const result = authority.request(c.id, clone(command)); publish(); return clone(result);
      });
    },
    attack(connection, command) {
      return locked(() => {
        const c = client(connection); fields(command, ['weapon']);
        if (paused) return reject('Session paused');
        if (!idOK(command.weapon)) throw new TypeError('Invalid weapon identity');
        const safe = authority.snapshot(c.team), player = safe.players.find(p => p.id === c.id);
        const aircraft = safe.aircraft.find(a => a.id === player?.aircraft);
        if (safe.outcome) return reject('Intermission');
        if (!aircraft || aircraft.seats[0] !== c.id || player.seat !== 0) return reject('Authoritative pilot ownership required');
        if (!aircraft.weapons.some(weapon => weapon.id === command.weapon)) return reject('Weapon not in authoritative aircraft profile');
        const pose = deriveAttack(Object.freeze({ playerId: c.id, team: c.team, aircraft: aircraft.id,
          weapon: command.weapon, tick: safe.tick, round: safe.round }));
        fields(pose, ['origin', 'aim']);
        const launch = { aircraft: aircraft.id, weapon: command.weapon,
          origin: launchVector(pose.origin), aim: launchVector(pose.aim) };
        // This pose came from trusted host flight state, never raw client/browser launch coordinates.
        let accepted;
        try { accepted = authority.launchAircraftAttack(c.id, launch); }
        catch (error) { if (error instanceof TypeError) return reject(error.message); throw error; }
        publish(); return { ok: accepted };
      });
    },
    update(clockLease, input) {
      return locked(() => {
        running();
        if (clockLease !== lease) throw new TypeError('Only current host clock lease may advance authority');
        fields(input, ['sequence', 'elapsedMs']);
        if (!Number.isSafeInteger(input.sequence) || input.sequence !== sequence+1 ||
            !Number.isInteger(input.elapsedMs) || input.elapsedMs < 0 || input.elapsedMs > 250)
          throw new TypeError('Unique sequential clock input and integer elapsedMs 0..250 required');
        sequence = input.sequence;
        let steps = 0;
        if (!paused) pendingMs += input.elapsedMs;
        try {
          while (!paused && pendingMs >= LIMITS.tickMs) {
            const state = authority.snapshot(0);
            if (stepAircraft) stepAircraft(Object.freeze({ dtMs: LIMITS.tickMs, tick: state.tick, round: state.round,
              ...(state.environment ? { environment: clone(state.environment) } : {}) }));
            authority.advance(LIMITS.tickMs); pendingMs -= LIMITS.tickMs; steps++;
          }
        } catch (error) { status = 'faulted'; lease = null; throw error; }
        publish();
        return { steps, tick: authority.snapshot(0).tick, pendingMs, viewFailures };
      });
    },
    setPaused(actor, value) {
      owner(actor);
      return locked(() => { running(); if (typeof value !== 'boolean') throw new TypeError('Boolean pause required'); paused = value; publish(); });
    },
    snapshot(connection) {
      return locked(() => { const c = client(connection); return clone(authority.snapshot(c.team)); });
    },
    leave(connection) {
      return locked(() => {
        const c = client(connection);
        const released = authority.request(c.id, { type: 'leave' });
        clients.delete(c.id); closeView(c); publish();
        // Core may decline release during intermission; no claim that a seat was released then.
        return { ok: true, released: released.ok, ...(released.ok ? {} : { releasePending: released.error }) };
      });
    },
    dispose(actor) {
      owner(actor);
      return locked(() => {
        if (status === 'disposed') return;
        for (const c of clients.values()) closeView(c);
        clients.clear(); registered.clear(); authority = null; lease = null; pendingMs = 0; paused = false;
        status = 'disposed';
      });
    },
    stats: () => ({ status, generation, clients: clients.size, paused, sequence, pendingMs, viewFailures }),
  };
  return Object.freeze(api);
}
