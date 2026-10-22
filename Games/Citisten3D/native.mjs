import { createWorld } from './world.mjs';
import { createSimulation } from './sim.mjs';
import { createUI } from './ui.mjs';
import { applyTool, syncModels } from './native-actions.mjs';

const canvas = document.querySelector('#world'), root = document.querySelector('#ui');
const panel = document.querySelector('#native-controls'), feedback = document.querySelector('#feedback');
const speed = document.querySelector('#speed'), loading = document.querySelector('#loading');
let world, sim, ui, tool = 'road', paused = true, resumeSpeed = 1, frame = 0, last = 0, drag = null, closed = false;
const models = new Map(), abort = new AbortController();
const listen = (node, name, fn, options = {}) => node.addEventListener(name, fn, { ...options, signal: abort.signal });
const message = text => { feedback.textContent = text; };
const active = () => sim && !paused && sim.state.phase !== 'lost';
function choose(type) { tool = type; ui.setTool(type); message(type === 'road' ? 'Drag a road: $10/lot' : type); }
function start(mode) {
  if (!world.loaded) throw new Error('Models are not ready');
  for (const handle of models.values()) world.buildings.remove(handle);
  models.clear();
  for (const key of [...world.roads.cells]) { const { x, z } = world.roads.cell(key); world.roads.set(x, z, false); }
  sim = createSimulation({ size: world.roads.size, mode, roads: world.roads });
  paused = false; resumeSpeed = 1; speed.value = '1'; drag = null;
  panel.hidden = false; choose('road');
  world.controls.setPose({ x: 5, y: 170, z: 200, yaw: 0, pitch: -.72 }, true);
  syncModels(world, sim.state, models); ui.update(sim.state, { roads: world.roads, size: world.roads.size });
}
function pause() { if (!sim) return; resumeSpeed = sim.state.speed; sim.setSpeed(0); paused = true; drag = null; }
function resume() { if (!sim) return; sim.setSpeed(resumeSpeed); paused = false; canvas.focus(); }
function stop() {
  if (closed) return;
  closed = true; cancelAnimationFrame(frame); abort.abort(); ui?.destroy(); world?.dispose();
}
function tick(now) {
  if (closed) return;
  const dt = last ? Math.max(0, Math.min(.25, (now - last) / 1000)) : 0; last = now;
  if (sim) {
    if (!paused) sim.update(dt);
    const events = sim.drainEvents();
    ui.events(events);
    for (const event of events) if (event.type === 'shot') world.effects.shot({ ...event.from, y: event.source === 'tower' ? 10 : 1.5 }, { ...event.to, y: 1.2 });
    syncModels(world, sim.state, models);
    world.dayNight.setPhase(sim.state.phase === 'day' ? .5 : 0);
    ui.update(sim.state, { roads: world.roads, size: world.roads.size });
  }
  world.render(dt); frame = requestAnimationFrame(tick);
}
try {
  world = createWorld(canvas, { size: 200 });
  await world.ready;
  if (!closed) {
    ui = createUI(root, { onStart: start, onRestart: start, onTool: choose, onMenu: pause, onResume: resume });
    loading.hidden = true;
    // Read-only diagnostics for native QA; gameplay never depends on this object.
    window.citisten = Object.freeze({ world, get sim() { return sim; }, get tool() { return tool; } });
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
      message(result.reason || (result.ok ? 'Placed' : 'Cannot place here'));
    });
    for (const event of ['pointercancel', 'lostpointercapture']) listen(canvas, event, () => { drag = null; });
    const shortcuts = { Digit1: 'road', Digit2: 'residential', Digit3: 'commercial', Digit4: 'industrial', Digit5: 'power', Digit6: 'water', Digit7: 'police', Digit8: 'fire', Digit9: 'park', KeyB: 'wall', KeyN: 'watchtower', KeyX: 'bulldoze' };
    listen(window, 'keydown', event => {
      if (!active() || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,select,button,dialog')) return;
      if (shortcuts[event.code]) { choose(shortcuts[event.code]); event.preventDefault(); }
      if (event.code === 'Escape') { pause(); ui.showMenu(); event.preventDefault(); }
    });
    listen(speed, 'change', () => { if (sim && !paused) { sim.setSpeed(Number(speed.value)); resumeSpeed = sim.state.speed; } });
    listen(document.querySelector('#repair'), 'click', () => { if (active()) { tool = 'repair'; message('Tap a damaged lot to repair during daytime'); } });
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
    frame = requestAnimationFrame(tick);
  }
} catch (error) {
  stop(); loading.hidden = false; loading.textContent = `Town could not start: ${error.message}. Reload to retry.`;
  console.error(error);
}
window.addEventListener('pagehide', stop, { once: true });
