import {webEngine} from './vendor/sprig/web/index.js';
import {createTagGame} from './game.js';

const canvas = document.querySelector('#arena');
const pauseButton = document.querySelector('#pause');
const restartButton = document.querySelector('#restart');
const pads = [...document.querySelectorAll('[data-key]')];
let engine = null, game = null, terminal = false;
let lastStatus = '';
function feedback(state) {
  document.querySelector('#red-score').textContent = `Red ${state.redScore}`;
  document.querySelector('#blue-score').textContent = `Blue ${state.blueScore}`;
  document.querySelector('#clock').textContent = state.paused ? 'Paused' : `${state.remaining.toFixed(1)}s`;
  document.querySelector('#round').textContent = `Arena ${state.arena} / 14`;
  const status = state.paused ? 'Paused. Resume when both players are ready.' : state.message;
  if (status !== lastStatus) { document.querySelector('#status').textContent = status; lastStatus = status; }
  pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  pauseButton.disabled = state.phase === 'won';
  pads.forEach(button => { button.disabled = state.paused || state.phase !== 'round'; });
  if (state.phase === 'won' && !terminal) {
    terminal = true;
    engine.cleanup();
    engine.api.render();
  }
}
function cleanup() {
  game?.cleanup(); engine?.cleanup();
  game = engine = null;
}
function start() {
  cleanup(); terminal = false;
  document.querySelector('#menu').hidden = true;
  engine = webEngine(canvas);
  game = createTagGame(engine.api, feedback);
  restartButton.disabled = false;
  canvas.focus();
}
document.querySelector('#start').addEventListener('click', start);
restartButton.addEventListener('click', start);
pauseButton.addEventListener('click', () => {
  game?.pause(!game.snapshot().paused);
  if (!game?.snapshot().paused) canvas.focus();
});
pads.forEach(button => {
  // Pointer input and accessible button activation share the native Sprig key path.
  button.addEventListener('pointerdown', event => {
    if (button.disabled) return;
    event.preventDefault();
    canvas.focus({preventScroll: true});
    canvas.dispatchEvent(new KeyboardEvent('keydown', {key: button.dataset.key, bubbles: true, cancelable: true}));
  });
  button.addEventListener('click', event => {
    if (event.detail === 0 && !button.disabled)
      canvas.dispatchEvent(new KeyboardEvent('keydown', {key: button.dataset.key, bubbles: true, cancelable: true}));
  });
  button.disabled = true;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game?.pause(true);
});
window.addEventListener('pagehide', cleanup);
// Read-only diagnostics: copied/frozen positions, no state setter or input shortcut.
Object.defineProperty(window, 'tagRelaySnapshot', {
  get: () => Object.freeze({...game?.snapshot(), texts: engine?.state.texts.length ?? 0}),
  configurable: false
});
