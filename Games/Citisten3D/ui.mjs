const GROUPS = {
  Road: [['road', 'Road', '1']],
  Zone: [['residential', 'Residential', '2'], ['commercial', 'Commercial', '3'], ['industrial', 'Industrial', '4']],
  Service: [['power', 'Power plant', '5'], ['water', 'Water tower', '6'], ['police', 'Police', '7'], ['fire', 'Fire station', '8'], ['park', 'Park', '9']],
  Defense: [['wall', 'Wall', 'B'], ['barricade', 'Barricade', 'Not available'], ['watchtower', 'Watchtower', 'N']],
  Bulldoze: [['bulldoze', 'Bulldoze', 'X']]
};
const TUTORIAL = [
  ['Place a road', 'Choose Road, then drag across empty lots. Roads cost $10 per lot. Mouse and touch both work.'],
  ['Zone residential', 'Choose Zone, then Residential. Click or tap an empty lot beside a road. Homes also need a town hall, park, police or fire station within 16 lots.'],
  ['Add power and water', 'Choose Service, then place a Power plant and a Water tower beside roads connected to your homes. Powered and watered commercial and industrial zones provide jobs.'],
  ['Survive the night', 'In Zombie defense, protect the town hall with walls and watchtowers before nightfall. Repair damaged lots during the day. Free build has no zombie waves.'],
  ['Control the speed', 'Choose 1x, 3x or 10x to run time. Paused stops simulation time, not events display or building tools. Menu also pauses. Open How to play from Menu to read this again.']
];
const number = value => Math.floor(Number(value) || 0).toLocaleString('en-AU');
const townIcon = '<svg viewBox="0 0 160 80" aria-hidden="true"><path d="M5 72h150M25 72V43l20-15 20 15v29M80 72V20h25v52M85 20l8-15 8 15M118 72V48l16-12 16 12v24M38 72V55h14v17M88 35h8m-8 12h8"/></svg>';
const shieldIcon = '<svg viewBox="0 0 160 80" aria-hidden="true"><path d="M80 5c12 12 28 14 39 16-1 27-13 43-39 55-26-12-38-28-39-55 11-2 27-4 39-16Z"/><path d="M68 53V30h24v23M76 53V42h8v11"/></svg>';

export function createUI(root, callbacks = {}) {
  root.classList.add('citisten-ui');
  root.dataset.theme = 'dark';
  try { if (localStorage.getItem('citisten-theme') === 'light') root.dataset.theme = 'light'; } catch { /* Storage can be disabled; the toggle still works. */ }
  root.innerHTML = `
    <section class="city-game" hidden aria-label="Town management">
      <header class="city-top panel">
        <strong class="city-brand">CITISTEN</strong>
        <div class="city-stat" role="group" aria-label="Budget"><strong data-value="budget">$0</strong></div>
        <div class="city-stat"><span>Population</span><strong data-value="population">0</strong></div>
        ${['power', 'water'].map(name => `<div class="city-stat utility"><label for="city-${name}">${name === 'power' ? 'Power' : 'Water'}</label><strong data-value="${name}">0 / 0</strong><meter id="city-${name}" min="0" max="1" value="0" aria-label="${name} demand against supply"></meter></div>`).join('')}
        <span data-value="phase">Day 1</span><button data-action="menu">Menu</button><button data-action="theme">Light</button>
      </header>
      <aside class="city-night panel" hidden aria-label="Night watch">
        <div class="city-hall"><svg viewBox="0 0 48 48" role="img" aria-label="Town hall health"><circle class="ring-track" cx="24" cy="24" r="19"/><circle class="ring-value" cx="24" cy="24" r="19" pathLength="100"/><text x="24" y="29" text-anchor="middle">H</text></svg><strong data-value="hp">0 / 0</strong></div>
        <div class="city-wave">Wave<strong data-value="wave">0</strong></div>
      </aside>
      <div class="city-toasts" role="status" aria-label="Events" aria-live="polite" aria-atomic="true"><strong>Events</strong><span class="city-event-empty">No events yet. Notices stay visible while paused.</span></div>
      <details class="city-map panel" open><summary>Map</summary><canvas width="200" height="200" role="img" aria-label="Town map. H: town hall. Dots: zombies."></canvas><div class="city-legend"><span class="residential">Residential</span><span class="commercial">Commercial</span><span class="industrial">Industrial</span><span class="road">Road</span><span class="hall">H Town hall</span><span class="enemy" hidden>Zombies</span></div></details>
      <footer class="city-builder">
        <section class="city-tools panel" aria-label="Tool options"></section>
        <nav class="city-groups panel" aria-label="Builder tools">${Object.keys(GROUPS).map(name => `<button data-group="${name}" aria-expanded="false" title="${GROUPS[name].length === 1 ? GROUPS[name][0][2] : ''}">${name}</button>`).join('')}</nav>
      </footer>
    </section>
    <dialog class="city-menu" aria-labelledby="city-menu-title">
      <div class="city-dialog-top"><button data-action="theme">Light</button></div>
      <div class="city-menu-content"><h1 id="city-menu-title" tabindex="-1" autofocus>CITISTEN</h1>
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
  let tutorialStep = 0, tutorialSeen = false, tutorialResumes = false;
  try { tutorialSeen = localStorage.getItem('citisten-tutorial-seen') === '1'; } catch { /* First-play help still works without storage. */ }
  let mode = 'free', selected = 'road', activeGroup = 'Road', hasGame = false, lost = false;
  let lastMapDraw = -Infinity;
  if (matchMedia('(max-width: 600px)').matches) $('.city-map').open = false;
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
    menu.close(); loss.close(); game.hidden = false; hasGame = true;
  }
  function showMenu() {
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
    tutorialResumes = hasGame && !menu.open && !lost;
    if (tutorialResumes) callbacks.onMenu?.();
    tutorialStep = 0; renderTutorial(); tutorial.showModal();
  }
  tutorial.addEventListener('close', () => {
    tutorialSeen = true;
    try { localStorage.setItem('citisten-tutorial-seen', '1'); } catch { /* Dismissal remains session-local without storage. */ }
    if (tutorialResumes) callbacks.onResume?.();
    tutorialResumes = false;
  }, { signal: abort.signal });
  function renderTools() {
    $('.city-tools').hidden = GROUPS[activeGroup].length === 1;
    $('.city-tools').innerHTML = GROUPS[activeGroup].map(([id, label, key]) => `<button data-tool="${id}" aria-label="${label}" aria-pressed="${selected === id}" aria-describedby="city-tooltip-${id}" ${id === 'barricade' ? 'disabled' : ''}>${label}<span class="city-tooltip" id="city-tooltip-${id}" role="tooltip">${key === 'Not available' ? 'Unavailable' : key}</span></button>`).join('');
    root.querySelectorAll('[data-group]').forEach(button => {
      button.setAttribute('aria-expanded', String(button.dataset.group === activeGroup && GROUPS[activeGroup].length > 1));
      button.classList.toggle('is-selected', GROUPS[button.dataset.group].some(([id]) => id === selected));
      button.setAttribute('aria-pressed', String(button.classList.contains('is-selected')));
    });
  }
  function setTool(type) {
    const group = Object.keys(GROUPS).find(name => GROUPS[name].some(([id]) => id === type));
    if (!group || type === 'barricade') return;
    selected = type; activeGroup = group; renderTools();
  }
  function run(action, errorTarget) {
    try {
      setTool('road'); action();
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
    else if (button.dataset.action === 'tutorial-close') { tutorial.close(); }
    else if (button.dataset.action === 'tutorial-next') {
      if (tutorialStep === TUTORIAL.length - 1) tutorial.close();
      else { tutorialStep++; renderTutorial(); }
    } else if (button.dataset.mode) {
      mode = button.dataset.mode;
      if (run(() => callbacks.onStart?.(mode), '.city-menu-error')) { lost = false; showGame(); if (!tutorialSeen) showTutorial(); }
    } else if (button.dataset.action === 'restart') {
      if (run(() => callbacks.onRestart?.(mode), '.city-loss-error')) { lost = false; showGame(); }
    } else if (button.dataset.action === 'menu') { callbacks.onMenu?.(); showMenu(); }
    else if (button.dataset.action === 'resume') { callbacks.onResume?.(); showGame(); }
    else if (button.dataset.group) {
      activeGroup = button.dataset.group; renderTools();
      if (GROUPS[activeGroup].length === 1) { setTool(GROUPS[activeGroup][0][0]); callbacks.onTool?.(selected); }
    } else if (button.dataset.tool) {
      const type = button.dataset.tool;
      setTool(type); callbacks.onTool?.(type);
      $(`[data-tool="${type}"]`).focus();
    }
  }, { signal: abort.signal });
  menu.addEventListener('cancel', event => { event.preventDefault(); if (!$('.city-resume').hidden) { callbacks.onResume?.(); showGame(); } }, { signal: abort.signal });
  loss.addEventListener('cancel', event => event.preventDefault(), { signal: abort.signal });
  // Keep camera/input handlers off management controls without wiring game hotkeys here.
  for (const name of ['pointerdown', 'pointerup', 'wheel', 'keydown', 'keyup']) root.addEventListener(name, event => event.stopPropagation(), { signal: abort.signal });

  function drawMap(state, { roads, size = 200 } = {}) {
    const canvas = $('.city-map canvas'), ctx = canvas.getContext('2d'), scale = canvas.width / size;
    ctx.fillStyle = '#181c1b'; ctx.fillRect(0, 0, 200, 200);
    ctx.strokeStyle = '#343c37'; ctx.lineWidth = 0.5;
    for (let n = 0; n <= size; n += Math.max(1, Math.ceil(size / 40))) {
      const p = n * scale; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 200); ctx.moveTo(0, p); ctx.lineTo(200, p); ctx.stroke();
    }
    ctx.fillStyle = '#777b78';
    if (roads) for (const key of roads.cells) { const cell = roads.cell(key); ctx.fillRect(cell.x * scale, cell.z * scale, Math.max(1, scale), Math.max(1, scale)); }
    const colours = { residential: '#99ad85', commercial: '#829cb5', industrial: '#bda57a' };
    for (const building of state.buildings || []) {
      ctx.fillStyle = colours[building.type] || '#d8ae55';
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
  function update(state, map = {}) {
    mode = state.mode === 'defense' ? 'defense' : 'free';
    text('budget', `$${number(state.budget)}`); text('population', number(state.population));
    for (const name of ['power', 'water']) {
      const utility = state[name] || { demand: 0, supply: 0 };
      text(name, `${number(utility.demand)} / ${number(utility.supply)}`);
      const meter = $(`#city-${name}`); meter.max = Math.max(1, utility.supply, utility.demand); meter.value = Math.max(0, utility.demand);
      meter.setAttribute('aria-valuetext', `${number(utility.demand)} demand, ${number(utility.supply)} supply`);
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
    if (performance.now() - lastMapDraw > 250) { drawMap(state, map); lastMapDraw = performance.now(); }
    if (state.phase !== 'lost') lost = false;
    if (state.phase === 'lost' && !lost) {
      lost = true; menu.close(); text('score', number(state.score)); text('finalPopulation', number(state.peakPopulation)); text('kills', number(state.kills)); loss.showModal();
    }
  }
  function toast(key, message) {
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 8000) return;
    for (const [oldKey, time] of recent) if (now - time >= 8000) recent.delete(oldKey);
    recent.set(key, now);
    const list = $('.city-toasts');
    const limit = matchMedia('(max-width: 600px)').matches ? 1 : 3;
    while (list.querySelectorAll('p').length >= limit) list.querySelector('p').remove();
    const item = document.createElement('p'); item.className = 'panel'; item.textContent = message; list.append(item);
  }
  function events(batch) {
    const messages = new Map();
    for (const event of batch) {
      const message = {
        placed: 'Placed', removed: 'Removed', repaired: 'Repaired',
        blackout: event.active ? 'Blackout' : 'Power restored',
        'wave-warning': 'Nightfall: 1 min',
        wave: `Wave ${number(event.night)} incoming`,
        milestone: `${number(event.population)} residents`,
        'night-survived': 'Night survived'
      }[event.type];
      if (message) messages.set(event.type, message);
    }
    // Put urgent notices last so compact phone feedback keeps the useful warning.
    for (const key of ['placed', 'removed', 'repaired', 'milestone', 'night-survived', 'wave-warning', 'blackout', 'wave']) {
      if (messages.has(key)) toast(`${key}:${messages.get(key)}`, messages.get(key));
    }
  }
  applyTheme(); renderTools(); showMenu();
  return { update, events, setTool, showMenu, showGame, destroy() { abort.abort(); menu.close(); loss.close(); tutorial.close(); root.replaceChildren(); root.classList.remove('citisten-ui'); } };
}
