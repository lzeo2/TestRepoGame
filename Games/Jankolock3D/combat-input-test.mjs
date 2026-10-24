// Run: node Games/Jankolock3D/combat-input-test.mjs
// Execute the real input callbacks in a VM, with no RAF or browser state grants.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./game.mjs',import.meta.url),'utf8');
assert.match(readFileSync(new URL('./integration.css',import.meta.url),'utf8'), /\.health-hud\{position:fixed;/, 'health must stay visible when scrolling to phone Fire controls');
const handlers=new Map(),held=new Set(),canvas={focus(){},setPointerCapture(){}};
const button={dataset:{hold:'fire'},setPointerCapture(){}};
const document={hidden:false,pointerLockElement:canvas,querySelector:selector=>selector==='.sys-shop'?shop:null,querySelectorAll:()=>[button]};
const shop={hidden:true},hero={alive:true,id:'player'},sim={phase:'active',winner:null,orbs:[],stats:()=>({maxAmmo:12,fireInterval:.2})};
let shots=0,cameraUpdates=0,actions=0,lastTarget;
const runtime={kit:{weapon:{interval:.2}},targets:[],setModifiers(){},aim(){},fire(){if(this.fireWait>0)return false;lastTarget=this.targets[0]?.id;this.fireWait=.2;shots++;return true;},fireWait:0};
const context=vm.createContext({playing:true,paused:false,pointer:null,held,canvas,document,hero,sim,runtime,view:{camera:{}},controller:{updateCamera(){cameraUpdates++;}},targets:()=>[{id:'fresh-target'}],action(){actions++;},clear(){held.clear();},listen(node,type,fn){const key=node===canvas?'canvas':node===document?'document':'button';handlers.set(`${key}:${type}`,fn);}});
const block=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
vm.runInContext(block('function fire() {','function tick('),context);
vm.runInContext(block("  listen(canvas,'pointerdown'","  listen(document,'pointermove'"),context);
vm.runInContext(block("  listen(document,'pointerup'","  listen(document,'pointerlockchange'"),context);
vm.runInContext(block("  for(const button of document.querySelectorAll('[data-hold]'))", "  for(const button of document.querySelectorAll('[data-edge]'))"),context);
const event=(extra={})=>({pointerType:'mouse',pointerId:1,button:0,preventDefault(){},...extra});
handlers.get('canvas:pointerdown')(event());
assert.equal(shots,1,'mouse press fires synchronously, without RAF/release');
assert.equal(lastTarget,'fresh-target');assert.equal(runtime.targets.length,0,'temporary orb/target list restored');assert.equal(cameraUpdates,1);
handlers.get('canvas:pointerdown')(event());assert.equal(shots,1,'cooldown preserved');
handlers.get('document:pointerup')(event());assert.equal(held.has('fire'),false);
runtime.fireWait=0;assert.equal(shots,1,'released press was not queued');
handlers.get('canvas:pointerdown')(event({button:2}));assert.equal(shots,1,'aim is not fire');
handlers.get('canvas:pointerdown')(event({button:1}));assert.equal(shots,1,'middle button is not fire');
handlers.get('button:pointerdown')(event({pointerType:'touch',pointerId:2}));assert.equal(shots,2,'touch press fires synchronously');
handlers.get('document:pointerup')(event({pointerType:'touch',pointerId:3}));assert.equal(held.has('fire'),true,'other touch release does not cancel fire');
handlers.get('button:pointercancel')(event({pointerType:'touch',pointerId:2}));assert.equal(held.has('fire'),false);
for(const [object,key,value] of [[context,'playing',false],[context,'paused',true],[document,'hidden',true],[hero,'alive',false],[sim,'winner','ivory'],[sim,'phase','pregame'],[shop,'hidden',false]]) {
  const previous=object[key];object[key]=value;runtime.fireWait=0;
  handlers.get('canvas:pointerdown')(event());assert.equal(shots,2,`blocked shot: ${key}`);
  object[key]=previous;held.clear();
}
assert.equal(actions,0);
console.log('combat-input: synchronous mouse/touch fire, current aim/targets, cooldown/no queue, aim-only, touch cancellation and state guards passed (VM, not native hardware).');
