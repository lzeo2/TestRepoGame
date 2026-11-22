import assert from 'node:assert/strict';
import {createGraphicsDiagnostics} from '../Games/Capital Drive/graphics-diagnostics.js';
const presets=[{id:'quality',fps:60},{id:'balanced',fps:45},{id:'fast',fps:30}];
for (const bad of [null,[],[{}],[{id:'x',fps:Infinity}],[{id:'x',fps:0}],[{id:'x',fps:-1}],[{id:'x',fps:30},{id:'x',fps:60}]]) assert.throws(()=>createGraphicsDiagnostics(bad),TypeError);
function run(sampler,rates,{stalls=false}={}) {
  let now=0,result=null,phase=0;
  assert(sampler.start(now));
  while(sampler.active) {
    const start=now;
    const rate=rates[phase++];
    // 60Hz RAF pacing: 45FPS uses a repeating render/skip pattern.
    let credit=0;
    for(let frame=1;frame<=108;frame++) {
      now=start+frame*1000/60;
      credit+=rate/60;
      if(credit>=1-1e-9) {
        credit-=1;
        if(!stalls || frame<55 || frame>75) sampler.record(now);
      }
      result=sampler.advance(now)||result;
    }
  }
  return result;
}
const sampler=createGraphicsDiagnostics(presets);
assert.equal(sampler.active,false);assert.equal(sampler.current,null);
const all=run(sampler,[60,45,30]);
assert.equal(all.recommendation,'quality');assert.equal(all.fallback,false);
assert(all.results.every(result=>result.stable));
assert(all.results[1].p90Ms>33&&all.results[1].p90Ms<34,'45FPS quantization on 60Hz RAF is stable');
const slow=run(sampler,[20,30,30]);
assert.deepEqual(slow.results.map(result=>result.stable),[false,false,true]);
assert.equal(slow.recommendation,'fast');
const none=run(sampler,[15,20,25]);
assert.equal(none.fallback,true);assert.equal(none.recommendation,'fast','fallback uses actual fastest profile');
assert(run(sampler,[60,45,30],{stalls:true}).results.every(result=>!result.stable),'long stalls cannot pass via a good p90');
assert(sampler.start(0));
for(const bad of [undefined,NaN,Infinity,Number.MAX_VALUE,-1,'20']) {sampler.record(bad);assert.equal(sampler.advance(bad),null);}
assert.equal(sampler.start(NaN),false);assert.equal(sampler.current,'quality');
sampler.record(450);sampler.record(450);sampler.record(449);sampler.record(100);
assert.equal(sampler.advance(400),null,'backward advance ignored');
sampler.cancel();assert.equal(sampler.active,false);assert.equal(sampler.current,null);
assert.equal(sampler.advance(100000),null);sampler.record(100000);
assert(run(sampler,[60,45,30]).results.every(result=>result.stable),'cancel/restart clears all old samples');
const sparse=createGraphicsDiagnostics([{id:'single',fps:60}]);sparse.start(0);
sparse.record(400);sparse.record(401);sparse.record(402);
const sparseResult=sparse.advance(1e9);
assert.equal(sparseResult.results[0].stable,false,'sparse burst is not reliable');
assert.equal(sparseResult.fallback,true);assert.equal(sparse.current,null,'wall-time phase cap ends even after a huge RAF stall');
assert.equal(sparse.advance(1e9+1),null,'completed result emitted once');
const empty=createGraphicsDiagnostics([{id:'empty',fps:30}]);empty.start(0);
const emptyResult=empty.advance(1800);
assert.deepEqual(emptyResult.results,[{id:'empty',targetFps:30,fps:0,stable:false,p90Ms:0}]);
const warmup=createGraphicsDiagnostics([{id:'warmup',fps:30}]);warmup.start(10000);
for(let time=10000;time<10400;time+=5)warmup.record(time);
assert.equal(warmup.advance(11800).results[0].fps,0,'warmup renders do not count as measured frames');
const phases=createGraphicsDiagnostics(presets);phases.start(10000);
assert.equal(phases.advance(11800),null);assert.equal(phases.current,'balanced');
assert.equal(phases.advance(11800),null,'next phase gets its own full wall-time budget');
assert.equal(phases.advance(13600),null);assert.equal(phases.current,'fast');
assert.equal(phases.advance(15400).results.length,3,'three empty phases finish at their finite cap');
const trailing=createGraphicsDiagnostics([{id:'trailing',fps:60}]);trailing.start(0);
for(let time=400;time<1800;time+=1000/60)trailing.record(time);
const stalledEnd=trailing.advance(3000).results[0];
assert.equal(stalledEnd.stable,false,'a stall across the phase deadline still counts');
assert(stalledEnd.fps<40,'actual late RAF time is included in measured FPS');
const excess=createGraphicsDiagnostics([{id:'excess',fps:60}]);excess.start(0);
for(let i=0;i<5000;i++)excess.record(400+i*.25);
assert.equal(excess.advance(1800).results[0].stable,false,'bounded sample storage rejects excessive timestamp streams');
for(const result of [all,slow,none,sparseResult,emptyResult])for(const row of result.results)assert(Object.values(row).every(value=>typeof value!=='number'||Number.isFinite(value)));
const mutable=[{id:'original',fps:30}];const isolated=createGraphicsDiagnostics(mutable);mutable[0].id='changed';mutable[0].fps=Infinity;
isolated.start(0);assert.equal(isolated.current,'original','preset input copied');
console.log('PASS graphics diagnostics: render-only timing, 60Hz/45FPS cadence, quality selection, slow/fallback/stall/sparse guards, finite output, invalid and backward timestamps, cancel/restart and bounded samples.');
