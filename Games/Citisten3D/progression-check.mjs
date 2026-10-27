import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITY_STAGES, getStage, nextStage, unlocked } from './progression.mjs';
import { NEW_BUILDINGS } from './city-content.mjs';
import { createSimulation } from './sim.mjs';

const building = type => ({ type, hp: 100, powered: true, watered: true });
const fixture = population => ({
  population, budget: 40000, progressionLevel: 0,
  buildings: ['townhall', 'residential', 'commercial', 'power', 'water', 'park', 'police'].map(building),
  power: { supply: 80, demand: 10, unserved: 0 }, water: { supply: 100, demand: 15, unserved: 0 }
});
assert.deepEqual(CITY_STAGES.map(s => s.level), [0, 1, 2, 3]);
assert.deepEqual(CITY_STAGES.map(s => s.grant), [0, 300, 500, 750]);
assert(CITY_STAGES.every(s => Object.isFrozen(s) && Object.isFrozen(s.requirements)));
for (const [population, expected] of [[0, 0], [11.99, 0], [12, 1], [59.99, 1], [60, 2], [149.99, 2], [150, 3]]) {
  const state = fixture(population), before = JSON.stringify(state);
  assert.equal(getStage(state).level, expected, `population ${population}`);
  assert.equal(nextStage(state)?.level ?? null, expected === 3 ? null : expected + 1);
  assert.equal(JSON.stringify(state), before, 'helpers do not mutate state or budget');
}
for (const type of ['residential', 'commercial']) for (const change of [{ hp: 0 }, { powered: false }, { watered: false }, { constructionRemaining: 0.25, constructionTotal: 4 }]) {
  const state = fixture(150);
  Object.assign(state.buildings.find(b => b.type === type), change);
  assert.equal(getStage(state).level, 0, `${type} inactive must block cumulative requirements`);
}
const complete = fixture(12);
complete.buildings.find(b => b.type === 'residential').constructionRemaining = 0;
assert.equal(getStage(complete).level, 1, 'zero remaining and absent legacy fields mean complete');
for (const kind of ['power', 'water']) {
  for (const utility of [{ supply: 10, demand: 10, unserved: 0 }, { supply: 100, demand: 10, unserved: 1 }, { supply: 100, demand: 10 }, { supply: NaN, demand: 10, unserved: 0 }]) {
    const state = fixture(150); state[kind] = utility;
    assert.equal(getStage(state).level, 1, `${kind} needs actual surplus without disconnected/unserved demand`);
  }
  const state = fixture(150);
  state.buildings.find(b => b.type === kind).constructionRemaining = 1;
  assert.equal(getStage(state).level, 1, 'unfinished supply does not qualify');
}
const services = fixture(150);
services.buildings = services.buildings.filter(b => b.type !== 'police');
assert.equal(getStage(services).level, 2, 'town hall does not count as a stage-3 service');
services.buildings.push({ ...building('clinic'), constructionRemaining: 1 });
assert.equal(getStage(services).level, 2);
services.buildings.at(-1).constructionRemaining = 0;
assert.equal(getStage(services).level, 3);
services.buildings.at(-1).watered = false;
assert.equal(getStage(services).level, 2);
for (const level of [0, 1, 2, 3]) {
  const state = { progressionLevel: level, population: 0 };
  assert.equal(getStage(state).level, level, 'highwater survives loss of all prerequisites');
  for (const [type, def] of Object.entries(NEW_BUILDINGS)) assert.equal(unlocked(type, state), level >= def.unlockStage, type);
}
for (const bad of [-1, 4, 1.5, NaN, '3']) assert.equal(getStage({ progressionLevel: bad }).level, 0);
assert.equal(getStage().level, 0);
assert.equal(nextStage().level, 1);
assert.match(nextStage().remaining, /12 residents.*supplied home.*supplied job lot/);
assert.equal(getStage(fixture(150)).level, 3);
assert.equal(unlocked('apartments', fixture(150)), false, 'eligible is not a recorded unlock');
for (const type of ['road', 'bridge', 'residential', 'commercial', 'industrial', 'power', 'water', 'park', 'police', 'fire', 'wall', 'watchtower', 'repair', 'bulldoze', 'river_pump']) assert(unlocked(type), type);
for (const type of ['barricade', 'unknown', '__proto__', 'constructor']) assert.equal(unlocked(type), false);
const oldFixture = { population: 128, buildings: [{ type: 'residential', x: 1, z: 2 }], power: { demand: 64, supply: 100 } };
assert.equal(getStage(oldFixture).level, 0);
assert(nextStage(oldFixture).summary.includes('supplied home'));

// Reach every stage using only stage-0 buildings, normal placements and real economy ticks.
const sim = createSimulation({ size: 40, mode: 'free' });
sim.roads.place({ x: 12, z: 17 }, { x: 28, z: 17 });
sim.roads.place({ x: 18, z: 17 }, { x: 18, z: 22 });
for (const [type, x, z] of [['power', 12, 16], ['water', 13, 16], ['residential', 15, 18], ['residential', 17, 18], ['residential', 23, 18], ['commercial', 15, 16], ['industrial', 20, 16], ['park', 24, 18], ['park', 25, 18]]) {
  assert(unlocked(type), `prerequisite ${type} must not lock itself`);
  assert(sim.place(type, x, z).ok, `${type} placement`);
}
const seen = new Set([0]);
for (let seconds = 0; seconds < 180; seconds++) { sim.update(1); seen.add(getStage(sim.state).level); }
assert.deepEqual([...seen], [0, 1, 2, 3], 'no circular locks or 500-population first wait');
console.log(`PROGRESSION CHECK PASS: thresholds, active prerequisites, cumulative rules, highwater, saved-only locks; natural base-only town reached ${Math.floor(sim.state.population)} residents and all 4 stages`);

// Browser-free contract checks. Native layout/input acceptance belongs to lane 6.
await import('./ui.mjs');
const source = readFileSync(new URL('./progression.mjs', import.meta.url), 'utf8');
assert(!/from\s+['"].*sim/.test(source), 'progression cannot import sim');
const ui = readFileSync(new URL('./ui.mjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('./ui.css', import.meta.url), 'utf8');
assert.match(ui, /\['bridge', 'Bridge'/);
for (const type of Object.keys(NEW_BUILDINGS)) assert(ui.includes(`option('${type}')`));
assert.match(ui, /!unlocked\(id, currentState\)/);
assert.match(ui, /stage\.summary/);
assert.match(ui, /stage\.unlockSummary/);
assert.match(ui, /\$90\/water lot \+ \$10\/dry lot/);
assert.match(ui, /constructionRemaining/);
assert.match(ui, /constructionTotal/);
assert.match(ui, /75% refund/);
assert.match(ui, /stage-earned/);
assert.match(ui, /terrain\?\.isWater/);
assert.match(ui, /if \(terrain !== mapTerrain \|\| size !== mapSize\)/);
assert.equal((ui.match(/terrain\.isWater\(/g) || []).length, 1, 'terrain classification is only in the cache rebuild');
assert.match(ui, /riverCells\.has\(cell\.z \* size \+ cell\.x\)/);
assert(!/\bstate\.\w+\s*=(?!=)/.test(ui), 'UI must not assign simulation state');
assert(!/\bstate\.\w+\.(?:push|splice|pop|shift|unshift)\(/.test(ui), 'UI must not mutate simulation arrays');
assert.match(ui, /optionsOpen = false/);
assert.match(ui, /const expanded = GROUPS\[activeGroup\]\.length > 1 && optionsOpen/);
assert.match(ui, /\$\('\.city-tools'\)\.hidden = !expanded/);
assert.match(ui, /button\.dataset\.group === activeGroup && expanded/);
assert.match(ui, /optionsOpen = activeGroup !== button\.dataset\.group \|\| !optionsOpen/);
assert.match(ui, /selected = type; activeGroup = group;\s+optionsOpen = false/);
assert.match(ui, /\$\(`\[data-group="\$\{activeGroup\}"\]`\)\.focus\(\)/);
assert(!/if \(mobile\.matches\) optionsOpen/.test(ui), 'tool collapse/toggle must work on desktop too');
assert.match(css, /min-height: 44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /max-height: 26vh/);
assert.match(css, /white-space: nowrap/);
assert(!/https?:\/\/|\bfetch\(/.test(ui + css));
console.log('PROGRESSION UI STATIC PASS: six options, bridge prices, saved unlock guard, shared requirements, site countdown/refund, events, cached authoritative river map, read-only state, 44px/focus/bounded tools, desktop/mobile collapse, group toggle/focus; browser QA not run');
