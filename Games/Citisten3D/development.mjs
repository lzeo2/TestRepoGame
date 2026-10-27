// Simulation-only development. The parent owns fixed steps, notice delivery and saves.
const technology = (id, label, cost, duration, upkeep, population, buildings, prerequisites = [], branch = null) =>
  Object.freeze({ id, label, cost, duration, upkeep, population, buildings: Object.freeze(buildings.map(group => Object.freeze(group))), prerequisites: Object.freeze(prerequisites), branch });
export const TECHNOLOGIES = Object.freeze({
  planning: technology('planning', 'Town planning', 300, 12, 0.02, 12, [['residential', 'apartments']]),
  agronomy: technology('agronomy', 'Agronomy', 650, 24, 0.05, 30, [['workshop']], ['planning'], 'agriculture'),
  fabrication: technology('fabrication', 'Fabrication', 800, 32, 0.07, 30, [['industrial']], ['planning'], 'manufacturing'),
  logistics: technology('logistics', 'Logistics', 600, 20, 0.05, 40, [['commercial']], ['planning']),
  education: technology('education', 'Public education', 900, 36, 0.08, 60, [['school']], ['planning'])
});
const TYPES = Object.freeze({
  residential: ['logistics'], apartments: ['logistics'], commercial: ['logistics'],
  industrial: ['fabrication'], workshop: ['agronomy', 'fabrication'],
  power: ['logistics'], water: ['logistics'], solar: ['logistics'], river_pump: ['logistics'],
  police: ['education'], fire: ['education'], clinic: ['education'], school: ['education'], park: ['agronomy', 'education']
});
const OUTPUTS = ['capacity', 'jobs', 'supply'];
const CLOCKS = ['upgradeRemaining', 'upgradeTotal', 'upgradePaidCost'];
const has = (object, key) => object != null && Object.hasOwn(object, key);
const known = id => typeof id === 'string' && has(TECHNOLOGIES, id);
const numeric = (value, min = 0, max = 1e9) => Number.isFinite(value) && value >= min && value <= max;
const quarter = value => numeric(value) && Number.isSafeInteger(value * 4);
const require = (condition, message) => { if (!condition) throw new RangeError(message); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => has(value, key));
const dense = (value, limit) => Array.isArray(value) && value.length <= limit && Object.keys(value).length === value.length &&
  Object.keys(value).every((key, index) => key === String(index));
const enabled = state => state?.expansionEnabled === true;
const activeBuilding = building => building.hp > 0 && !(building.constructionRemaining > 0);
const supported = type => typeof type === 'string' && has(TYPES, type);
const levelOf = building => building.level === undefined ? 0 : building.level;
const hasTech = (state, id) => state.development.completed.includes(id);
const prerequisitesMet = (state, type, level) => hasTech(state, 'planning') &&
  (level === 1 || TYPES[type].some(id => hasTech(state, id)));
const upgradePrice = (definition, level) => Math.ceil(definition.cost * (level === 1 ? 0.75 : 1.5));
const upgradeTime = level => level === 1 ? 12 : 24;

export function createDevelopment() {
  return { completed: [], active: null, branch: null };
}

function validateCore(state) {
  require(state && (state.expansionEnabled === undefined || typeof state.expansionEnabled === 'boolean'), 'Invalid expansion flag');
  require(numeric(state.budget, -1e12, 1e12) && numeric(state.population), 'Invalid development economy');
  require(dense(state.buildings, 40000), 'Invalid development buildings');
  const ids = new Set();
  for (const b of state.buildings) {
    require(b && Number.isSafeInteger(b.id) && b.id > 0 && !ids.has(b.id) && typeof b.type === 'string', 'Invalid development building ID');
    ids.add(b.id);
    require(numeric(b.hp) && (b.constructionRemaining === undefined || quarter(b.constructionRemaining)), 'Invalid development building clock or health');
  }
  const d = state.development;
  require(exactKeys(d, ['completed', 'active', 'branch']), 'Invalid development record');
  require(dense(d.completed, 5) && new Set(d.completed).size === d.completed.length && d.completed.every(known), 'Invalid completed research IDs');
  require([null, 'agriculture', 'manufacturing'].includes(d.branch), 'Invalid research branch');
  const prior = new Set();
  for (const id of d.completed) {
    const t = TECHNOLOGIES[id];
    require(t.prerequisites.every(p => prior.has(p)), 'Unmet completed research prerequisites');
    require(t.branch === null || t.branch === d.branch, 'Conflicting completed research branch');
    prior.add(id);
  }
  if (d.active !== null) {
    const a = d.active;
    require(exactKeys(a, ['id', 'remaining', 'total', 'paidCost']) && known(a.id) && !prior.has(a.id), 'Invalid active research ID');
    const t = TECHNOLOGIES[a.id];
    require(quarter(a.remaining) && a.remaining > 0 && a.remaining <= t.duration && a.total === t.duration && a.paidCost === t.cost, 'Invalid research clock or payment');
    require(t.prerequisites.every(p => prior.has(p)) && (t.branch === null || t.branch === d.branch), 'Unmet active research prerequisites');
  }
  const branchIds = [...d.completed, ...(d.active ? [d.active.id] : [])].filter(id => TECHNOLOGIES[id].branch);
  require(branchIds.length <= 1 && (d.branch === null ? branchIds.length === 0 : branchIds.length === 1), 'Research branch must match its committed choice');
  for (const b of state.buildings) validateUpgradeRecord(state, b);
}

function validateDefinition(definition) {
  require(definition && numeric(definition.cost, 1, 1e7) && numeric(definition.hp, 1), 'Invalid upgrade definition');
  if (definition.label !== undefined) require(typeof definition.label === 'string' && definition.label.length > 0 && definition.label.length <= 80, 'Invalid upgrade label');
  for (const field of ['upkeep', 'power', 'water', ...OUTPUTS, 'income', 'range', 'damage', 'serviceRadius', 'serviceGrowth', 'productionMultiplier']) {
    if (definition[field] !== undefined) require(numeric(definition[field]), `Invalid upgrade definition ${field}`);
  }
  require(numeric(definition.upkeep, 0.000001) && numeric(definition.power) && numeric(definition.water), 'Upgrades require upkeep and utility demand definitions');
  require([...OUTPUTS, 'serviceRadius'].some(field => definition[field] > 0), 'Upgrade has no operating benefit');
}

function validateUpgradeRecord(state, building) {
  const level = levelOf(building), present = CLOCKS.filter(field => has(building, field));
  require(Number.isInteger(level) && level >= 0 && level <= 2, 'Invalid building level');
  if (level === 0 && present.length === 0) return 0;
  require(supported(building.type), 'Unsupported upgraded building');
  require(present.length === 3 && CLOCKS.every(field => numeric(building[field])), 'Incomplete upgrade payment record');
  const remaining = building.upgradeRemaining;
  require(quarter(remaining) && quarter(building.upgradeTotal) && remaining <= building.upgradeTotal, 'Invalid upgrade clock');
  if (level === 0 && remaining === 0) {
    require(building.upgradeTotal === 0 && building.upgradePaidCost === 0, 'Idle upgrade has a payment');
    return 0;
  }
  const target = remaining > 0 ? level + 1 : level;
  require(target <= 2 && prerequisitesMet(state, building.type, target), 'Unmet upgrade prerequisites');
  require(building.upgradeTotal === upgradeTime(target) && numeric(building.upgradePaidCost, 1, 1.5e7), 'Invalid upgrade duration or payment');
  require(!(building.constructionRemaining > 0), 'Unfinished site cannot have an upgrade');
  return target;
}

function validateUpgrade(state, building, definitions) {
  const target = validateUpgradeRecord(state, building);
  if (!target) return;
  require(has(definitions, building.type), 'Missing upgraded building definition');
  const def = definitions[building.type];
  validateDefinition(def);
  require(building.upgradePaidCost === upgradePrice(def, target), 'Invalid upgrade payment');
}

// Call on the detached snapshot before changing roads or copying any saved state.
export function validateDevelopment(state, definitions) {
  require(state && (state.expansionEnabled === undefined || typeof state.expansionEnabled === 'boolean'), 'Invalid expansion flag');
  if (!enabled(state) && state.development === undefined) {
    require(Array.isArray(state.buildings) && state.buildings.every(b => b && b.level === undefined && CLOCKS.every(field => b[field] === undefined)), 'Legacy city has orphaned upgrades');
    return true;
  }
  validateCore(state);
  for (const b of state.buildings) validateUpgrade(state, b, definitions);
  return true;
}

const offer = (ok, reason, cost = 0, duration = 0) => ({ ok, reason, cost, duration });
function actionError(state, definitions, full) {
  if (!enabled(state)) return 'Expansion is disabled';
  try { if (full) validateDevelopment(state, definitions); else validateCore(state); }
  catch (error) { if (error instanceof RangeError) return error.message; throw error; }
  if (state.phase === 'lost') return 'The city is lost';
  return '';
}

export function researchOffer(state, id) {
  const t = known(id) ? TECHNOLOGIES[id] : null;
  const reject = reason => offer(false, reason, t?.cost ?? 0, t?.duration ?? 0);
  const error = actionError(state, null, false);
  if (error) return reject(error);
  if (!t) return reject('Unknown technology');
  if (hasTech(state, id)) return reject('Research already completed');
  if (state.development.active) return reject('Research already in progress');
  if (t.branch && state.development.branch && t.branch !== state.development.branch) return reject('The other specialization is already chosen');
  if (!t.prerequisites.every(p => hasTech(state, p))) return reject(`Requires ${t.prerequisites.join(', ')}`);
  if (state.population < t.population) return reject(`Requires ${t.population} residents`);
  for (const group of t.buildings) {
    if (!state.buildings.some(b => group.includes(b.type) && activeBuilding(b))) return reject(`Requires a completed ${group.join(' or ')}`);
  }
  if (state.budget < t.cost) return reject('Insufficient funds');
  return offer(true, '', t.cost, t.duration);
}

function researchNotice(type, id) {
  const t = TECHNOLOGIES[id];
  return { type, id, label: t.label, cost: t.cost, total: t.duration };
}
export function startResearch(state, id) {
  const result = researchOffer(state, id);
  if (!result.ok) return result;
  const t = TECHNOLOGIES[id];
  state.budget -= result.cost;
  state.development.active = { id, remaining: result.duration, total: result.duration, paidCost: result.cost };
  if (t.branch) state.development.branch = t.branch;
  return { ...result, notice: researchNotice('research-started', id) };
}

export function upgradeOffer(state, building, definitions) {
  const error = actionError(state, definitions, true);
  if (error) return offer(false, error);
  if (!building || !state.buildings.includes(building)) return offer(false, 'Building no longer exists');
  if (!activeBuilding(building)) return offer(false, 'Requires a living, completed building');
  if (!supported(building.type) || !has(definitions, building.type)) return offer(false, 'This building cannot be upgraded');
  const def = definitions[building.type];
  try { validateDefinition(def); }
  catch (error) { if (error instanceof RangeError) return offer(false, error.message); throw error; }
  const level = levelOf(building);
  if (level === 2) return offer(false, 'Maximum upgrade level reached');
  const cost = upgradePrice(def, level + 1), duration = upgradeTime(level + 1);
  if (building.upgradeRemaining > 0) return offer(false, 'Upgrade already in progress', cost, duration);
  if (!prerequisitesMet(state, building.type, level + 1)) return offer(false, level === 0 ? 'Requires planning' : `Requires ${TYPES[building.type].join(' or ')}`, cost, duration);
  if (state.budget < cost) return offer(false, 'Insufficient funds', cost, duration);
  return offer(true, '', cost, duration);
}

function upgradeNotice(type, building, level, cost, total, definition) {
  return { type, id: building.id, label: definition.label || building.type, buildingType: building.type, level, cost, total };
}
export function startUpgrade(state, building, definitions) {
  const result = upgradeOffer(state, building, definitions);
  if (!result.ok) return result;
  const level = levelOf(building);
  state.budget -= result.cost;
  building.level = level;
  building.upgradeRemaining = result.duration;
  building.upgradeTotal = result.duration;
  building.upgradePaidCost = result.cost;
  return { ...result, notice: upgradeNotice('upgrade-started', building, level + 1, result.cost, result.duration, definitions[building.type]) };
}

export function advanceDevelopment(state, dt, definitions) {
  require(dt === 0 || dt === 0.25, 'Development requires a zero or quarter-second simulation step');
  if (!enabled(state)) return [];
  validateDevelopment(state, definitions);
  if (dt === 0 || state.phase === 'lost') return [];
  const notices = [], d = state.development;
  if (d.active) {
    d.active.remaining -= dt;
    if (d.active.remaining === 0) {
      const id = d.active.id;
      d.completed.push(id);
      d.active = null;
      notices.push(researchNotice('research-complete', id));
    }
  }
  for (const b of state.buildings) {
    if (!(b.upgradeRemaining > 0) || !activeBuilding(b)) continue;
    b.upgradeRemaining -= dt;
    if (b.upgradeRemaining === 0) {
      b.level = levelOf(b) + 1;
      notices.push(upgradeNotice('upgrade-complete', b, b.level, b.upgradePaidCost, b.upgradeTotal, definitions[b.type]));
    }
  }
  return notices;
}

export function effectiveBuilding(definition, building, state) {
  const result = { ...definition };
  if (!enabled(state) || !activeBuilding(building) || !supported(building.type)) return result;
  const level = levelOf(building);
  require(Number.isInteger(level) && level >= 0 && level <= 2, 'Invalid effective building level');
  if (level === 0) return result;
  validateDefinition(definition);
  require(prerequisitesMet(state, building.type, level), 'Unmet effective building prerequisites');
  for (const field of OUTPUTS) if (definition[field] !== undefined) result[field] = definition[field] * (1 + 0.25 * level);
  result.upkeep = definition.upkeep * (1 + 0.4 * level);
  result.power = definition.power * (1 + 0.3 * level);
  result.water = definition.water * (1 + 0.3 * level);
  if (definition.serviceRadius !== undefined) result.serviceRadius = definition.serviceRadius * (1 + 0.1 * level);
  if (definition.serviceGrowth !== undefined) result.serviceGrowth = definition.serviceGrowth * (1 + 0.1 * level);
  if (['industrial', 'workshop'].includes(building.type)) result.productionMultiplier = (definition.productionMultiplier ?? 1) * (1 + 0.25 * level);
  // hp, maxHp, price and income stay unchanged. Production owns actual sales.
  return result;
}

export function researchUpkeep(state) {
  if (!enabled(state)) return 0;
  validateCore(state);
  return state.development.completed.reduce((total, id) => total + TECHNOLOGIES[id].upkeep, 0);
}
