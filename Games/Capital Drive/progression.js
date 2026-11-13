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

export function createProgression(map, saved = null) {
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
  const state = { cash: 1000, ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 100, stored: false }], completedJobs: [], activeJob: null, message: 'Career ready. Take the Crescent parcel job.' };
  if (saved !== null) {
    if (!object(saved) || !exactKeys(saved, ['version', 'cash', 'ownedVehicles', 'completedJobs']) || saved.version !== 1 || !Number.isSafeInteger(saved.cash) || saved.cash < 0 || saved.cash > MAX_CASH || !Array.isArray(saved.ownedVehicles) || saved.ownedVehicles.length < 1 || saved.ownedVehicles.length > CARS.length || !Array.isArray(saved.completedJobs) || saved.completedJobs.length > jobs.length) throw new Error('Unsupported or corrupt career save.');
    const ids = new Set();
    for (const car of saved.ownedVehicles) {
      if (!object(car) || !exactKeys(car, ['id', 'color', 'health', 'stored']) || !CARS.some(item => item.id === car.id) || ids.has(car.id) || !COLOR.test(car.color) || !Number.isFinite(car.health) || car.health < 0 || car.health > 100 || typeof car.stored !== 'boolean') throw new Error('Invalid saved garage.');
      ids.add(car.id);
    }
    if (!ids.has('lantern') || new Set(saved.completedJobs).size !== saved.completedJobs.length || saved.completedJobs.some(id => !jobs.some(job => job.id === id)) || saved.completedJobs.some(id => jobs.find(job => job.id === id).requires.some(required => !saved.completedJobs.includes(required)))) throw new Error('Invalid saved career progress.');
    state.cash = saved.cash;
    state.ownedVehicles = copy(saved.ownedVehicles);
    state.completedJobs = [...saved.completedJobs];
  }
  const events = [];
  const earnedThisRun = new Set();
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
    if (state.activeJob) return result(false, 'Finish or cancel the current job first.');
    const job = jobs.find(item => item.id === id);
    if (!job) return result(false, 'Unknown job.');
    if (job.requires.some(required => !state.completedJobs.includes(required))) return result(false, 'Complete the earlier jobs to unlock this job.');
    if (earnedThisRun.has(id)) return result(false, 'This job has already paid this run.');
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
    earnedThisRun.add(job.id);
    if (!state.completedJobs.includes(job.id)) state.completedJobs.push(job.id);
    state.cash = Math.min(MAX_CASH, state.cash + job.reward);
    state.activeJob = null;
    result(true, `${job.name} complete. Earned $${job.reward}.`, { jobId: job.id, reward: job.reward }, 'job-complete');
  }
  function update(dt, ctx) {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('Career dt must be finite and nonnegative.');
    if (!remember(ctx)) return;
    if (dt === 0) return;
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
  function penalize(reason = 'Respawn') {
    state.activeJob = null;
    const cost = Math.min(250, state.cash); state.cash -= cost;
    return result(true, `${reason}: $${cost} deducted. Completed jobs kept.`, { cost }, 'penalty');
  }
  return { state, jobs, garage, startJob, update, buyVehicle, repairVehicle, paintVehicle, storeVehicle, penalize,
    cancelJob() { if (!state.activeJob) return result(false, 'No active job.'); state.activeJob = null; return result(true, 'Job cancelled.', {}, 'job-cancelled'); },
    serialize() { return copy({ version: 1, cash: state.cash, ownedVehicles: state.ownedVehicles, completedJobs: state.completedJobs }); },
    drainEvents() { return events.splice(0); },
  };
}
