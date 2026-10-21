import { createUI } from './ui.mjs';
import { createSimulation } from './sim.mjs';

// Explicit preview boundary: integration owns the world, placement and hotkeys.
const fixture = new URLSearchParams(location.search).has('fixture');
let sim, savedSpeed = 1, last = performance.now();
function start(mode) { if (!fixture) sim = createSimulation({ mode, size: 200 }); }
const ui = createUI(document.querySelector('#ui'), {
  onStart: start, onRestart: start,
  onMenu() { if (sim) { savedSpeed = sim.state.speed; sim.setSpeed(0); } },
  onResume() { sim?.setSpeed(savedSpeed); }
});
window.citistenPreview = { ui }; // Preview-only QA handle, never gameplay state.
if (fixture) document.querySelector('.city-preview-label').textContent = 'UI fixture. Not gameplay evidence.';
function frame(now) {
  if (sim) { sim.update(Math.min((now - last) / 1000, 0.1)); ui.update(sim.state); ui.events(sim.drainEvents()); }
  last = now; requestAnimationFrame(frame);
}
if (!fixture) requestAnimationFrame(frame);
