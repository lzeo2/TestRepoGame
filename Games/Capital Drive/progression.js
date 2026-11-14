import {SERVICES,LEGACY_SHOP_IDS} from './services.js';
import {WEAPON_IDS,weaponById} from './weapons.js';
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
const RIDE_MODELS = ['lantern', 'orchard', 'gravel', 'relay'];
const RIDE_STOP_SECONDS = 2;
const RIDE_STOP_SPEED = .8;
const copy = value => JSON.parse(JSON.stringify(value));
const near = (a, b, radius = 17) => a && Math.hypot(a.x - b.x, a.z - b.z) <= radius;
const point = (x, z, label) => ({ x, z, label });
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));

export function createProgression(map, saved = null, options = {}) {
  if (!map || !object(map.spawn) || !Number.isFinite(map.spawn.x) || !Number.isFinite(map.spawn.z)) throw new Error('Career requires a mapped spawn.');
  const extraServices=options.extraServices??[];
  if(!Array.isArray(extraServices))throw new Error('Invalid extra services.');
  const serviceIds=new Set(SERVICES.map(site=>site.id));
  for(const site of extraServices){
    if(!object(site)||typeof site.id!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(site.id)||serviceIds.has(site.id)||
      site.type!=='arms'||site.dealer!==true||typeof site.name!=='string'||!site.name.trim()||typeof site.road!=='string'||!site.road.trim()||
      !Number.isFinite(site.x)||!Number.isFinite(site.z)||!Number.isFinite(site.radius)||site.radius<=0||
      (site.priceMultiplier!==undefined&&(!Number.isFinite(site.priceMultiplier)||site.priceMultiplier<=0))||
      (site.weaponIds!==undefined&&(!Array.isArray(site.weaponIds)||new Set(site.weaponIds).size!==site.weaponIds.length||site.weaponIds.some(id=>!WEAPON_IDS.includes(id)))))throw new Error('Invalid extra service.');
    serviceIds.add(site.id);
  }
  const services=[...SERVICES,...extraServices.map(site=>({...site,...(site.weaponIds?{weaponIds:Object.freeze([...site.weaponIds])}:{})}))];
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
    // Public road pickup/drop markers, using vertices from the pinned Canberra map.
    { id: 'franklin-delivery', name: 'Franklin Street delivery', type: 'delivery', legitimate: true, reward: 400, time: 150, requires: [], stages: [pickup,
      { ...point(-412.29, 160.2, 'Franklin Street pickup'), roadId: '488671941-0' },
      { ...point(-297.93, 240.71, 'Franklin Street drop'), roadId: '488671941-0' }] },
    { id: 'kennedy-delivery', name: 'Kennedy Street delivery', type: 'delivery', legitimate: true, reward: 450, time: 180, requires: [], stages: [
      { ...point(263.85, -215.82, 'Kennedy Street pickup'), roadId: '5117419-0' },
      { ...point(411.48, -107.54, 'Kennedy Street checkpoint'), roadId: '5117419-0' },
      { ...point(707.93, 106.77, 'Kennedy Street drop'), roadId: '673311537-0' }] },
    { id: 'yoober-crescent', name: 'Yoober Crescent local fare', type: 'ride', legitimate: true, reward: 45, time: 120, requires: [], stages: [
      { ...point(-342.84, -382.24, 'Crescent passenger pickup'), roadId: '454766146-0' },
      { ...point(-322.32, -348.02, 'Crescent passenger drop-off'), roadId: '454766146-0' }] },
    { id: 'yoober-franklin', name: 'Yoober Franklin Street fare', type: 'ride', legitimate: true, reward: 110, time: 180, requires: [], stages: [
      { ...point(-412.29, 160.2, 'Franklin passenger pickup'), roadId: '488671941-0' },
      { ...point(-297.93, 240.71, 'Franklin passenger drop-off'), roadId: '488671941-0' }] },
    { id: 'priority-parcel', name: 'Priority parcel', type: 'delivery', reward: 1000, time: 110, requires: ['crescent-circuit', 'wagon-recovery'], stages: [south, north] },
  ];
  const state = { cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [], activeJob: null,
    equipment:{pistol:false},fitnessLevel:0,robberyCooldowns:{},activity:null,message: 'Career ready. Take the Crescent parcel job.' };
  if (saved !== null) {
    if (!object(saved) || !exactKeys(saved, ['version', 'cash', 'ownedVehicles', 'completedJobs','equipment','fitnessLevel','robberyCooldowns']) || saved.version !== 1 || !Number.isSafeInteger(saved.cash) || saved.cash < 0 || saved.cash > MAX_CASH || !Array.isArray(saved.ownedVehicles) || saved.ownedVehicles.length < 1 || saved.ownedVehicles.length > CARS.length || !Array.isArray(saved.completedJobs) || saved.completedJobs.length > jobs.length) throw new Error('Unsupported or corrupt career save.');
    if(saved.equipment!==undefined&&(!object(saved.equipment)||!exactKeys(saved.equipment,WEAPON_IDS)||typeof saved.equipment.pistol!=='boolean'||Object.values(saved.equipment).some(value=>typeof value!=='boolean')))throw new Error('Invalid saved equipment.');
    if(saved.fitnessLevel!==undefined&&(!Number.isInteger(saved.fitnessLevel)||saved.fitnessLevel<0||saved.fitnessLevel>3))throw new Error('Invalid saved fitness.');
    if(saved.robberyCooldowns!==undefined&&(!object(saved.robberyCooldowns)||!exactKeys(saved.robberyCooldowns,[...services.filter(s=>s.robbery).map(s=>s.id),...LEGACY_SHOP_IDS])||Object.values(saved.robberyCooldowns).some(v=>!Number.isFinite(v)||v<0||v>180)))throw new Error('Invalid saved shop cooldown.');
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
  let context = null, serial = null, shiftPlan = null;
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
  function rideGuard(ctx, active = false) {
    if (!validContext(ctx)) return 'A valid player position is required.';
    if (ctx.sandbox || ctx.recovering) return 'Yoober is unavailable here.';
    if ((!active && state.activeJob) || state.activity) return 'Finish or cancel the current activity first.';
    if (ctx.wanted > 0) return 'Lose the police before taking a fare.';
    if (ctx.onFoot || !object(ctx.vehicle)) return 'Drive an owned four-door car first.';
    const owned = currentOwned(ctx.vehicle.modelId);
    if (!RIDE_MODELS.includes(ctx.vehicle.modelId) || !owned || owned.stored || ctx.vehicle.stolen !== false) return 'Use an owned, legal four-door car.';
    if (ctx.vehicleHealth < 50 || ctx.vehicleHealth > 100) return 'Repair the car to at least 50% condition.';
    return '';
  }
  function rideEligibility(ctx) { return rideGuard(ctx); }
  function garageGuard() {
    if (!atGarage()) return result(false, 'Visit the Crescent garage first.');
    if (context.wanted > 0) return result(false, 'Lose the police before using the garage.');
    return null;
  }
  function startJob(id, ctx) {
    if (!remember(ctx)) return result(false, 'A valid player position is required.');
    if (ctx.sandbox || ctx.recovering) return result(false, 'Jobs are unavailable here.');
    if (state.activeJob||state.activity) return result(false, 'Finish or cancel the current activity first.');
    const job = jobs.find(item => item.id === id);
    if (!job) return result(false, 'Unknown job.');
    if (job.type === 'ride') { const reason = rideEligibility(ctx); if (reason) return result(false, reason); }
    if (job.legitimate && (ctx.wanted > 0 || ctx.vehicle?.stolen)) return result(false, 'Use a legal vehicle and lose the police before this delivery.');
    if (job.requires.some(required => !state.completedJobs.includes(required))) return result(false, 'Complete the earlier jobs to unlock this job.');
    serial = ctx.respawnSerial;
    state.activeJob = { id, type: job.type, name: job.name, stage: 0, target: copy(job.stages[0]), remaining: job.time, reward: job.reward, elapsed: 0, clearTime: 0, sawWanted: ctx.wanted > 0 };
    if (job.type === 'ride') Object.assign(state.activeJob, { passenger: false, stopTime: 0, modelId: null });
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
    if (!remember(ctx)) {
      if (state.activeJob?.type === 'ride') {
        if (state.activeJob.passenger) fail('Fare interrupted. No pay earned.');
        else state.activeJob.stopTime = 0;
      }
      return;
    }
    if (dt === 0 && state.activity?.type !== 'work' && state.activeJob?.type !== 'ride') return;
    for(const id of Object.keys(state.robberyCooldowns))state.robberyCooldowns[id]=Math.max(0,state.robberyCooldowns[id]-Math.min(dt,.25));
    const activity=state.activity;
    if(activity?.type==='work'){
      const work=workContext(activity,ctx);
      if(!work){state.activity=null;shiftPlan=null;result(false,'Shift interrupted. No pay earned.',{},'activity-ended');}
      else activity.progress=work.session.progress;
    }else if(activity){
      const site=serviceSite(services.find(s=>s.id===activity.serviceId));
      if(!site||ctx.sandbox||ctx.respawnSerial!==activity.respawnSerial||ctx.recovering||!ctx.onFoot||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx)||
        (activity.type==='robbery'?!equippedFirearm(ctx):ctx.wanted>0)){
        state.activity=null;result(false,'Activity interrupted.',{},'activity-ended');
      }else if(activity.type==='workout'&&options.interactiveWorkouts){
        // Completion is owned by the exercise input state machine.
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
    if (dt === 0 && state.activeJob?.type !== 'ride') return;
    if (serial !== null && serial !== ctx.respawnSerial && state.activeJob) { serial = ctx.respawnSerial; fail('Job ended after respawn.'); return; }
    serial = ctx.respawnSerial;
    const active = state.activeJob;
    if (!active) return;
    if(ctx.sandbox||ctx.recovering){fail('Job interrupted.');return;}
    const job = jobs.find(item => item.id === active.id);
    active.elapsed += dt;
    active.remaining = Math.max(0, active.remaining - dt);
    if (active.remaining === 0) { fail('Job time expired.'); return; }
    const driving = !ctx.onFoot && object(ctx.vehicle) && ctx.vehicleHealth > 0;
    if (job.type === 'ride') {
      const reason = rideGuard(ctx, true);
      if (active.passenger && (reason || ctx.vehicle.modelId !== active.modelId)) { fail('Fare interrupted. No pay earned.'); return; }
      const stopped = !reason && near(ctx.pose, active.target, 10) && Number.isFinite(ctx.pose.speed) && Math.abs(ctx.pose.speed) <= RIDE_STOP_SPEED;
      // A long frame or a previous interrupted stop cannot board or pay instantly.
      if (active.stopModelId !== ctx.vehicle?.modelId) active.stopTime = 0;
      active.stopModelId = stopped ? ctx.vehicle.modelId : null;
      active.stopTime = stopped ? Math.min(RIDE_STOP_SECONDS, active.stopTime + Math.min(dt, .1)) : 0;
      if (active.stopTime + 1e-9 >= RIDE_STOP_SECONDS) {
        active.stopTime = 0;
        if (!active.passenger) {
          active.passenger = true; active.modelId = ctx.vehicle.modelId;
          advance(job, active);
        } else complete(job);
      }
    } else if (job.type === 'theft') {
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
    } else if (driving && (!job.legitimate || (ctx.wanted===0 && ctx.vehicle.stolen!==true)) && near(ctx.pose, active.target)) {
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
    state.activeJob = null;state.activity=null;shiftPlan=null;
    const cost = Math.min(250, state.cash); state.cash -= cost;
    return result(true, `${reason}: $${cost} deducted. Completed jobs kept.`, { cost }, 'penalty');
  }
  function clearApproach(site,ctx){return !options.hasLineOfSight||options.hasLineOfSight(ctx.pose,{x:site.x,z:site.z});}
  function serviceGuard(id,ctx,{allowWanted=false}={}){
    if(!remember(ctx)||ctx.sandbox||ctx.recovering)return result(false,'Activity unavailable.');
    const site=serviceSite(services.find(s=>s.id===id));
    if(!site||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx))return result(false,'Visit this storefront first.');
    if(!ctx.onFoot)return result(false,'Step out of the car first.');
    if(state.activity)return result(false,'Finish the current activity first.');
    if(!allowWanted&&ctx.wanted>0)return result(false,'Lose the police first.');
    return site;
  }
  function equippedFirearm(ctx){return WEAPON_IDS.includes(ctx.weapon)&&state.equipment[ctx.weapon]===true;}
  function purchaseService(id,item,ctx){
    const site=serviceGuard(id,ctx,{allowWanted:true});if(!site.id)return site;
    let cost,effect;
    if(site.type==='food'&&item==='food'){
      if(!Number.isFinite(ctx.health)||ctx.health>=100)return result(false,'Health is already full.');
      cost=site.price;effect={heal:site.heal};
    }else if(site.type==='arms'){
      const ammoOnly=item==='ammo'||(typeof item==='string'&&item.startsWith('ammo:'));
      const weaponId=item==='ammo'?'pistol':ammoOnly?item.slice(5):item;
      const profile=weaponById(weaponId),multiplier=site.priceMultiplier??1;
      if(!profile||!Number.isFinite(multiplier)||multiplier<=0||
        (site.weaponIds!==undefined&&(!Array.isArray(site.weaponIds)||site.weaponIds.some(id=>!WEAPON_IDS.includes(id))||!site.weaponIds.includes(weaponId))))return result(false,'Unknown purchase.');
      if(ammoOnly){
        const reserve=ctx.ammunition?.[weaponId]?.reserveAmmo??(weaponId==='pistol'?ctx.reserveAmmo:undefined);
        // Preserve the original pistol shop ceiling independently of carried capacity.
        const cap=weaponId==='pistol'?120:profile.reserveCap;
        if(!state.equipment[weaponId]||!Number.isSafeInteger(reserve)||reserve<0||reserve>cap-profile.ammoPack)return result(false,'Ammo unavailable.');
        cost=Math.ceil(profile.ammoPrice*multiplier);effect={weaponId,ammo:profile.ammoPack};
      }else{
        if(state.equipment[weaponId])return result(false,'You already own this weapon.');
        cost=Math.ceil(profile.price*multiplier);effect={weaponId,ammo:profile.starterAmmo,...(weaponId==='pistol'?{pistol:true}:{})};
      }
    }else return result(false,'Unknown purchase.');
    if(!Number.isSafeInteger(cost)||cost<=0||!spend(cost))return result(false,'Not enough cash.');
    if(effect.weaponId&&!(item==='ammo'||item.startsWith('ammo:')))state.equipment[effect.weaponId]=true;
    return result(true,'Purchased.',{cost,...effect},'service-purchase');
  }
  function startActivity(id,type,ctx){
    const site=serviceGuard(id,ctx,{allowWanted:type==='robbery'});if(!site.id)return site;
    if(state.activeJob)return result(false,'Finish or cancel the job first.');
    if(type==='robbery'){
      if(!site.robbery||!equippedFirearm(ctx))return result(false,'Equip an owned firearm to threaten the till.');
      if(state.robberyCooldowns[id]>0)return result(false,'The till is empty.');
    }else if(type==='workout'){
      if(site.type!=='gym'||state.fitnessLevel>=3)return result(false,'Training complete.');
      if(state.cash<site.price*(state.fitnessLevel+1))return result(false,'Not enough cash.');
    }else return result(false,'Unknown activity.');
    state.activity={type,serviceId:id,name:type==='robbery'?'Taking the till':'Training',elapsed:0,duration:type==='robbery'?4:8,progress:0,
      cost:type==='workout'?site.price*(state.fitnessLevel+1):0,respawnSerial:ctx.respawnSerial};
    return result(true,type==='robbery'?'Stay near the till.':'Training started.',{serviceId:id,point:{x:site.x,z:site.z}},type+'-started');
  }
  function payRental(amount,ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.wanted>0||![20,30].includes(amount))return result(false,'Hire unavailable.');
    if(!spend(amount))return result(false,'Not enough cash for this ride.');
    return result(true,`Ride hired for $${amount}.`,{cost:amount},'rental-started');
  }
  function payRide(amount, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.onFoot || ctx.wanted > 0 || state.activeJob || state.activity || !Number.isSafeInteger(amount) || amount < 8 || amount > 400) return result(false, 'Yoober booking unavailable.');
    if (!spend(amount)) return result(false, 'Not enough cash for this fare.');
    return result(true, `Yoober fare paid: $${amount}.`, { cost: amount }, 'ride-purchase');
  }
  function prepareStarterVehicle(ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||state.activeJob||state.activity)return {ok:false,message:'Starter vehicle unavailable.'};
    const starter=currentOwned('lantern');
    if(starter.health>0)return {ok:true,vehicle:copy(starter),assisted:false};
    starter.health=35;starter.stored=false;
    return result(true,'Starter car repaired to 35% condition. Visit the garage for a full repair.',{vehicle:copy(starter),assisted:true},'roadside-repair');
  }
  function redeemDevCode(value, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering) return result(false, 'Developer codes are unavailable here.');
    if (typeof value !== 'string' || value.trim().toLowerCase() !== 'alopsd') return result(false, 'Code not recognised.');
    state.cash = MAX_CASH;
    return result(true, 'Career cash set to $1,000,000,000.', { cash: state.cash }, 'dev-credit');
  }
  function workStation(serviceId){
    const work=options.workSession?.(),plan=work?.plan,session=work?.session;
    const source=services.find(site=>site.id===serviceId&&site.source);
    if(!source||!plan||!Object.isFrozen(plan)||!Array.isArray(plan.activities)||!Object.isFrozen(plan.activities)||plan.storeId!==serviceId||plan.type!=='shop'||
      !session||session.planId!==plan.id||!Number.isSafeInteger(session.sessionId)||session.sessionId<1||session.sandbox)return null;
    const station=plan.activities.find(item=>item.id===session.station?.id&&['noodle','stock'].includes(item.kind));
    if(!station||!Object.isFrozen(station)||!Number.isFinite(station.radius)||station.radius<=0||
      session.kind!==station.kind||!['id','kind','label','x','z','yaw','radius'].every(key=>session.station[key]===station[key]))return null;
    return {plan,session,station,site:{...serviceSite(source),id:source.id}};
  }
  function workContext(active,ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.wanted>0||ctx.respawnSerial!==active.respawnSerial)return null;
    const work=workStation(active.serviceId);
    if(!work||work.plan!==shiftPlan||work.plan.id!==active.planId||work.session.sessionId!==active.sessionId||
      work.station.id!==active.station.id||!near(ctx.pose,active.station,active.station.radius)||
      !clearApproach(active.station,ctx)||!serviceAllowed(work.site,ctx)||
      !(work.session.active||work.session.phase==='complete'))return null;
    return work;
  }
  function startShift(serviceId,ctx){
    if(!remember(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.wanted>0)return result(false,'Shift unavailable.');
    if(state.activeJob||state.activity)return result(false,'Finish or cancel the current activity first.');
    const work=workStation(serviceId);
    if(!work?.session.active||!near(ctx.pose,work.station,work.station.radius)||!clearApproach(work.station,ctx)||!serviceAllowed(work.site,ctx))return result(false,'Start a shop task at its work station first.');
    shiftPlan=work.plan;
    const reward=work.station.kind==='noodle'?60:45;
    state.activity={type:'work',serviceId,name:work.station.kind==='noodle'?'Noodle shift':'Stock shift',reward,progress:0,
      station:Object.freeze({...work.station}),planId:work.plan.id,sessionId:work.session.sessionId,respawnSerial:ctx.respawnSerial};
    return result(true,`Shift started. Complete the task to earn $${reward}.`,{serviceId,reward},'work-started');
  }
  function finishShift(ctx,success){
    const active=state.activity;
    if(active?.type!=='work')return result(false,'No paid shift is active.');
    const work=workContext(active,ctx);
    state.activity=null;shiftPlan=null;
    if(success!==true||!work||work.session.active||work.session.phase!=='complete')return result(false,'Shift ended without a completed task. No pay earned.',{},'activity-ended');
    state.cash=Math.min(MAX_CASH,state.cash+active.reward);
    return result(true,`Shift complete. Earned $${active.reward}.`,{serviceId:active.serviceId,reward:active.reward},'work-complete');
  }
  function finishWorkout(ctx,success){
    const active=state.activity;
    if(!active||active.type!=='workout'||!options.interactiveWorkouts)return result(false,'No exercise session is active.');
    update(0,ctx);
    const site=serviceSite(services.find(s=>s.id===active.serviceId));
    state.activity=null;
    if(!success||!validContext(ctx)||ctx.sandbox||ctx.recovering||ctx.respawnSerial!==active.respawnSerial||ctx.wanted>0||!ctx.onFoot||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx))return result(false,'Exercise ended without a completed set.',{},'activity-ended');
    if(state.fitnessLevel>=3||!spend(active.cost))return result(false,'Training is unavailable.',{},'activity-ended');
    state.fitnessLevel++;return result(true,`Set complete. Fitness ${state.fitnessLevel}/3.`,{cost:active.cost},'workout-complete');
  }
  return { state, jobs, garage,get services(){return services.map(serviceSite);},canUseService:serviceAllowed, startJob, update, buyVehicle, repairVehicle, paintVehicle, storeVehicle, retrieveVehicle, penalize,purchaseService,startActivity,finishWorkout,payRental,payRide,rideEligibility,prepareStarterVehicle,redeemDevCode,startShift,finishShift,
    cancelActivity(){if(!state.activity)return false;state.activity=null;shiftPlan=null;return true;},
    cancelJob() { if (!state.activeJob) return result(false, 'No active job.'); state.activeJob = null; return result(true, 'Job cancelled.', {}, 'job-cancelled'); },
    serialize() { return copy({ version: 1, cash: state.cash, ownedVehicles: state.ownedVehicles, completedJobs: state.completedJobs,equipment:state.equipment,fitnessLevel:state.fitnessLevel,robberyCooldowns:state.robberyCooldowns }); },
    drainEvents() { return events.splice(0); },
  };
}
