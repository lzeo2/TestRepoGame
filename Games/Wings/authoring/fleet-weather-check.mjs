// Actual FC weather integration checks. Synthetic capability fixtures, not model/served gameplay.
import assert from 'node:assert/strict';
import { createFleet, replayFleet } from './fleet-sim.mjs';
import { createWeather, canAcquireVisual } from './weather/weather.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const weapon=(acquisition='visual',medium='surface')=>({id:'gun',medium,acquisition,range:1200,speed:200,ttlMs:10000,
  cooldownMs:medium==='underwater'?6000:500,damage:10,depths:medium==='underwater'?['shallow','deep']:['surfaced'],ammo:medium==='underwater'?2:100});
const weather=(preset='clear')=>({config:createWeather({seed:42,allowedPresets:[preset],initialPreset:preset,
  tuning:{fog:{fogBase:.003,fogSea:.004}}}).config,minimumTransmittance:.1});
function unit(id,team,position,extra={}) {
  return {id,team,kind:'surface',capital:true,position,half:[12,5,12],hp:200,speed:0,route:[],
    weapons:[weapon()],sensor:null,depth:'surfaced',depthPlan:[],...extra};
}
function config(preset='clear',acquisition='visual') {
  return {mode:'factions',arena:{minX:-1200,maxX:1200,minZ:-1200,maxZ:1200,bottomY:-100,cell:20,obstacles:[]},
    units:[unit('a',0,[-500,0,0]),unit('b',1,[500,0,0])].map(u=>({...u,weapons:[weapon(acquisition)]})),
    aircraft:[[{id:'planeA',weapons:[weapon(acquisition)]}],[{id:'planeB',weapons:[weapon(acquisition)]}]],
    weather:weather(preset),matchMs:600000,intermissionMs:15000};
}
function player(f,team=0) {
  const id=team?'bob':'alice';f.addPlayer(id,team);assert(f.request(id,{type:'spawn',kind:team?'planeB':'planeA'}).ok);return id;
}
const shot=(f,team=0)=>f.launchAircraftAttack(team?'bob':'alice',{aircraft:team?'aircraft_bob':'aircraft_alice',weapon:'gun',
  origin:[team?450:-450,0,0],aim:[team?-500:500,0,0]});
const own=(f,t,id)=>f.snapshot(t).units.find(u=>u.id===id);
let groups=0;
const check=(name,fn)=>{fn();groups++;console.log('PASS '+name);};

check('strict opt-in config/classification; normalized serializable weather and legacy omission',()=>{
  const c=config();
  for(const change of [w=>{w.extra=1;},w=>{w.config={seed:1,allowedPresets:[]};},w=>{w.minimumTransmittance=0;},
    w=>{w.baseVisibility={fogBase:NaN,fogSea:0,fogFalloff:1/300};},
    w=>{w.baseVisibility={fogBase:0,fogSea:0,fogFalloff:0};},w=>{w.baseVisibility={fogBase:0,fogSea:0,fogFalloff:1/300,extra:1};},
    w=>{w.minimumTransmittance=Infinity;},w=>{w.config={...w.config,wind:3};}]) {
    const bad=clone(c);change(bad.weather);assert.throws(()=>createFleet(bad));
  }
  for(const field of [undefined,'radar',null,1]) for(const role of ['units','aircraft']) {
    const bad=clone(c),w=role==='units'?bad.units[0].weapons[0]:bad.aircraft[0][0].weapons[0];
    if(field===undefined)delete w.acquisition;else w.acquisition=field;
    assert.throws(()=>createFleet(bad),/acquisition classification/);
  }
  const legacy=clone(c);delete legacy.weather;legacy.units.forEach(u=>delete u.weapons[0].acquisition);
  legacy.aircraft.flat().forEach(a=>a.weapons.forEach(w=>delete w.acquisition));
  const f=createFleet(legacy);assert(!('environment' in f.snapshot(0)));f.advance(500);
  assert(f.snapshot(0).events.some(e=>e.type==='fire'));
  const normalized=createFleet(c).exportReplay().config.weather.config;
  assert.deepEqual(normalized,createWeather(c.weather.config).config);
});

check('composed optical density and mixed-height falloff validation use the actual shared helper',()=>{
  const c=config('fog');c.weather.baseVisibility={fogBase:.001,fogSea:.002,fogFalloff:1/300};
  const f=createFleet(c);f.advance(125);
  const e=f.snapshot(0).environment;
  assert.equal(e.simulationMs,100);assert.deepEqual(e.weather,createWeather(c.weather.config).sample(100));
  assert.deepEqual(e.visibility,{fogBase:.004,fogSea:.006,fogFalloff:1/300});
  assert.equal(canAcquireVisual(e.visibility,[-450,0,0],[500,0,0],e.minimumTransmittance),false);
  e.visibility.fogSea=0;assert.equal(f.snapshot(1).environment.visibility.fogSea,.006);
  const mixed=clone(c);mixed.weather.baseVisibility.fogFalloff=1/500;assert.throws(()=>createFleet(mixed),/mixed sea-fog falloff/);
  const total=clone(c);total.weather.baseVisibility.fogBase=.009;assert.throws(()=>createFleet(total),/Composed visibility density/);
  const independent=config('fog');independent.weather.baseVisibility={fogBase:.001,fogSea:0,fogFalloff:1/500};
  assert.equal(createFleet(independent).snapshot(0).environment.visibility.fogFalloff,1/300);
  const baseOnly=config('clear');baseOnly.weather.baseVisibility={fogBase:0,fogSea:.001,fogFalloff:1/500};
  assert.equal(createFleet(baseOnly).snapshot(0).environment.visibility.fogFalloff,1/500);
});

check('clear vs dense visual AI AND aircraft acquisition; positive real damage, no rejected fake launches',()=>{
  const clear=createFleet(config()),fog=createFleet(config('fog'));
  clear.advance(6000);fog.advance(6000);
  for(const [team,id] of [[0,'a'],[1,'b']]) {
    assert(own(clear,team,id).hp<200);assert.equal(own(fog,team,id).hp,200);
    assert(!fog.snapshot(team).events.some(e=>e.type==='fire'));
  }
  for(const team of [0,1]) {
    const c=config();c.units.forEach(u=>{u.weapons=[];});const f=createFleet(c);player(f,team);assert(shot(f,team));
    f.advance(5000);assert.equal(own(f,1-team,team?'a':'b').hp,190);
    const blocked=config('fog');blocked.units.forEach(u=>{u.weapons=[];});const g=createFleet(blocked);player(g,team);
    const before=g.snapshot(team).aircraft[0].weapons[0].ammo;
    assert.throws(()=>shot(g,team),/Visual acquisition blocked/);
    assert.equal(g.snapshot(team).aircraft[0].weapons[0].ammo,before);
    assert.equal(g.snapshot(team).projectiles.length,0);assert(!g.snapshot(team).events.some(e=>e.type==='fire'));
  }
});

check('explicit nonvisual AI/player shots retain real damage while hidden hostile HP/fire/origins stay private',()=>{
  const f=createFleet(config('fog','nonvisual'));f.advance(5000);
  for(const team of [0,1]) {
    const s=f.snapshot(team),enemy=team?'a':'b';
    assert(!s.units.some(u=>u.id===enemy));assert(s.events.some(e=>e.type==='fire'&&e.source===(team?'b':'a')&&e.target===null));
    assert(!s.events.some(e=>e.source===enemy||e.unit===enemy));
    const incoming=s.projectiles.filter(p=>p.team!==team);assert(incoming.length>0);
    for(const p of incoming){assert.equal(p.source,null);assert.deepEqual(Object.keys(p).sort(),['id','medium','position','source','team']);}
  }
  f.advance(1000);
  for(const [team,id] of [[0,'a'],[1,'b']]) {
    assert(own(f,team,id).hp<200);
    assert(f.snapshot(team).events.some(e=>e.type==='damage'&&e.unit===id&&e.source===null));
  }
  const c=config('fog','nonvisual');c.units.forEach(u=>{u.weapons=[];});const g=createFleet(c);player(g);assert(shot(g));g.advance(5000);
  assert.equal(own(g,1,'b').hp,190);assert(!g.snapshot(0).units.some(u=>u.id==='b'));
});

check('both factions preserve event-time PLUS current visibility; hidden history never resurfaces',()=>{
  let chosen;
  for(let seed=0;seed<1000;seed++) {
    const w=createWeather({seed,allowedPresets:['clear','fog'],initialPreset:'clear',holdMs:1000,transitionMs:1000,
      tuning:{fog:{fogBase:.003,fogSea:.004}}});
    if(w.sample(0).to==='fog'&&w.sample(2000).to==='clear'){chosen=w.config;break;}
  }
  assert(chosen);const c=config('clear','nonvisual');c.weather.config=chosen;const f=createFleet(c);f.advance(500);
  const initiallyVisible=[0,1].map(team=>f.snapshot(team).events.find(e=>e.type==='fire'&&e.source===(team?'a':'b')));
  assert(initiallyVisible.every(Boolean));f.advance(1500);
  const privateFires=[0,1].map(team=>f.snapshot(team).events.find(e=>e.type==='fire'&&e.tick===40&&e.source===(team?'b':'a')));
  assert(privateFires.every(Boolean));
  for(const team of [0,1]) {
    const s=f.snapshot(team);assert(!s.units.some(u=>u.team!==team));
    assert(!s.events.some(e=>e.id===initiallyVisible[team].id)); // current visibility removes old visible origin
    assert(!s.events.some(e=>e.id===privateFires[1-team].id));
    assert.equal(privateFires[team].target,null);
  }
  f.advance(2200);assert.equal(f.snapshot(0).environment.weather.from,'clear');
  for(const team of [0,1]) {
    const s=f.snapshot(team);assert(s.units.some(u=>u.team!==team));
    assert(!s.events.some(e=>e.id===privateFires[1-team].id)); // becoming visible never reveals private past
    assert.equal(s.events.find(e=>e.id===privateFires[team].id).target,null);
    assert(s.events.some(e=>e.type==='fire'&&e.source===(team?'a':'b')&&e.tick>=80));
  }
});

function sonarConfig(preset) {
  const c=config(preset,'nonvisual');
  c.units.forEach(u=>{u.position[0]=u.team?200:-200;u.weapons=[weapon('nonvisual','underwater')];
    u.sensor={enabled:true,range:1000,depths:['surfaced','shallow','deep']};});
  for(const team of [0,1])c.units.push(unit(team?'bSub':'aSub',team,[team?200:-200,0,-200],{
    kind:'sub',capital:false,hp:40,depth:'deep',weapons:[weapon('nonvisual','underwater')],
    sensor:{enabled:true,range:1000,depths:['surfaced','shallow','deep']}}));
  return c;
}
check('sonar/contact and declared nonvisual underwater counterplay unaffected; no exact submerged pose',()=>{
  const clear=createFleet(sonarConfig('clear')),fog=createFleet(sonarConfig('fog'));
  clear.advance(7000);fog.advance(7000);
  for(const team of [0,1]) {
    const a=clear.snapshot(team),b=fog.snapshot(team),ownSub=team?'bSub':'aSub',enemySub=team?'aSub':'bSub';
    assert.deepEqual(a.contacts,b.contacts);assert(b.contacts.some(c=>c.unit===enemySub&&c.quality==='confirmed'));
    assert(!a.units.some(u=>u.id===enemySub));assert(!b.units.some(u=>u.id===enemySub));
    assert(own(fog,team,ownSub).hp<40);assert.equal(own(fog,team,ownSub).hp,own(clear,team,ownSub).hp);
    assert(!b.projectiles.some(p=>p.team!==team&&p.medium==='underwater'));
    assert(!b.events.some(e=>e.source===enemySub||e.unit===enemySub));
    assert(b.contacts.every(c=>!('position' in c)&&!('view' in c)));
  }
});

check('actual FC sole tick: zero-advance pause/repeated sampling, fractional remainder, partitions and JSON replay',()=>{
  const c=config('fog','nonvisual'),a=createFleet(c),b=createFleet(c);
  a.advance(25);assert.equal(a.snapshot(0).environment.simulationMs,0);
  const paused=a.snapshot(0);for(let i=0;i<20;i++){a.advance(0);assert.deepEqual(a.snapshot(0),paused);}
  a.advance(5975);
  for(const ms of [1,249,37,713,1500,3500])b.advance(ms);
  assert.deepEqual(a.snapshot(0),b.snapshot(0));assert.deepEqual(a.snapshot(1),b.snapshot(1));
  assert.equal(a.snapshot(0).environment.simulationMs,6000);
  const replay=replayFleet(JSON.parse(JSON.stringify(a.exportReplay())));
  for(const team of [0,1])assert.deepEqual(replay.snapshot(team),a.snapshot(team));
  assert(!('config' in a.snapshot(0)));assert(!('actions' in a.snapshot(0)));
});

console.log(`PASS ${groups} FC/weather integration groups; shared fleet intel only, no aircraft-observer or served/native acceptance`);
