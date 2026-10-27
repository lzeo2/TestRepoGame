// Actual Game callback source + Host/layer/controller/bots/NPC, CPU flat-world fixtures.
// DOM/camera presentation only is mocked; no fake Host ACK, private HP/status grant,
// browser/native input, full-world placement or supplied-art acceptance claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {createBots} from '../bots.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {createKeepClearLayer} from './keep-clear-layer.mjs';
import {panelSegment} from './keep-clear.mjs';
import {whitespaceSlice as white} from './whitespace-slice.mjs';
import {createTraveler,stepTraveler,interact,interaction,moveCapsule,surfaceHeight,FALL_LIMIT} from '../traversal.mjs';
import {loadCharacter,disposeCharacterAssets} from '../character-assets.mjs';
const source=readFileSync(new URL('../game.mjs',import.meta.url),'utf8');
const kits=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../../docs/${name}`,import.meta.url))).heroes);
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,{type},values);}};
globalThis.createImageBitmap=async blob=>{const b=Buffer.from(await blob.arrayBuffer());return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),close(){}};};
await Promise.all([...kits.map(k=>loadCharacter(k.id)),loadCharacter('whitespace')]);
const between=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
function fixture(){
 const sim=createSystems();const hero=sim.addHero({id:'player',team:'carbon',position:{x:0,y:0,z:0}});assert.ok(sim.configureHeroKit(hero.id,white,{partialSlice:true}).ok);sim.step(30);
 const scene=new THREE.Scene(),boxes=[],world={boxes:[],ramps:[],start:{x:0,y:0,z:0},crates:[],stations:[],portals:[],vents:[],rope:{x:300,z:300,top:12,landing:{x:300,y:12,z:300}},pit:{minX:300,maxX:310,minZ:300,maxZ:310}};
 const controller=new PlayerController({position:hero.position,boxes,ramps:[],floorHeight:(x,z,y)=>Math.max(0,surfaceHeight({...world,boxes},x,z,y))}),camera=new THREE.PerspectiveCamera(70,1,.1,200),messages=[],held=new Set(),edges=new Set();
 const view={scene,camera,sync(){},syncStructures(){},dispose(){}},document={hidden:false,querySelector:selector=>selector==='.sys-shop'?{hidden:true}:null};
 const context=vm.createContext({THREE,sim,hero,world,boxes,controller,view,document,canvas:{},playing:true,paused:false,stopped:false,qa:true,fixture:'chain',wasAlive:true,held,edges,traveler:createTraveler(world),history:[],ui:{message:text=>messages.push(text),update(){},dispose(){}},actors:{sync(){},dispose(){}},portrait:null,observer:null,abort:new AbortController(),raf:0,cancelAnimationFrame(){},disposeCharacterAssets(){},panelSegment,FALL_LIMIT,createKeepClearLayer,createTraveler,stepTraveler,interact,interaction,moveCapsule,surfaceHeight,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)});
 vm.runInContext(source.match(/^const clear=.*$/m)[0],context);
 vm.runInContext(source.slice(source.indexOf('const targets=()=>'),source.indexOf('\ntry {',source.indexOf('const targets=()=>'))),context);
 vm.runInContext(source.match(/^  view.wallLayer=createKeepClearLayer\(.*$/m)[0],context);
 const events=[],runtime=new HeroRuntime({scene,controller,kit:white,boxes,source:hero.id,onEffect:event=>{events.push(event);return context.effect(event);}});context.runtime=runtime;
 const botEffect=vm.runInContext(source.match(/onEffect:(e=>\{const result=sim\.applyHeroEffect\(e\);view\.wallLayer\?\.sync\(sim\);return result;\})/)[1],context);
 const bots=createBots({sim,scene,world,kits,boxes,floorHeight:(x,z,y)=>Math.max(0,surfaceHeight({...world,boxes},x,z,y)),onEffect:botEffect});context.bots=bots;
 const layer=view.wallLayer,keep=white.abilities.find(a=>a.id==='keepclear');assert.ok(keep);
 const place=position=>{assert.ok(sim.moveHero(hero.id,position).ok);controller.warp(hero.position);Object.assign(context.traveler,hero.position);};
 const start=(origin={x:0,y:0,z:8},axis='z',id=1)=>context.effect({kind:'deployment-start',source:hero.id,target:null,ability:keep.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:4,damageType:'none',deploymentId:id,origin,axis});
 return {sim,hero,world,scene,boxes,controller,camera,context,runtime,bots,layer,events,messages,held,place,start,targets:()=>vm.runInContext('targets()',context),tick:()=>context.tick(.05),dispose(){context.stop();assert.equal(boxes.filter(b=>b.panelTarget).length,0);assert.equal(scene.children.length,0);context.stop();}};
}
{
 const f=fixture();assert.equal(f.boxes.length,0);f.tick();assert.equal(f.boxes.length,0,'no-panel normal path adds no resources');
 assert.ok(f.start().ok);const panels=f.sim.wallPanels();assert.equal(panels.length,2);assert.equal(f.boxes.length,2,'actual player Host callback syncs layer immediately');assert.equal(f.scene.children.filter(x=>x.isMesh).length,2);
 const nativeCount=f.sim.heroes.length+f.sim.troopers.length+f.sim.structures.length,targets=f.targets();assert.equal(targets.length,nativeCount+2);assert.deepEqual(Array.from(targets.slice(-2),t=>t.id),panels.map(p=>p.id));assert.ok(targets.slice(0,nativeCount).every(t=>t.kind!=='panel'));
 const oldBoxes=[...f.boxes];f.layer.sync(f.sim);assert.deepEqual(f.boxes,oldBoxes,'sync preserves exact shared collider identities');
 const enemy=f.sim.heroes.find(h=>h.id==='bot-3');assert.ok(f.sim.moveHero(enemy.id,{x:-8,y:0,z:8}).ok);f.bots.update(0);
 const r=f.bots.runtimes[2],panel=panels[0],other=panels[1],ownerHP=f.hero.hp,messages=f.messages.length;
 let shots=0;while(panel.alive&&shots++<30){const result=r.emit('damage',r.kit.weapon,{id:panel.id});assert.equal(result?.ok,true);}
 assert.ok(shots<30);assert.equal(panel.alive,false);assert.equal(other.hp,280);assert.equal(f.hero.hp,ownerHP);assert.equal(f.messages.length,messages,'bot callback does not display player hit text');assert.equal(f.boxes.length,1,'bot Host callback removes dead collider synchronously');assert.equal(f.boxes[0],oldBoxes[1]);
 assert.ok(f.sim.events.some(e=>e.type==='panel_destroyed'));f.sim.step(4);assert.equal(f.boxes.length,1,'layer removal is explicit, not a private second clock');f.tick();assert.equal(f.boxes.length,0,'tick-start sync removes expired panels before physics');f.dispose();
}
{
 const f=fixture();assert.ok(f.start().ok);f.place({x:0,y:0,z:8});f.controller.yaw=-Math.PI/2;f.held.add('KeyW');for(let i=0;i<30;i++)f.tick();assert.ok(f.controller.position.x<=2.050001,`ordinary real controller cannot cross thin panel: ${JSON.stringify({position:f.controller.position,state:f.controller.state,boxes:f.boxes.map(b=>({minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ})),time:f.sim.time})}`);
 f.held.clear();f.sim.step(4);f.held.add('KeyW');for(let i=0;i<15;i++)f.tick();assert.ok(f.controller.position.x>3,'expired collider removed before resumed controller walking');f.dispose();
}
{
 const f=fixture();assert.ok(f.start().ok);f.world.portals.push({id:'a',x:0,y:0,z:0},{id:'b',x:2.65,y:0,z:8});
 const before=JSON.stringify({mode:f.context.traveler.mode,ride:f.context.traveler.ride,cooldown:f.context.traveler.cooldown,position:f.controller.position,hero:f.hero.position,collected:[...f.context.traveler.collected],broken:[...f.context.traveler.broken]});
 f.context.action('interact');assert.equal(JSON.stringify({mode:f.context.traveler.mode,ride:f.context.traveler.ride,cooldown:f.context.traveler.cooldown,position:f.controller.position,hero:f.hero.position,collected:[...f.context.traveler.collected],broken:[...f.context.traveler.broken]}),before);assert.equal(f.messages.at(-1),'Panels block the landing.');
 f.world.portals[1].x=0;f.context.action('interact');assert.equal(f.controller.position.z,8);assert.equal(f.hero.position.z,8);assert.equal(f.context.traveler.event,'teleport','valid unoccupied portal stays an explicit teleport');f.dispose();
}
{
 const f=fixture();f.place({x:-8,y:6,z:8});assert.ok(f.start({x:0,y:8.5,z:8}).ok); // Explicit API-height fixture, not ground placement/native geometry proof.
 f.world.stations.push({id:'test-zip',a:{x:-8,y:6,z:8},b:{x:8,y:6,z:8}});f.context.action('interact');assert.equal(f.context.traveler.mode,'zip');
 let blocked=false;for(let i=0;i<80&&f.context.traveler.mode==='zip';i++){const before={...f.controller.position};f.tick();if(f.context.traveler.mode==='free'){assert.equal(f.controller.position.x,before.x);assert.equal(f.controller.position.y,before.y);assert.equal(f.controller.position.z,before.z);blocked=true;}}
 assert.equal(blocked,true);assert.equal(f.context.traveler.ride,null);assert.ok(f.controller.position.x< -3.2,'swept traveler feet stop before the panel, not inside/through it');f.dispose();
}
{
 const f=fixture(),t=f.sim.troopers.find(t=>t.alive&&t.team==='carbon');assert.ok(t);const origin={x:t.position.x,y:0,z:t.position.z+4};f.place({x:origin.x-10,y:0,z:origin.z});assert.ok(f.start(origin,'x').ok);
 for(let i=0;i<8;i++)f.tick();const held=t.distanceMarched;for(let i=0;i<3;i++)f.tick();assert.equal(t.distanceMarched,held,'real Host NPC cannot walk through a live panel');
 const panel=f.sim.wallPanels()[0],enemy=f.sim.heroes.find(h=>h.id==='bot-3');assert.ok(f.sim.moveHero(enemy.id,{x:origin.x-7,y:0,z:panel.position.z}).ok);assert.ok(f.sim.damage(panel.id,1000,enemy.id,{kind:'ability'}).ok);assert.ok(f.sim.moveHero(enemy.id,f.sim.bases.ivory).ok);
 f.tick();assert.ok(t.distanceMarched>held,'destroying the first panel frees actual NPC walking');assert.equal(f.boxes.length,1);f.dispose();
}
{
 const f=fixture();f.controller.yaw=Math.PI;f.controller.pitch=-.12;f.context.action('Digit2');assert.ok(f.runtime.pendingCast);assert.equal(f.sim.wallPanels().length,0);
 for(let i=0;i<6;i++)f.tick();assert.equal(f.sim.wallPanels().length,2,'actual Game action/Runtime windup reaches real Host panel creation');assert.equal(f.boxes.length,2);
 f.dispose();assert.equal(f.sim.wallPanels().length,0,'Game stop ends the actual Runtime owner before disposing its scene layer');
}
{
 const f=fixture();f.controller.yaw=Math.PI;f.controller.pitch=-.12;f.context.action('Digit2');for(let i=0;i<6;i++)f.tick();assert.equal(f.sim.wallPanels().length,2);
 const primary=0,secondary=new Error('secondary panel-layer cleanup'),effect=f.runtime.onEffect,dispose=f.layer.dispose;
 f.runtime.onEffect=event=>{const result=effect(event);if(event.kind==='deployment-end')throw primary;return result;};
 f.layer.dispose=()=>{dispose.call(f.layer);throw secondary;};
 let caught=false;try{f.context.stop();}catch(error){caught=true;assert.equal(error,primary);}
 assert.equal(caught,true);assert.equal(f.context.view.lastPanelCleanupError,secondary);assert.equal(f.boxes.length,0);assert.equal(f.sim.wallPanels().length,0);
 f.runtime.onEffect=effect;f.layer.dispose=dispose;f.runtime.dispose();f.layer.dispose();assert.equal(f.scene.children.length,0); // Explicit retry after partial teardown, not rollback.
}
disposeCharacterAssets();
console.log('Keep Clear integration PASS: actual Game player/bot callbacks, native-first panel targets, exact shared layer identities, independent panel HP/destruction, expired prephysics removal, ordinary controller + swept traveler blocking, occupied portal preflight/valid teleport, actual NPC blocking/destruction, real Game Keep Clear windup and stop cleanup. CPU scene/API/VM proof only.');
