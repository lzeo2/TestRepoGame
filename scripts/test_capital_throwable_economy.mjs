import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createStreetUI} from '../Games/Capital Drive/street-ui.js';
const map={spawn:{x:0,z:0}};
const legacy={version:1,cash:10000,ownedVehicles:[{id:'lantern',color:'#e7e6df',health:100,stored:false}],completedJobs:[],gear:{scanner:true,flares:3}};
const dealer={id:'fixture-dealer',name:'Fixture contact',type:'arms',dealer:true,road:'Fixture',radius:3,x:5,z:5,weaponIds:['pistol'],priceMultiplier:2};
const fresh=(save=legacy,options={})=>createProgression(map,structuredClone(save),{extraServices:[dealer],...options});
const ctx=(site=dealer,extra={})=>({pose:{x:site.x,z:site.z,yaw:0},onFoot:true,wanted:5,vehicleHealth:100,respawnSerial:0,health:100,sandbox:false,recovering:false,...extra});
const unchanged=(p,action)=>{const before=p.serialize();assert.equal(action().ok,false);assert.deepEqual(p.serialize(),before);};
{
  const p=fresh();assert.deepEqual(p.state.gear,{scanner:true,flares:3,grenades:0,smokeGrenades:0});assert.deepEqual(fresh(p.serialize()).serialize(),p.serialize());
  const old=structuredClone(legacy);delete old.gear;assert.deepEqual(fresh(old).state.gear,{scanner:false,flares:0,grenades:0,smokeGrenades:0});
  for(const key of ['grenades','smokeGrenades']){
    for(const value of [null,true,'1',-1,7,1.5,NaN,Infinity])assert.throws(()=>fresh({...legacy,gear:{...legacy.gear,[key]:value}}),/gear/);
    for(const value of [0,1,6])assert.equal(fresh({...legacy,gear:{...legacy.gear,[key]:value}}).state.gear[key],value);
  }
  for(const gear of [{grenades:0,smokeGrenades:0},{...legacy.gear,grenades:0,unknown:1}])assert.throws(()=>fresh({...legacy,gear}),/gear/);
}
for(const site of fresh().services.filter(site=>site.type==='arms')){
  const p=fresh();for(const [kind,field,price] of [['grenade','grenades',120],['smoke','smokeGrenades',80]]){
    for(let count=1;count<=6;count++){
      const before=p.state.cash,result=p.purchaseService(site.id,kind,ctx(site));assert(result.ok);assert.equal(p.state.cash,before-price);assert.equal(result.cost,price);assert.equal(p.state.gear[field],count);
    }
    unchanged(p,()=>p.purchaseService(site.id,kind,ctx(site)));
    const before=p.state.cash;for(let count=5;count>=0;count--){const result=p.consumeThrowable(kind,ctx());assert(result.ok);assert.equal(result.remaining,count);assert.equal(p.state.gear[field],count);assert.equal(p.state.cash,before);}
    unchanged(p,()=>p.consumeThrowable(kind,ctx()));
  }
  assert.deepEqual(fresh(p.serialize()).serialize(),p.serialize());assert.equal(p.state.gear.flares,3);assert.equal(p.state.gear.scanner,true);
}
for(const extra of [{onFoot:false},{sandbox:true},{recovering:true},{passenger:true},{health:0},{health:101},{health:NaN},{pose:{x:100,z:100}},{pose:{x:NaN,z:5}}]){
  const p=fresh();unchanged(p,()=>p.purchaseService(dealer.id,'grenade',ctx(dealer,extra)));
}
for(const options of [{hasLineOfSight:()=>false},{canUseService:()=>false}]){const p=fresh(legacy,options);unchanged(p,()=>p.purchaseService(dealer.id,'smoke',ctx()));}
{
  const p=fresh({...legacy,cash:0});unchanged(p,()=>p.purchaseService(dealer.id,'grenade',ctx()));
  for(const kind of ['unknown','__proto__','toString']){unchanged(p,()=>p.purchaseService(dealer.id,kind,ctx()));unchanged(p,()=>p.consumeThrowable(kind,ctx()));}
}
for(const extra of [{onFoot:false},{recovering:true},{passenger:true},{bus:true},{ride:true},{interior:{id:'room'}},{health:0},{health:NaN},{health:101},{wanted:6},{respawnSerial:-1}]){
  const p=fresh({...legacy,gear:{...legacy.gear,grenades:1}});unchanged(p,()=>p.consumeThrowable('grenade',ctx(dealer,extra)));
}
{
  const p=fresh();const before=p.serialize();assert.equal(p.consumeThrowable('grenade',ctx(dealer,{sandbox:true})).practice,true);assert.deepEqual(p.serialize(),before,'practice never changes wallet, inventory or save');
  p.state.activity={type:'fixture'};unchanged(p,()=>p.consumeThrowable('smoke',ctx()));
}
{
  class Element{constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.textContent='';this.classList={add(){}};}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn;}removeEventListener(type){delete this.listeners[type];}}
  const list=new Element('div');globalThis.document={getElementById:id=>id==='services-list'?list:null,createElement:tag=>new Element(tag)};
  const p=fresh(),actor=ctx();let saves=0;
  const state={mode:'foot',vehicle:{modelId:'lantern',color:'#e7e6df'},wanted:5,health:100,vehicleHealth:100,respawnSerial:0,weapon:'unarmed',pursuit:'pursuit'};
  const ui=createStreetUI({gameplay:{state,focus:()=>actor.pose,getAmmo:()=>({reserveAmmo:0})},progression:p,simulation:{nearbyVehicles:()=>[],hasLineOfSight:()=>true},vehicles:[],notify(){},openDialog(){},closeDialogs(){},saveCareer(){saves++;},isSandbox:()=>actor.sandbox});
  const all=node=>[node,...node.children.flatMap(all)];ui.renderServices();let article=list.children.find(n=>n.dataset.serviceId===dealer.id);
  let grenade=all(article).find(n=>n.dataset.serviceItem==='grenade');assert.equal(grenade.textContent,'Grenade $120');assert.equal(grenade.disabled,false);grenade.listeners.click();assert.equal(saves,1);assert.equal(p.state.gear.grenades,1);
  article=list.children.find(n=>n.dataset.serviceId===dealer.id);assert(all(article).some(n=>n.textContent.includes('Grenades 1/6')));const smoke=all(article).find(n=>n.dataset.serviceItem==='smoke');assert.equal(smoke.textContent,'Smoke grenade $80');smoke.listeners.click();assert.equal(saves,2);
  p.state.gear.grenades=6;ui.renderServices();article=list.children.find(n=>n.dataset.serviceId===dealer.id);grenade=all(article).find(n=>n.dataset.serviceItem==='grenade');assert.equal(grenade.disabled,true);assert.match(grenade.dataset.reason,/full/);
  ui.dispose();delete globalThis.document;
}
console.log('PASS throwable economy: strict optional legacy counts0..6; arms/contact stock exact120/80 prices, caps/cash/reach/sight/mode guards; bounded single consumption, empty/invalid denial, free practice no write; shop price/count/cap UI and successful-only save callbacks.');
