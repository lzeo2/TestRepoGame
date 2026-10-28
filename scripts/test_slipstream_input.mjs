// Exercise the actual controller input function; synthetic DOM/input, no native claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source=readFileSync(new URL('../Games/Slipstream Borough/script.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function input('),source.indexOf('function deploy('));
const keys=new Set(),held=new Set(),cruise={checked:false};
const ctx={keys,held,run:null,sandboxSettings:{bricklet:{handling:1.25,response:2}},steering:0,queuedDeploy:false,$:id=>{assert.equal(id,'cruise');return cruise;}};
runInNewContext(fn,ctx);
keys.add('d');assert(Math.abs(ctx.input(1/60).steer-1/12)<1e-9);
for(let i=0;i<12;i++)ctx.input(1/60);assert.equal(ctx.steering,1);
keys.delete('d');keys.add('a');assert(ctx.input(1/60).steer<0,'opposite press never steers in the old direction');
keys.delete('a');assert.equal(ctx.input().steer,0,'released steering has no extra sideways drift');
held.add('left');for(let i=0;i<12;i++)ctx.input(1/60);assert.equal(ctx.steering,-1);
held.add('right');assert.equal(ctx.input(1/60).steer,0,'opposite controls cancel');
held.clear();keys.add('w');assert.equal(ctx.input().throttle,1);
keys.add('s');assert.equal(ctx.input().throttle,0);assert.equal(ctx.input().brake,1);
keys.clear();cruise.checked=true;assert.equal(ctx.input().throttle,1);
ctx.queuedDeploy=true;assert.equal(ctx.input().deploy,true);
ctx.run={mode:'sandbox',carId:'bricklet'};keys.add('d');
assert(Math.abs(ctx.input(1/60).steer-2/60)<1e-9);assert.equal(ctx.input().handling,1.25);
ctx.run={mode:'roam',speed:0};ctx.steering=0;
const slow=ctx.input(1/60).steer;assert(Math.abs(slow-11/60)<1e-9);
ctx.run.speed=25;ctx.steering=0;
const fast=ctx.input(1/60).steer;assert(Math.abs(fast-7/60)<1e-9);assert(fast<slow,'gentler press at speed');
assert(!Object.hasOwn(ctx.input(),'handling'),'sandbox tuning never reaches banked physics');
ctx.run.speed=-6;ctx.steering=0;assert(Number.isFinite(ctx.input(1/60).steer));
for(const speed of [0,10,25,60,-6]) {
  const results=[];
  for(const hz of [30,60,120]) {
    keys.clear();held.clear();keys.add('d');ctx.run={mode:'roam',speed};ctx.steering=0;
    for(let i=0;i<hz/10;i++)ctx.input(1/hz);
    results.push(ctx.steering);
    assert(Math.abs(ctx.steering-Math.min(1,.1*(11-4*Math.min(1,Math.abs(speed)/25))))<1e-9);
    for(let i=0;i<hz/5;i++)ctx.input(1/hz);
    assert.equal(ctx.steering,1,'full steering stays available at every speed');
    keys.clear();held.add('left');assert(ctx.input(1/hz).steer<0,'held-touch reversal immediately changes direction');
    held.clear();assert.equal(ctx.input().steer,0,'touch release clears steering without another physics step');
    held.add('gas');held.add('brake');assert.equal(ctx.input().throttle,0);assert.equal(ctx.input().brake,1);
  }
  assert(Math.max(...results)-Math.min(...results)<1e-9,'same ramp at 30/60/120 Hz');
}
// Exercise the same reset called by pause, blur, Help, retry and storage locks.
Object.assign(ctx,{accumulator:.2,last:123,previousRun:null,renderAlpha:.5});
runInNewContext(source.slice(source.indexOf('function clearInput('),source.indexOf('function sandboxUI(')),ctx);
keys.add('w');held.add('left');ctx.steering=-1;ctx.queuedDeploy=true;ctx.clearInput();
assert.equal(keys.size,0);assert.equal(held.size,0);assert.equal(ctx.steering,0);assert.equal(ctx.queuedDeploy,false);
assert.equal(ctx.accumulator,0);assert.equal(ctx.last,0);assert.equal(ctx.previousRun,ctx.run);assert.equal(ctx.renderAlpha,1);
const hud=source.slice(source.indexOf('function updateHud('),source.indexOf('function pause('));
for(const text of ['240 - run.elapsed','run.nearMisses','3 - run.arrest','cop.world.x - run.world.x'])assert(hud.includes(text));
console.log('PASS actual controller: speed-sensitive press, immediate direction change/release, 30/60/120Hz ramp at five signed speeds, held touch, opposing controls, brake priority, Auto gas, sandbox isolation and input reset safety. HUD countdown/pass/pursuit bindings. Synthetic input only.');
