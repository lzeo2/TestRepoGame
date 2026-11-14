import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../Games/Capital Drive/mission-locations.js', import.meta.url), 'utf8');
const { selectStoryHomes, createMissionGuide } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const house = (id, x, z = 0) => ({ id, buildingId: `act-${id}`, type: 'house', name: 'House', x, z, yaw: 0 });
const houses = [house('blocked', 0), house('b', 10), house('a', -10), { ...house('fake', 1), buildingId: null },
  { ...house('shop', 1), type: 'shop' }, { ...house('nan', 1), yaw: NaN }];
const map = { landmarks: [{ id: 'kingston', x: 0, z: 0 }], buildings: houses.filter(e => e.buildingId).map(e => ({ id: e.buildingId })) };
const original = JSON.stringify({ map, houses });
const probes = [];
const homes = selectStoryHomes(map, houses, { canApproach: p => { probes.push(p); return p.x !== 0; }, roadName: p => p.id === 'a' ? 'Eyre Street' : '' });
assert.equal(homes.basement.roomId, 'a', 'equal distances use stable entry id');
assert.equal(homes.basement.buildingId, 'act-a', 'actual source identity survives');
assert.equal(homes.basement.x, -10, 'house coordinates remain the real door');
assert.deepEqual(homes.basement.approach, { x: -10, z: -1.8 });
assert.equal(homes.basement.name, "Milo's safehouse");
assert.equal(homes.basement.street, 'Eyre Street');
assert.ok(probes.every(Object.isFrozen));
assert.ok(Object.isFrozen(homes) && Object.isFrozen(homes.basement) && Object.isFrozen(homes.basement.approach));
assert.throws(() => { homes.basement.roomId = 'fake'; }, TypeError);
assert.equal(JSON.stringify({ map, houses }), original, 'selection preserves all supplied source data');
assert.equal(selectStoryHomes(map, houses, { canApproach: () => false }).basement, null);
assert.equal(selectStoryHomes({}, houses).basement, null, 'no invented Kingston anchor');
assert.equal(selectStoryHomes({ landmarks: [null, { id: 'kingston', x: NaN, z: 0 }] }, houses).basement, null);
assert.equal(selectStoryHomes(map, []).basement, null);
assert.equal(selectStoryHomes({ ...map, buildings: [] }, houses).basement, null, 'no unretained source body');
assert.equal(selectStoryHomes(map, houses, { canApproach: () => undefined }).basement, null);
const rotated = selectStoryHomes({ kingston: { x: 2, z: 3 } }, [{ ...house('rotated', 2, 3), yaw: Math.PI / 2 }]);
assert.equal(rotated.basement.approach.x, .19999999999999996);
assert.ok(Math.abs(rotated.basement.approach.z - 3) < 1e-12);

const shop = { id: 'room-shop', buildingId: 'act-shop', storeId: 'coals', type: 'shop', name: 'Coals', x: 40, z: 50, yaw: 0 };
const school = { id: 'school', buildingId: 'act-school', type: 'school', name: 'School wing', x: 60, z: 70, yaw: 0, approach: { x: 60, z: 68.4 } };
const entries = [...houses, shop, school];
const guide = createMissionGuide(entries, homes).guide;
const target = (kind, extra = {}) => ({ target: { kind, x: 999, z: 888, label: 'Original objective', ...extra } });
const pose = { x: 43, z: 54 };
let dto = guide(target('work', { storeId: 'coals' }), { pose });
assert.equal(dto.instruction, 'Enter Coals at the marked door.');
assert.deepEqual(dto.point, { x: 40, z: 48.2 }, 'outside guidance uses rendered doorway, never goal centroid');
assert.equal(dto.entryId, 'room-shop');
assert.equal(dto.indoors, false);
assert.ok(Object.isFrozen(dto) && Object.isFrozen(dto.point));
assert.ok(Math.abs(dto.distance - Math.hypot(3, 5.8)) < 1e-12);
assert.deepEqual(guide(target('school-alarm', { roomId: 'school' }), {}).point, school.approach);

const plan = { id: shop.id, storeId: 'coals', counter: { x: 43, z: 50 }, activities: [
  { id: 'other', kind: 'presentation', label: 'Other task', x: 10, z: 10 },
  { id: 'stock', kind: 'stock', label: 'Restock the aisle', x: 43, z: 54 },
] };
dto = guide(target('work', { storeId: 'coals' }), { pose, plan });
assert.equal(dto.stationId, 'stock');
assert.equal(dto.distance, 0);
assert.equal(dto.indoors, true);
assert.match(dto.instruction, /^Press E or Q at Restock/);
assert.deepEqual(guide(target('robbery', { storeId: 'coals' }), { pose, plan }).point, plan.counter);
assert.match(guide(target('robbery', { storeId: 'coals' }), { plan }).instruction, /press E/);
assert.deepEqual(guide(target('interior', { storeId: 'coals' }), { plan }).point, plan.counter);
const wrongRoom = { ...plan, id: 'wrong' };
assert.equal(guide(target('work', { storeId: 'coals' }), { plan: wrongRoom }).indoors, false);
assert.equal(guide(target('work', { roomId: 'missing', storeId: 'coals' }), { plan }).instruction, 'Original objective');
assert.equal(guide(target('work', { storeId: 'coals', stationId: 'other' }), { plan }).instruction, 'Original objective', 'station must match both kind and identity');
assert.equal(guide(target('interior', { storeId: 'coals' }), { plan: { ...plan, counter: null } }).instruction, 'Original objective', 'no synthetic counter');

const people = [{ id: 'wrong-room', roomId: 'wrong', storeId: 'coals', character: 'booth-guest', health: 100, x: 1, z: 1 },
  { id: 'dead', roomId: plan.id, storeId: 'coals', character: 'booth-guest', health: 0, x: 2, z: 2 },
  { id: 'dot', roomId: plan.id, storeId: 'coals', character: 'booth-guest', health: 100, x: 44, z: 55 }];
dto = guide(target('encounter', { storeId: 'coals' }), { pose, plan, people });
assert.deepEqual(dto.point, { x: 44, z: 55 });
assert.equal(dto.distance, Math.SQRT2);
assert.match(dto.instruction, /Speak to Dot/);
assert.equal(guide(target('encounter', { storeId: 'coals' }), { plan, people: people.slice(0, 2) }).instruction, 'Original objective');

const homePlan = { id: 'a', activities: [{ id: 'a-stash', kind: 'stock', label: 'Pack the ledger case', x: -10, z: 6 }] };
dto = guide(target('home-action', { roomId: 'a', stationId: 'a-stash' }), { plan: homePlan });
assert.equal(dto.location, "Milo's safehouse on Eyre Street");
assert.equal(dto.stationId, 'a-stash');
assert.deepEqual(dto.point, { x: -10, z: 6 });
assert.equal(guide(target('home-action', { roomId: 'a', stationId: 'a-other' }), { plan: homePlan }).instruction, 'Original objective');
const alarmPlan = { id: 'school', activities: [{ id: 'alarm', kind: 'alarm', label: 'Fictional alarm panel', x: 60, z: 75 }] };
assert.equal(guide(target('school-alarm', { roomId: 'school' }), { plan: alarmPlan }).stationId, 'alarm');
const presentationPlan = { id: 'school', activities: [{ id: 'slides', kind: 'presentation', label: 'PowerPunt', x: 61, z: 74 }] };
assert.equal(guide(target('presentation', { roomId: 'school' }), { plan: presentationPlan }).stationId, 'slides');

const drive = target('drive');
const before = JSON.stringify({ drive, plan, people, homePlan, entries });
for (let i = 0; i < 10; i++) guide(drive, { pose, plan, people });
assert.equal(JSON.stringify({ drive, plan, people, homePlan, entries }), before, 'directions never advance or alter an objective');
assert.deepEqual(guide(drive, { pose }).point, { x: 999, z: 888 });
assert.equal(guide(drive, {}).distance, null);
assert.equal(guide(drive, null).distance, null);
assert.equal(guide(drive, { pose: { x: NaN, z: 0 } }).distance, null);
assert.equal(guide(null, {}), null);
assert.equal(guide({ target: { kind: 'drive', x: NaN, z: 0 } }), null);
assert.equal(createMissionGuide([]).guide(target('work', { storeId: 'coals' })).instruction, 'Original objective');
shop.x = 777;
assert.equal(guide(target('work', { storeId: 'coals' })).point.x, 40, 'entry index detaches construction data');
console.log('Capital mission locations: real doors, clear story home, room/station/NPC identity and immutable guidance PASS');
