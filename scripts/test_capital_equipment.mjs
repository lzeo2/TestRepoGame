import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createEquipment } from '../Games/Capital Drive/equipment.js';
import { createEquipmentView } from '../Games/Capital Drive/equipment-view.js';
import { createStreetUI } from '../Games/Capital Drive/street-ui.js';

const map = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const legacy = { version: 1, cash: 5000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [], equipment: { pistol: false } };
const ctx = (pose = map.spawn, extra = {}) => ({ pose: { ...pose, yaw: 0 }, onFoot: true, wanted: 5, vehicleHealth: 100,
  respawnSerial: 0, health: 70, recovering: false, sandbox: false, ...extra });
const dealer = { id: 'fixture-contact', name: 'Fictional contact', road: 'Fixture road', type: 'arms', dealer: true,
  x: 10, z: 20, radius: 3, weaponIds: ['shotgun'], priceMultiplier: 1.25 };
const unchanged = (p, action) => { const before = p.serialize(); assert.equal(action().ok, false); assert.deepEqual(p.serialize(), before); };
const fresh = (saved = legacy, options = {}) => createProgression(map, saved, { extraServices: [dealer], ...options });
{
  const p = fresh(); assert.deepEqual(p.state.gear, { scanner: false, flares: 0 }); assert.deepEqual(p.state.equipment, legacy.equipment);
  assert.deepEqual(fresh(p.serialize()).serialize(), p.serialize());
  for (const gear of [null, [], {}, { scanner: true }, { flares: 0 }, { scanner: 1, flares: 0 },
    { scanner: false, flares: -1 }, { scanner: false, flares: 13 }, { scanner: false, flares: 1.5 },
    { scanner: false, flares: Infinity }, { scanner: false, flares: 0, other: true }]) assert.throws(() => fresh({ ...legacy, gear }), /gear/);
  for (const flares of [0, 1, 10, 12]) assert.equal(fresh({ ...legacy, gear: { scanner: true, flares } }).state.gear.flares, flares);
  assert.throws(() => fresh({ ...legacy, unknownGear: true }));
  assert.throws(() => fresh({ ...legacy, equipment: { pistol: false, scanner: true } }), /equipment/);
}
for (const site of fresh().services.filter(site => site.type === 'arms')) {
  const p = fresh(), actor = ctx(site);
  assert(p.purchaseService(site.id, 'scanner', actor).ok, 'all arms stores and restricted-stock contacts sell gear at five stars');
  assert.equal(p.state.cash, 4500); assert.equal(p.state.gear.scanner, true);
  unchanged(p, () => p.purchaseService(site.id, 'scanner', actor));
  for (let pack = 1; pack <= 4; pack++) {
    assert(p.purchaseService(site.id, 'flares', actor).ok); assert.equal(p.state.gear.flares, pack * 3);
    assert.equal(p.state.cash, 4500 - pack * 120, 'gear prices ignore weapon-only dealer multipliers');
  }
  unchanged(p, () => p.purchaseService(site.id, 'flares', actor));
  assert.deepEqual(fresh(p.serialize()).serialize(), p.serialize(), 'gear reloads in the same strict career save');
  assert.deepEqual(p.state.equipment, { pistol: false }, 'gear never grants a weapon');
}
for (const flares of [10, 11, 12]) {
  const p = fresh({ ...legacy, gear: { scanner: false, flares } });
  unchanged(p, () => p.purchaseService(dealer.id, 'flares', ctx(dealer)));
}
for (const extra of [{ onFoot: false }, { sandbox: true }, { recovering: true }, { pose: map.spawn },
  { pose: { x: NaN, z: 0 } }, { wanted: 6 }, { respawnSerial: -1 }]) {
  const p = fresh(); unchanged(p, () => p.purchaseService(dealer.id, 'scanner', ctx(dealer, extra)));
}
for (const options of [{ hasLineOfSight: () => false }, { canUseService: () => false }]) {
  const p = fresh(legacy, options); unchanged(p, () => p.purchaseService(dealer.id, 'flares', ctx(dealer)));
}
for (const [item, cash] of [['scanner', 499], ['flares', 119]]) {
  const p = fresh({ ...legacy, cash }); unchanged(p, () => p.purchaseService(dealer.id, item, ctx(dealer)));
}
{
  const p = fresh(), food = p.services.find(site => site.type === 'food'), gym = p.services.find(site => site.type === 'gym');
  unchanged(p, () => p.purchaseService(food.id, 'scanner', ctx(food)));
  assert(p.startActivity(gym.id, 'workout', ctx(gym, { wanted: 0 })).ok);
  unchanged(p, () => p.purchaseService(dealer.id, 'flares', ctx(dealer)));
}
{
  const p = fresh({ ...legacy, gear: { scanner: true, flares: 3 } });
  for (const extra of [{ onFoot: false }, { sandbox: true }, { recovering: true }, { interior: {} }, { passenger: true },
    { ride: true }, { bus: true }, { pose: null }, { wanted: NaN }]) unchanged(p, () => p.consumeFlare(ctx(map.spawn, extra)));
  assert(p.consumeFlare(ctx()).ok); assert.equal(p.state.gear.flares, 2); assert.equal(p.state.cash, legacy.cash);
  assert.equal(fresh(p.serialize()).state.gear.flares, 2, 'used inventory persists');
  p.consumeFlare(ctx()); p.consumeFlare(ctx()); unchanged(p, () => p.consumeFlare(ctx()));
  assert.equal(p.drainEvents().filter(event => event.type === 'flare-used').length, 3);
}
const physical = { hasLineOfSight: () => true, canOccupy: () => true, heightAt: () => 2 };
{
  const p = fresh({ ...legacy, gear: { scanner: false, flares: 4 } }); let calls = 0;
  const equipment = createEquipment({ ...physical, consumeFlare: actor => { calls++; return p.consumeFlare(actor); } });
  const actor = ctx({ x: 0, z: 0 });
  assert(equipment.throwFlare(actor).ok); assert.equal(calls, 1); assert.equal(p.state.gear.flares, 3);
  let snapshot = equipment.snapshot(); assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot[0]));
  assert.equal(snapshot[0].x, 0); assert.equal(snapshot[0].z, -4); assert.equal(snapshot[0].y, 2);
  assert.throws(() => { snapshot[0].remaining = 999; });
  equipment.step(0, actor); assert.deepEqual(equipment.snapshot(), snapshot, 'pause freezes smoke and expiry');
  assert(equipment.throwFlare({ ...actor, aimYaw: Math.PI / 2 }).ok); assert(equipment.throwFlare(actor).ok);
  const ids = equipment.snapshot().map(flare => flare.id); assert.equal(new Set(ids).size, 3);
  assert.equal(equipment.throwFlare(actor).ok, false); assert.equal(calls, 3, 'pool limit never consumes inventory');
  equipment.step(19.9, actor); assert.equal(equipment.snapshot().length, 3);
  equipment.step(.1, actor); assert.equal(equipment.snapshot().length, 0);
  assert(equipment.throwFlare(actor).ok); assert.equal(p.state.gear.flares, 0);
  assert(!ids.includes(equipment.snapshot()[0].id), 'new throws keep stable unique IDs');
  equipment.reset(); assert.deepEqual(equipment.snapshot(), []);
  assert.equal(equipment.throwFlare(actor).ok, false); assert.equal(equipment.snapshot().length, 0);
  assert.throws(() => equipment.step(NaN)); assert.throws(() => equipment.step(-1));
}
for (const extra of [{ onFoot: false }, { recovering: true }, { interior: {} }, { bus: true }, { passenger: true },
  { ride: true }, { activity: true }, { pose: null }, { aimYaw: NaN }]) {
  let calls = 0; const e = createEquipment({ ...physical, consumeFlare: () => { calls++; return true; } });
  assert.equal(e.throwFlare(ctx({ x: 0, z: 0 }, extra)).ok, false); assert.equal(calls, 0);
}
for (const query of [{ hasLineOfSight: (a, b) => b.z > -2 }, { canOccupy: p => p.z > -3 },
  { heightAt: (x, z) => z < -2 ? 9 : 2 }, { heightAt: () => NaN }]) {
  let calls = 0; const e = createEquipment({ ...physical, ...query, consumeFlare: () => { calls++; return true; } });
  assert.equal(e.throwFlare(ctx({ x: 0, z: 0 })).ok, false); assert.equal(calls, 0, 'blocked reach never spends inventory');
}
{
  let calls = 0; const e = createEquipment({ ...physical, consumeFlare: () => { calls++; return true; } });
  assert(e.throwFlare(ctx({ x: 0, z: 0 }, { sandbox: true })).ok); assert.equal(calls, 0, 'Free roam previews spend no career inventory');
  const missing = createEquipment(); assert.equal(missing.throwFlare(ctx()).ok, false, 'missing physical authority fails closed');
}
{
  const scene = new THREE.Scene(), e = createEquipment({ ...physical });
  for (let i = 0; i < 3; i++) assert(e.throwFlare(ctx({ x: i * 2, z: 0 }, { sandbox: true })).ok);
  const view = createEquipmentView(scene); view.update(e.snapshot(), { x: 0, z: 0 });
  assert.equal(view.stats.visible, 3); assert.equal(view.stats.drawCalls, 4); assert(view.stats.triangles < 1500);
  assert.equal(view.stats.geometryCount, 2); assert.equal(view.stats.materialCount, 4);
  const matrices = []; scene.traverse(node => { assert(!node.isLight); if (node.isInstancedMesh) matrices.push([...node.instanceMatrix.array]); });
  e.step(0); view.update(e.snapshot(), { x: 0, z: 0 });
  let batch = 0; scene.traverse(node => { if (node.isInstancedMesh) assert.deepEqual([...node.instanceMatrix.array], matrices[batch++]); });
  view.update(e.snapshot(), { x: 1000, z: 1000 }); assert.equal(view.stats.drawCalls, 0);
  let disposals = 0; const resources = new Set();
  scene.traverse(node => { if (node.isMesh) { resources.add(node.geometry); resources.add(node.material); } });
  resources.forEach(resource => resource.addEventListener('dispose', () => disposals++));
  view.dispose(); view.dispose(); assert.equal(disposals, 6); assert.equal(scene.children.length, 0);
  assert(view.stats.disposed); assert.equal(view.stats.geometryCount, 0);
}
{
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; this.value = ''; this.classList = { add() {} }; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {}
    addEventListener(type, handler) { this.listeners[type] = handler; }
    removeEventListener(type) { delete this.listeners[type]; }
  }
  const list = new Element('div'), filter = new Element('select'); filter.value = 'arms';
  globalThis.document = { getElementById: id => id === 'services-list' ? list : id === 'services-filter' ? filter : null, createElement: tag => new Element(tag) };
  const p = fresh(), actor = ctx(dealer), state = { mode: 'foot', vehicle: { modelId: 'lantern', color: '#e7e6df' }, wanted: 5, health: 70, vehicleHealth: 100, respawnSerial: 0, weapon: 'unarmed', pursuit: 'pursuit' };
  let saves = 0;
  const ui = createStreetUI({ gameplay: { state, focus: () => actor.pose, getAmmo: () => ({ reserveAmmo: 0 }) }, progression: p,
    simulation: { nearbyVehicles: () => [], hasLineOfSight: () => true }, vehicles: [], notify() {}, openDialog() {}, closeDialogs() {}, saveCareer() { saves++; }, isSandbox: () => false });
  const all = node => [node, ...node.children.flatMap(all)];
  ui.renderServices(); let article = list.children.find(entry => entry.dataset.serviceId === dealer.id);
  assert(all(article).some(node => node.tagName === 'h4' && node.textContent === 'Equipment'));
  assert(all(article).some(node => node.textContent.includes('B throw flare on foot')));
  let scanner = all(article).find(node => node.dataset.serviceItem === 'scanner'); assert.equal(scanner.disabled, false); assert.equal(scanner.textContent, 'Police scanner $500');
  scanner.listeners.click(); assert.equal(p.state.gear.scanner, true); assert.equal(saves, 1);
  article = list.children.find(entry => entry.dataset.serviceId === dealer.id); scanner = all(article).find(node => node.dataset.serviceItem === 'scanner');
  assert.equal(scanner.disabled, true); assert.equal(scanner.dataset.reason, 'Owned');
  const flares = all(article).find(node => node.dataset.serviceItem === 'flares'); assert.equal(flares.textContent, '3 flares $120'); flares.listeners.click();
  assert.equal(p.state.gear.flares, 3); assert.equal(saves, 2); ui.dispose(); delete globalThis.document;
}
console.log('PASS equipment: strict legacy v1 gear; all arms/contact five-star stock; exact scanner/pack spend and caps; authority denials; flare inventory/reload; clear four-metre reach/callback once; bounded transient IDs/lifetime/pause; four-draw pooled no-light view/disposal; actual stock UI prices/Owned/inventory/B cue.');
