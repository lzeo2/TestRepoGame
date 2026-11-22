import assert from 'node:assert/strict';
import {createDriveAudio} from '../Games/Capital Drive/drive-audio.js';
let creations=0,buffers=0,closes=0,starts=0,stops=0,disconnects=0;const nodes=[];
const param=()=>({value:0,last:null,setTargetAtTime(value,time,smooth){assert(Number.isFinite(value)&&Number.isFinite(time)&&smooth>0);this.last={value,time,smooth};}});
const node=kind=>{creations++;const n={kind,type:'',frequency:param(),Q:param(),gain:param(),connections:[],connect(to){this.connections.push(to);},disconnect(){disconnects++;},start(){starts++;},stop(){stops++;}};nodes.push(n);return n;};
const context={sampleRate:8000,currentTime:0,destination:{id:'existing-output'},createOscillator:()=>node('oscillator'),createGain:()=>node('gain'),createBiquadFilter:()=>node('filter'),createBufferSource:()=>node('noise'),
 createBuffer(channels,length,rate){buffers++;assert.equal(channels,1);assert.equal(rate,8000);const data=new Float32Array(length);return {getChannelData:()=>data};},close(){closes++;}};
const audio=createDriveAudio(context);assert.equal(creations,9);assert.equal(buffers,1);assert.equal(starts,3);
const oscillators=nodes.filter(n=>n.kind==='oscillator'),filters=nodes.filter(n=>n.kind==='filter'),gains=nodes.filter(n=>n.kind==='gain');
assert.equal(oscillators[0].type,'triangle');assert.equal(oscillators[1].type,'sawtooth');assert.equal(filters[0].type,'lowpass');assert.equal(filters[1].type,'bandpass');
const master=gains.find(n=>n.connections.includes(context.destination)),tyre=gains.at(-1),noise=nodes.find(n=>n.kind==='noise');
assert(noise.loop);assert.equal(master.gain.value,0);
audio.update({active:true,speed:0,throttle:0,gear:1,slip:0});const idlePitch=oscillators[0].frequency.last.value,idleGain=master.gain.last.value;
audio.update({active:true,speed:20,throttle:1,gear:1,slip:0});const loadedPitch=oscillators[0].frequency.last.value;
assert(loadedPitch>idlePitch);assert(master.gain.last.value>idleGain);assert(filters[0].frequency.last.value>500);
audio.update({active:true,speed:20,throttle:1,gear:2,slip:0},0);const shiftGain=master.gain.last.value,shiftPitch=oscillators[0].frequency.last.value;
for(let i=0;i<20;i++){context.currentTime+=1/60;audio.update({active:true,speed:20,throttle:1,gear:2,slip:.8});}
assert(master.gain.last.value>shiftGain,'shift dip recovers gently');assert(oscillators[0].frequency.last.value>shiftPitch);assert(tyre.gain.last.value>0&&tyre.gain.last.value<=.2);
const normalPitch=oscillators[0].frequency.last.value;audio.update({active:true,speed:20,throttle:1,gear:2,slip:1,boost:true});assert(oscillators[0].frequency.last.value>normalPitch);
audio.update({active:false,speed:40,throttle:1,slip:1});assert.equal(master.gain.last.value,0);assert.equal(tyre.gain.last.value,0);assert(master.gain.last.smooth>=.1,'stop uses a soft envelope');
for(let i=0;i<500;i++)audio.update({active:true,speed:NaN,throttle:Infinity,gear:99,slip:-100,boost:false},NaN);
assert.equal(creations,9);assert.equal(buffers,1,'updates never create nodes or audio buffers');
audio.dispose();audio.dispose();audio.update({active:true});assert.equal(stops,3);assert.equal(disconnects,9);assert.equal(closes,0,'shared context remains owned by the controller');
console.log('PASS drive audio: nine persistent nodes, layered filtered harmonics, speed/load/gear/boost pitch, recovering shift dip, bounded slip noise, smooth mute, finite inputs, no update allocations of nodes/buffers and idempotent shared-context-safe disposal.');
