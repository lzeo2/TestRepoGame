import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTutorial} from '../Games/Capital Drive/tutorial.js';

// Execute the real controller adapters, keeping the career record independent.
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',value:0,open:false,showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
const writes=[],store=new Map([['career','unchanged-career']]);
const env={aircraft:null,jetpack:null,refreshAircraftRescue(){},tutorial:createTutorial(),tutorialRunning:false,tutorialVisible:false,tutorialStamp:'',started:true,
  tutorialSerials:{orbitSerial:0,phoneSerial:0,mapRouteSerial:0,shopsSerial:0,jobsSerial:0},TUTORIAL_KEY:'tutorial',
  localStorage:{getItem:key=>store.get(key)??null,setItem(key,value){writes.push(key);store.set(key,value);}},
  $:node,document:{body:{classList:{toggle(){}}}},simulation:{},
  gameplay:{state:{mode:'foot',actor:{impactTime:0},health:100},focus:()=>({x:0,z:0,speed:0})},
  cutscenes:{snapshot:()=>({active:false})},interiors:{active:null},activities:{snapshot:()=>({active:false})},
  micromobility:{snapshot:()=>({active:null})},
  skylineLease:null,streetChallenge:()=>null,paused:()=>[...nodes.values()].some(n=>n.open),clearInput(){},resetDevEntry(){},
  refreshModeUI(){},fitMapCanvas(){},drawMap(){},dialogs:[],renderer:null};
const helpers=source.slice(source.indexOf('function readTutorialPreference(){'),source.indexOf("$('help-button').addEventListener"));
const open=source.slice(source.indexOf('function openDialog(id) {'),source.indexOf('function closeDialogs()'));
const controller=Function('env',`with(env){${helpers}${open};return {startTutorial,syncTutorial,observeTutorialMenu,openDialog,tutorialContext,readTutorialPreference};}`)(env);
controller.startTutorial();assert.equal(env.tutorial.snapshot().step,'look');assert(env.tutorialRunning);
assert.deepEqual([...new Set(writes)],['tutorial']);assert.equal(store.get('career'),'unchanged-career');
env.tutorialSerials.orbitSerial++;env.tutorial.observe(controller.tutorialContext(),.1);
for(let i=0;i<10;i++)env.tutorial.observe({...controller.tutorialContext(),pose:{x:(i+1)*.25,z:0}},.1);
assert.equal(env.tutorial.snapshot().step,'phone');controller.syncTutorial();
env.started=false;controller.openDialog('phone-dialog');assert.equal(env.tutorialSerials.phoneSerial,0,'rejected menu opening cannot grant credit');
env.started=true;controller.openDialog('phone-dialog');assert(node('phone-dialog').open);
assert.equal(env.tutorial.snapshot().step,'enter-car','actual successful paused menu opening credits its lesson');
controller.observeTutorialMenu('phone');assert.equal(env.tutorial.snapshot().step,'enter-car','repeat action cannot credit a different lesson');
node('phone-dialog').close();env.tutorial.observe(controller.tutorialContext(),.1);
env.gameplay.state.mode='vehicle';env.tutorial.observe(controller.tutorialContext(),.1);
assert.equal(env.tutorial.snapshot().step,'drive');
const body=JSON.stringify(env.gameplay.state);controller.syncTutorial();assert.equal(JSON.stringify(env.gameplay.state),body);
assert.equal(store.get('career'),'unchanged-career');assert(writes.every(key=>key==='tutorial'));

// Both map actions only record a lesson for an actually connected route.
const routes=[];Object.assign(env,{mapSelection:{x:10,z:0},route:[],mapCanvas:{},
  routeTo(){},airNavigationActive:()=>false,notify(){},closeDialogs(){routes.push('close');},updateNavigation(){routes.push('guidance');},
  observeTutorialMenu:menu=>routes.push(menu)});
const route=source.slice(source.indexOf('function routeSelected() {'),source.indexOf("$('map-route-button').addEventListener"));
const selectRoute=Function('env',`with(env){${route};return routeSelected;}`)(env);
selectRoute();assert.deepEqual(routes,[],'no connected route keeps selection open without tutorial credit');
env.route=[[0,0],[10,0]];selectRoute();assert.deepEqual(routes,['map-route','close','guidance']);

const protection=source.slice(source.indexOf('function protectedWork(){'),source.indexOf('function canPlayerAttack()'));
Object.assign(env,{gameMode:'street',progression:{state:{}},campaign:{state:{active:null}}});
const protectedWork=Function('env',`with(env){${protection};return protectedWork;}`)(env);
assert(protectedWork(),'guided controls use the real protected-attack gate');env.tutorialRunning=false;assert.equal(protectedWork(),false);
env.progression.state.activeJob={type:'delivery'};assert(protectedWork(),'ordinary job protection remains');
env.localStorage.getItem=()=>{throw Error('denied');};assert.equal(controller.readTutorialPreference(),false);
env.localStorage.setItem=()=>{throw Error('denied');};controller.startTutorial();
assert.match(node('tutorial-save-status').textContent,/could not be saved/);assert(env.tutorial.snapshot().active,'denied tutorial storage does not stop play');
console.log('PASS actual tutorial controller: separate preference, successful menu-only credit, route admission, no career/body writes, protected attacks and denied storage');
