// node --experimental-vm-modules scripts/check_basketball_boot.mjs
// Hypothesis: a missing boot DOM ID, module export or source constructor error prevents PLAY.
// Execute unchanged production modules; substitute browser boundaries, never start WebGL/RAF.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as three from '../Games/StealBasketballer/vendor/three.module.js';

const root=new URL('../Games/StealBasketballer/',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const ids=[...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)];
assert.equal(new Set(ids.map(m=>m[1])).size,ids.length,'Unique actual HTML IDs');
const elements=new Map(ids.map(([tag,id])=>[id,{id,disabled:/\sdisabled(?:\s|>)/.test(tag),
  clientWidth:1440,clientHeight:900,addEventListener(){}}]));
const document={
  getElementById(id){assert.ok(elements.has(id),'Missing boot HTML element: '+id);return elements.get(id);},
  addEventListener(){},
  createElement(tag){assert.equal(tag,'canvas');return {getContext(kind){
    assert.equal(kind,'2d');return {fillRect(){},fillText(){}};
  }};}
};
let releaseFetch,finish;
const fetchGate=new Promise(resolve=>{releaseFetch=resolve;});
const done=new Promise(resolve=>{finish=resolve;});
const requests=[],errors=[];
let rendererCalls=0,rafCalls=0;
class RendererBoundary {
  constructor({canvas}){assert.equal(canvas,elements.get('world'));rendererCalls++;this.shadowMap={};
    this.info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}
  setPixelRatio(){}
  setSize(){}
}
const window={matchMedia:()=>({matches:true}),addEventListener(){}};
const context=vm.createContext({window,document,TextEncoder,
  localStorage:{getItem(key){assert.ok(key.startsWith('steal-basketballer:v1'));return null;}},
  console:{error(error){errors.push(String(error));finish();}},
  requestAnimationFrame(){rafCalls++;finish();},
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
console.log('LIMIT: DOM/2D/fetch/storage/RAF and WebGLRenderer are doubles; no browser, GPU, native timing or gameplay acceptance.');
