// Public Host rewards and actual shop callbacks; DOM double, no native/layout/balance claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {setMaxListeners} from 'node:events';
import {createSystems} from './systems.mjs';
import {mountSystemsUI} from './systems-ui.mjs';
const kit=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];
class Node extends EventTarget {
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.textContent='';this.classList={add(){},remove(){}};this.parentNode=null;this.html=null;this.cache=new Map();}
  addEventListener(type,fn,options){if(options?.signal)setMaxListeners(0,options.signal);super.addEventListener(type,fn,options);}
  append(...nodes){for(const n of nodes)if(typeof n==='string')this.textContent+=n;else{n.parentNode=this;this.children.push(n);}}
  replaceChildren(...nodes){for(const n of [...this.children,...this.cache.values()])n.parentNode=null;this.children=[];this.cache.clear();this.html=null;this.append(...nodes);}
  set innerHTML(value){this.html=value;}
  get isConnected(){return this.connected||this.parentNode?.isConnected||false;}
  setAttribute(k,v){this.attributes[k]=String(v);}
  matches(s){return s===this.tagName.toLowerCase()||s.startsWith('[data-')&&Object.hasOwn(this.dataset,s.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()));}
  querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}
  querySelector(s){
    if(this.html===null)return this.querySelectorAll(s)[0]??null;
    if(!this.cache.has(s)){
      const token=s.startsWith('.')?s.slice(1):s.slice(1,-1);assert.ok(this.html.includes(token),`real markup includes ${s}`);
      const n=new Node(/data-(open|close|confirm-purchase|cancel-purchase)/.test(s)?'button':'div');n.parentNode=this;this.cache.set(s,n);
    }
    return this.cache.get(s);
  }
  closest(s){return s.split(',').some(p=>this.matches(p))?this:this.parentNode?.closest(s)??null;}
  focus(){document.activeElement=this;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
}
const original=Object.fromEntries(['document','window','Element','localStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
const doc=new Node('document');let releases=0,storageCalls=0;
doc.createElement=tag=>new Node(tag);doc.exitPointerLock=()=>releases++;
Object.assign(globalThis,{document:doc,window:new EventTarget(),Element:Node});
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){storageCalls++;throw Error('match state must not use storage');}});
const s=createSystems(),h=s.addHero({id:'player',team:'carbon'});assert.ok(s.configureHeroKit(h.id,kit).ok);s.step(30);
const root=new Node();root.connected=true;const ui=mountSystemsUI(root,s,h.id);
const $=x=>root.querySelector(x),buttons=()=>$('.sys-items').querySelectorAll('button');
const buy=id=>buttons().find(b=>b.dataset.item===id),confirm=()=> $('[data-confirm-purchase]').click();
let serial=0;
// No currency/HP assignments: public Host kills earn the documented 100-soul bounty.
// Damage here is an isolated API reward fixture, not native weapon timing/balance.
const earn=count=>{for(let i=0;i<count;i++){const foe=s.addHero({id:`reward-${++serial}`,team:'ivory',position:{...h.position,x:h.position.x+1}});assert.ok(s.damage(foe.id,1e6,h.id,{kind:'ability'}).killed);}};
const key=code=>window.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{code}));
try {
  assert.deepEqual(buttons().map(b=>b.dataset.item),['ammo','health','sprint']);assert.equal($('.sys-tiers').querySelectorAll('input')[0].checked,true);
  assert.ok(buttons().every(b=>b.disabled));assert.equal(h.souls,0);assert.deepEqual(h.items,[]);
  assert.match(root.html,/No selling, refunds or replacements/);assert.match(root.html,/Restart clears items and souls/);assert.ok(releases>0);
  confirm();assert.deepEqual(h.items,[]);
  earn(8);ui.update();assert.equal(h.souls,800);assert.equal(h.earnedSouls,800);
  buy('ammo').click();assert.equal(h.souls,800);assert.deepEqual(h.items,[]);assert.equal(document.activeElement,$('[data-confirm-purchase]'));
  assert.match($('[data-review]').textContent,/\+12 magazine capacity.*Cost 800 souls\./);
  $('[data-cancel-purchase]').click();assert.equal($('.sys-confirm').hidden,true);assert.equal(document.activeElement,buy('ammo'));assert.equal(h.souls,800);
  buy('ammo').click();ui.close();confirm();assert.equal(h.souls,800);assert.deepEqual(h.items,[]);ui.open();
  buy('ammo').click();key('Escape');assert.equal($('.sys-confirm').hidden,true);assert.equal($('.sys-shop').hidden,false);key('Escape');assert.equal($('.sys-shop').hidden,true);ui.open();
  buy('ammo').click();const hp=s.stats(h.id).maxHp;
  assert.ok(s.buyItem(h.id,'health').ok);assert.equal(s.stats(h.id).maxHp,hp+200);
  confirm();assert.equal(h.souls,0);assert.deepEqual(h.items,['health']);assert.match($('.sys-notice').textContent,/insufficient souls/);
  confirm();assert.deepEqual(h.items,['health'],'stale/double confirmation cannot spend again');assert.equal(s.buyItem(h.id,'health').reason,'already owned');
  earn(8);ui.update();buy('ammo').click();confirm();assert.equal(s.stats(h.id).maxAmmo,kit.weapon.magazine+12);assert.equal(h.souls,0);
  earn(8);ui.update();buy('sprint').click();confirm();assert.equal(s.stats(h.id).moveSpeed,10);assert.equal(h.souls,0);assert.equal(h.earnedSouls,2400);
  assert.equal(s.events.filter(e=>e.type==='purchase').length,3);assert.ok(buttons().every(b=>b.disabled));
  const tier=n=>{const radio=$('.sys-tiers').querySelectorAll('input')[n-1];radio.dispatchEvent(new Event('change'));};
  earn(16);tier(2);ui.update();buy('lifesteal').click();tier(1);assert.equal($('.sys-confirm').hidden,true);assert.equal(h.souls,1600);tier(2);buy('lifesteal').click();
  assert.ok(s.moveHero(h.id,{...s.bases.carbon,x:s.bases.carbon.x+20.000001}).ok);confirm();assert.equal(h.souls,1600);assert.deepEqual(h.items,['health','ammo','sprint']);assert.match($('.sys-notice').textContent,/shop unavailable/);
  s.moveHero(h.id,s.bases.carbon);ui.update();buy('lifesteal').click();s.moveHero(h.id,s.bases.ivory);ui.update();assert.equal($('.sys-confirm').hidden,true);assert.equal($('.sys-shop').hidden,true);assert.equal(h.souls,1600);
  s.moveHero(h.id,{...s.bases.carbon,x:s.bases.carbon.x+20});assert.equal(s.shopAvailable(h.id),true);
  s.moveHero(h.id,s.bases.carbon);const killer=s.addHero({id:'killer',team:'ivory',position:{...h.position,x:h.position.x+1}});assert.ok(s.damage(h.id,1e6,killer.id,{kind:'ability'}).killed);
  ui.update();buy('dash-charge').click();confirm();assert.equal(h.hp,0);assert.equal(h.alive,false);assert.equal(h.souls,0);assert.ok(h.items.includes('dash-charge'));
  const owned=[...h.items];s.step(5);ui.update();assert.equal(h.alive,true);assert.deepEqual(h.items,owned,'death/respawn keeps earned items');
  const fresh=createSystems(),again=fresh.addHero({id:'player',team:'carbon'});assert.equal(again.souls,0);assert.equal(again.earnedSouls,0);assert.deepEqual(again.items,[]);
  assert.equal('sellItem' in s,false);assert.equal(storageCalls,0);
  const staleConfirm=$('[data-confirm-purchase]');ui.dispose();ui.dispose();staleConfirm.dispatchEvent(new Event('click'));ui.open();ui.message('late completion');ui.update();assert.deepEqual(h.items,owned);assert.equal(root.children.length,0);
  console.log('exchange-test: actual shop/public Host reward flow passed: three800-soul choices, review/cancel/focus, cost/effects, stale funds/location, duplicate guard, dead purchase/respawn, no-refund/match-only policy and cleanup (DOM double only)');
} finally {
  ui.dispose();for(const [k,d]of Object.entries(original))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];
}
// Execute the actual map callback for both player teams.
const source=readFileSync(new URL('./integration-ui.mjs',import.meta.url),'utf8');
const a=source.indexOf('  function drawMap() {'),b=source.indexOf('  function update(',a);assert.ok(a>=0&&b>a);
const helpers=source.slice(source.indexOf('const finite ='),source.indexOf('\nconst count'))+source.slice(source.indexOf('const pointOnMap ='),source.indexOf('const objectiveText ='));
for(const team of ['carbon','ivory']){
  const labels=[],context=new Proxy({fillText:(text,x,y)=>labels.push({text,x,y})},{get:(o,k)=>k in o?o[k]:()=>{}});
  const sim=createSystems(),hero=sim.addHero({id:'player',team});
  vm.runInNewContext(helpers+source.slice(a,b)+'drawMap();',{context,playing:true,disposed:false,map:{clientWidth:198,width:198,height:198},sim,hero:()=>hero,heroId:hero.id,world:null,getComputedStyle:()=>({getPropertyValue:()=> '#fff'}),document:{documentElement:{}}});
  const base=labels.find(x=>x.text==='B');assert.ok(base);assert.equal(base.x,99);assert.ok(base.y>=8&&base.y<=190);
}
console.log('exchange-test: actual map callback marks own base for both teams; no browser/native rendering claim');
