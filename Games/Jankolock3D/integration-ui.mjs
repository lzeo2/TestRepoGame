import { mountSystemsUI } from './systems-ui.mjs';

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const count = value => Math.max(0, Math.ceil(finite(value)));
const pointOnMap = (position, size, team = 'carbon') => ({
  x: Math.max(8, Math.min(size - 8, (finite(position.x) + 450) / 900 * size)),
  y: Math.max(16, Math.min(size - 8, (450 - finite(position.z) * (team === 'ivory' ? -1 : 1)) / 900 * size))
});
const objectiveText = (sim, team) => {
  if (sim.winner) return sim.winner === team ? 'Victory. The enemy Patron has fallen.' : 'Defeat. Your Patron has fallen.';
  const enemy = sim.structures.filter(s => s.team !== team && s.alive);
  const patron = enemy.find(s => s.type === 'patron');
  return `${enemy.length} enemy objective${enemy.length === 1 ? ' remains' : 's remain'}. ${patron?.vulnerable ? `Patron phase ${patron.patronPhase ?? 1}: attack.` : 'Patron shielded: push the lane structures.'}`;
};
function recordDeaths(events, heroId, seen, score) {
  for (const event of events) {
    if (!event || typeof event !== 'object' || seen.has(event)) continue;
    seen.add(event);
    if (event.type !== 'hero_death') continue;
    if (event.heroId === heroId) score.deaths++;
    else if (event.sourceId === heroId) score.kills++;
  }
}

/** Presentation only: the caller owns the sole loop, simulation and all input
 * on [data-hold], [data-edge] and [data-action]. Ability edges are Digit1..4.
 * kits is the fetched heroes array (or its {heroes} document). No fetch here.
 * update({runtime,controller,events,paused}) replaces references after selection
 * and accepts the events the host drained this frame, without draining them.
 * onPause receives the desired boolean; onAction('capture') requests mouse lock.
 */
export function mountIntegrationUI({ sim, heroId, runtime, controller, world, kits,
  onSelect = () => {}, onStart = () => {}, onPause = () => {}, onRestart = () => {}, onAction = () => {} }) {
  const $ = id => document.getElementById(id);
  const heroes = Array.isArray(kits) ? kits : kits?.heroes;
  if (!heroes || heroes.length !== 4) throw new TypeError('Integration UI requires four hero kits.');
  if (!sim.heroes.some(hero => hero.id === heroId)) throw new TypeError('Integration UI requires a systems player.');
  const listeners = new AbortController();
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: listeners.signal });
  const systemsRoot = $('systems-root');
  const systems = mountSystemsUI(systemsRoot, sim, heroId);
  const inventory = document.createElement('section');
  inventory.className = 'integration-inventory panel';
  inventory.setAttribute('aria-label', 'Equipped items');
  const inventoryTitle = document.createElement('span');
  inventoryTitle.className = 'inventory-title'; inventoryTitle.textContent = 'Items';
  // Move the existing slots, not copies: their active buttons retain systems ownership.
  inventory.append(inventoryTitle, systemsRoot.querySelector('.sys-slots'));
  systemsRoot.append(inventory);
  const score = { kills: 0, deaths: 0 }, seenEvents = new WeakSet();
  let currentRuntime = runtime, currentController = controller;
  let selectedId = runtime?.kit?.id ?? heroes[0].id;
  let playing = false, paused = false, disposed = false, helpPaused = false;
  const map = $('minimap'), context = map.getContext('2d');
  const heroButtons = [...document.querySelectorAll('[data-hero-index]')];
  const abilityButtons = [...$('abilities').querySelectorAll('[data-slot]')];
  const hero = () => sim.heroes.find(h => h.id === heroId);
  const currentKit = () => currentRuntime?.kit ?? heroes.find(h => h.id === selectedId) ?? heroes[0];
  const pauseDialog = $('pause-dialog'), help = $('help');
  const showDialog = dialog => { if (!dialog.open) { document.exitPointerLock?.(); dialog.showModal(); } };
  const closeDialog = dialog => { if (dialog.open) dialog.close(); };

  function select(id, notify = false) {
    const kit = heroes.find(h => h.id === id); if (!kit) return;
    selectedId = id;
    heroButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hero === id)));
    $('hero-description').textContent = `${kit.name}: ${kit.lore ?? kit.role}`;
    if (notify) onSelect(id);
  }
  heroButtons.forEach((button, index) => {
    const kit = heroes[index];
    button.dataset.hero = kit.id; button.disabled = false;
    button.querySelector('strong').textContent = kit.name;
    button.querySelector('span').textContent = kit.role;
    button.setAttribute('aria-label', `${kit.name}. ${kit.role}`);
    listen(button, 'click', () => select(kit.id, true));
  });
  select(selectedId);
  $('start').disabled = false;
  listen($('start'), 'click', () => onStart(selectedId));
  listen($('restart'), 'click', () => { closeDialog(pauseDialog); onRestart(); });
  listen($('touch-shop'), 'click', () => systems.open());
  // Mouse capture remains a host action, not a second input implementation.
  const capture = document.createElement('button');
  capture.type = 'button'; capture.id = 'capture'; capture.textContent = 'Capture mouse';
  listen(capture, 'click', () => { closeDialog(help); onAction('capture'); });
  $('control-help').append(capture);

  function setPaused(value, notify = true) {
    if (!playing || sim.winner || disposed) return;
    paused = Boolean(value);
    $('pause-title').textContent = 'Paused';
    $('pause-description').textContent = 'The match is paused.';
    $('resume').hidden = false;
    if (paused) showDialog(pauseDialog); else closeDialog(pauseDialog);
    if (notify) onPause(paused);
  }
  listen($('pause'), 'click', () => setPaused(true));
  listen($('resume'), 'click', () => setPaused(false));
  listen(pauseDialog, 'cancel', event => { event.preventDefault(); if (!sim.winner) setPaused(false); });
  listen($('help-open'), 'click', () => {
    helpPaused = playing && !paused && !sim.winner;
    if (helpPaused) { paused = true; onPause(true); }
    showDialog(help);
  });
  listen($('help-close'), 'click', () => closeDialog(help));
  listen(help, 'close', () => {
    if (helpPaused && playing && !sim.winner && !disposed) { paused = false; onPause(false); }
    helpPaused = false;
  });
  let dark = document.documentElement.dataset.theme !== 'light';
  const applyTheme = () => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme').setAttribute('aria-pressed', String(dark));
    $('theme').textContent = dark ? 'Light theme' : 'Dark theme';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--page').trim());
  };
  applyTheme();
  listen($('theme'), 'click', () => { dark = !dark; applyTheme(); drawMap(); });

  function drawMap() {
    if (!context || !playing || disposed) return;
    const size = map.clientWidth || 198, ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    if (map.width !== Math.round(size * ratio)) map.width = map.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(document.documentElement);
    const paper = style.getPropertyValue('--paper').trim(), ink = style.getPropertyValue('--text').trim();
    const accent = style.getPropertyValue('--accent').trim(), line = style.getPropertyValue('--line').trim();
    const team = hero().team, project = position => pointOnMap(position, size, team);
    context.fillStyle = paper; context.fillRect(0, 0, size, size);
    context.strokeStyle = line; context.lineWidth = 1; context.strokeRect(.5, .5, size - 1, size - 1);
    const descriptor = world?.data ?? world;
    for (const lane of sim.lanes) {
      const source = descriptor?.lanes?.find(l => l.id === lane.id) ?? lane;
      const color = source.color ?? '#365a74';
      context.strokeStyle = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
      context.lineWidth = 3; context.beginPath();
      const points = lane.waypoints ?? [{ x: lane.x, z: -400 }, { x: lane.x, z: 400 }];
      points.forEach((p, i) => { const at = project(p); if (i) context.lineTo(at.x, at.y); else context.moveTo(at.x, at.y); });
      context.stroke();
      const at = project({ x: lane.x, z: 0 });
      context.fillStyle = ink; context.font = `${size < 160 ? 10 : 12}px Atkinson, sans-serif`; context.textAlign = 'center';
      const name = source.name ?? lane.id.replace(/^./, c => c.toUpperCase());
      context.fillText(size < 160 && name === 'Greenhedge' ? 'Green' : name, at.x, 12, size / 3 - 6);
    }
    for (const structure of sim.structures) {
      if (!structure.alive) continue;
      const at = project(structure.position), own = structure.team === team;
      context.strokeStyle = own ? accent : ink; context.fillStyle = own ? accent : paper;
      context.lineWidth = structure.vulnerable ? 2 : 1;
      if (structure.type === 'patron') {
        context.beginPath(); context.arc(at.x, at.y, 5, 0, Math.PI * 2); context.fill(); context.stroke();
      } else { context.fillRect(at.x - 3, at.y - 3, 6, 6); context.strokeRect(at.x - 3, at.y - 3, 6, 6); }
    }
    for (const h of sim.heroes) {
      if (!h.alive) continue;
      const at = project(h.position), own = h.team === team;
      context.beginPath(); context.strokeStyle = own ? accent : ink; context.fillStyle = own ? accent : paper; context.lineWidth = 2;
      if (own) context.arc(at.x, at.y, 3, 0, Math.PI * 2);
      else { context.moveTo(at.x, at.y - 4); context.lineTo(at.x + 4, at.y); context.lineTo(at.x, at.y + 4); context.lineTo(at.x - 4, at.y); context.closePath(); }
      context.fill(); context.stroke();
      if (h.id === heroId) { context.beginPath(); context.arc(at.x, at.y, 7, 0, Math.PI * 2); context.strokeStyle = ink; context.stroke(); }
    }
  }

  function update(next = {}) {
    if (disposed) return;
    if (Object.hasOwn(next, 'runtime')) { currentRuntime = next.runtime; if (currentRuntime?.kit) select(currentRuntime.kit.id); }
    if (Object.hasOwn(next, 'controller')) currentController = next.controller;
    if (Object.hasOwn(next, 'paused') && Boolean(next.paused) !== paused) setPaused(next.paused, false);
    recordDeaths(next.events ?? sim.events ?? [], heroId, seenEvents, score);
    const h = hero(), kit = currentKit(); if (!h) return;
    systems.update();
    $('playing-hero').textContent = kit.name;
    $('health-bar').max = Math.max(1, finite(h.maxHp, 1)); $('health-bar').value = Math.max(0, finite(h.hp));
    const stamina = Math.max(0, Math.min(100, finite(currentController?.stamina)));
    $('stamina-bar').value = stamina; $('stamina-value').textContent = `${count(stamina)} / 100`;
    const magazine = currentRuntime?.modifiers?.magazine ?? kit.weapon.magazine;
    $('ammo').textContent = currentRuntime?.reload > 0 ? `Reloading ${currentRuntime.reload.toFixed(1)}s` : `${count(currentRuntime?.ammo)} / ${magazine}`;
    $('movement-state').textContent = currentController?.infiniteAmmo ? 'Slide: no ammo cost' : !h.alive ? `Respawn ${count(h.respawnRemaining)}s` : '';
    $('kd').textContent = `${count(h.kills ?? score.kills)} / ${count(h.deaths ?? score.deaths)}`;
    $('match-clock').textContent = `${Math.floor(sim.time / 60)}:${String(Math.floor(sim.time % 60)).padStart(2, '0')}`;
    const objective = objectiveText(sim, h.team);
    if ($('objective').textContent !== objective) $('objective').textContent = objective;
    for (const button of abilityButtons) {
      const ability = kit.abilities.find(a => a.slot === Number(button.dataset.slot));
      const remaining = finite(currentRuntime?.cooldowns?.[ability.slot]);
      button.querySelector('.ability-name').textContent = ability.name;
      button.querySelector('.ability-state').textContent = remaining > 0 ? `${count(remaining)}s` : 'Ready';
      button.title = ability.description;
      button.setAttribute('aria-label', `${ability.slot}: ${ability.name}. ${remaining > 0 ? `Ready in ${count(remaining)} seconds.` : ability.description}`);
      button.disabled = !h.alive || remaining > 0 || sim.phase === 'pregame' || Boolean(sim.winner);
    }
    if (playing && sim.winner) {
      $('pause-title').textContent = sim.winner === h.team ? 'Victory' : 'Defeat';
      $('pause-description').textContent = objective;
      $('resume').hidden = true; showDialog(pauseDialog);
    }
    drawMap();
  }
  function setPlaying(value) {
    if (disposed) return;
    playing = Boolean(value); paused = false;
    $('lobby').hidden = playing; $('hud').hidden = !playing;
    $('pause').hidden = !playing; $('touch-controls').hidden = !playing;
    $('loading-status').hidden = true;
    if (!playing) { systems.close(); closeDialog(pauseDialog); closeDialog(help); }
    else { $('game').focus({ preventScroll: true }); if (sim.shopAvailable(heroId)) systems.open(); }
    update();
  }
  $('loading-status').hidden = true;
  update();
  return {
    update,
    message(text) {
      if (disposed) return;
      systems.message(String(text));
      if (!playing) { $('loading-status').textContent = String(text); $('loading-status').hidden = !text; }
    },
    setPlaying,
    dispose() {
      if (disposed) return;
      disposed = true; listeners.abort(); closeDialog(pauseDialog); closeDialog(help);
      systems.dispose(); capture.remove(); $('hud').hidden = true; $('touch-controls').hidden = true; $('pause').hidden = true;
    }
  };
}

// Run without a browser: node Games/Jankolock3D/integration-ui.mjs --self-test
if (typeof document === 'undefined' && globalThis.process?.argv.includes('--self-test')) {
  const { default: assert } = await import('node:assert/strict');
  assert.deepEqual(pointOnMap({ x: 0, z: 0 }, 200), { x: 100, y: 100 });
  assert.equal(pointOnMap({ x: 0, z: -400 }, 200).y > 100, true);
  assert.equal(pointOnMap({ x: 0, z: 400 }, 200, 'ivory').y > 100, true);
  assert.deepEqual(pointOnMap({ x: Infinity, z: NaN }, 200), { x: 100, y: 100 });
  const score = { kills: 0, deaths: 0 }, seen = new WeakSet();
  const events = [{ type: 'hero_death', heroId: 'enemy', sourceId: 'player' }, { type: 'hero_death', heroId: 'player', sourceId: 'enemy' }];
  recordDeaths(events, 'player', seen, score); recordDeaths(events, 'player', seen, score);
  assert.deepEqual(score, { kills: 1, deaths: 1 });
  assert.equal(objectiveText({ winner: 'carbon' }, 'carbon').startsWith('Victory'), true);
  assert.equal(objectiveText({ winner: 'ivory' }, 'carbon').startsWith('Defeat'), true);
  assert.equal(objectiveText({ structures: [{ team: 'ivory', alive: true, type: 'patron', vulnerable: true, patronPhase: 2 }] }, 'carbon'), '1 enemy objective remains. Patron phase 2: attack.');
  console.log('integration-ui: 8 checks passed (map projection, orientation, event deduplication, objective states).');
}
