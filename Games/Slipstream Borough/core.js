import { CARS, BY_ID } from '../../assets/car-arcade/fleet.js';
import { WORLD, blocked, clearPath, chaseTarget, nearPath } from './world.js';

export const CAR_UNLOCKS = Object.freeze({bricklet:0,pip:1200,parcel:3000,finch:6000,lantern:10000,comet:15000,orchard:22000,pebble:30000,dockside:40000,horizon:55000,morrow:70000,gravel:90000,relay:115000,tempest:140000,atlas:170000,sunray:200000});

const MONEY = 1e9, COUNTER = 1e9, MAX_TIME = 240;
const LANES = [-5.25, -1.75, 1.75, 5.25];
const RIVAL_LANES = [-5.25, -1.75, 5.25];
const CITY_CORNERS = [{x:-50,z:50},{x:-50,z:-50},{x:50,z:-50},{x:50,z:50}];
export const GADGETS = Object.freeze({
  none: Object.freeze({name:'No gadget', category:'utility', unlockDistance:0, price:0, charges:0, duration:0, cooldown:0}),
  smoke: Object.freeze({name:'Smoke screen', category:'discreet', unlockDistance:500, price:150, charges:3, duration:5, cooldown:10}),
  decoy: Object.freeze({name:'Decoy beacon', category:'discreet', unlockDistance:1500, price:220, charges:2, duration:6, cooldown:12}),
  emp: Object.freeze({name:'EMP pulse', category:'loud', unlockDistance:2500, price:250, charges:2, duration:3, cooldown:9}),
  boost: Object.freeze({name:'Boost pack', category:'loud', unlockDistance:1000, price:200, charges:3, duration:4, cooldown:10}),
  repair: Object.freeze({name:'Repair kit', category:'utility', unlockDistance:3500, price:350, charges:2, duration:0, cooldown:15})
});
const LEGACY_KEYS = ['version', 'cash', 'owned', 'selected', 'upgrades', 'level', 'best', 'nextRun', 'settledRun', 'testMode'];
const PROFILE_KEYS = [...LEGACY_KEYS, 'customizations', 'careerDistance', 'escapes'];
const RUN_KEYS = ['id', 'mode', 'status', 'carId', 'upgrades', 'stats', 'level', 'distance', 'speed', 'x', 'hp', 'heat', 'score', 'earnings', 'traffic', 'police', 'rivals', 'elapsed', 'finishDistance', 'place', 'seed', 'nextEntity', 'spawnClock', 'collisionCooldown', 'nearMisses', 'collisions', 'arrest', 'finishTime', 'appearance', 'gadget', 'charges', 'deployments', 'gadgetTime', 'gadgetCooldown', 'gadgetHeld', 'world', 'pursuit', 'escapeClock', 'gadgetTarget'];
const ENTITY_KEYS = ['id', 'carId', 'x', 'distance', 'speed', 'passed', 'hit', 'finishTime'];
const STAT_KEYS = ['speed', 'acceleration', 'handling', 'toughness'];

// Inspect data descriptors before reading any untrusted profile/run fields.
function record(value, keys, required = keys) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected plain record');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || !keys.includes(key) || !('value' in descriptors[key]))) throw new TypeError('Invalid fields');
  if (required.some(key => !Object.hasOwn(descriptors, key))) throw new TypeError('Missing fields');
}
function array(value, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) throw new TypeError('Invalid array');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) throw new TypeError('Invalid array fields');
  for (let i = 0; i < value.length; i++) if (!descriptors[i] || !('value' in descriptors[i])) throw new TypeError('Invalid array entry');
}
function number(value, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RangeError('Number outside bounds');
}
function boolean(value) { if (typeof value !== 'boolean') throw new TypeError('Expected boolean'); }
function car(id) {
  if (typeof id !== 'string' || !Object.hasOwn(BY_ID, id)) throw new RangeError('Unknown car');
  return BY_ID[id];
}
function levels(value) {
  record(value, ['engine', 'handling', 'armor']);
  for (const key of ['engine', 'handling', 'armor']) number(value[key], 0, 5, true);
  return { engine: value.engine, handling: value.handling, armor: value.armor };
}
const zeroLevels = () => ({ engine: 0, handling: 0, armor: 0 });
const stockCustom = id => ({paint:car(id).color, wheels:'#d0d0d0', stripe:null, spoiler:false, gadget:'none', gadgets:[]});
function color(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError('Expected #RRGGBB color');
  return value.toLowerCase();
}
function gadget(value) {
  if (typeof value !== 'string' || !Object.hasOwn(GADGETS,value)) throw new RangeError('Unknown gadget');
  return GADGETS[value];
}
function custom(raw, legacy = false) {
  record(raw,legacy?['paint','wheels','gadget','gadgets']:['paint','wheels','gadget','gadgets','stripe','spoiler']); array(raw.gadgets,5); gadget(raw.gadget);
  const stripe=legacy?null:raw.stripe, spoiler=legacy?false:raw.spoiler;
  if(stripe!==null)color(stripe);boolean(spoiler);
  const gadgets=raw.gadgets.map(id=>{gadget(id);if(id==='none')throw new RangeError('Invalid owned gadget');return id;});
  if (new Set(gadgets).size!==gadgets.length || raw.gadget!=='none'&&!gadgets.includes(raw.gadget)) throw new RangeError('Gadget not owned');
  return {paint:color(raw.paint),wheels:color(raw.wheels),stripe:stripe===null?null:color(stripe),spoiler,gadget:raw.gadget,gadgets};
}
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function effective(id, upgrades) {
  const base = car(id);
  return Object.freeze({ speed: base.speed * (1 + upgrades.engine * 0.07), acceleration: base.acceleration * (1 + upgrades.engine * 0.12), handling: base.handling * (1 + upgrades.handling * 0.12), toughness: base.toughness * (1 + upgrades.armor * 0.16) });
}

export function freshProfile() {
  return { version: 3, careerDistance:0, escapes:0, cash: 0, owned: ['bricklet'], selected: 'bricklet', upgrades: { bricklet: zeroLevels() }, level: 0, best: 0, nextRun: 1, settledRun: 0, testMode: false, customizations:{bricklet:stockCustom('bricklet')} };
}
export function validateProfile(raw) {
  record(raw, PROFILE_KEYS, LEGACY_KEYS);
  if (![1,2,3].includes(raw.version) || (raw.version===1 && Object.hasOwn(raw,'customizations')) || (raw.version>=2 && !Object.hasOwn(raw,'customizations'))) throw new RangeError('Unsupported save');
  if(raw.version===3){number(raw.careerDistance,0,COUNTER,true);number(raw.escapes,0,COUNTER,true);}
  else if(Object.hasOwn(raw,'careerDistance')||Object.hasOwn(raw,'escapes'))throw new RangeError('Invalid legacy counters');
  number(raw.cash, 0, MONEY, true); number(raw.best, 0, MONEY, true);
  number(raw.level, 0, 12, true); number(raw.nextRun, 1, COUNTER, true); number(raw.settledRun, 0, raw.nextRun - 1, true);
  boolean(raw.testMode); array(raw.owned, 16);
  const owned = raw.owned.map(id => { car(id); return id; });
  if (!owned.includes('bricklet') || new Set(owned).size !== owned.length || typeof raw.selected !== 'string' || !owned.includes(raw.selected)) throw new RangeError('Invalid ownership');
  record(raw.upgrades, owned, []);
  const upgrades = {};
  for (const id of owned) upgrades[id] = Object.hasOwn(raw.upgrades, id) ? levels(raw.upgrades[id]) : zeroLevels();
  if (raw.testMode && (raw.cash !== MONEY || owned.length !== CARS.length)) throw new RangeError('Invalid test profile');
  const customizations={};
  if(raw.version>=2) record(raw.customizations,owned,[]);
  for(const id of owned) customizations[id]=raw.version>=2&&Object.hasOwn(raw.customizations,id)?custom(raw.customizations[id],raw.version===2):stockCustom(id);
  return { version: 3, careerDistance:raw.version===3?raw.careerDistance:0, escapes:raw.version===3?raw.escapes:0, cash: raw.cash, owned, selected: raw.selected, upgrades, level: raw.level, best: raw.best, nextRun: raw.nextRun, settledRun: raw.settledRun, testMode: raw.testMode, customizations };
}
export function carStats(profile, id) {
  const p = validateProfile(profile);
  if (id === undefined) id = p.selected;
  car(id);
  if (!p.owned.includes(id)) throw new RangeError('Car not owned');
  return effective(id, p.upgrades[id]);
}
export function buyCar(profile, id) {
  const p = validateProfile(profile); car(id);
  if (p.owned.includes(id)) throw new RangeError('Already owned');
  if (!p.testMode && p.careerDistance < CAR_UNLOCKS[id]) throw new RangeError('Mileage locked');
  p.owned.push(id); p.upgrades[id] = zeroLevels(); p.customizations[id]=stockCustom(id);
  return p;
}
export function selectCar(profile, id) {
  const p = validateProfile(profile); car(id);
  if (!p.owned.includes(id)) throw new RangeError('Car not owned');
  p.selected = id; return p;
}
export function customizeCar(profile,id,appearance) {
  const p=validateProfile(profile);car(id);record(appearance,['paint','wheels','stripe','spoiler'],['paint','wheels']);
  if(!p.owned.includes(id))throw new RangeError('Car not owned');
  p.customizations[id].paint=color(appearance.paint);p.customizations[id].wheels=color(appearance.wheels);
  if(Object.hasOwn(appearance,'stripe'))p.customizations[id].stripe=appearance.stripe===null?null:color(appearance.stripe);
  if(Object.hasOwn(appearance,'spoiler')){boolean(appearance.spoiler);p.customizations[id].spoiler=appearance.spoiler;}
  return p;
}
export function fitGadget(profile,id,kind) {
  const p=validateProfile(profile), spec=gadget(kind);car(id);
  if(!p.owned.includes(id))throw new RangeError('Car not owned');
  const c=p.customizations[id];
  if(kind!=='none'&&!c.gadgets.includes(kind)) {
    if(!p.testMode&&p.careerDistance<spec.unlockDistance)throw new RangeError('Mileage locked');
    if(!p.testMode&&p.cash<spec.price)throw new RangeError('Insufficient cash');
    if(!p.testMode)p.cash-=spec.price;c.gadgets.push(kind);
  }
  c.gadget=kind;return p;
}
export function upgradeCost(profile, id, kind) {
  const p = validateProfile(profile); car(id);
  if (!p.owned.includes(id) || !['engine', 'handling', 'armor'].includes(kind)) throw new RangeError('Invalid upgrade');
  const level = p.upgrades[id][kind];
  if (level === 5) throw new RangeError('Upgrade at maximum');
  return p.testMode ? 0 : 250 * (level + 1) ** 2;
}
export function upgradeCar(profile, id, kind) {
  const p = validateProfile(profile), cost = upgradeCost(p, id, kind);
  if (!p.testMode && p.cash < cost) throw new RangeError('Upgrade unavailable');
  if (!p.testMode) p.cash -= cost;
  p.upgrades[id][kind]++; return p;
}
export function applyCode(profile, text) {
  const p = validateProfile(profile);
  if (typeof text !== 'string' || text.length > 64) throw new TypeError('Invalid phrase');
  if (text.trim().toLowerCase() === 'tanayr') {
    p.testMode = true; p.cash = MONEY;
    for (const { id } of CARS) if (!p.owned.includes(id)) { p.owned.push(id); p.upgrades[id] = zeroLevels(); p.customizations[id]=stockCustom(id); }
  }
  return p;
}

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0;
  return run.seed / 4294967296;
}
function entity(run, carId, x, distance, speed) {
  return { id: run.nextEntity++, carId, x, distance, speed, passed: false, hit: false, finishTime: null };
}
export function startRun(profile, mode) {
  const p = validateProfile(profile);
  if (!['cutup', 'race', 'roam'].includes(mode)) throw new RangeError('Invalid mode');
  if (p.nextRun === COUNTER) throw new RangeError('Run counter exhausted');
  const id = p.nextRun++;
  const run = { id, mode, status: 'running', carId: p.selected, upgrades: { ...p.upgrades[p.selected] }, stats: { ...effective(p.selected, p.upgrades[p.selected]) }, level: p.level, distance: 0, speed: 0, x: 1.75, hp: 100, heat: 0, score: 0, earnings: 0, traffic: [], police: [], rivals: [], elapsed: 0, finishDistance: 1200 + 150 * p.level, place: 1, seed: id >>> 0, nextEntity: 1, spawnClock: 0, collisionCooldown: 0, nearMisses: 0, collisions: 0, arrest: 0, finishTime: null, appearance:{paint:p.customizations[p.selected].paint,wheels:p.customizations[p.selected].wheels,stripe:p.customizations[p.selected].stripe,spoiler:p.customizations[p.selected].spoiler}, gadget:p.customizations[p.selected].gadget, charges:mode!=='race'?gadget(p.customizations[p.selected].gadget).charges:0, deployments:0, gadgetTime:0, gadgetCooldown:0, gadgetHeld:false };
  Object.assign(run,{world:{x:0,z:0,heading:0},pursuit:mode==='cutup'?'chased':'roaming',escapeClock:0,gadgetTarget:{x:0,z:0}});
  if(mode==='roam') {
    run.finishDistance=100000;
    for(const [i,point] of CITY_CORNERS.entries()) {
      const npc=entity(run,['pip','parcel','finch','orchard'][i],0,0,8+i), target=CITY_CORNERS[(i+1)%4];
      npc.world={...point,heading:Math.atan2(point.x-target.x,point.z-target.z)};
      run.traffic.push(npc);
    }
  }
  if (mode === 'race') {
    for (let i = 0; i < 3; i++) run.rivals.push(entity(run, ['pip', 'finch', 'comet'][i], RIVAL_LANES[i], 0, 0));
  }
  return { profile: p, run };
}
function totals(run) {
  const score = Math.min(MONEY, Math.floor(run.distance * 2) + run.nearMisses * 100);
  let earnings = 0;
  if (run.status !== 'running') {
    const prize = run.status === 'finished' ? [0, 400, 220, 120, 60][run.place] : run.status === 'escaped' ? 180 : 0;
    earnings = Math.min(MONEY, Math.floor(run.distance * 0.32) + run.nearMisses * 30 + prize);
  }
  return { score, earnings };
}
function checkRun(raw) {
  record(raw, RUN_KEYS); car(raw.carId); levels(raw.upgrades); record(raw.stats, STAT_KEYS);
  record(raw.appearance,['paint','wheels','stripe','spoiler']);color(raw.appearance.paint);color(raw.appearance.wheels);
  if(raw.appearance.stripe!==null)color(raw.appearance.stripe);boolean(raw.appearance.spoiler);
  pose(raw.world);record(raw.gadgetTarget,['x','z']);number(raw.gadgetTarget.x,-WORLD.limit,WORLD.limit);number(raw.gadgetTarget.z,-WORLD.limit,WORLD.limit);
  number(raw.escapeClock,0,6);if(!['roaming','chased'].includes(raw.pursuit))throw new RangeError('Invalid pursuit');
  if(raw.mode==='roam'&&blocked(raw.world.x,raw.world.z))throw new RangeError('Blocked pose');
  if(raw.mode==='race'&&raw.pursuit!=='roaming'||raw.mode==='cutup'&&raw.pursuit!=='chased')throw new RangeError('Invalid pursuit mode');
  const kit=gadget(raw.gadget), capacity=raw.mode!=='race'?kit.charges:0;
  number(raw.charges,0,capacity,true);number(raw.deployments,0,capacity,true);
  number(raw.gadgetTime,0,raw.mode!=='race'?kit.duration:0);number(raw.gadgetCooldown,0,raw.mode!=='race'?kit.cooldown:0);boolean(raw.gadgetHeld);
  if(raw.charges+raw.deployments!==capacity || (raw.gadgetTime>0||raw.gadgetCooldown>0)&&raw.deployments===0)throw new RangeError('Invalid gadget state');
  const stats = effective(raw.carId, raw.upgrades);
  for (const key of STAT_KEYS) if (raw.stats[key] !== stats[key]) throw new RangeError('Invalid vehicle stats');
  number(raw.id, 1, COUNTER - 1, true); number(raw.level, 0, 12, true);
  if (!['cutup', 'race', 'roam'].includes(raw.mode) || !['running', 'escaped', 'busted', 'finished', 'parked'].includes(raw.status)) throw new RangeError('Invalid run');
  if (raw.finishDistance !== (raw.mode==='roam'?100000:1200 + 150 * raw.level)) throw new RangeError('Invalid endpoint');
  number(raw.elapsed, 0, MAX_TIME); number(raw.distance, 0, raw.finishDistance);
  if (raw.distance > stats.speed * (raw.gadget==='boost'?1.35:1) * raw.elapsed + 1e-7) throw new RangeError('Impossible distance');
  number(raw.speed, 0, stats.speed * (raw.gadget==='boost'&&raw.gadgetTime>0?1.35:1)); number(raw.x, -6.2, 6.2); number(raw.hp, 0, 100); number(raw.heat, 0, 5);
  number(raw.place, 1, 4, true); number(raw.seed, 0, 4294967295, true); number(raw.nextEntity, 1, 10000, true);
  number(raw.spawnClock, 0, 10); number(raw.collisionCooldown, 0, 1.2); number(raw.nearMisses, 0, raw.nextEntity - 1, true); number(raw.collisions, 0, 1000, true); number(raw.arrest, 0, 3);
  if (raw.finishTime !== null) number(raw.finishTime, raw.finishDistance / (stats.speed*(raw.gadget==='boost'?1.35:1)) - 1e-7, raw.elapsed);
  const ids = new Set();
  for (const [key, max] of [['traffic', raw.mode==='roam'?4:7], ['police', 2], ['rivals', 3]]) {
    array(raw[key], max);
    for (const e of raw[key]) {
      record(e, raw.mode==='roam'?[...ENTITY_KEYS,'world']:ENTITY_KEYS); if(raw.mode==='roam'){pose(e.world);if(blocked(e.world.x,e.world.z))throw new RangeError('Blocked NPC');} car(e.carId); number(e.id, 1, raw.nextEntity - 1, true);
      if (ids.has(e.id)) throw new RangeError('Duplicate entity'); ids.add(e.id);
      number(e.x, -6.2, 6.2); number(e.distance, -100, 100000); number(e.speed, 0, 120); boolean(e.passed); boolean(e.hit);
      if(raw.mode==='roam'&&key==='traffic'){number(e.speed,0,11);number(e.distance,0,100000);}
      if (e.finishTime !== null) number(e.finishTime, 0, raw.elapsed);
      if (key !== 'rivals' && e.finishTime !== null) throw new RangeError('Invalid NPC finish');
      if (key === 'rivals' && (e.distance > raw.finishDistance || (e.distance === raw.finishDistance) !== (e.finishTime !== null))) throw new RangeError('Invalid rival finish');
    }
  }
  if ((raw.mode === 'race' && (raw.rivals.length !== 3 || raw.police.length || raw.heat)) || (raw.mode === 'cutup' && raw.rivals.length)) throw new RangeError('Invalid mode entities');
  if (raw.status === 'running' && (raw.hp === 0 || raw.distance === raw.finishDistance || raw.elapsed === MAX_TIME || raw.arrest === 3 || raw.finishTime !== null)) throw new RangeError('Invalid running state');
  if(raw.mode==='roam'&&(raw.nearMisses||raw.rivals.length||raw.pursuit==='roaming'&&raw.police.length||raw.pursuit==='chased'&&!raw.police.length))throw new RangeError('Invalid city entities');
  if (raw.status === 'escaped' && raw.mode === 'race' || raw.status === 'finished' && raw.mode !== 'race' || raw.status==='parked'&&raw.mode!=='roam') throw new RangeError('Invalid finish mode');
  if(raw.mode==='roam'&&raw.status==='escaped'&&(raw.pursuit!=='chased'||raw.escapeClock!==6))throw new RangeError('Invalid city escape');
  if (raw.mode!=='roam' && ['escaped', 'finished'].includes(raw.status) && (raw.distance !== raw.finishDistance || raw.finishTime === null)) throw new RangeError('Invalid finish');
  if (raw.status === 'busted' && raw.hp > 0 && raw.arrest < 3 && raw.elapsed < MAX_TIME) throw new RangeError('Invalid bust');
  const place = raw.mode === 'race' ? 1 + raw.rivals.filter(e => raw.finishTime !== null ? e.finishTime !== null && e.finishTime <= raw.finishTime : e.distance > raw.distance).length : 1;
  if (raw.place !== place) throw new RangeError('Invalid race order');
  const expected = totals(raw);
  if (raw.score !== expected.score || raw.earnings !== expected.earnings) throw new RangeError('Invalid rewards');
  return { ...raw, world:{...raw.world}, gadgetTarget:{...raw.gadgetTarget}, appearance:{...raw.appearance}, upgrades: { ...raw.upgrades }, stats: { ...raw.stats }, traffic: raw.traffic.map(e => ({ ...e, ...(e.world?{world:{...e.world}}:{}) })),  police: raw.police.map(e => ({ ...e, ...(e.world?{world:{...e.world}}:{}) })), rivals: raw.rivals.map(e => ({ ...e })) };
}

function pose(value) {
  record(value,['x','z','heading']);number(value.x,-WORLD.limit,WORLD.limit);number(value.z,-WORLD.limit,WORLD.limit);number(value.heading,-Math.PI,Math.PI);
}
function damage(r) {
  if(r.collisionCooldown>0)return;
  r.hp=Math.max(0,r.hp-24*100/r.stats.toughness);r.collisionCooldown=1.2;r.collisions++;
}
function startChase(r) {
  r.pursuit='chased';r.heat=Math.max(1,r.heat);
  // Choose an accessible junction near the player, never a remote parked pursuer.
  const candidates=[];
  for(let x=-150;x<=150;x+=50)for(let z=-150;z<=150;z+=50){const gap=Math.hypot(x-r.world.x,z-r.world.z);if(gap>=25&&gap<=75)candidates.push({x,z,gap});}
  candidates.sort((a,b)=>a.gap-b.gap);
  const point=candidates[0], cop=entity(r,'lantern',0,0,0);
  cop.world={x:point.x,z:point.z,heading:0};r.police.push(cop);
}
function stepCityTraffic(r,dt) {
  // ponytail: four cars on one fixed street loop, O(4²) yielding; add routing only for a larger city population.
  for(const npc of r.traffic) {
    const target=CITY_CORNERS[(Math.floor((npc.distance+1e-7)/100)+npc.id)%4];
    const dx=target.x-npc.world.x,dz=target.z-npc.world.z,length=Math.hypot(dx,dz);
    const speed=8+(npc.id-1)%4, travel=Math.min(length,speed*dt);
    const dest={x:npc.world.x+(length?dx/length*travel:0),z:npc.world.z+(length?dz/length*travel:0)};
    const yieldTo=[...r.traffic,...r.police].some(other=>other!==npc&&nearPath(npc.world,dest,other.world,6)) || nearPath(npc.world,dest,r.world,6);
    if(yieldTo||!clearPath(npc.world,dest)){npc.speed=0;continue;}
    npc.speed=speed;
    if(length>0)npc.world.heading=Math.atan2(-dx,-dz);
    Object.assign(npc.world,dest);npc.distance+=travel;
  }
}
function stepCity(r,input,dt) {
  // Preserve tight low-speed turns; blend to a bounded, upgrade-sensitive highway-speed yaw.
  const blend=clamp((r.speed-5)/15,0,1), handling=r.stats.handling;
  const yaw=handling*Math.min(r.speed,5)*.05*(1-blend)+1.1*handling/(handling+2)*blend;
  const heading=r.world.heading-input.steer*yaw*dt;
  r.world.heading=Math.atan2(Math.sin(heading),Math.cos(heading));
  const next={x:r.world.x-Math.sin(r.world.heading)*r.speed*dt,z:r.world.z-Math.cos(r.world.heading)*r.speed*dt};
  const contact=r.traffic.find(npc=>nearPath(r.world,next,npc.world,4));
  if(contact){damage(r);r.speed*=.56;contact.hit=true;}
  else if(clearPath(r.world,next)){r.distance+=Math.hypot(next.x-r.world.x,next.z-r.world.z);Object.assign(r.world,next);}
  else {damage(r);r.speed*=.3;}
  stepCityTraffic(r,dt);
  if(r.pursuit==='roaming'&&(r.elapsed>=20&&r.distance>=30||r.heat>0))startChase(r);
  for(const cop of r.police){
    const affected=disrupted(r,cop);
    const target=chaseTarget(cop.world,r.gadget==='decoy'&&r.gadgetTime>0?r.gadgetTarget:r.world);
    const dx=target.x-cop.world.x,dz=target.z-cop.world.z,length=Math.hypot(dx,dz);
    cop.speed=Math.min(r.stats.speed*(affected?(r.gadget==='emp'?.08:.35):.86),cop.speed+r.stats.acceleration*dt);
    const travel=Math.min(length,cop.speed*dt),dest={x:cop.world.x+(length?dx/length*travel:0),z:cop.world.z+(length?dz/length*travel:0)};
    if(clearPath(cop.world,dest)){if(length>.01)cop.world.heading=Math.atan2(-dx,-dz);Object.assign(cop.world,dest);cop.distance+=travel;}
    else cop.speed=0;
    if(Math.hypot(cop.world.x-r.world.x,cop.world.z-r.world.z)<4){damage(r);r.speed*=.8;cop.hit=true;}
  }
  const close=r.police.some(c=>Math.hypot(c.world.x-r.world.x,c.world.z-r.world.z)<9&&!disrupted(r,c));
  r.arrest=clamp(r.arrest+(close&&r.speed<5?dt:-dt*.5),0,3);
  const distant=r.pursuit==='chased'&&r.police.every(c=>Math.hypot(c.world.x-r.world.x,c.world.z-r.world.z)>=75);
  r.escapeClock=distant?Math.min(6,r.escapeClock+dt):0;
  if(r.hp===0||r.arrest===3||r.elapsed===MAX_TIME)r.status='busted';
  else if(r.escapeClock===6)r.status='escaped';
}
export function parkRun(run) {
  const r=checkRun(run);
  if(r.mode!=='roam'||r.status!=='running')throw new RangeError('Only active city runs can park');
  r.status='parked';Object.assign(r,totals(r));return r;
}

export function stepRun(run, input, dt) {
  const r = checkRun(run);
  record(input, ['steer', 'throttle', 'brake', 'deploy'], ['steer', 'throttle', 'brake']);
  if(Object.hasOwn(input,'deploy'))boolean(input.deploy);
  number(input.steer, -1, 1); number(input.throttle, 0, 1); number(input.brake, 0, 1); number(dt, 0, 0.05);
  if (r.status !== 'running' || dt === 0) return r;
  dt = Math.min(dt, MAX_TIME - r.elapsed);
  const previousDistance = r.distance, beforeTime = r.elapsed;
  r.elapsed += dt;
  r.gadgetTime=Math.max(0,r.gadgetTime-dt);r.gadgetCooldown=Math.max(0,r.gadgetCooldown-dt);
  if(input.deploy===true&&!r.gadgetHeld&&r.mode!=='race'&&r.charges>0&&r.gadgetCooldown===0) {
    r.charges--;r.deployments++;r.gadgetTime=GADGETS[r.gadget].duration;r.gadgetCooldown=GADGETS[r.gadget].cooldown;
    if(r.gadget==='repair')r.hp=Math.min(100,r.hp+20);
    if(r.gadget==='decoy')r.gadgetTarget={x:r.world.x,z:r.world.z};
    if(GADGETS[r.gadget].category==='loud')r.heat=Math.min(5,r.heat+1);
  }
  r.gadgetHeld=input.deploy===true;
  r.collisionCooldown = Math.max(0, r.collisionCooldown - dt);
  const boosting=r.gadget==='boost'&&r.gadgetTime>0;
  r.speed = clamp(r.speed + (input.throttle * r.stats.acceleration * (boosting?1.8:1) - input.brake * 18 - 0.3 - r.speed * 0.012) * dt, 0, r.stats.speed*(boosting?1.35:1));
  if(r.mode==='roam'){stepCity(r,input,dt);Object.assign(r,totals(r));return r;}
  r.x = clamp(r.x + input.steer * r.stats.handling * 0.7 * (0.35 + 0.65 * r.speed / r.stats.speed) * dt, -6.2, 6.2);
  r.distance = Math.min(r.finishDistance, r.distance + r.speed * dt);
  if (r.distance === r.finishDistance) r.finishTime = Math.min(r.elapsed, beforeTime + (r.finishDistance - previousDistance) / Math.max(r.speed, 0.001));
  r.heat = r.mode === 'cutup' ? Math.min(5, Math.max(r.heat, r.distance / 340 + r.nearMisses * 0.12 + r.level * 0.08)) : 0;
  r.spawnClock -= dt;
  if (r.spawnClock <= 0) {
    if (r.traffic.length < 7) {
      const x = LANES[Math.floor(random(r) * 4)], distance = r.distance + 110 + r.speed * 2 + random(r) * 55;
      if (!r.traffic.some(e => Math.abs(e.distance - distance) < 28)) r.traffic.push(entity(r, CARS[Math.floor(random(r) * CARS.length)].id, x, distance, 7 + random(r) * 7));
    }
    r.spawnClock = Math.max(1.1, 3.6 - r.level * 0.14 - r.heat * 0.16);
  }
  if (r.mode === 'cutup' && r.heat >= 1 && r.police.length < (r.heat >= 3 ? 2 : 1)) {
    r.police.push(entity(r, 'lantern', r.police.length === 0 ? r.x : LANES[0], Math.max(-90, r.distance - 65 - r.police.length * 20), r.stats.speed * 0.9));
  }
  for (const [i, rival] of r.rivals.entries()) {
    const target = r.stats.speed * Math.min(1.04, 0.80 + i * 0.045 + r.level * 0.012);
    const blocker = r.traffic.find(e => e.distance > rival.distance && e.distance - rival.distance < 24 && Math.abs(e.x - rival.x) < 1.6);
    let targetX = RIVAL_LANES[i];
    if (blocker) targetX = LANES.reduce((best, lane) => Math.abs(lane - blocker.x) > Math.abs(best - blocker.x) ? lane : best, LANES[0]);
    rival.x = clamp(rival.x + clamp(targetX - rival.x, -1, 1) * 2 * dt, -6.2, 6.2);
    rival.speed = Math.min(target, rival.speed + r.stats.acceleration * (0.76 + i * 0.04) * dt);
    const old = rival.distance;
    rival.distance = Math.min(r.finishDistance, old + rival.speed * dt);
    if (rival.distance === r.finishDistance && rival.finishTime === null) rival.finishTime = Math.min(r.elapsed, beforeTime + (r.finishDistance - old) / rival.speed);
  }
  for (const cop of r.police) {
    const affected=disrupted(r,cop);
    const target = r.stats.speed * (affected?(r.gadget==='smoke'?.35:.08):(0.98 + r.level * 0.012 + r.heat * 0.015));
    cop.speed = Math.min(target, cop.speed + r.stats.acceleration * 0.8 * dt);
    cop.x = clamp(cop.x + clamp((r.gadget==='decoy'&&r.gadgetTime>0?-r.x:r.x) - cop.x, -1, 1) * (affected?.08:(0.8 + r.level * 0.04)) * dt, -6.2, 6.2);
    cop.distance += cop.speed * dt;
    // A cop ahead brakes to contain, rather than vanishing down the road.
    if (cop.distance > r.distance + 8) { cop.distance = r.distance + 8; cop.speed = Math.min(cop.speed,r.speed * 0.8); }
  }
  for (const e of r.traffic) e.distance += e.speed * dt;
  for (const e of [...r.traffic, ...r.police, ...r.rivals]) {
    const lateral = Math.abs(e.x - r.x), gap = Math.abs(e.distance - r.distance);
    if (gap < 4.3 && lateral < 1.55 && r.collisionCooldown === 0) {
      r.hp = Math.max(0, r.hp - 24 * 100 / r.stats.toughness);
      r.speed *= 0.56; r.collisionCooldown = 1.2; r.collisions++; e.hit = true;
    }
    if (!e.passed && e.distance < r.distance - 4.3) {
      e.passed = true;
      if (r.traffic.includes(e) && !e.hit && lateral >= 1.55 && lateral < 3.2 && r.speed > e.speed + 2) r.nearMisses++;
    }
  }
  r.traffic = r.traffic.filter(e => e.distance > r.distance - 45);
  const contained = r.police.some(e => !disrupted(r,e) && Math.abs(e.distance - r.distance) < 10 && Math.abs(e.x - r.x) < 2.3) && r.speed < 5;
  r.arrest = clamp(r.arrest + (contained ? dt : -dt * 0.5), 0, 3);
  r.place = r.mode === 'race' ? 1 + r.rivals.filter(e => r.finishTime !== null ? e.finishTime !== null && e.finishTime <= r.finishTime : e.distance > r.distance).length : 1;
  if (r.hp === 0 || r.arrest === 3 || r.elapsed === MAX_TIME) r.status = 'busted';
  else if (r.distance === r.finishDistance) r.status = r.mode === 'race' ? 'finished' : 'escaped';
  Object.assign(r, totals(r));
  return r;
}
// Arcade-only effects: a following wake or short-radius pulse, not real fluid/electrical simulation.
function disrupted(run,cop) {
  if(run.gadgetTime<=0)return false;
  if(run.mode==='roam') {
    const dx=cop.world.x-run.world.x,dz=cop.world.z-run.world.z;
    const gap=dx*Math.sin(run.world.heading)+dz*Math.cos(run.world.heading);
    const lateral=Math.abs(dx*Math.cos(run.world.heading)-dz*Math.sin(run.world.heading));
    return run.gadget==='smoke'?gap>=0&&gap<100&&lateral<3.5:run.gadget==='emp'&&Math.hypot(dx,dz)<65;
  }
  const gap=run.distance-cop.distance;
  return run.gadget==='smoke'?gap>=0&&gap<100&&Math.abs(cop.x-run.x)<3.5:run.gadget==='emp'&&Math.hypot(gap,cop.x-run.x)<65;
}
export function settleRun(profile, run) {
  const p = validateProfile(profile), r = checkRun(run);
  if (r.status === 'running' || r.id !== p.nextRun - 1 || r.id <= p.settledRun || r.level !== p.level || r.carId !== p.selected || STAT_KEYS.some(key => r.stats[key] !== effective(p.selected, p.upgrades[p.selected])[key])) throw new RangeError('Result is not current');
  const c=p.customizations[p.selected];
  if(r.gadget!==c.gadget||['paint','wheels','stripe','spoiler'].some(key=>r.appearance[key]!==c[key]))throw new RangeError('Loadout changed during run');
  p.cash = p.testMode ? MONEY : Math.min(MONEY, p.cash + r.earnings);
  p.best = Math.max(p.best, r.score); p.settledRun = r.id;
  p.careerDistance=Math.min(COUNTER,p.careerDistance+Math.floor(r.distance));
  if(r.status==='escaped')p.escapes=Math.min(COUNTER,p.escapes+1);
  for(const {id} of CARS)if(!p.owned.includes(id)&&p.careerDistance>=CAR_UNLOCKS[id]){p.owned.push(id);p.upgrades[id]=zeroLevels();p.customizations[id]=stockCustom(id);}
  if (r.status === 'escaped' || r.status === 'finished' && r.place === 1) p.level = Math.min(12, p.level + 1);
  return p;
}
