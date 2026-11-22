import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createAssassinationSiteView} from '../Games/Capital Drive/assassination-site-view.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';

for(const yaw of [0,.7,-1.9]) {
  const origin={x:80,z:-30,yaw},c=Math.cos(yaw),s=Math.sin(yaw);
  const point=(u,v)=>({x:origin.x+c*u+s*v,z:origin.z-s*u+c*v,yaw});
  const props=[{id:'left-crate',kind:'crate',...point(-3.8,2.5),width:1.4,depth:1.4,height:1.1,color:0x7b735d},
    {id:'right-crate',kind:'crate',...point(3.8,5.5),width:1.4,depth:1.4,height:.85,color:0x6c776e},
    {id:'left-screen',kind:'screen',...point(-4.8,4),width:.18,depth:8,height:1.9,color:0x69746c},
    {id:'right-screen',kind:'screen',...point(4.8,4),width:.18,depth:8,height:1.9,color:0x69746c},
    {id:'back-screen',kind:'screen',...point(0,7.8),width:9.6,depth:.18,height:1.9,color:0x69746c}];
  const compound={id:'yard',origin,width:10,depth:8,props},before=JSON.stringify(compound),heightAt=(x,z)=>4+x*.003+z*.005;
  const scene=new THREE.Scene(),view=createAssassinationSiteView(scene,compound,heightAt),mesh=scene.children[0];
  assert.equal(JSON.stringify(compound),before);assert.equal(view.stats.props,5);assert.equal(view.stats.triangles,60);
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
console.log('PASS rotated assassination compound boxes, identical render/physical/shot bounds, ground conformance, open entry/target aisle, cover, immutable descriptors, one draw/60 triangles, culling and disposal');
