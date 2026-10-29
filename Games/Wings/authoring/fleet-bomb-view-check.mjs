// CPU-only measured ray, safe GLB view and actual controller-method execution.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createFleet } from './fleet-sim.mjs';
import { compileGeometry, fittedHit, fittedHeightAt, yawRotate, yawQuaternion } from './fleet-geometry.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
const config = createLocalFleetConfig();
config.units.forEach(u => { u.weapons = []; });
const fleet = createFleet(config), geometries = new Map(config.geometry.map(e => [e.id, compileGeometry(e.descriptor)]));
const near = (a,b) => assert(Math.abs(a-b)<1e-7, `${a} != ${b}`);
let probes = 0;
for (const heading of [0,.63,Math.PI/2]) {
  const c = structuredClone(config);
  c.units.forEach((u,i) => { u.heading=heading; u.position=[i*1000,0,2900]; });
  const core = createFleet(c), before = core.snapshot(0), replay = core.exportReplay();
  for (const u of c.units) {
    const g = geometries.get(u.modelId);
    for (let x=g.clearance.min[0]-2;x<=g.clearance.max[0]+2;x+=2.7)
      for(let z=g.clearance.min[2]-2;z<=g.clearance.max[2]+2;z+=4.7) {
        const p=yawRotate([x,0,z],heading).map((v,i)=>v+u.position[i]);
        const a=[p[0],200,p[2]], b=[p[0],-100,p[2]];
        const t=fittedHit(g,a,b,u.position,heading);
        assert.equal(core.surfaceSegment(a,b),t); probes++;
      }
  }
  // Long oblique segments cross multiple fitted components and both hull candidates.
  for (const y of [-2,0,2,8,16,30]) {
    const a=[-1700,y,2900],b=[1900,y+1e-7,2900];
    const hits=c.units.map(u=>fittedHit(geometries.get(u.modelId),a,b,u.position,u.heading)).filter(t=>t!==null);
    assert.equal(core.surfaceSegment(a,b),hits.length?Math.min(...hits):null);
  }
  assert.deepEqual(core.snapshot(0),before); assert.deepEqual(core.exportReplay(),replay);
  core.advance(500);
  for(const u of core.snapshot(0).units){const a=[u.position[0],200,u.position[2]],b=[u.position[0],-100,u.position[2]];
    near(core.surfaceSegment(a,b),fittedHit(geometries.get(u.modelId),a,b,u.position,2*Math.atan2(u.view.orientation[1],u.view.orientation[3])));}
  const u=core.snapshot(0).units[0],a=[u.position[0],200,u.position[2]],b=[u.position[0],-100,u.position[2]];
  assert(core.resolveHostSegment({source:'aircraft_test',team:1-u.team,weapon:'cannon20',from:a,to:b,damage:10000,maxFraction:1}));
  assert.equal(core.surfaceSegment(a,b),null,'death excluded immediately');
}
for(const bad of [NaN,Infinity,100001,'0',null]) assert.equal(fleet.surfaceSegment([bad,0,0],[0,0,0]),null);
const unmodelled=structuredClone(config); unmodelled.units.forEach(u=>{delete u.modelId;u.half=[10,5,30];});
assert.equal(createFleet(unmodelled).surfaceSegment([0,200,2900],[0,-100,2900]),null);
console.log(`PASS core ${probes} fitted component/gap/yaw/translation rays, bounded vectors and pure snapshots/replay`);
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT,'Use approved existing tools');
const root=fileURLToPath(new URL('../../../',import.meta.url)), src=resolve(root,'Games/Wings/source/games/wings/src');
const three=resolve(process.env.THREE_ROOT), manifest=JSON.parse(readFileSync(resolve(three,'package.json')));
assert.equal(manifest.version,'0.186.0');
const T=await import(pathToFileURL(resolve(three,'build/three.webgpu.js')));
const {build}=await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT,'lib/main.js')));
const aliases={name:'approved-three',setup(api){api.onResolve({filter:/^three(?:\/.*)?$/},args=>{
  const key=args.path==='three'?'.':`.${args.path.slice(5)}`;let target=manifest.exports[key];
  if(!target)for(const [p,v]of Object.entries(manifest.exports))if(p.endsWith('*')&&key.startsWith(p.slice(0,-1)))target=v.replace('*',key.slice(p.length-1));
  if(typeof target==='object')target=target.import;return {path:resolve(three,target)};
});}};
const entry=resolve(src,'ui/local-factions.ts');
const fixtures={name:'manual-real-glb-view',setup(api){
  api.onResolve({filter:/^three\/addons\/loaders\/GLTFLoader\.js$/},()=>({path:'loader',namespace:'fixture'}));
  api.onResolve({filter:/^\.\.\/sim\/loopback$/},args=>args.importer===entry?{path:'room',namespace:'fixture'}:undefined);
  api.onResolve({filter:/retained-host-bridge\.mjs$/},args=>args.importer===entry?{path:'bridge',namespace:'fixture'}:undefined);
  api.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',resolveDir:root,contents:args.path==='loader'?
    'export class GLTFLoader {parseAsync(b){return globalThis.__bombParse(b)}}':args.path==='room'?
    `import {createLoopbackRoom as actual} from ${JSON.stringify(resolve(src,'sim/loopback.ts'))}; export function createLoopbackRoom(c,n,h,o){return globalThis.__bombRoom=actual(c,n,h,{...o,manual:true})}`:
    `import {createRetainedHostBridge as actual} from ${JSON.stringify(resolve(root,'Games/Wings/authoring/retained-host-bridge.mjs'))}; export function createRetainedHostBridge(o){globalThis.__bombPublish=o.onSnapshot;return actual(o)}` }));
}};
const game=readFileSync(resolve(src,'ui/game.ts'),'utf8');
const methods=game.slice(game.indexOf('  private bombRayPoint('),game.lastIndexOf('\n}'));
const options={bundle:true,write:false,outdir:'in-memory-bomb-check',format:'esm',minify:true,legalComments:'none',define:{'import.meta.env.BASE_URL':'"./"','import.meta.env.DEV':'false'}};
const result=await build({...options,platform:'node',plugins:[fixtures,aliases],stdin:{loader:'ts',resolveDir:src,contents:`
export {prepareLocalFactions} from './ui/local-factions';
export {withFleetSurface} from './sim/fleet-world-query';
import {bombImpactPoint,flightReadout,forward} from './sim/flight';
export {bombImpactPoint,createFlightState} from './sim/flight';
import {segmentHitsGround,posedFleet,groundHeight} from './sim/geography';
export {worldQuery,segmentHitsGround,posedFleet} from './sim/geography';
import {AA_RANGE,SHIP_SPECS,SPAWN_PROTECTION,shipHasAAMounts,worldToShip} from './sim/fleet';
import {VEHICLES,WEAPONS} from './sim/vehicles';
import {STEALTH_AA_CEILING,leadPoint} from './sim/combat';
import {shipName} from './ui/fleet-names';
const RETICLE_LIMIT=1;
export class Probe {${methods}\n}
`}});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const saved=new Map(['location','fetch','__bombParse','__bombRoom','__bombPublish'].map(k=>[k,globalThis[k]]));
let local;
try {
  globalThis.location={href:'http://127.0.0.1/'};
  globalThis.fetch=async url=>{const p=new URL(url);assert.equal(p.origin,'http://127.0.0.1');assert.match(p.pathname,/^\/models\/derived\/[\w.-]+\.glb$/);return new Response(readFileSync(resolve(root,'Games/Wings',p.pathname.slice(1))));};
  globalThis.__bombParse=async bytes=>{const {object}=modelGeometryFixture(T,bytes);return {scene:object,scenes:[object]};};
  const scene=new T.Scene();
  local=await api.prepareLocalFactions({scene,quality:'low',effects:{setFleetFrame(){},fleetStats(){return {};}}});
  assert.equal(local.surfaceSegment([0,100,0],[0,0,0]),null);assert.equal(local.surfaceContact([0,0,0]),null);
  local.connect('Bomb CPU',{onMessage(){}});const room=globalThis.__bombRoom;room.step(1/60);
  const frame=structuredClone(local.debug().frame), u=frame.units.find(u=>u.team===1), g=geometries.get(u.modelId);
  const publish=units=>globalThis.__bombPublish(room.playerId,{...frame,units});
  const probe=new api.Probe();
  Object.assign(probe,{localFleet:local,flightWorld:api.withFleetSurface(api.worldQuery,local.surfaceHeightAt),hudFrame:{weapons:[]},me:{seat:0},state:'flying',input:{bombsight:true,steeringBomb:true},offline:true,view:'chase',shipStates:[],sentFlight:{boost:false},aim:[0,-1,0],bombAimDir:[0,-1,0],weaponsBuf:[{},{}],renderList:[],deps:{host:{rig:{gunZoom:1},setSpeedFx(){},setFocus(){}}},hud:{update(){}}});
  const checkHud=(pos,team=0)=>{
    const flight=api.createFlightState('bomber',{position:pos,yaw:0,onGround:false});flight.velocity=[0,-10,0];
    const v={id:'b',kind:'bomber',team,alive:true,flight,weapons:[[{ammo:8}],[]],aim:[[0,-1,0],[0,-1,0]]};
    probe.bombFall={pos,vel:flight.velocity};probe.updateHud({time:1,scores:[0,0],missiles:[]},{pos,quat:flight.orientation,render:v},1);return probe.hudFrame;
  };
  for(const heading of [0,.63,Math.PI/2]) {
    const position=[800,0,2900];publish([{...u,position,view:{...u.view,orientation:yawQuaternion(heading)}}]);
    const rig=scene.getObjectByName(`fleet-unit:${u.id}`);assert.deepEqual(rig.position.toArray(),position);
    near(rig.quaternion.y,Math.sin(heading/2));
    for(const box of g.boxes){const p=yawRotate([(box.min[0]+box.max[0])/2,0,(box.min[2]+box.max[2])/2],heading).map((v,i)=>v+position[i]);
      const a=[p[0],200,p[2]],b=[p[0],-100,p[2]],t=fittedHit(g,a,b,position,heading);near(local.surfaceSegment(a,b),t);
      const top=fittedHeightAt(g,p[0],p[2],position,heading),contact=local.surfaceContact([p[0],top,p[2]]);assert(contact);assert(Object.isFrozen(contact));assert.equal(contact.modelId,undefined);
      assert.equal(local.surfaceContact([p[0],top+1,p[2]]),null);
    }
    const p=[position[0],200,position[2]],out=[0,0,0];assert(api.bombImpactPoint(p,[0,-10,0],out,probe.flightWorld)>0);assert(local.surfaceContact(out));
    const f=checkHud(p);assert.equal(f.bombSight.overShip,'flagship');assert.equal(f.bombCam.ship,'flagship');near(f.bombCam.shipHp,u.hp/u.maxHp);assert.equal(f.stealth,null);assert(local.surfaceContact(f.aimPoint));assert(local.surfaceContact(f.bombCam.cursor));
    assert.equal(checkHud(p,1).bombSight.overShip,null);assert.equal(probe.hudFrame.bombCam.ship,null);
    probe.flightWorld=api.withFleetSurface({...api.worldQuery,groundHeight:()=>250},local.surfaceHeightAt);
    assert.equal(checkHud([position[0],400,position[2]]).bombSight.overShip,null,'higher native terrain is not a fleet cue');
    probe.flightWorld=api.withFleetSurface(api.worldQuery,local.surfaceHeightAt);
  }
  for(const patch of [null,{alive:false,hp:0},{kind:'sub'},{modelId:'unknown'}]){
    publish(patch?[{...u,...patch}]:[]);assert.equal(local.surfaceSegment([u.position[0],200,u.position[2]],[u.position[0],-100,u.position[2]]),null);assert.equal(local.surfaceContact([u.position[0],0,u.position[2]]),null);
  }
  publish([]);assert.equal(checkHud([u.position[0],200,u.position[2]]).bombSight.overShip,null);
  // Execute actual ray arbitration at native obstruction, exact tie and both near ties.
  const start=[800,200,2900], aim=[0,-1,0],end=[800,-19800,2900];
  const native=api.segmentHitsGround(start,end);assert(native!==null);
  for(const delta of [-1e-9,0,1e-9]){
    probe.localFleet={surfaceSegment:()=>native+delta};
    const p=probe.bombRayPoint(start,aim);near(p[1],start[1]-20000*Math.min(native,native+delta));
  }
  probe.localFleet=local;
  for(const aim of [[.7,-.1,0],[-.6,-.2,.2],[0,-1,0]]){
    const end=start.map((n,i)=>n+aim[i]*20000),t=api.segmentHitsGround(start,end),p=probe.bombRayPoint(start,aim);
    if(t===null)assert.equal(p,null);else p.forEach((n,i)=>near(n,start[i]+(end[i]-start[i])*t));
  }
  // Execute every actual prediction call with the native function and a deliberately elevated context.
  const calls=[...game.matchAll(/bombImpactPoint\([^\n]*?this\.flightWorld\)/g)].map(m=>m[0]);assert.equal(calls.length,4);
  const p=[800,300,2900], velocity=[0,-10,0];
  for(const call of calls){const out=[0,0,0];const fn=new Function('bombImpactPoint','p0','myVehicle','ownVis','imp','pos','vel','out','b',`return ${call}`);
    assert(fn.call({flightWorld:{groundHeight:()=>100}},api.bombImpactPoint,p,{flight:{velocity}},{pos:p,flight:{velocity}},out,p,velocity,out,{pos:p,vel:velocity})>0);assert.equal(out[1],100);}
  probe.localFleet=null;probe.flightWorld=api.worldQuery;assert(checkHud([800,200,2900]).stealth,'ordinary AA indicator retained');
  local.dispose();assert.equal(local.surfaceSegment([0,100,0],[0,0,0]),null);assert.equal(local.surfaceContact([0,0,0]),null);assert.equal(scene.getObjectByName('fleet-presentation'),undefined);
  console.log('PASS real prepareLocalFactions/GLB roots, current safe yaw, exact contact/HP, real GameSession HUD/rays and four native predictions; friendly/terrain/privacy/death/reset/leave negatives');
}finally{local?.dispose();for(const[k,v]of saved)if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
const compiled=await build({...options,platform:'browser',entryPoints:[resolve(src,'main.ts')],plugins:[aliases]});
assert(compiled.outputFiles[0].contents.length>0);
console.log(`PASS actual main.ts write:false compile (${compiled.outputFiles[0].contents.length} bytes); native pixels, near-miss AOE and AI bombing OPEN`);
