import { NEW_BUILDINGS, isBuildingActive } from './city-content.mjs';

const BASE_TOOLS = new Set(['road', 'bridge', 'townhall', 'residential', 'commercial', 'industrial', 'power', 'water', 'police', 'fire', 'park', 'wall', 'watchtower', 'repair', 'bulldoze']);
const rule = (key, min, label) => Object.freeze({ key, min, label });
const settled = [rule('homes', 1, 'supplied home'), rule('jobs', 1, 'supplied job lot')];
const utilities = [rule('powerSources', 1, 'completed power source'), rule('waterSources', 1, 'completed water source'), rule('powerSurplus', 1, 'power surplus, no unserved demand'), rule('waterSurplus', 1, 'water surplus, no unserved demand')];
const describe = requirement => requirement.key.endsWith('Surplus') ? requirement.label : `${requirement.min} ${requirement.label}`;
export const CITY_STAGES = Object.freeze([
  { level: 0, name: 'Settlement', grant: 0, unlockSummary: '', requirements: [] },
  { level: 1, name: 'Neighborhood', grant: 300, unlockSummary: '12 residents + supplied home and job lot', requirements: [rule('population', 12, 'residents'), ...settled] },
  { level: 2, name: 'Town', grant: 500, unlockSummary: 'Neighborhood + 60 residents + spare power and water', requirements: [rule('population', 60, 'residents'), ...settled, ...utilities] },
  { level: 3, name: 'Borough', grant: 750, unlockSummary: 'Town + 150 residents + 2 supplied service lots', requirements: [rule('population', 150, 'residents'), ...settled, ...utilities, rule('services', 2, 'supplied service lots (not town hall)')] }
].map(stage => Object.freeze({ ...stage, requirements: Object.freeze(stage.requirements), summary: stage.requirements.map(describe).join('; ') })));

const savedLevel = state => Number.isInteger(state.progressionLevel) && state.progressionLevel >= 0 && state.progressionLevel < CITY_STAGES.length ? state.progressionLevel : 0;
function metrics(state) {
  const complete = (state.buildings || []).filter(isBuildingActive);
  const supplied = complete.filter(b => b.powered && b.watered);
  const surplus = kind => {
    const utility = state[kind];
    return Number.isFinite(utility?.supply) && Number.isFinite(utility?.demand) && utility.demand >= 0 && utility.supply > utility.demand && Number.isFinite(utility.unserved) && utility.unserved >= 0 && utility.unserved <= 0.01 ? 1 : 0;
  };
  return {
    population: Number.isFinite(state.population) ? state.population : 0,
    homes: supplied.filter(b => b.type === 'residential' || NEW_BUILDINGS[b.type]?.capacity > 0).length,
    jobs: supplied.filter(b => ['commercial', 'industrial'].includes(b.type) || NEW_BUILDINGS[b.type]?.jobs > 0).length,
    services: supplied.filter(b => ['park', 'police', 'fire'].includes(b.type) || NEW_BUILDINGS[b.type]?.serviceRadius > 0).length,
    powerSources: complete.filter(b => b.type === 'power' || NEW_BUILDINGS[b.type]?.utilityKind === 'power').length,
    waterSources: complete.filter(b => b.type === 'water' || NEW_BUILDINGS[b.type]?.utilityKind === 'water').length,
    powerSurplus: surplus('power'), waterSurplus: surplus('water')
  };
}
// The simulation records the highwater and pays crossed grants; these helpers never do.
export function getStage(state = {}) {
  const values = metrics(state);
  return CITY_STAGES.findLast(stage => stage.level <= savedLevel(state) || stage.requirements.every(r => values[r.key] >= r.min));
}
export function nextStage(state = {}) {
  const stage = CITY_STAGES[getStage(state).level + 1];
  if (!stage) return null;
  const values = metrics(state);
  return { ...stage, remaining: stage.requirements.filter(r => values[r.key] < r.min).map(describe).join('; ') };
}
export function unlocked(type, state = {}) {
  return BASE_TOOLS.has(type) || (Object.hasOwn(NEW_BUILDINGS, type) && savedLevel(state) >= NEW_BUILDINGS[type].unlockStage);
}
