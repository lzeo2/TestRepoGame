import { SPECIES, BY_ID, ABILITIES, ELEMENT_WHEEL } from './data.js';
import { statsFor, createCreature, clearEffects, gainXP, createBattle, applyAction } from './battle.js';
import { REGIONS, RIVALS, REGION_LAYOUTS, movePosition, routeTo, unlockedRegion, MAX_ROSTER, BACKUP_KEY, freshGame, validateSave, readSave, writeSave, worldPoints, nearbyPoint, releaseCreature, challengeFor, settleChallenge } from './world.js';
import { FINALE_STAGES, ENDING } from './campaign.js';
import { ITEMS, COSMETICS, SHOPS, CONTRACTS, buyItem, sellItem, buyCosmetic, completeContract, refreshStock } from './economy.js';
import { CLASSES, TRAITS, generateIndividual, unlockedClasses, synergyFor, classRank, classProgress, perksFor } from './builds.js';
import { createView } from './view.js';

const byId = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const text = (id, value) => { byId(id).textContent = value; };
const canvas = byId('game-canvas');
const viewport = canvas.parentElement;
const layout = document.querySelector('.play-layout');
const keys = new Set(), pointers = new Map();
const directions = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
const saved = readSave(undefined, true);
let expectedPrimary = saved.raw, saveQueue = Promise.resolve(false), pendingSaves = 0, saveBlocked = '';
let replacementExpected, savePreview = null;
const lockedSaves = Boolean(navigator.locks?.request);
let savedSlot = saved.state, slotPresent = Boolean(saved.state || saved.error), savePermission = !saved.error;
let state = null, battle = null, phase = 'menu', paused = false, busy = false;
let starterId = 'cindupp', route = [], pendingPoint = null, resetAction = null;
let serviceContext = null, serviceMenu = 'kit', nearbyKey = '', battleFinished = false;
let view = null, viewFailed = false, battleModels = '', busyElapsed = 0;
let inspectionToken = 0, inspectedSpecies = null, selectedUidForCosmetic = null, inspectionFocus = null, releaseUid = null;
let previousTime = null, saveElapsed = 0, positionDirty = false, rafId, renderClock = 0, renderElapsed = 0;
const modal = () => all('dialog').some(dialog => dialog.open);
const stopped = () => paused || modal() || document.hidden;
const playable = () => state && !stopped() && !busy;
const party = () => state.team.map(uid => state.roster.find(c => c.uid === uid));
const nameOf = c => `${BY_ID[c.speciesId].name} · level ${c.level}`;

function button(label, action) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', action);
  return element;
}
function paragraph(value) {
  const element = document.createElement('p');
  element.textContent = value;
  return element;
}
function message(value) {
  text('message', value);
}
function clearInput() { keys.clear(); pointers.clear(); previousTime = null; }
function focusGame() { canvas.focus({ preventScroll: true }); }
function resize() { view?.resize(); }
function localSnapshot() {
  if (!state) {
    if (!savedSlot) throw new Error('No valid local expedition to export.');
    return validateSave(savedSlot);
  }
  state.pendingBattle = phase === 'battle' && battle && !battle.result ? structuredClone(battle) : null;
  return validateSave(state);
}
function saveStatus(value) {
  text('save-state', value);
  if (byId('save-dialog').open) text('save-dialog-status', value);
}
function saveFailure(error) {
  saveBlocked = String(error);
  saveStatus(`${saveBlocked} Automatic saving stopped. This tab stays in memory. Export it, reload the stored run, or preview an explicit replacement. A failed primary write may already have rotated the backup.`);
}
function save(snapshot = null, consent = null) {
  const expected = consent ? consent.raw : replacementExpected;
  const explicit = consent !== null || replacementExpected !== undefined;
  replacementExpected = undefined;
  positionDirty = false;
  saveElapsed = 0;
  if ((!savePermission || saveBlocked || expectedPrimary === undefined) && !explicit) {
    saveStatus(`${saveBlocked || saved.error || 'Storage could not be read.'} Saving stopped; export, reload, or preview an explicit replacement. No further writes attempted.`);
    return Promise.resolve(false);
  }
  let canonical, raw;
  try { canonical = validateSave(snapshot ?? localSnapshot()); raw = JSON.stringify(canonical); }
  catch (error) { saveFailure(error.message); return Promise.resolve(false); }
  pendingSaves++;
  saveStatus('Save pending. Keep this tab open until saving finishes.');
  // ponytail: without Web Locks this is optimistic only, not atomic across tabs; use one tab.
  const attempt = () => {
    if (saveBlocked && !explicit) return false;
    const error = writeSave(canonical, undefined, explicit ? expected : expectedPrimary);
    if (error) { saveFailure(error); return false; }
    expectedPrimary = raw; // Exact enqueued canonical bytes, never another tab's later read.
    savedSlot = canonical;
    slotPresent = true;
    savePermission = true;
    saveBlocked = '';
    return true;
  };
  saveQueue = saveQueue.then(() => lockedSaves ? navigator.locks.request('foldwild-save', attempt) : attempt())
    .catch(error => { saveFailure(error.message); return false; })
    .then(ok => {
      pendingSaves--;
      if (ok) saveStatus(pendingSaves ? 'Save pending. Keep this tab open until saving finishes.' : 'Progress saved on this device.');
      return ok;
    });
  return saveQueue;
}
function objective(value) {
  if (value.defeatedRivals.length < 5) return `Trials ${value.defeatedRivals.length}/5: train with ${RIVALS[value.defeatedRivals.length].name} in ${REGIONS[value.defeatedRivals.length].name}.`;
  const stage = FINALE_STAGES[value.finaleStage];
  return stage ? `Return lessons ${value.finaleStage}/3: ${stage.host} at Rest Camp, ${REGIONS[stage.region].name}.`
    : `Campaign complete. Free play: ${value.caught.length}/80 species collected. Regional rematches available.`;
}
function rankSummary(value, id) {
  const progress = classProgress(value, id), perks = perksFor(id, progress.rank);
  const benefit = id === 'pathfinder' ? `+${perks.fiberBonus} fiber per bundle` : id === 'binder' ? `+${Math.round(perks.captureBonus * 100)} capture percentage points (90% cap)`
    : id === 'warden' ? `+${perks.shieldBonus} shield (26 cap)` : id === 'tactician' ? `+${perks.switchEnergy} incoming switch energy (maximum energy cap)`
      : `+${perks.contractBonus} Marks per delivery`;
  return `${CLASSES[id].name} rank ${progress.rank}/3: ${benefit}. ${progress.rank === 3 ? 'Maximum rank.' : `Next: ${progress.current}/${progress.target} ${progress.requirement}.`}`;
}
function saveSummary(value) {
  return value ? `Seed ${value.seed}, ${REGIONS[value.region].name}, ${value.roster.length} allies. ${objective(value)} ${value.pendingChallenge ? `${value.pendingChallenge.kind} ${value.pendingChallenge.id + 1}, ` : ''}${value.pendingBattle ? `battle round ${value.pendingBattle.round}, pinned class rank ${value.pendingBattle.player.classRank}` : 'on the trail'}` : 'No readable expedition';
}
async function previewSave(candidate, label) {
  if (modal()) return saveStatus('Close the current dialog before previewing a replacement.');
  clearInput();
  savePreview = null;
  byId('save-confirm').disabled = true;
  if (!byId('save-dialog').open) byId('save-dialog').showModal();
  text('save-dialog-status', 'Waiting for queued saves before reading the slot...');
  await saveQueue;
  if (!byId('save-dialog').open) return;
  try {
    const next = validateSave(candidate);
    const current = readSave(undefined, true);
    if (current.raw === undefined) throw new Error(current.error || 'Storage could not be read; replacement disabled.');
    savePreview = { state: next, raw: current.raw };
    text('save-preview', `${label}: ${saveSummary(next)}. Replaces stored primary: ${current.raw === null ? 'empty slot' : saveSummary(current.state)}. Also replaces this tab: ${saveSummary(state)}. Previous primary bytes rotate into backup. Nothing changes until confirmation.`);
    byId('save-primary-bytes').value = current.raw === null ? '(absent slot)' : current.raw;
    text('save-dialog-status', current.error || 'Review both runs. If the primary changes again, confirmation will refuse to overwrite it.');
    byId('save-confirm').disabled = false;
  } catch (error) { text('save-dialog-status', error.message); }
}
async function importFile() {
  const file = byId('save-file').files[0];
  byId('save-file').value = '';
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error('Import refused: maximum file size is 256 KiB.');
    const fileText = await file.text();
    const parsed = readSave({ getItem: () => fileText });
    if (parsed.error || !parsed.state) throw new Error(parsed.error || 'Import has no expedition.');
    await previewSave(parsed.state, 'Imported file');
  } catch (error) { saveStatus(error.message); }
}
function ensureView() {
  if (view || viewFailed) return;
  try {
    view = createView(canvas, { onCheckpoint: approach, reducedMotion: byId('reduce-motion').checked,
      onDiagnostic: status => text('render-state', status.message) });
    if (state) { view.setQuality(state.quality); view.setAppearance(viewAppearance()); }
  } catch (error) {
    viewFailed = true;
    text('render-state', `${error.message}. Use the trail and battle buttons below; the expedition remains playable without 3D.`);
  }
}
function setPhase(value) {
  phase = value;
  clearInput();
  byId('menu').hidden = phase !== 'menu';
  layout.hidden = phase === 'menu';
  byId('world-hud').hidden = phase === 'menu';
  byId('battle-panel').hidden = phase !== 'battle';
  byId('result').hidden = phase !== 'result';
  byId('nearby-actions').hidden = phase !== 'world';
  byId('world-help').hidden = phase !== 'world';
  resize();
  updateHUD();
}
function markOwned() {
  for (const c of state.roster) {
    if (!state.seen.includes(c.speciesId)) state.seen.push(c.speciesId);
    if (!state.caught.includes(c.speciesId)) state.caught.push(c.speciesId);
  }
}
function updateHUD() {
  if (!state) return;
  text('zone-name', `${REGIONS[state.region].name} · trials ${state.defeatedRivals.length}/5${state.legacyRivals.length && !state.defeatedRivals.includes(3) ? ' · legacy Iven badge held' : ''}`);
  text('marks', state.marks);
  text('class-name', `${CLASSES[state.activeClass].name} ${classRank(state, state.activeClass)}`);
  text('campaign-objective', objective(state));
  text('class-progress', rankSummary(state, state.activeClass));
  const synergy = synergyFor(party());
  text('synergy-name', `${synergy.name}: ${synergy.description}`);
  byId('quality').value = state.quality;
  byId('services-btn').disabled = phase !== 'world' || busy || paused;
  text('score', state.score);
  text('dex-count', `${state.seen.length} seen / ${state.caught.length} caught / 80`);
  text('kites', state.kites);
  text('pause', paused ? 'Resume' : 'Pause');
  byId('pause').disabled = !['world', 'battle'].includes(phase);
  byId('new-run').disabled = busy;
  byId('save-now').disabled = !['world', 'battle', 'result'].includes(phase);
  byId('collection-btn').disabled = !['world', 'result'].includes(phase) || busy;
  byId('result-continue').disabled = busy;
  for (const element of all('[data-region]')) {
    const region = Number(element.dataset.region);
    element.textContent = REGIONS[region].name;
    element.disabled = phase !== 'world' || stopped() || busy || region > unlockedRegion(state);
    element.setAttribute('aria-pressed', String(region === state.region));
  }
  byId('team-list').replaceChildren(...party().map(c => {
    const max = statsFor(c);
    return paragraph(`${nameOf(c)} · HP ${c.hp}/${max.maxHP} · energy ${c.energy}/${max.maxEnergy}`);
  }));
  updateProximity();
}
function updateProximity() {
  const point = state && phase === 'world' ? nearbyPoint(state) : null;
  const allowed = Boolean(point && playable());
  byId('interact').disabled = !allowed;
  text('interact', point ? `Interact: ${point.label}` : 'Approach a trail marker');
  byId('rest').disabled = !allowed || point.type !== 'camp';
  for (const element of all('[data-move]')) element.disabled = phase !== 'world' || stopped() || busy;
  if (state && phase === 'world') nearbyActions();
  for (const element of all('[data-point]')) element.disabled = phase !== 'world' || stopped() || busy;
}
function nearbyActions() {
  const points = worldPoints(state).sort((a, b) => distanceTo(a) - distanceTo(b)).slice(0, 3);
  const key = points.map(p => `${p.id}:${p.label}`).join('/');
  if (key === nearbyKey) return;
  nearbyKey = key;
  byId('nearby-actions').replaceChildren(...points.map(point => {
    const element = button(point.type === 'wild' ? `${point.label} · level ${point.level}` : point.label, () => approach(point.id));
    element.dataset.point = point.id;
    return element;
  }));
}
function distanceTo(point) { return Math.hypot(point.x - state.position.x, point.z - state.position.z); }
function viewAppearance() {
  const { skin, hair, coat, backpack } = state.appearance;
  return { skin, hair, coat, pack: backpack };
}
function showWorld() {
  route = [];
  pendingPoint = null;
  battleModels = '';
  setPhase('world');
  nearbyKey = '';
  nearbyActions();
  ensureView();
  view?.setQuality(state.quality);
  view?.setReducedMotion(state.reducedMotion);
  view?.showWorld({ region: state.region, position: state.position, points: worldPoints(state), appearance: viewAppearance() });
  view?.setPlayerPosition(state.position.x, state.position.z, state.position.yaw);
  message(REGIONS[state.region].description);
  resize();
  focusGame();
}
function chooseStarter(id) {
  starterId = id;
  for (const element of all('[data-starter]')) element.setAttribute('aria-pressed', String(element.dataset.starter === id));
  const species = BY_ID[id];
  const warning = saved.error && !savePermission ? ` ${saved.error} Your old save is preserved until you confirm replacement.` : '';
  text('starter-description', `${species.name} · ${species.element}. ${species.abilities.join('; ')}. Starts at level 3.${warning}`);
}
function start() {
  const input = byId('seed-input');
  if (!input.reportValidity()) return;
  const seed = input.value === '' ? crypto.getRandomValues(new Uint32Array(1))[0] : Number(input.value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) { input.setCustomValidity('Enter a whole seed from 0 to 4294967295.'); input.reportValidity(); return; }
  state = freshGame(starterId, seed);
  state.reducedMotion = byId('reduce-motion').checked;
  paused = false;
  busy = false;
  battle = null;
  battleFinished = false;
  battleModels = '';
  view?.setReducedMotion(state.reducedMotion);
  showWorld();
  save();
}
async function confirmReset(action) {
  if (busy || modal()) return;
  resetAction = null;
  clearInput();
  byId('reset-confirm').disabled = true;
  byId('reset-dialog').showModal();
  resize();
  await saveQueue;
  if (!byId('reset-dialog').open) return;
  const current = readSave(undefined, true);
  text('reset-preview', `A new expedition will replace ${saveSummary(current.state)}. This tab: ${saveSummary(state)}. The prior primary is backed up only when the new run saves.`);
  byId('reset-primary-bytes').value = current.raw === null ? '(absent slot)' : current.raw ?? '(storage unreadable)';
  if (current.raw === undefined) { text('reset-preview', `${current.error} Replacement disabled; no known primary bytes.`); return; }
  resetAction = () => { replacementExpected = current.raw; action(); };
  byId('reset-confirm').disabled = false;
}
function returnToMenu() {
  closeInspection(false);
  battleFinished = false;
  battleModels = '';
  state = null;
  battle = null;
  paused = false;
  busy = false;
  route = [];
  pendingPoint = null;
  savedSlot = null;
  slotPresent = false;
  byId('continue').hidden = true;
  chooseStarter('cindupp');
  setPhase('menu');
  byId('start').focus();
}
function approach(id) {
  if (phase !== 'world' || !playable()) return;
  const point = worldPoints(state).find(p => p.id === id);
  if (!point) return;
  route = routeTo(state.region, state.position, point);
  if (!route.length) return message('No open trail reaches this point from here.');
  message(`Walking to ${point.label}. Press E or Interact when nearby.`);
  focusGame();
}
function healAll() {
  state.roster = state.roster.map(c => {
    const healed = clearEffects(c), max = statsFor(healed);
    healed.hp = max.maxHP;
    healed.energy = max.maxEnergy;
    return healed;
  });
}
function rest() {
  if (phase !== 'world' || !playable() || nearbyPoint(state)?.type !== 'camp') return;
  healAll();
  state.kites = Math.max(4, state.kites);
  message('Camp restored every ally\'s HP and energy, with at least four free Latch Kites. No Marks spent.');
  updateHUD();
  save();
}
function travel(region) {
  if (phase !== 'world' || !playable() || !Number.isInteger(region) || region < 0 || region > unlockedRegion(state)) return;
  state.region = region;
  state.position = { ...REGION_LAYOUTS[region].spawn };
  showWorld();
  save();
}
function result(title, description) {
  text('evolution-summary', '');
  byId('evolution-summary').hidden = true;
  text('result-title', title);
  text('result-description', description);
  text('result-continue', state.finaleStage === 3 ? 'Continue free play' : 'Continue expedition');
  setPhase('result');
  byId('result-title').focus({ preventScroll: true });
}
function interact() {
  if (phase !== 'world' || !playable()) return;
  const point = nearbyPoint(state);
  if (!point) return;
  route = [];
  if (point.type === 'camp') return openServices(point);
  if (point.challenge) return previewChallenge(point);
  if (point.type === 'supply') return collectSupply(point);
  if (!['wild', 'rival', 'exit'].includes(point.type)) return openServices(point);
  if (point.type === 'exit') {
    if (!state.defeatedRivals.includes(state.region)) return message(`Train with ${RIVALS[state.region].name} before taking this path.`);
    if (state.region < 4) return travel(state.region + 1);
    return result(state.finaleStage === 3 ? 'Campaign complete' : 'Five routes cleared', objective(state));
  }
  pendingPoint = point;
  if (point.type === 'wild') {
    if (!state.seen.includes(point.speciesId)) state.seen.push(point.speciesId);
    text('dialogue-title', `${point.label} · level ${point.level}`);
    text('dialogue-text', `${BY_ID[point.speciesId].element} · ${BY_ID[point.speciesId].abilities.join('; ')}. Weaken to half HP or less to try a Latch Kite. A miss spends a turn.`);
  } else {
    const rival = RIVALS[state.region];
    text('dialogue-title', rival.name);
    text('dialogue-text', `${rival.dialogue} Team: ${rival.team.map(c => `${BY_ID[c.speciesId].name} level ${c.level}`).join(', ')}. This is a training fight: no capture or fleeing.`);
  }
  setPhase('dialogue');
  byId('dialogue-dialog').showModal();
  save();
}
function challengeReady() {
  if (paused || busy || document.hidden || pendingSaves || saveBlocked || !savePermission || expectedPrimary === undefined) {
    throw new Error('Wait for saving to finish or resolve the local save status before beginning this challenge.');
  }
  if (readSave(undefined, true).raw !== expectedPrimary) throw new Error('Stored expedition changed. Reload it or explicitly replace it before beginning this challenge.');
}
function previewChallenge(point) {
  if (phase !== 'world' || paused || busy || (modal() && !byId('service-dialog').open)) return;
  try {
    challengeReady();
    const descriptor = challengeFor(state, point.challenge);
    if (byId('service-dialog').open) byId('service-dialog').close();
    pendingPoint = { id: descriptor.pointId, challenge: { kind: descriptor.kind, id: descriptor.id } };
    route = [];
    text('dialogue-title', descriptor.name);
    text('dialogue-text', `${descriptor.lesson} Fixed opponents: ${descriptor.team.map(c => `${BY_ID[c.speciesId].name} level ${c.level}`).join(', ')}. No capture or fleeing. Loss gives free camp recovery; retry this lesson without cost.`);
    setPhase('dialogue');
    byId('dialogue-dialog').showModal();
    byId('dialogue-start').focus({ preventScroll: true });
  } catch (error) { message(error.message); if (byId('service-dialog').open) text('service-description', error.message); }
}
function beginBattle() {
  if (phase !== 'dialogue' || !byId('dialogue-dialog').open || !pendingPoint || busy || paused || document.hidden) return;
  const point = pendingPoint;
  if (point.challenge) {
    try {
      challengeReady();
      const descriptor = challengeFor(state, point.challenge);
      const enemies = descriptor.team.map((c, i) => createCreature(c.speciesId, c.level, `${descriptor.kind}-${descriptor.id}-${state.encounterIndex}-${i}`));
      const next = structuredClone(state);
      for (const c of enemies) if (!next.seen.includes(c.speciesId)) next.seen.push(c.speciesId);
      next.pendingChallenge = { kind: descriptor.kind, id: descriptor.id };
      next.pendingBattle = createBattle(party(), enemies, { kind: 'rival', seed: (state.seed + state.encounterIndex) >>> 0,
        classId: state.activeClass, classRank: classRank(state, state.activeClass), synergyEnabled: true });
      state = validateSave(next);
      battle = structuredClone(state.pendingBattle);
      pendingPoint = null; battleFinished = false;
      setPhase('battle'); byId('dialogue-dialog').close();
      renderBattle(); save(); focusGame();
      message(descriptor.lesson);
    } catch (error) { text('dialogue-text', error.message); }
    return;
  }
  const kind = point.type === 'rival' ? 'rival' : 'wild';
  const individualSeed = point.individualSeed ?? ((state.seed ^ Math.imul(state.encounterIndex + 1, 2246822519) ^ SPECIES.findIndex(s => s.id === point.speciesId)) >>> 0);
  const enemies = kind === 'wild' ? [createCreature(point.speciesId, point.level, `wild-${state.encounterIndex}`, generateIndividual(individualSeed))]
    : RIVALS[state.region].team.map((c, i) => createCreature(c.speciesId, c.level, `rival-${state.encounterIndex}-${i}`));
  for (const c of enemies) if (!state.seen.includes(c.speciesId)) state.seen.push(c.speciesId);
  battle = createBattle(party(), enemies, { kind, seed: (state.seed + state.encounterIndex) >>> 0, classId: state.activeClass, classRank: classRank(state, state.activeClass), synergyEnabled: true });
  battleFinished = false;
  phase = 'battle';
  byId('dialogue-dialog').close();
  setPhase('battle');
  renderBattle();
  message(kind === 'wild' ? 'Wild encounter. Weaken to half HP before using a Latch Kite.' : 'Trailkeeper encounter. Choose an ability or switch ally.');
  if (battle.result) finishBattle();
  else save();
  focusGame();
}
function captureReason() {
  if (!battle || battle.result) return 'Encounter has ended';
  const enemy = battle.enemy.team[battle.enemy.active];
  if (battle.kind !== 'wild') return 'Trailkeeper allies cannot be captured';
  if (state.roster.length >= MAX_ROSTER) return 'Collection capacity reached (160 allies)';
  if (state.nextUid >= 1e9) return 'Collection identity capacity reached';
  if (state.kites < 1) return 'No Latch Kites remaining';
  if (enemy.hp <= 0) return 'Defeated creatures cannot be captured';
  if (enemy.hp > statsFor(enemy).maxHP / 2) return 'Weaken the wild creature to half HP or less';
  return '';
}
function abilityDescription(name, hush = false) {
  const a = ABILITIES[name];
  const effects = [];
  if (a.power) effects.push(`power ${a.power}`);
  if (a.heal) effects.push(`heal ${a.heal}`);
  if (a.restore) effects.push(`restore ${a.restore} energy`);
  if (a.shield) effects.push(`shield ${a.shield}`);
  if (a.status) effects.push(a.status);
  if (a.buff) effects.push(`${a.buff.stat} +${a.buff.percent}%`);
  if (a.debuff) effects.push(`${a.debuff.stat} -${a.debuff.percent}%`);
  if (a.cleanse) effects.push('cleanse status');
  return `${name} · cost ${a.cost + (hush ? 2 : 0)} · ${effects.join(', ')}`;
}
function statusDescription(c) {
  const effects = [];
  if (c.status) effects.push(`${c.status.name} (${c.status.remaining} turns)`);
  if (c.shield) effects.push(`shield ${c.shield.hp} (${c.shield.remaining} turns)`);
  for (const [stat, effect] of Object.entries(c.buffs)) effects.push(`${stat} ${effect.percent > 0 ? '+' : ''}${effect.percent}% (${effect.remaining} turns)`);
  return effects.join('; ') || 'No status';
}
function renderBattle() {
  if (!battle) return;
  const player = battle.player.team[battle.player.active], enemy = battle.enemy.team[battle.enemy.active];
  for (const [side, c] of [['player', player], ['enemy', enemy]]) {
    const max = statsFor(c);
    text(`${side}-name`, `${nameOf(c)} · ${BY_ID[c.speciesId].element}`);
    for (const [resource, maximum] of [['hp', max.maxHP], ['energy', max.maxEnergy]]) {
      text(`${side}-${resource}`, `${c[resource]} / ${maximum}`);
      byId(`${side}-${resource}-bar`).max = maximum;
      byId(`${side}-${resource}-bar`).value = c[resource];
    }
    text(`${side}-status`, statusDescription(c));
  }
  const blocked = phase !== 'battle' || !playable() || Boolean(battle.result);
  BY_ID[player.speciesId].abilities.forEach((name, slot) => {
    const cost = ABILITIES[name].cost + (player.status?.name === 'Hush' ? 2 : 0);
    text(`ability-${slot}`, `${slot + 1}. ${abilityDescription(name, player.status?.name === 'Hush')}`);
    byId(`ability-${slot}`).disabled = blocked || player.energy < cost;
  });
  const reason = captureReason();
  text('capture', reason ? `Latch Kite: ${reason}` : `Latch Kite (${state.kites} left)`);
  byId('capture').disabled = blocked || Boolean(reason);
  text('wait', `Wait · restore ${3 + TRAITS[player.traitId ?? 'neutral'].perks.waitEnergy} energy`);
  byId('wait').disabled = blocked;
  byId('flee').disabled = blocked || battle.kind !== 'wild';
  byId('switch-list').replaceChildren(...battle.player.team.map((c, index) => {
    const element = button(`Switch: ${nameOf(c)} · HP ${c.hp}`, () => command({ type: 'switch', index }));
    element.disabled = blocked || index === battle.player.active || c.hp <= 0;
    return element;
  }));
  byId('battle-log').replaceChildren(...battle.log.map(line => {
    const element = document.createElement('li');
    // Keep the pure log but display actual current names instead of internal UIDs.
    for (const c of [...battle.player.team, ...battle.enemy.team]) line = line.replaceAll(c.uid, BY_ID[c.speciesId].name);
    element.textContent = line;
    return element;
  }));
  byId('battle-log').scrollTop = byId('battle-log').scrollHeight;
  showBattleModels(player, enemy);
  updateHUD();
}
function showBattleModels(player, enemy) {
  const modelKey = `${state.region}/${player.speciesId}/${player.cosmeticId}/${enemy.speciesId}/${enemy.cosmeticId}`;
  if (modelKey === battleModels) return;
  battleModels = modelKey;
  view?.showBattle({ playerSpeciesId: player.speciesId, enemySpeciesId: enemy.speciesId, region: state.region,
    playerCosmeticId: player.cosmeticId ?? 'none', enemyCosmeticId: enemy.cosmeticId ?? 'none' });
}
function copyBattleTeam() {
  for (const c of battle.player.team) {
    const index = state.roster.findIndex(owned => owned.uid === c.uid);
    state.roster[index] = clearEffects(c);
  }
}
function command(action) {
  if (phase !== 'battle' || !playable() || battle.result) return;
  const player = battle.player.team[battle.player.active];
  if (action.type === 'capture' && captureReason()) return;
  if (action.type === 'ability') {
    const name = BY_ID[player.speciesId].abilities[action.slot];
    if (!name || player.energy < ABILITIES[name].cost + (player.status?.name === 'Hush' ? 2 : 0)) return;
  }
  if (action.type === 'switch' && (action.index === battle.player.active || !battle.player.team[action.index] || battle.player.team[action.index].hp <= 0)) return;
  if (action.type === 'flee' && battle.kind !== 'wild') return;
  busy = true;
  busyElapsed = 0;
  if (action.type === 'capture') state.kites--;
  // Settlement proves the terminal command against this exact preceding checkpoint.
  if (state.pendingChallenge) state.pendingBattle = structuredClone(battle);
  battle = applyAction(battle, action);
  if (!state.pendingChallenge || !battle.result) copyBattleTeam();
  if (state.pendingChallenge && !battle.result) state.pendingBattle = structuredClone(battle);
  renderBattle();
  if (battle.result) finishBattle();
  else save();
  // Evolution/KO scene replacement happens first, so it cannot erase the kite flight.
  view?.animateAction({ type: action.type, side: 'player' });
}
function finishBattle() {
  if (!battle?.result || battleFinished) return;
  const outcome = battle.result;
  const beforeSpecies = new Map(party().map(c => [c.uid, c.speciesId]));
  if (state.pendingChallenge) {
    const context = state.pendingChallenge;
    state = settleChallenge(state, battle);
    battleFinished = true; pendingPoint = null; serviceContext = null;
    const completed = context.kind === 'finale' && outcome === 'won' && state.finaleStage === 3;
    result(completed ? 'Campaign complete' : outcome === 'lost' ? 'Team recovered at camp' : context.kind === 'rematch' ? 'Rematch won' : 'Return lesson complete',
      completed ? ENDING : outcome === 'lost' ? `Every ally is fully rested, with at least four free Latch Kites. No Marks spent. ${objective(state)}`
        : `Each expedition ally gained ${12 * battle.enemy.team.reduce((sum, c) => sum + c.level, 0) + 20} XP. ${objective(state)}`);
  } else {
  battleFinished = true;
  state.pendingBattle = null;
  copyBattleTeam();
  const levels = battle.enemy.team.reduce((sum, c) => sum + c.level, 0);
  if (outcome === 'won' || outcome === 'captured') {
    for (const uid of state.team) {
      const index = state.roster.findIndex(c => c.uid === uid);
      state.roster[index] = gainXP(state.roster[index], levels * 12 + 20);
    }
    if (battle.kind === 'rival') {
      if (state.defeatedRivals.length === state.region) {
        state.defeatedRivals.push(state.region);
        state.score = Math.min(1e9, state.score + 250 + levels * 10);
        state.marks = Math.min(1e6, state.marks + 60 + 3 * levels);
        if (state.region === 2 && state.legacyRivals.includes(2) && state.defeatedRivals.length === 3) state.defeatedRivals.push(3);
      }
    } else {
      state.score = Math.min(1e9, state.score + (outcome === 'captured' ? 100 : 40) + levels * 10);
      state.marks = Math.min(1e6, state.marks + 18 + 2 * levels);
    }
  }
  let description;
  if (outcome === 'captured') {
    const captured = clearEffects(battle.captured);
    captured.uid = `owned-${state.nextUid++}`;
    captured.hp = Math.max(1, captured.hp);
    state.roster.push(captured);
    if (state.team.length < 3) state.team.push(captured.uid);
    description = `${BY_ID[captured.speciesId].name} joined your collection. One Latch Kite used on this attempt. Each expedition ally gained ${levels * 12 + 20} XP.`;
  } else if (outcome === 'lost') {
    healAll();
    state.position = { ...REGION_LAYOUTS[state.region].spawn };
    description = 'The camp welcomed your tired team. Every ally is fully rested; your collection and trail progress are safe.';
  } else if (outcome === 'won') {
    description = battle.kind === 'rival' ? `${RIVALS[state.region].winDialogue} Regional trials ${state.defeatedRivals.length}/5.` : `Each expedition ally gained ${levels * 12 + 20} XP.`;
  } else description = 'You left the encounter. The trail has new wild allies to meet.';
  state.encounterIndex = Math.min(1e9, state.encounterIndex + 1);
  markOwned();
  result(outcome === 'captured' ? 'Capture complete' : outcome === 'lost' ? 'Team needs a rest' : battle.kind === 'rival' && outcome === 'won' ? (state.defeatedRivals.length === 5 ? 'Five routes cleared' : 'Trail cleared') : outcome === 'won' ? 'Encounter won' : 'Encounter left', description);
  }
  const evolutions = party().filter(c => beforeSpecies.has(c.uid) && beforeSpecies.get(c.uid) !== c.speciesId)
    .map(c => `${BY_ID[beforeSpecies.get(c.uid)].name} unfolded into ${BY_ID[c.speciesId].name} at level ${c.level}.`);
  text('evolution-summary', evolutions.join(' '));
  byId('evolution-summary').hidden = !evolutions.length;
  // XP evolution is visible immediately, even while the last action effect runs.
  const player = state.roster.find(c => c.uid === battle.player.team[battle.player.active].uid);
  const enemy = battle.enemy.team[battle.enemy.active];
  showBattleModels(player, enemy);
  save();
}
function selectControl(label, values, current, change) {
  const wrapper = document.createElement('label'), select = document.createElement('select');
  wrapper.append(document.createTextNode(`${label} `), select);
  for (const [value, name] of values) {
    const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option);
  }
  select.value = current;
  select.addEventListener('change', () => change(select.value));
  return wrapper;
}
function collectSupply(point) {
  const id = `${state.region}:${point.id}`;
  if (state.claimedSupplies.includes(id) || point.materialId !== 'fiber') return;
  try {
    const bonus = perksFor(state.activeClass, classRank(state, state.activeClass)).fiberBonus;
    const next = structuredClone(state), amount = Math.min(999 - next.inventory.fiber, point.quantity + bonus);
    if (next.inventory.fiber >= 999) throw new Error('Fiber capacity reached. Deliver or sell a bundle first.');
    next.inventory.fiber = Math.min(999, next.inventory.fiber + amount);
    next.claimedSupplies.push(id);
    state = validateSave(next);
    showWorld(); updateHUD(); save();
    message(`Collected ${amount} fiber. Active class bonus before this bundle: ${bonus}; inventory cap 999.`);
  } catch (error) { message(error.message); }
}
function servicePoint() {
  return serviceContext && worldPoints(state).find(p => p.id === serviceContext.id && distanceTo(p) <= 1.8);
}
function atOutpost() {
  return worldPoints(state).some(p => distanceTo(p) <= 1.8 && (p.type === 'camp' || p.type === 'mentor' || p.shopId));
}
function openServices(point = null) {
  if (phase !== 'world' || !playable()) return;
  serviceContext = point;
  serviceMenu = point?.shopId ? (point.role === 'tailor' ? 'cosmetics' : 'shop') : point?.contractId ? 'contract' : point?.type === 'mentor' ? 'classes' : 'kit';
  if (point?.shopId) {
    try { state = refreshStock(state, point.shopId); } catch (error) { return message(error.message); }
  }
  clearInput(); route = [];
  byId('service-dialog').showModal();
  renderServices(); updateHUD(); resize();
}
function serviceAction(action, requires = 'field') {
  if (phase !== 'world' || !byId('service-dialog').open || paused || busy) return;
  try {
    const point = servicePoint();
    if (requires === 'shop' && !point?.shopId) throw new Error('Visit the supply merchant or tailor to trade.');
    if (requires === 'contract' && !point?.contractId) throw new Error('Visit this supply counter to deliver fiber.');
    if (requires === 'outpost' && !atOutpost()) throw new Error('Visit camp, a merchant or a field mentor to make this change.');
    state = validateSave(action(structuredClone(state), point));
    view?.setAppearance(viewAppearance());
    updateHUD(); save(); renderServices();
  } catch (error) { text('service-description', error.message); }
}
function useItem(next, uid, id) {
  const c = next.roster.find(c => c.uid === uid), max = c && statsFor(c);
  if (!c || !['patch', 'charge'].includes(id) || next.inventory[id] < 1) throw new Error('Recovery supply unavailable.');
  const resource = id === 'patch' ? 'hp' : 'energy', limit = id === 'patch' ? max.maxHP : max.maxEnergy;
  if (c.hp <= 0) throw new Error('Rest at camp to recover a knocked-out ally.');
  if (c[resource] >= limit) throw new Error('Already full. No supply spent.');
  c[resource] = Math.min(limit, c[resource] + (id === 'patch' ? 25 : 8));
  next.inventory[id]--;
  return next;
}
function renderServices() {
  const point = servicePoint(), content = byId('service-content'), nodes = [];
  text('service-title', point?.label ?? 'Field Kit');
  text('service-description', `${point?.dialogue ? `${point.dialogue}\n\n` : ''}${state.marks} Marks. Use recovery supplies here. Trade at merchants and tailors; change class or outfit at camp or an outpost.`);
  const tabs = document.createElement('div'); tabs.className = 'actions';
  for (const [id, label] of [['kit', 'Inventory'], ['classes', 'Classes'], ['appearance', 'Archivist']]) tabs.append(button(label, () => { serviceMenu = id; renderServices(); }));
  if (point?.shopId) for (const [id, label] of [['shop', 'Buy and sell'], ['cosmetics', 'Accessories']]) tabs.append(button(label, () => { serviceMenu = id; renderServices(); }));
  if (point?.contractId) tabs.append(button('Supply contract', () => { serviceMenu = 'contract'; renderServices(); }));
  nodes.push(paragraph(objective(state)), tabs);
  if (point?.type === 'camp') {
    nodes.push(button('Rest free: heal team and refill to four kites', () => {
      if (!servicePoint() || phase !== 'world' || paused || busy) return;
      byId('service-dialog').close(); rest();
    }));
    if (point.challenge) nodes.push(paragraph(`${point.challengeName}: ${point.lesson}`),
      button(`Preview ${point.challengeName}`, () => previewChallenge(point)));
  }
  if (serviceMenu === 'shop' && point?.shopId) {
    nodes.push(paragraph(`${SHOPS[point.shopId].name}. Prices per item; each button trades one. Stock refreshes after five encounters, not after opening this menu.`));
    for (const item of Object.values(ITEMS)) {
      const count = item.id === 'kite' ? state.kites : state.inventory[item.id], stock = state.shops[point.shopId].stock[item.id];
      const row = document.createElement('section');
      row.append(paragraph(`${item.name}: owned ${count}, stock ${stock}. Buy ${item.price} Marks; ${item.sell === 0 ? 'camp kites cannot be resold' : `sell ${item.sell} Marks`}.`));
      const buy = button(`Buy ${item.name} (${item.price})`, () => serviceAction((next, p) => buyItem(next, p.shopId, item.id), 'shop'));
      buy.disabled = !stock || state.marks < item.price || count >= 999;
      const sell = button(`Sell ${item.name} (${item.sell})`, () => serviceAction((next, p) => sellItem(next, p.shopId, item.id), 'shop'));
      sell.disabled = item.sell === 0 || count < 1 || stock >= 999 || state.marks + item.sell > 1e6;
      row.append(buy, sell); nodes.push(row);
    }
  } else if (serviceMenu === 'cosmetics' && point?.shopId) {
    nodes.push(paragraph('Accessories change appearance only. Equip owned accessories by ally in the field ledger.'));
    for (const cosmetic of Object.values(COSMETICS)) {
      const owned = state.cosmetics.includes(cosmetic.id);
      const control = button(`${cosmetic.name}: ${owned ? 'Owned' : `${cosmetic.price} Marks`}`, () => serviceAction((next, p) => buyCosmetic(next, p.shopId, cosmetic.id), 'shop'));
      control.disabled = owned || state.marks < cosmetic.price; nodes.push(control);
    }
  } else if (serviceMenu === 'contract' && point?.contractId) {
    const contract = CONTRACTS[point.contractId], completed = state.contracts.includes(contract.id);
    nodes.push(paragraph(`${contract.name}: deliver ${contract.quantity} fiber for ${contract.reward} Marks. Owned fiber ${state.inventory.fiber}. Active class adds ${perksFor(state.activeClass, classRank(state, state.activeClass)).contractBonus} Marks before this delivery. One payment per contract.`));
    const control = button(completed ? 'Delivery complete' : `Deliver ${contract.quantity} fiber`, () => serviceAction((next, p) => {
      const bonus = perksFor(next.activeClass, classRank(next, next.activeClass)).contractBonus;
      next = completeContract(next, p.contractId); next.marks = Math.min(1e6, next.marks + bonus); return next;
    }, 'contract'));
    control.disabled = completed || state.inventory.fiber < contract.quantity; nodes.push(control);
  } else if (serviceMenu === 'classes') {
    nodes.push(paragraph('One active class; switching at outposts is free. Ranks follow permanent field history. New fights pin your earned rank; saved fights keep theirs. Bonuses use the rank before each transaction. No class adds Wait energy.'));
    const unlocked = unlockedClasses(state);
    for (const cls of Object.values(CLASSES)) {
      const row = document.createElement('section'); row.append(paragraph(rankSummary(state, cls.id)));
      const control = button(cls.id === state.activeClass ? `${cls.name} active` : `Choose ${cls.name}`, () => serviceAction(next => {
        if (!unlockedClasses(next).includes(cls.id)) throw new Error('This class is still locked.');
        next.activeClass = cls.id; return next;
      }, 'outpost'));
      control.disabled = cls.id === state.activeClass || !unlocked.includes(cls.id) || !atOutpost();
      row.append(control); nodes.push(row);
    }
    if (!atOutpost()) nodes.push(paragraph('Visit camp, a merchant or a mentor to switch class.'));
  } else if (serviceMenu === 'appearance') {
    nodes.push(paragraph('Name, hairstyle and outfit colors are saved. Change them at camp or an outpost.'));
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'text'; input.maxLength = 24; input.value = state.appearance.name; input.disabled = !atOutpost();
    label.append(document.createTextNode('Archivist name '), input); nodes.push(label);
    const saveName = button('Save name', () => serviceAction(next => { next.appearance.name = input.value.trim(); return next; }, 'outpost'));
    saveName.disabled = !atOutpost(); nodes.push(saveName);
    const palettes = {
      skin: [['#bc916b', 'Warm'], ['#8a5a3c', 'Brown'], ['#e2bc96', 'Light'], ['#5d3b2d', 'Deep']],
      hair: [['short', 'Short'], ['cropped', 'Cropped'], ['long', 'Long'], ['none', 'None']],
      coat: [['#365a74', 'Blue'], ['#7b4f34', 'Brown'], ['#718267', 'Sage'], ['#b98369', 'Clay']],
      backpack: [['#b39a6c', 'Canvas'], ['#66513d', 'Brown'], ['#688ba0', 'Blue']]
    };
    for (const [key, values] of Object.entries(palettes)) {
      const control = selectControl(key, values, state.appearance[key], value => serviceAction(next => { next.appearance[key] = value; return next; }, 'outpost'));
      control.querySelector('select').disabled = !atOutpost(); nodes.push(control);
    }
  } else {
    nodes.push(paragraph(`Recovery Patches ${state.inventory.patch}: restore 25 HP to a conscious ally. Energy Charges ${state.inventory.charge}: restore 8 energy. Fiber ${state.inventory.fiber}: supply deliveries or sale.`));
    for (const c of state.roster) {
      const max = statsFor(c), row = document.createElement('section');
      row.append(paragraph(`${nameOf(c)}: HP ${c.hp}/${max.maxHP}, energy ${c.energy}/${max.maxEnergy}`));
      for (const id of ['patch', 'charge']) {
        const control = button(`Use ${ITEMS[id].name}`, () => serviceAction(next => useItem(next, c.uid, id)));
        control.disabled = !state.inventory[id] || c.hp <= 0 || (id === 'patch' ? c.hp >= max.maxHP : c.energy >= max.maxEnergy);
        row.append(control);
      }
      nodes.push(row);
    }
  }
  content.replaceChildren(...nodes);
}
function ledgerAction(action) {
  if (!state || !byId('collection-dialog').open || !['world', 'result'].includes(phase) || busy) return;
  try {
    state = validateSave(action(structuredClone(state))); updateHUD(); save(); collection();
    if (selectedUidForCosmetic) inspectCreature(null, selectedUidForCosmetic);
  } catch (error) { text('ledger-model-status', error.message); byId('ledger-inspector').hidden = false; }
}
function releaseReason(c) {
  if (state.pendingBattle) return 'Cannot release during a pending battle.';
  if (state.roster.length === 1) return 'Keep your last ally.';
  if (state.team.includes(c.uid)) return 'Remove this ally from the team before releasing.';
  if (state.favorites.includes(c.uid)) return 'Unfavorite this ally before releasing.';
  if (c.hp > 0 && !state.roster.some(other => other.uid !== c.uid && other.hp > 0)) return 'Keep your last conscious ally.';
  return '';
}
function askRelease(uid) {
  const c = state?.roster.find(owned => owned.uid === uid);
  if (!c || !byId('collection-dialog').open || releaseReason(c)) return;
  releaseUid = uid;
  text('release-title', `Release ${BY_ID[c.speciesId].name}?`);
  text('release-description', `Release ${nameOf(c)} (${c.uid}) from your collection? This cannot be undone. No Marks or supplies are awarded. Your discovery history is kept.`);
  byId('release-dialog').showModal();
  byId('release-cancel').focus();
}
async function inspectCreature(speciesId, uid = null, source = null) {
  if (!state || !byId('collection-dialog').open || !['world', 'result'].includes(phase)) return;
  const owned = uid && state.roster.find(c => c.uid === uid);
  if (uid && !owned) return;
  speciesId = owned?.speciesId ?? speciesId;
  if (!Object.hasOwn(BY_ID, speciesId) || !state.seen.includes(speciesId)) return;
  const token = ++inspectionToken;
  inspectedSpecies = speciesId; selectedUidForCosmetic = uid;
  if (source) inspectionFocus = { uid, speciesId };
  clearInput(); route = [];
  byId('ledger-inspector').hidden = false;
  text('ledger-model-name', owned ? `${nameOf(owned)} (${uid})` : BY_ID[speciesId].name);
  text('ledger-model-status', 'Loading local 3D model...');
  byId('ledger-model-host').append(canvas);
  ensureView(); resize();
  if (!view) {
    text('ledger-model-status', '3D view unavailable on this device. Creature information and collection controls remain available.');
    byId('ledger-preview-close').focus(); return;
  }
  try {
    await view.showInspection({ speciesId, cosmeticId: owned?.cosmeticId ?? 'none' });
    if (token !== inspectionToken || !byId('collection-dialog').open) return;
    resize();
    const info = view.inspect();
    text('ledger-model-status', info.fallbackModels.length ? `3D model unavailable. Marker shown instead. ${info.fallbackModels.join('; ')}`
      : info.countLoadedModels === 1 ? 'Local 3D model. Drag or use the rotation buttons.' : 'Local model is not available.');
  } catch (error) {
    if (token !== inspectionToken) return;
    text('ledger-model-status', `3D preview unavailable: ${error.message}`);
  }
  if (token === inspectionToken && source) {
    byId('ledger-inspector').scrollIntoView({ block: 'nearest' });
    byId('ledger-preview-close').focus({ preventScroll: true });
  }
}
function closeInspection(restore = true) {
  const wasInspecting = inspectedSpecies !== null || canvas.parentElement !== viewport;
  ++inspectionToken;
  inspectedSpecies = null; selectedUidForCosmetic = null;
  byId('ledger-inspector').hidden = true;
  viewport.prepend(canvas);
  clearInput(); battleModels = '';
  if (restore && wasInspecting && state) {
    if (phase === 'world') showWorld();
    else if (phase === 'result' && battle) {
      ensureView();
      const player = state.roster.find(c => c.uid === battle.player.team[battle.player.active].uid) ?? party()[0];
      showBattleModels(player, battle.enemy.team[battle.enemy.active]);
    }
  }
  resize();
  if (byId('collection-dialog').open) {
    const selector = inspectionFocus?.uid ? `[data-inspect="${inspectionFocus.uid}"]` : `[data-species="${inspectionFocus?.speciesId}"]`;
    (byId('collection-list').querySelector(selector) ?? byId('collection-close')).focus({ preventScroll: true });
  }
  inspectionFocus = null;
}
function collection() {
  if (!state || !['world', 'result'].includes(phase) || busy) return;
  const search = byId('ledger-search').value.trim().toLowerCase(), filter = byId('ledger-filter').value;
  const matches = species => (!search || `${species.name} ${species.family}`.toLowerCase().includes(search)) && (filter === 'all' || species.element === filter);
  const items = [paragraph(`Owned allies ${state.roster.length}/${MAX_ROSTER}. Team ${state.team.length}/3. Seen ${state.seen.length}/80; caught ${state.caught.length}/80. ${synergyFor(party()).name}.`)];
  for (const c of state.roster.filter(c => matches(BY_ID[c.speciesId]))) {
    const card = document.createElement('section'), max = statsFor(c), species = BY_ID[c.speciesId];
    card.dataset.uid = c.uid;
    card.append(paragraph(`${nameOf(c)} · ${species.element} · ${species.family} · HP ${c.hp}/${max.maxHP} · energy ${c.energy}/${max.maxEnergy} · XP ${c.xp}`));
    card.append(paragraph(`Attack ${max.attack}, defense ${max.defense}, speed ${max.speed}. Individual: ${Object.entries(c.profile ?? {}).map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}%`).join(', ')}. ${TRAITS[c.traitId ?? 'neutral'].name}: ${TRAITS[c.traitId ?? 'neutral'].description}`));
    const onTeam = state.team.includes(c.uid);
    const control = button(onTeam ? 'Remove from team' : 'Add to team', () => ledgerAction(next => {
      if (next.team.includes(c.uid)) { if (next.team.length <= 1) throw new Error('Keep at least one ally on the team.'); next.team = next.team.filter(uid => uid !== c.uid); }
      else { if (next.team.length >= 3) throw new Error('The team holds three allies.'); next.team.push(c.uid); }
      return next;
    }));
    control.disabled = onTeam ? state.team.length === 1 : state.team.length >= 3;
    const favorite = button(state.favorites.includes(c.uid) ? 'Unfavorite' : 'Favorite', () => ledgerAction(next => {
      next.favorites = next.favorites.includes(c.uid) ? next.favorites.filter(uid => uid !== c.uid) : [...next.favorites, c.uid]; return next;
    }));
    const inspect = button('Inspect', () => inspectCreature(null, c.uid, inspect)); inspect.dataset.inspect = c.uid;
    const release = button('Release', () => askRelease(c.uid)); release.dataset.release = c.uid;
    const reason = releaseReason(c); release.disabled = Boolean(reason); release.title = reason || 'Release this individual with confirmation';
    card.append(inspect, control, favorite, release);
    if (reason) card.append(paragraph(reason));
    card.append(selectControl('Accessory', state.cosmetics.map(id => [id, COSMETICS[id].name]), c.cosmeticId ?? 'none', value => ledgerAction(next => {
      if (!next.cosmetics.includes(value)) throw new Error('Accessory not owned.');
      next.roster.find(owned => owned.uid === c.uid).cosmeticId = value; return next;
    })));
    items.push(card);
  }
  items.push(paragraph(`Element wheel: ${Object.entries(ELEMENT_WHEEL).map(([a, b]) => `${a} beats ${b}`).join('; ')}. Strong damage x1.5; reverse x0.75.`));
  for (const species of SPECIES) {
    const discovered = state.seen.includes(species.id);
    if (!discovered && (search || filter !== 'all')) continue;
    if (discovered && !matches(species)) continue;
    const card = document.createElement('section');
    if (!discovered) card.append(paragraph(`#${species.number} Undiscovered`));
    else {
      card.append(paragraph(`#${species.number} ${species.name} · ${species.element} · ${species.family} · ${species.tier} · ${state.caught.includes(species.id) ? 'Caught' : 'Seen'}`));
      const inspect = button('Inspect species', () => inspectCreature(species.id, null, inspect));
      inspect.dataset.species = species.id; card.append(inspect);
      card.append(paragraph(species.abilities.map(name => abilityDescription(name)).join('; ')));
      if (species.evolvesTo) card.append(paragraph(`Evolves at level ${species.evolveLevel}${state.seen.includes(species.evolvesTo) ? ` into ${BY_ID[species.evolvesTo].name}` : '; next form undiscovered'}.`));
    }
    items.push(card);
  }
  byId('collection-list').replaceChildren(...items);
  clearInput();
  if (!byId('collection-dialog').open) { route = []; byId('collection-dialog').showModal(); }
  resize();
}
function togglePause() {
  if (!state || !['world', 'battle'].includes(phase) || modal()) return;
  paused = !paused;
  clearInput();
  message(paused ? 'Paused. Press P or Escape to resume.' : 'Expedition resumed.');
  updateHUD();
  if (phase === 'battle') renderBattle();
}
function move(dt) {
  let dx = 0, dz = 0;
  const held = new Set([...keys, ...pointers.values()]);
  for (const key of held) {
    const direction = directions[key];
    if (direction) { dx += direction[0]; dz += direction[1]; }
  }
  const manual = Boolean(dx || dz);
  if (manual) {
    route = [];
    const yaw = view?.getCameraYaw() ?? 0;
    [dx, dz] = [dx * Math.cos(yaw) + dz * Math.sin(yaw), dz * Math.cos(yaw) - dx * Math.sin(yaw)];
  } else {
    while (route.length && distanceTo(route[0]) <= 0.3) route.shift();
    if (route.length) { dx = route[0].x - state.position.x; dz = route[0].z - state.position.z; }
  }
  const length = Math.hypot(dx, dz);
  if (!length) return;
  const step = Math.min(4 * dt, manual ? Infinity : length);
  const previous = state.position, next = movePosition(state.region, previous, dx / length * step, dz / length * step);
  const actualX = next.x - previous.x, actualZ = next.z - previous.z;
  if (!actualX && !actualZ) return;
  next.yaw = Math.atan2(-actualX, -actualZ);
  state.position = next; positionDirty = true;
  view?.setPlayerPosition(next.x, next.z, next.yaw);
}
function frame(time) {
  const elapsed = previousTime === null ? 0 : Math.max(0, (time - previousTime) / 1000);
  previousTime = time;
  const dt = stopped() ? 0 : Math.min(0.05, elapsed);
  if (state && dt) {
    saveElapsed += dt;
    if (busy) {
      busyElapsed += dt;
      if (busyElapsed >= 0.45) {
        busy = false;
        if (phase === 'battle') renderBattle();
        else {
          updateHUD();
          if (phase === 'result' && !modal()) byId('result-continue').focus({ preventScroll: true });
        }
      }
    } else if (phase === 'world') move(dt);
    if (positionDirty && saveElapsed >= 1) save();
    updateProximity();
  }
  if (phase !== 'menu' && !document.hidden) {
    renderClock += elapsed; renderElapsed += dt;
    const interval = state?.quality === 'standard' ? 1 / 60 : 1 / 30;
    if (renderClock >= interval) { view?.render(stopped() ? 0 : renderElapsed); renderClock %= interval; renderElapsed = 0; }
  }
  rafId = requestAnimationFrame(frame);
}

all('[data-starter]').forEach(element => element.addEventListener('click', () => chooseStarter(element.dataset.starter)));
text('start', 'Start new expedition');
text('continue', 'Continue expedition');
byId('continue').hidden = !savedSlot;
byId('start').addEventListener('click', () => slotPresent ? confirmReset(start) : start());
function resumeSaved() {
  if (!savedSlot) return;
  state = validateSave(savedSlot);
  byId('reduce-motion').checked = state.reducedMotion;
  view?.setReducedMotion(state.reducedMotion);
  paused = false; busy = false; battleFinished = false; battleModels = '';
  pendingPoint = null; serviceContext = null;
  battle = state.pendingBattle ? structuredClone(state.pendingBattle) : null;
  ensureView();
  view?.setQuality(state.quality); view?.setReducedMotion(state.reducedMotion); view?.setAppearance(viewAppearance());
  if (battle) {
    route = []; pendingPoint = null;
    setPhase('battle'); renderBattle();
    message('Encounter resumed exactly where you saved. Choose your next command.'); focusGame();
  } else showWorld();
}
byId('continue').addEventListener('click', () => {
  if (modal()) return;
  resumeSaved();
  save();
});
byId('new-run').addEventListener('click', () => confirmReset(returnToMenu));
byId('reset-confirm').addEventListener('click', () => {
  const action = resetAction;
  resetAction = null;
  byId('reset-dialog').close();
  if (action) action();
});
byId('reset-cancel').addEventListener('click', () => byId('reset-dialog').close());
byId('reset-dialog').addEventListener('close', () => { resetAction = null; clearInput(); resize(); });
byId('dialogue-start').addEventListener('click', beginBattle);
byId('dialogue-cancel').addEventListener('click', () => byId('dialogue-dialog').close());
byId('dialogue-dialog').addEventListener('close', () => {
  if (phase === 'dialogue') { pendingPoint = null; setPhase('world'); focusGame(); }
  resize();
});
byId('collection-btn').addEventListener('click', collection);
byId('ledger-search').addEventListener('input', collection);
byId('ledger-filter').addEventListener('change', collection);
byId('services-btn').addEventListener('click', () => openServices(nearbyPoint(state)));
byId('service-dialog').addEventListener('close', () => { serviceContext = null; clearInput(); resize(); updateHUD(); if (!modal()) focusGame(); });
byId('camera-reset').addEventListener('click', () => { if (state && !modal()) view?.recenterCamera(); });
byId('quality').addEventListener('change', () => {
  if (!state) return;
  state.quality = byId('quality').value; view?.setQuality(state.quality); renderClock = 0; renderElapsed = 0; save();
});
byId('seed-input').addEventListener('input', () => byId('seed-input').setCustomValidity(''));
byId('collection-close').addEventListener('click', () => byId('collection-dialog').close());
byId('collection-dialog').addEventListener('close', () => {
  if (byId('release-dialog').open) byId('release-dialog').close();
  closeInspection(); clearInput(); resize(); updateHUD(); focusGame();
});
byId('ledger-preview-close').addEventListener('click', () => closeInspection());
byId('ledger-rotate-left').addEventListener('click', () => { if (inspectedSpecies) view?.orbitCamera(-Math.PI / 4); });
byId('ledger-rotate-right').addEventListener('click', () => { if (inspectedSpecies) view?.orbitCamera(Math.PI / 4); });
byId('ledger-model-reset').addEventListener('click', () => { if (inspectedSpecies) view?.recenterCamera(); });
byId('release-cancel').addEventListener('click', () => byId('release-dialog').close());
byId('release-dialog').addEventListener('close', () => {
  const uid = releaseUid; releaseUid = null;
  (byId('collection-list').querySelector(`[data-release="${uid}"]`) ?? byId('collection-close')).focus({ preventScroll: true });
});
byId('release-confirm').addEventListener('click', () => {
  if (!releaseUid || !byId('release-dialog').open || !byId('collection-dialog').open) return;
  try {
    const uid = releaseUid;
    state = releaseCreature(state, uid);
    if (selectedUidForCosmetic === uid) closeInspection();
    updateHUD(); save(); collection(); byId('release-dialog').close();
  } catch (error) { text('release-description', error.message); }
});
byId('save-now').addEventListener('click', async () => {
  if (!state) return;
  message('Save requested. Check the local save status before closing.');
  if (await save()) message('Progress saved on this device.');
});
byId('save-export').addEventListener('click', () => {
  try {
    const raw = JSON.stringify(validateSave(localSnapshot()));
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'foldwild-save.json';
    document.body.append(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    saveStatus('Local expedition exported as JSON. Browser storage was not changed.');
  } catch (error) { saveStatus(`Export unavailable: ${error.message}`); }
});
byId('save-file').addEventListener('change', importFile);
byId('save-backup').addEventListener('click', () => {
  const backup = readSave({ getItem: () => localStorage.getItem(BACKUP_KEY) });
  if (backup.error || !backup.state) return saveStatus(backup.error || 'No backup expedition to preview.');
  previewSave(backup.state, 'Backup recovery');
});
byId('save-replace').addEventListener('click', () => {
  try { previewSave(localSnapshot(), 'This tab'); } catch (error) { saveStatus(error.message); }
});
byId('save-reload').addEventListener('click', () => {
  if (confirm('Reload the stored expedition? Unsaved progress in this tab will be lost. Export it first if needed.')) location.reload();
});
byId('save-cancel').addEventListener('click', () => byId('save-dialog').close());
byId('save-dialog').addEventListener('close', () => { savePreview = null; clearInput(); });
byId('save-confirm').addEventListener('click', async () => {
  const preview = savePreview;
  if (!preview) return;
  savePreview = null;
  byId('save-confirm').disabled = true;
  if (await save(preview.state, { raw: preview.raw })) {
    byId('save-dialog').close();
    resumeSaved();
  }
});
byId('interact').addEventListener('click', interact);
byId('rest').addEventListener('click', rest);
byId('pause').addEventListener('click', togglePause);
byId('result-continue').addEventListener('click', () => { if (playable() && phase === 'result') { battle = null; showWorld(); save(); } });
all('[data-region]').forEach(element => element.addEventListener('click', () => travel(Number(element.dataset.region))));
all('[data-slot]').forEach(element => element.addEventListener('click', () => command({ type: 'ability', slot: Number(element.dataset.slot) })));
for (const type of ['capture', 'wait', 'flee']) byId(type).addEventListener('click', () => command({ type }));
byId('reduce-motion').checked = savedSlot ? savedSlot.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches;
byId('reduce-motion').addEventListener('change', () => {
  view?.setReducedMotion(byId('reduce-motion').checked);
  if (state) { state.reducedMotion = byId('reduce-motion').checked; save(); }
});
text('world-help', 'Focus the view for WASD/arrows. Nearby buttons follow open trails. E: interact. Drag: orbit camera. R: reset camera. 1-4: abilities. C: kite. Space: Wait. P/Escape: pause. Field ledger: edit team.');
const movement = document.createElement('div');
movement.className = 'actions';
movement.setAttribute('aria-label', 'Held movement controls');
for (const [value, label] of [['w', 'Forward'], ['a', 'Left'], ['s', 'Back'], ['d', 'Right']]) {
  const element = button(label, () => {});
  element.dataset.move = value;
  element.style.touchAction = 'none';
  movement.append(element);
}
byId('world-help').append(movement);
for (const element of all('[data-move]')) {
  element.addEventListener('pointerdown', event => {
    if (phase !== 'world' || !playable()) return;
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, element.dataset.move);
    route = [];
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(type, event => pointers.delete(event.pointerId));
}
window.addEventListener('keydown', event => {
  if (modal() || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  const key = event.key.toLowerCase();
  const gameFocus = event.target === canvas || event.target === byId('controls');
  if (gameFocus && Object.hasOwn(directions, key) && phase === 'world' && playable()) {
    event.preventDefault(); keys.add(key); return;
  }
  const controlFocus = gameFocus || byId('controls').contains(event.target);
  if (event.repeat || !controlFocus) return;
  if (key === 'p' || key === 'escape') { event.preventDefault(); togglePause(); }
  else if (key === 'r' && phase === 'world') { event.preventDefault(); view?.recenterCamera(); }
  else if (key === 'e' && phase === 'world') { event.preventDefault(); interact(); }
  else if (phase === 'battle') {
    if (/^[1-4]$/.test(key)) { event.preventDefault(); command({ type: 'ability', slot: Number(key) - 1 }); }
    else if (key === 'c') { event.preventDefault(); command({ type: 'capture' }); }
    else if (key === ' ' && gameFocus) { event.preventDefault(); command({ type: 'wait' }); }
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', clearInput);
canvas.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', clearInput);
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  // Async locks cannot be awaited during unload. Never bypass the queue with a sync write.
  cancelAnimationFrame(rafId); view?.dispose();
});
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
Object.defineProperty(window, 'foldwildSnapshot', {
  configurable: false, enumerable: true,
  get: () => deepFreeze(structuredClone({ phase, paused, busy, state, battle, view: view?.inspect() ?? null }))
});
chooseStarter('cindupp');
text('saved-summary', saveSummary(savedSlot));
setPhase('menu');
text('save-coordination', lockedSaves
  ? 'Cooperating tabs serialize saves with Web Locks. Wait for saved status before closing; unload does not save.'
  : 'Web Locks unavailable: save checks are optimistic, not atomic across tabs. Use one tab only. Wait for saved status before closing; unload does not save.');
if (saved.error) saveStatus(`${saved.error} Automatic saving disabled. Existing bytes are preserved; use an explicit replacement or recovery preview.`);
rafId = requestAnimationFrame(frame);
