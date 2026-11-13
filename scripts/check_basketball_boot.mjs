// node --experimental-vm-modules scripts/check_basketball_boot.mjs
// Hypothesis: a missing boot DOM ID, module export or source constructor error prevents PLAY.
// Execute unchanged production modules and registered UI handlers; browser boundaries are doubles.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as three from '../Games/StealBasketballer/vendor/three.module.js';

const root=new URL('../Games/StealBasketballer/',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const ids=[...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)];
assert.equal(new Set(ids.map(m=>m[1])).size,ids.length,'Unique actual HTML IDs');
const elements=new Map(),documentListeners=new Map();
const decode=text=>text.replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key]));
class Element {
  constructor(tag,attrs,parent){
    this.tag=tag;this.id=attrs.id||'';this.parent=parent;this.children=[];this.listeners=new Map();
    this.dataset=Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('data-'))
      .map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),value]));
    this.hidden=Object.hasOwn(attrs,'hidden');this.disabled=Object.hasOwn(attrs,'disabled');
    this.inert=false;this.isConnected=true;this.style={};this.value=attrs.value||'';
    this.clientWidth=1440;this.clientHeight=900;this.lastChild={textContent:''};
    const classes=new Set((attrs.class||'').split(/\s+/));
    this.classList={contains:name=>classes.has(name),toggle(name,force){
      const active=force===undefined?!classes.has(name):!!force;
      if(active)classes.add(name);else classes.delete(name);return active;
    }};
  }
  addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
  focus(){document.activeElement=this;}
  closest(selector){for(let node=this;node;node=node.parent)if(selector===node.tag||selector==='#'+node.id)return node;return null;}
  set innerHTML(markup){
    const disconnect=node=>{node.isConnected=false;node.children.forEach(disconnect);if(elements.get(node.id)===node)elements.delete(node.id);};
    this.children.forEach(disconnect);this.children=[];this.markup=markup;parseElements(markup,this);
  }
  get innerHTML(){return this.markup||'';}
}
// Restricted markup model for this fixture, not a browser DOM/layout/parser implementation.
function parseElements(markup,parent){
  const stack=[parent],buttons=[];
  for(const [,closing,tag,raw] of markup.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){
    if(closing){assert.equal(stack.at(-1)?.tag,tag,'Balanced fixture markup: '+tag);stack.pop();continue;}
    const attrs=Object.fromEntries([...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,decode(value||'')]));
    const node=new Element(tag,attrs,stack.at(-1));stack.at(-1)?.children.push(node);
    if(node.id){assert.ok(!elements.has(node.id),'Unique parsed ID: '+node.id);elements.set(node.id,node);}
    if(tag==='button')buttons.push(node);
    if(!['meta','link','img','br','input'].includes(tag))stack.push(node);
  }
  assert.equal(stack.length,1,'Complete fixture markup');return buttons;
}
const staticButtons=parseElements(html,null);
const document={hidden:false,activeElement:null,
  getElementById(id){assert.ok(elements.has(id),'Missing actual HTML element: '+id);return elements.get(id);},
  addEventListener(name,handler){if(!documentListeners.has(name))documentListeners.set(name,[]);documentListeners.get(name).push(handler);},
  createElement(tag){assert.equal(tag,'canvas');return {getContext(kind){
    assert.equal(kind,'2d');return {fillRect(){},fillText(){},strokeText(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){}};
  }};}
};
assert.equal(elements.size,ids.length);
function click(button){
  assert.equal(button?.tag,'button','Actual parsed button required');
  assert.ok(button.isConnected&&!button.disabled,'No stale/disabled/forced click');
  for(let node=button;node;node=node.parent)assert.ok(!node.hidden&&!node.inert,'No hidden/inert/forced click');
  button.focus();const event={target:button};button.onclick?.(event);
  for(let node=button;node;node=node.parent)for(const handler of node.listeners.get('click')||[])handler(event);
  for(const handler of documentListeners.get('click')||[])handler(event);
}
function actionButton(action){
  const walk=node=>[node,...node.children.flatMap(walk)];
  return walk(document.getElementById('sheet-content')).find(node=>node.tag==='button'&&node.dataset.action===action);
}
let releaseFetch,finish;
const fetchGate=new Promise(resolve=>{releaseFetch=resolve;});
const done=new Promise(resolve=>{finish=resolve;});
const requests=[],errors=[],frames=[],storageReads=[],storageWrites=[];
const footballKeys=['steal-footballer:v1','steal-footballer:v1:backup','steal-footballer:v1:damaged'];
const storage=new Map(footballKeys.map(key=>[key,'untouched football save']));
let rendererCalls=0,rafCalls=0,renderCalls=0,lastScene;
class RendererBoundary {
  constructor({canvas}){assert.equal(canvas,elements.get('world'));rendererCalls++;this.shadowMap={};
    this.info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}
  setPixelRatio(){}
  setSize(){}
  render(scene,camera){assert.ok(scene.isScene&&camera.isPerspectiveCamera);renderCalls++;lastScene=scene;}
}
const window={matchMedia:()=>({matches:true}),addEventListener(){}};
const context=vm.createContext({window,document,TextEncoder,performance,
  localStorage:{
    getItem(key){storageReads.push(key);assert.ok(key.startsWith('steal-basketballer:v1'));return storage.get(key)??null;},
    setItem(key,value){storageWrites.push(key);assert.ok(key.startsWith('steal-basketballer:v1'));storage.set(key,String(value));}
  },
  console:{error(error){errors.push(String(error));finish();}},
  requestAnimationFrame(callback){frames.push(callback);rafCalls++;finish();},
  async fetch(specifier){
    assert.ok(['./data/catalog.json','./data/world.json'].includes(specifier),'Only actual local boot data');
    requests.push(specifier);await fetchGate;
    return {ok:true,json:async()=>JSON.parse(await readFile(new URL(specifier,root),'utf8'))};
  }
});
// Native Three math/geometry/material classes; only the WebGLRenderer export is a double.
const vendor=new URL('vendor/three.module.js',root).href;
const boundary=new vm.SyntheticModule(Object.keys(three),function(){
  for(const [name,value] of Object.entries(three))this.setExport(name,name==='WebGLRenderer'?RendererBoundary:value);
},{context,identifier:vendor});
const modules=new Map([[vendor,Promise.resolve(boundary)]]);
function load(url){
  assert.ok(url.startsWith(root.href),'Import stays within sibling: '+url);
  if(!modules.has(url))modules.set(url,readFile(new URL(url),'utf8').then(source=>new vm.SourceTextModule(source,{context,identifier:url})));
  return modules.get(url);
}
const script=html.match(/<script type="module" src="([^"]+)"><\/script>/);
assert.ok(script,'Actual HTML module entry');
const entry=await load(new URL(script[1],root).href);
await entry.link((specifier,referrer)=>load(new URL(specifier,referrer.identifier).href));
await entry.evaluate({timeout:5000});
const start=document.getElementById('start');
assert.equal(typeof window.basketballerSnapshot,'function','Diagnostic exists before data resolves');
assert.equal(start.disabled,true,'PLAY waits for initialization');
assert.equal(rendererCalls,0,'No World construction before data resolves');
releaseFetch();
let timer;
try {
  await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Source boot exceeded 5s')),5000);})]);
} finally {clearTimeout(timer);}
assert.deepEqual(errors,[],'No caught source boot exception');
assert.equal(start.disabled,false,'Production boot enables PLAY');
assert.equal(typeof start.onclick,'function');
assert.equal(rendererCalls,1,'Actual World constructor reached renderer boundary once');
assert.equal(rafCalls,1,'Boot queues exactly one frame; no frames executed');
assert.equal(vm.runInContext('typeof window.basketballerSnapshot === "function" && !document.getElementById("start").disabled',context),true,'Exact browser readiness predicate');
const snapshot=window.basketballerSnapshot();
assert.equal(snapshot.state.roster.length,0);assert.equal(snapshot.state.rivals.length,12);
assert.equal(snapshot.world.camera.mode,'avatar');assert.equal(snapshot.world.camera.pitchIndex,0);
assert.equal(snapshot.world.staticParts,3057);assert.ok(snapshot.world.batches>0);
assert.equal(requests.sort().join(','),'./data/catalog.json,./data/world.json');
console.log(`PASS source boot: ${ids.length} HTML IDs; actual app/Game/World/actors; 2 local JSONs; setCamera; exact readiness predicate true; 1 RAF queued, 0 frames run`);

click(start);
assert.equal(window.basketballerSnapshot().started,true);
assert.equal(document.getElementById('loading').hidden,true);
assert.equal(document.getElementById('hud').hidden,false);
assert.equal(window.basketballerSnapshot().state.coins,150);
click(staticButtons.find(button=>button.dataset.panel==='shop'));
assert.equal(window.basketballerSnapshot().panel,'shop');
click(actionButton('openMarket'));
assert.equal(window.basketballerSnapshot().panel,'market');
const buy=actionButton('buy');assert.ok(buy,'App rendered a natural market signing button');
const catalog=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8'));
const recruit=catalog.players.find(player=>player.id===buy.dataset.id);
assert.ok(recruit&&recruit.cost>0&&recruit.cost<=150,'Actual market recruit affordable without grants');
click(buy);
const signed=window.basketballerSnapshot();
assert.equal(signed.state.roster.length,1);assert.equal(signed.state.roster[0].id,recruit.id);
assert.equal(signed.state.coins,150-recruit.cost);
click(document.getElementById('close-sheet'));
click(document.getElementById('battle'));
assert.equal(document.getElementById('sheet').hidden,true);
assert.equal(document.getElementById('score-strip').hidden,false);
assert.equal(document.getElementById('spectator').hidden,false);
assert.equal(document.getElementById('match-controls').hidden,false);
assert.ok(document.getElementById('hud').classList.contains('in-match'));
// At most 1.05 seconds via the actual queued app callbacks, no direct Match.update/action calls.
for(let index=0;index<22;index++){
  assert.equal(frames.length,1,'Single app RAF chain');frames.shift()(1000+index*50);
}
const playing=window.basketballerSnapshot(),match=playing.match;
assert.ok(match&&!match.finished&&match.elapsed>0&&match.elapsed<=1.1);
assert.equal(match.players.length,10);
for(const side of [0,1])assert.equal(match.players.filter(player=>player.side===side).length,5);
assert.ok(match.players.some(player=>player.id===recruit.id&&!player.borrowed));
assert.equal(playing.state.battleLock,true);assert.equal(playing.state.incomeRate,0);
assert.equal(document.getElementById('income').textContent,'PAUSED');
assert.equal(document.getElementById('score').textContent,match.score.join(' : '));
assert.equal(document.getElementById('match-period').textContent,'Q1');
assert.ok(match.shotClock>0&&match.shotClock<24);
assert.equal(document.getElementById('shot-clock').textContent,'SHOT '+match.shotClock.toFixed(1));
assert.equal(document.getElementById('shot-clock-bar').value,match.shotClock);
assert.ok(renderCalls>0);
const matchGroups=lastScene.children.filter(node=>node.isGroup&&node.children.some(child=>child.isMesh&&child.geometry.type==='SphereGeometry'));
assert.equal(matchGroups.length,1,'Actual World match group containing the basketball');
const actors=matchGroups[0].children.filter(node=>node.isGroup);
assert.equal(actors.length,10,'Actual World/ActorFactory created ten match actors');
actors.forEach((actor,index)=>{assert.equal(actor.position.x,match.players[index].x);assert.equal(actor.position.z,match.players[index].z);});
assert.ok(storageWrites.includes('steal-basketballer:v1'));
const saved=JSON.parse(storage.get('steal-basketballer:v1'));
assert.equal(saved.roster.length,1);assert.equal(saved.roster[0].id,recruit.id);
assert.equal(saved.coins,150-recruit.cost);
assert.ok(storageReads.every(key=>key.startsWith('steal-basketballer:v1')));
assert.ok(storageWrites.every(key=>key.startsWith('steal-basketballer:v1')));
footballKeys.forEach(key=>assert.equal(storage.get(key),'untouched football save'));
assert.deepEqual(errors,[]);
click(document.getElementById('pause'));
const paused=window.basketballerSnapshot();
assert.equal(paused.paused,true);assert.equal(document.getElementById('hud').inert,true);
for(let index=0;index<3;index++){
  assert.equal(frames.length,1,'Paused app retains one RAF chain');frames.shift()(3000+index*50);
}
const held=window.basketballerSnapshot();
assert.equal(held.match.elapsed,paused.match.elapsed);
assert.deepEqual(held.world.avatar,paused.world.avatar);
assert.equal(held.state.coins,paused.state.coins);
assert.equal(held.state.event.remaining,paused.state.event.remaining,'App-owned active clock freezes event deadlines');
click(document.getElementById('resume'));
for(let index=0;index<2;index++)frames.shift()(4000+index*50);
assert.equal(window.basketballerSnapshot().paused,false);
assert.ok(window.basketballerSnapshot().match.elapsed>held.match.elapsed);
click(staticButtons.find(button=>button.dataset.panel==='match'));
const controlButton=actionButton('controlPlayer');
for(let index=0;index<22;index++)frames.shift()(5000+index*50);
assert.equal(actionButton('controlPlayer'),controlButton,'Live match panel keeps its button nodes');
assert.equal(controlButton.isConnected,true);
click(controlButton);
assert.ok(window.basketballerSnapshot().match.control,'Stable normal control button remains actionable');
const beforeSlow=window.basketballerSnapshot().match.elapsed;
for(let index=0;index<10;index++)frames.shift()(6250+index*200);
assert.ok(window.basketballerSnapshot().match.elapsed-beforeSlow>=1.95,'Slow frames retain elapsed match time');
console.log(`PASS ordinary app UI: installed PLAY -> SHOP/conveyor -> ${recruit.id} (${recruit.cost}/150 coins) -> BATTLE; real Match 5v5 + ten World actors; Q1/score/shot-clock HUD; isolated save; pause/deadline freeze/resume; stable match menu/player-control input; slow-frame elapsed time; 59 bounded RAF callbacks`);
console.log('LIMIT: restricted DOM/2D/fetch/storage/RAF and WebGLRenderer doubles; AudioContext absent follows production fallback. No browser/GPU/layout/native audio/touch/full-match acceptance.');
