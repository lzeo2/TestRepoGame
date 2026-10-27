// Pure geometry and actual Host-backed layer resources; no renderer/native claims.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {KEEP_CLEAR as a,isKeepClear,keepClearAxis,keepClearBounds,panelSegment} from './keep-clear.mjs';
import {createKeepClearLayer} from './keep-clear-layer.mjs';
import {createSystems} from '../systems.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
assert.ok(isKeepClear(a));assert.equal(keepClearAxis(0),'z');assert.equal(keepClearAxis(Math.PI/2),'x');assert.equal(keepClearAxis(Math.PI/4),'z');
for(const axis of ['x','z']) {
  const b=keepClearBounds(point(1,2,3),axis);assert.equal(b.length,2);assert.ok(Object.isFrozen(b));for(const p of b){assert.ok(Object.isFrozen(p));near(p.maxY-p.minY,2.6);near(p.maxX-p.minX,axis==='x'?5:.3);near(p.maxZ-p.minZ,axis==='z'?5:.3);}near(axis==='z'?b[1].minX-b[0].maxX:b[1].minZ-b[0].maxZ,5);
}
const b=keepClearBounds(point(),'z')[1];near(panelSegment(point(5,1,0),point(-5,1,0),b),.22);near(panelSegment(point(5,0,0),point(-5,0,0),b,.45,1.8),.175);assert.equal(panelSegment(point(5,3,0),point(-5,3,0),b),null);assert.equal(panelSegment(point(0,0,-8),point(0,0,8),b,.45,1.8),null);assert.equal(panelSegment(point(2.65,1,0),point(2.65,1,0),b),0);assert.equal(panelSegment(point(NaN),point(),b),null);
{
  const scene=new THREE.Scene(),foreign={id:'native-wall'},boxes=[foreign],layer=createKeepClearLayer(scene,boxes);for(let i=0;i<100;i++)layer.sync({});assert.equal(scene.children.length,0);assert.deepEqual(boxes,[foreign]);layer.dispose();layer.dispose();
}
console.log('PASS Keep Clear pure cardinal bounds/clear 5m gap/exact 5x2.6x.3 and swept feet segments; no-panel layer allocates no mesh or collider');
if(!process.argv.includes('--pure')) {
  function fixture() {
    const s=createSystems();s.step(30);const source=s.addHero({id:'wall-source',team:'carbon',position:point(0,0,8)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(6,0,0)});assert.ok(s.configureHeroKit(source.id,whitespaceSlice,{partialSlice:true}).ok);
    const result=s.applyHeroEffect({kind:'deployment-start',source:source.id,target:null,ability:a.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,duration:4,damageType:'none',deploymentId:1,origin:point(),axis:'z'});assert.ok(result.ok,JSON.stringify(result));return {s,source,enemy};
  }
  {
    const {s,enemy}=fixture(),scene=new THREE.Scene(),foreign=new THREE.Object3D();scene.add(foreign);const wall={id:'native-barricade',minX:80,maxX:81,minY:0,maxY:2,minZ:0,maxZ:1},boxes=[wall],layer=createKeepClearLayer(scene,boxes);layer.sync(s);const meshes=scene.children.filter(x=>x!==foreign),firstBoxes=boxes.slice(1);assert.equal(meshes.length,2);let disposed=0;for(const mesh of meshes){mesh.geometry.addEventListener('dispose',()=>disposed++);const bound=new THREE.Box3().setFromObject(mesh),p=boxes.find(x=>x!==wall&&Math.abs((x.minX+x.maxX)/2-mesh.position.x)<1e-8);for(const [axis,lo,hi] of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){near(bound.min[axis],p[lo]);near(bound.max[axis],p[hi]);}assert.equal(mesh.material.color.getHexString(),'6c8589');assert.ok(Object.isFrozen(p.panelTarget));}
    for(let i=0;i<100;i++)layer.sync(s);assert.equal(scene.children.length,3);assert.deepEqual(boxes.slice(1),firstBoxes);assert.equal(disposed,0);const panel=s.wallPanels().find(p=>p.panelIndex===1);assert.equal(panel.hp,280);assert.ok(s.damage(panel.id,40,enemy.id,{kind:'projectile'}).ok);layer.sync(s);assert.equal(s.wallPanels().find(p=>p.id===panel.id).hp,240);assert.equal(scene.children.length,3);
    s.step(s.stats(enemy.id).fireInterval); // Public projectile cooldown, no private wait bypass.
    assert.ok(s.damage(panel.id,1000,enemy.id,{kind:'projectile'}).ok);layer.sync(s);assert.equal(s.wallPanels().length,1);assert.equal(scene.children.length,2);assert.equal(boxes.length,2);assert.equal(disposed,1);assert.equal(boxes[0],wall);s.step(4);layer.sync(s);assert.deepEqual(boxes,[wall]);assert.deepEqual(scene.children,[foreign]);assert.equal(disposed,2);layer.dispose();layer.dispose();assert.equal(disposed,2);
  }
  {
    const {s}=fixture(),scene=new THREE.Scene(),boxes=[],layer=createKeepClearLayer(scene,boxes),add=scene.add,error=Object.freeze(new Error('scene insertion failed'));let failedMesh,released=0;
    scene.add=function(mesh){failedMesh=mesh;mesh.geometry.addEventListener('dispose',()=>released++);mesh.material.addEventListener('dispose',()=>released++);add.call(this,mesh);throw error;};assert.throws(()=>layer.sync(s),e=>e===error);assert.equal(scene.children.length,0);assert.equal(boxes.length,0);assert.ok(failedMesh);assert.equal(released,2,'partial geometry and material are both disposed');scene.add=add;layer.sync(s);assert.equal(scene.children.length,2);assert.equal(boxes.length,2);layer.dispose();assert.equal(scene.children.length,0);assert.equal(boxes.length,0);
  }
  console.log('PASS Keep Clear actual Host layer: frozen panel descriptors/independent 280 HP, exact mesh bounds, stable shared-box identities, one-panel destruction, expiry, foreign/native resources retained, partial insertion cleanup/retry and idempotent disposal');
}
console.log('LIMIT: CPU primitive bounds/resources, not supplied panel art, WebGL pixels, native input or mesh-exact capsule physics.');
