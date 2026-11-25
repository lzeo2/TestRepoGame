import * as THREE from '../vendor/three.module.js';
import {makeWorld,getEntity,distance,direction,floorAt,stepCore,clearLine} from './core.js';
import {spawnInfantry,updateInfantry,orderSquad} from './infantry.js';
import {spawnVehicles,updateVehicles,enterNearest,exitVehicle} from './vehicles.js';
import {buildBattlefield,updateObjectives} from './battlefield.js';
import {createPresentation} from './presentation.js';
import {createInput} from './input.js';
import {playerCombat} from './feedback.js';
import {createTouchControls} from './touch.js';

const boot=stage=>{window.tanksBoot={stage,at:performance.now()};};
boot('modules-linked');
const $=id=>document.getElementById(id), canvas=$('view'), overlay=$('overlay');
let renderer,scene,camera,world,view,playing=false,accumulator=0,last=performance.now(),hudAt=0,noticeUntil=0,lastPlayerAlive=true,frames=0,renderMs=0;
const input=createInput(canvas,pause,interact,beginPlay,issueOrder);
const touch=createTouchControls(document,event=>input.control(event));
const embedded=window.self!==window.top;
function controlStatus(){
  const enabled=playing&&input.mode==='touch';touch.setActive(enabled);$('touch-controls').hidden=!enabled;$('pause').hidden=!playing;
  document.body.dataset.controls=input.mode;
  $('mode-status').textContent=`${input.mode==='touch'?'TOUCH':'MOUSE'} / ${embedded?'EMBEDDED':'LOCAL'} / ${playing?'PLAYING':'PAUSED'}`;
}
function availability(){if(!world)return;const ready=input.readyToLock();$('deploy').disabled=world.winner!==null||!ready;if(!playing)$('deploy').textContent=world.winner!==null?'Battle finished':input.pending?'Capturing mouse…':!ready?'Resume shortly…':`${world.time===0?'Deploy':'Resume'}${input.mode==='touch'?' touch':''}`;}
function pause(error){if(error)$('error').textContent=`Mouse capture failed: ${error.message||error}. Choose Touch controls if capture is unavailable in this embed.`;playing=false;accumulator=0;input.setActive(false);overlay.hidden=false;controlStatus();availability();if(document.hasFocus())$('deploy').focus({preventScroll:true});}
function beginPlay(){if(world.winner!==null){input.setActive(false);return;}input.setActive(true);playing=true;overlay.hidden=true;last=performance.now();accumulator=0;controlStatus();canvas.focus({preventScroll:true});}
function reset(){
  playing=false;input.setActive(false);touch.setActive(false);view?.dispose();boot('spawn-world');world=makeWorld({tickets:Number($('length').value)});buildBattlefield(world);spawnInfantry(world,{perTeam:Number($('population').value)});spawnVehicles(world);
  boot('build-presentation');view=createPresentation(THREE,scene,world);input.setLook(0,0);lastPlayerAlive=true;accumulator=0;hudAt=0;noticeUntil=0;
  $('summary').textContent='Capture Harbor, Relay and Depot. Hold posts to drain enemy tickets. You are one soldier, not a free camera.';
  $('error').textContent='';overlay.hidden=false;controlStatus();availability();hud();boot('world-ready');
}
function interact(){
  if(!playing)return;const p=getEntity(world,world.playerId);if(!p?.alive)return;
  const ok=p.seatId?exitVehicle(world,p):enterNearest(world,p);
  if(ok){const v=getEntity(world,p.seatId);input.setLook(v?.kind==='jet'?v.yaw:p.yaw,v?.pitch??0);}
  else if(!world.notice)world.notice='No friendly unoccupied vehicle in reach.';
}
function issueOrder(){
  if(!playing)return;const p=getEntity(world,world.playerId);
  if(orderSquad(world,p)){const o=world.objectives.find(o=>o.id===world.squadOrder.objectiveId);world.notice=`SQUAD: ${world.squadOrder.memberIds.length} infantry to ${o.name}. Hold the post; Q retasks.`;}
  else world.notice='No available squad order.';
}
function fightFeedback(p){
  const f=playerCombat(world,p),parts=[];
  if(f.confirm)parts.push(f.confirm.type==='destroyed'?`Destroyed ${f.confirm.targetKind}`:`Hit ${f.confirm.targetKind} -${f.confirm.appliedDamage}`);
  if(f.incoming)parts.push(`${p.seatId?'Hull hit':'Incoming'} -${f.incoming.appliedDamage}`);
  const text=parts.join(' / ')||(f.shot?'FIRING':'');
  if($('combat').textContent!==text)$('combat').textContent=text;
  $('combat').dataset.incoming=String(!!f.incoming);$('crosshair').textContent=f.confirm?'×':'+';document.body.classList.toggle('confirmed',!!f.confirm);
}
function deploy(){if(!renderer||world.winner!==null||!input.readyToLock())return;$('error').textContent='';input.lock();availability();}
$('deploy').addEventListener('click',deploy);
$('restart').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{if(playing)pause();});
$('controls').value=matchMedia('(pointer: coarse)').matches?'touch':'mouse';
input.setMode($('controls').value);
$('controls').addEventListener('change',()=>{input.setMode($('controls').value);controlStatus();availability();});
function resize(){if(!renderer)return;if(playing&&input.mode==='touch'){touch.clear();input.setActive(true);}const scale=Number($('resolution').value)===.5?.5:1;renderer.setPixelRatio(Math.min(devicePixelRatio,1.25)*scale);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);
$('resolution').addEventListener('change',resize);
const map=$('map').getContext('2d');
function drawMap(p){
  const c=map, size=210, span=1000, sx=x=>105+(x-p.x)/span*size,sz=z=>105+(z-p.z)/span*size;
  c.fillStyle='#242d28';c.fillRect(0,0,size,size);c.fillStyle='#294650';c.fillRect(sx(220),0,size-sx(220),size);
  c.strokeStyle='#7e8074';c.lineWidth=2;
  for(const road of world.roads){c.beginPath();road.points.forEach(([x,z],i)=>i?c.lineTo(sx(x),sz(z)):c.moveTo(sx(x),sz(z)));c.stroke();}
  for(const o of world.objectives){c.strokeStyle=o.owner===0?'#79b4dd':o.owner===1?'#e09d83':'#e7d8b2';c.lineWidth=2;c.beginPath();c.arc(sx(o.x),sz(o.z),8,0,Math.PI*2);c.stroke();c.fillStyle='#f0edda';c.font='9px monospace';c.fillText(o.name,sx(o.x)+10,sz(o.z));}
  for(const e of world.entities){if(!e.alive||e.seatId||e.id===p.id)continue;const x=sx(e.x),z=sz(e.z);c.fillStyle=e.team===0?'#79b4dd':'#e09d83';if(e.kind==='soldier')c.fillRect(x-1,z-1,3,3);else c.strokeRect(x-3,z-3,6,6);}
  const order=world.squadOrder,goal=world.objectives.find(o=>o.id===order?.objectiveId);
  if(goal){c.strokeStyle='#f0edda';c.setLineDash([4,4]);c.beginPath();c.moveTo(105,105);c.lineTo(sx(goal.x),sz(goal.z));c.stroke();c.setLineDash([]);}
  c.save();c.translate(105,105);c.rotate(-p.yaw);c.fillStyle='#fff6c8';c.beginPath();c.moveTo(0,-7);c.lineTo(5,5);c.lineTo(-5,5);c.closePath();c.fill();c.restore();
}
function hud(){
  const p=getEntity(world,world.playerId);if(!p)return;const v=getEntity(world,p.seatId),seat=v??p;
  $('tickets').textContent=`A ${Math.ceil(world.tickets[0])}   /   B ${Math.ceil(world.tickets[1])}`;
  $('objectives').replaceChildren(...world.objectives.map(o=>{const div=document.createElement('div');div.className='objective';div.dataset.team=o.progress>=0?'0':'1';const text=document.createElement('small');text.textContent=`${o.name} ${Math.round(distance(p,o))}m · ${o.contested?'CONTESTED':o.owner===null?'NEUTRAL':o.owner===0?'A':'B'}`;const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');fill.style.width=`${Math.abs(o.progress)*100}%`;bar.append(fill);div.append(text,bar);return div;}));
  const protection=p.protectedUntil>world.time?' · SPAWN PROTECTED':'';
  $('status').textContent=p.alive?`${v?v.kind.toUpperCase():p.aiming?'RIFLE · AIM':'RIFLE'} · HP ${Math.ceil(seat.hp)} · AMMO ${seat.ammo}${p.reloadUntil?' · RELOADING':''}${v?` · ${v.weaponState} · ${Math.round(v.speed)}m/s${v.kind==='jet'?` · ${v.airborne?'AIR':'GROUND'} · THR ${Math.round(v.throttle*100)}% · ALT ${Math.round(v.y)}m`:''}`:protection}`:`FALLEN · RESPAWN IN ${Math.max(0,Math.ceil(p.respawnAt-world.time))}s`;
  const nearby=world.entities.filter(e=>e.kind!=='soldier'&&e.team===0&&e.alive&&!e.occupantId).sort((a,b)=>distance(p,a)-distance(p,b))[0];
  $('prompt').textContent=v?`E: exit ${v.kind}${v.kind==='jet'&&v.airborne?' (land first)':''} · ${v.kind==='ship'?'Mouse gunner / WASD slow helm':v.kind==='jet'?'W/S throttle / A,D turn / mouse pitch':'Mouse turret / WASD drive'}`:nearby?`${distance(p,nearby)<(nearby.kind==='ship'?18:9)?'E: board':'Ready'} ${nearby.kind} ${Math.round(distance(p,nearby))}m · walk to a seat`:'Capture posts to drain enemy tickets';
  if(input.mode==='touch')$('prompt').textContent=v?`BOARD: exit ${v.kind}${v.kind==='jet'&&v.airborne?' (land first)':' (stop first)'}`:nearby?`${distance(p,nearby)<(nearby.kind==='ship'?18:9)?'BOARD':'Ready'} ${nearby.kind} ${Math.round(distance(p,nearby))}m`:'Hold posts to drain tickets';
  const squad=world.entities.filter(e=>e.kind==='soldier'&&e.ai&&e.team===p.team&&(!world.squadOrder||world.squadOrder.memberIds.includes(e.id))).slice(0,3);
  $('squad').textContent=`Q: squad order${world.squadOrder?' / '+world.objectives.find(o=>o.id===world.squadOrder.objectiveId)?.name:''} | `+squad.map(e=>`${e.team===0?'A':'B'}${e.id} ${e.alive?e.action:'DOWN'}${e.goalId?' > '+world.objectives.find(o=>o.id===e.goalId)?.name:''}`).join(' · ');
  if(world.notice){$('notice').textContent=world.notice;world.notice='';noticeUntil=world.time+5;}else if(world.time>noticeUntil)$('notice').textContent='';
  drawMap(p);
}
function tick(dt){
  const p=getEntity(world,world.playerId),i=input.sample(dt);
  updateInfantry(world,dt,i);updateVehicles(world,dt,i);stepCore(world,dt);updateObjectives(world,dt);
  if(p.alive&&!lastPlayerAlive)input.setLook(0,0);lastPlayerAlive=p.alive;
  if(world.winner!==null){playing=false;input.setActive(false);overlay.hidden=false;controlStatus();$('summary').textContent=`${world.winner===0?'FACTION A WINS':'FACTION B WINS'} · ${world.stats.captures} captures · ${world.stats.shots} shots. Restart for a fresh battle.`;$('deploy').disabled=true;}
}
function frame(now){
  requestAnimationFrame(frame);if(!renderer)return;
  const elapsed=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
  if(playing){accumulator=Math.min(accumulator+elapsed,.15);for(let n=0;accumulator>=1/60&&n<6;n++){tick(1/60);accumulator-=1/60;if(!playing){accumulator=0;break;}}}
  const p=getEntity(world,world.playerId),v=getEntity(world,p.seatId),look=input.sample(0);
  view.update(world,elapsed,p);fightFeedback(p);
  if(v){const d=direction(v.kind==='jet'?v.yaw:look.yaw,v.kind==='jet'?v.pitch:look.pitch*.5),back=v.kind==='ship'?38:v.kind==='jet'?25:13;
    camera.position.set(v.x-d.x*back,Math.max(v.y+(v.kind==='ship'?17:7)-d.y*back,floorAt(world,v.x-d.x*back,v.z-d.z*back)+2),v.z-d.z*back);
    camera.lookAt(v.x+d.x*40,v.y+3+d.y*40,v.z+d.z*40);
  } else {const bob=!$('motion').checked&&playing&&p.alive?Math.sin(world.time*9)*.025:0;camera.position.set(p.x,p.y+1.65+bob,p.z);const d=direction(look.yaw,look.pitch);camera.lookAt(p.x+d.x,p.y+1.65+bob+d.y,p.z+d.z);}
  const aim=!v&&p.aiming;document.body.classList.toggle('aiming',aim);const fov=aim?48:74;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  const before=performance.now();renderer.render(scene,camera);renderMs+=(performance.now()-before-renderMs)*.05;frames++;if(window.tanksBoot.stage==='world-ready')boot('first-frame-rendered');
  if(!playing)availability();
  if(now-hudAt>150){hudAt=now;hud();}
}
try{
  boot('create-renderer');renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  boot('renderer-created');scene=new THREE.Scene();scene.background=new THREE.Color(0x9caeaf);camera=new THREE.PerspectiveCamera(74,1,.08,1700);resize();reset();requestAnimationFrame(frame);boot('world-ready');
  // Read-only diagnostics: automation observes real controls, never teleports or mutates HP.
  Object.defineProperty(window,'tanksDiagnostics',{value:()=>{const p=getEntity(world,world.playerId),v=getEntity(world,p.seatId),gl=renderer.getContext(),origin=v?.muzzle??{x:p.x,y:p.y+p.height*.75,z:p.z};return {playing,embedded,viewport:{width:innerWidth,height:innerHeight},locked:document.pointerLockElement===canvas,input:input.inspect(),time:world.time,squadOrder:world.squadOrder?{...world.squadOrder,memberIds:[...world.squadOrder.memberIds]}:null,feedback:playerCombat(world,p),winner:world.winner,projectileCount:world.projectiles.length,drawingBuffer:{width:canvas.width,height:canvas.height},frames,renderMs,renderer:gl.getParameter(gl.RENDERER),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,player:{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,hp:p.hp,ammo:p.ammo,alive:p.alive,seatId:p.seatId},vehicle:v?{kind:v.kind,x:v.x,y:v.y,z:v.z,yaw:v.yaw,pitch:v.pitch,throttle:v.throttle,hp:v.hp,maxHp:v.maxHp,aimYaw:v.aimYaw,aimPitch:v.aimPitch,speed:v.speed,airborne:v.airborne,ammo:v.ammo,weaponState:v.weaponState,aimLimited:v.aimLimited,roleAction:v.roleAction,muzzle:v.muzzle}:null,tickets:[...world.tickets],objectives:world.objectives.map(o=>({...o})),stats:{...world.stats},hits:world.events.filter(e=>e.type==='hit').map(e=>({...e})),entities:world.entities.map(e=>({id:e.id,kind:e.kind,team:e.team,x:e.x,y:e.y,z:e.z,hp:e.hp,maxHp:e.maxHp,yaw:e.yaw,airborne:e.airborne,alive:e.alive,reserved:e.reserved,ai:e.ai,action:e.action,goalId:e.goalId,orderObjectiveId:e.orderObjectiveId,targetId:e.targetId,roleAction:e.roleAction,weaponState:e.weaponState,height:e.height,radius:e.radius,visible:e.team===p.team||clearLine(world,origin,{x:e.x,y:e.y+e.height*.5,z:e.z})}))};}});
}catch(error){console.error(error);$('error').textContent=`Game initialization failed at ${window.tanksBoot.stage}: ${error.message}`;$('deploy').disabled=true;}
