import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../Games/Capital Drive/render-gate.js',import.meta.url),'utf8');
const {createRenderGate,createFramePacer,renderProfile,chooseRenderQuality}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const gate=createRenderGate(),menu={paused:true,hidden:false,cinematic:false,tracking:false,revision:0};
assert.equal(gate.shouldRender(menu),true);
for(let i=0;i<600;i++)assert.equal(gate.shouldRender(menu),false,'stable paused view does not redraw');
assert.equal(gate.shouldRender({...menu,revision:1}),true,'resize or model change gets a new frame');
assert.equal(gate.shouldRender({...menu,revision:1}),false);
for(let i=0;i<3;i++)assert.equal(gate.shouldRender({...menu,revision:1,pendingChunks:3-i}),true,'nearby geometry can finish loading');
assert.equal(gate.shouldRender({...menu,revision:1}),false);
for(const active of [{paused:false},{cinematic:true},{tracking:true}]){
 for(let i=0;i<3;i++)assert.equal(gate.shouldRender({...menu,...active}),true);
 assert.equal(gate.shouldRender(menu),true,'returning to a static menu refreshes once');
 assert.equal(gate.shouldRender(menu),false);
}
assert.equal(gate.shouldRender({...menu,hidden:true,cinematic:true,tracking:true}),false,'hidden pages render nothing');
assert.equal(gate.shouldRender(menu),true,'returning to the page refreshes');
const controller=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
assert(controller.indexOf('renderGate.shouldRender(')>controller.indexOf('if (!framePacer.ready'),'only rendered frames consume a revision');
assert(controller.includes('pendingChunks:pendingWorldChunks()'));
const room={active:null},pending=Function('world','neighbourhood','airportView','interiors',controller.slice(controller.indexOf('function pendingWorldChunks(){'),controller.indexOf('function animate(time) {'))+';return pendingWorldChunks;')({stats:{queuedChunks:2}},{stats:{queue:3}},{stats:{pendingChunks:4}},room);
assert.equal(pending(),9,'every exterior geometry queue participates');
room.active={id:'room'};assert.equal(pending(),0,'suspended exterior queues cannot force paused indoor rendering');
console.log('PASS render gate: paused/hidden static frames, dirty revision, chunk queues, active play, cutscenes and live tracking');

assert.deepEqual(renderProfile('performance'),{width:640,height:360,fps:20});
assert.deepEqual(renderProfile('low'),{width:960,height:540,fps:30});
assert.deepEqual(renderProfile('standard'),{width:1440,height:900,fps:60});
assert.equal(chooseRenderQuality(null,'ANGLE SwiftShader Vulkan'),'performance');
assert.equal(chooseRenderQuality(null,'Intel UHD Graphics'),'low');
assert.equal(chooseRenderQuality('standard','SwiftShader'),'standard');
assert.equal(chooseRenderQuality('performance','Intel UHD Graphics'),'performance');
assert.equal(chooseRenderQuality('broken','Intel UHD Graphics'),'low');
console.log('PASS render profiles: saved choice, software default and bounded resolution/frame targets');

for(const fps of [20,30,60]){
 const pacer=createFramePacer();let renders=0;
 for(let frame=0;frame<3600;frame++){const time=frame*1000/60+Math.sin(frame*.7)*.35;if(pacer.ready(time,fps))renders++;}
 assert(Math.abs(renders-fps*60)<=1,`jittered RAF retains ${fps}Hz cadence`);
}
const paced=createFramePacer();assert(paced.ready(0,20));assert(!paced.ready(0,20));assert(paced.ready(1000,20));assert(!paced.ready(1001,20),'long stalls do not create catch-up bursts');assert(paced.ready(1001,30),'quality changes refresh immediately');assert(!paced.ready(NaN,30));paced.reset();assert(paced.ready(2,20));
console.log('PASS frame pacing: bounded target cadence through RAF jitter, no stall bursts, quality transitions and invalid timestamps');
