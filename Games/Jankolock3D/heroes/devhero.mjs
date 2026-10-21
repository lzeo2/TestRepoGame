import * as THREE from '../vendor/three.module.js';
import { PlayerController } from './player-controller.mjs';
import { HeroRuntime } from './hero-runtime.mjs';

const icons={hook:'M5 18l-2 2m2-6L14 5a4 4 0 015 5l-9 9a4 4 0 01-5-5zm4-4l5 5',volley:'M3 18h3v3H3zm7-9h3v3h-3zm9 9h3v3h-3zM6 10l3-4m6 0l3 4',slam:'M12 2v12m-5-5l5 5 5-5M3 20h18',overtime:'M12 4a8 8 0 110 16 8 8 0 010-16zm0 3v6l4 2',turret:'M4 8h13v6H4zm13 2h5M10 14v4m0 0l-6 4m6-4l6 4',barricade:'M3 20V6h6v14m0 0V3h6v17m0 0V6h6v14',grenade:'M12 5l8 8-8 8-8-8zm0 0V2m0 2h5',chaingun:'M4 6h16v12H4zm0 4h16m-16 4h16m-8-8v12',longshot:'M3 20L20 3m-7 2h6v6M3 16l5 5',tether:'M3 4c14-5 4 11 13 8s7 9 2 9',headshot:'M12 2l5 10-5 10-5-10zm-9 8h3m12 0h3',xray:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6',puddle:'M3 15c0-4 4-2 5-6s5-3 6 0 7 1 7 6-18 6-18 0z',glue:'M12 2S5 11 5 15a7 7 0 0014 0c0-4-7-13-7-13z',missionbomb:'M5 5h14v14H5zm0 4h14m-9-4v14',aura:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z'};
const $=id=>document.getElementById(id);
const abort=new AbortController(),listen=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:abort.signal});
let renderer,runtime,raf=0,stopped=false;

try {
  const response=await fetch('../../../docs/jank3d-hero-kits.json');
  if(!response.ok)throw new Error(`Hero definitions unavailable (${response.status})`);
  const {heroes}=await response.json(),kit=heroes.find(h=>h.id===document.body.dataset.hero);
  if(!kit)throw new Error('Unknown hero');
  const fragment=document.createElement('div');
  fragment.innerHTML=`<a class="skip" href="#controls">Skip to hero controls</a>
  <header class="site-header"><h1>Jankolock 3D</h1><nav aria-label="Site"><a href="../../../index.html">Arcade</a><button id="theme" type="button">Theme</button></nav></header>
  <section class="hero-row" aria-label="Hero selection"><div><h2 id="row-name"></h2><span class="subheading"> / Hero workshop</span></div><nav class="hero-links" aria-label="Heroes"></nav><label class="mobile-select"><span hidden>Choose hero</span><select id="hero-select" aria-label="Choose hero"></select></label></section>
  <main><section class="viewport" aria-label="Third-person training range"><canvas id="range" tabindex="0" aria-label="Training range. Capture mouse for mouse look; Escape releases it. Drag to look on touch screens." aria-describedby="control-help"></canvas><span class="reticle" aria-hidden="true"></span></section>
  <aside id="controls" class="panel" tabindex="-1" aria-label="Hero controls"><h2 id="hero-name"></h2><p class="role" id="role"></p><div class="resources"><div class="resource"><label for="health">Health <span id="health-value"></span></label><progress id="health"></progress></div><div class="resource"><label for="stamina">Stamina <span id="stamina-value"></span></label><progress id="stamina" max="100" value="100"></progress></div></div><div class="ability-grid" aria-label="Abilities"></div>
  <p class="help" id="control-help">WASD move / Mouse look<br>Shift dash / Space double jump<br>Ctrl sprint / C slide<br>LMB fire / RMB aim<br>Q melee / F parry / R reload</p>
  <div class="touch-controls"><div class="touch-row"><button data-hold="KeyA">← Left</button><button data-hold="KeyW">↑ Forward</button><button data-hold="KeyD">→ Right</button><button data-hold="KeyS">↓ Back</button></div><div class="touch-row actions-row"><button data-hold="fire">Fire</button><button data-hold="aim">Aim</button><button data-edge="jump">Jump</button><button data-edge="dash">Dash</button><button data-hold="KeyC">Slide</button></div><div class="touch-row"><button data-hold="ControlLeft">Sprint</button><button data-action="melee">Melee</button><button data-action="parry">Parry</button><button data-action="reload">Reload</button></div><p class="touch-help">Drag the view to look.</p></div>
  <div class="actions"><button id="capture">Capture mouse</button><button id="reset">Reset range</button></div><p class="readout" id="readout"></p></aside></main>
  <footer class="footer" id="message" role="status" aria-live="polite">Training range. Select an ability or capture the mouse to practise.</footer>`;
  document.body.replaceChildren(...fragment.childNodes);
  $('row-name').textContent=$('hero-name').textContent=kit.name;$('role').textContent=kit.role;
  document.title=`${kit.name} · Jankolock 3D hero workshop`;
  heroes.forEach((h,index)=>{
    const a=document.createElement('a');a.href=`devhero-${index+1}.html`;a.textContent=h.name;
    if(h.id===kit.id)a.setAttribute('aria-current','page');document.querySelector('.hero-links').append(a);
    const option=document.createElement('option');option.value=String(index+1);option.textContent=h.name;option.selected=h.id===kit.id;$('hero-select').append(option);
  });
  listen($('hero-select'),'change',e=>{location.href=`devhero-${Number(e.target.value)}.html`;});
  const abilityButtons=kit.abilities.map(a=>{
    const button=document.createElement('button');button.className='ability';button.type='button';button.dataset.slot=a.slot;
    button.title=a.description;button.setAttribute('aria-label',`${a.slot}: ${a.name}. ${a.description}`);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',icons[a.id]);svg.append(path);
    const timer=document.createElement('span');timer.className='timer';timer.textContent=a.slot;
    const name=document.createElement('span');name.className='name';name.textContent=a.name;
    button.append(svg,timer,name);document.querySelector('.ability-grid').append(button);return button;
  });
  let dark=matchMedia('(prefers-color-scheme: dark)').matches;
  const theme=()=>{document.documentElement.dataset.theme=dark?'dark':'light';$('theme').setAttribute('aria-pressed',String(dark));};theme();
  listen($('theme'),'click',()=>{dark=!dark;theme();});
  const canvas=$('range');renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xa3b8c5);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.1,160);
  scene.add(new THREE.AmbientLight(0xffffff,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-10,20,10);scene.add(sun);
  const geometries=[],materials=[];
  function mesh(w,h,d,x,y,z,color) {
    const geometry=new THREE.BoxGeometry(w,h,d),material=new THREE.MeshLambertMaterial({color,flatShading:true});
    geometries.push(geometry);materials.push(material);const result=new THREE.Mesh(geometry,material);result.position.set(x,y,z);scene.add(result);return result;
  }
  mesh(50,.2,60,0,-.1,-5,0x919591);
  for(let x=-15;x<=15;x+=5)for(let z=-20;z<=12;z+=8)mesh(.08,.012,3,x,.01,z,0x656b6d);
  const boxes=[];
  function cover(x,y,z,w,h,d,color=0x737d83) {
    const object=mesh(w,h,d,x,y+h/2,z,color);boxes.push({minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2});return object;
  }
  cover(-19,0,-4,2,8,46);cover(19,0,-4,2,8,46);cover(0,0,-26,40,7,2);cover(0,0,18,40,4,2);
  cover(-15,0,-18,6,12,8);cover(14,0,-20,7,10,7);cover(8,0,-5,3,3,1.5);cover(-10,0,2,3,1,3,0xa59c89);
  const controller=new PlayerController({position:{x:0,y:0,z:8},boxes});controller.pitch=-.025;
  const targets=[];const targetMeshes=new Map();
  function dummy(id,x,z,team='ivory') {
    const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
    const add=(w,h,d,px,py,pz,c)=>{const part=mesh(w,h,d,px,py,pz,c);scene.remove(part);group.add(part);return part;};
    add(.95,1.5,.65,0,1,0,team==='carbon'?0x9facb7:0xc2b59c);add(.2,.4,.2,0,.2,0,0x454a48);add(1.1,.1,.8,0,.05,0,0x454a48);
    for(const y of [.6,1.1,1.6]){add(.85,.025,.03,0,y,.34,0x454a48);add(.25,.08,.025,0,y+.13,.36,0xf0e9d9);}
    const hpBar=add(1.05,.09,.04,0,2.1,0,0x365a74);
    const target={id,position:group.position,team,hp:team==='carbon'?140:400,maxHp:400,alive:true,slowUntil:0};targets.push(target);targetMeshes.set(id,{group,hpBar});return target;
  }
  dummy('left',-5,-2);dummy('center',0,-2);dummy('right',5,-2);dummy('covered',8,-10);dummy('ally',-3,5,'carbon');
  let health=kit.health,damage=0,healing=0,lastEvent='No hits yet',counterfire=0;
  function effect(event) {
    if(event.kind==='buff'||event.kind==='buff-end')return;
    const target=targets.find(t=>t.id===event.target);
    if(event.kind==='damage'&&target&&target.team!=='carbon') {
      const amount=event.baseDamage*(event.headshotMultiplier??1);target.hp=Math.max(0,target.hp-amount);damage+=amount;
      if(event.slow)target.slowUntil=runtime.time+event.duration;
      if(target.hp===0){target.alive=false;target.respawn=runtime.time+3;}
      lastEvent=`${event.headshot?'Headshot':'Hit'} ${target.id}: ${Math.round(amount)}`;
    }
    if(event.kind==='heal') {
      if(event.target==='player'){const amount=Math.min(event.baseHeal,kit.health-health);health+=amount;healing+=amount;}
      else if(target){const amount=Math.min(event.baseHeal,target.maxHp-target.hp);target.hp+=amount;healing+=amount;}
      lastEvent=`Healing: ${Math.round(healing)}`;
    }
    if(event.kind==='tether-end'&&target)target.slowUntil=0;
  }
  runtime=new HeroRuntime({scene,controller,kit,targets,boxes,onEffect:effect});
  const held=new Set(),edges={jump:false,dash:false};let pointer=null,previous=performance.now(),paused=false;
  function release(){held.clear();edges.jump=edges.dash=false;pointer=null;}
  function cast(slot){if(runtime.cast(slot)){$('message').textContent=`${kit.abilities[slot-1].name}: ${kit.abilities[slot-1].description}`;}else{$('message').textContent='Ability is cooling down, or its placement is blocked.';}}
  abilityButtons.forEach((button,index)=>listen(button,'click',()=>cast(index+1)));
  function reset(){release();controller.warp({x:0,y:0,z:8});controller.yaw=0;controller.pitch=-.025;runtime.reset();health=kit.health;damage=healing=counterfire=0;lastEvent='No hits yet';for(const target of targets){target.hp=target.team==='carbon'?140:400;target.alive=true;target.slowUntil=0;target.respawn=null;}$('message').textContent='Range reset. Targets return three seconds after being knocked down.';}
  listen($('reset'),'click',reset);
  async function capture(){try{await canvas.requestPointerLock();canvas.focus();}catch{$('message').textContent='Mouse capture was denied. Drag the view to look, or try Capture mouse again.';}}
  listen($('capture'),'click',capture);
  listen(document,'pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(!locked)release();$('capture').textContent=locked?'Mouse captured':'Capture mouse';});
  listen(document,'pointerlockerror',()=>{$('message').textContent='Mouse capture unavailable. Drag the view to look.';});
  listen(document,'keydown',e=>{
    if(e.code==='Escape'){document.exitPointerLock();release();return;}
    if(e.target.matches('select,input')||e.altKey||e.metaKey)return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD','KeyC','KeyQ','KeyF','KeyR','Digit1','Digit2','Digit3','Digit4'].includes(e.code)) {
      if(e.code==='Space'&&e.target.tagName==='BUTTON'&&document.pointerLockElement!==canvas)return;
      e.preventDefault();held.add(e.code);
      if(!e.repeat){if(e.code==='Space')edges.jump=true;if(e.code.startsWith('Shift'))edges.dash=true;if(e.code==='KeyQ')runtime.melee();if(e.code==='KeyF')runtime.parry();if(e.code==='KeyR')runtime.startReload();if(/^Digit[1-4]$/.test(e.code))cast(Number(e.code.slice(-1)));}
    }
  });
  listen(document,'keyup',e=>held.delete(e.code));
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'pointerdown',e=>{
    if(e.pointerType==='mouse'&&document.pointerLockElement===canvas){held.add(e.button===2?'aim':'fire');return;}
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();
  });
  listen(document,'pointerup',e=>{if(e.pointerType==='mouse'){held.delete('fire');held.delete('aim');}if(pointer?.id===e.pointerId)pointer=null;});
  listen(canvas,'pointercancel',release);listen(canvas,'lostpointercapture',()=>{pointer=null;});
  listen(document,'pointermove',e=>{
    let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}
    else if(pointer?.id===e.pointerId){dx=e.clientX-pointer.x;dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;}
    controller.yaw-=dx*.0025;controller.pitch=THREE.MathUtils.clamp(controller.pitch-dy*.0025,-1.2,1.2);
  });
  document.querySelectorAll('[data-hold]').forEach(button=>{
    const key=button.dataset.hold;
    listen(button,'pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);held.add(key);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(button,event,()=>held.delete(key));
  });
  document.querySelectorAll('[data-edge]').forEach(button=>listen(button,'click',()=>{edges[button.dataset.edge]=true;}));
  document.querySelectorAll('[data-action]').forEach(button=>listen(button,'click',()=>{if(button.dataset.action==='reload')runtime.startReload();else runtime[button.dataset.action]();}));
  listen(window,'blur',release);listen(document,'visibilitychange',()=>{paused=document.hidden;release();previous=performance.now();});
  function resize(){const {width,height}=canvas.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function ui(){
    $('health').max=kit.health;$('health').value=health;$('health-value').textContent=`${Math.ceil(health)} / ${kit.health}`;
    $('stamina').value=controller.stamina;$('stamina-value').textContent=`${Math.floor(controller.stamina)} / 100`;
    abilityButtons.forEach((button,index)=>{const left=runtime.cooldowns[index+1]??0;button.disabled=left>0;button.querySelector('.timer').textContent=left>0?`${left.toFixed(1)}s`:String(index+1);});
    $('readout').textContent=`${controller.state} · ${controller.infiniteAmmo?'Slide: free shots':runtime.reload>0?'Reloading':`${runtime.ammo} / ${runtime.modifiers.magazine} shots`} · ${lastEvent}`;
    for(const target of targets){const visual=targetMeshes.get(target.id);visual.group.visible=target.alive;visual.hpBar.scale.x=target.hp/target.maxHp;}
  }
  function frame(now){
    if(stopped)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;if(paused)return;
    controller.update(dt,{forward:Number(held.has('KeyW')||held.has('ArrowUp'))-Number(held.has('KeyS')||held.has('ArrowDown')),side:Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft')),sprint:held.has('ControlLeft')||held.has('ControlRight'),jump:edges.jump,dash:edges.dash,slide:held.has('KeyC'),aim:held.has('aim')});
    edges.jump=edges.dash=false;controller.updateCamera(camera,dt);runtime.aim(camera);
    if(held.has('fire'))runtime.fire();runtime.update(dt);
    for(const target of targets)if(!target.alive&&runtime.time>=target.respawn){target.alive=true;target.hp=target.maxHp;}
    // Range-only counterfire, not a match combat implementation. Gives support
    // heals and invulnerability a real local effect without owning shop math.
    counterfire+=dt;
    if(counterfire>=2){counterfire=0;const enemy=targets.find(t=>t.team==='ivory'&&t.alive&&controller.position.distanceTo(t.position)<13&&runtime.visible(t.position.clone().add(new THREE.Vector3(0,1,0)),{position:controller.position}));if(enemy&&!runtime.buffs.overtime){health=Math.max(1,health-18);}}
    ui();renderer.render(scene,camera);
  }
  window.heroSnapshot=()=>Object.freeze({...runtime.snapshot(),position:controller.position.toArray(),camera:camera.position.toArray(),fov:camera.fov,yaw:controller.yaw,pitch:controller.pitch,held:[...held],state:controller.state,stamina:controller.stamina,jumps:controller.jumps,grounded:controller.grounded,infiniteAmmo:controller.infiniteAmmo,pointerLocked:document.pointerLockElement===canvas,health,damage,healing,targets:targets.map(t=>({id:t.id,hp:t.hp,alive:t.alive,slow:t.slowUntil>runtime.time})),time:runtime.time});
  listen(canvas,'webglcontextlost',e=>{e.preventDefault();stopped=true;cancelAnimationFrame(raf);release();$('message').textContent='3D context lost. Reload this page to restart the range.';});
  listen(window,'pagehide',()=>{stopped=true;cancelAnimationFrame(raf);observer.disconnect();runtime.dispose();renderer.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());abort.abort();});
  ui();raf=requestAnimationFrame(frame);
} catch(error) {
  stopped=true;cancelAnimationFrame(raf);runtime?.dispose();renderer?.dispose();
  const message=document.createElement('p');message.className='failure';message.textContent=`Hero workshop could not start: ${error.message}. Reload to retry. WebGL2 and a local HTTP server are required.`;
  const back=document.createElement('a');back.href='../../../index.html';back.textContent='Back to Arcade';document.body.replaceChildren(message,back);console.error(error);
}
