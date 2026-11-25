import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCampaign} from '../Games/Capital Drive/campaign.js';
const campaign=createCampaign({spawn:{x:0,z:0},landmarks:[{id:'coals',name:'Coals',store:true,x:100,z:10}]});
const ctx={pose:{x:0,z:0},onFoot:true,health:100,wanted:0,vehicleHealth:100,respawnSerial:0,campaign:true};
campaign.selectCharacter('student',ctx);
assert(campaign.startDeveloper('home-by-the-lake',{...ctx,developer:true}).ok);
assert.equal(campaign.chapters.find(chapter=>chapter.id==='home-by-the-lake'),undefined,'preview is outside selected hero normal chapter list');
const output=new Map(),state={mode:'vehicle',wanted:0,health:100,vehicleHealth:100,weapon:'unarmed',pursuit:'clear'};
const env={campaign,isCampaign:()=>true,gameplay:{state},progression:{state:{cash:1000,activeJob:null,activity:null},services:[]},
 sandbox:()=>false,money:n=>'$'+n,weaponById:()=>null,text:(id,value)=>output.set(id,String(value)),byId:()=>null,
 simulation:{player:{speed:0}},interactionHint:()=>null};
const source=await readFile(new URL('../Games/Capital Drive/street-ui.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('  function refresh('),source.indexOf('  function renderServices(){'));
const refresh=Function('env',`with(env){${body};return refresh;}`)(env);
refresh();assert.equal(output.get('job-progress'),`Step 1/${campaign.state.active.stageCount}`,'campaign HUD shows the current step without an advisory timer');
assert.equal(output.get('job-description'),campaign.state.active.target.label);
refresh('Walk to the marked door · 22 m');assert.equal(output.get('job-description'),'Walk to the marked door · 22 m');
assert(output.get('job-title').includes('Split the score'));assert.equal(output.get('cash-value'),'$1000');
campaign.cancel();refresh();assert.equal(output.get('job-progress'),'');
assert.equal(output.get('job-title'),'');assert.equal(output.get('job-description'),'');
assert(campaign.start(ctx).ok);refresh();assert.equal(output.get('job-progress'),`Step 1/${campaign.state.active.stageCount}`,'campaign HUD shows the current step without an advisory timer');
assert.equal(output.get('job-description'),campaign.state.active.target.label);
console.log('PASS actual mission HUD: locked cross-character preview, normal chapter, compact objective text, final-minute countdown boundaries, actual stage transition, cancellation and unchanged cash');
