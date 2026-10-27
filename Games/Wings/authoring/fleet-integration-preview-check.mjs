// Browser-free startup regression using the ACTUAL preview profile/roster source, not copied fixtures.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { createFactionsComposition } from './fleet-composition.mjs';
import { createWeatherView } from './weather/weather-view.mjs';
import { createSeaView } from './fleet-sea-view.mjs';
import { modelGeometryFixture } from './model-geometry-fixture.mjs';
import { MAP_IDS } from './map-pack/maps.mjs';
assert(process.env.THREE_ROOT, 'Set THREE_ROOT to existing Three 0.186.0; install nothing');
const T = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.module.js')).href);
const TSL = await import(pathToFileURL(resolve(process.env.THREE_ROOT, 'build/three.tsl.js')).href);
const read = name => readFile(new URL(name, import.meta.url));
const source = (await read('fleet-integration-preview.mjs')).toString();
const roster = source.match(/const AIRCRAFT_FIXTURE = (.*?);/);
const builders = source.match(/(const gun = \(\).*?)(?=async function rebuild\()/s);
assert(roster && builders, 'Test must execute actual preview fixture declarations');
assert(source.includes('aircraft: AIRCRAFT_FIXTURE,'), 'Actual composition must consume the tested roster');
const aircraft = vm.runInNewContext('(' + roster[1] + ')');
const descriptors = [...JSON.parse(await read('model-repairs.json')).models, JSON.parse(await read('submarine-model.json'))];
const models = [];
for (const [i, descriptor] of descriptors.entries()) {
  const bytes = await read('../' + descriptor.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
  models.push({ id: ['type45', 'type054', 'originalSub'][i], descriptor, object: modelGeometryFixture(T, bytes).object });
}
let groups = 0;
for (const mapId of MAP_IDS) for (const scenario of ['surface', 'submarine']) for (const initialPreset of ['clear', 'fog']) {
  const profiles = vm.runInNewContext(builders[1] + '\nprofiles()', { $: () => ({ value: scenario }) });
  const identity = {}, actor = {}, scene = new T.Scene(), sun = new T.DirectionalLight(), ambient = new T.HemisphereLight();
  scene.add(sun, ambient); let consumer;
  const make = roster => createFactionsComposition({ mode: 'factions', mapId, seed: 71, profiles, models,
    aircraft: roster, matchMs: 120000, intermissionMs: 3000,
    weather: { seed: 31, initialPreset, holdMs: 90000, transitionMs: 30000 },
    THREE: T, host: { identity, authenticate: connection => connection === actor ? { id: 'previewObserver', team: 0 } : null,
      deriveAircraftAttack() { throw Error('No flight in preview'); } },
    createPresentation() {
      consumer = createWeatherView(T, TSL, { scene, sun, ambient,
        sampleDaylight: () => ({ sunIntensity: 3, ambientIntensity: 2, fogColor: [.6, .65, .7] }) });
      return { parent: scene, applyEnvironment: consumer.applyEnvironment, dispose: consumer.dispose,
        presentation: { quality: 'low', reducedMotion: true, lightning: 'off' } };
    } });
  const app = make(aircraft); let marine;
  try {
    const lease = app.start(identity); app.join(actor); app.setPaused(identity, true);
    marine = createSeaView(T, { parent: scene, models, quality: 'low' });
    marine.update({ ...app.snapshot(actor), paused: true });
    assert.equal(app.world(identity).id, mapId); assert(app.stats().paused);
    assert.equal(app.snapshot(actor).tick, 0); assert.equal(app.snapshot(actor).aircraft.length, 0);
    app.setPaused(identity, false); app.update(lease, { sequence: 1, elapsedMs: 50 });
    marine.update({ ...app.snapshot(actor), paused: false });
    assert.equal(marine.stats().tick, 1);
    assert.equal(app.snapshot(actor).tick, 1); assert.equal(consumer.stats().simulationMs, 50);
    assert.equal(app.stats().viewFailures, 0);
    if (scenario === 'submarine') {
      assert(app.snapshot(actor).units.some(unit => unit.id === 'sub0'));
      assert(!app.snapshot(actor).units.some(unit => unit.id === 'sub1'));
    }
  } finally { marine?.dispose(); app.dispose(identity); }
  assert(consumer.stats().disposed); assert.equal(app.stats().clients, 0);
  if (groups++ === 0) {
    const invalid = make([[], []]);
    try { assert.throws(() => invalid.start(identity), /Invalid aircraft roster/); }
    finally { invalid.dispose(identity); }
  }
}
console.log(`PASS ${groups} actual-source preview startup groups: all maps/scenarios/clear-fog, decoded geometry, real consumer, no spawned aircraft, private sub, cleanup; original empty-roster negative fails`);
const loop = source.match(/(function draw\(now.*?)(?=function frameCamera\()/s);
assert(loop, 'Actual preview draw/invalidation functions required');
vm.runInNewContext(`
  const SIMULATION_RATE=4;
  let animation=1,wakeTimer=2,running=true,disposed=false,busy=false,lastTime=0,sequence=0;
  let drawCalls=0,triangles=0,renders=0,next=10;const pending=new Map(),updates=[],lease={};
  const clearTimeout=id=>pending.delete(id),cancelAnimationFrame=id=>pending.delete(id);
  const setTimeout=(callback,delay)=>{assert.equal(delay,125);pending.set(++next,callback);return next;};
  const requestAnimationFrame=callback=>{pending.set(++next,callback);return next;};
  const camera={updateMatrixWorld(){}};
  const renderer={domElement:{width:1,height:1,clientWidth:1,clientHeight:1},
    render(){renders++;},info:{render:{drawCalls:1,triangles:1}},backend:{gl:{NO_ERROR:0,getError:()=>0}}};
  const app={update(_lease,input){assert.equal(_lease,lease);updates.push(input);},stats:()=>({viewFailures:0})};
  const status=()=>{},updateSea=()=>{},$=()=>({value:'overview'}),fail=error=>{throw error;},scene={};
  ${loop[1]}
  draw(250);assert.equal(updates.length,4);
  for(let i=0;i<4;i++)assert.deepEqual(updates[i],{sequence:i+1,elapsedMs:250});
  assert.equal(pending.size,1);assert(wakeTimer);assert.equal(animation,0);
  const timer=pending.get(wakeTimer);pending.delete(wakeTimer);timer();assert(animation);assert.equal(wakeTimer,0);
  draw(500);assert.equal(updates.length,8);assert.equal(pending.size,1);
  running=false;invalidate();assert.equal(wakeTimer,0);draw(750);
  assert.equal(pending.size,0);assert.equal(updates.length,8);assert.equal(renders,3);
  disposed=true;draw(1000);assert.equal(renders,3);assert.equal(pending.size,0);
`, { assert });
console.log('PASS actual preview loop: 125ms input-yield timer, sole sequential 4x diagnostic clock, pause cancels scheduling, no disposed draw');
