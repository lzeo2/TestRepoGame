import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { MAPPED_STORES } from '../Games/Capital Drive/stores.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createInteriorCollider } from '../Games/Capital Drive/interior-navigation.js';
import { createInteriorView } from '../Games/Capital Drive/interior-view.js';
import { createInteriorActivities } from '../Games/Capital Drive/interior-activities.js';

const map=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url),'utf8'));
const store=MAPPED_STORES.find(s=>s.name==='Coals');
assert.equal(store.id,'store-358293199');
const interiors=createInteriors(map,{stores:[store]});
assert.equal(interiors.stats.generatedPlans,0);
const entry=interiors.entries.find(e=>e.storeId===store.id),c=Math.cos(entry.yaw),s=Math.sin(entry.yaw);
const visitor={x:entry.x-s*1.5,z:entry.z-c*1.5,yaw:entry.yaw,y:0};
const plan=interiors.enter(entry,visitor),station=plan.activities.find(a=>a.kind==='evidence');
assert(station && Object.isFrozen(station));
assert.equal(station.id,`${plan.id}-evidence`);
assert.equal(station.label,'Secure the ledger case');
assert.equal(station.radius,1.25);
const ledger=plan.furniture.find(f=>f.kind==='ledger-case');
assert(ledger && Object.isFrozen(ledger));
const collider=createInteriorCollider(plan);
assert(collider.canOccupy(station),'player-sized station standing space');
assert(!collider.canOccupy(ledger),'rendered case is a real solid');
assert(Math.hypot(station.x-plan.counter.x,station.z-plan.counter.z)>plan.counter.radius,'station centre outside counter action');
for(const other of plan.activities.filter(a=>a!==station)) assert(Math.hypot(other.x-station.x,other.z-station.z)>other.radius+station.radius,'other activity reaches stay separate');
// Find a real swept path from the ordinary entry pose through the grocery aisle.
const world=(x,z)=>({x:plan.origin.x+c*x+s*z,z:plan.origin.z-s*x+c*z});
const queue=[{point:plan.spawn,key:'0,0'}],seen=new Set(['0,0']);let reached=false;
for(let i=0;i<queue.length&&!reached;i++) {
  const p=queue[i].point;
  if(Math.hypot(p.x-station.x,p.z-station.z)<.5 && collider.canTraverse(p,station)) { reached=true;break; }
  const [ix,iz]=queue[i].key.split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx=ix+dx,nz=iz+dz,key=`${nx},${nz}`;
    if(seen.has(key))continue;seen.add(key);
    const q=world(nx*.25,1.65+nz*.25);
    if(collider.canTraverse(p,q))queue.push({point:q,key});
  }
}
assert(reached,'case station reachable from actual Coals door with full furniture');
const scene=new THREE.Scene(),view=createInteriorView(scene);
const geometryHash=()=>{const hash=createHash('sha256');scene.traverse(node=>{if(node.isMesh){for(const [name,a] of Object.entries(node.geometry.attributes)){hash.update(name);hash.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}}});return hash.digest('hex');};
view.load(plan);const firstHash=geometryHash(),triangles=view.stats.triangles;
assert.equal(view.stats.draws,1);assert(triangles<3000);
const withoutCase={...plan,furniture:plan.furniture.filter(f=>f!==ledger)};
view.load(withoutCase);assert(view.stats.triangles<triangles,'ledger-case contributes actual rendered geometry');
interiors.leave(visitor);view.clear();assert.equal(view.stats.meshes,0);
const reopened=interiors.enter(entry,visitor);assert.deepEqual(reopened,plan);
view.load(reopened);assert.equal(geometryHash(),firstHash,'all rebuilt room attributes stay exact');
view.dispose();interiors.leave(visitor);

const ctx={planId:plan.id,pose:{x:station.x,z:station.z},onFoot:true,health:100,visible:true,wanted:3,sandbox:false,recovering:false,paused:false};
function fresh(extra={}) {const game=createInteriorActivities();game.load(plan);assert(game.start(station.id,{...ctx,...extra}));return game;}
const tick=(game,held={},dt=.05,context=ctx)=>game.step(dt,held,context);
function ready(game){tick(game);assert.equal(game.snapshot().phase,'dial');}
function settle(game){for(let i=0;i<5;i++)tick(game);assert.equal(game.snapshot().phase,'dial');}
function key(game,k){tick(game,{[k]:true});if(game.snapshot().active)settle(game);}
function solve(game){ready(game);for(const channel of [['x','x'],['x'],['y']]){for(const k of channel)key(game,k);key(game,'up');}}
for(let wanted=0;wanted<=5;wanted++) {
 const game=fresh({wanted}); const context={...ctx,wanted};
 // This context uses the same wanted value for every real input tick.
 game.step(.05,{},context);
 for(const channel of [['x','x'],['x'],['y']])for(const k of [...channel,'up']){game.step(.05,{[k]:true},context);for(let i=0;i<5;i++)game.step(.05,{},context);}
 const result=game.drainEvents();assert.equal(result.length,1);const event=result[0];
 assert.equal(event.type,'complete');assert.equal(event.kind,'evidence');assert.equal(event.outcome,'secured');
 assert.equal(event.planId,plan.id);assert.equal(event.stationId,station.id);assert.equal(event.sessionId,game.snapshot().sessionId);
 assert(Object.isFrozen(event)&&Object.isFrozen(event.station));assert(!('cash'in event)&&!('heal'in event));
 assert.equal(game.snapshot().progress,1);assert.equal(game.cancel(),false);tick(game);assert.deepEqual(game.drainEvents(),[]);
}
for(const extra of [{planId:'other'},{planId:null},{health:0},{health:NaN},{visible:false},{visible:undefined},{sandbox:true},{recovering:true},{onFoot:false},{paused:true},{wanted:-1},{wanted:6},{wanted:NaN},{pose:{x:0,z:0}}]) {
 const game=createInteriorActivities();game.load(plan);assert.equal(game.start(station.id,{...ctx,...extra}),false,JSON.stringify(extra));
}
for(const [extra,reason] of [[{planId:'other'},'room-changed'],[{health:0},'health'],[{visible:false},'occluded'],[{sandbox:true},'sandbox'],[{recovering:true},'recovery'],[{onFoot:false},'not-on-foot'],[{pose:{x:0,z:0}},'left-station']]) {
 const game=fresh();ready(game);tick(game,{},.05,{...ctx,...extra});const events=game.drainEvents();assert.equal(events.length,1);assert.equal(events[0].type,'cancel');assert.equal(events[0].reason,reason);assert.notEqual(events[0].outcome,'secured');
}
{
 const game=fresh();const start=game.snapshot();
 for(const dt of [0,-1,NaN,Infinity])tick(game,{x:true},dt);
 assert.deepEqual(game.snapshot(),start,'invalid/zero clocks cannot read input');
 ready(game);tick(game,{x:true});const dial=game.snapshot();assert.equal(dial.dialValue,1);
 for(let i=0;i<10;i++)tick(game,{x:true});assert.equal(game.snapshot().dialValue,1);assert.equal(game.snapshot().phase,'settle','held key cannot ready another input');
 settle(game);tick(game,{x:true},.05,{...ctx,paused:true});const paused=game.snapshot();
 for(let i=0;i<10;i++)tick(game,{x:true},1,{...ctx,paused:true});assert.deepEqual(game.snapshot(),paused);
 tick(game,{x:true});assert.equal(game.snapshot().dialValue,1,'resume cannot invent a held edge');
 tick(game);key(game,'x');key(game,'up');assert.equal(game.snapshot().channel,1);
 key(game,'up');assert.equal(game.snapshot().channel,0,'wrong second confirmation resets checksum');assert.equal(game.snapshot().progress,0);
 assert.equal(game.snapshot().mistakes,1);ready(game);tick(game,{x:true,y:true});assert.equal(game.snapshot().mistakes,2);
 ready(game);tick(game,{x:true});tick(game,{});tick(game,{up:true});assert.equal(game.snapshot().phase,'failed','early confirmation counts third mistake');
 assert.equal(game.drainEvents()[0].type,'failed');assert.equal(game.start(station.id,ctx),true);solve(game);assert.equal(game.drainEvents()[0].outcome,'secured');
}
{
 const game=fresh();ready(game);tick(game,{x:true});
 for(let i=0;i<30;i++)tick(game,{x:true});
 assert.equal(game.snapshot().mistakes,1);assert.equal(game.snapshot().phase,'ready');assert.equal(game.snapshot().progress,0);
 for(let i=0;i<20;i++)tick(game,{x:true});assert.equal(game.snapshot().mistakes,1,'held error requires neutral release before another attempt');
}
{
 const game=fresh();for(let i=0;i<100;i++)tick(game,{},.1);assert.equal(game.snapshot().progress,0,'elapsed time cannot secure the case');
 game.clear();const event=game.drainEvents()[0];assert.equal(event.reason,'room-cleared');assert.equal(event.type,'cancel');assert.equal(game.snapshot().active,false);
 game.load(plan);assert(game.start(station.id,ctx));game.load({...plan,id:'other'});assert.equal(game.drainEvents()[0].reason,'room-changed');
}
console.log('PASS evidence case: actual Coals furniture/solid/path/render disposal and exact rebuilt attributes; three dial channels, all wanted levels, no passive award/cash, neutral/release/hold/overlap/early/reset/retry guards, strict live room/health/sight/mode guards, pause/zero clocks and immutable once-only matching outcome.');
