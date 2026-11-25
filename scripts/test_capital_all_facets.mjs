import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createWorldView} from '../Games/Capital Drive/world-view.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';

// Exercise production streamed world batches, not an approximation of source polygons.
// Separate landmark/vehicle/person/interior views are outside this census.
globalThis.document ??= {createElement: () => ({getContext: () => ({
  createImageData: (w,h) => ({data:new Uint8ClampedArray(w*h*4)}),
  putImageData(){},fillRect(){},strokeRect(){},fillText(){}
})})};
const map=await loadCapitalMap();
const size=350, padding=245, b=map.bounds;
const cells=[];
for(let x=Math.ceil((b.minX-padding)/size)-1;x<=Math.floor((b.maxX+padding)/size);x++)
  for(let z=Math.ceil((b.minZ-padding)/size)-1;z<=Math.floor((b.maxZ+padding)/size);z++)cells.push([x,z]);
for(const lowGraphics of [true,false]) {
  const scene=new THREE.Scene(),view=createWorldView(scene,map,{streaming:true,lowGraphics,openingChunks:0});
  const visited=new Set(),geometries=new WeakSet(),totals={cells:cells.length,chunks:0,meshes:0,vertices:0,triangles:0,degenerate:0,opposedNormals:0,nearZero:0,disposed:0,created:0};
  const kinds={};let peakBytes=0;
  function audit(chunk) {
    const key=chunk.name.slice('District '.length);
    for(const mesh of chunk.children) {
      const g=mesh.geometry;
      if(!geometries.has(g)){geometries.add(g);totals.created++;g.addEventListener('dispose',()=>totals.disposed++);}
    }
    if(visited.has(key))return;
    visited.add(key);totals.chunks++;
    for(const mesh of chunk.children) {
      const g=mesh.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.index;
      const label=`${lowGraphics?'low':'standard'} ${key} ${mesh.name}`;
      const count=idx?.count??p.count;
      assert.equal(count%3,0,label+' complete triangles');
      for(const [name,a] of Object.entries(g.attributes)) {
        assert.equal(a.count,p.count,label+' matching '+name+' count');
        for(const v of a.array)assert(Number.isFinite(v),label+' finite '+name);
      }
      if(idx)for(const i of idx.array)assert(Number.isInteger(i)&&i>=0&&i<p.count,label+' valid index');
      g.computeBoundingBox();const box=g.boundingBox,sphere=g.boundingSphere;
      assert(Number.isFinite(sphere.radius)&&sphere.radius>=0,label+' finite sphere');
      assert([sphere.center.x,sphere.center.y,sphere.center.z].every(Number.isFinite),label+' finite sphere center');
      const stats=kinds[mesh.name]??={meshes:0,triangles:0,degenerate:0,opposedNormals:0,nearZero:0,examples:[]};
      stats.meshes++;stats.triangles+=count/3;totals.meshes++;totals.vertices+=p.count;totals.triangles+=count/3;
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        assert(x>=box.min.x&&x<=box.max.x&&y>=box.min.y&&y<=box.max.y&&z>=box.min.z&&z<=box.max.z,label+' bounds contain vertices');
        assert(Math.hypot(x-sphere.center.x,y-sphere.center.y,z-sphere.center.z)<=sphere.radius+1e-4,label+' sphere contains vertices');
      }
      for(let i=0;i<count;i+=3) {
        const a=idx?idx.getX(i):i,c=idx?idx.getX(i+2):i+2,d=idx?idx.getX(i+1):i+1;
        const ux=p.getX(d)-p.getX(a),uy=p.getY(d)-p.getY(a),uz=p.getZ(d)-p.getZ(a);
        const vx=p.getX(c)-p.getX(a),vy=p.getY(c)-p.getY(a),vz=p.getZ(c)-p.getZ(a);
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,area2=Math.hypot(nx,ny,nz);
        assert(Number.isFinite(area2),label+' finite triangle');
        const dot=nx*(n.getX(a)+n.getX(d)+n.getX(c))+ny*(n.getY(a)+n.getY(d)+n.getY(c))+nz*(n.getZ(a)+n.getZ(d)+n.getZ(c));
        const issue=area2===0?'degenerate':area2<1e-8?'nearZero':dot< -area2*.03?'opposedNormals':null;
        if(issue){stats[issue]++;totals[issue]++;if(stats.examples.length<4)stats.examples.push({key,triangle:i/3,issue,points:[a,d,c].map(j=>[p.getX(j),p.getY(j),p.getZ(j)])});}
      }
    }
  }
  try {
    for(const chunk of scene.children[0].children)audit(chunk);
    for(let i=0;i<cells.length;i++) {
      const [x,z]=cells[i];if(visited.has(`${x},${z}`))continue;
      const pose={x:(x+.5)*size,z:(z+.5)*size};
      view.update(pose,{maxLoads:0});
      while(view.pendingChunks){const before=view.stats.loads;view.update(pose,{maxLoads:2});assert(view.stats.loads-before<=2);for(const chunk of scene.children[0].children)audit(chunk);}
      assert(visited.has(`${x},${z}`),`represented cell ${x},${z} was built`);
      assert(view.stats.residentChunks<=36,'bounded resident geometry');peakBytes=Math.max(peakBytes,view.stats.residentBytes);
      if(i%100===0)console.log(`facets ${lowGraphics?'low':'standard'} ${i}/${cells.length}: ${totals.triangles} triangles`);
    }
  } finally {view.dispose();}
  assert.equal(totals.disposed,totals.created,'every loaded geometry disposed');
  assert.equal(scene.children.length,0);assert.equal(view.stats.residentBytes,0);
  for(const [kind,stats] of Object.entries(kinds)) {
    assert.equal(stats.degenerate,0,kind+' has no collapsed submitted faces');
    // Leaf-card normals deliberately shade a rounded crown rather than its
    // double-sided billboard planes (canopyGeometry in world-view.js).
    if(kind!=='Canberra canopy')assert.equal(stats.opposedNormals,0,kind+' normals agree with submitted winding');
  }
  console.log(JSON.stringify({scope:'production createWorldView streamed batches only',lowGraphics,totals,peakBytes,kinds}));
}
