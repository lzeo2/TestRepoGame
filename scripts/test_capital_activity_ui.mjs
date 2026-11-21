import assert from 'node:assert/strict';
import { createActivityUI } from '../Games/Capital Drive/activity-ui.js';

// A DOM-shaped counter records assignments even when their values are unchanged.
// This catches redundant writes rather than only checking the resulting pixels.
function fixture() {
  const counter = { writes: 0, queries: 0, creates: 0 };
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attributes = new Map();
      this.values = { textContent: '', className: '', hidden: false, disabled: false, max: 1, value: 0 };
      for (const name of Object.keys(this.values)) Object.defineProperty(this, name, {
        get: () => this.values[name],
        set: value => { counter.writes++; this.values[name] = value; },
      });
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        toggle: (name, enabled) => {
          const names = new Set(this.className.split(/\s+/).filter(Boolean));
          if (enabled) names.add(name); else names.delete(name);
          this.className = [...names].join(' ');
        },
      };
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) { counter.writes++; this.attributes.set(name, String(value)); }
    removeAttribute(name) { counter.writes++; this.attributes.delete(name); }
    replaceChildren(...children) { counter.writes++; this.children = [...children]; }
  }
  const nodes = Object.fromEntries(['panel', 'done', 'sequence', 'cue', 'grip', 'window', 'title', 'prompt', 'progress', 'score', 'start', 'cancel'].map(name => [name, new Element()]));
  nodes.panel.className = 'panel';
  const buttons = [new Element('button'), new Element('button'), new Element('button')];
  const document = {
    getElementById(id) { counter.queries++; return nodes[id.replace('activity-', '')]; },
    querySelectorAll(selector) { counter.queries++; assert.equal(selector, '[data-mini]'); return buttons; },
    createElement(tag) { counter.creates++; return new Element(tag); },
  };
  const ui = createActivityUI({ document });
  return { ui, nodes, buttons, counter };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function stable(f, input, count = 600) {
  f.ui.render(input);
  const before = { ...f.counter }, builds = f.ui.stats.sequenceBuilds;
  for (let i = 0; i < count; i++) f.ui.render(structuredClone(input));
  assert.deepEqual(f.counter, before, `${count} unchanged frames perform no DOM writes, queries or allocations`);
  assert.equal(f.ui.stats.sequenceBuilds, builds);
}
const f = fixture(), { ui, nodes: n, buttons } = f;
assert.equal(f.counter.queries, 13, 'fixed elements and mini buttons are cached once');
stable(f, {});
assert(n.panel.hidden && n.start.disabled && n.cancel.hidden && n.done.hidden);
assert(buttons.every(button => button.disabled));
assert.equal(n.cue.textContent, '');
assert.equal(n.grip.textContent, '');

const interior = { id: 'room', serviceId: 'gym' };
const nearest = { id: 'bench', kind: 'bench', label: 'Bench press' };
ui.render({ interior, nearest });
assert.equal(n.panel.hidden, false);
assert(n.panel.classList.contains('preview'));
assert.equal(n.title.textContent, 'Bench press');
assert.equal(n.start.textContent, 'Train · $120');
assert.equal(n.prompt.textContent, 'E, Q or Play starts this activity.');
assert(!n.start.hidden && !n.start.disabled && n.done.hidden);
ui.render({ interior, nearest, fitnessLevel: 1, gymPrice: 150 });
assert.equal(n.start.textContent, 'Train · $300');
ui.render({ interior, nearest, fitnessLevel: 3 });
assert.equal(n.start.textContent, 'Practice');
ui.render({ interior, nearest, sandbox: true });
assert.equal(n.start.textContent, 'Practice');
for (const [kind, pay] of [['noodle', 60], ['stock', 45]]) {
  const input = { interior: { storeId: 'shop' }, nearest: { kind, label: kind } };
  ui.render(input); assert.equal(n.start.textContent, `Work · +$${pay}`);
  ui.render({ ...input, sandbox: true }); assert.equal(n.start.textContent, 'Play');
}

const state = freeze({ kind: 'bench', active: true, phase: 'cue', label: 'Bench press', sequence: ['x', 'xy', 'up'], index: 1,
  expectedKey: 'up', requiresGrip: true, cueWindow: .8, cueRemaining: .6, score: 20, reps: 2, progress: .25, prompt: 'Lift' });
const original = structuredClone(state);
const activeInput = freeze({ interior, nearest, state });
ui.render(activeInput);
assert.equal(n.cue.textContent, 'PRESS ↑');
assert.equal(n.cue.getAttribute('data-ready'), 'true');
assert.equal(n.grip.textContent, 'Keep X + Y held');
assert.equal(n.progress.value, .25);
assert.equal(n.window.value, .6);
assert.equal(n.window.max, .8);
assert(!n.window.hidden && !n.cancel.hidden && n.start.hidden && n.done.hidden);
assert(buttons.every(button => !button.disabled));
assert.equal(n.score.textContent, '20 points · 2/6 reps');
assert.deepEqual(n.sequence.children.map(tile => tile.textContent), ['X', 'X + Y', '↑']);
assert.deepEqual(n.sequence.children.map(tile => tile.className), ['done', 'current', 'upcoming']);
assert.deepEqual(n.sequence.children.map(tile => tile.getAttribute('aria-current')), [null, 'step', null]);
stable(f, activeInput); // Paused snapshots continue through the same renderer.
assert.deepEqual(state, original, 'render never mutates the supplied activity snapshot');
const builds = ui.stats.sequenceBuilds, writes = f.counter.writes;
ui.render({ ...activeInput, state: { ...state, progress: .3, cueRemaining: .5 } });
assert.equal(f.counter.writes - writes, 2, 'actual progress/window changes each cause exactly one write');
assert.equal(ui.stats.sequenceBuilds, builds);
ui.render({ ...activeInput, state: { ...state, index: 2 } });
assert.equal(ui.stats.sequenceBuilds, builds, 'advancing a cue reuses the same sequence elements');
assert.deepEqual(n.sequence.children.map(tile => tile.className), ['done', 'done', 'current']);
assert.deepEqual(n.sequence.children.map(tile => tile.getAttribute('aria-current')), [null, null, 'step']);
ui.render({ ...activeInput, state: { ...state, sequence: ['y', 'x'] } });
assert.equal(ui.stats.sequenceBuilds, builds + 1, 'a changed sequence rebuilds once');
stable(f, { ...activeInput, state: { ...state, sequence: ['y', 'x'] } });

for (const [phase, extra, cue] of [
  ['grip', { requiresGrip: true }, 'HOLD X + Y'],
  ['lift', {}, 'HOLD X + Y'],
  ['prepare', {}, 'WAIT'],
  ['memory', { memorising: true }, 'READ THE SEQUENCE'],
  ['cue', { instruction: 'Keep moving', acceptsInput: true }, 'Keep moving'],
]) {
  ui.render({ interior, state: { active: true, kind: 'bench', phase, ...extra } });
  assert.equal(n.cue.textContent, cue);
  assert.equal(n.cue.getAttribute('data-ready'), String(phase === 'cue'));
}
for (const [phase, grip] of [['drive', 'Hold X + Y'], ['release', 'Release X + Y'], ['prepare', '']]) {
  ui.render({ interior, state: { active: true, kind: 'rower', phase, score: 5, reps: 1 } });
  assert.equal(n.grip.textContent, grip);
  assert.equal(n.score.textContent, '5 points · 1/6 reps');
}
ui.render({ interior, state: { active: true, kind: 'treadmill', score: 30, reps: 8 } });
assert.equal(n.score.textContent, '30 points · 8/12 reps');
ui.render({ interior, state: { active: true, kind: 'rest' } });
assert.equal(n.cue.textContent, 'REST');

for (const kind of ['car', 'scooter']) {
  const street = { kind, active: true, phase: 'cue', sequence: ['x', 'y'], expectedKey: 'x', label: `Unlock ${kind}`, index: 1, mistakes: 1, maxMistakes: 3, cueWindow: 1, cueRemaining: .4 };
  ui.render({ street, state: street });
  assert(!n.panel.hidden && n.progress.hidden && n.done.hidden);
  assert(!n.panel.classList.contains('preview') && !n.panel.classList.contains('finished'));
  assert.equal(n.score.textContent, '1/2 · 1/3 mistakes');
  assert.equal(n.prompt.textContent, 'Release between presses. E cancels.');
  stable(f, { street, state: street });
}
const waitingCar = { active: true, kind: 'car', prompt: 'Stay beside the car.' };
ui.render({ street: waitingCar, state: waitingCar });
assert.equal(n.prompt.textContent, 'Stay beside the car.');
assert.equal(n.score.textContent, '');
assert.equal(n.cue.textContent, '');
assert(buttons.every(button=>button.hidden&&button.disabled));
const recall={active:true,kind:'car',phase:'cue',sequence:['x','y'],displaySequence:['?','?'],expectedKey:'x',instruction:'ENTER KEY 1',guidance:'Recall the pattern.'};
ui.render({street:recall,state:recall});
assert.deepEqual(n.sequence.children.map(tile=>tile.textContent),['?','?']);
assert.equal(n.cue.textContent,'ENTER KEY 1');
assert.equal(n.prompt.textContent,'Recall the pattern.');
assert(buttons.every(button=>!button.hidden&&!button.disabled));
stable(f,{street:recall,state:recall});
for (const phase of ['complete', 'failed', 'cancelled']) {
  const terminal = { ...state, phase, active: false };
  ui.render({ interior, state: terminal });
  assert(!n.done.hidden && n.cancel.hidden && n.window.hidden);
  assert(n.panel.classList.contains('finished'));
  assert.equal(n.cue.textContent, '');
  assert(buttons.every(button => button.disabled));
  ui.render({ state: terminal });
  assert(n.panel.hidden && n.done.hidden && n.cancel.hidden, 'leaving the room clears retained terminal controls');
  assert.equal(n.sequence.children.length, 0);
  assert.equal(n.grip.textContent, '');
}
ui.render(activeInput);
ui.clear();
assert(n.panel.hidden && n.done.hidden && n.window.hidden);
assert.equal(n.sequence.children.length, 0);
stable(f, {});
assert(Object.isFrozen(ui.stats));
assert.throws(() => { ui.stats.writes = -1; }, TypeError);
const beforeDispose = { ...f.counter }, stats = ui.stats;
ui.dispose(); ui.render(activeInput); ui.clear(); ui.dispose();
assert.deepEqual(f.counter, beforeDispose, 'disposal and later calls perform no DOM writes');
assert.deepEqual(ui.stats, stats);
console.log(`capital activity UI: PASS; 3600 unchanged renders: zero DOM writes/queries/allocations; fixed cache: ${f.counter.queries} queries; active updates, sequence reuse, workout/street/terminal/leave/disposal verified`);
