import assert from 'node:assert/strict';
import {createCityUI} from '../Games/Capital Drive/city-ui.js';
import {createSkillTrees} from '../Games/Capital Drive/skill-trees.js';
class Element {
  constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.listeners={};this.attributes={};this.textContent='';this.disabled=false;}
  append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,fn){this.listeners[key]=fn;}
  focus(){this.doc.activeElement=this;}
  click(){if(!this.disabled)this.listeners.click?.({});}
  showModal(){this.open=true;}
  close(){this.open=false;this.listeners.close?.();}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
}
const document={createElement(tag){return new Element(tag,this);},getElementById(id){const walk=node=>node.id===id?node:node.children.map(walk).find(Boolean);return walk(this.body);}};
document.body=document.createElement('body');
const phone=document.createElement('dialog');phone.id='phone-dialog';document.body.append(phone);
const services=document.createElement('section');services.id='city-services';phone.append(services);
const trees=createSkillTrees();trees.award({kind:'job',id:'fixture',success:true},{mode:'street'});
let state={cash:1000,health:60,sandbox:false,training:{player:trees.describe('player'),crew:trees.describe('crew')},trainingLocked:'',homeStatus:{comfort:false,pantry:true,meals:3,comfortPrice:450,pantryPrice:180,refillPrice:30},homeName:'Fixture home'};
const calls=[];
const ui=createCityUI({document,getState:()=>state,onAction:(...args)=>{calls.push(args);return {ok:true,message:'Done'};}});
assert.equal(phone.children.filter(node=>node.id==='city-services').length,1);
document.getElementById('city-training-open').click();
assert.equal(document.getElementById('city-training-player').attributes['aria-selected'],'true');
assert.equal(document.getElementById('city-learn-second-wind').disabled,true);
const learn=document.getElementById('city-learn-steady-stride');learn.focus();learn.click();
assert.deepEqual(calls.pop(),['learn-skill',{track:'player',id:'steady-stride'}]);
assert.equal(document.activeElement,document.getElementById('city-learn-steady-stride'));
document.getElementById('city-training-player').listeners.keydown({key:'ArrowRight',preventDefault(){}});
assert.equal(document.getElementById('city-training-crew').attributes['aria-selected'],'true');
assert.equal(document.getElementById('city-learn-keep-pace').disabled,true);
ui.open('properties');document.getElementById('city-buy-comfort').click();assert.deepEqual(calls.pop(),['home-upgrade','comfort']);
document.getElementById('city-eat-meal').click();assert.deepEqual(calls.pop(),['home-meal',undefined]);
assert.equal(document.getElementById('city-refill-pantry').disabled,true);
state={...state,health:100,cash:10};ui.render();assert(document.getElementById('city-eat-meal').disabled);assert(document.getElementById('city-buy-comfort').disabled);
state={...state,trainingLocked:'Finish the activity first.'};ui.open('training');document.getElementById('city-training-player').click();assert(document.getElementById('city-learn-steady-stride').disabled);
state={...state,sandbox:true};ui.render();assert.equal(document.getElementById('city-training-player'),undefined);
ui.dispose();
console.log('Capital city UI: existing service mount, track keyboard navigation, skill prerequisites/actions, focus restoration, meal/upgrade actions, contextual disabled and free-roam states passed');
