import assert from 'node:assert/strict';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createPolice} from '../Games/Capital Drive/police.js';
const map={bounds:{minX:-600,maxX:600,minZ:-600,maxZ:600},spawn:{x:0,z:-2,yaw:-Math.PI/2},buildings:[],areas:[],roads:[
 {id:'public',name:'Public road',type:'residential',width:24,oneway:0,points:Array.from({length:21},(_,i)=>[-500+i*50,0])}]};
const sim=createSimulation(map,{trafficCount:0}),target={x:0,z:-2,yaw:-Math.PI/2,speed:0};
const police=createPolice(sim),state={wanted:5,sandbox:false,health:100,mode:'vehicle',heat:100,police:[]};
const tick=seconds=>{for(let i=0;i<Math.round(seconds*60);i++)police.step(1/60,state,target);};
police.report(target);tick(.1);assert.equal(state.police.length,6);assert(state.police.every(u=>u.role==='swat'&&u.health===150));
const original=[...state.police],ids=new Set(original.map(u=>u.id));for(const unit of original)unit.health=0;
tick(5);assert.equal(state.police.length,6);assert(state.police.every(u=>ids.has(u.id)),'visible corpse grace does not immediately replace bodies');
const paused=state.police.slice();for(let i=0;i<500;i++)police.step(0,state,target);assert.deepEqual(state.police,paused,'paused updates cannot expire corpse grace');
tick(3);assert.equal(state.police.length,6);assert(state.police.every(u=>!ids.has(u.id)&&u.health>0&&u.role==='swat'&&u.armour),'persistent wanted dispatches fresh tactical units after corpse grace');
const replacements=state.police.map(u=>u.id);tick(4);assert.deepEqual(state.police.map(u=>u.id),replacements,'no repeated spawn or duplicate live unit slots');assert.equal(new Set(replacements).size,6);
// A destroyed car persists independently and continues to consume its old slot.
const doomed=state.police[0],wreckId=doomed.car.id;assert(police.damageVehicle(state,wreckId,100));doomed.health=0;
tick(8);assert(police.wrecks.some(car=>car.id===wreckId&&car.health===0));assert.equal(state.police.length,5,'retiring an officer never grants extra capacity around retained wrecks');assert(state.police.every(u=>u.id!==doomed.id));
tick(5);assert.equal(state.police.length+police.wrecks.filter(car=>!state.police.some(unit=>unit.car===car)).length,6,'combined live/wreck budget remains bounded');
const lossPolice=createPolice(sim,{getResponseLoss:()=>2}),lossState={wanted:5,health:100,mode:'vehicle',heat:100,police:[]};lossPolice.report(target);
for(let i=0;i<120;i++)lossPolice.step(1/60,lossState,target);assert.equal(lossState.police.length,0,'station-loss initial response delay remains');
for(let i=0;i<120;i++)lossPolice.step(1/60,lossState,target);assert.equal(lossState.police.length,4);
for(const unit of lossState.police)unit.health=0;
for(let i=0;i<660;i++)lossPolice.step(1/60,lossState,target);assert.equal(lossState.police.length,4);assert(lossState.police.every(u=>u.health>0&&u.role==='swat'),'replacements preserve reduced station capacity and five-star threshold');
police.reset({clearWrecks:true});assert.equal(police.wrecks.length,0);
console.log('PASS police replacement dispatch: six-second visible corpse grace, paused timing, fresh five-star tactical units, no duplicate/live cap growth, retained wreck capacity and station-loss delay/budget.');
