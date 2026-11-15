// Observes controller facts only. This owner has no input, world, clock or save access.
export const TUTORIAL_STEPS = Object.freeze([
  { id: 'look', title: 'Look around', instruction: 'Drag the view to look around.' },
  { id: 'walk', title: 'Take a short walk', instruction: 'Use WASD or the arrow keys to walk a few metres.' },
  { id: 'phone', title: 'Open your phone', instruction: 'Press T or tap Phone to open your phone.' },
  { id: 'enter-car', title: 'Get into a car', instruction: 'Walk beside your car and press E to get in.' },
  { id: 'drive', title: 'Drive a little', instruction: 'Use W or the up arrow to drive at least 10 metres.' },
  { id: 'brake', title: 'Come to a stop', instruction: 'Release the accelerator and use S or the down arrow to stop.' },
  { id: 'map-route', title: 'Choose a route', instruction: 'Open Map with M, choose a destination and set a route.' },
  { id: 'shops', title: 'Find the shops', instruction: 'Press K or open Shops from Pause to see nearby services.' },
  { id: 'jobs', title: 'Find something to do', instruction: 'Press J or open Jobs from Pause to see your available work.' }
].map(step => Object.freeze(step)));

const SERIALS = Object.freeze({ look: 'orbitSerial', phone: 'phoneSerial', 'map-route': 'mapRouteSerial', shops: 'shopsSerial', jobs: 'jobsSerial' });
const MAX_EVENTS = 32;
const validSerial = value => Number.isSafeInteger(value) && value >= 0;
const validPose = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const copyPose = pose => validPose(pose) ? { x: pose.x, z: pose.z } : null;

function readPreference(saved) {
  if (saved == null) return { status: 'idle', index: 0 };
  if (typeof saved !== 'object' || Array.isArray(saved)) return null;
  const proto = Object.getPrototypeOf(saved);
  if (proto !== Object.prototype && proto !== null) return null;
  const keys = Reflect.ownKeys(saved);
  if (keys.length !== 3 || !['version', 'status', 'index'].every(key => keys.includes(key))) return null;
  // Accept JSON-shaped data, without invoking caller accessors.
  const fields = Object.getOwnPropertyDescriptors(saved);
  if (keys.some(key => !Object.hasOwn(fields[key], 'value'))) return null;
  const version = fields.version.value, status = fields.status.value, index = fields.index.value;
  if (version !== 1 || !Number.isInteger(index)) return null;
  if (status === 'idle' && index === 0) return { status, index };
  if (status === 'complete' && index === TUTORIAL_STEPS.length) return { status, index };
  if ((status === 'active' || status === 'skipped') && index >= 0 && index < TUTORIAL_STEPS.length) return { status, index };
  return null;
}

export function createTutorial(saved = null) {
  const preference = readPreference(saved);
  let status = preference?.status || 'idle', index = preference?.index || 0;
  let active = false, distance = 0, anchor = null, baseline = null, suspended = false;
  let mode = null, speed = 0;
  const events = [];

  function emit(event) {
    // A normal run emits at most 12 events. Repeated explicit replays are bounded too.
    if (events.length === MAX_EVENTS) events.shift();
    events.push(Object.freeze(event));
  }

  function serialize() { return Object.freeze({ version: 1, status, index }); }
  function preferenceEvent() { emit({ type: 'preference', ...serialize() }); }
  function facts(ctx) {
    mode = ctx?.mode === 'foot' || ctx?.mode === 'vehicle' ? ctx.mode : null;
    speed = Number.isFinite(ctx?.speed) ? Math.abs(ctx.speed) : 0;
  }
  function setBaseline(ctx) {
    facts(ctx);
    const key = SERIALS[TUTORIAL_STEPS[index]?.id];
    baseline = key && validSerial(ctx?.[key]) ? ctx[key] : null;
    const wantedMode = TUTORIAL_STEPS[index]?.id === 'walk' ? 'foot' : 'vehicle';
    anchor = mode === wantedMode ? copyPose(ctx?.pose) : null;
    suspended = false;
  }
  function stage(ctx) {
    distance = 0;
    setBaseline(ctx);
    emit({ type: 'stage', id: TUTORIAL_STEPS[index].id, index });
  }
  function advance(ctx) {
    index++;
    if (index < TUTORIAL_STEPS.length) stage(ctx);
    else {
      status = 'complete'; active = false; anchor = null; baseline = null;
      emit({ type: 'complete', index });
    }
  }

  function snapshot() {
    const step = status === 'active' ? TUTORIAL_STEPS[index] : null;
    let instruction = step?.instruction || '';
    if (step?.id === 'walk' && mode !== 'foot') instruction = 'Press E to stop, then E again to get out. Walk a few metres with WASD.';
    if ((step?.id === 'drive' || step?.id === 'brake') && mode !== 'vehicle') instruction = 'Walk beside your car and press E to get in.';
    const target = step?.id === 'walk' ? 2 : step?.id === 'drive' ? 10 : 0;
    return Object.freeze({ status, active, index, total: TUTORIAL_STEPS.length,
      step: step?.id || null, title: step?.title || (status === 'complete' ? 'Ready to explore' : ''),
      instruction, progress: target ? Math.min(1, distance / target) : 0,
      distance, savedValid: preference !== null });
  }

  // start deliberately resets even a completed run. A saved active run requires resume.
  function start(ctx = {}) {
    status = 'active'; index = 0; active = true;
    stage(ctx); preferenceEvent();
    return snapshot();
  }
  function resume(ctx = {}) {
    if (status === 'active' && !active) {
      active = true; stage(ctx); preferenceEvent();
    }
    return snapshot();
  }
  function skip() {
    if (status !== 'complete' && status !== 'skipped') {
      status = 'skipped'; active = false; anchor = null; baseline = null;
      preferenceEvent();
    }
    return snapshot();
  }

  function movement(ctx, dt, wantedMode) {
    if (mode !== wantedMode || !validPose(ctx?.pose)) { anchor = null; return 0; }
    const previous = anchor;
    anchor = copyPose(ctx.pose);
    if (!previous) return 0;
    const moved = Math.hypot(anchor.x - previous.x, anchor.z - previous.z);
    // Reject relocation, entry offsets and implausible supplied poses. Re-anchor in place.
    const limit = wantedMode === 'foot' ? dt * 12 + .25 : Math.min(20, speed * dt * 2 + .5);
    return moved <= limit ? moved : 0;
  }
  function observe(ctx, dt) {
    if (!active) return snapshot();
    if (!Number.isFinite(dt) || dt <= 0 || ctx?.started !== true || ctx.paused || ctx.recovering || ctx.interior || ctx.cutscene) {
      suspended = true;
      return snapshot();
    }
    const step = TUTORIAL_STEPS[index];
    facts(ctx);
    // Facts that changed during a freeze cannot become credit on the next frame.
    if (suspended) { setBaseline(ctx); return snapshot(); }
    dt = Math.min(dt, .1);
    const key = SERIALS[step.id];
    if (key) {
      const serial = ctx?.[key];
      if (!validSerial(serial)) { baseline = null; return snapshot(); }
      if (baseline !== null && serial > baseline) advance(ctx);
      else baseline = serial;
    } else if (step.id === 'walk') {
      distance += movement(ctx, dt, 'foot');
      if (distance >= 2) advance(ctx);
    } else if (step.id === 'enter-car') {
      if (mode === 'vehicle') advance(ctx);
    } else if (step.id === 'drive') {
      const moved = movement(ctx, dt, 'vehicle');
      if (Number.isFinite(ctx?.speed) && speed >= 3) distance += moved;
      if (distance >= 10) advance(ctx);
    } else if (step.id === 'brake' && mode === 'vehicle' && Number.isFinite(ctx?.speed) && speed <= .6) advance(ctx);
    return snapshot();
  }

  // Menus pause the world. The controller calls this only after the named user
  // action actually succeeds; it never supplies elapsed time or movement credit.
  function observeMenu(ctx, menu) {
    if (active && ctx?.paused) suspended = true;
    const step = TUTORIAL_STEPS[index];
    if (!active || !['phone', 'map-route', 'shops', 'jobs'].includes(menu) || step?.id !== menu
      || ctx?.started !== true || ctx.recovering || ctx.interior || ctx.cutscene) return snapshot();
    const serial = ctx[SERIALS[menu]];
    if (!validSerial(serial)) return snapshot();
    if (baseline !== null && serial > baseline) advance(ctx);
    else baseline = serial;
    if (ctx.paused) suspended = true;
    return snapshot();
  }

  return Object.freeze({ start, resume, observe, observeMenu, skip, serialize, snapshot,
    drainEvents: () => Object.freeze(events.splice(0)) });
}
