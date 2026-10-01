import { SPECIES, BY_ID, ABILITIES, ELEMENT_WHEEL } from './data.js';
import { statsFor, createCreature, clearEffects, gainXP, createBattle, applyAction } from './battle.js';
import { REGIONS, RIVALS, PLAYER_BOUNDS, MAX_ROSTER, freshGame, validateSave, readSave, writeSave, worldPoints, nearbyPoint } from './world.js';
import { createView } from './view.js';

const byId = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const text = (id, value) => { byId(id).textContent = value; };
const canvas = byId('game-canvas');
const layout = document.querySelector('.play-layout');
const keys = new Set(), pointers = new Map();
const directions = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
const saved = readSave();
let savedSlot = saved.state, slotPresent = Boolean(saved.state || saved.error), savePermission = !saved.error;
let state = null, battle = null, phase = 'menu', paused = false, busy = false;
let starterId = 'cindupp', waypoint = null, pendingPoint = null, resetAction = null;
let view = null, viewFailed = false, battleModels = '', busyElapsed = 0;
let previousTime = null, saveElapsed = 0, positionDirty = false, rafId;
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
  // The renderer's disclosed failed-model diagnostic must remain visible.
  if (!viewFailed && !view?.inspect().fallbackModels.length) text('message', value);
}
function clearInput() { keys.clear(); pointers.clear(); previousTime = null; }
function focusGame() { canvas.focus({ preventScroll: true }); }
function resize() { view?.resize(); }
function save() {
  if (!state || !savePermission) return;
  const error = writeSave(state);
  if (error) {
    text('save-state', 'Save unavailable; expedition stays in memory.');
    byId('save-state').title = error;
  } else {
    savedSlot = validateSave(state);
    slotPresent = true;
    text('save-state', 'Autosaved');
    byId('save-state').removeAttribute('title');
  }
  positionDirty = false;
  saveElapsed = 0;
}
function ensureView() {
  if (view || viewFailed) return;
  try {
    view = createView(canvas, { onCheckpoint: approach, reducedMotion: byId('reduce-motion').checked });
  } catch (error) {
    viewFailed = true;
    text('message', `${error.message}. Use the trail and battle buttons below; the expedition remains playable without 3D.`);
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
  text('zone-name', `${REGIONS[state.region].name} · trailkeepers ${state.defeatedRivals.length}/3`);
  text('score', state.score);
  text('dex-count', `${state.seen.length} seen / ${state.caught.length} caught / 80`);
  text('kites', state.kites);
  text('pause', paused ? 'Resume' : 'Pause');
  byId('pause').disabled = !['world', 'battle'].includes(phase);
  byId('new-run').disabled = busy;
  byId('collection-btn').disabled = !['world', 'result'].includes(phase) || busy;
  byId('result-continue').disabled = busy;
  for (const element of all('[data-region]')) {
    const region = Number(element.dataset.region);
    element.textContent = REGIONS[region].name;
    element.disabled = phase !== 'world' || stopped() || busy || region > Math.min(2, state.defeatedRivals.length);
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
}
function showWorld() {
  waypoint = null;
  pendingPoint = null;
  battleModels = '';
  setPhase('world');
  const points = worldPoints(state);
  byId('nearby-actions').replaceChildren(...points.map(point => {
    const element = button(point.type === 'wild' ? `${point.label} · level ${point.level}` : point.label, () => approach(point.id));
    element.dataset.point = point.id;
    return element;
  }));
  ensureView();
  view?.showWorld({ region: state.region, position: state.position, points });
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
  state = freshGame(starterId, 1);
  state.reducedMotion = byId('reduce-motion').checked;
  paused = false;
  busy = false;
  battle = null;
  view?.setReducedMotion(state.reducedMotion);
  showWorld();
  save();
}
function confirmReset(action) {
  if (busy || modal()) return;
  resetAction = action;
  clearInput();
  byId('reset-dialog').showModal();
  resize();
}
function returnToMenu() {
  state = null;
  battle = null;
  paused = false;
  busy = false;
  waypoint = null;
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
  waypoint = point;
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
  // Free camp resupply keeps all 80 species collectible after the starting 18 kites.
  state.kites = Math.max(18, state.kites);
  message('Camp rest restored every ally’s HP and energy. Latch Kites refolded to at least 18.');
  updateHUD();
  save();
}
function travel(region) {
  if (phase !== 'world' || !playable() || !Number.isInteger(region) || region < 0 || region > Math.min(2, state.defeatedRivals.length)) return;
  state.region = region;
  state.position = { x: 0, z: 4, yaw: 0 };
  showWorld();
  save();
}
function result(title, description) {
  text('result-title', title);
  text('result-description', description);
  text('result-continue', state.defeatedRivals.length === 3 ? 'Continue free play' : 'Continue expedition');
  setPhase('result');
}
function interact() {
  if (phase !== 'world' || !playable()) return;
  const point = nearbyPoint(state);
  if (!point) return;
  waypoint = null;
  if (point.type === 'camp') return rest();
  if (point.type === 'exit') {
    if (!state.defeatedRivals.includes(state.region)) return message(`Train with ${RIVALS[state.region].name} before taking this path.`);
    if (state.region < 2) return travel(state.region + 1);
    return result('Ridge circuit complete · 3/3', 'All three trailkeepers cleared. Continue free play in every region and collect all 80 species.');
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
function beginBattle() {
  if (phase !== 'dialogue' || !pendingPoint || busy) return;
  const point = pendingPoint;
  const kind = point.type === 'rival' ? 'rival' : 'wild';
  const enemies = kind === 'wild' ? [createCreature(point.speciesId, point.level, `wild-${state.encounterIndex}`)]
    : RIVALS[state.region].team.map((c, i) => createCreature(c.speciesId, c.level, `rival-${state.encounterIndex}-${i}`));
  for (const c of enemies) if (!state.seen.includes(c.speciesId)) state.seen.push(c.speciesId);
  battle = createBattle(party(), enemies, { kind, seed: (state.seed + state.encounterIndex) >>> 0 });
  phase = 'battle';
  byId('dialogue-dialog').close();
  setPhase('battle');
  renderBattle();
  save();
  if (battle.result) finishBattle();
  focusGame();
}
function captureReason() {
  if (!battle || battle.result) return 'Encounter has ended';
  const enemy = battle.enemy.team[battle.enemy.active];
  if (battle.kind !== 'wild') return 'Trailkeeper allies cannot be captured';
  if (state.roster.length >= MAX_ROSTER) return 'Collection capacity reached (160 allies)';
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
  text('wait', 'Wait · restore 3 energy');
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
  const modelKey = `${player.speciesId}/${enemy.speciesId}`;
  if (modelKey !== battleModels) {
    battleModels = modelKey;
    view?.showBattle({ playerSpeciesId: player.speciesId, enemySpeciesId: enemy.speciesId });
  }
  updateHUD();
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
  battle = applyAction(battle, action);
  copyBattleTeam();
  renderBattle();
  if (battle.result) finishBattle();
  else save();
  // Evolution/KO scene replacement happens first, so it cannot erase the kite flight.
  view?.animateAction({ type: action.type, side: 'player' });
}
function finishBattle() {
  const outcome = battle.result;
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
        state.score += 250 + levels * 10;
      }
    } else state.score += (outcome === 'captured' ? 100 : 40) + levels * 10;
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
    state.position = { x: -6, z: 4, yaw: 0 };
    description = 'The camp welcomed your tired team. Every ally is fully rested; your collection and trail progress are safe.';
  } else if (outcome === 'won') {
    description = battle.kind === 'rival' ? `${RIVALS[state.region].winDialogue} Trailkeepers ${state.defeatedRivals.length}/3.` : `Each expedition ally gained ${levels * 12 + 20} XP.`;
  } else description = 'You left the encounter. The trail has new wild allies to meet.';
  state.encounterIndex++;
  markOwned();
  result(outcome === 'captured' ? 'Capture complete' : outcome === 'lost' ? 'Team needs a rest' : battle.kind === 'rival' && outcome === 'won' ? (state.defeatedRivals.length === 3 ? 'Ridge circuit complete · 3/3' : 'Trail cleared') : outcome === 'won' ? 'Encounter won' : 'Encounter left', description);
  // XP evolution is visible immediately, even while the last action effect runs.
  const player = state.roster.find(c => c.uid === battle.player.team[battle.player.active].uid);
  const enemy = battle.enemy.team[battle.enemy.active];
  const modelKey = `${player.speciesId}/${enemy.speciesId}`;
  if (modelKey !== battleModels) {
    battleModels = modelKey;
    view?.showBattle({ playerSpeciesId: player.speciesId, enemySpeciesId: enemy.speciesId });
  }
  save();
}
function collection() {
  if (!state || !['world', 'result'].includes(phase) || busy) return;
  const items = [paragraph(`Owned allies ${state.roster.length}/${MAX_ROSTER}. Team ${state.team.length}/3. Seen ${state.seen.length}/80; caught ${state.caught.length}/80.`)];
  for (const c of state.roster) {
    const card = document.createElement('section'), max = statsFor(c);
    card.append(paragraph(`${nameOf(c)} · HP ${c.hp}/${max.maxHP} · energy ${c.energy}/${max.maxEnergy} · XP ${c.xp}`));
    const onTeam = state.team.includes(c.uid);
    const control = button(onTeam ? 'Remove from team' : 'Add to team', () => {
      if (onTeam) state.team = state.team.filter(uid => uid !== c.uid);
      else state.team.push(c.uid);
      updateHUD();
      save();
      collection();
    });
    control.disabled = onTeam ? state.team.length === 1 : state.team.length >= 3;
    card.append(control);
    items.push(card);
  }
  items.push(paragraph(`Element wheel: ${Object.entries(ELEMENT_WHEEL).map(([a, b]) => `${a} beats ${b}`).join('; ')}. Strong damage ×1.5; reverse ×0.75.`));
  for (const species of SPECIES) {
    const card = document.createElement('section');
    card.append(paragraph(`#${species.number} ${species.name} · ${species.element} · ${species.family} · ${species.tier} · ${state.caught.includes(species.id) ? 'Caught' : state.seen.includes(species.id) ? 'Seen' : 'Not seen'}`));
    card.append(paragraph(species.abilities.map(name => abilityDescription(name)).join('; ')));
    if (species.evolvesTo) card.append(paragraph(`Evolves to ${BY_ID[species.evolvesTo].name} at level ${species.evolveLevel}.`));
    items.push(card);
  }
  byId('collection-list').replaceChildren(...items);
  clearInput();
  if (!byId('collection-dialog').open) byId('collection-dialog').showModal();
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
  if (dx || dz) waypoint = null;
  else if (waypoint) {
    dx = waypoint.x - state.position.x;
    dz = waypoint.z - state.position.z;
    if (Math.hypot(dx, dz) <= 0.3) { waypoint = null; return; }
  }
  const length = Math.hypot(dx, dz);
  if (!length) return;
  dx /= length;
  dz /= length;
  const step = Math.min(3 * dt, waypoint ? Math.max(0, length - 0.3) : Infinity);
  const x = Math.max(PLAYER_BOUNDS.minX, Math.min(PLAYER_BOUNDS.maxX, state.position.x + dx * step));
  const z = Math.max(PLAYER_BOUNDS.minZ, Math.min(PLAYER_BOUNDS.maxZ, state.position.z + dz * step));
  if (x !== state.position.x || z !== state.position.z) positionDirty = true;
  state.position = { x, z, yaw: Math.atan2(-dx, -dz) };
  view?.setPlayerPosition(x, z, state.position.yaw);
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
        else updateHUD();
      }
    } else if (phase === 'world') move(dt);
    if (positionDirty && saveElapsed >= 1) save();
    updateProximity();
  }
  if (phase !== 'menu' && !document.hidden) view?.render(dt);
  rafId = requestAnimationFrame(frame);
}

all('[data-starter]').forEach(element => element.addEventListener('click', () => chooseStarter(element.dataset.starter)));
text('start', 'Start new expedition');
text('continue', 'Continue expedition');
byId('continue').hidden = !savedSlot;
byId('start').addEventListener('click', () => slotPresent ? confirmReset(start) : start());
byId('continue').addEventListener('click', () => {
  if (!savedSlot || modal()) return;
  state = validateSave(savedSlot);
  byId('reduce-motion').checked = state.reducedMotion;
  view?.setReducedMotion(state.reducedMotion);
  paused = false;
  showWorld();
  save();
});
byId('new-run').addEventListener('click', () => confirmReset(returnToMenu));
byId('reset-confirm').addEventListener('click', () => {
  const action = resetAction;
  resetAction = null;
  byId('reset-dialog').close();
  savePermission = true;
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
byId('collection-close').addEventListener('click', () => byId('collection-dialog').close());
byId('collection-dialog').addEventListener('close', () => { clearInput(); resize(); updateHUD(); focusGame(); });
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
// The frozen shell has no data-move controls. Add native held controls to its existing help node.
text('world-help', 'Focus the view for WASD/arrows. Trail buttons walk to markers. E: interact. 1–4: abilities. C: kite. Space: Wait. P/Escape: pause. Collection: edit team.');
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
    waypoint = null;
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
  if (state && savePermission) save();
  cancelAnimationFrame(rafId);
  view?.dispose();
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
setPhase('menu');
if (saved.error) text('save-state', 'Autosave disabled until a confirmed new expedition.');
rafId = requestAnimationFrame(frame);
