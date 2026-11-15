import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../Games/Capital Drive/render-gate.js',import.meta.url),'utf8');
const {createRenderGate,renderProfile,chooseRenderQuality}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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
assert(controller.indexOf('renderGate.shouldRender(')>controller.indexOf('if (time - lastRender <'),'only rendered frames consume a revision');
assert(controller.includes('pendingChunks:(world.stats.queuedChunks||0)+(neighbourhood.stats.queue||0)'));
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
