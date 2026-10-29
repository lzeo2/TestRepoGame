// CPU authority fixtures only, not native flight or renderer acceptance.
import assert from 'node:assert/strict';
import { compileGeometry, fittedDistance, fittedHit, yawRotate } from './fleet-geometry.mjs';
import { createFleet, replayFleet, LIMITS } from './fleet-sim.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
const clone = structuredClone;
const local = createLocalFleetConfig('nato');
const descriptor = local.geometry.find(g => g.id === 'type022').descriptor;
const measured = compileGeometry(descriptor);
const near = (a,b) => assert(Math.abs(a-b)<1e-8, `${a} != ${b}`);
const bomb = (overrides={}) => ({source:'hostAircraft',team:0,weapon:'bomb',position:[0,0,2900],radius:45,damage:1350,...overrides});
const unit = (id,team,x,overrides={}) => ({id,team,kind:'surface',capital:false,modelId:'type022',
  position:[x,0,2900],heading:0,half:[6,7,22],hp:10000,speed:0,route:[],weapons:[],sensor:null,
  depth:'surfaced',depthPlan:[],...overrides});
function config() {
  const c=clone(local);
  c.units=[unit('home',0,-700,{capital:true}),unit('left',1,-35,{capital:true}),unit('right',1,35,{capital:true})];
  return c;
}
const hp = (f,id) => f.snapshot(1).units.find(u=>u.id===id).hp;
const state = f => [f.snapshot(0),f.snapshot(1),f.exportReplay()];
function replayExact(f) {
  const r=replayFleet(JSON.parse(JSON.stringify(f.exportReplay())));
  assert.deepEqual(state(r),state(f));
}
let groups=0;
function check(name,fn) { fn(); groups++; console.log('PASS '+name); }
check('analytic Euclidean component distances, overlapping solids, rotated/translated poses and gaps',()=>{
  const g={boxes:[{min:[-5,-1,-2],max:[-3,1,2]},{min:[3,-1,-2],max:[5,1,2]}]};
  for(const [p,d] of [[[0,0,0],3],[[-4,0,0],0],[[-5,1,2],0],[[8,5,2],5],[[8,5,14],13]]) {
    for(const h of [0,.63,Math.PI/2,-1.2]) {
      const position=[17,-8,31],world=yawRotate(p,h).map((n,i)=>n+position[i]);
      near(fittedDistance(g,world,position,h),d);
    }
  }
  g.boxes.push(clone(g.boxes[0]));near(fittedDistance(g,[-4,0,0],[0,0,0],0),0);
  assert.equal(fittedHit(g,[0,0,-10],[0,0,10],[0,0,0],0),null);
});
check('actual Type022 water tunnel differs from aggregate fill at every current pose',()=>{
  near(fittedDistance(measured,[0,0,0],[0,0,0],0),descriptor.collision.deck.min[1]);
  const aggregate={boxes:[{min:[0,1,2].map(i=>Math.min(...measured.boxes.map(b=>b.min[i]))),
    max:[0,1,2].map(i=>Math.max(...measured.boxes.map(b=>b.max[i])))}]};
  for(const heading of [0,.63,Math.PI/2]) {
    const position=[100,0,2900],p=[...position];
    assert.equal(fittedDistance(aggregate,p,position,heading),0);
    assert(fittedDistance(measured,p,position,heading)>2);
    const c=config();c.units=[c.units[0],unit('tunnel',1,100,{heading,capital:true})];
    const f=createFleet(c),before=state(f);
    assert.equal(f.resolveHostBombNearMiss(bomb({position:p,radius:2})),0);
    assert.deepEqual(state(f),before);
  }
});
check('near, exact radius boundary and vertical distance use fitted solids, once per overlapping unit',()=>{
  const c=config();c.units=[c.units[0],unit('target',1,0,{capital:true})];
  for(const d of [0,22.5,45,45.001]) {
    const f=createFleet(c),top=Math.max(...measured.boxes.map(b=>b.max[1]));
    const input=bomb({position:[0,top+d,2897]});
    assert.equal(f.resolveHostBombNearMiss(input),d<45?1:0);
    near(hp(f,'target'),10000-(d<45?1350*(1-d/45):0));
    assert.equal(f.snapshot(1).events.filter(e=>e.type==='damage').length,d<45?1:0);
    assert.equal(f.exportReplay().actions.length,d<45?1:0);replayExact(f);
  }
  const f=createFleet(c);assert.equal(f.resolveHostBombNearMiss(bomb({position:[-4,2.2,2900]})),1);
  assert.equal(hp(f,'target'),8650);assert.equal(f.snapshot(1).events.filter(e=>e.type==='impact').length,1);
});
check('multiple moving/turning units, one action, independent falloff and no added clock/projectiles',()=>{
  const c=config();c.units.filter(u=>u.team===1).forEach(u=>{u.speed=12;u.route=[[u.position[0]+100,0,3000]];});
  const f=createFleet(c);f.advance(500);
  const before=f.snapshot(1),input=bomb(),expected=before.units.filter(u=>u.team===1).map(u=>({id:u.id,
    damage:1350*(1-fittedDistance(measured,input.position,u.position,2*Math.atan2(u.view.orientation[1],u.view.orientation[3]))/45)}));
  assert.equal(f.resolveHostBombNearMiss(input),2);
  for(const e of expected)near(hp(f,e.id),10000-e.damage);
  const after=f.snapshot(1);assert.equal(after.tick,before.tick);assert.deepEqual(after.projectiles,before.projectiles);
  assert.deepEqual(after.metrics,before.metrics);assert(!after.events.some(e=>e.type==='fire'));
  assert.equal(f.exportReplay().actions.at(-1).type,'hostBombNearMiss');replayExact(f);
});
check('friendly, surfaced/submerged subs and unmodelled proxies excluded, no blast occlusion heuristic',()=>{
  const asw={id:'asw',medium:'underwater',range:1,speed:10,ttlMs:1000,cooldownMs:6000,damage:1,depths:['shallow','deep'],ammo:2};
  for(const depth of ['surfaced','deep']) {
    const c=config();c.units=[unit('home',0,-700,{capital:true}),unit('enemy',1,700,{capital:true}),
      unit('friend',0,-60),unit('proxy',1,60),unit('sub',1,0,{kind:'sub',depth})];
    delete c.units[3].modelId;
    for(const u of c.units.slice(0,2)) {delete u.modelId;u.weapons=[clone(asw)];u.sensor={enabled:true,range:1,depths:['shallow','deep']};}
    const f=createFleet(c),before=state(f);assert.equal(f.resolveHostBombNearMiss(bomb({radius:100})),0);assert.deepEqual(state(f),before);
  }
  const c=config();c.arena.obstacles=[{min:[-1,-2,2899],max:[1,2,2901]}];
  const f=createFleet(c);assert.equal(f.resolveHostBombNearMiss(bomb()),2);
});
check('atomic area sinking/objective resolution, attribution, dead exclusion and exact replay',()=>{
  const c=config();c.units.filter(u=>u.team===1).forEach(u=>{u.hp=1;});
  const f=createFleet(c);assert.equal(f.resolveHostBombNearMiss(bomb()),2);
  const s=f.snapshot(1);assert.equal(hp(f,'left'),0);assert.equal(hp(f,'right'),0);
  assert.deepEqual(s.outcome,{winner:0,reason:'capitals'});
  assert.deepEqual(s.events.map(e=>e.type),['impact','damage','sunk','impact','damage','sunk','match-end']);
  for(const e of s.events.filter(e=>e.type==='sunk')) {assert.equal(e.team,1);assert.equal(e.sourceTeam,0);}
  assert.equal(f.exportReplay().actions.length,1);replayExact(f);
  const before=state(f);assert.throws(()=>f.resolveHostBombNearMiss(bomb()),/Intermission/);assert.deepEqual(state(f),before);
  const n=config();n.units.find(u=>u.id==='left').capital=false;n.units.find(u=>u.id==='left').hp=1;
  const alive=createFleet(n);assert.equal(alive.resolveHostBombNearMiss(bomb()),2);
  assert.equal(alive.resolveHostBombNearMiss(bomb()),1);assert.equal(alive.snapshot(0).outcome,null);replayExact(alive);
});
check('strict input validation and player-command rejection never mutate authority or replay',()=>{
  const f=createFleet(config()),before=state(f);
  const invalid=[null,{}, Object.create(bomb()), {...bomb(),extra:true},
    ...['source','team','weapon','position','radius','damage'].map(key=>{const b=bomb();delete b[key];return b;}),
    ...['', 'bad id', 'x'.repeat(49),1,null].map(source=>bomb({source})),
    ...[-1,2,'0',null,NaN].map(team=>bomb({team})),
    ...['cannon20','Bomb',null,1].map(weapon=>bomb({weapon})),
    ...[0,-1,1000.1,NaN,Infinity,'45',undefined].map(radius=>bomb({radius})),
    ...[0,-1,10000.1,NaN,Infinity,'1350',undefined].map(damage=>bomb({damage})),
    ...[null,[],[0,0],[0,0,0,0],[NaN,0,0],[Infinity,0,0],[100001,0,0],['0',0,0],new Array(3)].map(position=>bomb({position}))];
  for(const input of invalid) {assert.throws(()=>f.resolveHostBombNearMiss(input),TypeError);assert.deepEqual(state(f),before);}
  assert.throws(()=>replayFleet({...f.exportReplay(),actions:[{type:'hostBombNearMiss',input:bomb({weapon:'rocket'})}]}),TypeError);
  f.addPlayer('alice',0);const added=state(f);
  assert.equal(f.request('alice',{type:'hostBombNearMiss',input:bomb()}).ok,false);assert.deepEqual(state(f),added);
  const edge=createFleet(config());assert.equal(edge.resolveHostBombNearMiss(bomb({radius:1000,damage:10000})),2);
});
check('replay capacity reserves one slot for all hits or fails atomically; empty blasts consume none',()=>{
  const f=createFleet(config());for(let i=0;i<LIMITS.replayActions;i++)f.advance(0);
  const before=state(f);assert.throws(()=>f.resolveHostBombNearMiss(bomb()),/Replay action cap/);assert.deepEqual(state(f),before);
  assert.equal(f.resolveHostBombNearMiss(bomb({position:[0,1000,2900]})),0);assert.deepEqual(state(f),before);
  const last=createFleet(config());for(let i=0;i<LIMITS.replayActions-1;i++)last.advance(0);
  assert.equal(last.resolveHostBombNearMiss(bomb()),2);assert.equal(last.exportReplay().actions.length,LIMITS.replayActions);replayExact(last);
});
check('existing faction/weather redaction remains authoritative for near-miss events',()=>{
  const c=config();c.weather={config:{seed:42,allowedPresets:['clear'],initialPreset:'clear'},
    baseVisibility:{fogBase:.01,fogSea:0,fogFalloff:1/300},minimumTransmittance:.9};
  const f=createFleet(c);assert.equal(f.resolveHostBombNearMiss(bomb()),2);
  assert(!f.snapshot(0).events.some(e=>e.unit==='left'||e.unit==='right'));
  assert(f.snapshot(1).events.some(e=>e.type==='damage'));
  assert(f.snapshot(1).events.filter(e=>e.type==='impact').every(e=>e.source===null));replayExact(f);
});
console.log(`PASS ${groups} fitted bomb near-miss groups; CPU authority only`);
