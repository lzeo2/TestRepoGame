import * as THREE from './vendor/three.module.js';
import { createWorldData } from './world-data.mjs';
import { createWorldScene } from './world-scene.mjs';
import { createTraveler, stepTraveler, interact, interaction, moveCapsule, surfaceHeight, FALL_LIMIT } from './traversal.mjs';
import { createSystems } from './systems.mjs';
import { matchWorld } from './match-world.mjs';
import { createSystemsLayer } from './systems-view.mjs';
import { createKeepClearLayer } from './heroes/keep-clear-layer.mjs';
import { panelSegment } from './heroes/keep-clear.mjs';
import { PlayerController } from './heroes/player-controller.mjs';
import { HeroRuntime } from './heroes/hero-runtime.mjs';
import { selectExpansionSlice } from './heroes/qa-slices.mjs';
import { createBots } from './bots.mjs';
import { mountIntegrationUI } from './integration-ui.mjs';
import { mountPortrait } from './portrait.js';
import { preloadHeroes, loadCharacter, characterMetadata, disposeCharacterAssets, TRIO_HERO_IDS } from './character-assets.mjs';

const canvas=document.getElementById('game'), abort=new AbortController();
const loadingStatus=document.getElementById('loading-status');
function startupStage(stage,text) {
  loadingStatus.dataset.stage=stage;loadingStatus.textContent=text;loadingStatus.hidden=false;
}
const listen=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:abort.signal});
const held=new Set(),edges=new Set(),world=createWorldData();
const query=new URLSearchParams(location.search);
const fixture=query.get('qa');
const qa=fixture && ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let view,sim,hero,controller,runtime,bots,actors,ui,portrait,lobby,raf=0,observer;
let playing=false,paused=false,stopped=false,pointer=null,previous=performance.now(),wasAlive=true;
const history=[],boxes=[...world.boxes],distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const traveler=createTraveler(world);
const clear=()=>{held.clear();edges.clear();pointer=null;sim?.setRetreat('player',false);};
const targets=()=>[...sim.heroes,...sim.troopers,...sim.structures].map(e=>({
  id:e.id,team:e.team,kind:e.kind,position:e.position,living:e.alive,alive:e.alive&&(e.team===hero.team||!(e.cloakUntil>sim.time)),
  radius:e.kind==='structure'?3:.6,height:e.kind==='structure'?12:1.8
})).concat(sim.wallPanels?.()??[]);
function panelBlocks(from,to) {
  return boxes.some(box=>box.panelTarget&&box.panelTarget.alive!==false&&panelSegment(from,to,box,.45,1.8)!==null);
}
function effect(event) {
  const orb=sim.orbs.find(o=>o.id===event.target);
  const result=orb && event.ability===(runtime.kit.weapon.id??runtime.kit.weapon.name)
    ?sim.shootOrb(event.source,orb.id,{kitShot:true}):sim.applyHeroEffect(event);
  view?.wallLayer?.sync(sim);
  if(result.ok&&event.kind==='damage'&&result.amount)ui?.message(`${event.headshot?'Headshot':'Hit'}: ${Math.ceil(result.amount)} damage.`);
  if(qa && !result.ok && event.kind==='damage') history.push({time:sim.time,rejected:result.reason,ability:event.ability});
  return result;
}
function resetTraversal(position) {
  const collected=traveler.collected,broken=traveler.broken;
  Object.assign(traveler,createTraveler({...world,start:position}),{collected,broken,safe:{...position},grounded:controller.grounded});
}
function moveToSystem() {
  if(distance(controller.position,hero.position)>.1) {
    // Recall/respawn are validated teleports. Active-item dashes still collide.
    const teleport=hero.alive!==wasAlive;
    const p=teleport?hero.position:moveCapsule({...controller.position,grounded:controller.grounded},hero.position.x-controller.position.x,hero.position.z-controller.position.z,{...world,boxes},traveler.broken);
    controller.warp(p);resetTraversal(p);sim.moveHero(hero.id,p);
  }
}
function inputBlocked() {
  return !playing||paused||document.hidden||!hero.alive||sim.winner||sim.phase==='finished'||!document.querySelector('.sys-shop').hidden||document.querySelector('dialog[open]');
}
function action(name) {
  if(name==='capture') {if(playing&&!paused) canvas.requestPointerLock?.().catch(()=>ui.message('Mouse capture denied. Drag the view or use arrow keys.'));return;}
  if(inputBlocked())return;
  view?.wallLayer?.sync(sim);
  if(name==='interact') {
    const previousMode=traveler.mode;
    Object.assign(traveler,controller.position,{grounded:controller.grounded,stamina:controller.stamina});
    if(previousMode==='free')traveler.vy=controller.velocity.y;
    const hit=interaction(world,traveler);
    if(sim.stats(hero.id).movementStopped&&['zip','portal','vent','rope','detach'].includes(hit?.kind)) {ui.message('Stationary while Approved Only is active.');return;}
    const landing=hit?.kind==='portal'?world.portals.find(p=>p.id!==hit.item.id):hit?.kind==='vent'?hit.item.target:hit?.kind==='rope'?world.rope.landing:hit?.kind==='zip'?{...hit.line[hit.end==='a'?'b':'a'],y:0}:null;
    if(landing&&panelBlocks(landing,landing)){ui.message('Panels block the landing.');return;}
    interact(world,traveler);
    for(let i=boxes.length-1;i>=0;i--)if(traveler.broken.has(boxes[i].id))boxes.splice(i,1);
    view.sync(traveler);
    if(previousMode!==traveler.mode||hit?.kind==='portal')controller.syncTraversal(traveler);
    if(traveler.mode==='free')sim.moveHero(hero.id,controller.position);
    return;
  }
  if(sim.phase==='pregame')return;
  // Native key/touch edges can arrive before the next simulation frame.
  controller.updateCamera(view.camera,0);runtime.aim(view.camera);runtime.targets=targets();
  if(name==='reload')runtime.startReload();
  else if(name==='melee'||name==='parry')runtime[name]();
  else if(/^Digit[1-4]$/.test(name))runtime.cast(Number(name.at(-1)));
}
function fire() {
  if(inputBlocked()||sim.phase==='pregame')return false;
  view?.wallLayer?.sync(sim);
  if(runtime.fireWait>0||runtime.reload>0)return false;
  // Refresh aim/targets on press, not on the next simulation frame.
  controller.updateCamera(view.camera,0);runtime.aim(view.camera);
  const stats=sim.stats(hero.id);
  runtime.setModifiers({magazine:stats.maxAmmo,fire:stats.fireInterval/runtime.kit.weapon.interval});
  const original=runtime.targets;
  runtime.targets=[...targets(),...sim.orbs.filter(o=>o.type==='floating'&&!o.claimed).map(o=>({id:o.id,team:'ivory',alive:true,position:{...o.position,y:o.position.y-.65},height:1.3,radius:.65}))];
  try {return runtime.fire();} finally {runtime.targets=original;}
}
function tick(dt) {
  if(!playing||paused||document.hidden||sim.winner)return;
  view?.wallLayer?.sync(sim);
  moveToSystem();
  if(hero.alive!==wasAlive) {runtime.reset();controller.warp(hero.position);resetTraversal(hero.position);wasAlive=hero.alive;}
  runtime.targets=targets();
  if(hero.alive) {
    const stats=sim.stats(hero.id);
    runtime.setModifiers({magazine:stats.maxAmmo,fire:stats.fireInterval/runtime.kit.weapon.interval});
    // Systems owns all speed statuses and the explicit self-stop, once.
    controller.movementStopped=stats.movementStopped===true;
    controller.speedMultiplier=stats.moveSpeed/8;
    if(controller.movementStopped&&traveler.mode!=='free') {traveler.mode='free';traveler.ride=null;traveler.vy=0;controller.syncTraversal(traveler);}
    const yawStep=(Number(held.has('ArrowLeft'))-Number(held.has('ArrowRight')))*dt*1.7;
    controller.yaw+=yawStep/2; // Move at the interval midpoint; aim still receives the full turn below.
    controller.pitch=THREE.MathUtils.clamp(controller.pitch+(Number(held.has('ArrowUp'))-Number(held.has('ArrowDown')))*dt,-1.2,1.2);
    if(traveler.mode!=='free') {
      const previous={x:traveler.x,y:traveler.y,z:traveler.z};
      const checkingPanels=boxes.some(box=>box.panelTarget&&box.panelTarget.alive!==false);
      const recovering=checkingPanels&&(![traveler.x,traveler.y,traveler.z,traveler.vy].every(Number.isFinite)||traveler.y<FALL_LIMIT);
      stepTraveler(world,traveler,{jump:edges.has('jump')},dt);
      if(checkingPanels&&!recovering&&panelBlocks(previous,traveler))Object.assign(traveler,previous,{mode:'free',ride:null,vy:0});
      controller.syncTraversal(traveler);
    } else {
      traveler.cooldown=Math.max(0,traveler.cooldown-dt);
      controller.update(dt,{forward:Number(held.has('KeyW'))-Number(held.has('KeyS')),side:Number(held.has('KeyD'))-Number(held.has('KeyA')),
        sprint:held.has('ControlLeft')||held.has('ControlRight'),slide:held.has('KeyC'),jump:edges.has('jump'),dash:edges.has('dash'),aim:held.has('aim')});
      controller.position.x=THREE.MathUtils.clamp(controller.position.x,-448,448);controller.position.z=THREE.MathUtils.clamp(controller.position.z,-448,448);
      Object.assign(traveler,controller.position,{grounded:controller.grounded,stamina:controller.stamina});
      const pit=world.pit;
      if(controller.position.y<0&&controller.position.x>pit.minX&&controller.position.x<pit.maxX&&controller.position.z>pit.minZ&&controller.position.z<pit.maxZ)controller.stamina=Math.max(0,controller.stamina-40*dt);
    }
    controller.yaw+=yawStep/2;
    sim.moveHero(hero.id,controller.position);
    sim.setRetreat(hero.id,held.has('KeyX'));
    controller.updateCamera(view.camera,dt);runtime.aim(view.camera);
    runtime.update(dt);
    if(held.has('fire'))fire();
  }
  edges.clear();runtime.visual.group.visible=hero.alive;
  bots.update(dt,{passive:qa&&['chain','traversal'].includes(fixture)});
  sim.step(dt);
  view?.wallLayer?.sync(sim);
  const events=sim.drainEvents();
  for(const event of events) {
    if(['respawn','recall_complete'].includes(event.type)&&event.heroId===hero.id) {
      controller.warp(hero.position);resetTraversal(hero.position);
      if(event.type==='respawn')runtime.reset();
    }
    if(['objective_fall','patron_phase','victory','orb_shot','orb_pickup','purchase','hero_death','respawn'].includes(event.type)) {
      history.push(event);if(history.length>1000)history.shift();
      if(event.type==='objective_fall')ui.message(`${event.team==='ivory'?'Enemy':'Allied'} ${event.objective.replaceAll('-',' ')} fell in ${event.lane}.`);
      if(event.type==='orb_shot'&&event.heroId===hero.id)ui.message(`Soul ${event.outcome}.`);
    }
  }
  const prompt=interaction(world,traveler);
  if(controller.movementStopped)ui.message('Stationary while Approved Only is active.',true);
  else if(prompt)ui.message(prompt.label,true);
  actors.sync(sim,view.camera);view.sync(traveler);view.syncStructures(sim.structures);
  ui.update({events,paused});
}
function stop() {
  if(stopped)return;stopped=true;cancelAnimationFrame(raf);clear();observer?.disconnect();
  ui?.dispose();
  let failed=false,failure;
  try {bots?.dispose();runtime?.dispose();} catch(error) {failed=true;failure=error;}
  try {view?.wallLayer?.dispose();} catch(error) {if(!failed)throw error;view.lastPanelCleanupError=error;}
  if(failed)throw failure; // Preserve even primitive callback failures; teardown may be partial.
  actors?.dispose();portrait?.dispose();disposeCharacterAssets();view?.dispose();abort.abort();
}
try {
  startupStage('hero-preload','Loading hero and trooper models.');
  await Promise.all([preloadHeroes(),loadCharacter('trooper'),loadCharacter('ribbon-seraph'),...TRIO_HERO_IDS.map(loadCharacter)]);
  startupStage('kit-load','Loading hero definitions.');
  const definitions=await Promise.all(['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].map(async name=>{
    const response=await fetch(`../../docs/${name}`);
    if(!response.ok)throw new Error(`Hero definitions HTTP ${response.status}`);
    return response.json();
  }));
  const nativeBotKits=definitions.flatMap(document=>document.heroes);
  const kits=nativeBotKits;
  const slice=selectExpansionSlice(location.hostname,fixture,query.get('hero'));
  const playerKits=slice?[slice]:kits;
  if(slice)await loadCharacter(slice.id);
  startupStage('world-construction','Building the arena and lobby.');
  view=createWorldScene(canvas,world);sim=createSystems(matchWorld({...world,boxes}));
  view.wallLayer=createKeepClearLayer(view.scene,boxes);
  hero=sim.addHero({id:'player',team:'carbon',lane:'midway',position:{x:-10,y:0,z:-430},souls:qa&&fixture==='shop'?25600:0});
  controller=new PlayerController({position:hero.position,boxes,ramps:world.ramps,floorHeight:(x,z,maxY)=>surfaceHeight({...world,boxes},x,z,maxY,traveler.broken)});
  controller.yaw=Math.PI;controller.pitch=-.06;
  runtime=new HeroRuntime({scene:view.scene,controller,kit:playerKits[0],boxes,source:hero.id,onEffect:effect});
  actors=createSystemsLayer(view.scene,{team:hero.team});
  // Lobby is a real room in the same scene, outside the combat district.
  lobby=new THREE.Group();lobby.position.set(-1000,0,0);view.scene.add(lobby);
  const lobbyGeometries=[],lobbyMaterials=[];
  function roomBox(w,h,d,x,y,z,color,glass=false) {
    const geometry=new THREE.BoxGeometry(w,h,d),material=new THREE.MeshStandardMaterial({color,roughness:1,transparent:glass,opacity:glass?.16:1,depthWrite:!glass});
    lobbyGeometries.push(geometry);lobbyMaterials.push(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);lobby.add(mesh);return mesh;
  }
  roomBox(26,.3,24,0,-.15,0,0x827762);roomBox(26,12,.5,0,6,-6,0xb7ad99);
  roomBox(.5,12,24,-12,6,0,0x9eacae);roomBox(.5,12,24,12,6,0,0x9eacae);
  for(const x of [-9,9])for(let y=1;y<7;y+=2) {roomBox(3,1.8,2,x,y,-4,0x737d83);roomBox(.6,.15,.1,x,y,-2.95,0x242820);}
  roomBox(7,1,3,-3,.5,-2,0x242820);roomBox(7.6,.2,3.6,-3,1.1,-2,0xeee9d8);
  for(const x of [-7,1])roomBox(.2,8,.2,x,5,-.8,0x242820);
  roomBox(8,.2,.2,-3,9,-.8,0x242820);roomBox(8,8,.07,-3,5,-.8,0xc7d6df,true);
  startupStage('portrait-load','Loading the lobby portrait.');
  portrait=await mountPortrait(lobby);portrait.group.scale.setScalar(23);portrait.group.position.set(-3.5,5,-2);
  startupStage('lobby-setup','Preparing hero selection and controls.');
  runtime.visual.group.position.set(-1007,0,4);runtime.visual.update(0,{yaw:Math.PI,speed:0,state:'idle'});
  let selected=playerKits[0].id;
  function select(id) {
    if(playing||id===selected)return;
    const kit=kits.find(k=>k.id===id)??(slice?.id===id?slice:null);
    if(!kit)return;
    selected=id;runtime.dispose();
    runtime=new HeroRuntime({scene:view.scene,controller,kit,boxes,source:hero.id,onEffect:effect});
    runtime.visual.group.position.set(-1007,0,4);runtime.visual.update(0,{yaw:Math.PI,speed:0,state:'idle'});
    ui?.update({runtime});view.renderCamera();
  }
  function start(id) {
    if(playing)return;select(id);
    const result=qa&&fixture==='jank40-slice'&&slice?.partialSlice===true&&runtime.kit===slice
      ?sim.configureHeroKit(hero.id,runtime.kit,{partialSlice:true}):sim.configureHeroKit(hero.id,runtime.kit);
    if(!result.ok)throw new Error(result.reason);
    bots=createBots({sim,scene:view.scene,world,kits,boxes,floorHeight:(x,z,maxY)=>surfaceHeight({...world,boxes},x,z,maxY),onEffect:e=>{const result=sim.applyHeroEffect(e);view.wallLayer?.sync(sim);return result;}});
    playing=true;lobby.visible=false;runtime.visual.group.position.copy(controller.position);
    ui.setPlaying(true);clear();controller.updateCamera(view.camera,0);runtime.aim(view.camera);
    ui.message(qa?`QA fixture: ${fixture}. Scripted state is not native gameplay evidence.`:'Waves arrive in 30 seconds. Follow Midway or use a lane zipline.');
  }
  ui=mountIntegrationUI({sim,heroId:hero.id,runtime,controller,world,kits:playerKits,onSelect:select,onStart:start,
    onPause:value=>{paused=value;clear();},onRestart:()=>location.assign(location.pathname),onAction:action});
  ui.setPlaying(false);
  const caption=document.createElement('p');caption.textContent='Patron effigy: supplied photo-derived relief behind glass.';caption.className='effigy-caption panel';document.getElementById('stage').append(caption);
  listen(document.getElementById('start'),'click',()=>{caption.hidden=true;});
  listen(document,'keydown',e=>{
    if(e.altKey||e.metaKey||e.target.closest('input,select,textarea'))return;
    if(e.code==='Escape'){document.exitPointerLock?.();clear();return;}
    if(!playing||paused||document.querySelector('dialog[open]'))return;
    const supported=/^(Key[WASDCQFREX]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right)|Digit[1-4])$/.test(e.code);
    if(!supported)return;
    if(e.code==='Space'&&e.target.tagName==='BUTTON'&&document.pointerLockElement!==canvas)return;
    e.preventDefault();held.add(e.code);
    if(!e.repeat){if(e.code==='Space')edges.add('jump');if(e.code.startsWith('Shift'))edges.add('dash');
      const names={KeyQ:'melee',KeyF:'parry',KeyR:'reload',KeyE:'interact'};if(names[e.code])action(names[e.code]);if(e.code.startsWith('Digit'))action(e.code);}
  });
  listen(document,'keyup',e=>held.delete(e.code));
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'pointerdown',e=>{
    if(!playing||paused)return;canvas.focus();
    if(e.pointerType==='mouse'){
      if(e.button===0){held.add('fire');fire();}else if(e.button===2)held.add('aim');else return;
      if(document.pointerLockElement!==canvas)action('capture');
    }
    else {pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
  });
  listen(document,'pointermove',e=>{
    let dx=0,dy=0;if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}
    else if(pointer?.id===e.pointerId){dx=e.clientX-pointer.x;dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;}
    controller.yaw-=dx*.0025;controller.pitch=THREE.MathUtils.clamp(controller.pitch-dy*.0025,-1.2,1.2);
  });
  listen(document,'pointerup',e=>{
    if(e.pointerType==='mouse'){if(e.button===0)held.delete('fire');if(e.button===2)held.delete('aim');}
    if(pointer?.id===e.pointerId)pointer=null;
  });
  listen(canvas,'pointercancel',clear);
  listen(canvas,'lostpointercapture',()=>{pointer=null;});
  listen(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas)clear();});
  listen(document,'pointerlockerror',()=>ui.message('Mouse capture unavailable. Drag to look or use the arrow keys.'));
  for(const button of document.querySelectorAll('[data-hold]')) {
    const key=button.dataset.hold;listen(button,'pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.add(key);if(key==='fire')fire();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,()=>held.delete(key));
  }
  for(const button of document.querySelectorAll('[data-edge]'))listen(button,'click',()=>{const name=button.dataset.edge;if(name.startsWith('Digit'))action(name);else edges.add(name);});
  for(const button of document.querySelectorAll('[data-action]'))listen(button,'click',()=>action(button.dataset.action));
  listen(window,'blur',clear);listen(document,'visibilitychange',()=>{clear();previous=performance.now();});
  listen(window,'pagehide',()=>{stop();lobbyGeometries.forEach(g=>g.dispose());lobbyMaterials.forEach(m=>m.dispose());});
  listen(canvas,'webglcontextlost',e=>{e.preventDefault();stop();document.getElementById('loading-status').hidden=false;document.getElementById('loading-status').textContent='3D context lost. Reload to restart.';});
  // Visible lobby models/portrait are fully loaded above; aim before any first draw.
  startupStage('first-lobby-render','Drawing the loaded lobby.');
  if(!playing) {view.camera.position.set(-1001,4.3,13);view.camera.lookAt(-1001,4,-2);view.renderCamera();}
  observer=new ResizeObserver(()=>{if(stopped)return;view.resize();view.renderCamera();});observer.observe(canvas);
  startupStage('snapshot-install','Preparing match diagnostics.');
  window.jank3dSnapshot=()=>({time:sim.time,phase:sim.phase,winner:sim.winner,playing,paused,fixture:qa?fixture:null,
    hero:{...hero,position:{...hero.position},items:[...hero.items]},controller:{position:controller.position.toArray(),state:controller.state,jumps:controller.jumps,stamina:controller.stamina,yaw:controller.yaw,pitch:controller.pitch,mode:traveler.mode},
    runtime:runtime.snapshot(),bots:bots?.snapshot()??[],troopers:sim.troopers.map(t=>({...t,position:{...t.position}})),orbs:sim.orbs.map(o=>({...o,position:{...o.position}})),
    structures:sim.structures.map(s=>({...s,position:{...s.position}})),history:history.slice(-100),portrait:portrait.metadata,models:characterMetadata(),diagnostics:view.diagnostics()});
  if(qa) {
    startupStage('qa-fixtures','Loading loopback test controls.');
    const {mountFixtures}=await import('./integration-fixtures.mjs');
    window.jank3dQA=mountFixtures({sim,world,hero,get runtime(){return runtime;},controller,traveler,view,actors,get bots(){return bots;},start:()=>{start(selected);caption.hidden=true;},tick,ui,history,setPaused:v=>{paused=v;},fixture});
    ui.message(`QA fixture: ${fixture}. Test controls enabled only on loopback.`);
  }
  function frame(now) {
    if(stopped)return;raf=requestAnimationFrame(frame);const dt=Math.min(.25,Math.max(0,(now-previous)/1000));previous=now;
    if(playing&&(paused||sim.winner))return; // Static paused/end frames do not need GPU redraws.
    // Tick already advanced camera time before aiming/firing; only refresh warps and collision here.
    if(playing) {for(let left=dt;left>1e-7;left-=.05)tick(Math.min(.05,left));if(hero.alive)controller.updateCamera(view.camera,0);}
    else return; // Lobby draws on initial load, selection and resize, even if RAF delivery is delayed.
    window.jank3dQA?.renderPreview();view.renderCamera();
  }
  raf=requestAnimationFrame(frame);
  startupStage('ready','Ready. Select a hero and start the match.');loadingStatus.hidden=true;
} catch(error) {
  stop();const output=document.getElementById('loading-status');output.hidden=false;output.textContent=`Unable to start: ${error.message}. Reload to retry. WebGL2 is required.`;console.error(error);
}
