import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { createUI } from './ui.mjs';
import { createSimulation } from './sim.mjs';

// Execute the real UI handlers with a deliberately small DOM double. This models
// deferred close delivery, NOT Chromium modal, focus, keyboard or touch behavior.
setMaxListeners(0);
class Element extends EventTarget {
  dataset = {}; style = {}; hidden = false; open = false; textContent = '';
  attributes = new Map(); classes = new Set();
  classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name),
    toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name), contains: name => this.classes.has(name) };
  constructor(queue) { super(); this.queue = queue; }
  focus() {}
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  querySelectorAll() { return []; }
  closest() { return this; }
  showModal() { this.open = true; }
  close() {
    if (!this.open) return;
    this.open = false;
    this.queue.push(() => this.dispatchEvent(new Event('close')));
  }
  replaceChildren() {}
  getContext() { return { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; }
}
function mount({ speed = 1, denied = false, seen = false, mobile = false } = {}) {
  const queue = [], nodes = new Map(), stored = new Map(seen ? [['citisten-tutorial-seen', '1']] : []);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() {
    if (denied === 'access') throw new Error('Storage denied');
    return {
      getItem(key) { if (denied === 'read') throw new Error('Read denied'); return stored.get(key); },
      setItem(key, value) { if (denied) throw new Error('Write denied'); stored.set(key, value); }
    };
  } });
  globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: mobile });
  const root = new Element(queue);
  root.querySelector = selector => {
    if (!nodes.has(selector)) {
      const element = new Element(queue); element.focus = () => { root.focused = element; };
      nodes.set(selector, element);
    }
    return nodes.get(selector);
  };
  const groups = ['Road', 'Zone', 'Service', 'Defense', 'Bulldoze'].map(group => {
    const element = root.querySelector(`[data-group="${group}"]`); element.dataset.group = group; return element;
  });
  root.querySelectorAll = selector => selector === '[data-group]' ? groups : [];
  const tutorial = root.querySelector('.city-tutorial');
  let sim, paused = true, saved = speed, pauses = 0, resumes = 0, tool = 'road';
  const ui = createUI(root, {
    onTool(type) { tool = type; },
    onStart(mode) { sim = createSimulation({ size: 40, mode }); sim.setSpeed(speed); paused = false; },
    // Mirror native's pause/resume contract; native itself is not executed here.
    onMenu() { if (!sim || paused) return; saved = sim.state.speed; sim.setSpeed(0); paused = true; pauses++; },
    onResume() { assert(!tutorial.open, 'dialog closes before integration resumes/focuses'); sim?.setSpeed(saved); paused = false; resumes++; }
  });
  function click(dataset) {
    const button = new Element(queue); button.dataset = dataset;
    const event = new Event('click'); Object.defineProperty(event, 'target', { value: button });
    root.dispatchEvent(event);
  }
  return { ui, root, tutorial, stored, nodes, click,
    get tool() { return tool; },
    flush() { while (queue.length) queue.shift()(); },
    start() { click({ mode: 'free' }); },
    get state() { return { speed: sim?.state.speed, paused, pauses, resumes }; }
  };
}
function dismiss(f, route) {
  if (route === 'Close') f.click({ action: 'tutorial-close' });
  if (route === 'Finish') {
    for (let i = 1; i <= 3; i++) {
      assert.equal(f.nodes.get('.city-tutorial-step').textContent, `Step ${i} of 3`);
      assert.equal(f.nodes.get('[data-action="tutorial-next"]').textContent, i === 3 ? 'Finish' : 'Next');
      f.click({ action: 'tutorial-next' });
    }
  }
  if (route === 'Escape') {
    const event = new Event('cancel', { cancelable: true });
    f.tutorial.dispatchEvent(event); assert(event.defaultPrevented);
  }
  if (route === 'fallback') { f.tutorial.close(); assert.equal(f.state.resumes, 0); f.flush(); }
}
for (const speed of [0, 1, 3, 10]) for (const route of ['Close', 'Finish', 'Escape', 'fallback']) {
  const f = mount({ speed }); f.start();
  assert(f.tutorial.open); assert.deepEqual(f.state, { speed: 0, paused: true, pauses: 1, resumes: 0 });
  f.click({ action: 'tutorial' }); // Duplicate open must not lose the resume entitlement.
  dismiss(f, route);
  assert(!f.tutorial.open);
  assert.deepEqual(f.state, { speed, paused: false, pauses: 1, resumes: 1 }, `${route} at ${speed}x finishes before deferred close`);
  assert.equal(f.stored.get('citisten-tutorial-seen'), '1');
  f.flush(); f.tutorial.dispatchEvent(new Event('close'));
  assert.equal(f.state.resumes, 1, 'duplicate close never resumes twice');
  f.ui.destroy();
}
for (const denied of [false, 'access', 'read', 'write']) {
  const f = mount({ speed: 3, denied }); f.start(); dismiss(f, 'Close');
  // Reopen before the first close event arrives: it must not finish this replay.
  f.click({ action: 'menu' }); f.click({ action: 'tutorial' }); f.flush();
  assert(f.tutorial.open); assert.equal(f.nodes.get('.city-tutorial-step').textContent, 'Step 1 of 3');
  dismiss(f, 'Escape'); f.flush();
  assert.deepEqual(f.state, { speed: 0, paused: true, pauses: 2, resumes: 1 }, 'menu replay stays paused');
  f.click({ action: 'resume' }); assert.equal(f.state.speed, 3);
  f.start(); assert(!f.tutorial.open, 'seen persists for this UI session even with denied storage');
  f.ui.destroy();
}
{
  const f = mount(); f.click({ action: 'tutorial' }); dismiss(f, 'Finish'); f.flush();
  assert.deepEqual(f.state, { speed: undefined, paused: true, pauses: 0, resumes: 0 }, 'initial-menu tutorial never starts play');
  f.ui.destroy();
}
{
  const f = mount({ seen: true }); f.start(); assert(!f.tutorial.open, 'stored seen skips first-play tutorial'); f.ui.destroy();
}
for (const pending of [false, true]) {
  const f = mount(); f.start(); if (pending) f.tutorial.close();
  f.ui.destroy(); f.flush(); f.tutorial.dispatchEvent(new Event('close'));
  assert.equal(f.state.resumes, 0, 'destroy cannot resume or wake a stale game');
  assert.equal(f.stored.get('citisten-tutorial-seen'), undefined, 'destroy is not a dismissal');
}
for (const transition of ['showMenu', 'showGame']) {
  const f = mount(); f.start(); f.ui[transition](); f.flush();
  assert(!f.tutorial.open); assert.equal(f.state.resumes, 0, 'external UI transition invalidates tutorial resume'); f.ui.destroy();
}
{
  const f = mount(); f.start(); f.ui.update({ phase: 'lost', buildings: [] }); f.flush();
  assert(!f.tutorial.open); assert(f.nodes.get('.city-loss').open);
  assert.equal(f.state.resumes, 0, 'loss invalidates tutorial resume'); f.ui.destroy();
}
for (const mobile of [false, true]) {
  const f = mount({ seen: true, mobile }); f.start();
  const tools = f.nodes.get('.city-tools'), service = f.nodes.get('[data-group="Service"]');
  assert(tools.hidden, 'options start collapsed on both layouts');
  f.click({ group: 'Service' }); assert(!tools.hidden); assert.equal(service.getAttribute('aria-expanded'), 'true');
  f.click({ tool: 'power' });
  assert(tools.hidden); assert.equal(f.tool, 'power'); assert.equal(f.root.focused, service);
  assert.equal(service.getAttribute('aria-expanded'), 'false'); assert.equal(service.getAttribute('aria-pressed'), 'true');
  f.click({ group: 'Service' }); assert(!tools.hidden, 'selected group reopens');
  f.click({ group: 'Service' }); assert(tools.hidden, 'selected group toggles shut'); assert.equal(f.tool, 'power');
  f.click({ group: 'Service' }); f.click({ tool: 'clinic' });
  assert(!tools.hidden); assert.equal(f.tool, 'power', 'locked tool neither selects nor collapses');
  f.click({ group: 'Road' }); assert(!tools.hidden, 'switching group opens its options');
  f.click({ tool: 'bridge' }); assert(tools.hidden); assert.equal(f.tool, 'bridge');
  assert.equal(f.root.focused, f.nodes.get('[data-group="Road"]'));
  f.click({ group: 'Service' }); f.ui.setTool('power'); assert(tools.hidden, 'external tool selection collapses too');
  f.ui.destroy();
}
console.log('TUTORIAL CHECK PASS: real UI handlers; Close/Finish/Escape/fallback at 0/1/3/10x, exactly-once resume, three concise steps, replay/stale close, seen/denied storage, transitions/loss/destroy; DOM double only, no browser proof');
console.log('UI TOOLS CHECK PASS: desktop/mobile selection collapses, selected-group focus/aria, group open/close/switch, selected tool retained, locked tool guard and external selection; DOM double only');
