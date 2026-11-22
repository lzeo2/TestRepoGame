import {emptyStash,validStash,transferStash,STASH_CASH_CAP} from './safehouse-storage.js';
import {SERVICES,LEGACY_SHOP_IDS} from './services.js';
import {WEAPON_IDS,weaponById,normalizeAmmoInventory} from './weapons.js';
import {isWorkoutKind} from './interior-activities.js';
import {nitroRefillQuote} from './nitro-stations.js';
import {isVehicleStopped} from './driving-dynamics.js';
import {CAR_RENTAL_OFFERS} from './car-rental.js';
import {deliveryMethod} from './delivery-service.js';
import {WATERCRAFT_OFFERS} from './watercraft.js';
import {gearForMode} from './free-roam-gear.js';
// Fictional job markers beside the mapped roads; these are not real businesses.
const CARS = [
  { id: 'lantern', name: 'Neighbourhood saloon', price: 0 },
  { id: 'orchard', name: 'Family wagon', price: 1400 },
  { id: 'gravel', name: 'Suburban SUV', price: 2200 },
  { id: 'relay', name: 'Executive tourer', price: 3200 },
  { id: 'atlas', name: 'Weekend ute', price: 2600 },
];
export const GARAGE_MODS = Object.freeze([
  {id:'engine',name:'Engine',costs:Object.freeze([350,700]),description:'More acceleration and road speed'},
  {id:'brakes',name:'Brakes',costs:Object.freeze([250,500]),description:'Shorter braking distance'},
  {id:'handling',name:'Handling',costs:Object.freeze([300,600]),description:'Sharper steering and tyre grip'},
].map(Object.freeze));
export const JETPACK_OFFER = Object.freeze({siteId:'canalside-supplies',siteName:'Canalside Supplies',price:1200});
export const UTILITY_GEAR = Object.freeze({
  armour:Object.freeze({field:'armour',name:'Body armour',price:350,capacity:100}),
  medkit:Object.freeze({field:'medkits',name:'Medkit',price:120,capacity:3,amount:35}),
  'repair-kit':Object.freeze({field:'repairKits',name:'Repair kit',price:160,capacity:3,amount:35}),
  jammer:Object.freeze({field:'jammers',name:'Camera jammer',price:250,capacity:3}),
});
const THROWABLES = Object.freeze({grenade:Object.freeze({field:'grenades',name:'Grenade',price:120}),smoke:Object.freeze({field:'smokeGrenades',name:'Smoke grenade',price:80})});
const stockGear = () => ({scanner:false,flares:0,grenades:0,smokeGrenades:0});
const stockMods = () => ({engine:0,brakes:0,handling:0});
const validMods = mods => object(mods) && exactKeys(mods,GARAGE_MODS.map(mod=>mod.id)) && GARAGE_MODS.every(mod=>Number.isInteger(mods[mod.id])&&mods[mod.id]>=0&&mods[mod.id]<=mod.costs.length);
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_CASH = 1000000000;
const RIDE_MODELS = ['lantern', 'orchard', 'gravel', 'relay'];
const RIDE_STOP_SECONDS = 2;
const RIDE_STOP_SPEED = .8;
const RIDE_STOP_RADIUS = 16;
const DELIVERY_STOP_RADIUS = 20;
const MUGGING_ID = /^ped:(?:0|[1-9]\d?|1[0-5]\d)$/;
const copy = value => JSON.parse(JSON.stringify(value));
const near = (a, b, radius = 17) => a && Math.hypot(a.x - b.x, a.z - b.z) <= radius;
const point = (x, z, label) => ({ x, z, label });
const deliveryStop = (x, z, label) => ({ ...point(x, z, label), radius: DELIVERY_STOP_RADIUS });
const validVehicleKey = key => Number.isSafeInteger(key)&&key>=0||typeof key==='string'&&key.length>0&&key.length<=120;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));
const validOptionalLevel = (value,capacity,integer = true) => value===undefined ||
  (Number.isFinite(value)&&(!integer||Number.isInteger(value))&&value>=0&&value<=capacity);
const validSavedGear = gear => object(gear) &&
  exactKeys(gear,['drone','droneStrike','jetpack','scanner','flares','grenades','smokeGrenades','armour','medkits','repairKits','jammers']) &&
  ['drone','droneStrike','jetpack'].every(key=>gear[key]===undefined||typeof gear[key]==='boolean') &&
  (gear.droneStrike!==true||gear.drone===true) && typeof gear.scanner==='boolean' &&
  Number.isInteger(gear.flares) && gear.flares>=0 && gear.flares<=12 &&
  ['grenades','smokeGrenades'].every(key=>validOptionalLevel(gear[key],6)) &&
  Object.values(UTILITY_GEAR).every(({field,capacity})=>validOptionalLevel(gear[field],capacity,field!=='armour'));
const INVENTORY_PROFILES = Object.freeze(['street','student','corporate','basement']);
const validCrewHealth = (value,ids) => object(value)&&Object.keys(value).every(id=>ids.includes(id)&&Number.isFinite(value[id])&&value[id]>=0&&value[id]<=100);
const validWatercraft = owned => Array.isArray(owned) && owned.length<=WATERCRAFT_OFFERS.length &&
  new Set(owned).size===owned.length && [...owned].every(kind=>WATERCRAFT_OFFERS.some(offer=>offer.kind===kind));

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
  const homes=options.homes??[];
  if(!Array.isArray(homes))throw new Error('Invalid home registry.');
  const homeIds=new Set();
  for(const home of homes){
    if(!object(home)||typeof home.id!=='string'||!home.id.startsWith('house-')||home.type!=='house'||homeIds.has(home.id)||typeof home.name!=='string'||!home.name.trim()||!Number.isFinite(home.x)||!Number.isFinite(home.z)||!Number.isFinite(home.yaw))throw new Error('Invalid home registry.');
    homeIds.add(home.id);
  }
  const availableHomes=homes.filter(home=>home.id!==map.storyHomes?.basement?.roomId);
  // Preserve v1 property identities; added offers use source suburbs and actual doors.
  const offeredHomes=availableHomes.slice(0,2);
  const buildingsById=new Map((map.buildings||[]).map(building=>[building.id,building]));
  const districtOf=home=>String(buildingsById.get(home.buildingId)?.suburb||'').toLowerCase().replace(/\s/g,'');
  const separation=home=>Math.min(...offeredHomes.map(other=>Math.hypot(home.x-other.x,home.z-other.z)));
  function appendOffer(district){
    const remaining=availableHomes.filter(home=>!offeredHomes.includes(home)&&(!district||districtOf(home)===district));
    remaining.sort((a,b)=>separation(b)-separation(a)||a.id.localeCompare(b.id));
    if(remaining.length)offeredHomes.push(remaining[0]);
  }
  for(const district of ['redhill','narrabundah','city','barton','kingston','griffith'])appendOffer(district);
  while(offeredHomes.length<Math.min(8,availableHomes.length))appendOffer();
  const prices=[15000,25000,38000,22000,42000,32000,28000,24000];
  const propertyOffers=Object.freeze(offeredHomes.map((home,i)=>Object.freeze({id:home.id,roomId:home.id,buildingId:home.buildingId,name:home.name,x:home.x,z:home.z,yaw:home.yaw,price:prices[i]})));
  const crewOffers=Object.freeze([{id:'merc-river',name:'River',price:1200},{id:'merc-stone',name:'Stone',price:1800}].map(Object.freeze));
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
      { ...point(-342.84, -382.24, 'Crescent passenger pickup'), roadId: '454766146-0', radius: RIDE_STOP_RADIUS },
      { ...point(-322.32, -348.02, 'Crescent passenger drop-off'), roadId: '454766146-0', radius: RIDE_STOP_RADIUS }] },
    { id: 'yoober-franklin', name: 'Yoober Franklin Street fare', type: 'ride', legitimate: true, reward: 110, time: 180, requires: [], stages: [
      { ...point(-412.29, 160.2, 'Franklin passenger pickup'), roadId: '488671941-0', radius: RIDE_STOP_RADIUS },
      { ...point(-297.93, 240.71, 'Franklin passenger drop-off'), roadId: '488671941-0', radius: RIDE_STOP_RADIUS }] },
    { id:'food-round',name:'Lunch delivery round',cargoKind:'food',description:'Two lunch handovers. Freshness falls after pickup; pay ranges from 60% to 100%.',type:'delivery',legitimate:true,stopSeconds:1.5,reward:620,time:210,requires:[],stages:[
      deliveryStop(-412.29,160.2,'Collect lunch orders on Franklin Street'),deliveryStop(-297.93,240.71,'First lunch handover'),deliveryStop(263.85,-215.82,'Kennedy lunch handover')] },
    { id:'inner-south-courier',name:'Inner south document courier',description:'Exchange sealed documents at three ordered stops for a fixed fee.',type:'delivery',legitimate:true,stopSeconds:1.5,reward:780,time:240,requires:['crescent-parcel'],stages:[
      deliveryStop(263.85,-215.82,'Collect the sealed documents'),deliveryStop(-412.29,160.2,'Franklin document exchange'),deliveryStop(-322.32,-348.02,'Crescent document handover')] },
    { id:'urgent-medical',name:'Urgent medical supplies',cargoKind:'medical',description:'100 seconds. Use a car at 60% condition or better; more than 15 damage after loading ruins the supplies.',type:'delivery',legitimate:true,stopSeconds:1.5,reward:900,time:100,requires:[],stages:[
      deliveryStop(-297.93,240.71,'Collect the medical supply crate'),deliveryStop(707.93,106.77,'Urgent medical supply handover')] },
    { id:'equipment-delivery',name:'Workshop equipment delivery',cargoKind:'equipment',description:'Keep the loaded vehicle. 25 cumulative damage breaks the equipment; repairs do not erase damage.',type:'delivery',legitimate:true,stopSeconds:2,reward:700,time:210,requires:['crescent-parcel'],stages:[
      deliveryStop(-349.73,-422.16,'Load workshop equipment'),deliveryStop(411.48,-107.54,'Workshop equipment handover'),deliveryStop(-349.73,-422.16,'Return the empty equipment cases')] },
    { id: 'priority-parcel', name: 'Priority parcel', type: 'delivery', reward: 1000, time: 110, requires: ['crescent-circuit', 'wagon-recovery'], stages: [south, north] },
  ];
  const state = { cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false, mods:stockMods() }], ownedWatercraft:[],completedJobs: [], activeJob: null,
    ownedProperties:[],stashes:{},hiredCrew:[],crewHealth:{},inventoryProfiles:{},equipment:{pistol:false},gear:stockGear(),fitnessLevel:0,robberyCooldowns:{},muggingCooldowns:{},burglaryCooldowns:{},activity:null,message: 'Career ready. Take the Crescent parcel job.' };
  if (saved !== null) {
    if (!object(saved) || !exactKeys(saved, ['version', 'cash', 'ownedVehicles','ownedWatercraft', 'completedJobs','equipment','gear','fitnessLevel','robberyCooldowns','muggingCooldowns','ownedProperties','stashes','hiredCrew','inventoryProfiles','crewHealth','burglaryCooldowns']) || saved.version !== 1 || !Number.isSafeInteger(saved.cash) || saved.cash < 0 || saved.cash > MAX_CASH || !Array.isArray(saved.ownedVehicles) || saved.ownedVehicles.length < 1 || saved.ownedVehicles.length > CARS.length || !Array.isArray(saved.completedJobs) || saved.completedJobs.length > jobs.length) throw new Error('Unsupported or corrupt career save.');
    if(saved.ownedWatercraft!==undefined&&!validWatercraft(saved.ownedWatercraft))throw new Error('Invalid saved watercraft.');
    if(saved.equipment!==undefined&&(!object(saved.equipment)||!exactKeys(saved.equipment,WEAPON_IDS)||typeof saved.equipment.pistol!=='boolean'||Object.values(saved.equipment).some(value=>typeof value!=='boolean')))throw new Error('Invalid saved equipment.');
    if(saved.gear!==undefined&&!validSavedGear(saved.gear))throw new Error('Invalid saved gear.');
    if(saved.fitnessLevel!==undefined&&(!Number.isInteger(saved.fitnessLevel)||saved.fitnessLevel<0||saved.fitnessLevel>3))throw new Error('Invalid saved fitness.');
    if(saved.robberyCooldowns!==undefined&&(!object(saved.robberyCooldowns)||!exactKeys(saved.robberyCooldowns,[...services.filter(s=>s.robbery).map(s=>s.id),...LEGACY_SHOP_IDS])||Object.values(saved.robberyCooldowns).some(v=>!Number.isFinite(v)||v<0||v>180)))throw new Error('Invalid saved shop cooldown.');
    if(saved.muggingCooldowns!==undefined&&(!object(saved.muggingCooldowns)||Object.keys(saved.muggingCooldowns).some(id=>!MUGGING_ID.test(id))||Object.values(saved.muggingCooldowns).some(v=>!Number.isFinite(v)||v<0||v>180)))throw new Error('Invalid saved mugging cooldown.');
    if(saved.ownedProperties!==undefined&&(!Array.isArray(saved.ownedProperties)||saved.ownedProperties.length>propertyOffers.length||new Set(saved.ownedProperties).size!==saved.ownedProperties.length||saved.ownedProperties.some(id=>!propertyOffers.some(home=>home.id===id))))throw new Error('Invalid saved property.');
    if(saved.hiredCrew!==undefined&&(!Array.isArray(saved.hiredCrew)||saved.hiredCrew.length>2||new Set(saved.hiredCrew).size!==saved.hiredCrew.length||saved.hiredCrew.some(id=>!crewOffers.some(crew=>crew.id===id))))throw new Error('Invalid saved crew.');
    if(saved.burglaryCooldowns!==undefined&&(!object(saved.burglaryCooldowns)||Object.keys(saved.burglaryCooldowns).length>64||Object.entries(saved.burglaryCooldowns).some(([id,time])=>!homeIds.has(id)||!Number.isFinite(time)||time<0||time>300)))throw new Error('Invalid saved burglary cooldowns.');
    if(saved.inventoryProfiles!==undefined&&(!object(saved.inventoryProfiles)||!exactKeys(saved.inventoryProfiles,INVENTORY_PROFILES)))throw new Error('Invalid saved inventory profiles.');
    if(saved.crewHealth!==undefined&&!validCrewHealth(saved.crewHealth,saved.hiredCrew||[]))throw new Error('Invalid saved crew health.');
    if(saved.stashes!==undefined&&(!object(saved.stashes)||Object.entries(saved.stashes).some(([id,value])=>!(saved.ownedProperties||[]).includes(id)&&id!==map.storyHomes?.basement?.roomId||!validStash(value))))throw new Error('Invalid saved stash.');
    const stashedWeapons=Object.values(saved.stashes||{}).flatMap(value=>value.weapons);
    if(new Set(stashedWeapons).size!==stashedWeapons.length||stashedWeapons.some(id=>saved.equipment?.[id]===true))throw new Error('Invalid saved weapon ownership.');
    state.ownedProperties=copy(saved.ownedProperties||[]);state.hiredCrew=copy(saved.hiredCrew||[]);state.stashes=copy(saved.stashes||{});state.crewHealth=copy(saved.crewHealth||{});
    for(const stash of Object.values(state.stashes))stash.ammo={...emptyStash().ammo,...stash.ammo};
    for(const [profile,pools] of Object.entries(saved.inventoryProfiles||{})){
      const inventory=normalizeAmmoInventory(pools);
      if(!inventory)throw new Error('Invalid saved inventory profiles.');
      state.inventoryProfiles[profile]=inventory;
    }
    const ids = new Set();
    for (const car of saved.ownedVehicles) {
      if (!object(car) || !exactKeys(car, ['id', 'color', 'health', 'stored', 'mods']) || !CARS.some(item => item.id === car.id) || ids.has(car.id) || !COLOR.test(car.color) || !Number.isFinite(car.health) || car.health < 0 || car.health > 100 || typeof car.stored !== 'boolean' || (car.mods!==undefined&&!validMods(car.mods))) throw new Error('Invalid saved garage.');
      ids.add(car.id);
    }
    if (!ids.has('lantern') || new Set(saved.completedJobs).size !== saved.completedJobs.length || saved.completedJobs.some(id => !jobs.some(job => job.id === id)) || saved.completedJobs.some(id => jobs.find(job => job.id === id).requires.some(required => !saved.completedJobs.includes(required)))) throw new Error('Invalid saved career progress.');
    state.cash = saved.cash;
    state.ownedVehicles = saved.ownedVehicles.map(car=>({...copy(car),mods:copy(car.mods||stockMods())}));
    state.ownedWatercraft = [...(saved.ownedWatercraft||[])];
    state.completedJobs = [...saved.completedJobs];
    state.equipment=copy(saved.equipment||{pistol:false});state.fitnessLevel=saved.fitnessLevel||0;state.robberyCooldowns=copy(saved.robberyCooldowns||{});
    state.gear={...stockGear(),...copy(saved.gear||{})};
    state.muggingCooldowns=copy(saved.muggingCooldowns||{});state.burglaryCooldowns=copy(saved.burglaryCooldowns||{});
  }
  const serviceSite = source => source && ({ ...source, ...(options.servicePosition?.(source) || {}) });
  const serviceAllowed = (site, ctx) => !options.canUseService || options.canUseService(site, ctx);
  const events = [];
  let context = null, serial = null, shiftPlan = null, workoutPlan = null, lastHouseLootSerial = 0, lastRestSerial = 0, deliveryEscrow = null, lastDeliveryOrderId = null;
  let missionState = null;
  const missionSteps = new WeakMap();
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
    if (ctx.onFoot || !object(ctx.vehicle)) return 'Drive an owned four-door car first.';
    const owned = currentOwned(ctx.vehicle.modelId);
    if (ctx.vehicle.rented || !RIDE_MODELS.includes(ctx.vehicle.modelId) || !owned || owned.stored || ctx.vehicle.stolen !== false) return 'Use an owned, legal four-door car.';
    if (ctx.vehicleHealth < 50 || ctx.vehicleHealth > 100) return 'Repair the car to at least 50% condition.';
    return '';
  }
  function rideEligibility(ctx) { return rideGuard(ctx); }
  function garageGuard() {
    if (!atGarage()) return result(false, 'Visit the Crescent garage first.');
    if (context.vehicle?.rented) return result(false, 'Return your rental before using the garage.');
    if (context.wanted > 0) return result(false, 'Lose the police before using the garage.');
    return null;
  }
  function startJob(id, ctx) {
    if (!remember(ctx)) return result(false, 'A valid player position is required.');
    if (ctx.sandbox || ctx.recovering || ctx.passenger) return result(false, 'Jobs are unavailable here.');
    if (state.activeJob||state.activity) return result(false, 'Finish or cancel the current activity first.');
    const job = jobs.find(item => item.id === id);
    if (!job) return result(false, 'Unknown job.');
    if (job.type === 'ride') { const reason = rideEligibility(ctx); if (reason) return result(false, reason); }
    if (job.legitimate && ctx.vehicle?.stolen) return result(false, 'Use a legal vehicle for this delivery.');
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
    const offered=state.activeJob?.reward;
    const reward=job.cargoKind&&Number.isSafeInteger(offered)&&offered>=Math.floor(job.reward*.6)&&offered<=job.reward?offered:job.reward;
    if (!state.completedJobs.includes(job.id)) state.completedJobs.push(job.id);
    state.cash = Math.min(MAX_CASH, state.cash + reward);
    state.activeJob = null;
    result(true, `${job.name} complete. Earned $${reward}.`, { jobId: job.id, reward }, 'job-complete');
  }
  function update(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Career dt must be finite and nonnegative.');
    if (!remember(ctx)) {
      if(state.activity?.type==='work'){state.activity=null;shiftPlan=null;result(false,'Shift interrupted. No pay earned.',{},'activity-ended');}
      if(state.activity?.type==='workout'&&options.interactiveWorkouts){state.activity=null;workoutPlan=null;result(false,'Exercise interrupted. No training charged.',{},'activity-ended');}
      if(state.activity?.interactive){state.activity=null;result(false,'Hold-up interrupted. No money taken.',{},'activity-ended');}
      if (state.activeJob?.type === 'ride') {
        if (state.activeJob.passenger) fail('Fare interrupted. No pay earned.');
        else state.activeJob.stopTime = 0;
      }
      return;
    }
    if (dt === 0 && state.activity?.type !== 'work' && !(state.activity?.type==='workout'&&options.interactiveWorkouts) && !state.activity?.interactive && state.activeJob?.type !== 'ride') return;
    if(!ctx.paused&&!ctx.sandbox&&!ctx.preview)for(const id of Object.keys(state.burglaryCooldowns)){
      const remaining=Math.max(0,state.burglaryCooldowns[id]-Math.min(dt,.25));
      if(remaining>0)state.burglaryCooldowns[id]=remaining;else delete state.burglaryCooldowns[id];
    }
    for(const id of Object.keys(state.robberyCooldowns))state.robberyCooldowns[id]=Math.max(0,state.robberyCooldowns[id]-Math.min(dt,.25));
    for(const id of Object.keys(state.muggingCooldowns))state.muggingCooldowns[id]=Math.max(0,state.muggingCooldowns[id]-Math.min(dt,.25));
    const activity=state.activity;
    if(activity?.type==='work'){
      const work=workContext(activity,ctx);
      if(!work){state.activity=null;shiftPlan=null;result(false,'Shift interrupted. No pay earned.',{},'activity-ended');}
      else activity.progress=work.session.progress;
    }else if(activity?.type==='workout'&&options.interactiveWorkouts){
      const workout=workoutContext(activity,ctx);
      if(!workout){state.activity=null;workoutPlan=null;result(false,'Exercise interrupted. No training charged.',{},'activity-ended');}
      else activity.progress=workout.session.progress;
    }else if(activity?.interactive){
      const target=liveCrimeTarget(activity.targetId,activity.type==='robbery'?'employee':'pedestrian');
      const site=activity.type==='robbery'&&serviceSite(services.find(s=>s.id===activity.serviceId));
      const reason=crimePlayerReason(ctx,true)||ctx.respawnSerial!==activity.respawnSerial||
        (activity.type==='robbery'?employeeReason(site,target,ctx)||target?.roomId!==activity.roomId:pedestrianReason(target,ctx));
      if(reason){state.activity=null;result(false,'Hold-up interrupted. No money taken.',{targetId:activity.targetId},'activity-ended');}
      else{
        activity.elapsed=Math.min(activity.duration,activity.elapsed+Math.min(dt,.05));activity.progress=activity.elapsed/activity.duration;
        activity.phase=activity.elapsed<1?'intimidation':activity.elapsed<activity.duration-1?'emptying':'handover';
        if(activity.elapsed+1e-9>=activity.duration){
          state.activity=null;
          const reward=activity.type==='robbery'?site.robbery:muggingReward(activity.targetId);
          state.cash=Math.min(MAX_CASH,state.cash+reward);
          if(activity.type==='robbery')state.robberyCooldowns[site.id]=180;else state.muggingCooldowns[activity.targetId]=180;
          result(true,`Took $${reward}. Leave the area.`,{reward,targetId:activity.targetId,...(site?{serviceId:site.id}:{})},activity.type+'-complete');
        }
      }
    }else if(activity){
      const site=serviceSite(services.find(s=>s.id===activity.serviceId));
      if(!site||ctx.sandbox||ctx.respawnSerial!==activity.respawnSerial||ctx.recovering||!ctx.onFoot||!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx)||
        (activity.type==='robbery'?!equippedFirearm(ctx):ctx.wanted>0)){
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
    if (dt === 0 && state.activeJob?.type !== 'ride') return;
    if (serial !== null && serial !== ctx.respawnSerial && state.activeJob) { serial = ctx.respawnSerial; fail('Job ended after respawn.'); return; }
    serial = ctx.respawnSerial;
    const active = state.activeJob;
    if (!active) return;
    if(ctx.sandbox||ctx.recovering){fail('Job interrupted.');return;}
    const job = jobs.find(item => item.id === active.id);
    if(job.stopSeconds&&(ctx.paused||ctx.preview)){active.stopTime=0;return;}
    const cargo=active.cargo;
    if(cargo){
      if(cargo.kind==='food'){
        cargo.quality=Math.max(60,cargo.quality-dt*.2);
        active.reward=Math.max(Math.floor(job.reward*.6),Math.floor(job.reward*cargo.quality/100));
      }else{
        if(!validVehicleKey(ctx.vehicleKey)||ctx.vehicleKey!==cargo.vehicleKey||!Number.isFinite(ctx.vehicleHealth)||ctx.vehicleHealth<0||ctx.vehicleHealth>100){fail('Cargo lost. Keep the loaded vehicle.');return;}
        cargo.damage=Math.min(100,cargo.damage+Math.max(0,cargo.health-ctx.vehicleHealth));cargo.health=ctx.vehicleHealth;
        if(cargo.kind==='equipment'?cargo.damage>=cargo.limit:cargo.damage>cargo.limit){fail('Cargo damaged. No pay earned.');return;}
      }
    }
    active.elapsed += dt;
    active.remaining = Math.max(0, active.remaining - dt);
    if (active.remaining === 0) { fail('Job time expired.'); return; }
    const driving = !ctx.onFoot && object(ctx.vehicle) && ctx.vehicleHealth > 0;
    if (job.type === 'ride') {
      const reason = rideGuard(ctx, true);
      if (active.passenger && (reason || ctx.vehicle.modelId !== active.modelId)) { fail('Fare interrupted. No pay earned.'); return; }
      const stopped = !reason && near(ctx.pose, active.target, active.target.radius) && isVehicleStopped(ctx.pose, RIDE_STOP_SPEED);
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
    } else if (job.stopSeconds) {
      const vehicleKey=validVehicleKey(ctx.vehicleKey)?ctx.vehicleKey:null;
      const stopped=driving&&ctx.vehicleHealth>=(job.cargoKind==='medical'?60:25)&&ctx.vehicleHealth<=100&&!ctx.vehicle.stolen&&
        isVehicleStopped(ctx.pose,RIDE_STOP_SPEED)&&near(ctx.pose,active.target,active.target.radius)&&!ctx.paused&&!ctx.preview&&!ctx.passenger&&(!job.cargoKind||job.cargoKind==='food'||vehicleKey!==null);
      const stopIdentity=job.cargoKind&&job.cargoKind!=='food'?vehicleKey:ctx.vehicle?.modelId;
      if(active.stopModelId!==stopIdentity)active.stopTime=0;
      active.stopModelId=stopped?stopIdentity:null;
      active.stopTime=stopped?Math.min(job.stopSeconds,(active.stopTime||0)+Math.min(dt,.1)):0;
      if(active.stopTime+1e-9>=job.stopSeconds){
        active.stopTime=0;
        if(active.stage===0&&job.cargoKind)active.cargo=job.cargoKind==='food'?{kind:'food',quality:100,limit:60,vehicleKey:null}:{kind:job.cargoKind,damage:0,limit:job.cargoKind==='equipment'?25:15,vehicleKey,health:ctx.vehicleHealth};
        if(active.stage<job.stages.length-1)advance(job,active);else complete(job);
      }
    } else if (job.type === 'theft') {
      if (active.stage === 0) {
        if (driving && ctx.vehicle.modelId === job.modelId && ctx.vehicle.stolen === true && near(ctx.pose, active.target)) advance(job, active);
      } else if (driving && ctx.vehicle.modelId === job.modelId && ctx.vehicle.stolen === true && near(ctx.pose, active.target)) complete(job);
    } else if (job.type === 'getaway') {
      active.sawWanted ||= ctx.wanted > 0;
      if (active.stage === 0 && active.sawWanted && driving && near(ctx.pose, active.target)) advance(job, active);
      else if (active.stage === 1) {
        active.clearTime = ctx.wanted === 0 && driving && near(ctx.pose, active.target) ? active.clearTime + dt : 0;
        if (active.clearTime >= job.clearSeconds) complete(job);
      }
    } else if (driving && (!job.legitimate || ctx.vehicle.stolen!==true) && near(ctx.pose, active.target)) {
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
    const owned = { id, color: '#e7e6df', health: 100, stored: true, mods:stockMods() };
    state.ownedVehicles.push(owned);
    return result(true, `${car.name} purchased and stored.`, { vehicle: copy(owned), cost: car.price });
  }
  function upgradeEligibility(id,modId,ctx) {
    if(!validContext(ctx))return 'A valid player position is required.';
    if(ctx.sandbox||ctx.recovering||ctx.passenger||ctx.interior)return 'Garage upgrades are unavailable here.';
    if(!near(ctx.pose,garage,garage.radius))return 'Visit the Crescent garage first.';
    if(ctx.wanted>0)return 'Lose the police before using the garage.';
    if(state.activity||state.activeJob)return 'Finish or cancel the current activity first.';
    const car=currentOwned(id),mod=GARAGE_MODS.find(item=>item.id===modId);
    if(!car||!mod)return 'Choose an owned vehicle and a known upgrade.';
    if(ctx.onFoot||car.stored||ctx.vehicle?.rented||ctx.vehicle?.modelId!==id||ctx.vehicle.stolen!==false)return 'Drive this owned, legal vehicle into the garage.';
    if(ctx.vehicleHealth<=0||ctx.vehicleHealth>100)return 'Repair this vehicle before upgrading.';
    if(!Number.isFinite(ctx.pose.speed)||Math.abs(ctx.pose.speed)>.8)return 'Stop the vehicle before upgrading.';
    if(car.mods[modId]>=mod.costs.length)return 'Maximum tier fitted.';
    if(state.cash<mod.costs[car.mods[modId]])return 'Not enough cash for this upgrade.';
    return '';
  }
  function upgradeVehicle(id,modId,ctx) {
    const reason=upgradeEligibility(id,modId,ctx);
    if(reason)return result(false,reason);
    remember(ctx);rememberOwnedVehicle();
    const car=currentOwned(id),mod=GARAGE_MODS.find(item=>item.id===modId),cost=mod.costs[car.mods[modId]];
    spend(cost);car.mods[modId]++;
    return result(true,`${mod.name} tier ${car.mods[modId]} fitted.`,{vehicle:copy(car),modId,tier:car.mods[modId],cost},'vehicle-upgraded');
  }
  function vehicleMods(vehicle) {
    const car=vehicle?.stolen===false&&!vehicle.rented&&currentOwned(vehicle.modelId);
    return copy(car&&!car.stored?car.mods:stockMods());
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
    state.activeJob = null;state.activity=null;shiftPlan=null;workoutPlan=null;
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
  function liveCrimeTarget(id,kind){
    const target=options.crimeTarget?.(id);
    return target&&target.id===id&&target.kind===kind&&Number.isFinite(target.x)&&Number.isFinite(target.z)&&Number.isFinite(target.health)&&target.health>0?target:null;
  }
  function crimePlayerReason(ctx,active=false){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.passenger)return 'Hold-ups require being on foot.';
    if(state.activeJob||(!active&&state.activity))return 'Finish or cancel the current activity first.';
    return '';
  }
  function threatened(target,ctx){return equippedFirearm(ctx)||target?.threatened===true;}
  function employeeReason(site,target,ctx){
    if(!site?.robbery||!target||target.storeId!==site.id||typeof target.roomId!=='string'||!target.roomId||
      ctx.interior?.storeId!==site.id||ctx.interior?.roomId!==target.roomId)return 'Approach this shop employee inside the shop.';
    if(!near(ctx.pose,site,4)||!serviceAllowed(site,ctx)||!clearApproach(site,ctx)||!near(ctx.pose,target,4)||!clearApproach(target,ctx))return 'Stay close to the employee with a clear view.';
    if(!threatened(target,ctx))return 'Equip an owned firearm or confront this employee first.';
    return '';
  }
  function pedestrianReason(target,ctx){
    if(ctx.interior||!target||!MUGGING_ID.test(target.id))return 'Approach a pedestrian outside.';
    if(!near(ctx.pose,target,2.6)||!clearApproach(target,ctx))return 'Stay close to the pedestrian with a clear view.';
    if(!threatened(target,ctx))return 'Equip an owned firearm or confront this pedestrian first.';
    return '';
  }
  const storyRobbery = (id, ctx) => ctx.campaign === true && options.isStoryRobbery?.(id) === true;
  function robberyEligibility(id,ctx){
    const reason=crimePlayerReason(ctx);if(reason)return reason;
    const site=serviceSite(services.find(s=>s.id===id));
    if(!site?.robbery)return 'This shop has no till.';
    if(state.robberyCooldowns[id]>0&&!storyRobbery(id,ctx))return 'The till is empty.';
    if(!options.interactiveRobbery){
      if(!near(ctx.pose,site,site.radius)||!clearApproach(site,ctx)||!serviceAllowed(site,ctx))return 'Visit this storefront first.';
      return equippedFirearm(ctx)?'':'Equip an owned firearm first.';
    }
    const source=options.robberyTarget?.(id);
    return employeeReason(site,source&&liveCrimeTarget(source.id,'employee'),ctx);
  }
  function muggingReward(id){let hash=0;for(const char of id)hash=(hash*31+char.charCodeAt(0))>>>0;return 30+hash%71;}
  function startMugging(id,ctx){
    const target=liveCrimeTarget(id,'pedestrian');
    const reason=crimePlayerReason(ctx)||pedestrianReason(target,ctx);
    if(reason)return result(false,reason);
    if(state.muggingCooldowns[id]>0)return result(false,'This pedestrian has no more cash.');
    state.activity={type:'mugging',interactive:true,targetId:id,name:'Holding up pedestrian',phase:'intimidation',elapsed:0,duration:4,progress:0,respawnSerial:ctx.respawnSerial};
    return result(true,'Stay close while the pedestrian hands over cash.',{targetId:id,point:{x:target.x,z:target.z}},'mugging-started');
  }
  function purchaseService(id,item,ctx){
    const site=serviceGuard(id,ctx,{allowWanted:true});if(!site.id)return site;
    let cost,effect;
    if(site.type==='food'&&item==='food'){
      if(!Number.isFinite(ctx.health)||ctx.health>=100)return result(false,'Health is already full.');
      cost=site.price;effect={heal:site.heal};
    }else if(site.type==='arms'){
      const utility=Object.hasOwn(UTILITY_GEAR,item)?UTILITY_GEAR[item]:null;
      if(utility){
        if(ctx.passenger||ctx.bus||ctx.ride||ctx.preview||!Number.isFinite(ctx.health)||ctx.health<=0||ctx.health>100)
          return result(false,'Recover before trading.');
        const stock=state.gear[utility.field]??0;
        if(stock>=utility.capacity)return result(false,item==='armour'?'Armour is already full.':'You cannot carry any more of this kit.');
        if(!spend(utility.price))return result(false,'Not enough cash.');
        state.gear[utility.field]=item==='armour'?utility.capacity:stock+1;
        return result(true,`${utility.name} purchased.`,{cost:utility.price,gear:copy(state.gear)},'service-purchase');
      }
      const throwable=Object.hasOwn(THROWABLES,item)?THROWABLES[item]:null;
      if(throwable){
        if(ctx.passenger||!Number.isFinite(ctx.health)||ctx.health<=0||ctx.health>100)return result(false,'Recover before trading.');
        if(state.gear[throwable.field]>=6)return result(false,'Throwable inventory is full.');
        if(!spend(throwable.price))return result(false,'Not enough cash.');
        state.gear[throwable.field]++;
        return result(true,`${throwable.name} purchased.`,{cost:throwable.price,gear:copy(state.gear)},'service-purchase');
      }
      if(item==='drone-strike'){
        if(!commerceAllowed(ctx)||ctx.mission||ctx.preview)return result(false,'Finish your job or mission and recover before trading.');
        if(!state.gear.drone)return result(false,'Buy a drone first.');
        if(state.gear.droneStrike)return result(false,'Drone strike upgrade already owned.');
        if(!spend(100000))return result(false,'Not enough cash. Drone strike costs $100,000.');
        state.gear.droneStrike=true;
        return result(true,'Drone strike upgrade purchased. Pilot the drone and press R above clear ground.',{cost:100000,gear:copy(state.gear)},'service-purchase');
      }
      if(item==='drone'){
        if(!commerceAllowed(ctx))return result(false,'Recover before trading.');
        if(state.gear.drone)return result(false,'Drone already owned.');
        if(!spend(900))return result(false,'Not enough cash.');
        state.gear.drone=true;return result(true,'Player drone purchased.',{cost:900,gear:copy(state.gear)},'service-purchase');
      }
      if(item==='jetpack'){
        if(site.id!==JETPACK_OFFER.siteId)return result(false,`Visit ${JETPACK_OFFER.siteName} for a jetpack.`);
        if(!commerceAllowed(ctx))return result(false,'Finish your job or recover before trading.');
        if(state.gear.jetpack)return result(false,'Jetpack already owned.');
        if(!spend(JETPACK_OFFER.price))return result(false,'Not enough cash.');
        state.gear.jetpack=true;
        return result(true,'Jetpack purchased. Press U on clear ground outside.',{cost:JETPACK_OFFER.price,gear:copy(state.gear)},'service-purchase');
      }
      if(item==='scanner'||item==='flares'){
        if(item==='scanner'&&state.gear.scanner)return result(false,'Scanner already owned.');
        if(item==='flares'&&state.gear.flares>9)return result(false,'No room for a full three-flare pack.');
        const cost=item==='scanner'?500:120;
        if(!spend(cost))return result(false,'Not enough cash.');
        if(item==='scanner')state.gear.scanner=true;else state.gear.flares+=3;
        return result(true,item==='scanner'?'Police scanner purchased.':'Three flares purchased.',{cost,gear:copy(state.gear)},'service-purchase');
      }
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
        if(state.equipment[weaponId]||Object.values(state.stashes).some(store=>store.weapons.includes(weaponId)))return result(false,'You already own this weapon.');
        cost=Math.ceil(profile.price*multiplier);effect={weaponId,ammo:profile.starterAmmo,...(weaponId==='pistol'?{pistol:true}:{})};
      }
    }else return result(false,'Unknown purchase.');
    if(!Number.isSafeInteger(cost)||cost<=0||!spend(cost))return result(false,'Not enough cash.');
    if(effect.weaponId&&!(item==='ammo'||item.startsWith('ammo:')))state.equipment[effect.weaponId]=true;
    return result(true,'Purchased.',{cost,...effect},'service-purchase');
  }
  function quoteDelivery(request,ctx){
    if(!commerceAllowed(ctx)||ctx.interior||ctx.paused||ctx.preview)return {ok:false,message:'Order outside on foot when ready.'};
    if(!object(request))return {ok:false,message:'Invalid delivery request.'};
    const method=deliveryMethod(request.method);
    if(!method)return {ok:false,message:'Choose a valid delivery method.'};
    const site=services.find(item=>item.id===request.sourceId);
    let cost,effect;
    if(request.kind==='food'&&site?.type==='food'&&request.itemId==='food'){
      if(ctx.health>=100)return {ok:false,message:'Health is already full.'};
      cost=site.price;effect={heal:site.heal};
    }else if(request.kind==='arms'&&site?.type==='arms'&&site.dealer&&site.fictional){
      const weapon=weaponById(request.itemId),multiplier=site.priceMultiplier??1;
      if(!weapon||!site.weaponIds?.includes(request.itemId)||!Number.isFinite(multiplier)||multiplier<=0)return {ok:false,message:'Item unavailable from this dealer.'};
      if(state.equipment[weapon.id]||Object.values(state.stashes).some(store=>store.weapons.includes(weapon.id)))return {ok:false,message:'You already own this weapon.'};
      cost=Math.ceil(weapon.price*multiplier);effect={weaponId:weapon.id,ammo:weapon.starterAmmo,...(weapon.id==='pistol'?{pistol:true}:{})};
    }else return {ok:false,message:'Delivery source unavailable.'};
    if(!Number.isSafeInteger(cost)||cost<=0||!object(effect)||Object.values(effect).some(value=>typeof value==='number'&&!Number.isFinite(value)))return {ok:false,message:'Delivery item unavailable.'};
    cost+=50;
    if(state.cash<cost)return {ok:false,message:'Not enough cash.'};
    return {ok:true,cost,dispatchCost:50,method,...effect};
  }
  function reserveDelivery(orderId,request,ctx){
    if(deliveryEscrow)return result(false,'A paid delivery is already pending.');
    if(orderId===lastDeliveryOrderId)return result(false,'This delivery was already paid.');
    const quote=quoteDelivery(request,ctx);if(!quote.ok)return result(false,quote.message);
    let live;try{live=options.deliveryOrder?.();}catch{return result(false,'Courier unavailable.');}
    if(!object(live))return result(false,'Book the matching physical courier first.');
    if(typeof orderId!=='string'||!orderId||live.orderId!==orderId||live.kind!==request.kind||
      live.sourceId!==request.sourceId||live.itemId!==request.itemId||deliveryMethod(live.method)!==quote.method)return result(false,'Book the matching physical courier first.');
    state.cash-=quote.cost;lastDeliveryOrderId=orderId;
    deliveryEscrow={orderId,kind:request.kind,sourceId:request.sourceId,itemId:request.itemId,method:quote.method,cost:quote.cost,effect:copy(quote)};
    return result(true,'Delivery paid. Meet the courier.',{orderId,cost:quote.cost,method:quote.method},'delivery-reserved');
  }
  function completeDelivery(orderId,ctx){
    if(!deliveryEscrow||deliveryEscrow.orderId!==orderId)return result(false,'No matching paid delivery.');
    let receipt;try{receipt=options.takeDeliveryReceipt?.(orderId);}catch{return result(false,'Delivery receipt unavailable.');}
    const pending=deliveryEscrow;
    if(!object(receipt)||!Object.isFrozen(receipt))return result(false,'Wait for the real courier handover.');
    const method=deliveryMethod(receipt.method),{type,risk}=receipt;
    const confiscated=type==='confiscated';
    const validRisk=confiscated ? method==='illegal'&&risk==='arrest' :
      risk===undefined || (type==='completed'&&method==='illegal'&&risk==='reported');
    if(receipt.orderId!==orderId||receipt.kind!==pending.kind||receipt.itemId!==pending.itemId||
      receipt.sourceId!==pending.sourceId||method!==pending.method||!validRisk||
      !['completed','failed','cancelled','confiscated'].includes(type))
      return result(false,'Wait for the real courier handover.');
    deliveryEscrow=null;
    if(confiscated)return result(true,'Delivery confiscated. The payment was forfeited.',{orderId,method,risk,confiscated:true,cost:pending.cost},'delivery-confiscated');
    const duplicate=pending.effect.weaponId&&(state.equipment[pending.effect.weaponId]||Object.values(state.stashes).some(store=>store.weapons.includes(pending.effect.weaponId)));
    if(type!=='completed'||!commerceAllowed(ctx)||ctx.interior||ctx.paused||ctx.preview||duplicate){
      state.cash=Math.min(MAX_CASH,state.cash+pending.cost);
      return result(true,'Delivery cancelled. Payment refunded.',{orderId,method,refund:pending.cost},'delivery-refunded');
    }
    const {cost,dispatchCost,ok,...effect}=pending.effect;
    if(effect.weaponId)state.equipment[effect.weaponId]=true;
    return result(true,'Delivery received.',{orderId,cost,...effect,...(risk?{risk}:{})},'delivery-complete');
  }
  function startActivity(id,type,ctx){
    if(type==='workout'&&options.interactiveWorkouts)return startWorkout(id,ctx);
    if(type==='robbery'&&options.interactiveRobbery){
      const reason=robberyEligibility(id,ctx);if(reason)return result(false,reason);
      const source=options.robberyTarget(id),target=source&&liveCrimeTarget(source.id,'employee');
      const blocked=employeeReason(serviceSite(services.find(s=>s.id===id)),target,ctx);if(blocked)return result(false,blocked);
      state.activity={type:'robbery',interactive:true,serviceId:id,targetId:target.id,roomId:target.roomId,name:'Holding up employee',phase:'intimidation',elapsed:0,duration:storyRobbery(id,ctx)?3:5,progress:0,respawnSerial:ctx.respawnSerial};
      return result(true,'Stay close while the employee empties the till.',{serviceId:id,targetId:target.id,point:{x:target.x,z:target.z}},'robbery-started');
    }
    const site=serviceGuard(id,ctx,{allowWanted:type==='robbery'});if(!site.id)return site;
    if(state.activeJob)return result(false,'Finish or cancel the job first.');
    if(type==='robbery'){
      if(!site.robbery||!equippedFirearm(ctx))return result(false,'Equip an owned firearm to threaten the till.');
      if(state.robberyCooldowns[id]>0&&!storyRobbery(id,ctx))return result(false,'The till is empty.');
    }else if(type==='workout'){
      if(site.type!=='gym'||state.fitnessLevel>=3)return result(false,'Training complete.');
      if(state.cash<site.price*(state.fitnessLevel+1))return result(false,'Not enough cash.');
    }else return result(false,'Unknown activity.');
    state.activity={type,serviceId:id,name:type==='robbery'?(storyRobbery(id,ctx)?3:4):8,elapsed:0,progress:0,
      cost:type==='workout'?site.price*(state.fitnessLevel+1):0,respawnSerial:ctx.respawnSerial};
    return result(true,type==='robbery'?'Stay near the till.':'Training started.',{serviceId:id,point:{x:site.x,z:site.z}},type+'-started');
  }
  const crewRenewals=Object.fromEntries(crewOffers.map(item=>[item.id,0]));
  function missionRecord(){
    const saved=copy(state),token=Object.freeze({weaponOwned:id=>saved.equipment[id]===true});
    return {token,saved,context:context&&copy(context),serial,crewRenewals:{...crewRenewals}};
  }
  function captureMissionState(){
    if(missionState||state.activity||deliveryEscrow)return null;
    missionState=missionRecord();return missionState.token;
  }
  function captureMissionStep(rootToken){
    if(!missionState||missionState.token!==rootToken||state.activity||deliveryEscrow)return null;
    const captured=missionRecord();
    // Only retained opaque tokens keep their snapshots alive. Root identity
    // invalidates every child when the attempt commits, cancels or is replaced.
    missionSteps.set(captured.token,{...captured,root:rootToken});
    return captured.token;
  }
  function restoreMissionState(token,respawnSerial,{keep=false}={}){
    if(!missionState||!Number.isSafeInteger(respawnSerial)||respawnSerial<0||typeof keep!=='boolean')return false;
    const child=missionSteps.get(token);
    const captured=missionState.token===token?missionState:child?.root===missionState.token?child:null;
    if(!captured)return false;
    Object.assign(state,copy(captured.saved));
    context=captured.context&&copy(captured.context);serial=state.activeJob?respawnSerial:captured.serial;
    Object.assign(crewRenewals,captured.crewRenewals);
    shiftPlan=null;workoutPlan=null;deliveryEscrow=null;events.length=0;if(!keep)missionState=null;
    return true;
  }
  function commitMissionState(token){
    if(!missionState||missionState.token!==token)return false;
    missionState=null;return true;
  }
  function saveInventory(profile,pools){
    if(!INVENTORY_PROFILES.includes(profile))return false;
    const inventory=normalizeAmmoInventory(pools);
    if(!inventory)return false;
    state.inventoryProfiles[profile]=inventory;return true;
  }
  function getInventory(profile){return INVENTORY_PROFILES.includes(profile)&&Object.hasOwn(state.inventoryProfiles,profile)?copy(state.inventoryProfiles[profile]):null;}
  function saveCrewHealth(id,health){
    if(!state.hiredCrew.includes(id)||!Number.isFinite(health)||health<0||health>100)return false;
    state.crewHealth[id]=health;return true;
  }
  function getCrewHealth(id){return state.hiredCrew.includes(id)?state.crewHealth[id]??100:null;}
  function commerceAllowed(ctx){return validContext(ctx)&&!ctx.sandbox&&!ctx.recovering&&ctx.onFoot&&!ctx.passenger&&!ctx.bus&&!ctx.ride&&Number.isFinite(ctx.health)&&ctx.health>0&&ctx.health<=100&&!state.activeJob&&!state.activity;}
  function ownsWatercraft(kind){return state.ownedWatercraft.includes(kind);}
  function buyWatercraft(kind,ctx){
    const offer=WATERCRAFT_OFFERS.find(item=>item.kind===kind);
    if(!offer)return result(false,'Unknown watercraft.');
    if(!commerceAllowed(ctx)||ctx.interior||ctx.preview||ctx.busy||ctx.swimming||ctx.watercraft||ctx.aircraft)
      return result(false,'Visit the Boat Shed on foot in Street Life or Campaign.');
    const dock=options.watercraftDock?.();
    if(!dock||![dock.x,dock.z,dock.radius].every(Number.isFinite)||dock.radius<=0||
      !near(ctx.pose,dock,dock.radius)||!clearApproach(dock,ctx))return result(false,'Move closer to the Boat Shed on foot.');
    if(ownsWatercraft(kind))return result(false,`${offer.name} already owned.`);
    if(!spend(offer.price))return result(false,'Not enough cash for this watercraft.');
    state.ownedWatercraft.push(kind);
    return result(true,`${offer.name} purchased.`,{kind,cost:offer.price},'watercraft-purchase');
  }
  function isSafehouse(roomId){return typeof roomId==='string'&&(roomId===map.storyHomes?.basement?.roomId||state.ownedProperties.includes(roomId));}
  function buyProperty(id,ctx){
    const home=propertyOffers.find(item=>item.id===id);
    if(!home||!commerceAllowed(ctx)||ctx.interior||!near(ctx.pose,home,3)||!clearApproach(home,ctx))return result(false,'Approach the house door on foot.');
    if(state.ownedProperties.includes(id))return result(false,'Safehouse already owned.');
    if(!spend(home.price))return result(false,'Not enough cash.');
    state.ownedProperties.push(id);state.stashes[id]=emptyStash();
    return result(true,'Safehouse purchased.',{roomId:id,cost:home.price},'property-purchase');
  }
  function restSafehouse(roomId,ctx){
    const cost=80;
    if(!commerceAllowed(ctx)||ctx.paused||ctx.preview||!isSafehouse(roomId)||ctx.interior?.roomId!==roomId||ctx.health>=100)return result(false,'Use the bed inside your safehouse when injured.');
    if(state.cash<cost)return result(false,'Not enough cash to rest.');
    let receipt;
    try{receipt=options.takeSafehouseRest?.(roomId,ctx);}catch{return result(false,'Safehouse rest unavailable.');}
    if(!object(receipt)||!Object.isFrozen(receipt)||receipt.roomId!==roomId||receipt.outcome!=='rested'||!Number.isSafeInteger(receipt.serial)||receipt.serial<=lastRestSerial)return result(false,'Finish resting at this safehouse bed first.');
    lastRestSerial=receipt.serial;state.cash-=cost;
    return result(true,'Rest complete.',{roomId,cost,heal:100,serial:receipt.serial},'safehouse-rest');
  }
  function hireCrew(id,ctx){
    const crew=crewOffers.find(item=>item.id===id);
    if(!crew||!commerceAllowed(ctx))return result(false,'Crew hire unavailable.');
    if(state.hiredCrew.includes(id)||state.hiredCrew.length>=2)return result(false,'Crew already hired or crew full.');
    if(!spend(crew.price))return result(false,'Not enough cash.');
    state.hiredCrew.push(id);state.crewHealth[id]=100;crewRenewals[id]++;
    return result(true,crew.name+' hired.',{crewId:id,cost:crew.price,renewalSerial:crewRenewals[id]},'crew-hired');
  }
  function rehireCrew(id,ctx){
    const crew=crewOffers.find(item=>item.id===id);
    if(!crew||!commerceAllowed(ctx)||!state.hiredCrew.includes(id))return result(false,'Crew renewal unavailable.');
    if(!spend(crew.price))return result(false,'Not enough cash.');
    crewRenewals[id]++;state.crewHealth[id]=100;
    return result(true,crew.name+' contract renewed.',{crewId:id,cost:crew.price,renewalSerial:crewRenewals[id]},'crew-hired');
  }
  function dismissCrew(id,ctx){
    if(!commerceAllowed(ctx)||!state.hiredCrew.includes(id))return result(false,'Crew dismissal unavailable.');
    state.hiredCrew.splice(state.hiredCrew.indexOf(id),1);delete state.crewHealth[id];return result(true,'Crew dismissed.',{crewId:id},'crew-dismissed');
  }
  function claimHouseLoot(ctx){
    const roomId=ctx?.burglaryRoomId,home=homes.find(item=>item.id===roomId);
    if(!commerceAllowed(ctx)||ctx.interior||ctx.preview||ctx.paused||ctx.recovery||!home||isSafehouse(roomId)||!near(ctx.pose,home,4)||!clearApproach(home,ctx))return result(false,'Leave the unowned house through its door with the loot.');
    if(state.burglaryCooldowns[roomId]>0)return result(false,'This house has no more loot yet.');
    const active=Object.values(state.burglaryCooldowns).filter(time=>time>0).length;
    if(active>=64)return result(false,'Wait for an earlier house search to clear.');
    let hash=2166136261;
    for(let i=0;i<roomId.length;i++)hash=Math.imul(hash^roomId.charCodeAt(i),16777619)>>>0;
    const baseReward=200+hash%401;
    if(state.cash>MAX_CASH-1200)return result(false,'Wallet full. Leave the loot for later.');
    let receipt;
    try{receipt=options.takeHouseLoot?.(roomId,ctx);}catch{return result(false,'House loot is unavailable.');}
    if(!object(receipt)||!Object.isFrozen(receipt)||receipt.roomId!==roomId||receipt.outcome!=='looted'||receipt.exited!==true||!Number.isInteger(receipt.count)||receipt.count<1||receipt.count>8||
      !Number.isSafeInteger(receipt.serial)||receipt.serial<=lastHouseLootSerial)return result(false,'Complete the real house search first.');
    const reward=Math.min(1200,baseReward*receipt.count);
    lastHouseLootSerial=receipt.serial;
    for(const id of Object.keys(state.burglaryCooldowns))if(state.burglaryCooldowns[id]<=0)delete state.burglaryCooldowns[id];
    state.burglaryCooldowns[roomId]=300;state.cash+=reward;
    return result(true,`House loot collected. Earned $${reward}.`,{roomId,reward,serial:receipt.serial},'burglary-complete');
  }
  function stash(roomId,action,kind,id,amount,ctx){
    if(!commerceAllowed(ctx)||!isSafehouse(roomId)||ctx.interior?.roomId!==roomId||!['deposit','withdraw'].includes(action)||!Number.isSafeInteger(amount)||amount<1)return result(false,'Use storage inside an owned safehouse.');
    const store=state.stashes[roomId]||emptyStash();
    if(kind==='cash'){
      if(action==='deposit'){if(amount>state.cash||store.cash>STASH_CASH_CAP-amount)return result(false,'Cash transfer unavailable.');state.cash-=amount;store.cash+=amount;}
      else{if(amount>store.cash||state.cash>MAX_CASH-amount)return result(false,'Cash transfer unavailable.');state.cash+=amount;store.cash-=amount;}
    }else{
      if(!transferStash(store,action,kind,id,amount,ctx))return result(false,'Inventory transfer unavailable.');
      if(kind==='weapon')state.equipment[id]=action==='withdraw';
    }
    state.stashes[roomId]=store;
    return result(true,'Safehouse storage updated.',{roomId,action,kind},'stash-transfer');
  }
  function buyDrone(ctx){
    const site=commerceAllowed(ctx)&&services.map(serviceSite).find(item=>item.type==='arms'&&near(ctx.pose,item,item.radius)&&clearApproach(item,ctx)&&serviceAllowed(item,ctx));
    return site?purchaseService(site.id,'drone',ctx):result(false,'Visit an arms dealer first.');
  }
  function buyDroneStrike(ctx){
    const site=commerceAllowed(ctx)&&services.map(serviceSite).find(item=>item.type==='arms'&&near(ctx.pose,item,item.radius)&&clearApproach(item,ctx)&&serviceAllowed(item,ctx));
    return site?purchaseService(site.id,'drone-strike',ctx):result(false,'Visit an arms dealer first.');
  }
  function payRental(amount,ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.wanted>0||![20,30].includes(amount))return result(false,'Hire unavailable.');
    if(!spend(amount))return result(false,'Not enough cash for this ride.');
    return result(true,`Ride hired for $${amount}.`,{cost:amount},'rental-started');
  }
  function payCarRental(modelId, ctx, place) {
    const offer=CAR_RENTAL_OFFERS.find(car=>car.modelId===modelId);
    if (!offer || !validContext(ctx) || !ctx.onFoot || ctx.recovering || ctx.interior || ctx.passenger ||
      ctx.vehicle?.rented || state.activeJob || state.activity) return result(false,'Car rental unavailable.');
    const cost=ctx.sandbox?0:offer.price;
    if (state.cash<cost) return result(false,'Not enough cash for that rental.');
    if (typeof place!=='function' || !place()) return result(false,'The pickup bay is blocked. Try again when it clears.');
    spend(cost);
    return result(true,'Car rented.',{cost},'car-rental-started');
  }
  function payRide(amount, ctx) {
    if (!validContext(ctx) || ctx.sandbox || ctx.recovering || !ctx.onFoot || ctx.wanted > 0 || state.activeJob || state.activity || !Number.isSafeInteger(amount) || amount < 8 || amount > 400) return result(false, 'Yoober booking unavailable.');
    if (!spend(amount)) return result(false, 'Not enough cash for this fare.');
    return result(true, `Yoober fare paid: $${amount}.`, { cost: amount }, 'ride-purchase');
  }
  function nitroOffer(driving, ctx) {
    if (!options.nitroStations?.length || !validContext(ctx)) return null;
    return nitroRefillQuote(options.nitroStations, driving, ctx, state.cash, options.hasLineOfSight);
  }
  function refillNitro(driving, ctx) {
    const offer = nitroOffer(driving, ctx);
    if (!offer?.ok) return result(false, offer?.reason || 'Stop on a marked petrol station nitro bay first.');
    if (offer.cost && !spend(offer.cost)) return result(false, `You need $${offer.cost} for nitro.`);
    driving.nitroFuel = 1;
    return result(true, offer.cost ? `Nitro refilled for $${offer.cost}.` : 'Nitro refilled.', { cost: offer.cost, stationId: offer.station.id }, 'nitro-refill');
  }
  function absorbArmour(damage) {
    const charge=state.gear.armour??0;
    if(!Number.isFinite(damage)||damage<=0||charge<=0)return damage;
    const absorbed=Math.min(charge,damage*.7);
    state.gear.armour=charge-absorbed;
    return damage-absorbed;
  }
  function utilityAvailability(item,ctx) {
    const kit=Object.hasOwn(UTILITY_GEAR,item)&&item!=='armour'?UTILITY_GEAR[item]:null;
    const deny=message=>({ok:false,message});
    if(!kit)return deny('Unknown utility item.');
    if(!validContext(ctx)||ctx.preview||ctx.paused||ctx.recovering||!ctx.onFoot||
      ctx.passenger||ctx.bus||ctx.ride||!Number.isFinite(ctx.health)||ctx.health<=0||ctx.health>100)
      return deny('Use a kit on foot after recovering.');
    const remaining=gearForMode(state.gear,ctx.sandbox)[kit.field]??0;
    if(!remaining)return deny(`Buy a ${kit.name.toLowerCase()} first.`);
    const supply=ctx.sandbox?{remaining,practice:true}:{remaining};
    if(item==='medkit'){
      if(ctx.health>=100)return deny('Health is already full.');
      return {ok:true,heal:Math.min(kit.amount,100-ctx.health),...supply};
    }
    if(item==='jammer'){
      if(!Number.isFinite(ctx.jammerTargets)||ctx.jammerTargets<=0)return deny('No active camera is close enough to jam.');
      return {ok:true,...supply};
    }
    if(ctx.interior||!ctx.vehiclePose||!near(ctx.pose,ctx.vehiclePose,5)||!isVehicleStopped(ctx.vehiclePose,.6)||
      (options.hasLineOfSight&&!options.hasLineOfSight(ctx.pose,ctx.vehiclePose)))
      return deny('Stand next to your stopped car outside.');
    if(ctx.vehicleHealth<0||ctx.vehicleHealth>=100)return deny('The car does not need repairs.');
    return {ok:true,vehicleHealth:Math.min(100,ctx.vehicleHealth+kit.amount),...supply};
  }
  function useUtility(item,ctx) {
    const {ok,message,remaining,...effect}=utilityAvailability(item,ctx);
    if(!ok)return ctx?.sandbox?{ok,message}:result(false,message);
    const kit=UTILITY_GEAR[item];
    if(ctx.sandbox)return {ok:true,message:`${kit.name} used.`,kind:item,remaining,...effect};
    state.gear[kit.field]=remaining-1;
    return result(true,`${kit.name} used.`,{kind:item,remaining:remaining-1,...effect},'utility-used');
  }
  function consumeThrowable(kind,ctx) {
    const item=Object.hasOwn(THROWABLES,kind)?THROWABLES[kind]:null;
    if(!item)return result(false,'Unknown throwable.');
    if(!validContext(ctx)||ctx.recovering||!ctx.onFoot||ctx.interior||ctx.passenger||ctx.bus||ctx.ride||state.activity||state.activeJob?.type==='ride'||!Number.isFinite(ctx.health)||ctx.health<=0||ctx.health>100)return result(false,'Throw outside on foot after recovering.');
    if(ctx.sandbox)return {ok:true,message:`${item.name} practice throw.`,kind,practice:true};
    if(state.gear[item.field]<1)return result(false,`Buy a ${item.name.toLowerCase()} first.`);
    state.gear[item.field]--;
    return result(true,`${item.name} thrown.`,{kind,remaining:state.gear[item.field]},'throwable-used');
  }
  function consumeFlare(ctx) {
    const practice=!!ctx?.sandbox;
    if(!validContext(ctx)||ctx.recovering||!ctx.onFoot||ctx.interior||ctx.passenger||ctx.bus||ctx.ride||
      (!practice&&(state.activity||state.activeJob?.type==='ride'))){
      const message='Throw flares outside on foot.';
      return practice?{ok:false,message}:result(false,message);
    }
    if(practice)return {ok:true,message:'Flare thrown.',flares:gearForMode(state.gear,true).flares,practice:true};
    if(state.gear.flares<1)return result(false,'Buy a flare pack first.');
    state.gear.flares--;
    return result(true,'Flare thrown.',{flares:state.gear.flares},'flare-used');
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
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.respawnSerial!==active.respawnSerial)return null;
    const work=workStation(active.serviceId);
    if(!work||work.plan!==shiftPlan||work.plan.id!==active.planId||work.session.sessionId!==active.sessionId||
      work.station.id!==active.station.id||!near(ctx.pose,active.station,active.station.radius)||
      !clearApproach(active.station,ctx)||!serviceAllowed(work.site,ctx)||
      !(work.session.active||work.session.phase==='complete'))return null;
    return work;
  }
  function startShift(serviceId,ctx){
    if(!remember(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot)return result(false,'Shift unavailable.');
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
  function workoutStation(serviceId){
    const work=options.workSession?.(),plan=work?.plan,session=work?.session;
    const source=services.find(site=>site.id===serviceId&&site.type==='gym');
    if(!source||!plan||!Object.isFrozen(plan)||plan.type!=='gym'||plan.serviceId!==serviceId||typeof plan.id!=='string'||!plan.id||
      !Array.isArray(plan.activities)||!Object.isFrozen(plan.activities)||!session||session.planId!==plan.id||
      !Number.isSafeInteger(session.sessionId)||session.sessionId<1||session.sandbox!==false)return null;
    const station=plan.activities.find(item=>item.id===session.station?.id&&isWorkoutKind(item.kind));
    if(!station||!Object.isFrozen(station)||!Number.isFinite(station.x)||!Number.isFinite(station.z)||!Number.isFinite(station.yaw)||
      !Number.isFinite(station.radius)||station.radius<=0||session.kind!==station.kind||
      !['id','kind','label','x','z','yaw','radius'].every(key=>session.station[key]===station[key]))return null;
    return {plan,session,station,site:serviceSite(source)};
  }
  const workoutRunning=session=>session.active===true&&['grip','prepare','cue','lift','drive','stride','release','return'].includes(session.phase);
  function workoutAdmission(serviceId,ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering)return {reason:'Training is unavailable here.'};
    if(!ctx.onFoot)return {reason:'Step out of the car first.'};
    if(ctx.wanted>0)return {reason:'Lose the police first.'};
    if(state.activeJob||state.activity)return {reason:'Finish or cancel the current activity first.'};
    const site=serviceSite(services.find(item=>item.id===serviceId&&item.type==='gym'));
    if(!site||!serviceAllowed(site,ctx))return {reason:'Enter this gym first.'};
    if(state.fitnessLevel>=3)return {reason:'Training complete.'};
    const cost=site.price*(state.fitnessLevel+1);
    if(!Number.isSafeInteger(cost)||cost<=0)return {reason:'Training is unavailable here.'};
    if(state.cash<cost)return {reason:'Not enough cash.'};
    const work=workoutStation(serviceId);
    if(!work||!workoutRunning(work.session))return {reason:'Start an exercise at its equipment first.'};
    if(!near(ctx.pose,work.station,work.station.radius)||!clearApproach(work.station,ctx))return {reason:'Stay close to the exercise equipment with a clear view.'};
    return {reason:'',work,cost};
  }
  function workoutEligibility(serviceId,ctx){return workoutAdmission(serviceId,ctx).reason;}
  function startWorkout(serviceId,ctx){
    const admission=workoutAdmission(serviceId,ctx);
    if(admission.reason)return result(false,admission.reason);
    const {work,cost}=admission;
    remember(ctx);workoutPlan=work.plan;
    state.activity={type:'workout',serviceId,name:work.station.label,elapsed:0,progress:0,cost,
      station:Object.freeze({...work.station}),planId:work.plan.id,sessionId:work.session.sessionId,respawnSerial:ctx.respawnSerial};
    return result(true,'Training started. Complete the set to pay for training.',{serviceId,cost,point:{x:work.station.x,z:work.station.z}},'workout-started');
  }
  function workoutContext(active,ctx){
    if(!validContext(ctx)||ctx.sandbox||ctx.recovering||!ctx.onFoot||ctx.wanted>0||ctx.respawnSerial!==active.respawnSerial)return null;
    const work=workoutStation(active.serviceId);
    if(!work||work.plan!==workoutPlan||work.plan.id!==active.planId||work.session.sessionId!==active.sessionId||
      !['id','kind','label','x','z','yaw','radius'].every(key=>work.station[key]===active.station[key])||
      !near(ctx.pose,work.station,work.station.radius)||!clearApproach(work.station,ctx)||!serviceAllowed(work.site,ctx)||
      !(workoutRunning(work.session)||work.session.active===false&&work.session.phase==='complete'))return null;
    return work;
  }
  function finishWorkout(ctx,success){
    const active=state.activity;
    if(!active||active.type!=='workout'||!options.interactiveWorkouts)return result(false,'No exercise session is active.');
    const work=workoutContext(active,ctx);
    state.activity=null;workoutPlan=null;
    if(success!==true||!work||work.session.active||work.session.phase!=='complete')return result(false,'Exercise ended without a completed set. No training charged.',{},'activity-ended');
    if(state.fitnessLevel>=3||!spend(active.cost))return result(false,'Training is unavailable.',{},'activity-ended');
    state.fitnessLevel++;return result(true,`Set complete. Fitness ${state.fitnessLevel}/3.`,{serviceId:active.serviceId,cost:active.cost,kind:active.station.kind},'workout-complete');
  }
  return { state, jobs, garage,captureMissionState,captureMissionStep,restoreMissionState,commitMissionState,saveInventory,getInventory,saveCrewHealth,getCrewHealth,propertyOffers,crewOffers,buyProperty,restSafehouse,isSafehouse,hireCrew,rehireCrew,dismissCrew,buyDrone,claimHouseLoot,stash,get ownedProperties(){return [...state.ownedProperties];},crewRenewalSerial(id){return crewRenewals[id]??0;},get services(){return services.map(serviceSite);},canUseService:serviceAllowed, startJob, update, buyVehicle, upgradeVehicle, upgradeEligibility, vehicleMods, repairVehicle, paintVehicle, storeVehicle, retrieveVehicle, penalize,purchaseService,quoteDelivery,reserveDelivery,completeDelivery,startActivity,startMugging,robberyEligibility,workoutEligibility,finishWorkout,payRental,payRide,consumeFlare,consumeThrowable,rideEligibility,prepareStarterVehicle,redeemDevCode,startShift,finishShift,
    nitroOffer, refillNitro, buyDroneStrike, payCarRental, ownsWatercraft, buyWatercraft, absorbArmour, utilityAvailability, useUtility,
    cancelActivity(){if(!state.activity)return false;state.activity=null;shiftPlan=null;workoutPlan=null;return true;},
    cancelJob() { if (!state.activeJob) return result(false, 'No active job.'); state.activeJob = null; return result(true, 'Job cancelled.', {}, 'job-cancelled'); },
    serialize() { return copy({ version: 1, cash: Math.min(MAX_CASH,state.cash+(deliveryEscrow?.cost||0)), ownedVehicles: state.ownedVehicles, completedJobs: state.completedJobs,equipment:state.equipment,gear:state.gear,fitnessLevel:state.fitnessLevel,robberyCooldowns:state.robberyCooldowns,muggingCooldowns:state.muggingCooldowns,...(state.ownedWatercraft.length?{ownedWatercraft:state.ownedWatercraft}:{}),...(state.ownedProperties.length?{ownedProperties:state.ownedProperties}:{}),...(Object.keys(state.stashes).length?{stashes:state.stashes}:{}),...(state.hiredCrew.length?{hiredCrew:state.hiredCrew}:{}),...(Object.keys(state.inventoryProfiles).length?{inventoryProfiles:state.inventoryProfiles}:{}),...(Object.keys(state.crewHealth).length?{crewHealth:state.crewHealth}:{}),...(Object.keys(state.burglaryCooldowns).length?{burglaryCooldowns:state.burglaryCooldowns}:{}) }); },
    drainEvents() { return events.splice(0); },
  };
}
