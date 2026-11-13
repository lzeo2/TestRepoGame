// DOM adapter only. World movement, career time and persistence belong to the controller.
export function createStreetUI({ gameplay, progression, simulation, vehicles, notify,
  openDialog, closeDialogs, onVehicleSelected, onRoute, saveCareer, isSandbox }) {
  const byId = id => document.getElementById(id);
  const cleanups = [];
  const sandbox = () => Boolean(isSandbox());
  const context = () => ({ pose: gameplay.focus(), onFoot: gameplay.state.mode === 'foot',
    vehicle: { ...gameplay.state.vehicle, color: paintColor(gameplay.state.vehicle.color) }, wanted: gameplay.state.wanted,
    vehicleHealth: gameplay.state.vehicleHealth, respawnSerial: gameplay.state.respawnSerial });
  const remember = () => progression.update(0, context());
  const money = value => `$${Math.round(value).toLocaleString('en-AU')}`;
  const paintColor = value => typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value;
  function text(id, value) { const element = byId(id); if (element && element.textContent !== String(value)) element.textContent = value; }
  function listen(id, type, handler) {
    const element = byId(id); if (!element) return;
    element.addEventListener(type, handler); cleanups.push(() => element.removeEventListener(type, handler));
  }
  function feedback(result, economic = false) {
    if (result?.message) notify(result.message);
    if (result?.ok && economic && !sandbox()) saveCareer();
    refresh(); return result;
  }
  function garageGuard() {
    if (sandbox()) return null;
    const pose = gameplay.focus(), garage = progression.garage;
    if (Math.hypot(pose.x - garage.x, pose.z - garage.z) > garage.radius) return { ok: false, message: 'Visit the garage.' };
    if (gameplay.state.wanted > 0) return { ok: false, message: 'Lose the police before using the garage.' };
    return null;
  }
  function selectVehicle(vehicle) {
    onVehicleSelected({ modelId: vehicle.modelId || vehicle.id, color: vehicle.color,
      health: vehicle.health ?? 100, stolen: false });
    syncPaint();
  }
  function syncPaint() {
    const select = byId('paint'); if (!select) return;
    const color = paintColor(gameplay.state.vehicle.color);
    if ([...select.options].some(option => option.value.toLowerCase() === color?.toLowerCase())) select.value = color.toLowerCase();
  }
  function actionButton(label, handler) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', handler); return button;
  }
  function renderJobs() {
    const container = byId('jobs-list'); if (!container) return;
    container.replaceChildren();
    for (const job of progression.jobs) {
      const entry = document.createElement('article'); entry.className = 'job-option';
      const title = document.createElement('h3'); title.textContent = job.name;
      const detail = document.createElement('p'); detail.textContent = `${job.type} · ${money(job.reward)} · ${job.time} seconds`;
      const unmet = job.requires.filter(id => !progression.state.completedJobs.includes(id));
      const active = progression.state.activeJob;
      const button = actionButton(active?.id === job.id ? 'Job active' : 'Start job', () => {
        if (sandbox()) { feedback({ ok: false, message: 'Jobs are available in Street Life.' }); return; }
        const result = feedback(progression.startJob(job.id, context()));
        if (result.ok) { onRoute(progression.state.activeJob.target); closeDialogs(); }
        renderJobs();
      });
      button.disabled = sandbox() || unmet.length > 0 || Boolean(active);
      entry.append(title, detail);
      if (unmet.length) {
        const locked = document.createElement('p');
        locked.textContent = `Unlock by completing: ${unmet.map(id => progression.jobs.find(item => item.id === id)?.name || id).join(', ')}.`;
        entry.append(locked);
      } else if (progression.state.completedJobs.includes(job.id)) {
        const completed = document.createElement('p'); completed.textContent = 'Completed in your career.'; entry.append(completed);
      }
      entry.append(button); container.append(entry);
    }
    const cancel = byId('cancel-job-button'); if (cancel) cancel.disabled = !progression.state.activeJob;
  }
  function renderGarage() {
    const container = byId('car-options'); if (!container) return;
    container.replaceChildren();
    for (const vehicle of vehicles) {
      const offer = progression.garage.vehicles.find(car => car.id === vehicle.id);
      const owned = progression.state.ownedVehicles.find(car => car.id === vehicle.id);
      if (!sandbox() && !offer && !owned) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'car-option';
      button.dataset.car = vehicle.id;
      button.setAttribute('aria-pressed', String(gameplay.state.vehicle.modelId === vehicle.id));
      const title = document.createElement('strong'); title.textContent = vehicle.name;
      const note = document.createElement('span'); note.textContent = vehicle.note || vehicle.label || '';
      const status = document.createElement('span'); status.textContent = sandbox() ? 'Drive free' : owned ? 'Retrieve owned vehicle' : `Buy · ${money(offer.price)}`;
      button.append(title, note, status);
      button.addEventListener('click', () => {
        const blocked = garageGuard(); if (blocked) { feedback(blocked); return; }
        if (sandbox()) {
          selectVehicle({ modelId: vehicle.id, color: byId('paint')?.value || '#e7e6df', health: 100 });
          feedback({ ok: true, message: `${vehicle.name} selected.` }); renderGarage(); return;
        }
        remember();
        const currentOwned = progression.state.ownedVehicles.find(car => car.id === vehicle.id);
        let result;
        if (!currentOwned) result = progression.buyVehicle(vehicle.id);
        else if (typeof progression.retrieveVehicle === 'function') result = progression.retrieveVehicle(vehicle.id);
        else {
          const current = gameplay.state.vehicle.modelId === vehicle.id;
          result = { ok: true, message: `${vehicle.name} retrieved.`, vehicle: { ...currentOwned,
            health: current ? gameplay.state.vehicleHealth : currentOwned.health,
            color: current ? paintColor(gameplay.state.vehicle.color) : currentOwned.color } };
        }
        if (result.ok && result.vehicle) selectVehicle(result.vehicle);
        feedback(result, true); renderGarage();
      });
      container.append(button);
    }
    syncPaint();
    text('garage-description', sandbox() ? 'Choose any original fictional vehicle and paint.' : `Visit ${progression.garage.name} to buy, retrieve, repair, store or paint a vehicle.`);
  }
  function refresh() {
    const state = gameplay.state, active = progression.state.activeJob;
    text('cash-value', sandbox() ? 'Free roam' : money(progression.state.cash));
    text('health-value', Math.ceil(state.health)); text('car-health-value', Math.ceil(state.vehicleHealth));
    text('wanted-level', sandbox() ? 'Free roam' : `${state.wanted}/5`);
    text('pursuit-status', sandbox() ? 'No police' : state.pursuit === 'pursuit' ? 'In sight' : state.pursuit === 'search' ? 'Searching' : 'Clear');
    text('weapon-label', state.weapon === 'pistol' ? state.reloading > 0 ? 'Pistol · reloading' : `Pistol · ${state.ammo}/${state.reserveAmmo}` : 'Fists');
    text('job-title', active?.name || 'Street Life');
    text('job-description', active ? active.target.label : 'Open Jobs to choose a delivery, race, theft or getaway.');
    const job = active && progression.jobs.find(item => item.id === active.id);
    text('job-progress', active ? `Stage ${active.stage + 1}/${job?.stages.length || 1} · ${Math.ceil(active.remaining)}s · ${money(active.reward)}` : 'No active job');
    const jobHud = byId('job-hud'); if (jobHud) jobHud.hidden = sandbox();
    let hint;
    if (state.mode === 'vehicle') hint = Math.abs(simulation.player.speed) > 1.2 ? 'E stop · WASD drive · Shift boost' : 'E step out · WASD drive';
    else {
      const pose = gameplay.focus();
      const nearby = simulation.nearbyVehicles(pose.x, pose.z, 7).some(car => simulation.hasLineOfSight(pose, car));
      hint = `${nearby ? 'E enter car · ' : ''}WASD walk · Shift sprint · Space jump · 1 fists · 2 pistol`;
    }
    text('interaction-hint', hint);
  }
  listen('jobs-button', 'click', () => { renderJobs(); openDialog('jobs-dialog'); });
  listen('garage-button', 'click', () => { renderGarage(); openDialog('garage-dialog'); });
  listen('cancel-job-button', 'click', () => { feedback(progression.cancelJob()); renderJobs(); });
  listen('garage-route-button', 'click', () => { onRoute(progression.garage); closeDialogs(); });
  listen('repair-car-button', 'click', () => {
    const blocked = garageGuard(); if (blocked) { feedback(blocked); return; }
    if (sandbox()) { gameplay.state.vehicleHealth = 100; feedback({ ok: true, message: 'Vehicle repaired.' }); return; }
    remember(); const result = progression.repairVehicle();
    if (result.ok) gameplay.state.vehicleHealth = result.vehicleHealth ?? 100;
    feedback(result, true); renderGarage();
  });
  listen('store-car-button', 'click', () => {
    const blocked = garageGuard(); if (blocked) { feedback(blocked); return; }
    if (sandbox()) { feedback({ ok: false, message: 'Switch to Street Life to keep a career garage.' }); return; }
    remember(); feedback(progression.storeVehicle(gameplay.state.vehicle), true); renderGarage();
  });
  listen('paint', 'change', () => {
    const select = byId('paint'), previous = paintColor(gameplay.state.vehicle.color), color = select.value;
    const blocked = garageGuard(); if (blocked) { select.value = previous; feedback(blocked); return; }
    let result;
    if (sandbox()) result = { ok: true, message: 'Paint applied.', color };
    else if (gameplay.state.mode === 'foot' || gameplay.state.vehicle.stolen) result = { ok: false, message: 'Bring an owned vehicle to paint.' };
    else { remember(); result = progression.paintVehicle(gameplay.state.vehicle.modelId, color); }
    if (result.ok) selectVehicle({ modelId: gameplay.state.vehicle.modelId, color: result.color || color, health: gameplay.state.vehicleHealth });
    else select.value = previous;
    feedback(result, true);
  });
  refresh();
  return { refresh, renderJobs, renderGarage, dispose() { cleanups.splice(0).forEach(cleanup => cleanup());
    byId('jobs-list')?.replaceChildren(); byId('car-options')?.replaceChildren(); } };
}
