// Actual Input DOM events + extracted authored controller boundaries; CPU/DOM doubles, not a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
const win = new EventTarget(), doc = new EventTarget();
doc.pointerLockElement = null;
doc.exitPointerLock = () => { doc.pointerLockElement = null; doc.dispatchEvent(new Event('pointerlockchange')); };
globalThis.window = win; globalThis.document = doc;
const inputs = [], failures = [];
const check = (label, fn) => { try { fn(); } catch (e) { failures.push(`${label}: ${e.message}`); } };
try {
  const { Input, CONTROL_SCHEMES } = await import(new URL('src/input.ts', retainedRoot));
  const { settings } = await import(new URL('src/ui/settings.ts', retainedRoot));
  const { forward, NEUTRAL_INPUT } = await import(new URL('src/sim/flight.ts', retainedRoot));
  const { VEHICLES, AIRCRAFT_KINDS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { worldQuery, setFleetState } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const game = readFileSync(new URL('src/ui/game.ts', retainedRoot), 'utf8');
  const modeLine = game.match(/^    const mode = .*input\.pilotMouseMode\(.*$/m)?.[0];
  assert(modeLine, 'execute the actual controller mouse-role callsite');
  const role = new Function('input', 'seat', 'myVehicle', `${modeLine}; input.mouseMode = mode; return mode;`);
  const make = () => {
    const canvas = { requestPointerLock() { doc.pointerLockElement = canvas; doc.dispatchEvent(new Event('pointerlockchange')); } };
    const input = new Input(canvas); inputs.push(input); input.setEnabled(true); input.requestLock();
    const event = (type, values = {}) => {
      const e = new Event(type, { cancelable: true });
      for (const [k, v] of Object.entries({ target: canvas, ...values })) Object.defineProperty(e, k, { value: v });
      win.dispatchEvent(e);
    };
    event('mousemove', { movementX: 0, movementY: 0 }); // Normal first-delta guard.
    return { input, event };
  };
  for (const scheme of CONTROL_SCHEMES) {
    settings.controlScheme = scheme;
    const { input, event } = make();
    const mode = role.call({ state: 'flying' }, input, 0, { kind: 'speedboat' });
    input.setAim([0, 0, -1]);
    event('mousemove', { movementX: 40, movementY: -20 });
    check(`${scheme} boat cannon mouse aim`, () => {
      assert.equal(mode, 'aim'); assert.equal(input.reticleMode, false);
      assert(input.aimYaw < -0.01 && input.aimPitch > 0.01, 'motion must move cannon aim, not ignored flight sticks');
    });
    event('mousedown', { button: 0 }); event('mouseup', { button: 0 });
    assert.equal(input.boatSeatInput(null, {}).firePrimary, true, 'sub-tick tap retained once');
    check(`${scheme} boat tap release`, () => assert.equal(input.boatSeatInput(null, {}).firePrimary, false));
    event('mousedown', { button: 0 });
    assert.equal(input.boatSeatInput(null, {}).firePrimary, true);
    assert.equal(input.boatSeatInput(null, {}).firePrimary, true, 'held mouse still fires');
    event('mouseup', { button: 0 });
    check(`${scheme} boat held release`, () => assert.equal(input.boatSeatInput(null, {}).firePrimary, false));
    event('keydown', { code: 'KeyW', repeat: false }); event('keydown', { code: 'KeyD', repeat: false });
    const drive = input.boatFlightInput({}); assert.equal(drive.throttle, 1); assert.equal(drive.yaw, 1);
    assert.equal(drive.pitch, 0); assert.equal(drive.roll, 0);
    win.dispatchEvent(new Event('blur'));
    assert.deepEqual(input.boatFlightInput({}), NEUTRAL_INPUT);
    assert.equal(input.boatSeatInput(null, {}).firePrimary, false);
    // Same real Input switches back to the original aircraft scheme, without retaining a boat override.
    const aircraftMode = role.call({ state: 'flying' }, input, 0, { kind: 'fighter' });
    assert.equal(aircraftMode, ['battlefield', 'keys'].includes(scheme) ? 'direct' : 'aim');
    assert.equal(input.reticleMode, scheme === 'keys');
    event('mousedown', { button: 0 }); event('mouseup', { button: 0 });
    assert.equal(input.seatInput(null, {}).firePrimary, true);
    assert.equal(input.seatInput(null, {}).firePrimary, false, 'aircraft tap behavior unchanged');
    input.setEnabled(false); input.dispose();
  }
  assert.deepEqual(AIRCRAFT_KINDS, ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35',
    'f16c', 'mig29', 'typhoon', 'su35s', 'rafale', 'jf17', 'gripen', 'mig31', 'mirage2000',
    'su34', 'fa50', 'yak130', 'hawkt2', 'su25sm', 'a10c', 'f35a', 'j20', 'tu160', 'ah64d', 'mi28n']);
  // Execute the actual live/replay branches with an adapter that rejects any aircraft invocation.
  const liveCall = game.match(/^\s*stepFlight\(p.state, fi, TICK_DT, myVehicle.kind === "speedboat"\n\s*\? boatCollisionWorld\(this.flightWorld, this.latest\?\.vehicles \?\? \[\], myVehicle.id\) : this.flightWorld\)$/m)?.[0];
  const replayCall = game.match(/^\s*const replayWorld = sv.kind === "speedboat" \? boatCollisionWorld\(this.flightWorld, s.vehicles, sv.id\) : this.flightWorld\n\s*for \(const e of h\) stepFlight\(next, e.input, TICK_DT, replayWorld\)$/m)?.[0];
  assert(liveCall && replayCall);
  let steps = 0;
  const step = (_state, _input, _dt, world) => { assert.equal(world, worldQuery); steps++; };
  const noBoatAdapter = () => assert.fail('boat adapter invoked for aircraft');
  for (const kind of AIRCRAFT_KINDS) {
    new Function('stepFlight', 'p', 'fi', 'TICK_DT', 'myVehicle', 'boatCollisionWorld', liveCall)
      .call({ flightWorld: worldQuery }, step, { state: {} }, NEUTRAL_INPUT, 1 / 60, { kind }, noBoatAdapter);
    new Function('stepFlight', 'next', 'h', 'TICK_DT', 'sv', 's', 'boatCollisionWorld', replayCall)
      .call({ flightWorld: worldQuery }, step, {}, [{ input: NEUTRAL_INPUT }], 1 / 60, { kind }, { vehicles: [] }, noBoatAdapter);
  }
  assert.equal(steps, 54);

  // Execute complete lifecycle methods verbatim, without constructing a fake full renderer/session.
  const between = (a, b) => { const start = game.indexOf(a), end = game.indexOf(b, start); assert(start >= 0 && end > start); return game.slice(start, end); };
  const methods = between('  private updateLifeState():', '  private bombAimDir:') +
    between('  private enterSpawn():', '  /** Bomber pilot:') +
    between('  private exit(reason?', '  // ---------------------------------------------------------------- events') +
    between('  private onAction(', '  private buildRenderList(');
  const js = stripTypeScriptTypes(`class Controller { ${methods.replace('import.meta.env.BASE_URL', '"./"')} }`, { mode: 'transform' });
  const Controller = new Function('forward', 'VEHICLES', 'worldQuery', 'setFleetState', `${js}; return Controller;`)(forward, VEHICLES, worldQuery, setFleetState);
  const { input, event } = make();
  let shown = false, closed = 0, exited = 0, frame = 'active';
  const menu = { show() { shown = true; }, hide() { shown = false; }, dispose() {} };
  const vehicle = { alive: true, kind: 'speedboat', flight: { orientation: [0, 0, 0, 1] } };
  const c = Object.assign(new Controller(), { input, state: 'flying', paused: false, me: { seat: 0, team: 0 },
    myVehicle: () => vehicle, hud: { chatOpen: () => false, setVisible() {} }, pause: menu, spawn: menu,
    lastOwnPos: [1, 0, 2], visuals: new Map(), uiRoot: { remove() {} }, offSettings() {}, offline: true,
    conn: { close() { closed++; } }, deps: { onExit() { exited++; }, host: {
      rig: { setMode() {}, resetFollow() {} }, world: { setHighlightTeam() {} },
      effects: { setTracers() {}, setMissiles() {} }, setFrame(value) { frame = value; },
    } } });
  event('keydown', { code: 'KeyW', repeat: false }); event('mousedown', { button: 0 });
  c.onAction('menu'); assert(c.paused && shown);
  assert.deepEqual(input.boatFlightInput({}), NEUTRAL_INPUT); assert.equal(input.boatSeatInput(null, {}).firePrimary, false);
  c.resume(); assert.equal(c.paused, false);
  event('mousemove', { movementX: 0, movementY: 0 });
  event('keydown', { code: 'KeyW', repeat: false }); event('mousedown', { button: 0 });
  vehicle.alive = false; c.updateLifeState(); assert.equal(c.state, 'dead');
  assert.deepEqual(input.boatFlightInput({}), NEUTRAL_INPUT); assert.equal(input.boatSeatInput(null, {}).firePrimary, false);
  c.enterSpawn(); assert.equal(c.state, 'spawn'); assert(shown);
  vehicle.alive = true; c.updateLifeState(); assert.equal(c.state, 'flying');
  assert.deepEqual(input.boatFlightInput({}), NEUTRAL_INPUT); assert.equal(input.boatSeatInput(null, {}).firePrimary, false);
  c.exit(); c.exit(); assert.equal(closed, 1); assert.equal(exited, 1); assert.equal(frame, null);
  // Actual disposed Input listeners must not accept more events, including a menu/new-session transition.
  event('mousedown', { button: 0 }); assert.equal(input.boatSeatInput(null, {}).firePrimary, false);
  const fresh = make(); settings.controlScheme = 'battlefield';
  assert.equal(role.call({ state: 'flying' }, fresh.input, 0, { kind: 'fighter' }), 'direct');
  assert.equal(fresh.input.seatInput(null, {}).firePrimary, false);
  console.log(JSON.stringify({ failures, scope: 'CPU actual Input events/controller lifecycle methods; DOM/host doubles, no physical input or renderer' }));
  assert.deepEqual(failures, [], 'boat input regression');
  console.log('PASS boat mouse aim/release in all four schemes; unchanged aircraft roles/taps; pause/death/spawn/menu disposal and fresh aircraft input.');
} finally { for (const input of inputs) input.dispose(); loader.dispose(); delete globalThis.window; delete globalThis.document; }
