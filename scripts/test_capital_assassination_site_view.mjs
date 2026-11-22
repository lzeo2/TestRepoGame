import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createAssassinationSiteView} from '../Games/Capital Drive/assassination-site-view.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import {createAssassinationCompound,createAssassinationChapter} from '../Games/Capital Drive/assassination-mission.js';

for(const yaw of [0,.7,-1.9]) {
  const origin={x:80,z:-30,yaw},c=Math.cos(yaw),s=Math.sin(yaw);
  const point=(u,v)=>({x:origin.x+c*u+s*v,z:origin.z-s*u+c*v,yaw});
  const compound=createAssassinationCompound(origin,point(35,-1.5)),props=compound.props,before=JSON.stringify(compound),heightAt=(x,z)=>4+x*.003+z*.005;
  const scene=new THREE.Scene(),view=createAssassinationSiteView(scene,compound,heightAt),mesh=scene.children[0];
  assert.equal(JSON.stringify(compound),before);assert.equal(view.stats.props,10);assert.equal(view.stats.triangles,252);
  assert.equal(view.stats.drawCalls,0);view.update(origin);assert.equal(view.stats.drawCalls,1);
  assert(Object.isFrozen(view.barriers)&&view.barriers.every(p=>Object.isFrozen(p)&&Object.isFrozen(p.points)&&p.points.every(Object.isFrozen)));
  assert.equal(view.treeExclusion.length,4);assert.equal(view.footprint.length,4);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  for(const [i,barrier] of view.barriers.entries()) {
    mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    assert(Math.abs(position.y-scale.y/2-barrier.y)<1e-5);
    for(const [u,v] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]) {
      const p=new THREE.Vector3(u,-.5,v).applyMatrix4(matrix);
      assert(barrier.points.some(([x,z])=>Math.hypot(x-p.x,z-p.z)<1e-5),'rendered corners exactly match physical/shot polygons');
    }
    assert(barrier.points.every(([x,z])=>heightAt(x,z)>=barrier.y-1e-9&&heightAt(x,z)+props[i].height<=barrier.y+barrier.height+1e-9));
  }
  const map={bounds:{minX:-100,maxX:200,minZ:-200,maxZ:100},spawn:{x:0,z:0,yaw:0},roads:[],buildings:[],areas:[],barriers:view.barriers};
  const simulation=createSimulation(map,{trafficCount:0,parkedCount:0}),shots=createShotObstacles(map,{heightAt});
  for(let v=-2;v<=6;v+=.25) {
    const p=point(0,v);assert(!simulation.moveActor(p,0,0,.45).blocked,'open front and central target aisle remain accessible');
  }
  const sweep=path=>{
    for(let i=1;i<path.length;i++) {
      const from=path[i-1],to=path[i],body={...from},steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/4));
      for(let step=0;step<steps;step++) {
        const result=simulation.moveActor(body,(to.x-from.x)/steps,(to.z-from.z)/steps,.45);
        assert(!result.blocked,`authored route clears its own props (${i})`);
      }
      assert(Math.hypot(body.x-to.x,body.z-to.z)<1e-5);
    }
  };
  sweep(compound.approaches.front.path);sweep(compound.approaches.service.path);
  sweep([...compound.stealth.patrol,compound.stealth.patrol[0]]);
  sweep([compound.stealth.guardPost,compound.stealth.investigate]);
  sweep([point(-7.2,-2),compound.approaches.front,compound.extraction]);
  for(const landmark of Object.values(compound.landmarks))assert(!simulation.moveActor({...landmark},0,0,.45).blocked);
  sweep([point(-7.2,.1),compound.landmarks.uniform]);
  sweep([point(-7.2,3),point(-7.2,4.8),compound.landmarks.distraction]);
  const rearFrom=point(0,6.5),rearTo=point(0,8.5);
  assert(simulation.moveActor({...rearFrom},rearTo.x-rearFrom.x,rearTo.z-rearFrom.z,.45).blocked,'rear wall encloses the yard');
  const sideFrom=point(-6.5,.8),sideTo=point(-3.5,.8);
  assert(simulation.moveActor({...sideFrom},sideTo.x-sideFrom.x,sideTo.z-sideFrom.z,.45).blocked,'west wall cannot substitute for the service opening');
  for(const barrier of view.barriers)assert(simulation.moveActor({...barrier},0,0,.3).blocked,'each visible prop is physical');
  const from=point(0,5),to=point(0,9),dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
  const ray={...from,y:heightAt(from.x,from.z)+1,dx:dx/length,dy:0,dz:dz/length,range:length,interiorId:null};
  assert(shots.trace(ray)<length,'rear screen provides actual weapon cover');
  const front=point(0,-1.5),target=point(0,4.8),distance=Math.hypot(target.x-front.x,target.z-front.z);
  const open={...front,y:heightAt(front.x,front.z)+1,dx:(target.x-front.x)/distance,dy:0,dz:(target.z-front.z)/distance,range:distance,interiorId:null};
  assert.equal(shots.trace(open),distance,'the authored entry-to-target firing line stays open');
  const matrices=[...mesh.instanceMatrix.array];for(let i=0;i<20;i++)view.update(origin);assert.deepEqual([...mesh.instanceMatrix.array],matrices);
  view.update(point(0,301));assert.equal(view.stats.drawCalls,0);view.dispose();view.dispose();assert.equal(scene.children.length,0);assert(view.stats.disposed);
}
const emptyScene=new THREE.Scene(),empty=createAssassinationSiteView(emptyScene,null);empty.update({x:0,z:0});
assert.equal(emptyScene.children.length,0);assert.equal(empty.stats.geometryCount,0);empty.dispose();
const source=JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json',import.meta.url)));
const simulation=createSimulation(source,{trafficCount:0,parkedCount:0});
let traversals=0;
const chapter=createAssassinationChapter(source,{
  canStand:p=>!simulation.moveActor({...p},0,0,.45).blocked,
  hasLineOfSight:simulation.hasLineOfSight,nearestRoad:simulation.nearestRoad,
  canTraverse:(from,to,radius)=>{traversals++;return !simulation.moveActor({...from},to.x-from.x,to.z-from.z,radius).blocked;},
});
assert(chapter&&traversals>15,'actual source site requires swept external approach/patrol/extraction clearance');
assert(!chapter.stealth,'dedicated assassination mission cannot enter the generic prop-puzzle dispatcher');
const actual=createAssassinationSiteView(null,chapter.compound);simulation.registerStaticBarriers(actual.barriers);
for(const path of [chapter.compound.approaches.front.path,chapter.compound.approaches.service.path,
  chapter.compound.stealth.patrol.concat(chapter.compound.stealth.patrol[0]),
  [chapter.compound.stealth.guardPost,chapter.compound.stealth.investigate]]) {
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],body={...a};
    assert(!simulation.moveActor(body,b.x-a.x,b.z-a.z,.45).blocked,'actual map plus compound preserves both entries and actor routes');
    assert(Math.hypot(body.x-b.x,body.z-b.z)<1e-5);
  }
}
for(const landmark of Object.values(chapter.compound.landmarks))assert(!simulation.moveActor({...landmark},0,0,.45).blocked);
actual.dispose();
console.log('PASS rotated Blackthorn yard, identical render/physical/shot bounds, two swept approaches, uniform/radio access, clear guard/patrol/extraction routes, enclosed rear/sides, cover and one draw/252 triangles');
