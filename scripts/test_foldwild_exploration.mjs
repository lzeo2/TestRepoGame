import assert from 'node:assert/strict';
import { REGION_LAYOUTS, movePosition, routeTo, worldPoints, freshGame, validateSave } from '../Games/Foldwild/world.js';
import { SPECIES, OPTIONAL_HIDDEN_SPECIES } from '../Games/Foldwild/data.js';
import { completeContract, CONTRACTS } from '../Games/Foldwild/economy.js';

const presentationKeys = ['landmarkId', 'locationName', 'arrival', 'description', 'rewardHint', 'routeId'];
const oldStones = [[16,-40],[-18,-32],[8,-48],[-10,-66],[0,-50]];
const trialNames = ['Northern Clearing', 'Channel Bend', 'Upper Kiln Shelf', 'Northern Terrace', 'Eastern Grove Clearing'];
let segments = 0, spurs = 0;
function safe(region, point) {
  assert.deepEqual(movePosition(region, { ...point, yaw: 0 }, 0, 0), { ...point, yaw: 0 });
}
for (const [region, layout] of REGION_LAYOUTS.entries()) {
  const state = freshGame('cindupp', 42);
  Object.assign(state, { region, defeatedRivals: Array.from({length: region}, (_, i) => i), position: { ...layout.spawn } });
  const before = JSON.stringify(state);
  const base = worldPoints(state);
  const enriched = worldPoints(state, { exploration: true });
  assert.deepEqual(enriched.map(point => Object.fromEntries(Object.entries(point).filter(([key]) => !presentationKeys.includes(key)))), base,
    'Presentation cannot change canonical identities, locations, RNG draws, dialogue or rewards');
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(validateSave(state), state, 'No exploration state/schema is persisted');
  assert.equal(new Set(layout.landmarks.map(site => site.id)).size, layout.landmarks.length);
  assert.equal(new Set(layout.routes.map(route => route.id)).size, layout.routes.length);
  for (const site of layout.landmarks) {
    assert(Object.isFrozen(site) && Object.isFrozen(site.pointIds));
    assert(site.description && site.rewardHint && site.arrival.includes(site.name));
    assert(layout.routes.some(route => route.id === site.routeId));
    assert(routeTo(region, layout.spawn, site).length, `${site.name} is reachable`);
    for (const id of site.pointIds) assert(layout.points.some(point => point.id === id));
  }
  const trial = layout.landmarks.find(site => site.pointIds.includes('rival'));
  const rival = base.find(point => point.id === 'rival');
  assert.equal(trial.name, trialNames[region]);
  assert.deepEqual([trial.x, trial.z], [rival.x, rival.z]);
  assert(layout.props.some(prop => prop.landmarkId === trial.id && prop.label === trial.name && Math.hypot(prop.x-trial.x, prop.z-trial.z) <= 3),
    'Each trial has a visible nearby named waystone, not just metadata');
  const stone = layout.props.find(prop => prop.landmarkId === 'waystone');
  assert.deepEqual([stone.x, stone.z], oldStones[region], 'Keep original landmark identity, including the optional grove');
  assert.equal(enriched.find(point => point.id === 'rival').locationName, trial.name);
  for (const point of enriched) {
    for (const key of presentationKeys) assert.equal(typeof point[key], 'string');
    assert(point.arrival.includes(point.locationName));
    assert(layout.routes.some(route => route.id === point.routeId));
  }
  for (const route of layout.routes) {
    assert(Object.isFrozen(route) && Object.isFrozen(route.paths));
    assert(layout.landmarks.some(site => site.id === route.landmarkId));
    for (const path of route.paths) {
      assert(layout.paths.includes(path), 'Renderer and route metadata use the same authored paths');
      for (let i = 1; i < path.length; i++) {
        const a = path[i-1], b = path[i];
        const count = Math.max(1, Math.ceil(Math.hypot(b.x-a.x, b.z-a.z) / 0.05));
        for (let j = 0; j <= count; j++) safe(region, {x:a.x+(b.x-a.x)*j/count, z:a.z+(b.z-a.z)*j/count});
        segments++;
      }
    }
    if (route.id.startsWith('fiber-spur-')) {
      const supply = base.find(point => point.id === `supply-${route.id.at(-1)}`);
      assert.deepEqual(route.paths[0].at(-1), {x:supply.x, z:supply.z});
      spurs++;
    }
  }
  // Prove the advertised detour has an existing useful payout, without inventing rewards.
  const supply = base.find(point => point.id === 'supply-0');
  const contractId = layout.points.find(point => point.type === 'contract').contractId;
  const delivery = structuredClone(state);
  delivery.inventory.fiber += supply.quantity;
  delivery.claimedSupplies.push(`${region}:${supply.id}`);
  const paid = completeContract(delivery, contractId);
  assert.equal(paid.marks - delivery.marks, CONTRACTS[contractId].reward);
  assert.equal(paid.inventory.fiber, 0);
  assert(!worldPoints(validateSave(paid), { exploration: true }).some(point => point.id === supply.id));
  assert.throws(() => completeContract(paid, contractId), /completed/);
  assert.match(enriched.find(point => point.id === 'exit').rewardHint, /Clear .*regional trial/);
  const cleared = { ...state, defeatedRivals: [0,1,2,3,4], finaleStage: 3 };
  assert.match(worldPoints(cleared, { exploration: true }).find(point => point.id === 'rival').rewardHint, /does not add/);
  assert.match(worldPoints(cleared, { exploration: true }).find(point => point.id === 'exit').rewardHint, /cleared/);
  assert.deepEqual(worldPoints(cleared, { exploration: true }).filter(point => point.type === 'wild').map(point => point.speciesId),
    worldPoints({ ...cleared, optionalEncounters: true }, { exploration: true }).filter(point => point.type === 'wild' && point.speciesId !== OPTIONAL_HIDDEN_SPECIES.id).map(point => point.speciesId));
}
assert.equal(spurs, 15);
assert.equal(SPECIES.length, 80);
assert.deepEqual([REGION_LAYOUTS[0].landmarks[1].x, REGION_LAYOUTS[0].landmarks[1].z], [22,-26]);
for (const value of [null, 1, 'true', undefined]) {
  assert.throws(() => worldPoints(freshGame(), { exploration: value }), /exploration/);
}
const options = Object.defineProperty({}, 'exploration', {get() { assert.fail('Do not invoke getters'); }});
assert.throws(() => worldPoints(freshGame(), options), /exploration/);
assert.throws(() => { REGION_LAYOUTS[0].landmarks[1].name = 'Wrong clearing'; }, TypeError);
console.log(`PASS: 5 exact trial identities/visible waystones, 15 useful cache spurs, ${segments} safe route segments; legacy point output/save schema preserved; delivery/claim/rematch/optional separation and canonical80`);
