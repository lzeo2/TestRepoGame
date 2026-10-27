// Real Three CPU presentation checks only; no renderer/browser/GPU or model realism claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeaView} from './fleet-sea-view.mjs';
import {createFleet} from './fleet-sim.mjs';
assert(process.env.THREE_ROOT,'Supply existing Three186 package; install nothing');
const T=await import(pathToFileURL(resolve(process.env.THREE_ROOT,'build/three.module.js')).href);
assert.equal(T.REVISION,'186');
const descriptors=[...JSON.parse(readFileSync(new URL('./model-repairs.json',import.meta.url),'utf8')).models,
  JSON.parse(readFileSync(new URL('./submarine-model.json',import.meta.url),'utf8'))];
const models=descriptors.map((descriptor,i)=>({id:'model'+i,descriptor})),original=JSON.stringify(models);
const near=(a,b)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert(Math.abs(v-b[i])<1e-6,`${a} != ${b}`));};
const unit=(extra={})=>({id:'ship',modelId:'model0',kind:'surface',team:0,position:[0,0,0],view:{orientation:[0,0,0,1]},
  alive:true,hp:100,maxHp:100,depth:'surfaced',...extra});
const snapshot=(tick,units=[unit()],events=[],extra={})=>({mode:'factions',round:0,tick,units,events,...extra});
const impact=(id,extra={})=>({id,round:0,tick:20,type:'impact',source:'ship',unit:'ship',position:[20,0,30],...extra});
const make=(options={})=>createSeaView(T,{parent:new T.Group(),models,...options});
let groups=0;
function check(name,fn){fn();groups++;console.log('PASS '+name);}
function matrices(mesh){return [...mesh.instanceMatrix.array];}
check('injected186 contract, plain PBR sea and bounded validation without touching caller models',()=>{
  const parent=new T.Group(),external=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());parent.add(external);
  let foreignDisposals=0;external.geometry.addEventListener('dispose',()=>foreignDisposals++);external.material.addEventListener('dispose',()=>foreignDisposals++);
  const view=make({parent});assert(Object.isFrozen(view));assert.equal(view.root.parent,parent);
  const water=view.root.getObjectByName('fleet-sea-water');assert(water.material instanceof T.MeshStandardMaterial);
  assert.equal(water.material.map,null);assert.equal(water.scale.x,10000);assert.equal(water.scale.z,10000);
  assert(water.material.roughness>=.3);assert.equal(water.position.y,-.04);
  assert.throws(()=>make({quality:'ultra'}));assert.throws(()=>make({waterSize:Infinity}));assert.throws(()=>make({reducedFlashes:1}));
  assert.throws(()=>make({models:[models[0],models[0]]}));assert.throws(()=>make({models:[{id:'bad',descriptor:{}}]}));
  assert.throws(()=>view.update({mode:'normal'}));assert.throws(()=>view.update(snapshot(NaN)));
  assert.throws(()=>view.update(snapshot(0,[unit({position:[NaN,0,0]})])));
  assert.throws(()=>view.update(snapshot(0,[unit({maxHp:50})])));
  assert.throws(()=>view.update(snapshot(0,[unit(),unit()])));
  view.dispose();assert.equal(external.parent,parent);assert.equal(foreignDisposals,0);assert.equal(JSON.stringify(models),original);
  external.geometry.dispose();external.material.dispose();
});
check('actual measured bow/stern anchors, yaw/motion speed, fixed tick, no configured-speed fiction',()=>{
  const view=make(),yaw=Math.PI/2,orientation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw).toArray();
  const first=unit({view:{orientation},speed:99999});view.update(snapshot(0,[first]));assert.equal(view.stats().counts.foam,0);
  view.update(snapshot(20,[{...first,position:[-10,0,0]}]));
  const a=view.stats().anchors[0],bounds=descriptors[0].bounds;assert.equal(a.speed,10);assert.equal(view.stats().counts.foam,3);
  near(a.bow,new T.Vector3(0,0,bounds.min[2]).applyQuaternion(new T.Quaternion(...orientation)).add(new T.Vector3(-10,0,0)).toArray());
  near(a.stern,new T.Vector3(0,0,bounds.max[2]).applyQuaternion(new T.Quaternion(...orientation)).add(new T.Vector3(-10,0,0)).toArray());
  const mesh=view.root.getObjectByName('fleet-sea-foam'),m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
  mesh.getMatrixAt(2,m);m.decompose(p,q,s);assert(Math.abs(p.x-a.stern[0])<1e-5);assert(Math.abs(p.z-a.stern[2])<1e-5);
  near(new T.Vector3(0,0,1).applyQuaternion(q).toArray(),[1,0,0]);
  view.update(snapshot(40,[{...first,position:[-10,0,0],speed:30}]));assert.equal(view.stats().anchors[0].speed,0);assert.equal(view.stats().counts.foam,0);
  view.update(snapshot(60,[{...first,position:[-9.5,0,0]}]));assert.equal(view.stats().counts.foam,0,'Sub-cutoff actual .5m/s');
  view.dispose();
});
check('paused/repeated tick matrices/time freeze, privacy removals still apply, rewind/round reset',()=>{
  const view=make();view.update(snapshot(0));view.update(snapshot(20,[unit({position:[0,0,-10]})],[impact(1)]));
  const foam=view.root.getObjectByName('fleet-sea-foam'),before=matrices(foam),state=view.stats();
  view.update(snapshot(20,[unit({position:[100,0,100]})],[impact(2)]));assert.deepEqual(matrices(foam),before);assert.deepEqual(view.stats(),state);
  view.update(snapshot(20,[unit({position:[0,0,-100]})],[],{paused:true}));assert.deepEqual(matrices(foam),before);assert.equal(view.stats().seconds,1);
  view.update(snapshot(20,[],[],{paused:true}));assert.equal(view.stats().units,0);assert.deepEqual(view.stats().counts,{foam:0,splashes:0,smoke:0,fire:0});
  view.update(snapshot(40));assert.equal(view.stats().counts.foam,0,'Reacquisition cannot infer hidden transit speed');
  view.update(snapshot(10));assert.equal(view.stats().tick,10);assert.equal(view.stats().counts.foam,0);
  view.update(snapshot(10,[unit()],[],{round:1}));assert.equal(view.stats().round,1);
  view.reset();assert.equal(view.stats().units,0);assert.equal(view.stats().seconds,0);assert.equal(view.stats().tick,-1);view.dispose();
});
check('new authoritative tick synchronizes motion/damage/events even when host just paused',()=>{
  const view=make();view.update(snapshot(0));
  const moved=unit({position:[0,0,-200],hp:25,maxHp:100});
  view.update(snapshot(400,[moved],[impact(1,{tick:400,position:[0,0,-200]})],{paused:true}));
  const state=view.stats();assert.equal(state.tick,400);assert.equal(state.seconds,20);
  assert.equal(state.anchors[0].speed,10);assert.equal(state.anchors[0].damageFraction,.75);
  near(state.anchors[0].bow,[0,0,-200+descriptors[0].bounds.min[2]]);
  assert.deepEqual(state.counts,{foam:3,splashes:1,smoke:1,fire:1});
  const foam=view.root.getObjectByName('fleet-sea-foam'),before=matrices(foam);
  view.update(snapshot(400,[unit({position:[999,0,999],hp:1})],[impact(2,{tick:400})],{paused:true}));
  assert.deepEqual(view.stats(),state);assert.deepEqual(matrices(foam),before);
  view.update(snapshot(400,[],[],{paused:true}));assert.equal(view.stats().units,0);assert.equal(view.stats().counts.splashes,0);
  view.dispose();
});
check('real maxHp thresholds, no first-frame baseline inference, only live surfaced known units',()=>{
  const view=make({quality:'high'});
  view.update(snapshot(0,[unit({hp:66})]));assert.equal(view.stats().counts.smoke,0);
  view.update(snapshot(1,[unit({hp:65})]));assert.equal(view.stats().counts.smoke,3);assert.equal(view.stats().counts.fire,0);
  view.update(snapshot(2,[unit({hp:25})]));assert.equal(view.stats().counts.fire,1);assert.equal(view.stats().anchors[0].damageFraction,.75);
  const withoutMax=unit({hp:1});delete withoutMax.maxHp;view.update(snapshot(3,[withoutMax]));assert.equal(view.stats().counts.smoke,0);assert.equal(view.stats().counts.fire,0);
  view.update(snapshot(4,[unit({hp:1})]));assert.equal(view.stats().counts.fire,1);
  view.update(snapshot(4,[unit({hp:0,alive:false})],[],{paused:true}));assert.equal(view.stats().counts.fire,0);assert.equal(view.stats().counts.smoke,0);
  view.update(snapshot(5,[unit({modelId:'model2',kind:'sub',position:[0,-156,0],depth:'deep',hp:1})]));assert.equal(view.stats().anchors.length,0);assert.equal(view.stats().counts.smoke,0);
  view.update(snapshot(6,[unit({modelId:'unknown',hp:1})]));assert.equal(view.stats().units,0);
  const safe=snapshot(7,[]);Object.defineProperty(safe,'contacts',{get(){throw Error('Contact cell used as exact pose');}});view.update(safe);view.dispose();
});
check('only visible safe water impacts, no duplicate muzzle/tracers, finite event age/dedup and hiding',()=>{
  const view=make();view.update(snapshot(0));
  const events=[impact(1),impact(2,{type:'fire'}),impact(3,{position:[0,-60,0],medium:'underwater'}),
    impact(4,{position:[0,20,0]}),impact(5,{source:'privateSub',unit:'missing'}),impact(6,{medium:'underwater'}),
    impact(7,{tick:21}),impact(8,{source:'ship',unit:'privateMissing'}),impact(9,{round:1})];
  view.update(snapshot(20,[unit()],events));assert.equal(view.stats().counts.splashes,1);assert.equal(view.stats().counts.fire,0);
  view.update(snapshot(21,[unit()],events));assert.equal(view.stats().counts.splashes,1);
  assert(!view.root.getObjectByName('fleet-fire'));assert(!view.root.getObjectByName('fleet-projectile'));
  view.update(snapshot(30,[],[],{paused:true}));assert.equal(view.stats().counts.splashes,0);
  view.update(snapshot(40,[unit()],events));assert.equal(view.stats().counts.splashes,0,'Omitted-unit old event cannot resurrect a pose');
  view.reset();view.update(snapshot(0));view.update(snapshot(20,[unit()],[impact(1)]));
  view.update(snapshot(53));assert.equal(view.stats().counts.splashes,0,'Splash expires after 1.6 simulation seconds');view.dispose();
});
check('actual safe FC snapshot ABI drives observed motion without altering authority or model inputs',()=>{
  const geometry=models.slice(0,2).map(m=>({id:m.id,descriptor:m.descriptor}));
  const units=[0,1].map(team=>({id:'capital'+team,team,kind:'surface',capital:true,modelId:'model'+team,
    half:[12,8,40],hp:1000,speed:10,position:[team?500:-500,0,0],heading:0,route:[[team?500:-500,0,-500]],
    weapons:[],sensor:null,depth:'surfaced',depthPlan:[]}));
  const config={mode:'factions',geometry,units,arena:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000,bottomY:-240,cell:100,obstacles:[]},
    aircraft:[[{id:'plane0',weapons:[]}],[{id:'plane1',weapons:[]}]],matchMs:60000,intermissionMs:1000};
  const fleet=createFleet(config),view=make();view.update({...fleet.snapshot(0),paused:false});
  fleet.advance(1000);const safe=fleet.snapshot(0),before=JSON.stringify(safe);
  view.update({...safe,paused:false});assert.equal(JSON.stringify(safe),before);
  assert.equal(view.stats().counts.foam,6);for(const a of view.stats().anchors)assert(Math.abs(a.speed-10)<1e-6);
  assert.equal(JSON.stringify(fleet.snapshot(0)),before);assert.equal(JSON.stringify(models),original);view.dispose();
});
check('all tiers hard-cap twelve-unit strips/damage volumes and finite impact pool, reduced flashes',()=>{
  for(const [quality,foam,smoke,splashes] of [['low',36,12,8],['balanced',60,24,16],['high',84,36,24]]) {
    const view=make({quality,reducedFlashes:true}),units=Array.from({length:12},(_,i)=>unit({id:'unit'+i,position:[i*200,0,0],hp:10}));
    view.update(snapshot(0,units));view.update(snapshot(20,units.map(u=>({...u,position:[u.position[0],0,-20]})),Array.from({length:256},(_,i)=>impact(i+1,{source:'unit0',unit:'unit0'}))));
    assert.deepEqual(view.stats().counts,{foam,splashes,smoke,fire:12});assert.deepEqual(view.stats().caps,{foam,splashes,smoke,fire:12});
    const fire=view.root.getObjectByName('fleet-sea-fire');assert.equal(fire.material.emissiveIntensity,.25);
    const before=JSON.stringify(view.stats().anchors);view.stats().anchors[0].bow[0]=999;assert.equal(JSON.stringify(view.stats().anchors),before);
    assert.throws(()=>view.update(snapshot(21,[...units,unit({id:'overflow'})])));
    assert.throws(()=>view.update(snapshot(21,units,Array.from({length:257},(_,i)=>impact(i+1)))));
    view.reset();assert.deepEqual(view.stats().counts,{foam:0,splashes:0,smoke:0,fire:0});view.dispose();
  }
});
check('deterministic tiny ripple/foam textures, feathered UV alpha, tick-only drift and independent disposal',()=>{
  const low=make(),a=make({quality:'balanced'}),b=make({quality:'balanced'}),high=make({quality:'high'});
  const water=v=>v.root.getObjectByName('fleet-sea-water').material;
  assert.equal(water(low).normalMap,null);
  const normal=water(a).normalMap,alpha=a.root.getObjectByName('fleet-sea-foam').material.alphaMap;
  assert.deepEqual(normal.image.data,water(b).normalMap.image.data);assert.deepEqual(normal.image.data,water(high).normalMap.image.data);
  near(water(a).normalScale.toArray(),[.5,.5]);assert.equal(normal.wrapS,T.RepeatWrapping);assert.equal(normal.wrapT,T.RepeatWrapping);
  near(normal.repeat.toArray(),[10000/48,10000/48]);assert.equal(normal.colorSpace,T.NoColorSpace);
  assert.equal(alpha.wrapS,T.ClampToEdgeWrapping);assert.equal(alpha.format,T.RGBAFormat);
  let bytes=0;for(const map of [normal,alpha]) {
    assert(map.image.data.every(Number.isFinite));assert.equal(map.magFilter,T.LinearFilter);assert.equal(map.minFilter,T.LinearMipmapLinearFilter);
    assert(map.generateMipmaps);for(let side=map.image.width;side>=1;side/=2)bytes+=side*side*4;
  }
  assert(bytes<32768);assert.equal(normal.image.data.length,64*64*4);
  for(let i=0;i<normal.image.data.length;i+=4)assert(normal.image.data[i+2]>230);
  const green=(x,y)=>alpha.image.data[(y*32+x)*4+1];
  for(let i=0;i<32;i++){assert.equal(green(0,i),0);assert.equal(green(31,i),0);assert.equal(green(i,0),0);assert.equal(green(i,31),0);}
  assert(green(16,5)>green(16,28));assert(green(16,5)>0);
  const foam=a.root.getObjectByName('fleet-sea-foam');assert.equal(foam.geometry.attributes.uv.count,4);
  assert(foam.material.transparent);assert.equal(foam.material.depthWrite,false);assert(foam.material.opacity<1);
  a.update(snapshot(0));a.update(snapshot(400,[unit({position:[0,0,-200]})],[],{paused:true}));
  near(normal.offset.toArray(),[.12,.07]);const before=normal.offset.toArray();
  a.update(snapshot(400,[unit()],[],{paused:true}));near(normal.offset.toArray(),before);
  a.reset();near(normal.offset.toArray(),[0,0]);
  let disposed=0;for(const map of [normal,alpha])map.addEventListener('dispose',()=>{disposed++;throw Error('texture disposal listener');});
  assert.throws(()=>a.dispose(),e=>e instanceof AggregateError&&e.errors.length===2);assert.equal(disposed,2);assert.equal(a.stats().ownedResources,0);
  a.dispose();assert.equal(disposed,2);low.dispose();b.dispose();high.dispose();
});
check('only own resources disposed once, all attempted after throwing listeners, reentry is inert',()=>{
  const parent=new T.Group(),view=make({parent}),resources=new Set(),counts=new Map();
  view.root.traverse(node=>{if(node.isMesh){resources.add(node.geometry);resources.add(node.material);
    for(const value of Object.values(node.material))if(value?.isTexture)resources.add(value);
    if(node.isInstancedMesh)resources.add(node);}});
  assert.equal(resources.size,view.stats().ownedResources);let index=0;
  for(const resource of resources) {
    const fail=index++<3;resource.addEventListener('dispose',()=>{counts.set(resource,(counts.get(resource)??0)+1);view.dispose();if(fail)throw Error('deliberate disposal failure');});
  }
  assert.throws(()=>view.dispose(),error=>error instanceof AggregateError&&error.errors.length===3);
  assert(view.stats().disposed);assert.equal(view.root.parent,null);assert.equal(parent.children.length,0);assert.equal(view.stats().ownedResources,0);
  assert.equal(counts.size,resources.size);for(const count of counts.values())assert.equal(count,1);
  view.dispose();for(const count of counts.values())assert.equal(count,1);
  assert.throws(()=>view.update(snapshot(1)),/disposed/);assert.throws(()=>view.reset(),/disposed/);
  assert.equal(JSON.stringify(models),original);
});
console.log(`PASS ${groups} original sea-view CPU groups; no native/GPU/photorealism/performance acceptance`);
