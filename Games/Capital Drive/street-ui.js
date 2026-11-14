import {WEAPONS,weaponById} from './weapons.js';
// DOM adapter only. World movement, career time and persistence belong to the controller.
export function createStreetUI({ gameplay, progression, simulation, vehicles, notify,
  openDialog, closeDialogs, onVehicleSelected, onRoute, saveCareer, isSandbox,campaign,isCampaign=()=>false,onJobs,interactionHint=()=>null,onWorkout }) {
  const byId = id => document.getElementById(id);
  const cleanups = [];
  const sandbox = () => Boolean(isSandbox());
  const context = () => ({ pose: gameplay.focus(), onFoot: gameplay.state.mode === 'foot',
    vehicle: { ...gameplay.state.vehicle, color: paintColor(gameplay.state.vehicle.color) }, wanted: gameplay.state.wanted,
    vehicleHealth: gameplay.state.vehicleHealth, respawnSerial: gameplay.state.respawnSerial,health:gameplay.state.health,
    weapon:gameplay.state.weapon,reserveAmmo:gameplay.state.reserveAmmo,ammunition:Object.fromEntries(WEAPONS.map(w=>[w.id,gameplay.getAmmo(w.id)])),recovering:!!gameplay.state.recovery,sandbox:sandbox() });
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
    const state = gameplay.state, mission=isCampaign()?campaign?.state.active:null,active = mission||progression.state.activeJob,activity=progression.state.activity;
    text('cash-value', sandbox() ? 'Free roam' : money(progression.state.cash));
    text('health-value', Math.ceil(state.health)); text('car-health-value', Math.ceil(state.vehicleHealth));
    text('wanted-level','★'.repeat(state.wanted)+'☆'.repeat(5-state.wanted));
    const stars=byId('wanted-level');if(stars){stars.setAttribute('aria-label',`Wanted ${state.wanted} of 5 stars`);stars.dataset.pursuit=state.pursuit;}
    text('pursuit-status', sandbox() ? 'No police' : state.pursuit === 'pursuit' ? 'In sight' : state.pursuit === 'search' ? 'Searching' : 'Clear');
    const armed=weaponById(state.weapon);
    text('weapon-label',armed?`${armed.name} · ${state.reloading>0?'reloading':`${state.ammo}/${state.reserveAmmo}`}`:'Fists');
    text('job-title', activity?.name||active?.name||'');
    text('job-description', activity?progression.services.find(s=>s.id===activity.serviceId)?.name:active?.target.label||'');
    const job = active && (mission?campaign.chapters:progression.jobs).find(item => item.id === active.id);
    text('job-progress',mission?`Stage ${mission.stage+1}/${job.stages.length} · ${Math.ceil(mission.remaining)}s`:activity?`${Math.round(activity.progress*100)}%`:active ? `Stage ${active.stage + 1}/${job?.stages.length || 1} · ${Math.ceil(active.remaining)}s · ${money(active.reward)}` : '');
    const jobHud = byId('job-hud'); if (jobHud) jobHud.hidden = sandbox()||(!active&&!activity);
    let hint;
    if (state.mode === 'vehicle') hint = Math.abs(simulation.player.speed) > 1.2 ? 'E stop · WASD drive · Shift boost' : 'E step out · WASD drive';
    else {
      const pose = gameplay.focus();
      const nearby = simulation.nearbyVehicles(pose.x, pose.z, 7).some(car => simulation.hasLineOfSight(pose, car));
      const service=progression.services.find(s=>Math.hypot(s.x-pose.x,s.z-pose.z)<=s.radius&&progression.canUseService(s,context()));
      hint=state.carjacking?`Taking vehicle · ${Math.round(state.carjacking.progress*100)}%`:activity?`${activity.name} · stay nearby`:service?`E ${service.name}`:`${nearby?'E enter car · ':''}WASD walk · Shift sprint`;
    }
    if(state.mode==='vehicle'&&state.vehicleHealth<=0)hint='Vehicle disabled · E to step out';
    text('interaction-hint', interactionHint()||hint);
    const recovery=state.recovery,screen=byId('recovery-screen');
    if(screen){screen.hidden=!recovery;if(recovery){
      screen.style.backgroundColor=`rgba(10,15,18,${recovery.phase==='out'?Math.min(.96,recovery.elapsed/1.8):Math.max(.12,.96-(recovery.elapsed-1.8)*.5)})`;
      text('recovery-title',recovery.reason==='arrest'?'BUSTED':'HOSPITAL');
      text('recovery-status',recovery.phase==='out'?'Transferring…':'Recovering. Completed jobs kept.');
    }}
  }
  function renderServices(){
    const container=byId('services-list');if(!container)return;container.replaceChildren();
    const ctx=context();
    const filter=byId('services-filter')?.value||'all';
    for(const site of [...progression.services].filter(site=>filter==='all'||site.type===filter).sort((a,b)=>Math.hypot(a.x-ctx.pose.x,a.z-ctx.pose.z)-Math.hypot(b.x-ctx.pose.x,b.z-ctx.pose.z))){
      const entry=document.createElement('article');entry.className='job-option';entry.dataset.serviceId=site.id;
      const title=document.createElement('h3');title.textContent=site.name;
      const detail=document.createElement('p');detail.textContent=`${site.road} · ${Math.round(Math.hypot(ctx.pose.x-site.x,ctx.pose.z-site.z))} m`;
      const row=document.createElement('div');row.className='button-row service-actions';
      const route=actionButton('Route',()=>{onRoute(site);closeDialogs();});route.dataset.serviceRoute=site.id;row.append(route);
      const available=!sandbox()&&ctx.onFoot&&!ctx.recovering&&Math.hypot(ctx.pose.x-site.x,ctx.pose.z-site.z)<=site.radius&&!progression.state.activity&&progression.canUseService(site,ctx);
      const reason=sandbox()?'Purchases are available in Street Life and Campaign.':ctx.recovering?'Recover before trading.':!ctx.onFoot?'Step out of your vehicle to trade.':ctx.wanted>0?'Lose your wanted stars before trading.':progression.state.activity?'Finish your current activity first.':Math.hypot(ctx.pose.x-site.x,ctx.pose.z-site.z)>site.radius?'Follow the route and move closer to this location.':!progression.canUseService(site,ctx)?(site.dealer?'This contact is not trading right now.':'Enter the shop and approach its counter.') :'';
      const status=document.createElement('p');status.className='service-state';status.textContent=reason||`Ready to trade · Cash ${money(progression.state.cash)}`;
      const purchase=(label,item,cost,blocked='')=>{
        const why=reason||blocked||(progression.state.cash<cost?'Not enough cash.':'');
        const b=actionButton(label,()=>{
          const r=progression.purchaseService(site.id,item,context());
          if(r.ok){if(r.heal)gameplay.heal(r.heal);if(r.ammo)gameplay.addAmmo(r.ammo,r.weaponId);if(r.weaponId&&item!== 'ammo'&&!item.startsWith('ammo:'))gameplay.setWeapon(r.weaponId);}
          feedback(r,true);renderServices();
        });b.dataset.serviceItem=item;b.dataset.reason=why;b.title=why;b.disabled=!!why;
        if(blocked||(!reason&&progression.state.cash<cost)){const note=document.createElement('small');note.textContent=blocked||'Not enough cash';b.append(document.createElement('br'),note);}
        row.append(b);
      };
      const activity=(label,type,blocked=false)=>{
        const b=actionButton(label,()=>{const r=feedback(progression.startActivity(site.id,type,context()));if(r.ok)closeDialogs();else renderServices();});
        b.dataset.serviceActivity=type;b.disabled=!available||!!progression.state.activeJob||blocked;b.dataset.reason=!available?reason:progression.state.activeJob?'Finish your active job first.':blocked?(progression.state.robberyCooldowns[site.id]>0?'The till is recovering.':'Equip an owned firearm first.'):'';b.title=b.dataset.reason;row.append(b);
      };
      if(site.type==='food'||site.type==='retail'){
        if(site.type==='food')purchase(`Food ${money(site.price)} · +${site.heal} health`,'food',site.price,ctx.health>=100?'Health is full.':'');
        activity('Rob till','robbery',!weaponById(ctx.weapon)||!progression.state.equipment[ctx.weapon]||progression.state.robberyCooldowns[site.id]>0);
      }else if(site.type==='gym'){
        const price=site.price*(progression.state.fitnessLevel+1);
        detail.textContent+=` · Fitness ${progression.state.fitnessLevel}/3`;
        const train=actionButton('Use the bench',()=>onWorkout?.());train.disabled=sandbox()||!available||ctx.wanted>0;row.append(train);
      }else{
        row.classList.add('weapon-stock');
        for(const weapon of WEAPONS.filter(w=>!site.weaponIds||site.weaponIds.includes(w.id))){
          const owned=!!progression.state.equipment[weapon.id],reserve=ctx.ammunition[weapon.id].reserveAmmo,multiplier=site.priceMultiplier||1;
          purchase(`${weapon.name} ${money(Math.ceil(weapon.price*multiplier))}`,weapon.id,Math.ceil(weapon.price*multiplier),owned?'Owned':'');
          const cap=weapon.id==='pistol'?120:weapon.reserveCap;
          purchase(`${weapon.ammoPack} ${weapon.name} rounds ${money(Math.ceil(weapon.ammoPrice*multiplier))}`,`ammo:${weapon.id}`,Math.ceil(weapon.ammoPrice*multiplier),!owned?'Buy this weapon first':reserve>cap-weapon.ammoPack?'No room for this ammo pack':'');
        }
      }
      if(site.dealer){const tag=document.createElement('span');tag.className='eyebrow';tag.textContent='Street contact';entry.append(tag);}
      entry.append(title,detail,status,row);container.append(entry);
    }
  }
  listen('services-filter','change',renderServices);
  listen('services-button','click',()=>{renderServices();openDialog('services-dialog');});
  listen('pause-services-button','click',()=>{renderServices();openDialog('services-dialog');});
  listen('jobs-button', 'click', () => { if(onJobs)onJobs();else{renderJobs();openDialog('jobs-dialog');} });
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
  return { refresh, renderJobs, renderGarage,renderServices, dispose() { cleanups.splice(0).forEach(cleanup => cleanup());
    byId('jobs-list')?.replaceChildren(); byId('car-options')?.replaceChildren(); } };
}
