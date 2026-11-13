import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createOfficiatingView} from '../js/officiating-view.js';
import {StadiumAudio} from '../js/stadium-audio.js';
import {COURT} from '../js/court-config.js';
const view=createOfficiatingView();
const match={ball:{x:0,z:0},events:[],finished:false};
const original=JSON.stringify(match);view.update(.016,{match});assert.equal(JSON.stringify(match),original);
let meshes=0,triangles=0;
view.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
assert.equal(meshes,5);assert(triangles<2000);
view.root.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(view.root);assert(box.max.y>5.9&&box.max.y<6.1);assert(box.min.y>=-1e-6);
let previous=view.root.position.clone();
for(const x of [-47,47,-30,30,0])for(let i=0;i<160;i++) {
  match.ball={x,z:20*Math.sin(i)};view.update(1/60,{match,time:i/60});
  const p=view.root.position;
  assert(Math.abs(p.x)>=COURT.halfLength+2.9||Math.abs(p.z)>=COURT.halfWidth+2.9,'Always on apron, including corners');
  assert(p.distanceTo(previous)<=16/60+1e-6,'Movement has bounded speed');previous=p.clone();
  view.root.updateMatrixWorld(true);view.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
}
for(const [kind,signal] of [['foul','foul'],['basket','basket'],['violation','out'],['period','period']]) {
  match.events.push({kind,serial:match.events.length});view.update(.02,{match});assert.equal(view.diagnostics().signal,signal);
}
const snapshot=JSON.stringify(view.diagnostics());for(let i=0;i<100;i++)view.update(0,{match});assert.equal(JSON.stringify(view.diagnostics()),snapshot);
match.events=[];for(let i=0;i<100;i++)view.update(.02,{match});assert.equal(view.diagnostics().signal,'idle');
view.update(.01,{});assert.equal(view.root.visible,false);view.dispose();view.dispose();assert.equal(view.root.children.length,0);

class Param {constructor(){this.value=0;this.values=[];}setValueAtTime(v){this.values.push(v);}linearRampToValueAtTime(v){this.values.push(v);}exponentialRampToValueAtTime(v){this.values.push(v);}setTargetAtTime(v){this.values.push(v);}}
class Node {
  constructor(type){this.type=type;this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.connections=[];this.stops=[];}
  connect(n){this.connections.push(n);}disconnect(){this.connections=[];this.disconnected=true;}start(t=0){this.started=t;}stop(t=0){this.stops.push(t);}
}
class Context {
  constructor(){this.nodes=[];this.sampleRate=100;this.currentTime=1;this.destination={};this.resumes=0;}
  node(type){const n=new Node(type);this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('buffer');}createBiquadFilter(){return this.node('filter');}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  resume(){this.resumes++;return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}
}
let created=0;const context=new Context(),audio=new StadiumAudio({audioContextFactory:()=>{created++;return context;}});
audio.configure(false,true);audio.cue('foul');assert.equal(created,0,'No context before user start');
audio.start();assert.equal(created,1);assert.equal(audio.voices.size,0);
audio.configure(true,true);assert(audio.ambient);const count=context.nodes.length;audio.configure(true,true);assert.equal(context.nodes.length,count,'Ambient reused');
audio.cue('foul');
const whistle=context.nodes.filter(n=>n.type==='sine');assert.equal(whistle.length,4);
for(const tone of whistle)assert(Math.max(...tone.frequency.values)-Math.min(...tone.frequency.values)<=12,'Stable whistle pitch');
assert(context.nodes.some(n=>n.type==='bandpass'&&n.frequency.value===2650),'Breath band present');
audio.cue('period');const quarter=context.nodes.filter(n=>n.type==='sawtooth').at(-1);audio.cue('fullTime');const final=context.nodes.filter(n=>n.type==='sawtooth').at(-1);assert(final.stops[0]>quarter.stops[0]);
for(let i=0;i<100;i++)audio.cue('basket');assert(audio.voices.size<=12,'Bounded active voices');
audio.configure(false,true);assert.equal(audio.voices.size,0);assert.equal(audio.ambient,null);assert(context.nodes.slice(1).every(n=>n.disconnected));
const mutedCount=context.nodes.length;audio.cue('foul');assert.equal(context.nodes.length,mutedCount);
audio.configure(true,true);const ambient=audio.ambient;ambient.sources[0].onended();assert.equal(audio.ambient,null,'Ended sources release nodes');
audio.dispose();audio.dispose();assert(context.closed);assert.equal(audio.context,null);audio.start();assert.equal(created,1);
console.log('PASS officiating: apron bounds, smooth motion, signals, finite transforms, bounded geometry and audio lifecycle');
