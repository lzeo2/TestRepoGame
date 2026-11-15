import { isWorkoutKind } from './interior-activities.js';

const KEY_LABEL = Object.freeze({ x: 'X', y: 'Y', up: '↑', xy: 'X + Y' });
const NODE_NAMES = ['panel', 'done', 'sequence', 'cue', 'grip', 'window', 'title', 'prompt', 'progress', 'score', 'start', 'cancel'];
const EMPTY_STATE=Object.freeze({}),EMPTY_SEQUENCE=Object.freeze([]);

// Presentation only: the controller drains activity events before supplying snapshots.
export function createActivityUI({ document = globalThis.document } = {}) {
  const nodes = Object.fromEntries(NODE_NAMES.map(name => [name, document.getElementById(`activity-${name}`)]));
  const buttons = [...document.querySelectorAll('[data-mini]')];
  let tiles = [], sequenceKeys = [], disposed = false;
  const counts = { renders: 0, writes: 0, sequenceBuilds: 0 };
  function set(node, property, value) {
    if (node[property] !== value) { node[property] = value; counts.writes++; }
  }
  function text(node, value) { set(node, 'textContent', String(value ?? '')); }
  function attribute(node, name, value) {
    if (node.getAttribute(name) === value) return;
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
    counts.writes++;
  }
  function toggle(node, name, enabled) {
    if (node.classList.contains(name) !== enabled) { node.classList.toggle(name, enabled); counts.writes++; }
  }
  function render({ street = null, state = EMPTY_STATE, nearest = null, interior = null, sandbox = false, fitnessLevel = 0, gymPrice = 120 } = {}) {
    if (disposed) return;
    counts.renders++;
    // A retained terminal snapshot must not leave live controls after leaving its room.
    if (!street && !interior) { state = EMPTY_STATE; nearest = null; }
    const sequence = state.sequence || EMPTY_SEQUENCE, index = state.index || 0, active = !!state.active;
    if (sequence.length !== sequenceKeys.length || sequence.some((key, i) => key !== sequenceKeys[i])) {
      sequenceKeys = [...sequence];
      tiles = sequence.map(key => {
        const tile = document.createElement('kbd');
        text(tile, KEY_LABEL[key] || key);
        attribute(tile, 'data-key', String(key));
        return tile;
      });
      nodes.sequence.replaceChildren(...tiles); counts.writes++; counts.sequenceBuilds++;
    }
    for (let i = 0; i < tiles.length; i++) {
      set(tiles[i], 'className', i < index ? 'done' : i === index ? 'current' : 'upcoming');
      attribute(tiles[i], 'aria-current', i === index ? 'step' : null);
    }
    text(nodes.cue, !active ? '' : state.instruction || (state.requiresGrip && state.phase === 'grip' ? 'HOLD X + Y' : state.memorising ? 'READ THE SEQUENCE' : state.phase === 'lift' ? 'HOLD X + Y' : state.phase === 'prepare' ? 'WAIT' : state.expectedKey ? `PRESS ${KEY_LABEL[state.expectedKey]}` : state.kind === 'rest' ? 'REST' : 'WAIT'));
    attribute(nodes.cue, 'data-ready', String(state.phase === 'cue' || state.acceptsInput === true));
    text(nodes.grip, state.kind === 'rower' ? (state.phase === 'drive' ? 'Hold X + Y' : state.phase === 'release' ? 'Release X + Y' : '') : state.requiresGrip ? 'Keep X + Y held' : '');
    set(nodes.window, 'hidden', !active || !state.cueWindow || state.phase !== 'cue');
    set(nodes.window, 'max', state.cueWindow || 1);
    set(nodes.window, 'value', state.cueRemaining || 0);
    toggle(nodes.panel, 'preview', !street && !state.kind);
    toggle(nodes.panel, 'finished', !street && !!state.kind && !active);
    set(nodes.done, 'hidden', !!street || active || !state.kind);
    set(nodes.panel, 'hidden', !street && (!interior || (!state.kind && !nearest)));
    text(nodes.title, active || state.kind ? state.label : nearest?.label || '');
    text(nodes.prompt, street ? (sequence.length ? 'Release between presses. E cancels.' : state.prompt) : state.kind ? (state.instruction || state.prompt) : 'E, Q or Play starts this activity.');
    set(nodes.progress, 'hidden', !!street);
    set(nodes.progress, 'value', state.progress || 0);
    text(nodes.score, street ? `${index}/${sequence.length || 8} · ${state.mistakes || 0}/${state.maxMistakes || 2} mistakes` : state.kind ? `${state.score} points${isWorkoutKind(state.kind) ? ` · ${state.reps}/${state.kind === 'treadmill' ? 12 : 6} reps` : ''}` : '');
    let startText = !sandbox && interior?.storeId && ['noodle', 'stock'].includes(nearest?.kind) ? `Work · +$${nearest.kind === 'noodle' ? 60 : 45}` : 'Play';
    if (isWorkoutKind(nearest?.kind)) startText = sandbox || fitnessLevel >= 3 ? 'Practice' : `Train · $${(gymPrice || 120) * (fitnessLevel + 1)}`;
    text(nodes.start, startText);
    set(nodes.start, 'hidden', active);
    set(nodes.start, 'disabled', !nearest);
    set(nodes.cancel, 'hidden', !active);
    for (const button of buttons) set(button, 'disabled', !active);
  }
  return Object.freeze({ render, clear: () => render(), dispose: () => { disposed = true; }, get stats() { return Object.freeze({ ...counts }); } });
}
