// Actual spawn/MenuNav/HUD modules on a bounded DOM fixture. No browser or gameplay claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
assert(process.env.ESBUILD_ROOT && process.env.THREE_ROOT, 'Use approved existing tools');
const tool = resolve(process.env.ESBUILD_ROOT), three = resolve(process.env.THREE_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const src = fileURLToPath(new URL('../source/games/wings/src/', import.meta.url));
const plugins = [{ name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => {
    const key = path === 'three' ? '.' : `.${path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    if (typeof target === 'object') target = target.import;
    assert.equal(typeof target, 'string', key);
    return { path: resolve(three, target) };
  });
} }];
// Keep native logic and MenuNav; implement only DOM operations these paths consume.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.className = ''; this.dataset = {}; this.children = [];
    this.queries = new Map(); this.listeners = new Map(); this.textContent = ''; this.hidden = false;
    const props = new Map();
    this.style = { setProperty: (k, v) => props.set(k, v), getPropertyValue: k => props.get(k) ?? '' };
    this.classList = {
      contains: c => this.className.split(' ').includes(c),
      toggle: (c, on = !this.classList.contains(c)) => {
        this.className = [...new Set([...this.className.split(' ').filter(x => x && x !== c), ...(on ? [c] : [])])].join(' '); return on;
      },
      add: (...cs) => cs.forEach(c => this.classList.toggle(c, true)),
      remove: (...cs) => cs.forEach(c => this.classList.toggle(c, false)),
    };
  }
  set innerHTML(html) { this.html = html; this.queries.clear(); this.textContent = ''; }
  get innerHTML() { return this.html ?? ''; }
  querySelector(s) { if (!this.queries.has(s)) this.queries.set(s, new Element(s.includes('canvas') ? 'canvas' : 'div')); return this.queries.get(s); }
  querySelectorAll(s) {
    if (s === '.mi') return [...this.innerHTML.matchAll(/data-i="(\d+)"/g)].map(m => {
      const e = new Element(); e.dataset.i = m[1]; return e;
    });
    if (s === '[data-tab]') return ['air', 'guns'].map(tab => { const e = new Element('button'); e.dataset.tab = tab; return e; });
    return [];
  }
  appendChild(e) { this.children.push(e); return e; }
  addEventListener(k, f) { if (!this.listeners.has(k)) this.listeners.set(k, new Set()); this.listeners.get(k).add(f); }
  removeEventListener(k, f) { this.listeners.get(k)?.delete(f); }
  dispatch(k, e) { this.listeners.get(k)?.forEach(f => f(e)); }
  removeAttribute(k) { delete this[k]; }
  after() {} remove() {} scrollIntoView() {} focus() {} blur() {}
  getContext() { return {}; }
}
const windowFixture = new Element();
Object.assign(windowFixture, { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, requestIdleCallback() {}, setTimeout: () => 0 });
globalThis.window = windowFixture;
globalThis.document = { createElement: tag => new Element(tag) };
const bundle = await build({ stdin: { contents: `
 export { createSpawnScreen } from './ui/spawn';
 export { MenuNav, initLobby } from './ui/lobby';
 export { createHud, TEAM_NAMES, TEAM_COLORS } from './render/hud';
 export { VEHICLE_KINDS, VEHICLES, NATIVE_HELICOPTER_MODELS } from './sim/vehicles';
 export { PerspectiveCamera } from 'three';`, resolveDir: src, loader: 'ts' },
 bundle: true, platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none', plugins });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
let nav, builds = 0;
const render = api.MenuNav.prototype.render;
api.MenuNav.prototype.render = function () { nav = this; builds++; return render.call(this); };
let allowed = Object.freeze(['f16c']), names = Object.freeze(['NATO <&>', 'Eastern "wing"']);
const launches = [], boards = [], requests = [], pending = [];
let leaves = 0;
const picker = api.createSpawnScreen(new Element(), {
  spawn: k => launches.push(k), board: (...x) => boards.push(x), team() {}, leave: () => leaves++, click() {},
  aircraftKinds: () => allowed, teamNames: () => names, fixedTeam: true, manTurret() { assert.fail('fixed team guns'); },
  thumb: (k, t) => { requests.push([k, t]); return new Promise(resolve => pending.push({ k, resolve })); },
});
const me = { id: 'me', team: 0, respawnAt: 0 };
const vehicles = api.VEHICLE_KINDS.map(kind => ({ id: kind, kind, alive: true, team: 0, seats: [null, null] }));
const state = { me, players: new Map([['me', me]]), vehicles, time: 0, config: { teams: 2 }, room: 'TEST', dead: false, ships: [] };
const update = () => picker.update(state);
const key = key => windowFixture.dispatch('keydown', { key, repeat: false, target: new Element(), preventDefault() {} });
const labels = () => nav.top.items.map(x => x.label);
const info = () => picker.root.querySelector('.sp-detail .info');
const thumb = () => picker.root.querySelector('.sp-detail .thumb');
picker.show(); update();
assert.equal(labels()[0], 'F-16C');
assert(labels().slice(1, -1).every(x => x.includes('F-16C')));
assert.match(nav.host.innerHTML, /F-16C/); assert.doesNotMatch(nav.host.innerHTML, /MiG-29|F\/A-18/);
assert.deepEqual(requests, [['f16c', 0]]);
assert.match(info().innerHTML, /Multirole fighter/);
assert.match(picker.root.querySelector('.teams').innerHTML, /nato &lt;&amp;&gt;/);
assert.equal(picker.root.querySelector('.tabs').hidden, true);
const count = builds; update(); assert.equal(builds, count, 'unchanged roster/side/seats keeps focus and menu');
key('1'); assert.deepEqual(launches, ['f16c']); key('2'); assert.equal(launches.length, 1);
nav.top.items[1].run(); assert.equal(boards[0][0], 'f16c');
const stale = nav.top.items[0], staleBoard = nav.top.items[1];
allowed = Object.freeze(['mig29', 'invalid', 'mig29']); update();
assert.equal(labels()[0], 'MiG-29'); assert(labels().slice(1, -1).every(x => x.includes('MiG-29')));
assert.match(nav.host.innerHTML, /MiG-29/); assert.doesNotMatch(nav.host.innerHTML, /F-16C|F\/A-18/);
assert.match(info().innerHTML, /01 - Air-superiority fighter/);
assert.equal(thumb().hidden, true); assert.equal(thumb().src, undefined);
stale.run(); staleBoard.run(); assert.equal(launches.length, 1); assert.equal(boards.length, 1);
key('1'); assert.equal(launches.at(-1), 'mig29');
nav.top.items[1].run(); assert.equal(boards.at(-1)[0], 'mig29');
pending.find(x => x.k === 'f16c').resolve('old-f16'); await Promise.resolve();
assert.equal(thumb().hidden, true); assert.notEqual(thumb().src, 'old-f16');
pending.find(x => x.k === 'mig29').resolve('new-mig'); await Promise.resolve();
assert.equal(thumb().src, 'new-mig'); assert.equal(thumb().hidden, false);
for (const empty of [Object.freeze([]), Object.freeze(['bogus']), null, undefined]) {
  allowed = empty; update(); assert.deepEqual(labels(), ['Leave match']);
  assert.match(info().textContent, /No aircraft available/); assert.equal(thumb().hidden, true); assert.equal(thumb().src, undefined);
  const before = launches.length; key('1'); key('9'); assert.equal(launches.length, before);
}
assert.deepEqual(requests, [['f16c', 0], ['mig29', 0]], 'no forbidden thumbnail requests');
key('g'); assert.deepEqual(labels(), ['Leave match']); key('Enter'); assert.equal(leaves, 1);
allowed = Object.freeze(['mig29']); update(); me.team = 1; update();
assert.deepEqual(requests.at(-1), ['mig29', 1]);
assert.deepEqual(allowed, ['mig29']); assert.deepEqual(names, ['NATO <&>', 'Eastern "wing"']);
names = undefined; update(); assert.match(picker.root.querySelector('.teams').innerHTML, /cobalt/);
picker.dispose(); assert.equal(windowFixture.listeners.get('keydown').size, 0);
const lookup = JSON.parse(readFileSync(new URL('./supplied-fighters/roster_lookup.json', import.meta.url)));
for (const [kind, source, side] of [['ah64d', 'wings.original.ah-64d-apache.v1', 'A'], ['mi28n', 'wings.original.mi-28n.v1', 'B']]) {
  assert.equal(api.NATIVE_HELICOPTER_MODELS[kind].source_model_id, source);
  assert(lookup.standard.some(row => row.model_id === source));
  assert(lookup.factions.some(row => row.model_id === source && row.faction === side));
  assert.equal(api.VEHICLES[kind].model, api.NATIVE_HELICOPTER_MODELS[kind].file);
  assert.equal(api.VEHICLES[kind].flight, 'heli');
  assert.deepEqual(api.VEHICLES[kind].seatWeapons, [['rockets', null], ['hellfire', null]]);
}
for (const roster of [Object.freeze(['f16c', 'typhoon', 'rafale', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'a10c', 'f35a', 'ah64d']), Object.freeze(['mig29', 'su35s', 'jf17', 'mig31', 'su34', 'yak130', 'su25sm', 'j20', 'tu160', 'mi28n'])]) {
  const requested = [];
  const two = api.createSpawnScreen(new Element(), { spawn: kind => launches.push(kind), board() {}, team() {}, leave() {}, click() {},
    fixedTeam: true, aircraftKinds: () => roster, thumb: async kind => { requested.push(kind); return null; } });
  two.show(); two.update(state);
  assert.deepEqual(labels().slice(0, roster.length), roster.map(kind => api.VEHICLES[kind].name));
  for (let i = 0; i < 9; i++) { key(String(i + 1)); assert.equal(launches.at(-1), roster[i]); }
  const count = launches.length; key('0'); key('10'); key('20'); assert.equal(launches.length, count);
  assert.equal(nav.index, 0, 'quick keys launch without moving the selected preview');
  for (let i = 0; i < 9; i++) key('ArrowDown');
  assert.equal(nav.index, 9);
  assert.match(two.root.querySelector('.sp-detail .info').innerHTML, new RegExp(`10 - .*vtol[\\s\\S]*${api.VEHICLES[roster[9]].name}`));
  assert.match(two.root.querySelector('.sp-detail .info').innerHTML, /hydra 70.*hellfire/s);
  assert.doesNotMatch(two.root.querySelector('.sp-detail .info').innerHTML, /chain gun|cannon|m230/i);
  assert.doesNotMatch(two.root.querySelector('.sp-detail .info').innerHTML, /<dt>agility|<dt>firepower|undefined|NaN/);
  key('Enter'); assert.equal(launches.length, count + 1); assert.equal(launches.at(-1), roster[9]);
  key('ArrowUp'); assert.equal(nav.index, 8); key('ArrowDown'); assert.equal(nav.index, 9);
  assert.deepEqual(requested, [...roster]);
  two.dispose();
}
// No aircraft getter is the only ordinary-all reset. Getter returning undefined above stays closed.
const ordinary = api.createSpawnScreen(new Element(), { spawn: k => launches.push(k), board() {}, team() {}, leave() {}, click() {} });
ordinary.show(); ordinary.update(state);
const old25 = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35', 'f16c', 'mig29', 'typhoon', 'su35s', 'rafale', 'jf17', 'gripen', 'mig31', 'mirage2000', 'su34', 'fa50', 'yak130', 'hawkt2', 'su25sm', 'a10c', 'f35a', 'j20', 'tu160'];
assert.deepEqual(api.VEHICLE_KINDS, [...old25, 'ah64d', 'mi28n']);
assert.deepEqual(labels().slice(0, 27), api.VEHICLE_KINDS.map(k => api.VEHICLES[k].name));
assert(nav.top.hints.some(([k]) => k === '1–9'));
for (let i = 1; i <= 9; i++) { key(String(i)); assert.equal(launches.at(-1), api.VEHICLE_KINDS[i - 1]); }
const beforeInvalidNumber = launches.length; key('0'); key('10'); key('11'); key('12'); key('13'); key('14'); key('15'); key('16'); key('17'); key('18'); key('19'); key('20'); key('21'); key('22'); key('23'); key('24'); key('25'); assert.equal(launches.length, beforeInvalidNumber);
for (let i = 0; i < api.VEHICLE_KINDS.length; i++) {
  if (i) key('ArrowDown');
  assert.equal(nav.index, i);
  assert(ordinary.root.querySelector('.sp-detail .info').innerHTML.includes(`<h3 class="name">${api.VEHICLES[api.VEHICLE_KINDS[i]].name}</h3>`));
  key('Enter'); assert.equal(launches.at(-1), api.VEHICLE_KINDS[i]);
}
assert.equal(nav.index, 26); assert.match(ordinary.root.querySelector('.sp-detail .info').innerHTML, /27 - .*vtol/);
ordinary.dispose();
console.log('PASS actual picker/MenuNav: dynamic distinct rosters, quick keys, crew filters, empty/invalid closed, stale thumbnails, fixed-team guns blocked, actual NATO10/Eastern10 rows with supplied helicopter identities, ordinary27 (1-9 shortcuts, arrows/Enter and selected previews through row27), readonly escaped names');
// HUD uses real Three math, but no flying vehicle/canvas drawing in this name-only fixture.
const hud = api.createHud(new Element());
hud.root.classList.add('board');
const frame = { camera: new api.PerspectiveCamera(), me: null, vehicle: null, players: new Map(), vehicles: [],
  time: 0, myId: '', seat: null, teams: 2, scores: [0, 0], remaining: null, weapons: [],
  speed: 0, heading: 0, altitude: 0, throttle: 0, ping: 0,
  fleetObjectives: [{ team: 0, hp: 10, maxHp: 10, sunk: false }],
  teamNames: Object.freeze(['NATO <&>', 'Eastern "wing"']) };
let now = 1000;
const savedPerformance = globalThis.performance;
globalThis.performance = { now: () => now += 600 };
const advance = () => { for (let i = 0; i < 15; i++) hud.update(frame); };
try {
  advance();
  assert.match(hud.root.querySelector('.hud-board').innerHTML, /NATO &lt;&amp;&gt;/);
  assert.match(hud.root.querySelector('.hud-obj').innerHTML, /nato &lt;&amp;&gt;/);
  hud.endScreen('victory', 'test', 0);
  assert.match(hud.root.querySelector('.hud-end').querySelector('.nx').textContent, /^nato <&> fleet/);
  const other = api.createHud(new Element());
  other.update({ ...frame, teamNames: undefined }); other.endScreen('victory', 'test', 0);
  assert.match(other.root.querySelector('.hud-end').querySelector('.nx').textContent, /^cobalt fleet/);
  assert.match(hud.root.querySelector('.hud-end').querySelector('.nx').textContent, /^nato <&> fleet/);
  other.dispose();
  frame.teamNames = Object.freeze(['', null]); advance();
  assert.match(hud.root.querySelector('.hud-board').innerHTML, /Cobalt/);
  frame.teamNames = undefined; advance();
  assert.match(hud.root.querySelector('.hud-obj').innerHTML, /cobalt/);
  hud.endScreen('victory', 'test', 1);
  assert.match(hud.root.querySelector('.hud-end').querySelector('.nx').textContent, /^amber fleet/);
  assert.deepEqual(api.TEAM_NAMES, ['Cobalt', 'Amber', 'Emerald', 'Crimson']);
  assert.deepEqual(api.TEAM_COLORS, ['#3c6ea8', '#c98a2e', '#4e8a5a', '#b04a44']);
} finally { hud.dispose(); globalThis.performance = savedPerformance; }
console.log('PASS actual HUD: scoreboard/capital HTML escaping, end-result text, invalid/absent fallback, ordinary global names/colors unchanged');
// Actual original lobby/MenuNav dispatch, not a renamed generic-team fixture.
const ids = new Map();
globalThis.document.getElementById = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
globalThis.document.body = new Element('body');
globalThis.document.getElementById('busy').hidden = true;
const requestsFromMenu = [];
const lobby = api.initLobby({ onStart: req => requestsFromMenu.push(req), onQuality() {} });
nav.activate(nav.top.items.findIndex(item => item.label === 'Factions'));
assert.equal(requestsFromMenu.length, 0, 'Factions first opens coalition selection');
assert.equal(nav.top.items[0].value(), 'NATO-inspired');
assert.match(nav.top.items[0].meta(), /F-16C.*Eurofighter Typhoon.*Rafale C.*JAS 39C Gripen.*Mirage 2000C.*FA-50.*Hawk T2.*A-10C.*F-35A.*AH-64D.*Aquitaine.*CB90 H.*Charles de Gaulle.*Queen Elizabeth.*10\/10 aircraft and 5\/5 vessels/);
nav.activate(0);
assert.equal(nav.top.items[0].value(), 'Eastern-inspired');
assert.match(nav.top.items[0].meta(), /MiG-29.*Su-35S.*JF-17 Block III.*MiG-31BM.*Su-34.*Yak-130.*Su-25SM.*J-20.*Tu-160.*Mi-28N.*Type 055.*Type 022.*Liaoning.*Admiral Kuznetsov.*10\/10 aircraft and 5\/5/);
nav.activate(nav.top.items.findIndex(item => item.label === 'Start Factions'));
assert.equal(requestsFromMenu[0].coalition, 'eastern');
assert.equal(requestsFromMenu[0].rules, 'factions');
assert.equal(requestsFromMenu[0].aircraft, undefined, 'preserve the original hangar, no auto-spawn bypass');
lobby.show(); nav.activate(nav.top.items.findIndex(item => item.label === 'Factions'));
nav.activate(0); nav.activate(nav.top.items.findIndex(item => item.label === 'Start Factions'));
assert.equal(requestsFromMenu[1].coalition, 'nato');
assert.equal(requestsFromMenu[1].config.teams, 2);
console.log('PASS actual original coalition menu selects both named profiles, truthful 10/10 aircraft + 5/5 objective counts and original hangar dispatch');
const main = await build({ entryPoints: [resolve(src, 'main.ts')], bundle: true, format: 'esm', platform: 'browser', write: false,
  outdir: 'unused-memory-output', plugins, loader: { '.css': 'empty' }, logLevel: 'silent' });
assert(main.outputFiles.length > 0);
console.log(`PASS actual main write:false build (${main.outputFiles.length} output file, ${main.outputFiles.reduce((n, f) => n + f.contents.length, 0)} bytes in memory); native visual acceptance OPEN`);
