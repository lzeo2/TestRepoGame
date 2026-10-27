// Original CPU tests: real Three/TSL graph generation, NOT GPU compilation/numeric parity or served play.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createWeather, visualTransmittance } from './weather.mjs';
import { createFleet } from '../fleet-sim.mjs';
assert(process.env.THREE_ROOT,'Set existing THREE_ROOT; install nothing');
const root=resolve(process.env.THREE_ROOT),load=path=>import(pathToFileURL(resolve(root,path)).href);
assert.equal(JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version,'0.186.0');
// Source exports and builders share the real library's node identities; no browser/renderer instance.
const THREE=await load('src/Three.WebGPU.js'),TSL=THREE.TSL;
const {default:GLSLNodeBuilder}=await load('src/renderers/webgl-fallback/nodes/GLSLNodeBuilder.js');
const {default:WGSLNodeBuilder}=await load('src/renderers/webgpu/nodes/WGSLNodeBuilder.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const close=(a,b,e=1e-10)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
let groups=0;const failures=[];
async function check(name,test){
  try{await test();groups++;console.log('PASS '+name);}
  catch(error){failures.push({name,error});console.error('FAIL '+name+': '+error.message);}
}
function quadrature(density,from,to) {
  const count=16384,length=Math.hypot(...to.map((n,i)=>n-from[i]));let sum=0;
  for(let i=0;i<count;i++) {
    const y=from[1]+(to[1]-from[1])*(i+.5)/count;
    sum+=density.fogBase+density.fogSea*Math.exp(-Math.max(0,y)*density.fogFalloff);
  }
  return Math.exp(-length*sum/count);
}
await check('independent bounded optical quadrature: horizontal/height/reversal/sea crossing/extremes',()=>{
  const paths=[[[0,0,0],[800,0,0]],[[0,-30,0],[200,80,0]],[[0,80,0],[200,-30,0]],
    [[0,1,0],[1000,1500,0]],[[0,-100,0],[0,-5,200]],[[0,80,0],[900,80+1e-9,0]],
    [[0,1000000,0],[1000000,1000000,0]],[[0,0,0],[0,0,0]]];
  const densities=[{fogBase:0,fogSea:0,fogFalloff:1/300},{fogBase:.00073,fogSea:.0021,fogFalloff:1/300},
    {fogBase:.01,fogSea:.01,fogFalloff:1/20},{fogBase:0,fogSea:.01,fogFalloff:1/2000}];
  for(const d of densities)for(const [a,b] of paths){const t=visualTransmittance(d,a,b);close(t,quadrature(d,a,b),2e-7);close(t,visualTransmittance(d,b,a));assert(t>=0&&t<=1);}
});

const {createWeatherView}=await import('./weather-view.mjs');
function frame(id='fog',simulationMs=1000,presentation={}) {
  const sample=createWeather({seed:19,allowedPresets:[id],initialPreset:id}).sample(simulationMs,presentation);
  return {simulationMs,weather:sample,visibility:{fogBase:sample.visibility.fogBase+.00037,
    fogSea:sample.visibility.fogSea+.00023,fogFalloff:sample.visibility.fogFalloff},minimumTransmittance:.1};
}
function fcFrame() {
  const u=(id,team,x)=>({id,team,kind:'surface',capital:true,position:[x,0,0],half:[5,2,5],hp:100,speed:0,route:[],weapons:[],sensor:null,depth:'surfaced',depthPlan:[]});
  const f=createFleet({mode:'factions',arena:{minX:-1000,maxX:1000,minZ:-1000,maxZ:1000,bottomY:-100,cell:20,obstacles:[]},
    units:[u('a',0,-200),u('b',1,200)],aircraft:[[{id:'planeA',weapons:[]}],[{id:'planeB',weapons:[]}]],matchMs:100000,intermissionMs:1000,
    weather:{config:createWeather({seed:1,allowedPresets:['fog']}).config,baseVisibility:{fogBase:.00037,fogSea:.00023,fogFalloff:1/300},minimumTransmittance:.1}});
  f.advance(1250);return f.snapshot(0).environment;
}
function daylight(ms){return {sunIntensity:ms===0?0:8,ambientIntensity:1.2,fogColor:ms===0?[.01,.02,.03]:[.12,.23,.34]};}
function fixture(sampleDaylight=daylight) {
  const scene=new THREE.Scene(),sun=new THREE.DirectionalLight(0xffffff,7),ambient=new THREE.HemisphereLight(0xaabbcc,0x556677,3);
  scene.add(sun,ambient);scene.fog=new THREE.Fog(0x445566,10,100);
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicNodeMaterial(),mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
  const initial={fogNode:scene.fogNode,fog:scene.fog,sun:sun.intensity,ambient:ambient.intensity};
  const view=createWeatherView(THREE,TSL,{scene,sun,ambient,sampleDaylight});
  return {scene,sun,ambient,geometry,material,mesh,initial,view};
}
function build(f,Builder=GLSLNodeBuilder) {
  // CPU-only renderer-context data fixture. Actual Three builders/materials generate both shader graphs.
  const renderer={contextNode:TSL.context({}),library:new THREE.StandardNodeLibrary(),getRenderTarget:()=>null,getMRT:()=>null,
    depth:false,lighting:{enabled:false},shadowMap:{enabled:false},logarithmicDepthBuffer:false,
    backend:{capabilities:{getUniformBufferLimit:()=>65536},extensions:{has:()=>false},utils:{},get:()=>({})},
    hasFeature:()=>false,hasCompatibility:()=>false,debug:{diagnostics:{keywords:[]}},currentSamples:1,outputColorSpace:THREE.SRGBColorSpace};
  const builder=new Builder(f.mesh,renderer);builder.scene=f.scene;builder.camera=new THREE.PerspectiveCamera();
  builder.fogNode=f.scene.fogNode;builder.build();return builder;
}
const uniforms=b=>[...b.nodes].filter(n=>n.isUniformNode);
function scalars(node) {
  const v=node.value;if(typeof v==='number')return [v];
  return v?.toArray?v.toArray():Array.isArray(v)?v:[];
}
function densityUniforms(builder,density) {
  const all=uniforms(builder);
  for(const value of Object.values(density))assert(all.some(n=>scalars(n).some(v=>Math.abs(v-value)<1e-12)),'Composed density absent from actual graph uniforms: '+value);
  return all.filter(n=>scalars(n).some(v=>Object.values(density).some(x=>Math.abs(x-v)<1e-12)));
}
const uniformState=nodes=>nodes.map(n=>scalars(n).slice());
function cleanup(f){f.view.dispose();f.geometry.dispose();f.material.dispose();}

await check('real FC environment, composed uniform values and GLSL/WGSL MeshBasicNodeMaterial graphs',()=>{
  const f=fixture(),input=fcFrame(),before=clone(input);
  f.view.applyEnvironment(input);assert(f.scene.fogNode?.isNode);assert.equal(f.scene.fog,f.initial.fog);
  close(f.sun.intensity,8*input.weather.atmosphere.sunScale);close(f.ambient.intensity,1.2*input.weather.atmosphere.ambientScale);
  for(const Builder of [GLSLNodeBuilder,WGSLNodeBuilder]) {
    const b=build(f,Builder);assert(b.vertexShader.length>100&&b.fragmentShader.length>100);
    const methods=new Set([...b.nodes].filter(n=>n.isMathNode).map(n=>n.method));
    assert(methods.has('exp')&&methods.has('min')&&methods.has('max'),'Height-integral graph required, not built-in squared density fog');
    assert(densityUniforms(b,input.visibility).length>0);
    assert(uniforms(b).some(n=>n.value?.isColor && n.value.toArray().every((v,i)=>Math.abs(v-daylight(input.simulationMs).fogColor[i])<1e-12)),'Actual fog color uniform differs from fresh daylight');
  }
  assert.deepEqual(input,before);assert(f.view.stats()&&typeof f.view.stats()==='object');cleanup(f);
});

await check('stable fog node/uniform identities, pause, fresh daylight base, zero night sun and seek/restart',()=>{
  const f=fixture(),input=frame('storm',2000);f.view.applyEnvironment(input);
  const fog=f.scene.fogNode,b=build(f),nodes=densityUniforms(b,input.visibility),before=uniformState(nodes);
  for(let i=0;i<5;i++){f.view.applyEnvironment(input);assert.equal(f.scene.fogNode,fog);assert.deepEqual(uniformState(nodes),before);close(f.sun.intensity,2);close(f.ambient.intensity,.78);}
  const next=frame('rain',5000);f.view.applyEnvironment(next);assert.equal(f.scene.fogNode,fog);
  const nextBuild=build(f);for(const n of nodes)assert(uniforms(nextBuild).includes(n),'Uniform identity replaced');
  densityUniforms(nextBuild,next.visibility);close(f.sun.intensity,8*next.weather.atmosphere.sunScale);
  const night=frame('clear',0);f.view.applyEnvironment(night);assert.equal(f.sun.intensity,0);
  assert(uniforms(build(f)).some(n=>n.value?.isColor && n.value.toArray().every((v,i)=>Math.abs(v-daylight(0).fogColor[i])<1e-12)),'Night fog color did not follow seek');
  f.view.applyEnvironment(input);close(f.sun.intensity,2);assert.equal(f.scene.fogNode,fog);
  assert.equal(f.scene.fog,f.initial.fog);cleanup(f);
});

await check('quality/reduced-motion options cannot alter physical fog or actual daylight scaling',()=>{
  const f=fixture();let reference;
  for(const options of [{quality:'low',reducedMotion:true,lightning:'reduced'},{quality:'balanced'},{quality:'high',lightning:'reduced'}]) {
    const input=frame('storm',12000,options);f.view.applyEnvironment(input);
    const b=build(f),nodes=densityUniforms(b,input.visibility),state={sun:f.sun.intensity,ambient:f.ambient.intensity,density:uniformState(nodes)};
    if(reference)assert.deepEqual(state,reference);else reference=state;
  }
  cleanup(f);
});

await check('invalid environment/daylight and callback failure are atomic, with bounded reentry rejection',()=>{
  let mode='normal',calls=0,f;
  const input=frame();
  const sample=ms=>{
    calls++;
    if(mode==='throw')throw Error('daylight fixture error');
    if(mode==='bad')return {sunIntensity:NaN,ambientIntensity:1,fogColor:[0,0,0]};
    if(mode==='extra')return {...daylight(ms),extra:true};
    if(mode==='reenter'){if(calls>2)throw Error('test recursion bound');f.view.applyEnvironment(input);}
    return daylight(ms);
  };
  f=fixture(sample);f.view.applyEnvironment(input);const fog=f.scene.fogNode,nodes=uniforms(build(f));
  const before={sun:f.sun.intensity,ambient:f.ambient.intensity,uniforms:uniformState(nodes)};
  const unchanged=()=>{assert.equal(f.scene.fogNode,fog);assert.equal(f.sun.intensity,before.sun);assert.equal(f.ambient.intensity,before.ambient);assert.deepEqual(uniformState(nodes),before.uniforms);};
  const mutations=[x=>{x.simulationMs=-1;},x=>{x.simulationMs=Infinity;},x=>{x.visibility.fogBase=-.1;},
    x=>{x.visibility.fogSea=.011;},x=>{x.visibility.fogFalloff=0;},x=>{x.minimumTransmittance=0;},
    x=>{x.weather.atmosphere.sunScale=1.1;},x=>{x.weather.atmosphere.ambientScale=.1;},x=>{delete x.visibility;}];
  for(const change of mutations){const bad=clone(input);change(bad);assert.throws(()=>f.view.applyEnvironment(bad));unchanged();}
  for(const bad of [null,undefined,{},false]){assert.throws(()=>f.view.applyEnvironment(bad));unchanged();}
  for(const bad of ['throw','bad','extra']){mode=bad;assert.throws(()=>f.view.applyEnvironment(input));unchanged();}
  mode='reenter';calls=0;assert.throws(()=>f.view.applyEnvironment(input));assert.equal(calls,1,'Reentry invoked daylight callback again');unchanged();
  mode='normal';f.view.applyEnvironment(input);cleanup(f);
});

await check('one scene owner, idempotent disposal and exact caller resource/state preservation',()=>{
  const f=fixture();let disposed=0;f.geometry.addEventListener('dispose',()=>disposed++);f.material.addEventListener('dispose',()=>disposed++);
  assert.throws(()=>createWeatherView(THREE,TSL,{scene:f.scene,sun:f.sun,ambient:f.ambient,sampleDaylight:daylight}));
  assert.throws(()=>createWeatherView(THREE,TSL,{scene:new THREE.Scene(),sun:f.sun,ambient:f.sun,sampleDaylight:daylight}));
  f.view.applyEnvironment(frame());f.view.dispose();f.view.dispose();
  assert.equal(f.scene.fogNode,f.initial.fogNode);assert.equal(f.scene.fog,f.initial.fog);
  assert.equal(f.sun.intensity,f.initial.sun);assert.equal(f.ambient.intensity,f.initial.ambient);
  assert.equal(disposed,0);assert.equal(f.mesh.parent,f.scene);assert.equal(f.sun.parent,f.scene);assert.equal(f.ambient.parent,f.scene);
  const replacement=createWeatherView(THREE,TSL,{scene:f.scene,sun:f.sun,ambient:f.ambient,sampleDaylight:daylight});replacement.applyEnvironment(frame());replacement.dispose();
  f.geometry.dispose();f.material.dispose();
});

await check('external fog/light changes and replacement objects are never clobbered by cleanup',()=>{
  const f=fixture();f.view.applyEnvironment(frame());
  const before={sun:f.sun.intensity,ambient:f.ambient.intensity},nodes=uniforms(build(f)),values=uniformState(nodes);
  const otherFog=TSL.fog(TSL.color(0x123456),TSL.float(.1));f.scene.fogNode=otherFog;
  assert.throws(()=>f.view.applyEnvironment(frame('rain',2000)));
  assert.equal(f.scene.fogNode,otherFog);assert.equal(f.sun.intensity,before.sun);assert.equal(f.ambient.intensity,before.ambient);
  assert.deepEqual(uniformState(nodes),values,'External fog rejection changed owned uniforms');
  f.sun.intensity=9;f.ambient.intensity=8;
  const nextSun=new THREE.DirectionalLight(0xffffff,6),nextAmbient=new THREE.AmbientLight(0xffffff,5);
  f.scene.remove(f.sun,f.ambient);f.scene.add(nextSun,nextAmbient);
  f.view.dispose();f.view.dispose();
  assert.equal(f.scene.fogNode,otherFog);assert.equal(f.sun.intensity,9);assert.equal(f.ambient.intensity,8);
  assert.equal(nextSun.intensity,6);assert.equal(nextAmbient.intensity,5);assert.equal(nextSun.parent,f.scene);
  f.geometry.dispose();f.material.dispose();
});
await check('light ancestry: foreign/detached construction has no fog/lease side effects; reparented apply/dispose is safe',()=>{
  const sceneA=new THREE.Scene(),sceneB=new THREE.Scene(),group=new THREE.Group();sceneA.add(group);
  const sunA=new THREE.DirectionalLight(0xffffff,7),ambientA=new THREE.AmbientLight(0xffffff,3);
  const sunB=new THREE.DirectionalLight(0xffffff,6),ambientB=new THREE.AmbientLight(0xffffff,2);
  group.add(sunA,ambientA);sceneB.add(sunB,ambientB);
  const priorA=TSL.fog(TSL.color(0x222222),TSL.float(.1)),priorB=TSL.fog(TSL.color(0x333333),TSL.float(.2));
  sceneA.fogNode=priorA;sceneB.fogNode=priorB;
  const options=(scene,sun,ambient)=>({scene,sun,ambient,sampleDaylight:daylight});
  for(const [sun,ambient] of [[sunB,ambientA],[sunA,ambientB],[new THREE.DirectionalLight(),ambientA],[sunA,new THREE.AmbientLight()]]) {
    assert.throws(()=>createWeatherView(THREE,TSL,options(sceneA,sun,ambient)));
    assert.equal(sceneA.fogNode,priorA);assert.equal(sceneB.fogNode,priorB);
    // A failed constructor must not leave a scene lease that blocks a legitimate retry.
    const probe=createWeatherView(THREE,TSL,options(sceneA,sunA,ambientA));probe.dispose();assert.equal(sceneA.fogNode,priorA);
  }
  const viewA=createWeatherView(THREE,TSL,options(sceneA,sunA,ambientA));viewA.applyEnvironment(frame());
  const ownedFog=sceneA.fogNode,lastSun=sunA.intensity,lastAmbient=ambientA.intensity;
  assert.notEqual(lastSun,7,'Reparent cleanup assertion must distinguish restoration from preservation');
  assert.throws(()=>createWeatherView(THREE,TSL,options(sceneB,sunA,ambientB)));
  assert.equal(sceneB.fogNode,priorB);assert.equal(sceneA.fogNode,ownedFog);
  const probeB=createWeatherView(THREE,TSL,options(sceneB,sunB,ambientB));probeB.dispose();assert.equal(sceneB.fogNode,priorB);
  const f={scene:sceneA,mesh:new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicNodeMaterial())};
  sceneA.add(f.mesh);const nodes=uniforms(build(f)),before=uniformState(nodes);
  sceneB.add(sunA);assert.equal(sunA.parent,sceneB);
  assert.throws(()=>viewA.applyEnvironment(frame('rain',2000)));
  assert.equal(sceneA.fogNode,ownedFog);assert.equal(sceneB.fogNode,priorB);
  assert.equal(sunA.intensity,lastSun);assert.equal(ambientA.intensity,lastAmbient);assert.deepEqual(uniformState(nodes),before);
  viewA.dispose();viewA.dispose();assert.equal(sunA.intensity,lastSun,'Dispose overwrote reparented light in new scene');
  assert.equal(sunA.parent,sceneB);assert.equal(sceneA.fogNode,priorA);assert.equal(sceneB.fogNode,priorB);
  assert.equal(sunB.intensity,6);assert.equal(ambientB.intensity,2);
  f.mesh.geometry.dispose();f.mesh.material.dispose();
});
assert.equal(failures.length,0,failures.map(f=>f.name+': '+f.error.message).join('\n'));
console.log(`PASS ${groups} weather-view CPU groups; real graph generation only, shader numeric GPU parity/compile/FPS/served weather UNVERIFIED`);
