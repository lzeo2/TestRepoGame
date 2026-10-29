// Actual Start callback, real Host/bots/models; no renderer or native-input claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from './vendor/three.module.js';
import {createWorldData,LANES,TEAM_COLORS,terrainHeight} from './world-data.mjs';
import {mergeGeometries} from './vendor/addons/BufferGeometryUtils.js';
import {createObjectiveGuide} from './objective-guide.mjs';
import {matchWorld} from './match-world.mjs';
import {surfaceHeight,capsuleIntersects} from './traversal.mjs';
import {createSystems} from './systems.mjs';
import {createBots} from './bots.mjs';
import {PlayerController} from './heroes/player-controller.mjs';
import {HeroRuntime} from './heroes/hero-runtime.mjs';
import {CameraMotionView} from './camera-motion-view.mjs';
import {preloadHeroes,disposeCharacterAssets} from './character-assets.mjs';
await preloadHeroes();
const {heroes:kits}=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url)));
const source=readFileSync(new URL('./game.mjs',import.meta.url),'utf8');
const a=source.indexOf('  function start(id) {'),b=source.indexOf('  ui=mountIntegrationUI(',a);
assert.ok(a>=0&&b>a);
const world=createWorldData(),boxes=[...world.boxes],sim=createSystems(matchWorld({...world,boxes}));
const entry=world.arena.protectedEntries.find(p=>p.z<0);
const hero=sim.addHero({id:'player',team:'carbon',lane:'midway',position:entry});
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,1,.1,1400);
const controller=new PlayerController({position:hero.position,boxes,ramps:world.ramps,floorHeight:(x,z,maxY)=>surfaceHeight({...world,boxes},x,z,maxY)});
const runtime=new HeroRuntime({scene,controller,kit:kits[0],boxes,source:hero.id,onEffect:e=>sim.applyHeroEffect(e)});
const motionView=new CameraMotionView(camera);
const context=vm.createContext({THREE,world,boxes,sim,hero,controller,runtime,motionView,kits,createBots,surfaceHeight,
  playing:false,qa:false,fixture:null,frameTravel:0,completionCue:null,lobby:{visible:true},
  view:{scene,camera},ui:{setPlaying(){},message(){}},clear(){},select(id){assert.equal(id,runtime.kit.id);}});
vm.runInContext(source.slice(a,b),context);
try {
  context.start(kits[0].id);
  assert.equal(context.playing,true);assert.equal(context.lobby.visible,false);
  assert.equal(sim.time,30);assert.equal(sim.phase,'laning');assert.equal(sim.winner,null);
  assert.equal(sim.heroes.length,10);assert.equal(context.bots.runtimes.length,9);
  assert.equal(sim.heroes.filter(h=>h.team===hero.team).length,7);
  assert.equal(sim.heroes.filter(h=>h.team!==hero.team).length,3);
  for(const h of sim.heroes) {
    assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.equal(h.hp,h.maxHp);
    assert.ok(h.position.z*(h.team==='carbon'?-1:1)>=115);
    assert.ok(Math.abs(h.position.z)<=121);
    assert.ok(!boxes.some(box=>capsuleIntersects(h.position,box)),`${h.id}: clear deployment capsule`);
  }
  const positions=sim.heroes.map(h=>JSON.stringify(h.position));
  assert.equal(new Set(positions).size,10,'spaced initial deployment, not stacked allies');
  for(const r of context.bots.runtimes) {
    const actor=sim.heroes.find(h=>h.id===r.source);
    assert.ok(r.visual.group.position.distanceTo(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z))<1e-8);
    assert.equal(r.shots,0);assert.deepEqual(r.castCount,{});
  }
  const before=JSON.stringify({time:sim.time,ids:sim.heroes.map(h=>h.id),positions});
  context.start(kits[0].id);
  assert.equal(JSON.stringify({time:sim.time,ids:sim.heroes.map(h=>h.id),positions:sim.heroes.map(h=>JSON.stringify(h.position))}),before,'repeated Start cannot duplicate or redeploy teams');
  console.log('start-placement-test: active public warm-up, 7 friendly/3 foes, clear distinct deployment, zero resource bonuses, model sync and idempotent Start passed (CPU only)');
} finally {
  context.bots?.dispose();runtime.dispose();motionView.dispose();disposeCharacterAssets();
  assert.equal(scene.children.length,0);
}

// Execute the actual scene constructor with only WebGL/upload/environment doubled.
let rendererClosed=0,contextClosed=0;
class RendererDouble {
  constructor(){this.info={render:{frame:0,calls:0,triangles:0},memory:{geometries:0,textures:0}};}
  setPixelRatio(){} setClearColor(){} setSize(){}
  render(scene,camera){this.lastCamera=camera;this.info.render.frame++;}
  dispose(){rendererClosed++;} forceContextLoss(){contextClosed++;}
}
const canvas2d=()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})});
const sceneSource=readFileSync(new URL('./world-scene.mjs',import.meta.url),'utf8');
const constructor=sceneSource.slice(sceneSource.indexOf('export function createWorldScene')).replace('export function','function');
const view=vm.runInNewContext(constructor+'\ncreateWorldScene(canvas,world);',{
  THREE:{...THREE,WebGLRenderer:RendererDouble},LANES,TEAM_COLORS,terrainHeight,mergeGeometries,createObjectiveGuide,world,
  canvas:{clientWidth:1280,clientHeight:720},document:{createElement:canvas2d},
  createEnvironment:()=>({update(){},dispose(){},diagnostics(){return {};}})
});
try {
  const first=view.syncObjectives(sim,hero,[],()=>false);
  assert.equal(first.name,'midway guardian');
  const label=view.scene.getObjectByName('current-objective-label');assert.equal(label.visible,true);
  const texture=label.material.map,version=texture.version;
  view.syncObjectives(sim,hero,[],()=>false);assert.equal(texture.version,version,'unchanged goal text does not upload another texture');
  const goal=sim.structures.find(s=>s.id===first.goalId);
  sim.moveHero(hero.id,{...goal.position,x:goal.position.x+1});assert.ok(sim.damage(goal.id,1e6,hero.id,{kind:'ability'}).killed);
  const next=view.syncObjectives(sim,hero,sim.drainEvents(),()=>true);
  assert.equal(next.completion.goalId,goal.id);assert.equal(next.name,'midway walker');assert.equal(next.occluded,true);
  assert.equal(label.material.map,texture,'one reusable goal texture');
  view.renderCamera(view.camera);assert.equal(view.diagnostics().frames,1);
  console.log('start-placement-test: actual scene goal/label/progress/completion wiring, cached texture and teardown passed (renderer/environment doubles, not native rendering)');
} finally {view.dispose();view.dispose();assert.equal(view.scene.children.length,0);assert.equal(rendererClosed,1);assert.equal(contextClosed,1);}
