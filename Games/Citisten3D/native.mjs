import { createWorld } from './world.mjs';
import { createSimulation, BUILDINGS } from './sim.mjs';
import { createUI, buildingLabel } from './ui.mjs';
import { applyTool, syncModels } from './native-actions.mjs';
import { readSave, saveTown, SAVE_KEY } from './persistence.mjs';
import { createNativeLoop } from './native-loop.mjs';
import { phaseForState } from './daynight.mjs';
import { weatherAt } from './atmosphere.mjs';
import { initialTownPose } from './camera.mjs';
import { createMotionDiagnostic } from './motion-diagnostic.mjs';
import { createRenderMotionSampler } from './render-motion-sample.mjs';

const canvas = document.querySelector('#world'), root = document.querySelector('#ui');
const panel = document.querySelector('#native-controls'), feedback = document.querySelector('#feedback');
const speed = document.querySelector('#speed'), loading = document.querySelector('#loading');
let world, sim, ui, loop, motionDiagnostic, motionSampler;
let tool = 'road', paused = true, resumeSpeed = 1, drag = null, closed = false;
let lastSaveTime = 0, savedTown = null, requestedSave;
let townOptions = { seed: 1, scenario: 'balanced' };
const skip = document.querySelector('#skip-night');
const weather = document.querySelector('#weather');
let saveButton, continueButton, restartButton, saveStatus;
const models = new Map(), abort = new AbortController();
const listen = (node, name, fn, options = {}) => node.addEventListener(name, fn, { ...options, signal: abort.signal });
const wake = () => loop?.wake();
const message = text => { feedback.textContent = text; wake(); };
const active = () => sim && !paused && sim.state.phase !== 'lost';
function choose(type) {
  tool = type; ui.setTool(type);
  const hints = { road: 'Road selected. Click or drag dry lots: $10/lot.', bridge: 'Bridge selected. Drag between two dry banks.', bulldoze: 'Bulldoze selected. Click a lot to remove.', upgrade: 'Upgrade selected. Click a completed building.', 'rotate-wall': 'Rotate selected. Click a completed wall.' };
  message(hints[type] || `${buildingLabel(type)} selected. Click an empty dry lot${BUILDINGS[type]?.roadRequired ? ' beside a road' : ''}.`);
}
function placementMessage(result) {
  if (result.reason) return result.reason;
  const building = result.building, name = buildingLabel(building?.type || tool);
  if (!result.ok) return `Cannot place ${name || 'here'}.`;
  if (building) return building.constructionRemaining > 0 ? `${name}: construction started (${building.constructionRemaining}s).` : `${name} placed.`;
  if (tool === 'bulldoze') return `Lot removed${result.refund ? `; $${result.refund} refunded` : ''}.`;
  return tool === 'repair' ? `Lot repaired${result.cost ? `: $${result.cost}` : ''}.` : 'Action completed.';
}
function validateSave(snapshot) {
  if (snapshot.state.size !== world.roads.size) throw new RangeError('Save uses a different town size');
  createSimulation({ snapshot });
}
function showMotionReport(report) {
  motionSampler = null;
  document.querySelector('#motion-check').disabled = false;
  const status = document.querySelector('#motion-status'), output = document.querySelector('#motion-report');
  status.textContent = report.sampleCount
    ? `Recorded ${report.sampleCount} existing frames${report.partial ? ' with partial coverage' : ''}. Sampled motion is not a visual stability test.`
    : 'No frame samples captured. Rendering stability is not verified.';
  output.value = JSON.stringify(report, null, 2); output.hidden = false;
}
function recordMotion() {
  if (!sim || !world.loaded || motionDiagnostic.isRunning) return;
  motionSampler = createRenderMotionSampler(world, canvas, { getState: () => sim?.state });
  document.querySelector('#motion-check').disabled = true;
  document.querySelector('#motion-status').textContent = 'Recording up to 5 seconds. Leave controls still to check idle movement.';
  document.querySelector('#motion-report').hidden = true;
  if (!motionDiagnostic.start()) {
    motionSampler = null; document.querySelector('#motion-check').disabled = false;
  }
}
function startNewTown(mode, options) {
  let replacesTown = Boolean(sim || savedTown);
  try { replacesTown ||= localStorage.getItem(SAVE_KEY) !== null; }
  catch { /* Unavailable storage must not prevent a first town from starting. */ }
  if (replacesTown && !window.confirm('Start a new town? Unsaved progress will be lost. Saving or autosaving the new town will replace this device\'s saved town.')) return false;
  start(mode, undefined, options);
  return true;
}
function start(mode, snapshot, options) {
  if (!['free', 'defense'].includes(mode)) throw new RangeError('Unknown mode');
  if (options && (!Number.isInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff || !['balanced', 'fertile', 'mineral'].includes(options.scenario))) throw new RangeError('Invalid new-town options');
  if (!world.loaded) throw new Error('Models are not ready');
  // Restore/validate before removing the current city's models or roads.
  if (snapshot) validateSave(snapshot);
  if (motionDiagnostic?.cancel()) showMotionReport(motionDiagnostic.report);
  world.eventEffects?.clear();
  for (const handle of models.values()) world.buildings.remove(handle);
  models.clear();
  for (const key of [...world.roads.cells]) { const { x, z } = world.roads.cell(key); world.roads.set(x, z, false); }
  sim = createSimulation({ size: world.roads.size, mode, roads: world.roads, snapshot, terrainLayout: options ? 'river-v1' : townOptions.terrainLayout || 'river-v1', terrainSeed: options ? options.seed : townOptions.terrainSeed, timedConstruction: true, progressionEnabled: true, expansionEnabled: true, seed: (options || townOptions).seed, scenario: (options || townOptions).scenario });
  townOptions = { seed: sim.state.economy?.seed ?? snapshot?.runtime.eventSeed ?? options?.seed ?? townOptions.seed, scenario: sim.state.economy?.scenario ?? options?.scenario ?? townOptions.scenario, terrainLayout: sim.state.terrainLayout, terrainSeed: sim.state.terrainSeed };
  world.setTerrain(sim.state.terrainLayout, sim.state.terrainSeed);
  world.roadPool.sync(true); world.streetLamps.update(1 - world.dayNight.daylight, true);
  paused = false; resumeSpeed = sim.state.speed; speed.value = String(resumeSpeed); drag = null;
  lastSaveTime = sim.state.time;
  if (saveButton) { saveButton.disabled = false; restartButton.hidden = false; }
  panel.hidden = false; choose('road');
  world.controls.setPose(initialTownPose(world.roads, sim.terrain, canvas.clientWidth, canvas.clientHeight, world.camera.fov), true);
  syncModels(world, sim.state, models);
  for (const b of sim.state.buildings) {
    const handle = models.get(`building:${b.id}`);
    if (handle) world.buildings.setOperational?.(handle, !sim.effectsFor(b).powerOut);
  }
  world.eventEffects?.sync(sim.state);
  ui.update(sim.state, { roads: world.roads, size: world.roads.size, terrain: sim.terrain });
}
function pause() { if (!sim || paused) return; resumeSpeed = sim.state.speed; sim.setSpeed(0); paused = true; drag = null; wake(); }
function save() {
  if (!sim) return;
  const result = saveTown(sim, { speed: paused ? resumeSpeed : sim.state.speed });
  lastSaveTime = sim.state.time;
  saveStatus.textContent = result.ok ? 'Town saved on this device.' : result.error;
  if (result.ok) { savedTown = readSave().snapshot; continueButton.hidden = !savedTown; continueButton.dataset.mode = savedTown?.state.mode || 'free'; }
  message(saveStatus.textContent);
}
function skipNight() {
  if (!active() || skip.disabled) return;
  if (sim.skipToNight()) message('Day advanced to the nightfall warning.');
}
function repairEvent(id) {
  const event = sim?.state.cityEvents.find(event => event.id === id && event.type === 'water-main-burst');
  if (!active() || !event) return;
  const [x, z] = event.district.split(',').map(Number);
  const result = applyTool(sim, 'repair', { x: x * 8, z: z * 8 });
  message(result.reason || (result.ok ? 'Water main repaired' : 'Cannot repair now'));
}
function resume() { if (!sim) return; sim.setSpeed(resumeSpeed); paused = false; canvas.focus(); wake(); }
function stop() {
  if (closed) return;
  closed = true; loop?.stop(); motionDiagnostic?.dispose(); motionSampler = null;
  abort.abort(); ui?.destroy(); world?.dispose();
}
// Register before asset loading so navigating away also releases pending loads.
window.addEventListener('pagehide', stop, { once: true });
function tick(dt) {
  if (sim) {
    if (!paused) sim.update(dt);
    skip.hidden = sim.state.mode !== 'defense';
    skip.disabled = paused || sim.state.phase !== 'day' || sim.state.dayRemaining <= 60 || sim.state.rebuildRemaining > 0;
    if (sim.state.time - lastSaveTime >= 60) save();
    const events = sim.drainEvents();
    ui.events(events);
    for (const event of events) if (event.type === 'shot') world.effects.shot({ ...event.from, y: event.source === 'tower' ? 10 : 1.5 }, { ...event.to, y: 1.2 });
    syncModels(world, sim.state, models);
    for (const b of sim.state.buildings) {
      const handle = models.get(`building:${b.id}`);
      if (handle) world.buildings.setOperational?.(handle, !sim.effectsFor(b).powerOut);
    }
    world.eventEffects?.sync(sim.state);
    world.dayNight.approach(phaseForState(sim.state), Math.min(.25, dt));
    world.atmosphere.setWeather(weather.value === 'auto' ? weatherAt(sim.state.time, sim.state.cityEvents.some(e => e.type === 'cold-snap')) : weather.value);
    ui.update(sim.state, { roads: world.roads, size: world.roads.size, terrain: sim.terrain });
  }
  const { position, rotation } = world.camera;
  const before = [position.x, position.y, position.z, rotation.x, rotation.y];
  const shots = world.effects.active;
  world.render(Math.min(.25, dt));
  // Observe existing frames only; recording never keeps the native loop awake.
  motionDiagnostic?.sample();
  const after = [position.x, position.y, position.z, rotation.x, rotation.y];
  // Ignore the asymptotic tail of camera easing, not held-key movement.
  const moving = after.some((value, i) => Math.abs(value - before[i]) > (i < 3 ? .001 : .00001));
  const lightingPending = sim && world.dayNight.isSettled?.(phaseForState(sim.state)) === false;
  return Boolean((sim && !paused && sim.state.speed > 0 && sim.state.phase !== 'lost') || shots || moving || lightingPending);
}
try {
  world = createWorld(canvas, { size: 200 });
  await world.ready;
  if (!closed) {
    motionDiagnostic = createMotionDiagnostic({ readSample: () => motionSampler.sample(), onFinish: showMotionReport });
    ui = createUI(root, { onStart(mode, options) {
      const snapshot = requestedSave; requestedSave = undefined;
      if (snapshot) { start(mode, snapshot); return true; }
      return startNewTown(mode, options);
    }, onRestart: mode => startNewTown(mode),
      onResearch(id) { const result = sim?.research(id); message(result?.reason || (result?.ok ? 'Research started' : 'Cannot research')); return result; },
      onSpecialization(name) { const result = sim?.specialize(name); message(result?.reason || 'Cannot change specialization'); return result; },
      onIncidentResponse(id) { const result = sim?.respondIncident(id); message(result?.reason || 'Cannot respond'); return result; }, onTool: choose, onMenu: pause, onResume: resume, onEventAction: repairEvent });
    loading.hidden = true;
    const menu = root.querySelector('.city-menu-content');
    saveButton = document.createElement('button'); saveButton.textContent = 'Save'; saveButton.disabled = true; saveButton.id = 'save-town';
    continueButton = document.createElement('button'); continueButton.textContent = 'Continue'; continueButton.id = 'continue-town';
    restartButton = document.createElement('button'); restartButton.textContent = 'Restart'; restartButton.dataset.action = 'restart'; restartButton.hidden = true;
    saveStatus = document.createElement('p'); saveStatus.setAttribute('role', 'status'); saveStatus.id = 'save-status';
    const saveActions = document.createElement('div'); saveActions.className = 'city-save-actions';
    saveActions.append(continueButton, saveButton, restartButton); menu.append(saveActions, saveStatus);
    const stored = readSave(); savedTown = stored.snapshot;
    // Full simulation validation catches invalid state before offering Continue.
    if (savedTown) {
      try { validateSave(savedTown); }
      catch (error) { savedTown = null; stored.error = `Saved town unavailable: ${error.message}`; }
    }
    continueButton.hidden = !savedTown; continueButton.dataset.mode = savedTown?.state.mode || 'free'; saveStatus.textContent = stored.error;
    listen(saveButton, 'click', save);
    // Reuse UI's normal recreated-game route, including notice/loss reset and errors.
    listen(continueButton, 'click', () => { requestedSave = savedTown; });
    listen(skip, 'click', skipNight);
    // S overrides camera-back only when this defense action is available.
    listen(window, 'keydown', event => {
      if (event.code !== 'KeyS' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !active() || skip.disabled || skip.hidden || event.target.closest?.('input,textarea,select,button,dialog')) return;
      event.preventDefault(); event.stopImmediatePropagation(); skipNight();
    }, { capture: true });
    root.querySelector('.city-toasts').before(panel);
    loop = createNativeLoop({ update: tick, isHidden: () => document.hidden });
    const setPose = world.controls.setPose;
    world.controls.setPose = (...args) => { setPose(...args); wake(); };
    listen(document, 'visibilitychange', () => { loop.suspend(); drag = null; wake(); });
    // Capture UI events too: panels deliberately stop their propagation.
    for (const event of ['click', 'input', 'change', 'keydown', 'keyup', 'pointerdown', 'pointerup', 'pointercancel', 'wheel', 'resize', 'blur']) listen(window, event, wake, { capture: true, passive: true });
    listen(canvas, 'pointermove', event => { if (event.buttons) wake(); }, { passive: true });
    // Read-only diagnostics for native QA; gameplay never depends on this object.
    window.citisten = Object.freeze({ world, get sim() { return sim; }, get tool() { return tool; },
      get motionReport() { return motionDiagnostic.report; } });
    listen(canvas, 'pointerdown', event => {
      if (!active() || event.button !== 0) return;
      canvas.focus(); drag = { id: event.pointerId, lot: world.pickLot(event.clientX, event.clientY) };
      canvas.setPointerCapture(event.pointerId); event.preventDefault();
    });
    listen(canvas, 'pointerup', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const from = drag.lot; drag = null;
      if (!active()) return;
      const result = applyTool(sim, tool, from, world.pickLot(event.clientX, event.clientY));
      message(placementMessage(result));
    });
    for (const event of ['pointercancel', 'lostpointercapture']) listen(canvas, event, () => { drag = null; });
    const shortcuts = { Digit1: 'road', Digit2: 'residential', Digit3: 'commercial', Digit4: 'industrial', Digit5: 'power', Digit6: 'water', Digit7: 'police', Digit8: 'fire', Digit9: 'park', KeyB: 'wall', KeyR: 'rotate-wall', KeyU: 'upgrade', KeyN: 'watchtower', KeyX: 'bulldoze' };
    listen(window, 'keydown', event => {
      if (!active() || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,textarea,select,button,dialog')) return;
      if (shortcuts[event.code]) { choose(shortcuts[event.code]); event.preventDefault(); }
      if (event.code === 'Escape') { pause(); ui.showMenu(); event.preventDefault(); }
    });
    listen(speed, 'change', () => { if (sim && !paused) { sim.setSpeed(Number(speed.value)); resumeSpeed = sim.state.speed; } });
    listen(weather, 'change', () => message('Weather changes visuals only.'));
    listen(document.querySelector('#motion-check'), 'click', recordMotion);
    listen(document.querySelector('#repair'), 'click', () => { if (active()) { tool = 'repair'; message('Repair selected. Click a damaged lot by day.'); } });
    listen(document.querySelector('#camera-pad'), 'click', event => {
      const action = event.target.closest('[data-camera]')?.dataset.camera;
      if (!action || !active()) return;
      const p = world.controls.target, step = Math.max(10, p.y * .2);
      if (action === 'up' || action === 'down') p.y *= action === 'up' ? 1.3 : 1 / 1.3;
      else if (action === 'turn') p.yaw += Math.PI / 8;
      else { const forward = Number(action === 'forward') - Number(action === 'back'), right = Number(action === 'right') - Number(action === 'left'); p.x += (-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * right) * step; p.z += (-Math.cos(p.yaw) * forward - Math.sin(p.yaw) * right) * step; }
      world.controls.setPose(p);
    });
    // Do not let controls issue camera hotkeys or wheel changes behind panels.
    for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel']) listen(panel, event, e => e.stopPropagation());
    listen(window, 'blur', () => { drag = null; });
    wake();
  }
} catch (error) {
  stop(); loading.hidden = false; loading.textContent = `Town could not start: ${error.message}. Reload to retry.`;
  console.error(error);
}
