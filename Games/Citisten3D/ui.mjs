import { BUILDINGS } from './sim.mjs';
import { NEW_BUILDINGS, BUILD_TIMES, isBuildingActive } from './city-content.mjs';
import { CITY_STAGES, getStage, nextStage, unlocked } from './progression.mjs';
import { TECHNOLOGIES, researchOffer } from './development.mjs';
import { SPECIALIZATIONS, SCENARIOS } from './production.mjs';

const option = type => [type, NEW_BUILDINGS[type].label, ''];
const GROUPS = {
  Road: [['road', 'Road', '1'], ['bridge', 'Bridge', '']],
  Zone: [['residential', 'Residential', '2'], ['commercial', 'Commercial', '3'], ['industrial', 'Industrial', '4'], option('apartments'), option('workshop'), ['upgrade', 'Upgrade', 'U']],
  Service: [['power', 'Power plant', '5'], ['water', 'Water tower', '6'], ['police', 'Police', '7'], ['fire', 'Fire station', '8'], ['park', 'Park', '9'], option('clinic'), option('school'), option('solar'), option('river_pump')],
  Defense: [['wall', 'Wall', 'B'], ['rotate-wall', 'Rotate wall', 'R'], ['barricade', 'Barricade', 'Not available'], ['watchtower', 'Watchtower', 'N']],
  Bulldoze: [['bulldoze', 'Bulldoze', 'X']]
};
const TUTORIAL = [
  ['Road first', 'Selecting a tool does not place it. Choose Road, then click or drag dry lots beside the town hall ($10 per lot). Leave the river crossing for later.'],
  ['Homes beside the road', 'Choose Zone, then Residential. Click or tap an empty lot beside your road. Let construction finish at 1x or faster; unfinished sites provide no housing.'],
  ['Connect services', 'Choose Service: place power and water beside roads connected to the homes. Homes also need a nearby supplied town hall, park, police or fire station. Use Controls for camera movement and speed. Menu pauses; How to play reopens this guide. In defense, protect the hall with walls and watchtowers.']
];
// incidents.mjs keeps response prices private. economy-ui-check verifies these labels against real responses.
const INCIDENT_RESPONSE_COST = { fire: 90, outage: 70, flood: 110 };
const number = value => Math.floor(Number(value) || 0).toLocaleString('en-AU');
export const buildingLabel = type => NEW_BUILDINGS[type]?.label || Object.values(GROUPS).flat().find(([id]) => id === type)?.[1] || (type === 'townhall' ? 'Town hall' : 'Building');
const townIcon = '<svg viewBox="0 0 160 80" aria-hidden="true"><path d="M5 72h150M25 72V43l20-15 20 15v29M80 72V20h25v52M85 20l8-15 8 15M118 72V48l16-12 16 12v24M38 72V55h14v17M88 35h8m-8 12h8"/></svg>';
const shieldIcon = '<svg viewBox="0 0 160 80" aria-hidden="true"><path d="M80 5c12 12 28 14 39 16-1 27-13 43-39 55-26-12-38-28-39-55 11-2 27-4 39-16Z"/><path d="M68 53V30h24v23M76 53V42h8v11"/></svg>';

export function createUI(root, callbacks = {}) {
  root.classList.add('citisten-ui');
  root.dataset.theme = 'dark';
  try { if (localStorage.getItem('citisten-theme') === 'light') root.dataset.theme = 'light'; } catch { /* Storage can be disabled; the toggle still works. */ }
  root.innerHTML = `
    <section class="city-game" hidden aria-label="Town management">
      <header class="city-top panel">
        <div class="city-toolbar">
          <strong class="city-brand">CITISTEN</strong>
          <div class="city-budget" role="group" aria-label="Budget"><strong data-value="budget">$0</strong><span data-value="netIncome" hidden></span></div>
          <span data-value="phase">Day 1</span><button data-action="menu">Menu</button><button data-action="theme">Light</button>
        </div>
        <div class="city-citizens" role="group" aria-label="Population and employment">
          <div class="city-stat"><span>Residents</span><strong data-value="population">0</strong></div>
          <div class="city-stat"><span>Housing capacity</span><strong data-value="housingCapacity">0</strong></div>
          <div class="city-stat"><span>Supplied jobs</span><strong data-value="jobs">0</strong></div>
        </div>
        <div class="city-morale" role="group" aria-label="Resident morale">
          <span>Morale <strong data-value="morale">Not measured</strong></span><span data-value="moraleFactors">Awaiting city update</span>
        </div>
        <div class="city-utilities">${['power', 'water'].map(name => `<div class="city-stat utility"><label for="city-${name}">${name === 'power' ? 'Power' : 'Water'}</label><strong data-value="${name}">0 available · 0 needed</strong><meter id="city-${name}" min="0" max="1" value="0" aria-label="${name} supply covering demand"></meter></div>`).join('')}</div>
        <div class="city-details"><details class="city-economy" hidden><summary>Economy / research</summary><div class="city-economy-body"><p data-value="economyBudget"></p><p data-value="economyStocks"></p><p data-value="economyResources"></p><p data-value="economyDemand"></p><p data-value="economyBottlenecks"></p><p data-value="researchStatus"></p><div class="city-research-options"></div><p>Branch choice locks when research starts. Agriculture favors food and low pollution; manufacturing favors materials and finishing, with higher upkeep, pollution and food-import dependence. Workshops consume 1 material + 0.3 food per good. Logistics raises export caps 25%. Fabrication plus Public education targets 20% more finishing, but requires supplied school capacity.</p><div class="city-policy-options"></div><p>Upgrade: tap a completed building. Level 1: 75% base price / 12s, requires Town planning. Level 2: 150% / 24s; homes, shops and utilities need Logistics; industry Fabrication; workshops Agronomy or Fabrication; services Public education; parks Agronomy or Public education. Each level: +25% output, +40% upkeep, +30% utility demand; services +10% reach/growth. No health or flat-income bonus.</p><p data-value="upgradeStatus"></p><div class="city-incident-options"></div><p data-value="economyMessage" role="status"></p></div></details>
        <details class="city-goal"><summary data-value="stage">Settlement · Next: Neighborhood (0/12)</summary><p data-value="stageRequirements"></p><p data-value="milestone" hidden></p><p>Sites provide no output until complete. Bulldoze cancels an unfinished site for a 75% refund. Completed demolition has no refund. Bridges need dry banks; river pumps need a riverbank.</p></details></div>
      </header>
      <aside class="city-top panel" data-value="growthDiagnosis" hidden aria-label="City diagnosis"></aside>
      <aside class="city-night panel" hidden aria-label="Night watch">
        <div class="city-hall"><svg viewBox="0 0 48 48" role="img" aria-label="Town hall health"><circle class="ring-track" cx="24" cy="24" r="19"/><circle class="ring-value" cx="24" cy="24" r="19" pathLength="100"/><text x="24" y="29" text-anchor="middle">H</text></svg><strong data-value="hp">0 / 0</strong></div>
        <div class="city-wave">Wave<strong data-value="wave">0</strong></div>
      </aside>
      <div class="city-toasts" role="status" aria-label="Events" aria-live="polite" aria-atomic="true"><span class="city-event-empty">No notices yet.</span></div>
      <details class="city-map panel"><summary>Map</summary><canvas width="200" height="200" role="img" aria-label="Town map. Blue: river. Ochre: bridges. H: town hall. Dots: zombies."></canvas><div class="city-legend"><span class="residential">Residential</span><span class="commercial">Commercial</span><span class="industrial">Industrial</span><span class="road">Road</span><span class="river">River</span><span class="bridge">Bridge</span><span class="hall">H Town hall</span><span class="enemy" hidden>Zombies</span></div></details>
      <footer class="city-builder">
        <div class="city-site panel" hidden aria-label="Construction"><span data-value="siteStatus"></span><progress max="1" value="0" aria-label="Site construction progress"></progress><span>Bulldoze: 75% refund</span></div>
        <section class="city-tools panel" aria-label="Tool options"></section>
        <nav class="city-groups panel" aria-label="Builder tools">${Object.keys(GROUPS).map(name => `<button data-group="${name}" aria-expanded="false" title="${GROUPS[name].length === 1 ? GROUPS[name][0][2] : ''}">${name}</button>`).join('')}</nav>
      </footer>
    </section>
    <dialog class="city-menu" aria-labelledby="city-menu-title">
      <div class="city-dialog-top"><button data-action="theme">Light</button></div>
      <div class="city-menu-content"><h1 id="city-menu-title" tabindex="-1" autofocus>CITISTEN</h1>
        <fieldset class="city-new-options"><legend>New town only</legend><label for="city-seed">Seed (0 to 4294967295)</label><input id="city-seed" type="number" min="0" max="4294967295" step="1" value="0" inputmode="numeric"><label for="city-scenario">Resources</label><select id="city-scenario">${Object.entries(SCENARIOS).map(([id, scenario]) => `<option value="${id}">${scenario.label}</option>`).join('')}</select><p>Continue restores the saved town, seed and scenario. Restart keeps the current town options.</p></fieldset>
        <div class="city-mode-cards">
          <article class="panel">${townIcon}<button data-mode="free">Free build</button></article>
          <article class="panel">${shieldIcon}<button data-mode="defense">Zombie defense</button></article>
        </div><button class="city-resume" data-action="resume" hidden>Resume</button>
        <button data-action="tutorial">How to play</button>
        <p class="city-menu-error" role="alert"></p>
      </div><p class="city-controls">WASD move / Right-drag rotate / Scroll zoom</p>
    </dialog>
    <dialog class="city-tutorial" aria-labelledby="city-tutorial-title" aria-describedby="city-tutorial-copy">
      <section class="panel">
        <p class="city-tutorial-step"></p><h2 id="city-tutorial-title" tabindex="-1" autofocus></h2>
        <p id="city-tutorial-copy"></p>
        <div class="city-loss-actions"><button data-action="tutorial-close">Close tutorial</button><button data-action="tutorial-next">Next</button></div>
      </section>
    </dialog>
    <dialog class="city-loss" aria-labelledby="city-loss-title">
      <div class="city-dialog-top"><strong class="city-brand">CITISTEN</strong><button data-action="theme">Light</button></div>
      <section class="city-loss-content panel"><div class="city-hall-mark" aria-hidden="true">H</div><h1 id="city-loss-title" tabindex="-1" autofocus>Town hall lost</h1>
        <dl>${[['score', 'Nights'], ['finalPopulation', 'Peak population'], ['kills', 'Kills']].map(([id,label]) => `<div><dt>${label}</dt><dd data-value="${id}">0</dd></div>`).join('')}</dl>
        <div class="city-loss-actions"><button data-action="restart">Restart</button><button data-action="menu">Menu</button></div><p class="city-loss-error" role="alert"></p>
      </section>
    </dialog>`;
  const $ = selector => root.querySelector(selector);
  const game = $('.city-game'), menu = $('.city-menu'), loss = $('.city-loss'), tutorial = $('.city-tutorial');
  const abort = new AbortController();
  const recent = new Map();
  let tutorialStep = 0, tutorialSeen = false, tutorialResumes = false, tutorialActive = false;
  try { tutorialSeen = localStorage.getItem('citisten-tutorial-seen') === '1'; } catch { /* First-play help still works without storage. */ }
  let mode = 'free', selected = 'road', activeGroup = 'Road', hasGame = false, lost = false, optionsOpen = false;
  const mobile = matchMedia('(max-width: 600px)');
  let lastMapDraw = -Infinity, currentState = {}, toolLevel = 0;
  let mapTerrain, mapSeed, mapLayout, mapSize = 0, expansionSignature = '', toolExpansion = false, toolReadOnly = false;
  const researchControls = new Map(), policyControls = new Map(), incidentControls = new Map();
  const riverCells = new Set();
  const text = (key, value) => { const element = $(`[data-value="${key}"]`); if (element.textContent !== value) element.textContent = value; };

  function applyTheme() {
    const theme = root.dataset.theme;
    for (const dialog of [menu, loss, tutorial]) dialog.dataset.theme = theme;
    root.querySelectorAll('[data-action="theme"]').forEach(button => {
      button.textContent = theme === 'dark' ? 'Light' : 'Dark';
      button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    });
    for (const dialog of [menu, loss, tutorial]) dialog.style.colorScheme = theme;
  }
  function showGame() {
    tutorialResumes = false; finishTutorial();
    menu.close(); loss.close(); game.hidden = false; hasGame = true;
  }
  function showMenu() {
    tutorialResumes = false; finishTutorial();
    loss.close();
    $('.city-resume').hidden = !hasGame || lost;
    if (!menu.open) menu.showModal();
  }
  function renderTutorial() {
    $('.city-tutorial-step').textContent = `Step ${tutorialStep + 1} of ${TUTORIAL.length}`;
    $('#city-tutorial-title').textContent = TUTORIAL[tutorialStep][0];
    $('#city-tutorial-copy').textContent = TUTORIAL[tutorialStep][1];
    $('[data-action="tutorial-next"]').textContent = tutorialStep === TUTORIAL.length - 1 ? 'Finish' : 'Next';
    $('#city-tutorial-title').focus();
  }
  function showTutorial() {
    if (abort.signal.aborted || tutorialActive) return;
    tutorialActive = true;
    tutorialResumes = hasGame && !menu.open && !lost;
    if (tutorialResumes) callbacks.onMenu?.();
    tutorialStep = 0; renderTutorial(); tutorial.showModal();
  }
  function finishTutorial() {
    if (abort.signal.aborted || !tutorialActive) return;
    const resume = tutorialResumes && hasGame && !menu.open && !lost;
    // Consume before close/callbacks: close events are deferred and may outlive a replay.
    tutorialActive = false; tutorialResumes = false;
    if (tutorial.open) tutorial.close();
    tutorialSeen = true;
    try { localStorage.setItem('citisten-tutorial-seen', '1'); } catch { /* Dismissal remains session-local without storage. */ }
    if (resume) callbacks.onResume?.();
  }
  tutorial.addEventListener('cancel', event => { event.preventDefault(); finishTutorial(); }, { signal: abort.signal });
  tutorial.addEventListener('close', () => { if (!tutorial.open) finishTutorial(); }, { signal: abort.signal });
  function renderTools() {
    const expanded = GROUPS[activeGroup].length > 1 && optionsOpen;
    $('.city-tools').hidden = !expanded;
    $('.city-tools').innerHTML = GROUPS[activeGroup].filter(([id]) => id !== 'upgrade' || currentState.expansionEnabled === true).map(([id, label, key]) => {
      const locked = id === 'upgrade' ? currentState.readOnly === true : id !== 'rotate-wall' && !unlocked(id, currentState), stage = CITY_STAGES[NEW_BUILDINGS[id]?.unlockStage];
      const price = id === 'upgrade' ? 'L1: 75% base / 12s · L2: 150% / 24s. Research required; +40% upkeep, +30% utilities per level.' : id === 'rotate-wall' ? 'Tap a completed wall' : id === 'road' ? '$10/lot · immediate' : id === 'bridge' ? '$90/water lot + $10/dry lot · immediate' : BUILDINGS[id] ? `$${number(BUILDINGS[id].cost)} · ${BUILD_TIMES[id] || 0}s` : id === 'bulldoze' ? 'Sites: 75% refund' : 'Unavailable';
      const requirement = locked && stage ? `Unlock ${stage.name}: ${stage.unlockSummary}.` : '';
      return `<div class="city-tool-option"><button data-tool="${id}" aria-label="${label}" aria-pressed="${selected === id}" aria-describedby="city-info-${id} city-tooltip-${id}" ${locked ? 'disabled' : ''}>${label}<span class="city-tooltip" id="city-tooltip-${id}" role="tooltip">${key || (id === 'bridge' ? 'Drag bank to bank' : label)}</span></button><span class="city-tool-meta" id="city-info-${id}">${price}${requirement ? `<span class="city-tool-lock" title="${stage.summary}">${requirement}</span>` : ''}</span></div>`;
    }).join('');
    root.querySelectorAll('[data-group]').forEach(button => {
      button.setAttribute('aria-expanded', String(button.dataset.group === activeGroup && expanded));
      button.classList.toggle('is-selected', GROUPS[button.dataset.group].some(([id]) => id === selected));
      button.setAttribute('aria-pressed', String(button.classList.contains('is-selected')));
    });
  }
  function setTool(type) {
    const group = Object.keys(GROUPS).find(name => GROUPS[name].some(([id]) => id === type));
    if (!group || !toolAllowed(type)) return;
    selected = type; activeGroup = group;
    optionsOpen = false;
    renderTools();
  }
  function toolAllowed(type) {
    return type === 'upgrade' ? currentState.expansionEnabled === true && currentState.readOnly !== true : type === 'rotate-wall' || unlocked(type, currentState);
  }
  function newTownOptions() {
    const raw = String($('#city-seed').value ?? '0').trim();
    const seed = Number(raw), scenario = $('#city-scenario').value ?? 'balanced';
    if (!/^\d+$/.test(raw) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Seed must be a whole number from 0 to 4294967295.');
    if (!Object.hasOwn(SCENARIOS, scenario)) throw new RangeError('Choose a listed resource scenario.');
    return { seed, scenario };
  }
  function run(action, errorTarget) {
    try {
      $(errorTarget).textContent = '';
      if (action() === false) return false;
      setTool('road');
      recent.clear(); $('.city-toasts').querySelectorAll('p').forEach(item => item.remove());
      return true;
    }
    catch (error) { $(errorTarget).textContent = `Start failed: ${error.message || 'unknown error'}`; return false; }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.action === 'theme') {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('citisten-theme', root.dataset.theme); } catch { /* Theme remains session-local without storage. */ }
      applyTheme();
    } else if (button.dataset.action === 'tutorial') { showTutorial(); }
    else if (button.dataset.action === 'tutorial-close') { finishTutorial(); }
    else if (button.dataset.action === 'tutorial-next') {
      if (tutorialStep === TUTORIAL.length - 1) finishTutorial();
      else { tutorialStep++; renderTutorial(); }
    } else if (button.dataset.research || button.dataset.specialization || button.dataset.incident) {
      if (currentState.expansionEnabled !== true || currentState.readOnly === true || currentState.phase === 'lost') return;
      const id = button.dataset.research || button.dataset.specialization || button.dataset.incident;
      const handler = button.dataset.research ? callbacks.onResearch : button.dataset.specialization ? callbacks.onSpecialization : callbacks.onIncidentResponse;
      if (button.dataset.research && !researchOffer(currentState, id).ok) return;
      if (button.dataset.specialization && policyReason(id)) return;
      if (button.dataset.incident && !currentState.incidents?.active?.some(incident => String(incident.id) === id)) return;
      try {
        const result = handler?.(id);
        text('economyMessage', typeof result === 'string' ? result : result?.reason || (result?.ok ? 'Accepted' : ''));
      } catch (error) { text('economyMessage', error.message || 'Action failed'); }
      expansionSignature = ''; renderExpansion();
    } else if (button.dataset.cityEvent) { callbacks.onEventAction?.(button.dataset.cityEvent); }
    else if (button.dataset.mode) {
      const startMode = button.dataset.mode;
      // Native sets requestedSave at the Continue target before this delegated listener.
      // Never reject Continue because an unrelated new-town field is invalid.
      if (run(() => callbacks.onStart?.(startMode, button.id === 'continue-town' ? undefined : newTownOptions()), '.city-menu-error')) { mode = startMode; lost = false; showGame(); if (!tutorialSeen) showTutorial(); }
    } else if (button.dataset.action === 'restart') {
      if (run(() => callbacks.onRestart?.(mode), '.city-loss-error')) { lost = false; showGame(); }
    } else if (button.dataset.action === 'menu') { callbacks.onMenu?.(); showMenu(); }
    else if (button.dataset.action === 'resume') { callbacks.onResume?.(); showGame(); }
    else if (button.dataset.group) {
      $('.city-economy').open = false;
      optionsOpen = activeGroup !== button.dataset.group || !optionsOpen;
      activeGroup = button.dataset.group; renderTools();
      if (GROUPS[activeGroup].length === 1) { setTool(GROUPS[activeGroup][0][0]); callbacks.onTool?.(selected); }
    } else if (button.dataset.tool) {
      const type = button.dataset.tool;
      if (!toolAllowed(type)) return;
      setTool(type); callbacks.onTool?.(type);
      $(`[data-group="${activeGroup}"]`).focus();
    }
  }, { signal: abort.signal });
  menu.addEventListener('cancel', event => { event.preventDefault(); if (!$('.city-resume').hidden) { callbacks.onResume?.(); showGame(); } }, { signal: abort.signal });
  loss.addEventListener('cancel', event => event.preventDefault(), { signal: abort.signal });
  // Keep camera/input handlers off management controls without wiring game hotkeys here.
  for (const name of ['pointerdown', 'pointerup', 'wheel', 'keydown', 'keyup']) root.addEventListener(name, event => event.stopPropagation(), { signal: abort.signal });

  function drawMap(state, { roads, size = 200, terrain } = {}) {
    const canvas = $('.city-map canvas'), ctx = canvas.getContext('2d'), scale = canvas.width / size;
    ctx.fillStyle = '#181c1b'; ctx.fillRect(0, 0, 200, 200);
    const seed = terrain?.seed ?? state.terrainSeed, layout = state.terrainLayout;
    if (terrain !== mapTerrain || size !== mapSize || seed !== mapSeed || layout !== mapLayout) {
      mapTerrain = terrain; mapSize = size; mapSeed = seed; mapLayout = layout; riverCells.clear();
      if (terrain?.isWater) for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) if (terrain.isWater(x, z)) riverCells.add(z * size + x);
    }
    ctx.fillStyle = '#527b99';
    for (const key of riverCells) ctx.fillRect((key % size) * scale, Math.floor(key / size) * scale, Math.max(1, scale), Math.max(1, scale));
    ctx.strokeStyle = '#343c37'; ctx.lineWidth = 0.5;
    for (let n = 0; n <= size; n += Math.max(1, Math.ceil(size / 40))) {
      const p = n * scale; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 200); ctx.moveTo(0, p); ctx.lineTo(200, p); ctx.stroke();
    }
    if (roads) for (const key of roads.cells) { const cell = roads.cell(key); ctx.fillStyle = riverCells.has(cell.z * size + cell.x) ? '#d8ae55' : '#777b78'; ctx.fillRect(cell.x * scale, cell.z * scale, Math.max(1, scale), Math.max(1, scale)); }
    const colours = { residential: '#99ad85', apartments: '#99ad85', commercial: '#829cb5', industrial: '#bda57a', workshop: '#bda57a' };
    for (const building of state.buildings || []) {
      ctx.fillStyle = building.constructionRemaining > 0 ? '#c6cbc5' : colours[building.type] || '#d8ae55';
      ctx.fillRect(building.x * scale, building.z * scale, Math.max(2, scale), Math.max(2, scale));
    }
    const hall = (state.buildings || []).find(building => building.type === 'townhall');
    if (hall) {
      const x = Math.max(0, Math.min(184, hall.x * scale - 7)), y = Math.max(0, Math.min(184, hall.z * scale - 7));
      ctx.fillStyle = '#f5f2e9'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = '#000'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('H', x + 3, y + 13);
    }
    if (state.mode === 'defense' && state.phase === 'night') for (const zombie of state.zombies || []) {
      ctx.fillStyle = '#d8ae55'; ctx.beginPath(); ctx.arc(zombie.x * scale, zombie.z * scale, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const decimal = value => Number.isFinite(value) ? value.toLocaleString('en-AU', { maximumFractionDigits: 3 }) : '0';
  function policyReason(name) {
    const state = currentState, policy = SPECIALIZATIONS[name];
    if (!policy || !state.economy) return 'Economy unavailable';
    if (state.economy.specialization === name) return 'Selected';
    if (policy.research && !state.development?.completed?.includes(policy.research)) return `Requires ${TECHNOLOGIES[policy.research].label}`;
    if (!Number.isFinite(state.budget) || state.budget < policy.cost) return 'Insufficient budget';
    if (state.economy.cumulative?.policyCost + policy.cost > 1e12) return 'Policy ledger full';
    return '';
  }
  function control(list, dataset, label) {
    const row = document.createElement('div'), button = document.createElement('button'), detail = document.createElement('span');
    button.dataset[dataset[0]] = dataset[1]; button.textContent = label;
    row.className = 'city-economy-option'; row.append(button, detail); $(list).append(row);
    return { row, button, detail };
  }
  function renderExpansion() {
    const state = currentState, enabled = state.expansionEnabled === true;
    $('.city-economy').hidden = !enabled;
    $('[data-value="netIncome"]').hidden = !enabled;
    $('.city-new-options').hidden = state.expansionEnabled === false;
    if (!enabled) { expansionSignature = ''; return; }
    // No control replacement: focus and native details/selection survive RAF updates.
    const signature = JSON.stringify([state.tick, state.time, state.budget, state.population, state.phase, state.readOnly, state.terrainSeed, state.terrainLayout,
      state.income, state.upkeep, state.netIncome, state.development, state.economy, state.incidents,
      (state.buildings || []).map(b => [b.id, b.type, b.hp, b.level, b.constructionRemaining, b.upgradeRemaining])]);
    if (signature === expansionSignature) return;
    expansionSignature = signature;
    const economy = state.economy || {}, breakdown = economy.breakdown;
    const activeIncidents = state.incidents?.active?.length || 0;
    $('.city-economy summary').textContent = `Economy / research${activeIncidents ? ` · ${activeIncidents} ${activeIncidents === 1 ? 'incident' : 'incidents'}` : ''}`;
    const net = breakdown?.netIncome ?? breakdown?.net ?? state.netIncome ?? ((state.income || 0) - (state.upkeep || 0));
    text('netIncome', `Net $${decimal(net)}/s`);
    text('economyBudget', breakdown
      ? `Tax $${decimal(breakdown.taxIncome ?? breakdown.taxes ?? breakdown.tax)}/s · Services $${decimal(breakdown.serviceIncome ?? breakdown.services ?? breakdown.service)}/s · Exports $${decimal(breakdown.exportRevenue ?? breakdown.exports)}/s · Imports -$${decimal(breakdown.importCost ?? breakdown.imports)}/s · Upkeep -$${decimal(breakdown.upkeep ?? state.upkeep)}/s · Net $${decimal(net)}/s`
      : `Income $${decimal(state.income)}/s · Upkeep -$${decimal(state.upkeep)}/s · Net $${decimal(net)}/s. Detailed ledger not yet available.`);
    text('economyStocks', ['food', 'materials', 'goods'].map(good => `${good}: ${decimal(economy.stocks?.[good])}/${decimal(economy.storage?.[good])}`).join(' · '));
    text('economyResources', `${state.terrainSeed === undefined ? 'Legacy terrain (no map seed)' : `Map seed ${state.terrainSeed}`} · Resource seed ${economy.seed ?? '?'} · ${SCENARIOS[economy.scenario]?.label || 'Resources pending'} · ${(economy.opportunities || []).join(' · ')} · Yield food ×${decimal(economy.multipliers?.food)}, materials ×${decimal(economy.multipliers?.materials)}`);
    const demandScale = (state.development?.completed?.includes('logistics') ? 1.25 : 1) * Math.min(1, Math.max(0, state.population || 0) / 100);
    text('economyDemand', `Export demand /s: ${['food', 'materials', 'goods'].map(good => `${good} ${decimal((economy.demand?.[good] || 0) * demandScale)}`).join(' · ')}. Requires supplied road to town hall; reserves and stock also limit sales.`);
    text('economyBottlenecks', `Bottlenecks: ${economy.bottlenecks?.join(' · ') || 'None reported'} · Pollution ${Math.round((economy.pollution || 0) * 100)}%`);
    const development = state.development, active = development?.active;
    text('researchStatus', `${active ? `${TECHNOLOGIES[active.id]?.label || active.id}: ${Math.ceil(active.remaining)}s remaining` : 'No active research'} · Branch: ${development?.branch || 'uncommitted'} · Completed: ${development?.completed?.map(id => TECHNOLOGIES[id]?.label || id).join(', ') || 'none'}`);
    const blocked = state.readOnly === true || state.phase === 'lost';
    for (const [id, tech] of Object.entries(TECHNOLOGIES)) {
      if (!researchControls.has(id)) researchControls.set(id, control('.city-research-options', ['research', id], tech.label));
      const { button, detail } = researchControls.get(id), offer = researchOffer(state, id);
      button.disabled = blocked || !callbacks.onResearch || !offer.ok;
      const prerequisites = tech.prerequisites.map(p => TECHNOLOGIES[p].label).join(', ') || 'none';
      detail.textContent = `$${tech.cost} / ${tech.duration}s · upkeep $${decimal(tech.upkeep)}/s · ${tech.population} residents · completed ${tech.buildings.map(group => group.join(' or ')).join(' and ')} · research: ${prerequisites}${tech.branch ? ` · locks ${tech.branch} branch` : ''}${offer.reason ? ` · ${offer.reason}` : ''}`;
    }
    for (const [name, policy] of Object.entries(SPECIALIZATIONS)) {
      if (!policyControls.has(name)) policyControls.set(name, control('.city-policy-options', ['specialization', name], policy.label));
      const { button, detail } = policyControls.get(name), reason = policyReason(name);
      button.disabled = blocked || !callbacks.onSpecialization || Boolean(reason);
      button.setAttribute('aria-pressed', String(economy.specialization === name));
      detail.textContent = `$${policy.cost} to switch · ${policy.research ? `requires ${TECHNOLOGIES[policy.research].label}` : 'no research'} · food/materials per industry ${policy.food}/${policy.materials}, goods/workshop ${policy.goods}/s · extra upkeep $${policy.upkeep}/industry/s (workshops 1.5x) · pollution factor ${policy.pollution}${reason ? ` · ${reason}` : ''}`;
    }
    const upgrading = (state.buildings || []).filter(b => b.upgradeRemaining > 0);
    text('upgradeStatus', upgrading.length ? upgrading.map(b => `${b.type} #${b.id} (${b.x}, ${b.z}): level ${(b.level || 0) + 1}, ${Math.ceil(b.upgradeRemaining)}s remaining`).join(' · ') : 'No upgrades in progress. Times use simulation seconds; pause stops progress.');
    const incidents = state.incidents?.active || [], ids = new Set(incidents.map(i => String(i.id)));
    for (const [id, item] of incidentControls) if (!ids.has(id)) { item.row.remove(); incidentControls.delete(id); }
    for (const incident of incidents) {
      const id = String(incident.id);
      if (!incidentControls.has(id)) incidentControls.set(id, control('.city-incident-options', ['incident', id], 'Respond'));
      const { button, detail } = incidentControls.get(id), cost = incident.responseCost ?? incident.cost ?? INCIDENT_RESPONSE_COST[incident.type];
      button.textContent = `Respond to ${incident.type}`;
      const hasTarget = (state.buildings || []).some(b => incident.buildingIds?.includes(b.id) && b.hp > 0 && !(b.constructionRemaining > 0) && !['townhall', 'wall', 'watchtower'].includes(b.type));
      button.disabled = blocked || !callbacks.onIncidentResponse || !hasTarget || (Number.isFinite(cost) && state.budget < cost);
      detail.textContent = `${incident.type} at (${incident.x}, ${incident.z}) · severity ${incident.severity} · ${Math.ceil(incident.remaining)}s remaining · ${Number.isFinite(cost) ? `response $${decimal(cost)}` : 'Response cost requires city quote'}`;
    }
  }
  function update(state, map = {}) {
    currentState = state;
    const level = state.progressionLevel || 0;
    if (level !== toolLevel || toolExpansion !== (state.expansionEnabled === true) || toolReadOnly !== (state.readOnly === true)) {
      toolLevel = level; toolExpansion = state.expansionEnabled === true; toolReadOnly = state.readOnly === true; renderTools();
    }
    renderExpansion();
    const stage = getStage(state), goal = nextStage(state);
    text('stage', goal ? `${stage.name} · Next: ${goal.name} (${number(state.population)}/${goal.requirements.find(r => r.key === 'population').min})` : `${stage.name} · All stages earned`);
    text('stageRequirements', goal ? `Remaining: ${goal.remaining || 'Ready for the next city update'}. Reward: $${number(goal.grant)}.` : 'All stage goals complete. Keep building.');
    const sites = (state.buildings || []).filter(b => b.constructionRemaining > 0);
    const site = sites[0], sitePanel = $('.city-site');
    sitePanel.hidden = !site;
    if (site) {
      const remaining = Math.ceil(site.constructionRemaining), total = Math.max(site.constructionRemaining, site.constructionTotal || site.constructionRemaining);
      const label = NEW_BUILDINGS[site.type]?.label || GROUPS.Zone.concat(GROUPS.Service, GROUPS.Defense).find(([id]) => id === site.type)?.[1] || site.type;
      const status = `${sites.length} ${sites.length === 1 ? 'site' : 'sites'} · ${label}: ${remaining}/${Math.ceil(total)}s left`;
      text('siteStatus', status); sitePanel.title = `${status}. No output until complete. Bulldoze cancels for a 75% refund.`;
      const progress = $('.city-site progress'); progress.max = total; progress.value = total - site.constructionRemaining;
      progress.setAttribute('aria-label', `${label}: ${remaining} of ${Math.ceil(total)} seconds remaining`);
    }
    mode = state.mode === 'defense' ? 'defense' : 'free';
    for (const button of root.querySelectorAll('[data-city-event]')) {
      button.disabled = state.phase !== 'day' || !state.cityEvents?.some(event => event.id === button.dataset.cityEvent);
    }
    text('budget', `$${number(state.budget)}`); text('population', number(state.population));
    // Legacy previews lack aggregate fields. Reuse definitions and active-site rules.
    let capacity = 0, jobs = 0;
    if (!Number.isFinite(state.housingCapacity) || !Number.isFinite(state.jobs)) {
      for (const building of state.buildings || []) {
        if (!isBuildingActive(building)) continue;
        const definition = BUILDINGS[building.type];
        capacity += definition?.capacity || 0;
        if (building.powered && building.watered) jobs += definition?.jobs || 0;
      }
    }
    text('housingCapacity', number(Math.max(0, Number.isFinite(state.housingCapacity) ? state.housingCapacity : capacity)));
    text('jobs', number(Math.max(0, Number.isFinite(state.jobs) ? state.jobs : jobs)));
    const measured = Number.isFinite(state.morale);
    text('morale', measured ? `${Math.round(Math.max(0, Math.min(1, state.morale)) * 100)}%` : 'Not measured');
    const factors = Array.isArray(state.moraleFactors) ? state.moraleFactors.filter(factor => typeof factor === 'string' && factor.trim()) : [];
    text('moraleFactors', measured ? factors.join(' · ') || 'Basic needs met' : 'Awaiting city update');
    const next = state.nextMilestone;
    text('milestone', next ? `Next: ${number(next.population)} (+$${number(next.grant)})` : '');
    $('[data-value="milestone"]').hidden = !next;
    $('[data-value="milestone"]').title = next?.name || '';
    const homes = (state.buildings || []).filter(b => BUILDINGS[b.type]?.capacity && b.hp > 0);
    const unserved = homes.filter(b => isBuildingActive(b) && (!b.powered || !b.watered));
    const diagnosis = state.rebuildRemaining > 0
      ? `Rebuild: ${Math.ceil(state.rebuildRemaining)}s left. Choose Repair, then tap the town hall ($240).`
      : unserved.length ? `Next: connect ${unserved.some(b => !b.powered) ? 'power' : 'water'} to homes by road (${unserved.length} unserved).`
      : sites.length ? `Next: let ${buildingLabel(site.type)} finish (${Math.ceil(site.constructionRemaining)}s at running speed).`
      : !homes.length ? map.roads?.cells?.size > 0
        ? 'Next: choose Zone → Residential, then tap dry land beside your road. Selection does not place it.'
        : 'Next: choose Road, then click or drag dry land beside the hall. Selection does not place it.'
      : state.growthDiagnosis || '';
    text('growthDiagnosis', diagnosis); $('[data-value="growthDiagnosis"]').hidden = !diagnosis;
    for (const name of ['power', 'water']) {
      const utility = state[name] || { demand: 0, supply: 0 };
      text(name, `${decimal(utility.supply)} available · ${decimal(utility.demand)} needed${utility.demand === 0 ? ' · No demand' : utility.demand > utility.supply ? ' · Shortage' : ''}`);
      const meter = $(`#city-${name}`); meter.max = Math.max(1, utility.supply, utility.demand); meter.value = utility.demand > 0 ? Math.max(0, Math.min(utility.supply, utility.demand)) : 0;
      meter.setAttribute('aria-valuetext', `${decimal(utility.supply)} available, ${decimal(utility.demand)} needed${utility.demand === 0 ? ', no demand' : utility.demand > utility.supply ? ', shortage' : ''}`);
      meter.classList.toggle('is-overloaded', utility.demand > utility.supply);
    }
    text('phase', state.phase === 'night' ? 'Night' : `Day ${number(state.night + 1)}`);
    const night = mode === 'defense' && state.phase === 'night';
    $('.city-night').hidden = !night;
    $('.city-legend .enemy').hidden = !night;
    text('hp', `${number(state.townHallHp)} / ${number(state.townHallMaxHp)}`); text('wave', number(state.night));
    const hp = Math.max(0, Math.min(100, 100 * state.townHallHp / (state.townHallMaxHp || 1)));
    $('.ring-value').style.strokeDasharray = `${hp} 100`;
    $('.city-hall svg').setAttribute('aria-label', `Town hall health ${Math.round(hp)} percent`);
    if (map.terrain !== mapTerrain || (map.size ?? 200) !== mapSize || (map.terrain?.seed ?? state.terrainSeed) !== mapSeed || state.terrainLayout !== mapLayout || performance.now() - lastMapDraw > 250) { drawMap(state, map); lastMapDraw = performance.now(); }
    if (state.phase !== 'lost') lost = false;
    if (state.phase === 'lost' && !lost) {
      lost = true; finishTutorial(); menu.close(); text('score', number(state.score)); text('finalPopulation', number(state.peakPopulation)); text('kills', number(state.kills)); loss.showModal();
    }
  }
  function toast(key, message, eventId, urgent = false) {
    const now = Date.now(), list = $('.city-toasts');
    if (now - (recent.get(key) || 0) < 8000 && [...list.querySelectorAll('p')].some(item => item.dataset.noticeKey === key)) return;
    for (const [oldKey, time] of recent) if (now - time >= 8000) recent.delete(oldKey);
    recent.set(key, now);
    const notices = [...list.querySelectorAll('p')].filter(item => item.dataset.priority === (urgent ? 'urgent' : 'routine') && !item.dataset.response);
    const limit = urgent ? 2 : 1;
    while (notices.length >= limit) notices.shift().remove();
    const item = document.createElement('p'); item.className = 'panel'; item.textContent = message;
    item.dataset.priority = urgent ? 'urgent' : 'routine'; item.dataset.noticeKey = key;
    if (eventId) {
      for (const old of list.querySelectorAll('p')) if (old.dataset.response === eventId) old.remove();
      item.dataset.response = eventId;
      const button = document.createElement('button'); button.dataset.cityEvent = eventId;
      button.textContent = 'Repair water main: $120'; item.append(document.createElement('br'), button);
    }
    list.append(item);
  }
  function events(batch) {
    const messages = new Map(), reactions = new Map();
    const buildings = new Map((currentState.buildings || []).map(b => [b.id, b]));
    for (const event of batch) if (event.building) buildings.set(event.building.id, event.building);
    for (const event of batch) {
      const building = event.building || buildings.get(event.id), label = buildingLabel(building?.type);
      const message = {
        placed: building?.constructionRemaining > 0 ? `${label}: construction started (${Math.ceil(building.constructionRemaining)}s).` : `${label} placed`, removed: `${label} removed`, repaired: `${label} repaired`,
        'stage-earned': `${event.name || 'City stage'} earned. Grant +$${number(event.grant)}. New options are in the builder.`,
        'construction-started': `${label}: construction started (${Math.ceil(building?.constructionRemaining ?? event.total ?? 0)}s). No output until complete.`,
        'construction-complete': `${label}: construction complete`,
        'research-started': `${event.label || 'Research'} started: $${number(event.cost)}, ${number(event.total)}s.`,
        'research-complete': `${event.label || 'Research'} complete.`,
        'upgrade-started': `${event.label || 'Building'} #${event.id} upgrading to level ${number(event.level)}: $${number(event.cost)}, ${number(event.total)}s.`,
        'upgrade-complete': `${event.label || 'Building'} #${event.id}: level ${number(event.level)} complete.`,
        'incident-start': `${event.incident?.type || event.kind || event.incidentType || 'Incident'} at (${event.incident?.x ?? event.x}, ${event.incident?.z ?? event.z}). Open Economy / research to respond.`,
        'incident-end': `${event.incident?.type || event.kind || event.incidentType || 'Incident'} resolved.`,
        'incident-response': 'Incident response accepted.',
        'construction-cancelled': `Site cancelled. Refund $${number(event.refund)} (75%).`,
        blackout: event.active ? 'Blackout' : 'Power restored',
        'wave-warning': 'Nightfall: 1 min',
        wave: `Wave ${number(event.night)} incoming`,
        milestone: event.name ? `${event.name}: ${number(event.population)} residents. Grant +$${number(event.grant)}.` : `${number(event.population)} residents`,
        'night-survived': 'Night survived',
        'hall-fallen': `Town hall fell. City saved for rebuilding: ${number(event.remaining)}s to repair ($${number(event.cost)}). No night victory.`,
        'hall-rebuilt': `Town hall rebuilt ($${number(event.cost)}). Prepare for the next night.`
      }[event.type];
      if (message && !(event.type === 'placed' && building?.constructionRemaining > 0 && batch.some(e => e.type === 'construction-started' && e.id === building.id))) messages.set(event.type === 'milestone' ? `milestone:${event.population}` : event.type === 'stage-earned' ? `stage:${event.level}` : event.type, message);
      if (event.type === 'city-event-start' || event.type === 'city-event-end') {
        const civic = event.event;
        if (event.type === 'city-event-end') for (const item of $('.city-toasts').querySelectorAll('p')) if (item.dataset.response === civic.id) item.remove();
        const location = ['street-festival', 'water-main-burst'].includes(civic.type) ? ` (district ${civic.district})` : '';
        const detail = event.type === 'city-event-start' ? civic.description : event.reason === 'repaired' ? 'Water service restored.' : 'Ended.';
        const key = `civic:${civic.id}:${event.type}`;
        messages.set(key, `${civic.title}${location}: ${detail}`);
        if (event.type === 'city-event-start' && civic.type === 'water-main-burst') reactions.set(key, civic.id);
      }
    }
    // Put urgent notices last so compact phone feedback keeps the useful warning.
    for (const key of ['placed', 'removed', 'repaired', 'construction-started', 'construction-complete', 'construction-cancelled', ...[...messages.keys()].filter(key => key.startsWith('stage:') || key.startsWith('milestone:')), 'night-survived', 'research-started', 'research-complete', 'upgrade-started', 'upgrade-complete', ...[...messages.keys()].filter(key => key.startsWith('civic:')), 'incident-start', 'incident-response', 'incident-end', 'wave-warning', 'blackout', 'wave', 'hall-rebuilt', 'hall-fallen']) {
      if (messages.has(key)) toast(`${key}:${messages.get(key)}`, messages.get(key), reactions.get(key), key.startsWith('civic:') || ['incident-start', 'wave-warning', 'blackout', 'wave', 'hall-fallen'].includes(key));
    }
  }
  $('.city-economy').addEventListener('toggle', () => {
    if ($('.city-economy').open) { optionsOpen = false; renderTools(); }
  }, { signal: abort.signal });
  mobile.addEventListener('change', () => { optionsOpen = false; renderTools(); }, { signal: abort.signal });
  applyTheme(); renderTools(); showMenu();
  return { update, events, setTool, showMenu, showGame, destroy() { abort.abort(); tutorialActive = false; tutorialResumes = false; menu.close(); loss.close(); tutorial.close(); root.replaceChildren(); root.classList.remove('citisten-ui'); } };
}
