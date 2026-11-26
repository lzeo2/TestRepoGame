import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { HIGHWAY_BARRIERS, HIGHWAY_BARRIER_VIEW_LIMITS, selectHighwayBarrierPanels } from './highway-barriers.js';

// Original shallow W-section metal beam; no photographs, textures or per-rail nodes.
function beamGeometry() {
  const section = [[-0.07,-0.14],[0.04,-0.07],[-0.07,0],[0.04,0.07],[-0.07,0.14],[-0.04,0.14],[0.07,0.07],[-0.04,0],[0.07,-0.07],[-0.04,-0.14]];
  const positions = [];
  const point = (x, i) => [x, section[i][1], section[i][0]];
  for(let i=0;i<section.length;i++) {
    const j=(i+1)%section.length,a=point(-0.5,i),b=point(0.5,i),c=point(0.5,j),d=point(-0.5,j);
    positions.push(...a,...b,...c,...a,...c,...d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
export function createHighwayBarriersView(scene,heightAt,{roads=[],roadHeightAt}={}) {
  const limits=HIGHWAY_BARRIER_VIEW_LIMITS,beam=beamGeometry(),post=new THREE.BoxGeometry(0.1,0.75,0.1);
  const ownerIds=new Set(HIGHWAY_BARRIERS.map(rail=>rail.roadContext?.id));
  const owners=new Map(roads.filter(road=>ownerIds.has(road.id)).map(road=>[road.id,road]));
  const material=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
  const beams=new THREE.InstancedMesh(beam,material,limits.panels),posts=new THREE.InstancedMesh(post,material,limits.posts);
  beams.name='Source highway guard rails';posts.name='Source highway guard rail posts';
  for(const mesh of [beams,posts]) { mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh); }
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),horizontal=new THREE.Vector3(),along=new THREE.Vector3(),up=new THREE.Vector3(),side=new THREE.Vector3(),scale=new THREE.Vector3();
  const stats={sourceSegments:HIGHWAY_BARRIERS.length,panels:0,posts:0,instances:0,drawCalls:0,maxInstances:limits.maxInstances,maxDrawCalls:2,geometries:2,materials:1,textures:0,bufferBytes:0,disposed:false};
  for(const geometry of [beam,post]) { for(const attribute of Object.values(geometry.attributes))stats.bufferBytes+=attribute.array.byteLength;if(geometry.index)stats.bufferBytes+=geometry.index.array.byteLength; }
  // Include both fixed transform and color pools, allocated even on an empty view.
  for(const mesh of [beams,posts]) { mesh.setColorAt(0,color.setHex(0xa6aaa3));stats.bufferBytes+=mesh.instanceMatrix.array.byteLength+mesh.instanceColor.array.byteLength; }
  let disposed=false,lastX=Infinity,lastZ=Infinity;
  function update(focus) {
    if(disposed)return;
    if(!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z)) {
      beams.count=posts.count=0;beams.visible=posts.visible=false;stats.panels=stats.posts=stats.instances=stats.drawCalls=0;lastX=lastZ=Infinity;return;
    }
    if(Math.hypot(focus.x-lastX,focus.z-lastZ)<3)return;
    lastX=focus.x;lastZ=focus.z;stats.panels=stats.posts=0;
    const positions=new Set();
    for(const panel of selectHighwayBarrierPanels(focus)) {
      const [a,b]=[panel.a,panel.b],owner=owners.get(panel.rail.roadContext?.id);
      const ya=owner&&roadHeightAt?roadHeightAt(owner,...a):heightAt(...a);
      const yb=owner&&roadHeightAt?roadHeightAt(owner,...b):heightAt(...b);
      if(!Number.isFinite(ya)||!Number.isFinite(yb))continue;
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<0.001)continue;
      along.set(dx,yb-ya,dz);const span=along.length();along.normalize();
      horizontal.set(dx/length,0,dz/length);side.set(-horizontal.z,0,horizontal.x);up.crossVectors(side,along).normalize();
      matrix.makeBasis(along,up,side);matrix.scale(scale.set(span,1,1));matrix.setPosition(panel.x,(ya+yb)/2+panel.rail.height-0.14,panel.z);
      beams.setMatrixAt(stats.panels,matrix);
      color.setHex(panel.rail.material==='wood'?0x8f8978:panel.rail.material==='concrete'?0xb8b6aa:0xa6aaa3);
      beams.setColorAt(stats.panels++,color);
      for(const [p,y] of [[a,ya],[b,yb]]) {
        const key=`${p[0].toFixed(5)},${p[1].toFixed(5)},${y.toFixed(4)}`;
        if(positions.has(key)||stats.posts>=limits.posts)continue;
        positions.add(key);matrix.makeTranslation(p[0],y+0.375,p[1]);posts.setMatrixAt(stats.posts,matrix);posts.setColorAt(stats.posts++,color);
      }
    }
    for(const [mesh,count] of [[beams,stats.panels],[posts,stats.posts]]) { mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=count>0;mesh.instanceColor.needsUpdate=count>0; }
    stats.instances=stats.panels+stats.posts;stats.drawCalls=(beams.visible?1:0)+(posts.visible?1:0);
  }
  function dispose() {
    if(disposed)return;disposed=true;
    for(const mesh of [beams,posts]) { mesh.count=0;mesh.visible=false;mesh.removeFromParent();mesh.dispose(); }
    beam.dispose();post.dispose();material.dispose();stats.panels=stats.posts=stats.instances=stats.drawCalls=0;stats.disposed=true;
  }
  return {update,get stats(){return Object.freeze({...stats});},dispose};
}
