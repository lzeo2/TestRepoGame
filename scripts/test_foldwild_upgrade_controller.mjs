import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshGame, worldPoints, nearbyPoint, routeTo, movePosition, REGIONS } from '../Games/Foldwild/world.js';
import { navigationObjective } from '../Games/Foldwild/navigation.js';

// Execute the real trusted controller functions, not a second routing implementation.
const source = readFileSync(new URL('../Games/Foldwild/script.js', import.meta.url), 'utf8');
const section = (name, next) => source.slice(source.indexOf(`function ${name}(`), source.indexOf(`function ${next}(`));
const nodes = new Map(), messages = [];
let interactions = 0;
const env = {
  state: freshGame('cindupp', 42), phase: 'world', route: [], routeDestination: null,
  navigationElapsed: Infinity, positionDirty: false, keys: new Set(), pointers: new Map(),
  directions: { w: [0, -1], d: [1, 0] },
  REGIONS, worldPoints, nearbyPoint, routeTo, movePosition, navigationObjective,
  playable: () => !env.paused, paused: false,
  byId: id => { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); },
  text: (id, value) => { env.byId(id).textContent = value; },
  message: value => messages.push(value), focusGame() {},
  interact: () => interactions++, travel: () => assert.fail('fresh goal cannot travel'),
  distanceTo: p => Math.hypot(p.x - env.state.position.x, p.z - env.state.position.z),
  view: { getCameraYaw: () => 0, setPlayerPosition() {} }
};
const functions = section('updateNavigation', 'updateProximity') + section('approach', 'healAll') + section('move', 'frame');
const controller = Function('env', `with (env) { ${functions}; return { updateNavigation, navigateObjective, approach, move }; }`)(env);
controller.updateNavigation();
assert.equal(nodes.get('objective-title').textContent, 'Northern Clearing');
assert.match(nodes.get('objective-detail').textContent, /north.*m by trail.*Maren.*Trial 1\/5/);
assert.equal(nodes.get('navigate-objective').disabled, false);
assert(!nodes.get('objective-detail').textContent.includes('Cave'), 'no hidden-location guidance');
const preserved = structuredClone(env.state);
controller.navigateObjective();
assert.equal(env.routeDestination.id, 'rival');
assert.deepEqual(env.state, preserved, 'navigation plans movement, never teleports or grants progress');
assert.equal(nodes.get('navigate-objective').textContent, 'Stop walking');
controller.navigateObjective();
assert.equal(env.route.length, 0); assert.equal(env.routeDestination, null);
controller.navigateObjective();
for (let i = 0; i < 2000 && (env.route.length || env.routeDestination); i++) controller.move(.05);
assert(env.distanceTo({ x: 22, z: -26 }) >= 1.2 - 1e-7 && env.distanceTo({ x: 22, z: -26 }) <= 1.4,
  'real collision-safe movement stops beside Maren, inside interaction range but outside the actor');
assert.equal(messages.filter(m => m === 'Reached Northern Clearing.').length, 1, 'one route-arrival announcement');
for (let i = 0; i < 10; i++) controller.move(.05);
assert.equal(messages.filter(m => m === 'Reached Northern Clearing.').length, 1);
env.navigationElapsed = Infinity; controller.updateNavigation();
assert.match(nodes.get('objective-detail').textContent, /At Northern Clearing.*Maren/);
assert.equal(nodes.get('navigate-objective').textContent, 'Preview trial');
controller.navigateObjective(); assert.equal(interactions, 1, 'arrival uses existing guarded interaction, not auto battle');
assert.deepEqual(env.state.defeatedRivals, []);
assert.deepEqual(env.state.roster, preserved.roster);
env.paused = true; env.navigationElapsed = Infinity; controller.updateNavigation();
assert(nodes.get('navigate-objective').disabled);
controller.navigateObjective(); assert.equal(interactions, 1);
env.paused = false; env.state = freshGame(); controller.approach('rival');
env.keys.add('d'); controller.move(.05);
assert.equal(env.route.length, 0); assert.equal(env.routeDestination, null, 'manual input cancels route');
const pane = { scrollTop: 240 }, objectivePanel = {}, fieldActions = {};
const phaseEnv = { phase: 'world', navigationElapsed: 0, layout: {}, byId: env.byId,
  clearInput() {}, resize() {}, updateHUD() {},
  document: { querySelector: selector => ({ '.trail-controls': pane, '.objective-panel': objectivePanel, '.field-actions': fieldActions })[selector] } };
const setPhase = Function('env', `with (env) { ${section('setPhase', 'markOwned')}; return setPhase; }`)(phaseEnv);
setPhase('battle'); assert.equal(pane.scrollTop, 0); assert.equal(objectivePanel.hidden, true);
pane.scrollTop = 500; setPhase('world');
assert.equal(pane.scrollTop, 0, 'returning from scrolled battle must expose the objective again');
assert.equal(objectivePanel.hidden, false); assert.equal(fieldActions.hidden, false);
console.log('PASS: actual controller goal/route/standoff/arrival/preview/pause/manual takeover and phase scroll reset; no teleport, battle grants, roster or progression mutation');
