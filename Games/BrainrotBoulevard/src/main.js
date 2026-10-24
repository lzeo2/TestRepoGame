import * as THREE from '../vendor/three.module.js';
import { RoomEnvironment } from '../vendor/environments/RoomEnvironment.js';
import {createCollectible, animateCollectible, createAvatar, animateAvatar, disposeCharacter} from './characters.js';
import { createSecretCharacter, loadSecretCharacter, secretAssetStatus, disposeSecretCharacter } from './secret-character.js';
import {CATALOG, SECRET_KIND, claimSecret, secretRequirement, createState, buy, addStolen, removeOwned, incomeRate, tickIncome, upgrade, upgradeCost, rebirthCost, rebirth, serialize, restore} from './rules.js';

// The simulation is entirely local. The secret GLB loads from the bundled assets folder; no remote services or accounts.
const $ = id => document.getElementById(id);
const SAVE_KEY = 'brainrot-boulevard-v1';
const money = value => '$' + (value >= 1e6 ? (value/1e6).toFixed(2)+'m' : value >= 10000 ? (value/1000).toFixed(1)+'k' : Math.floor(value).toLocaleString());
let state;
try {state=restore(localStorage.getItem(SAVE_KEY)) || createState();} catch {state=createState();}
let started=false, paused=false, menuType=null, gameTime=0, lastTime=0, saveTimer=0, spawnTimer=0, nextEntity=1;
let soundEnabled=true, audioContext, storageWarning=false;
let performanceMode=matchMedia('(pointer: coarse)').matches;
const keys=new Set(), entities=[], particles=[], floatingTexts=[], bots=[];
let carry=null, target=null, attackCooldown=0, playerStun=0, hitFlash=0;
let playerLock=35, lockCooldown=0, lastRaidAlert=0, worldEventTimer=80, jackpot=false;
const touch={x:0,y:0};
const player={pos:new THREE.Vector3(-15,0,12), velocity:new THREE.Vector3(), angle:Math.PI/2};
let cameraYaw=0.72, cameraPitch=0.9, cameraDistance=26, dragging=false, lastPointer={x:0,y:0};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x657987);
scene.fog=new THREE.Fog(0x657987,65,125);
const camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,180);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});
} catch(error) {
  $('loadingStatus').textContent='WebGL is unavailable. Try a current browser with hardware acceleration enabled.';
  $('playButton').disabled=true;
  throw error;
}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,performanceMode?1:1.8));
renderer.shadowMap.enabled=!performanceMode;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.16;
scene.add(new THREE.HemisphereLight(0xc0d5e8,0x5e6255,1.8));
const sunlight=new THREE.DirectionalLight(0xffe8d1,3.1);
sunlight.position.set(-22,45,18); sunlight.castShadow=!performanceMode;
const shadowResolution=matchMedia('(pointer: coarse)').matches?1024:2048;sunlight.shadow.mapSize.set(shadowResolution,shadowResolution);
Object.assign(sunlight.shadow.camera,{left:-46,right:46,top:48,bottom:-48,near:.5,far:130});
sunlight.shadow.bias=-.00025; sunlight.shadow.normalBias=.055; scene.add(sunlight);
const rim=new THREE.DirectionalLight(0x91b4c9,2.0); rim.position.set(25,14,-25); scene.add(rim);

// Warm directional fill keeps wet skin and tooth details readable in the dusk palette.
const faceFill=new THREE.DirectionalLight(0xe5ecf0,1.1);faceFill.position.set(5,9,30);scene.add(faceFill);
// A small local PMREM studio environment gives eyes, glaze and worn metal real
// reflections without a remote HDR file. Built once and shared by every model.
if(renderer.isWebGLRenderer){
  let pmrem,room;
  try{pmrem=new THREE.PMREMGenerator(renderer);room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.06).texture;}
  catch(error){console.warn('Local reflections unavailable; direct lighting remains active.',error);}
  finally{room?.dispose();pmrem?.dispose();}
}
const materials=new Map();
function mat(color, extra={}) {const k=JSON.stringify([color,extra]); if(!materials.has(k)) materials.set(k,new THREE.MeshStandardMaterial({color,roughness:.75,...extra}));return materials.get(k);}
function box(w,h,d,color,x=0,y=0,z=0,parent=scene,extra={}) {const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,extra));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r,h,color,x,y,z,parent=scene,r2=r,sides=24) {const o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,h,sides),mat(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(r,color,x,y,z,parent=scene) {const o=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat(color));o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
function ring(radius,color,parent=scene) {const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.065,radius,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.07;parent.add(mesh);return mesh;}
function textSprite(text,subtitle='',color='#ffffff',width=5.2) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(17,26,47,.9)';ctx.beginPath();ctx.roundRect(3,3,506,154,24);ctx.fill();
  ctx.fillStyle=color;ctx.font='800 37px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,subtitle?56:80,475);
  if(subtitle) {ctx.fillStyle='#e3f4fd';ctx.font='500 26px Arial';ctx.fillText(subtitle,256,112,475);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(width,width*160/512,1);return sprite;
}
function sign(text,sub,color,x,y,z,width=6) {const s=textSprite(text,sub,color,width);s.position.set(x,y,z);scene.add(s);return s;}

// Blue-hour boulevard. Color-coded base edges remain bright for navigation.
box(65,3,73,0x485770,0,-1.7,0);
box(65,.32,73,0x55766a,0,-.08,0);
box(15,.09,69,0x73838c,0,.14,0);
box(9,.12,66,0x263d55,0,.24,0);
box(3.4,.3,59,0x32334a,0,.5,0);
box(.24,.47,60,0xf4c846,-1.85,.58,0);box(.24,.47,60,0xf4c846,1.85,.58,0);
const belt=new THREE.Group();scene.add(belt);
for(let z=-30;z<30;z+=2.5) {const mesh=box(3.2,.06,.25,0x677182,0,.69,z,belt);mesh.userData.z=z;}
for(const x of [-6.5,6.5]) for(let z=-31;z<33;z+=4) box(.17,.06,1.9,0xe2edf5,x,.22,z);
for(const x of [-32,32]) box(.5,1.2,72,0xe4d5bd,x,.52,0);
for(const z of [-36,36]) box(64,1.2,.5,0xe4d5bd,0,.52,z);
const bases=[
 {name:'YOUR BASE',owner:0,x:-19,z:14,color:0x52e3c2,hex:'#68f4d3',items:[],lock:35},
 {name:'MISO',owner:1,x:19,z:14,color:0xfa886e,hex:'#ffb09a',items:[],lock:0},
 {name:'GLITCH',owner:2,x:-19,z:-16,color:0xa789fc,hex:'#cfbaff',items:[],lock:18},
 {name:'BUBBLES',owner:3,x:19,z:-16,color:0xf5d55e,hex:'#ffe583',items:[],lock:0}
];
function slotPosition(base,index) {const row=Math.floor(index/2),col=index%2;return new THREE.Vector3(base.x+(col?2.6:-2.6),.42,base.z-5.6+row*2.8);}
for(const base of bases) {
  box(15,.5,19,0xe5e8db,base.x,.13,base.z);
  box(14.5,.06,18.5,base.color,base.x,.42,base.z);
  box(13.8,.06,17.8,0x3b5360,base.x,.47,base.z);
  const side=Math.sign(base.x),backX=base.x+side*7.2,gateX=base.x-side*7.4;
  box(.42,3,19,0xf4f1e7,backX,1.95,base.z);
  box(14.5,1.4,.42,0xf4f1e7,base.x,1.05,base.z-9.3);
  box(14.5,1.4,.42,0xf4f1e7,base.x,1.05,base.z+9.3);
  for(const dz of [-9.2,9.2]) {box(.8,4.1,.8,base.color,gateX,2.15,base.z+dz); sphere(.38,0xfff5df,gateX,4.5,base.z+dz);}
  base.gate=box(.12,3.5,18,base.color,gateX,2.1,base.z,scene,{transparent:true,opacity:.27,emissive:base.color,emissiveIntensity:.35,depthWrite:false});
  base.gate.material=base.gate.material.clone();base.gate.castShadow=false;
  base.gateLines=new THREE.Group();scene.add(base.gateLines);
  for(let z=-8;z<=8;z+=2)box(.13,3.6,.07,base.color,gateX,2.1,base.z+z,base.gateLines,{emissive:base.color,emissiveIntensity:1});
  sign(base.name,base.owner===0?'BUY • BANK • DEFEND':'AI RIVAL',base.hex,backX-side*.2,5,base.z,6.2);
  for(let i=0;i<10;i++) {const p=slotPosition(base,i); const pad=cylinder(.96,.17,0x71818b,p.x,.59,p.z,scene);const r=ring(.84,base.color);r.position.set(p.x,.69,p.z);if(i>=6) {pad.visible=false;r.visible=false;} (base.pads||=[]).push({pad,r});}
  box(4,.1,5.5,0xa8b9cb,base.x-side*10,.22,base.z);
  if(!base.owner) {base.lockPad=cylinder(1.05,.14,0x59e3cc,base.x+side*5,.67,base.z+5.4); sign('BASE SHIELD','L to lock',base.hex,base.x+side*5,2.7,base.z+5.4,3.6);}
}
for(const x of [-29,29]) for(const z of [-31,-1,31]) {
  cylinder(.28,2.7,0x866659,x,1.1,z);sphere(1.7,0x459773,x,3.1,z);sphere(1.3,0x6dad78,x+.6,4.1,z);
}
for(const x of [-8.6,8.6]) for(const z of [-31,-1,31]) {cylinder(.12,4.2,0x536783,x,2,z);sphere(.45,0xffefb8,x,4.3,z);}
box(8.8,1,1.1,0x282842,0,5.8,-31);box(.65,5.8,.65,0xffa880,-4.2,2.8,-31);box(.65,5.8,.65,0xffa880,4.2,2.8,-31);
sign('THE DROP','NORTH-EAST: A NINTH SIGNAL','#ffe488',0,6.1,-31,8.5);
sign('BANK IT. OR LOSE IT.','Return stolen loot to your mint base','#f7f6ed',0,4.3,33,8.3);
// Soft decorative clouds frame the arena without obscuring play.
for(let i=0;i<12;i++) {const a=i/12*Math.PI*2; const g=new THREE.Group();g.position.set(Math.sin(a)*57,8+(i%3)*4,Math.cos(a)*61);sphere(3.6,0x8898a5,0,0,0,g);sphere(2.7,0x8898a5,3,0,.4,g);sphere(2.5,0x8898a5,-3,0,0,g);scene.add(g);}

// A hidden-but-hinted collectible shrine in the north-east perimeter gap.
// It is reachable around the rival base, never behind a collision wall.
const shrine={position:new THREE.Vector3(18,0,-31),mesh:new THREE.Group()};
shrine.mesh.position.copy(shrine.position);scene.add(shrine.mesh);
cylinder(2.0,.25,0x424c49,0,.32,0,shrine.mesh,2.2,32);
cylinder(1.1,.42,0x67746a,0,.64,0,shrine.mesh,1.3,12);
for(const x of [-1.45,1.45]){box(.38,2.3,.46,0x56615b,x,1.5,-.25,shrine.mesh);box(.5,.18,.58,0x918c74,x,2.75,-.25,shrine.mesh);}
box(3.35,.4,.55,0x67716a,0,2.92,-.25,shrine.mesh);
const shrineSeal=ring(.85,0xcdeeb8,shrine.mesh);shrineSeal.position.y=.87;
const shrineLight=new THREE.PointLight(0xbbdca7,7,9,2);shrineLight.position.set(18,2.3,-31);scene.add(shrineLight);
sign('THE FORGOTTEN SHRINE','THREE DISCOVERIES OPEN THE WAY','#d5ebc5',18,4.2,-31,6.2);

const playerMesh=createAvatar(0x55edc9);scene.add(playerMesh);
const playerHalo=ring(1.05,0x67ffe0);
const bat=new THREE.Group();cylinder(.14,1.65,0xfac783,0,.6,0,bat,.23,10);cylinder(.17,.3,0x444158,0,-.24,0,bat,.17,10);bat.rotation.z=-.45;bat.position.set(.87,1.14,.3);playerMesh.add(bat);
const selectionRing=ring(1.15,0xffffff);selectionRing.visible=false;
const pointerArrow=new THREE.Mesh(new THREE.ConeGeometry(.36,.7,3),mat(0x74ffe0,{emissive:0x3da989,emissiveIntensity:.8}));pointerArrow.rotation.x=Math.PI/2;scene.add(pointerArrow);pointerArrow.visible=false;
for(const base of bases.slice(1)) {
  const mesh=createAvatar(base.color);scene.add(mesh);
  const bot={base,mesh,pos:new THREE.Vector3(base.x,0,base.z+5),goal:null,mode:'idle',timer:18+base.owner*9,stun:0,carry:null,swing:0,wallet:1600+base.owner*700,shopping:null};
  bot.label=textSprite(base.name,'AI RIVAL',base.hex,2.2);bot.label.position.y=3.25;mesh.add(bot.label);bots.push(bot);
}

function createEntity(kind,owner,id=null) {
  const e={id:id??`world-${nextEntity++}`,kind,owner,mesh:kind===SECRET_KIND?createSecretCharacter(.8):createCollectible(kind,.8),baseSlot:0,carried:false,sale:false,phase:Math.random()*6};
  scene.add(e.mesh);entities.push(e);return e;
}
function placeEntity(e,base,index) {e.owner=base.owner;e.carried=false;e.sale=false;e.baseSlot=index;e.mesh.position.copy(slotPosition(base,index));e.mesh.position.y=.7;e.mesh.rotation.set(0,base.x<0?Math.PI/2:-Math.PI/2,0);if(e.label)e.label.visible=false;}
function arrangeBase(base) {base.items.forEach((e,i)=>{if(!e.carried)placeEntity(e,base,i);});}
function populatePlayer() {
  for(const e of [...bases[0].items]) deleteEntity(e);
  bases[0].items=[];
  for(const item of state.owned) {const e=createEntity(item.kind,0,item.id);bases[0].items.push(e);}arrangeBase(bases[0]);
}
function deleteEntity(e) {if(e.kind===SECRET_KIND)disposeSecretCharacter(e.mesh);else disposeCharacter(e.mesh);if(e.label){scene.remove(e.label);e.label.material.map.dispose();e.label.material.dispose();}const i=entities.indexOf(e);if(i>=0)entities.splice(i,1);}
populatePlayer();
for(const base of bases.slice(1))for(let i=0;i<3;i++){const e=createEntity((i+base.owner-1)%4,base.owner);base.items.push(e);placeEntity(e,base,i);}
function chooseKind() {const roll=Math.random();if(jackpot)return Math.random()<.55?5:Math.random()<.65?6:7;return roll<.34?0:roll<.59?1:roll<.78?2:roll<.89?3:roll<.95?4:roll<.984?5:roll<.997?6:7;}
function spawnConveyor(kind=chooseKind(),z=-28) {const e=createEntity(kind,-1);e.sale=true;e.mesh.position.set(0,.8,z);e.label=textSprite(CATALOG[kind].name,`${money(CATALOG[kind].price)} · ${money(CATALOG[kind].income)}/s`,'#fef7ce',4.1);e.label.position.set(0,4,z);scene.add(e.label);return e;}
spawnConveyor(0,12);spawnConveyor(1,0);spawnConveyor(2,-12);spawnConveyor(0,-24);

function save() {try{localStorage.setItem(SAVE_KEY,serialize(state));}catch{if(!storageWarning){toast('Saving is unavailable. Keep this tab open to keep playing.','warning');storageWarning=true;}}}
function tone(freq=440,duration=.1,type='sine',gain=.06) {if(!soundEnabled||!audioContext)return;try{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.65,audioContext.currentTime+duration);g.gain.setValueAtTime(gain,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch{}}
function chime(){tone(660,.16);setTimeout(()=>tone(990,.2),90);}
function toast(text,type='info') {const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=text;$('toastContainer').append(el);while($('toastContainer').children.length>4)$('toastContainer').firstChild.remove();setTimeout(()=>el.remove(),4500);}
function burst(pos,color=0x6dffd6,count=18) {for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12),mat(color));m.position.copy(pos);m.position.y+=1;scene.add(m);particles.push({mesh:m,velocity:new THREE.Vector3((Math.random()-.5)*6,2+Math.random()*5,(Math.random()-.5)*6),life:.7+Math.random()*.5});}}
function floatText(text,pos,color='#75ffd7') {const sprite=textSprite(text,'',color,3.2);sprite.position.copy(pos).add(new THREE.Vector3(0,3,0));scene.add(sprite);floatingTexts.push({sprite,life:1.8});}
function dist(a,b) {return Math.hypot(a.x-b.x,a.z-b.z);}
function groundHeight(pos) {return bases.some(base=>isInside(pos,base)) ? 0.52 : 0.22;}
function effectiveIncome() {return Math.max(0,incomeRate(state)-bots.filter(b=>b.carry).reduce((total,b)=>total+CATALOG[b.carry.kind].income*(1+.25*state.rebirths),0));}
function isInside(pos,base,pad=0) {return Math.abs(pos.x-base.x)<7.15+pad && Math.abs(pos.z-base.z)<9.1+pad;}
function locked(base){return base.owner===0?playerLock>0:base.lock>0;}
function canMoveTo(pos,owner) {
  if(Math.abs(pos.x)>31||Math.abs(pos.z)>34.8)return false;
  for(const base of bases) {
    const side=Math.sign(base.x),rear=base.x+side*7.2;
    // Walls occupy their actual geometry; open entrances are on the boulevard side.
    if(Math.abs(pos.x-rear)<.7&&Math.abs(pos.z-base.z)<9.8)return false;
    if(Math.abs(pos.x-base.x)<7.8&&Math.abs(Math.abs(pos.z-base.z)-9.3)<.65)return false;
    if(owner!==base.owner&&locked(base)&&isInside(pos,base,.45))return false;
  }
  return true;
}
function moveActor(pos,dx,dz,owner) {const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.28));const n=pos.clone();for(let i=0;i<steps;i++){n.copy(pos);n.x+=dx/steps;if(canMoveTo(n,owner))pos.x=n.x;n.copy(pos);n.z+=dz/steps;if(canMoveTo(n,owner))pos.z=n.z;}}
function findTarget() {
  if(carry)return {type:'return',entity:carry};
  if(dist(player.pos,shrine.position)<3.3)return {type:'shrine'};
  let best=null,bestD=4.3;
  for(const e of entities) {
    if(e.carried||e.owner===0)continue;
    if(!e.sale&&!isInside(player.pos,bases[e.owner],.1))continue;
    const d=dist(e.mesh.position,player.pos);
    if(d<bestD){bestD=d;best={type:e.sale?'buy':'steal',entity:e};}
  }
  return best;
}
function interact() {
  if(!started||paused||playerStun>0)return;
  if(carry){if(isInside(player.pos,bases[0]))bankCarry();else toast('Carry it into your mint base to bank it. Q returns it.');return;}
  target=findTarget();if(!target){toast('Move closer to a conveyor drop, a rival collectible, or the forgotten shrine.');return;}
  if(target.type==='shrine'){unlockShrine();return;}
  const e=target.entity,definition=CATALOG[e.kind];
  if(e.sale) {
    const result=buy(state,e.kind);if(!result.ok){toast(result.reason,'warning');tone(160,.15);return;}
    if(e.label){scene.remove(e.label);e.label.material.map.dispose();e.label.material.dispose();e.label=null;}
    e.id=result.item.id;e.owner=0;e.sale=false;bases[0].items.push(e);arrangeBase(bases[0]);burst(e.mesh.position);chime();toast(`${definition.name} delivered! +${money(definition.income)}/sec`,'success');save();
  } else {
    if(locked(bases[e.owner])){toast('That base is shielded. Wait for its gate to go dark.','warning');return;}
    if(state.owned.length>=state.capacity){toast('Your base is full. Buy a slot upgrade first.','warning');return;}
    carry=e;e.carried=true;carry.origin=e.owner;carry.originSlot=e.baseSlot;tone(390,.22,'triangle');toast(`You grabbed ${definition.name}! Run to your mint base.`,'warning');
    const ownerBot=bots.find(b=>b.base.owner===e.owner);if(ownerBot&&!ownerBot.carry){ownerBot.mode='chase';ownerBot.timer=0;}
  }
  updateHUD();
}
function unlockShrine() {
  if(!secretAssetStatus().ready){
    toast('The secret model is not loaded yet. Checking the local asset…','warning');
    loadSecretCharacter().then(()=>toast('The shrine is awake. Press E again.','success')).catch(()=>toast('Cannot load assets/secret-cave-creature.glb. Extract the full archive and run npm start.','warning'));
    return;
  }
  const result=claimSecret(state);if(!result.ok){toast(result.reason,'warning');return;}
  const entity=createEntity(SECRET_KIND,0,result.item.id);bases[0].items.push(entity);arrangeBase(bases[0]);
  burst(shrine.position,0xccedab,28);tone(95,.9,'sine',.045);chime();
  toast('THE UNINVITED is in your base. The old creature has found you. +$2,400/sec','success');
  save();updateHUD();
}

function returnCarry(reason) {
  if(!carry)return;
  const e=carry;carry=null;const base=bases[e.origin];if(!base.items.includes(e))base.items.push(e);placeEntity(e,base,base.items.indexOf(e));if(reason)toast(reason,'warning');
}
function bankCarry() {
  if(!carry||!isInside(player.pos,bases[0]))return;
  const result=addStolen(state,carry.kind);if(!result.ok){returnCarry(result.reason);return;}
  const e=carry,old=bases[e.origin];old.items=old.items.filter(x=>x!==e);arrangeBase(old);e.id=result.item.id;carry=null;bases[0].items.push(e);placeEntity(e,bases[0],bases[0].items.length-1);burst(player.pos,0xffe381,35);floatText('HEIST COMPLETE',player.pos);chime();toast(`${CATALOG[e.kind].name} is yours. Nice getaway!`,'success');save();
}
function swing() {
  if(!started||paused||attackCooldown>0||playerStun>0)return;
  attackCooldown=.6;tone(130,.1,'sawtooth',.025);let hit=false;
  for(const bot of bots) {
    if(dist(bot.pos,player.pos)<3.6&&bot.stun<=0) {
      hit=true;bot.stun=2.7;bot.mode='recover';bot.timer=3;const away=bot.pos.clone().sub(player.pos).normalize();moveActor(bot.pos,away.x*2.3,away.z*2.3,bot.base.owner);burst(bot.pos,bot.base.color,12);
      if(bot.carry){recoverFromBot(bot);state.stats.defends++;toast('Thief stopped. Your brainrot is safe!','success');save();}
    }
  }
  if(hit){tone(220,.2,'square',.045);hitFlash=.13;}
}
function recoverFromBot(bot) {if(!bot.carry)return;const e=bot.carry;bot.carry=null;e.carried=false;placeEntity(e,bases[0],bases[0].items.indexOf(e));}
function lockBase() {
  if(!started||paused)return;
  if(playerLock>0){toast(`Shield is active for ${Math.ceil(playerLock)} more seconds.`);return;}
  if(lockCooldown>0){toast(`Shield recharges in ${Math.ceil(lockCooldown)} seconds.`,'warning');return;}
  if(!isInside(player.pos,bases[0],1)){toast('Return to your base to activate its shield.','warning');return;}
  playerLock=25+state.lockLevel*10;lockCooldown=playerLock+16;
  for(const bot of bots)if(isInside(bot.pos,bases[0],.7)){recoverFromBot(bot);bot.pos.set(-10,0,bases[0].z+(Math.random()-.5)*9);bot.stun=1.3;bot.mode='idle';bot.timer=12;}
  burst(player.pos);tone(600,.35,'triangle');toast(`Base shield up for ${playerLock}s`,'success');
}

function tickBots(dt) {
  for(const bot of bots) {
    bot.wallet+=bot.base.items.filter(e=>!e.carried).reduce((sum,e)=>sum+CATALOG[e.kind].income,0)*dt;
    bot.stun=Math.max(0,bot.stun-dt);bot.timer-=dt;bot.swing=Math.max(0,bot.swing-dt);
    let goal=null,speed=4.7;
    if(bot.stun>0){bot.mesh.position.copy(bot.pos);bot.mesh.position.y=groundHeight(bot.pos);animateAvatar(bot.mesh,gameTime,false,false);continue;}
    if(bot.mode==='recover'&&bot.timer<=0){bot.mode='idle';bot.timer=8;}
    const stolen=carry&&carry.origin===bot.base.owner;
    if(bot.carry)bot.mode='raid';
    if(stolen&&!bot.carry){bot.mode='chase';goal=player.pos;speed=carry?5.9:5.3;}
    else if(bot.mode==='chase'){bot.mode='idle';bot.timer=8;}
    if(bot.mode==='chase') {
      goal=player.pos;speed=5.9;
      if(isInside(player.pos,bases[0])&&playerLock>0){bot.mode='idle';bot.timer=8;goal=null;}
      else if(dist(bot.pos,player.pos)<1.8&&bot.swing<=0){returnCarry('Busted! The rival recovered their collectible.');playerStun=.85;bot.swing=1.2;hitFlash=.3;tone(110,.3,'sawtooth',.04);bot.mode='idle';bot.timer=8;}
    } else if(bot.mode==='raid') {
      if(bot.carry){goal=new THREE.Vector3(bot.base.x,0,bot.base.z);speed=4.7;
        if(isInside(bot.pos,bot.base)) {
          const e=bot.carry;bot.carry=null;removeOwned(state,e.id);bases[0].items=bases[0].items.filter(x=>x!==e);arrangeBase(bases[0]);
          if(bot.base.items.length>=6){const index=bot.base.items.findIndex(item=>!item.carried);if(index>=0){const [old]=bot.base.items.splice(index,1);deleteEntity(old);}}
          bot.base.items.push(e);placeEntity(e,bot.base,bot.base.items.length-1);arrangeBase(bot.base);toast(`${bot.base.name} stole your ${CATALOG[e.kind].name}. You can steal it back!`,'warning');save();bot.mode='idle';bot.timer=20;
        }
      } else {
        const victims=bases[0].items.filter(e=>!e.carried);
        if(playerLock>0||!victims.length){bot.mode='idle';bot.timer=7;}
        else {
          const victim=victims[0];goal=victim.mesh.position;speed=4.4;
          if(dist(bot.pos,victim.mesh.position)<1.5){bot.carry=victim;victim.carried=true;tone(780,.16,'square',.035);toast(`${bot.base.name} grabbed a collectible! Hit them with your bat.`,'warning');lastRaidAlert=6;}
        }
      }
    } else if(bot.mode==='idle'&&bot.timer<=0) {
      if(bases[0].items.length&&!playerLock&&Math.random()<.65){bot.mode='raid';bot.timer=25;lastRaidAlert=5;toast(`${bot.base.name} is heading for your base!`,'warning');}
      else {bot.mode='browse';bot.timer=18;const stock=entities.filter(e=>e.sale&&CATALOG[e.kind].price<=bot.wallet);bot.shopping=stock[Math.floor(Math.random()*stock.length)]||null;bot.goal=new THREE.Vector3(bot.base.x>0?4.6:-4.6,0,bot.shopping?bot.shopping.mesh.position.z:-21+Math.random()*42);}
    } else if(bot.mode==='browse') {
      if(bot.shopping?.sale)bot.goal.z=bot.shopping.mesh.position.z;
      goal=bot.goal;
      if(bot.timer<=0||dist(bot.pos,goal)<1){
        const e=bot.shopping;
        if(e?.sale&&entities.includes(e)&&dist(bot.pos,e.mesh.position)<6&&bot.base.items.length<6&&bot.wallet>=CATALOG[e.kind].price){
          bot.wallet-=CATALOG[e.kind].price;if(e.label){scene.remove(e.label);e.label.material.map.dispose();e.label.material.dispose();e.label=null;}bot.base.items.push(e);placeEntity(e,bot.base,bot.base.items.length-1);burst(e.mesh.position,bot.base.color,8);
        }
        bot.shopping=null;bot.mode='home';bot.timer=15;
      }
    } else if(bot.mode==='home') {
      goal=new THREE.Vector3(bot.base.x,0,bot.base.z+5);
      if(dist(bot.pos,goal)<1||bot.timer<=0) {
        bot.mode='idle';bot.timer=18+Math.random()*20;
        // Purchases are made from the real conveyor during browse mode.
      }
    }
    let moving=false;
    if(goal) {
      let destination=goal;
      // Route through the central entrance when crossing between bases.
      const own=bot.base;
      if(Math.abs(bot.pos.z-goal.z)>7 && Math.abs(bot.pos.x)>10)destination=new THREE.Vector3(Math.sign(bot.pos.x)*9,0,bot.pos.z);
      else if(Math.abs(bot.pos.z-goal.z)>7)destination=new THREE.Vector3(Math.sign(goal.x)*9,0,goal.z);
      const dx=destination.x-bot.pos.x,dz=destination.z-bot.pos.z,length=Math.hypot(dx,dz);
      if(length>.2){const step=Math.min(speed*dt,length);moveActor(bot.pos,dx/length*step,dz/length*step,own.owner);bot.mesh.rotation.y=Math.atan2(dx,dz);moving=true;}
    }
    bot.mesh.position.copy(bot.pos);bot.mesh.position.y=groundHeight(bot.pos);animateAvatar(bot.mesh,gameTime,moving,!!bot.carry);
    if(bot.carry){bot.carry.mesh.position.copy(bot.pos).add(new THREE.Vector3(0,2.5,0));bot.carry.mesh.rotation.y=gameTime;}
  }
}

function updateHUD() {
  $('money').textContent=money(state.money);$('income').textContent=`+${money(effectiveIncome())}/s`;$('capacity').textContent=`${state.owned.length}/${state.capacity}`;
  $('lockStatus').textContent=playerLock>0?'SHIELD ACTIVE':lockCooldown>0?'SHIELD RECHARGING':'BASE EXPOSED';
  $('lockTimer').textContent=playerLock>0?`${Math.ceil(playerLock)}s`:lockCooldown>0?`${Math.ceil(lockCooldown)}s`:'Ready';
  $('lockButton').textContent=playerLock>0?'Shield is up':lockCooldown>0?'Recharging…':'Lock base [L]';$('lockButton').disabled=playerLock>0||lockCooldown>0;
  $('lockStatus').style.color=playerLock>0?'#72f8d6':'#ffba98';
  $('dropButton').hidden=!carry;
  const raid=bots.some(b=>b.mode==='raid'&&b.carry)||lastRaidAlert>0;$('raidAlert').hidden=!raid;
  if(raid)$('raidAlert').textContent=bots.some(b=>b.carry)?'THIEF ESCAPING! Swing your bat':'RAID INCOMING · Get ready';
  const title=$('objectiveTitle');if(title)title.textContent=carry?'GET TO YOUR BASE':state.owned.length===0?'YOUR FIRST BRAINROT':state.stats.steals===0?'TRY A LITTLE THEFT':'BUILD YOUR WEIRD EMPIRE';
  $('objectiveText').textContent=carry?'Follow the mint arrow. Your income starts when you make it home.':state.owned.length===0?'Walk to a drop on the center belt. Press E to buy it. Your base earns cash automatically.':state.stats.steals===0?'Find a rival with a dark shield, grab a collectible, and carry it home.':`Collect rare creatures, protect your base, and reach ${money(rebirthCost(state))} for a rebirth.`;
  $('missionList').innerHTML=[['First purchase',state.stats.buys>0],['Pull off a heist',state.stats.steals>0],['Wake the forgotten shrine',state.collection.includes(SECRET_KIND)]].map(([s,done])=>`<div class="mission ${done?'complete':''}"><span>${done?'✓':'○'}</span>${s}</div>`).join('');
  target=findTarget();const prompt=$('prompt');prompt.hidden=!target||paused||!started;
  selectionRing.visible=false;
  if(target?.type==='shrine') {
    $('promptKey').textContent='E';$('promptTitle').textContent='The forgotten shrine';
    const requirement=secretRequirement(state);$('promptDetail').textContent=requirement.ok?'AWAKEN THE UNINVITED · FREE SECRET COLLECTIBLE':requirement.reason;
    selectionRing.position.set(shrine.position.x,.93,shrine.position.z);selectionRing.visible=true;
  } else if(target) {
    const e=target.entity,d=CATALOG[e.kind];
    $('promptKey').textContent=carry?'HOME':'E';
    $('promptTitle').textContent=carry?`Carrying ${d.name}`:d.name;
    $('promptDetail').textContent=carry?'Return to your mint base to claim it':target.type==='buy'?`BUY ${money(d.price)}  •  +${money(d.income)}/s`:locked(bases[e.owner])?'SHIELD ACTIVE • Wait for the gate to go dark':`STEAL  •  ${d.rarity}  •  +${money(d.income)}/s`;
    if(!carry){selectionRing.position.set(e.mesh.position.x,.76,e.mesh.position.z);selectionRing.visible=true;}
  }
  for(const base of bases) {base.gate.visible=base.gateLines.visible=locked(base);base.gate.material.opacity=.17+Math.sin(gameTime*3)*.035;for(let i=6;i<10;i++)base.pads[i].pad.visible=base.pads[i].r.visible=base.owner===0&&i<state.capacity;}
}

function showMenu(type) {
  if(!started)return;paused=true;menuType=type;keys.clear();resetStick();$('menu').hidden=false;$('prompt').hidden=true;renderMenu();$('closeMenu').focus();
}
function closeMenu() {paused=false;menuType=null;$('menu').hidden=true;keys.clear();lastTime=performance.now();$('world').focus();}
function renderMenu() {
  const el=$('menuContent');
  if(menuType==='shop') {
    const options=[['slots','More pedestals','Make room for one more money-making weirdo.',`${state.capacity}/10 slots`],['speed','Fresh sneakers','Move 12% faster. Stolen loot still slows you.',`Level ${state.speedLevel}/3`],['lock','Stronger shield','Add 10 seconds to every base lock.',`Level ${state.lockLevel}/3`]];
    el.innerHTML=`<p class="eyebrow">SPEND A LITTLE. EARN A LOT.</p><h2>Base upgrades</h2><p class="menu-intro">Your wallet: <strong>${money(state.money)}</strong></p><div class="upgrade-list">${options.map(([type,title,desc,level])=>{const cost=upgradeCost(state,type);return `<article class="upgrade"><div><small>${level}</small><h3>${title}</h3><p>${desc}</p></div><button data-upgrade="${type}" ${!Number.isFinite(cost)||state.money<cost?'disabled':''}>${Number.isFinite(cost)?money(cost):'Maxed'}</button></article>`;}).join('')}</div><article class="rebirth-card"><p class="eyebrow">THE BIG RESET · REBIRTH ${state.rebirths}</p><h3>Start fresh. Earn more.</h3><p>Reset your wallet, creatures, and upgrades for a permanent +25% income bonus. Your collection and stats stay.</p><button id="rebirthButton" ${state.money<rebirthCost(state)?'disabled':''}>Rebirth · ${money(rebirthCost(state))}</button></article>`;
    el.querySelectorAll('[data-upgrade]').forEach(button=>button.addEventListener('click',()=>{const result=upgrade(state,button.dataset.upgrade);if(result.ok){chime();toast('Upgrade installed!','success');save();renderMenu();updateHUD();}else toast(result.reason,'warning');}));
    $('rebirthButton').addEventListener('click',()=>{menuType='rebirth';renderMenu();});
  } else if(menuType==='rebirth') {
    el.innerHTML=`<p class="eyebrow">ONE FRESH START</p><h2>Ready to rebirth?</h2><p class="menu-intro">Your wallet, owned creatures, and upgrades reset. Your collection and lifetime stats stay, and all future income gets another permanent 25% bonus.</p><div class="menu-actions"><button id="confirmRebirth">Yes, rebirth for ${money(rebirthCost(state))}</button><button id="cancelRebirth">Keep building</button></div>`;
    $('cancelRebirth').onclick=()=>{menuType='shop';renderMenu();};$('confirmRebirth').onclick=()=>{returnCarry();bots.forEach(recoverFromBot);const result=rebirth(state);if(result.ok){populatePlayer();save();playerLock=35;lockCooldown=0;chime();toast('Reborn! Your permanent income bonus increased.','success');closeMenu();}else{toast(result.reason,'warning');menuType='shop';renderMenu();}};
  } else if(menuType==='collection') {
    el.innerHTML=`<p class="eyebrow">${state.collection.length} / ${CATALOG.length} DISCOVERED</p><h2>The uncanny collection</h2><p class="menu-intro">Eight familiar creatures, disturbingly changed. A ninth waits at the forgotten shrine. Discoveries survive rebirth.</p><div class="collection-grid">${CATALOG.map((d,i)=>{const seen=state.collection.includes(i);return `<article class="collection-item ${seen?'discovered':''}"><span class="collect-icon">${['◕','☕','♬','☾','✦','◈','♨','∞','⟁'][i]}</span><small>${d.rarity}</small><h3>${seen?d.name:'???'}</h3><p>${seen?d.description:d.unlockOnly?'Find the forgotten shrine beyond the north-east base. Three different discoveries wake it.':'Find this creature on the belt or in a rival base.'}</p><strong>${seen?`${d.unlockOnly?'Shrine unlock':money(d.price)} · +${money(d.income)}/s`:'Undiscovered'}</strong></article>`;}).join('')}</div>`;
  } else if(menuType==='reset') {
    el.innerHTML='<p class="eyebrow">START OVER</p><h2>Erase this save?</h2><p class="menu-intro">This clears your wallet, collection, upgrades and stats on this browser. There is no undo.</p><div class="menu-actions"><button id="confirmReset" class="danger">Erase save and restart</button><button id="cancelReset">Keep my save</button></div>';
    $('cancelReset').onclick=()=>{menuType='pause';renderMenu();};$('confirmReset').onclick=()=>{state=createState();save();location.reload();};
  } else {
    el.innerHTML=`<p class="eyebrow">${menuType==='help'?'THE QUICK TOUR':'TAKE A BREATHER'}</p><h2>${menuType==='help'?'How to hustle':'Game paused'}</h2><div class="help-grid"><p><strong>01 / Buy</strong>Follow the conveyor. Stand near a drop and press E. Purchases arrive at your base instantly and earn cash every second.</p><p><strong>02 / Steal</strong>Walk into a rival base while its shield is dark. Press E near a creature, then carry it into your mint base. Rivals will chase you.</p><p><strong>03 / Defend</strong>Press Space to bat thieves away. Press L inside your base to lock it. Keep an eye on the shield recharge.</p></div><p class="menu-note"><strong>The ninth creature:</strong> Discover three different originals, then visit the stone shrine beyond the north-east rival base. Press E with a free pedestal. The exact earlier snarling creature is waiting. Once per rebirth.</p><div class="controls-list"><span><kbd>WASD / ↑↓←→</kbd> Move</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>E</kbd> Buy / steal</span><span><kbd>Space</kbd> Swing bat</span><span><kbd>L</kbd> Lock base</span><span><kbd>Q</kbd> Return carried loot</span><span><kbd>Drag / wheel</kbd> Orbit / zoom</span><span><kbd>U / C / Esc</kbd> Upgrades / collection / pause</span></div><p class="menu-note">Single-player with three AI rivals. Your progress saves on this device. No offline income. Game time pauses in menus and when the tab is hidden.</p><div class="menu-actions"><button id="resumeButton">Back to the boulevard</button><button id="qualityButton" class="subtle">${performanceMode?'Quality lighting':'Performance mode'}</button><button id="resetButton" class="subtle">Reset save</button></div>`;
    $('resumeButton').onclick=closeMenu;$('qualityButton').onclick=()=>{performanceMode=!performanceMode;renderer.shadowMap.enabled=!performanceMode;sunlight.castShadow=!performanceMode;renderer.setPixelRatio(Math.min(devicePixelRatio,performanceMode?1:1.8));const changed=new Set();scene.traverse(node=>{for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])if(!changed.has(material)){material.needsUpdate=true;changed.add(material);}});renderMenu();};$('resetButton').onclick=()=>{menuType='reset';renderMenu();};
  }
}

$('playButton').addEventListener('click',()=>{started=true;$('startScreen').hidden=true;try{audioContext=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch{}chime();lastTime=performance.now();toast('Welcome! Buy a conveyor drop with E. Your mint base is home.');$('world').focus();});
$('lockButton').onclick=lockBase;$('attackButton').onclick=swing;$('dropButton').onclick=()=>returnCarry('Collectible returned to its owner.');
$('shopButton').onclick=()=>showMenu('shop');$('collectionButton').onclick=()=>showMenu('collection');$('helpButton').onclick=()=>showMenu('help');$('pauseButton').onclick=()=>paused?closeMenu():showMenu('pause');$('closeMenu').onclick=closeMenu;
$('soundButton').onclick=()=>{soundEnabled=!soundEnabled;$('soundButton').textContent=soundEnabled?'♪':'×';$('soundButton').title=soundEnabled?'Sound on · click to mute':'Sound off · click to enable';$('soundButton').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');$('soundButton').setAttribute('aria-pressed',String(soundEnabled));};
$('interactButton').onclick=interact;
window.addEventListener('keydown',event=>{
  const k=event.key.toLowerCase();if(started&&!paused&&[' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))event.preventDefault();
  if(!started){if(k==='enter')$('playButton').click();return;}
  if(k==='escape'&&!event.repeat){paused?closeMenu():showMenu('pause');return;}
  if(paused&&k==='tab'){const controls=[...$('menu').querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(el=>!el.hidden);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
  if(paused)return;if(event.repeat)return;keys.add(k);
  if(k==='e')interact();if(k===' ')swing();if(k==='l')lockBase();if(k==='q')returnCarry('Collectible returned to its owner.');if(k==='u')showMenu('shop');if(k==='c')showMenu('collection');
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();touch.x=touch.y=0;dragging=false;if(started&&!paused)showMenu('pause');save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){keys.clear();if(!paused)showMenu('pause');save();}lastTime=performance.now();});
window.addEventListener('beforeunload',save);
const canvas=$('world');canvas.setAttribute('tabindex','0');
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;cameraYaw-=(e.clientX-lastPointer.x)*.005;cameraPitch=Math.max(.42,Math.min(1.2,cameraPitch+(e.clientY-lastPointer.y)*.004));lastPointer={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();cameraDistance=Math.max(9,Math.min(37,cameraDistance+e.deltaY*.02));},{passive:false});
const stick=$('joystick'),knob=$('joystickKnob');
function updateStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),max=r.width*.32,scale=len>max?max/len:1;touch.x=dx*scale/max;touch.y=dy*scale/max;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
stick.addEventListener('pointerdown',e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);updateStick(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))updateStick(e);});
function resetStick(){touch.x=touch.y=0;knob.style.transform='translate(0px,0px)';}
stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,performanceMode?1:1.8));});

function tick(dt) {
  gameTime+=dt;attackCooldown=Math.max(0,attackCooldown-dt);playerStun=Math.max(0,playerStun-dt);hitFlash=Math.max(0,hitFlash-dt);playerLock=Math.max(0,playerLock-dt);lockCooldown=Math.max(0,lockCooldown-dt);lastRaidAlert=Math.max(0,lastRaidAlert-dt);
  for(const base of bases.slice(1)){base.lock-=dt;if(base.lock<-25-base.owner*4){base.lock=18+base.owner*5;const inside=isInside(player.pos,base);if(inside){returnCarry('Shield closed! You were pushed out.');player.pos.x=base.x-Math.sign(base.x)*9;} }}
  let horizontal=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+touch.x;
  let vertical=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+touch.y;
  const length=Math.hypot(horizontal,vertical);let moving=length>.1&&playerStun<=0;
  if(moving){horizontal/=Math.max(1,length);vertical/=Math.max(1,length);const speed=(carry?5.25:keys.has('shift')?10:7.5)*(1+state.speedLevel*.12);const dx=(Math.cos(cameraYaw)*horizontal+Math.sin(cameraYaw)*vertical)*speed*dt,dz=(-Math.sin(cameraYaw)*horizontal+Math.cos(cameraYaw)*vertical)*speed*dt;moveActor(player.pos,dx,dz,0);player.angle=Math.atan2(dx,dz);}
  playerMesh.position.copy(player.pos);playerMesh.position.y=groundHeight(player.pos);const angleDelta=Math.atan2(Math.sin(player.angle-playerMesh.rotation.y),Math.cos(player.angle-playerMesh.rotation.y));playerMesh.rotation.y+=angleDelta*Math.min(1,dt*20);
  animateAvatar(playerMesh,gameTime,moving,!!carry);playerHalo.position.set(player.pos.x,groundHeight(player.pos)+.05,player.pos.z);playerHalo.scale.setScalar(1+Math.sin(gameTime*3)*.025);
  bat.rotation.z=attackCooldown>.25?-1.2+Math.sin((.6-attackCooldown)*14)*2.4:-.45;bat.rotation.x=attackCooldown>.25?-.9:0;
  if(carry){carry.mesh.position.copy(player.pos).add(new THREE.Vector3(0,2.7,0));carry.mesh.rotation.y=gameTime;bankCarry();}
  pointerArrow.visible=!!carry;if(carry){const direction=new THREE.Vector3(bases[0].x-player.pos.x,0,bases[0].z-player.pos.z).normalize();pointerArrow.position.copy(player.pos).addScaledVector(direction,2.4);pointerArrow.position.y=1;pointerArrow.rotation.set(Math.PI/2,0,-Math.atan2(direction.x,direction.z));}
  tickBots(dt);
  // A carried-away creature stops producing until recovered. Rules retain ownership until the thief escapes.
  const suspended=bots.filter(b=>b.carry).reduce((total,b)=>total+CATALOG[b.carry.kind].income*(1+.25*state.rebirths),0);
  tickIncome(state,dt);state.money=Math.max(0,state.money-suspended*dt);state.lifetime=Math.max(0,state.lifetime-suspended*dt);
  spawnTimer+=dt;if(spawnTimer>7){spawnTimer=0;spawnConveyor();}
  for(const e of [...entities])if(e.sale){e.mesh.position.z+=dt*.88;if(e.label){e.label.position.z=e.mesh.position.z;e.label.position.y=4+Math.sin(gameTime+e.phase)*.13;}if(e.mesh.position.z>30)deleteEntity(e);}
  for(const mesh of belt.children)mesh.position.z=((mesh.userData.z+gameTime*1.5+30)%60)-30;
  worldEventTimer-=dt;if(worldEventTimer<=0){jackpot=!jackpot;worldEventTimer=jackpot?23:100;toast(jackpot?'LUCKY DROP! Rare creatures are taking over the belt for 23 seconds.':'Lucky drop ended. Keep stacking.','success');if(jackpot)spawnConveyor(5);}
  saveTimer+=dt;if(saveTimer>5){saveTimer=0;save();}
}
let hudTimer=0;
function frame(now) {
  requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
  const active=started&&!paused&&!document.hidden;if(active)tick(dt);
  const visualTime=started?gameTime:now/1000;
  for(const e of entities)animateCollectible(e.mesh,visualTime+e.phase,active?dt:0);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(active){p.life-=dt;p.velocity.y-=12*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*6;p.mesh.rotation.z+=dt*4;p.mesh.scale.setScalar(Math.max(.1,p.life));}if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();particles.splice(i,1);}}
  for(let i=floatingTexts.length-1;i>=0;i--){const f=floatingTexts[i];if(active){f.life-=dt;f.sprite.position.y+=dt;f.sprite.material.opacity=Math.min(1,f.life);}if(f.life<=0){scene.remove(f.sprite);f.sprite.material.map.dispose();f.sprite.material.dispose();floatingTexts.splice(i,1);}}
  const focus=started?player.pos:new THREE.Vector3(-1,0,1),yaw=started?cameraYaw:.66,range=started?cameraDistance:64,pitch=started?cameraPitch:.91;
  const desired=new THREE.Vector3(focus.x+Math.sin(yaw)*Math.cos(pitch)*range,Math.sin(pitch)*range,focus.z+Math.cos(yaw)*Math.cos(pitch)*range);
  camera.position.lerp(desired,started?1-Math.exp(-dt*7):1);camera.lookAt(focus.x,1.2,focus.z);
  hudTimer+=dt;if(hudTimer>.12){hudTimer=0;updateHUD();}
  renderer.render(scene,camera);
}
playerMesh.position.copy(player.pos);playerMesh.position.y=groundHeight(player.pos);playerHalo.position.set(player.pos.x,groundHeight(player.pos)+.05,player.pos.z);bots.forEach(b=>{b.mesh.position.copy(b.pos);b.mesh.position.y=groundHeight(b.pos);});
$('loadingStatus').textContent='Original eight ready. Loading the earlier secret creature…';$('playButton').disabled=false;
loadSecretCharacter().then(()=>{
  $('loadingStatus').textContent='Eight uncanny originals. One forbidden guest. Ready.';$('playButton').disabled=false;
}).catch(()=>{
  $('loadingStatus').textContent='Original eight ready. Secret GLB unavailable: extract the full archive and run npm start.';$('playButton').disabled=false;
  if(started)toast('The secret GLB did not load. Extract the full archive and run npm start; the shrine can retry.','warning');
});
updateHUD();requestAnimationFrame(frame);
