import {SERVICES,LEGACY_SHOP_IDS} from './services.js';
// Fictional job markers beside the mapped roads; these are not real businesses.
const CARS = [
  { id: 'lantern', name: 'Neighbourhood saloon', price: 0 },
  { id: 'orchard', name: 'Family wagon', price: 1400 },
  { id: 'gravel', name: 'Suburban SUV', price: 2200 },
  { id: 'relay', name: 'Executive tourer', price: 3200 },
  { id: 'atlas', name: 'Weekend ute', price: 2600 },
];
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_CASH = 1000000000;
const copy = value => JSON.parse(JSON.stringify(value));
const near = (a, b, radius = 17) => a && Math.hypot(a.x - b.x, a.z - b.z) <= radius;
const point = (x, z, label) => ({ x, z, label });
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));

export function createProgression(map, saved = null, options = {}) {
  if (!map || !object(map.spawn) || !Number.isFinite(map.spawn.x) || !Number.isFinite(map.spawn.z)) throw new Error('Career requires a mapped spawn.');
  const pickup = point(map.spawn.x, map.spawn.z, 'Crescent parcel pickup');
  const drop = point(-322.32, -348.02, 'Crescent parcel drop');
  const south = point(-331.37, -500.48, 'Crescent south checkpoint');
  const north = point(-167.19, -230.97, 'Crescent north checkpoint');
  const garage = { ...point(-349.73, -422.16, 'Crescent garage'), name: 'Crescent garage', radius: 27,
    vehicles: copy(CARS), repairCost: 180, paintCost: 120, storeCost: 60 };
  const jobs = [
    { id: 'crescent-parcel', name: 'Crescent parcel', type: 'delivery', reward: 300, time: 100, requires: [], stages: [pickup, drop] },
    { id: 'crescent-circuit', name: 'Crescent checkpoint run', type: 'race', reward: 550, time: 100, requires: ['crescent-parcel'], stages: [pickup, north, south, pickup] },
    { id: 'wagon-recovery', name: 'Wagon theft', type: 'theft', reward: 750, time: 180, requires: ['crescent-parcel'], modelId: 'orchard', stages: [point(-298, -325.27, 'Acquire a stolen family wagon'), garage] },
    { id: 'clear-the-search', name: 'Lose the search', type: 'getaway', reward: 650, time: 180, requires: ['crescent-parcel'], stages: [pickup, south], clearSeconds: 8 },
    { id: 'priority-parcel', name: 'Priority parcel', type: 'delivery', reward: 1000, time: 110, requires: ['crescent-circuit', 'wagon-recovery'], stages: [south, north] },
  ];
  const state = { cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [], activeJob: null,
    equipment:{pistol:false},fitnessLevel:0,robberyCooldowns:{},activity:null,message: 'Career ready. Take the Crescent parcel job.' };
  if (saved !== null) {
    if (!object(saved) || !exactKeys(saved, ['version', 'cash', 'ownedVehicles', 'completedJobs','equipment','fitnessLevel','robberyCooldowns']) || saved.version !== 1 || !Number.isSafeInteger(saved.cash) || saved.cash < 0 || saved.cash > MAX_CASH || !Array.isArray(saved.ownedVehicles) || saved.ownedVehicles.length < 1 || saved.ownedVehicles.length > CARS.length || !Array.isArray(saved.completedJobs) || saved.completedJobs.length > jobs.length) throw new Error('Unsupported or corrupt career save.');
    if(saved.equipment!==undefined&&(!object(saved.equipment)||!exactKeys(saved.equipment,['pistol'])||typeof saved.equipment.pistol!=='boolean'))throw new Error('Invalid saved equipment.');
    if(saved.fitnessLevel!==undefined&&(!Number.isInteger(saved.fitnessLevel)||saved.fitnessLevel<0||saved.fitnessLevel>3))throw new Error('Invalid saved fitness.');
    if(saved.robberyCooldowns!==undefined&&(!object(saved.robberyCooldowns)||!exactKeys(saved.robberyCooldowns,[...SERVICES.filter(s=>s.robbery).map(s=>s.id),...LEGACY_SHOP_IDS])||Object.values(saved.robberyCooldowns).some(v=>!Number.isFinite(v)||v<0||v>180)))throw new Error('Invalid saved shop cooldown.');
    const ids = new Set();
    for (const car of saved.ownedVehicles) {
      if (!object(car) || !exactKeys(car, ['id', 'color', 'health', 'stored']) || !CARS.some(item => item.id === car.id) || ids.has(car.id) || !COLOR.test(car.color) || !Number.isFinite(car.health) || car.health < 0 || car.health > 100 || typeof car.stored !== 'boolean') throw new Error('Invalid saved garage.');
      ids.add(car.id);
    }
    if (!ids.has('lantern') || new Set(saved.completedJobs).size !== saved.completedJobs.length || saved.completedJobs.some(id => !jobs.some(job => job.id === id)) || saved.completedJobs.some(id => jobs.find(job => job.id === id).requires.some(required => !saved.completedJobs.includes(required)))) throw new Error('Invalid saved career progress.');
    state.cash = saved.cash;
    state.ownedVehicles = copy(saved.ownedVehicles);
    state.completedJobs = [...saved.completedJobs];
    state.equipment=copy(saved.equipment||{pistol:false});state.fitnessLevel=saved.fitnessLevel||0;state.robberyCooldowns=copy(saved.robberyCooldowns||{});
  }
  const serviceSite = source => source && ({ ...source, ...(options.servicePosition?.(source) || {}) });
  const serviceAllowed = (site, ctx) => !options.canUseService || options.canUseService(site, ctx);
  const events = [];
  let context = null, serial = null;
  function result(ok, message, extra = {}, type = ok ? 'change' : 'error') {
    state.message = message;
    events.push({ type, message, ...extra });
    return { ok, message, ...extra };
  }
  function fail(message) { state.activeJob = null; return result(false, message, {}, 'job-failed'); }
  function validContext(ctx) {
    return object(ctx) && object(ctx.pose) && Number.isFinite(ctx.pose.x) && Number.isFinite(ctx.pose.z) && typeof ctx.onFoot === 'boolean' && Number.isFinite(ctx.wanted) && ctx.wanted >= 0 && ctx.wanted <= 5 && Number.isFinite(ctx.vehicleHealth) && Number.isSafeInteger(ctx.respawnSerial) && ctx.respawnSerial >= 0;
  }
  function remember(ctx) {
    if (!validContext(ctx)) return false;
    context = copy(ctx);
    return true;
  }
  function atGarage() { return context && near(context.pose, garage, garage.radius); }
  function spend(amount) {
    if (state.cash < amount) return false;
    state.cash -= amount;
    return true;
  }
  function currentOwned(id) { return state.ownedVehicles.find(car => car.id === id); }
  function garageGuard() {
    if (!atGarage()) return result(false, 'Visit the Crescent garage first.');
    if (context.wanted > 0) return result(false, 'Lose the police before using the garage.');
    return null;
  }
  function startJob(id, ctx) {
    if (!remember(ctx)) return result(false, 'A valid player position is required.');
    if (state.activeJob||state.activity) return result(false, 'Finish or cancel the current activity first.');
    const job = jobs.find(item => item.id === id);
    if (!job) return result(false, 'Unknown job.');
    if (job.requires.some(required => !state.completedJobs.includes(required))) return result(false, 'Complete the earlier jobs to unlock this job.');
    serial = ctx.respawnSerial;
    state.activeJob = { id, type: job.type, name: job.name, stage: 0, target: copy(job.stages[0]), remaining: job.time, reward: job.reward, elapsed: 0, clearTime: 0, sawWanted: ctx.wanted > 0 };
    return result(true, `Started ${job.name}. Reach ${state.activeJob.target.label}.`, { jobId: id }, 'job-started');
  }
  function advance(job, active) {
    active.stage++;
    active.target = copy(job.stages[active.stage]);
    result(true, `Next: ${active.target.label}.`, { jobId: job.id, stage: active.stage }, 'job-stage');
  }
  function complete(job) {
    if (!state.completedJobs.includes(job.id)) state.completedJobs.push(job.id);
    state.cash = Math.min(MAX_CASH, state.cash + job.reward);
    state.activeJob = null;
    result(true, `${job.name} complete. Earned $${job.reward}.`, { jobId: job.id, reward: job.reward }, 'job-complete');
  }
  function update(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Career dt must be finite and nonnegative.');
    if (!remember(ctx)) return;
    if (dt === 0) return;
    for(const id of Object.keys(state.robberyCooldowns))state.robberyCooldowns[id]=Math.max(0,state.robberyCooldowns[id]-Math.min(dt,.25));
    const activity=state.activity;
    if(activity){
      const site=serviceSite(SERVICES.find(s=>s.id===activity.serviceId));
      if(ctx.respawnSerial!==activity.respawnSerial||ctx.recovering||!ctx.onFoot||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx)||
        (activity.type==='robbery'?ctx.weapon!=='pistol':ctx.wanted>0)){
        state.activity=null;result(false,'Activity interrupted.',{},'activity-ended');
      }else{
        activity.elapsed=Math.min(activity.duration,activity.elapsed+Math.min(dt,.05));activity.progress=activity.elapsed/activity.duration;
        if(activity.elapsed>=activity.duration){
          state.activity=null;
          if(activity.type==='robbery'){
            state.cash=Math.min(MAX_CASH,state.cash+site.robbery);state.robberyCooldowns[site.id]=180;
            result(true,`Took $${site.robbery}. Leave the area.`,{reward:site.robbery,serviceId:site.id},'robbery-complete');
          }else if(state.cash>=activity.cost){
            state.cash-=activity.cost;state.fitnessLevel=Math.min(3,state.fitnessLevel+1);
            result(true,`Fitness ${state.fitnessLevel}/3. Sprint improved.`,{cost:activity.cost},'workout-complete');
          }else result(false,'Not enough cash for training.',{},'activity-ended');
        }
      }
    }
    if (serial !== null && serial !== ctx.respawnSerial && state.activeJob) { serial = ctx.respawnSerial; fail('Job ended after respawn.'); return; }
    serial = ctx.respawnSerial;
    const active = state.activeJob;
    if (!active) return;
    const job = jobs.find(item => item.id === active.id);
    active.elapsed += dt;
    active.remaining = Math.max(0, active.remaining - dt);
    if (active.remaining === 0) { fail('Job time expired.'); return; }
    const driving = !ctx.onFoot && object(ctx.vehicle) && ctx.vehicleHealth > 0;
    if (job.type === 'theft') {
      if (active.stage === 0) {
        if (driving && ctx.vehicle.modelId === job.modelId && ctx.vehicle.stolen === true && near(ctx.pose, active.target)) advance(job, active);
      } else if (driving && ctx.vehicle.modelId === job.modelId && ctx.vehicle.stolen === true && ctx.wanted === 0 && near(ctx.pose, active.target)) complete(job);
    } else if (job.type === 'getaway') {
      active.sawWanted ||= ctx.wanted > 0;
      if (active.stage === 0 && active.sawWanted && driving && near(ctx.pose, active.target)) advance(job, active);
      else if (active.stage === 1) {
        active.clearTime = ctx.wanted === 0 && driving && near(ctx.pose, active.target) ? active.clearTime + dt : 0;
        if (active.clearTime >= job.clearSeconds) complete(job);
      }
    } else if (driving && near(ctx.pose, active.target)) {
      if (active.stage < job.stages.length - 1) advance(job, active);
      else if (active.elapsed >= 2) complete(job);
    }
  }
  function buyVehicle(id) {
    const blocked = garageGuard(); if (blocked) return blocked;
    const car = CARS.find(item => item.id === id);
    if (!car || currentOwned(id)) return result(false, 'Vehicle unknown or already owned.');
    if (!spend(car.price)) return result(false, 'Not enough cash to buy this vehicle.');
    rememberOwnedVehicle();
    const owned = { id, color: '#e7e6df', health: 100, stored: true };
    state.ownedVehicles.push(owned);
    return result(true, `${car.name} purchased and stored.`, { vehicle: copy(owned), cost: car.price });
  }
  function repairVehicle() {
    const blocked = garageGuard(); if (blocked) return blocked;
    const car = !context.onFoot && currentOwned(context.vehicle?.modelId);
    if (!car || context.vehicle.stolen) return result(false, 'Bring an owned vehicle to repair.');
    if (context.vehicleHealth >= 100) return result(false, 'This vehicle does not need repairs.');
    if (!spend(garage.repairCost)) return result(false, 'Not enough cash for repairs.');
    car.health = 100; context.vehicleHealth = 100;
    return result(true, 'Vehicle repaired.', { vehicleHealth: 100, cost: garage.repairCost });
  }
  function paintVehicle(id, color) {
    const blocked = garageGuard(); if (blocked) return blocked;
    const car = currentOwned(id);
    if (!car || !COLOR.test(color)) return result(false, 'Choose an owned vehicle and a six-digit paint colour.');
    if (car.color.toLowerCase() === color.toLowerCase()) return result(false, 'This paint is already fitted.');
    if (!car.stored && (context.onFoot || context.vehicle?.modelId !== id || context.vehicle?.stolen)) return result(false, 'Bring this vehicle to the garage first.');
    if (!spend(garage.paintCost)) return result(false, 'Not enough cash for paint.');
    car.color = color.toLowerCase();
    return result(true, 'Paint applied.', { vehicle: copy(car), color: car.color, cost: garage.paintCost });
  }
  function storeVehicle(vehicle) {
    const blocked = garageGuard(); if (blocked) return blocked;
    const car = vehicle && currentOwned(vehicle.modelId ?? vehicle.id);
    if (!car || vehicle.stolen || context.onFoot || context.vehicle?.modelId !== car.id || context.vehicle?.stolen) return result(false, 'Only the owned vehicle you brought can be stored.');
    if (car.stored) return result(false, 'Vehicle is already stored.');
    if (!spend(garage.storeCost)) return result(false, 'Not enough cash to store the vehicle.');
    car.stored = true;
    car.health = Math.max(0, Math.min(100, context.vehicleHealth));
    if (COLOR.test(context.vehicle.color)) car.color = context.vehicle.color.toLowerCase();
    return result(true, 'Vehicle stored. Retrieve it here through the garage.', { vehicle: copy(car), cost: garage.storeCost });
  }
  function rememberOwnedVehicle() {
    const live = currentOwned(context.vehicle?.modelId);
    if (live && !context.vehicle.stolen) {
      live.health = Math.max(0, Math.min(100, context.vehicleHealth));
      const color = context.vehicle.color;
      if (COLOR.test(color)) live.color = color.toLowerCase();
      else if (Number.isInteger(color) && color >= 0 && color <= 0xffffff) live.color = `#${color.toString(16).padStart(6, '0')}`;
    }
  }
  function retrieveVehicle(id) {
    const blocked = garageGuard(); if (blocked) return blocked;
    const car = currentOwned(id);
    if (!car) return result(false, 'Only an owned vehicle can be retrieved.');
    rememberOwnedVehicle();
    car.stored = false;
    return result(true, 'Owned vehicle retrieved at the garage.', { vehicle: copy(car) });
  }
  function penalize(reason = 'Respawn') {
    state.activeJob = null;state.activity=null;
    const cost = Math.min(250, state.cash); state.cash -= cost;
    return result(true, `${reason}: $${cost} deducted. Completed jobs kept.`, { cost }, 'penalty');
  }
  function clearApproach(site,ctx){return !options.hasLineOfSight||options.hasLineOfSight(ctx.pose,{x:site.x,z:site.z});}
  function serviceGuard(id,ctx,{allowWanted=false}={}){
    if(!remember(ctx)||ctx.sandbox||ctx.recovering)return result(false,'Activity unavailable.');
    const site=serviceSite(SERVICES.find(s=>s.id===id));
    if(!site||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx))return result(false,'Visit this storefront first.');
    if(!ctx.onFoot)return result(false,'Step out of the car first.');
    if(state.activity)return result(false,'Finish the current activity first.');
    if(!allowWanted&&ctx.wanted>0)return result(false,'Lose the police first.');
    return site;
  }
  function purchaseService(id,item,ctx){
    const site=serviceGuard(id,ctx);if(!site.id)return site;
    let cost,effect;
    if(site.type==='food'&&item==='food'){
      if(!Number.isFinite(ctx.health)||ctx.health>=100)return result(false,'Health is already full.');
      cost=site.price;effect={heal:site.heal};
    }else if(site.type==='arms'&&item==='pistol'){
      if(state.equipment.pistol)return result(false,'You already own a pistol.');
      cost=site.price;effect={pistol:true,ammo:24};
    }else if(site.type==='arms'&&item==='ammo'){
      if(!state.equipment.pistol||!Number.isFinite(ctx.reserveAmmo)||ctx.reserveAmmo>96)return result(false,'Ammo unavailable.');
      cost=site.ammoPrice;effect={ammo:24};
    }else return result(false,'Unknown purchase.');
    if(!spend(cost))return result(false,'Not enough cash.');
    if(effect.pistol)state.equipment.pistol=true;
    return result(true,'Purchased.',{cost,...effect},'service-purchase');
  }
  function startActivity(id,type,ctx){
    const site=serviceGuard(id,ctx,{allowWanted:type==='robbery'});if(!site.id)return site;
    if(state.activeJob)return result(false,'Finish or cancel the job first.');
    if(type==='robbery'){
      if(!site.robbery||!state.equipment.pistol||ctx.weapon!=='pistol')return result(false,'Equip a pistol to threaten the till.');
      if(state.robberyCooldowns[id]>0)return result(false,'The till is empty.');
    }else if(type==='workout'){
      if(site.type!=='gym'||state.fitnessLevel>=3)return result(false,'Training complete.');
      if(state.cash<site.price*(state.fitnessLevel+1))return result(false,'Not enough cash.');
    }else return result(false,'Unknown activity.');
    state.activity={type,serviceId:id,name:type==='robbery'?'Taking the till':'Training',elapsed:0,duration:type==='robbery'?4:8,progress:0,
      cost:type==='workout'?site.price*(state.fitnessLevel+1):0,respawnSerial:ctx.respawnSerial};
    return result(true,type==='robbery'?'Stay near the till.':'Training started.',{serviceId:id,point:{x:site.x,z:site.z}},type+'-started');
  }
  return { state, jobs, garage,get services(){return SERVICES.map(serviceSite);},canUseService:serviceAllowed, startJob, update, buyVehicle, repairVehicle, paintVehicle, storeVehicle, retrieveVehicle, penalize,purchaseService,startActivity,
    cancelActivity(){if(!state.activity)return false;state.activity=null;return true;},
    cancelJob() { if (!state.activeJob) return result(false, 'No active job.'); state.activeJob = null; return result(true, 'Job cancelled.', {}, 'job-cancelled'); },
    serialize() { return copy({ version: 1, cash: state.cash, ownedVehicles: state.ownedVehicles, completedJobs: state.completedJobs,equipment:state.equipment,fitnessLevel:state.fitnessLevel,robberyCooldowns:state.robberyCooldowns }); },
    drainEvents() { return events.splice(0); },
  };
}
