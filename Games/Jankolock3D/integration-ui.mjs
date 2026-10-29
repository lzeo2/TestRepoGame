import { mountSystemsUI } from './systems-ui.mjs';

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const count = value => Math.max(0, Math.ceil(finite(value)));
export function abilitySlotState(kit,runtime,slot) {
  const ability=kit.abilities.find(a=>a.slot===slot);
  if(!ability){const name=kit.unsupportedSlots?.[slot]??`Slot ${slot}`;return {name,text:'Unavailable',description:'Unavailable in this experimental partial slice.',label:`${slot}: ${name}. Unavailable in this experimental partial slice.`,blocked:true};}
  const remaining=finite(runtime?.cooldowns?.[slot]),windup=runtime?.pendingCast?.definition?.id===ability.id?Math.max(0,finite(runtime.pendingCast.left)):0;
  const otherPending=runtime?.pendingCast&&runtime.pendingCast.definition?.id!==ability.id;
  const failure=runtime?.lastPlacementFailure,age=runtime?.time-failure?.at;
  const placementFailed=failure?.slot===slot&&['Route blocked','Link lost','Panels blocked','Panel blocked'].includes(failure.reason)&&Number.isFinite(age)&&age>=0&&age<1;
  const text=otherPending?'Windup locked':windup>0?`Windup ${windup.toFixed(2)}s`:placementFailed?failure.reason:remaining>0?`${count(remaining)}s`:'Ready';
  const detail=otherPending?`Unavailable while ${runtime.pendingCast.definition.name} winds up. No ability is queued.`:windup>0?`Windup ${windup.toFixed(2)} seconds.`:placementFailed?`${failure.reason}. ${failure.reason==='Panel blocked'?'Splinters resolve independently. ':''}${remaining>0?`Ready in ${count(remaining)} seconds.`:'Retry with a valid target or clear route.'}`:remaining>0?`Ready in ${count(remaining)} seconds.`:ability.description;
  return {name:ability.name,text,description:ability.description,label:`${slot}: ${ability.name}. ${detail}`,blocked:Boolean(otherPending)||windup>0||remaining>0};
}
const healthReadout = hero => {
  const max = Math.max(1, finite(hero.maxHp, 1)), hp = Math.max(0, Math.min(max, finite(hero.hp)));
  return { hp, max, text: `${count(hp)} / ${count(max)}`, state: hp / max > .5 ? 'healthy' : hp / max > .25 ? 'warning' : 'critical' };
};
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
function guideText(sim,team,goal) {
  if(sim.phase==='pregame')return `Prepare. Waves in ${count(30-sim.time)}s. Follow Midway.`;
  if(!goal?.goalId||sim.winner)return objectiveText(sim,team);
  const d=goal.offscreenDirection;
  const arrows=['→','↗','↑','↖','←','↙','↓','↘'];
  const arrow=d?arrows[(Math.round(Math.atan2(d.y,d.x)/(Math.PI/4))+8)%8]+' ':'';
  return `${arrow}${goal.name}: ${count(goal.distance)}m, ${count(goal.hp)}/${count(goal.maxHp)}. ${goal.occluded?'View blocked. ':''}Via ${goal.name.split(' ')[0]}.`;
}
function recordDeaths(events, heroId, seen, score) {
  for (const event of events) {
    if (!event || typeof event !== 'object' || seen.has(event)) continue;
    seen.add(event);
    if (event.type !== 'hero_death') continue;
    if (event.heroId === heroId) score.deaths++;
    else if (event.sourceId === heroId) score.kills++;
  }
}

const SOUND_STORAGE_KEY = 'jankolock3d.objective-sound.v1';
function mountObjectiveSoundControl(root,onChange=()=>{}) {
  const label=document.createElement('label'),input=document.createElement('input'),status=document.createElement('p');
  label.className='sound-control';label.textContent='Objective sounds';input.type='checkbox';input.id='objective-sound';input.checked=true;
  status.id='objective-sound-status';status.setAttribute('role','status');input.setAttribute('aria-describedby',status.id);
  try {input.checked=globalThis.localStorage.getItem(SOUND_STORAGE_KEY)!=='off';}
  catch {status.textContent='Objective sound preference applies for this visit.';}
  const save=()=>{
    try {globalThis.localStorage.setItem(SOUND_STORAGE_KEY,input.checked?'on':'off');status.textContent='Objective sound preference saved.';}
    catch {status.textContent='Objective sound choice applies for this visit but could not be saved.';}
    onChange(input.checked);
  };
  input.addEventListener('change',save);label.append(input);root.append(label,status);
  return {read:()=>input.checked,dispose(){input.removeEventListener('change',save);label.remove();status.remove();}};
}
const BOB_STORAGE_KEY = 'jankolock3d.camera-bob.v1';

function mountCameraMotionControl(root) {
  const button = document.createElement('button'), status = document.createElement('p');
  button.type = 'button'; button.id = 'camera-bob';
  status.id = 'camera-bob-status'; status.setAttribute('role', 'status');
  button.setAttribute('aria-describedby', status.id);
  let enabled = true, feedback = '';
  try {
    const saved = globalThis.localStorage.getItem(BOB_STORAGE_KEY);
    if (saved === 'off') enabled = false;
    else if (saved !== null && saved !== 'on') {
      feedback = 'Invalid camera bob preference ignored.';
      globalThis.localStorage.removeItem(BOB_STORAGE_KEY);
    }
  } catch {
    feedback = 'Camera bob preference could not be read or cleared. Changes apply for this visit.';
  }
  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const read = () => ({enabled, reducedMotion: Boolean(media?.matches)});
  const refresh = () => {
    button.textContent = `Camera bob: ${enabled ? 'on' : 'off'}`;
    button.setAttribute('aria-pressed', String(enabled));
    status.textContent = [feedback, media?.matches ? 'Camera bob is paused by reduced motion.' : ''].filter(Boolean).join(' ');
    status.hidden = !status.textContent;
  };
  const toggle = () => {
    enabled = !enabled;
    try {
      globalThis.localStorage.setItem(BOB_STORAGE_KEY, enabled ? 'on' : 'off');
      feedback = 'Camera bob preference saved.';
    } catch {
      feedback = 'Camera bob choice applies for this visit but could not be saved.';
    }
    refresh();
  };
  button.addEventListener('click', toggle);
  media?.addEventListener('change', refresh);
  root.append(button, status); refresh();
  return {
    read,
    dispose() {
      button.removeEventListener('click', toggle);
      media?.removeEventListener('change', refresh);
      button.remove(); status.remove();
    }
  };
}

/** Presentation only: the caller owns the sole loop, simulation and all input
 * on [data-hold], [data-edge] and [data-action]. Ability edges are Digit1..4.
 * kits is the fetched heroes array (or its {heroes} document). No fetch here.
 * update({runtime,controller,events,paused}) replaces references after selection
 * and accepts the events the host drained this frame, without draining them.
 * onPause receives the desired boolean; onAction('capture') requests mouse lock.
 */
export function mountIntegrationUI({ sim, heroId, runtime, controller, world, kits,
  onSelect = () => {}, onStart = () => {}, onPause = () => {}, onRestart = () => {}, onAction = () => {}, onSoundChange = () => {} }) {
  const $ = id => document.getElementById(id);
  const heroes = Array.isArray(kits) ? kits : kits?.heroes;
  if (!heroes?.length || new Set(heroes.map(h => h.id)).size !== heroes.length) throw new TypeError('Integration UI requires unique hero kits.');
  if (!sim.heroes.some(hero => hero.id === heroId)) throw new TypeError('Integration UI requires a systems player.');
  const listeners = new AbortController();
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: listeners.signal });
  const systemsRoot = $('systems-root');
  const systems = mountSystemsUI(systemsRoot, sim, heroId);
  const healthHud = document.createElement('section');
  healthHud.className = 'health-hud'; healthHud.setAttribute('aria-label', 'Player health');
  const healthTrack = document.querySelector('.health-track'), healthBar = $('health-bar');
  const healthValue = document.createElement('output'); healthValue.id = 'health-value'; healthValue.setAttribute('aria-live', 'off');
  healthTrack.querySelector('label').append(' ', healthValue);
  healthHud.append(healthTrack); $('hud').append(healthHud);
  const header = document.querySelector('.page-header');
  const placeHealth = () => healthHud.style.setProperty('--header-height', `${header.offsetHeight}px`);
  const healthResize = new ResizeObserver(placeHealth); healthResize.observe(header); placeHealth();
  const inventory = document.createElement('section');
  inventory.className = 'integration-inventory panel';
  inventory.setAttribute('aria-label', 'Equipped items');
  const inventoryTitle = document.createElement('span');
  inventoryTitle.className = 'inventory-title'; inventoryTitle.textContent = 'Items';
  // Move the existing slots, not copies: their active buttons retain systems ownership.
  inventory.append(inventoryTitle, systemsRoot.querySelector('.sys-slots'));
  systemsRoot.append(inventory);
  const score = { kills: 0, deaths: 0 }, seenEvents = new WeakSet();
  let currentRuntime = runtime, currentController = controller, currentGoal = null;
  let selectedId = runtime?.kit?.id ?? heroes[0].id;
  let playing = false, paused = false, disposed = false, helpPaused = false;
  const map = $('minimap'), context = map.getContext('2d');
  const heroSelect = $('hero-select');
  const template = heroSelect.querySelector('[data-hero-index]').cloneNode(true);
  // Reuse the authored accessible card for every loaded kit, not a fixed roster.
  heroSelect.replaceChildren(...heroes.map((kit, index) => {
    const button = template.cloneNode(true); button.dataset.heroIndex = String(index); return button;
  }));
  const heroButtons = [...heroSelect.querySelectorAll('[data-hero-index]')];
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
  const cameraMotion = mountCameraMotionControl($('control-help'));
  const objectiveSound = mountObjectiveSoundControl($('control-help'),onSoundChange);

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
    const base=sim.bases?.[team];
    if(base){
      const at=project(base),y=Math.max(8,Math.min(size-8,at.y));
      context.fillStyle=paper;context.fillRect(at.x-7,y-7,14,14);context.strokeStyle=ink;context.strokeRect(at.x-7,y-7,14,14);
      context.fillStyle=ink;context.font='bold 12px Atkinson, sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText('B',at.x,y);context.textBaseline='alphabetic';
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
    if (Object.hasOwn(next, 'objective')) currentGoal = next.objective;
    if (Object.hasOwn(next, 'paused') && Boolean(next.paused) !== paused) setPaused(next.paused, false);
    recordDeaths(next.events ?? sim.events ?? [], heroId, seenEvents, score);
    const h = hero(), kit = currentKit(); if (!h) return;
    systems.update();
    $('playing-hero').textContent = kit.partialSlice?`${kit.name}: ${[kit.weapon.name,kit.melee?.name,...kit.abilities.map(a=>a.name)].filter(Boolean).join(' + ')} (${Object.keys(kit.unsupportedSlots??{}).length?'experimental partial slice':'four-slot CPU QA profile'}; five QA profiles: Odo, Whitespace, Laminate, Cassette and partial Fern; 35 other kits unavailable; Fern slots 2/4 unavailable; native/art acceptance held)`:kit.name;
    for(const button of document.querySelectorAll('[data-action="melee"]')) {
      const unavailable=kit.melee===null;button.disabled=unavailable;
      const partial=kit.partialSlice&&kit.melee;
      button.textContent=unavailable?'Melee unavailable':partial?kit.melee.name:'Melee';
      button.setAttribute('aria-label',unavailable?'Melee unavailable in this experimental partial slice.':partial?`${kit.melee.name}. Weapon-channel melee: ${kit.melee.baseDamage} base damage, ${kit.melee.range}m range, ${kit.melee.cooldown}s cooldown. Uses weapon items and armor, not melee parry.`:'Melee');
      button.title=partial?'Weapon-channel melee. Uses weapon items and armor; native melee parry does not block it.':'';
    }
    const health = healthReadout(h);
    healthBar.max = health.max; healthBar.value = health.hp;
    healthValue.textContent = health.text; healthHud.dataset.state = health.state;
    healthBar.setAttribute('aria-valuetext', `${health.text} health, ${health.state}`);
    const stamina = Math.max(0, Math.min(100, finite(currentController?.stamina)));
    $('stamina-bar').value = stamina; $('stamina-value').textContent = `${count(stamina)} / 100`;
    const magazine = currentRuntime?.modifiers?.magazine ?? kit.weapon.magazine;
    $('ammo').textContent = currentRuntime?.reload > 0 ? `Reloading ${currentRuntime.reload.toFixed(1)}s` : `${count(currentRuntime?.ammo)} / ${magazine}`;
    $('movement-state').textContent = currentController?.infiniteAmmo ? 'Slide: no ammo cost' : !h.alive ? `Respawn ${count(h.respawnRemaining)}s` : '';
    $('kd').textContent = `${count(h.kills ?? score.kills)} / ${count(h.deaths ?? score.deaths)}`;
    const elapsed=Math.max(0,sim.time-30);
    $('match-clock').textContent = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;
    const objective = guideText(sim, h.team, currentGoal);
    if ($('objective').textContent !== objective) $('objective').textContent = objective;
    for (const button of abilityButtons) {
      const state=abilitySlotState(kit,currentRuntime,Number(button.dataset.slot));
      button.querySelector('.ability-name').textContent=state.name;
      button.querySelector('.ability-state').textContent=state.text;
      button.title=state.description;
      button.setAttribute('aria-label',state.label);
      button.disabled=!h.alive||state.blocked||sim.phase==='pregame'||Boolean(sim.winner);
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
    if(!playing)currentGoal=null;
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
    message(text, passive = false) {
      if (disposed) return;
      systems.message(String(text), passive);
      if (!playing) { $('loading-status').textContent = String(text); $('loading-status').hidden = !text; }
    },
    setPlaying,
    // Saved choice and OS suppression stay separate; parent supplies these to the view sampler.
    readMotionOptions: cameraMotion.read,
    readCompletionSound: objectiveSound.read,
    dispose() {
      if (disposed) return;
      disposed = true; listeners.abort(); closeDialog(pauseDialog); closeDialog(help);
      systems.dispose(); capture.remove(); cameraMotion.dispose(); objectiveSound.dispose(); healthResize.disconnect(); healthHud.remove(); $('hud').hidden = true; $('touch-controls').hidden = true; $('pause').hidden = true;
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
  assert.deepEqual(healthReadout({ hp: 75.2, maxHp: 100 }), { hp: 75.2, max: 100, text: '76 / 100', state: 'healthy' });
  assert.equal(healthReadout({ hp: 50, maxHp: 100 }).state, 'warning');
  assert.equal(healthReadout({ hp: 25, maxHp: 100 }).state, 'critical');
  assert.equal(healthReadout({ hp: 0, maxHp: 100 }).text, '0 / 100');
  assert.equal(healthReadout({ hp: 200, maxHp: 100 }).hp, 100);
  assert.deepEqual(healthReadout({ hp: NaN, maxHp: Infinity }), { hp: 0, max: 1, text: '0 / 1', state: 'critical' });
  console.log('integration-ui: 14 checks passed (map, event deduplication, objectives, health values/color thresholds/clamping).');
  assert.match(guideText({phase:'pregame',time:5},'carbon',null),/Waves in 25s/);
  const goal={goalId:'goal',name:'midway guardian',distance:45.2,hp:800,maxHp:1600,occluded:true,offscreenDirection:{x:1,y:0}};
  assert.match(guideText({phase:'laning'},'carbon',goal),/^→ midway guardian: 46m, 800\/1600/);
  assert.match(guideText({phase:'laning'},'carbon',goal),/View blocked\. Via midway\./);
  assert.match(guideText({winner:'carbon'},'carbon',goal),/^Victory/);
  // Small DOM double for the actual control, without mounting unrelated HUD systems.
  class Node extends EventTarget {
    constructor() { super(); this.attributes = {}; this.children = []; this.textContent = ''; }
    setAttribute(key, value) { this.attributes[key] = value; }
    append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    remove() { this.parent.children = this.parent.children.filter(node => node !== this); }
  }
  const original = Object.fromEntries(['document', 'localStorage', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let saved = null, fail = '', writes = 0;
  const media = new EventTarget(); media.matches = false;
  Object.defineProperties(globalThis, {
    document: {configurable: true, value: {createElement: () => new Node()}},
    localStorage: {configurable: true, value: {
      getItem(key) { assert.equal(key, BOB_STORAGE_KEY); if (fail === 'read') throw Error('blocked'); return saved; },
      setItem(key, value) { assert.equal(key, BOB_STORAGE_KEY); if (fail === 'write') throw Error('quota'); saved = value; writes++; },
      removeItem(key) { assert.equal(key, BOB_STORAGE_KEY); if (fail === 'clear') throw Error('blocked'); saved = null; }
    }},
    matchMedia: {configurable: true, value: query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; }}
  });
  try {
    const mount = () => {
      const root = new Node(), existing = new Node(); existing.textContent = 'Existing controls'; root.append(existing);
      const control = mountCameraMotionControl(root);
      assert.equal(root.children[0], existing);
      return {root, control, button: root.children[1], status: root.children[2]};
    };
    let fixture = mount();
    assert.deepEqual(fixture.control.read(), {enabled: true, reducedMotion: false});
    assert.equal(fixture.button.textContent, 'Camera bob: on');
    assert.equal(fixture.button.attributes['aria-pressed'], 'true');
    assert.equal(fixture.button.attributes['aria-describedby'], fixture.status.id);
    assert.equal(fixture.status.attributes.role, 'status');
    fixture.button.dispatchEvent(new Event('click'));
    assert.equal(saved, 'off'); assert.equal(fixture.button.attributes['aria-pressed'], 'false');
    assert.match(fixture.status.textContent, /saved/);
    fixture.control.dispose(); fixture = mount();
    assert.equal(fixture.control.read().enabled, false);
    fixture.button.dispatchEvent(new Event('click'));
    const before = writes;
    media.matches = true; media.dispatchEvent(new Event('change'));
    assert.deepEqual(fixture.control.read(), {enabled: true, reducedMotion: true});
    assert.equal(saved, 'on'); assert.equal(writes, before);
    assert.match(fixture.status.textContent, /paused by reduced motion/);
    media.matches = false; media.dispatchEvent(new Event('change'));
    assert.deepEqual(fixture.control.read(), {enabled: true, reducedMotion: false});
    fail = 'write'; fixture.button.dispatchEvent(new Event('click'));
    assert.equal(fixture.control.read().enabled, false); assert.equal(saved, 'on');
    assert.match(fixture.status.textContent, /could not be saved/);
    fail = ''; fixture.button.dispatchEvent(new Event('click'));
    assert.doesNotMatch(fixture.status.textContent, /could not/);
    fixture.control.dispose();
    const disposedText = fixture.button.textContent;
    fixture.button.dispatchEvent(new Event('click')); media.matches = true; media.dispatchEvent(new Event('change'));
    assert.equal(fixture.button.textContent, disposedText); assert.equal(fixture.root.children.length, 1);
    media.matches = false;
    for (const invalid of ['true', 'false', 'null', '{}', '', 'ON']) {
      saved = invalid; fixture = mount(); assert.equal(saved, null);
      assert.equal(fixture.control.read().enabled, true); assert.match(fixture.status.textContent, /Invalid/);
      fixture.control.dispose();
    }
    for (const failure of ['read', 'clear']) {
      saved = '{}'; fail = failure; fixture = mount();
      assert.equal(fixture.control.read().enabled, true); assert.match(fixture.status.textContent, /could not be read or cleared/);
      fixture.control.dispose();
    }
    fail = '';
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() { throw Error('SecurityError'); }});
    fixture = mount(); fixture.button.dispatchEvent(new Event('click'));
    assert.equal(fixture.control.read().enabled, false); assert.match(fixture.status.textContent, /could not be saved/);
    fixture.control.dispose();
    console.log('integration-ui: camera control CPU checks passed (persistence, validation, storage errors/recovery, reduced motion, accessibility, cleanup).');
    const sounds=new Node(),changes=[];
    let sound=mountObjectiveSoundControl(sounds,value=>changes.push(value));
    assert.equal(sound.read(),true);const checkbox=sounds.children[0].children[0];checkbox.checked=false;checkbox.dispatchEvent(new Event('change'));
    assert.match(sounds.children[1].textContent,/could not be saved/);assert.deepEqual(changes,[false]);sound.dispose();
    let soundSaved='off';
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(key){assert.equal(key,SOUND_STORAGE_KEY);return soundSaved;},setItem(key,value){assert.equal(key,SOUND_STORAGE_KEY);soundSaved=value;}}});
    sound=mountObjectiveSoundControl(sounds);assert.equal(sound.read(),false);
    const toggle=sounds.children[0].children[0];toggle.checked=true;toggle.dispatchEvent(new Event('change'));assert.equal(soundSaved,'on');sound.dispose();
    sound=mountObjectiveSoundControl(sounds);assert.equal(sound.read(),true);sound.dispose();
    toggle.checked=false;toggle.dispatchEvent(new Event('change'));assert.equal(soundSaved,'on','disposed control no longer writes');
    console.log('integration-ui: goal readout and objective sound preference/error/cleanup checks passed (CPU).');
  } finally {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}
