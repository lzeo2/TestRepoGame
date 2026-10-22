// Shared original model build/measurement helper. Never imported by the game.
import * as THREE from '../vendor/three.module.js';
import { GLTFExporter } from '../vendor/addons/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if(typeof FileReader==='undefined')globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>this.onerror?.(error));}
};
export function guard() {
  const bytes=Number(execFileSync('df',['-B1','/','--output=avail'],{encoding:'utf8'}).trim().split('\n').at(-1));
  if(bytes<2178940928)throw new Error(`Storage guard: ${bytes} bytes`);
  return bytes;
}
export function measureModel(root) {
  root.updateMatrixWorld(true);
  let triangles=0,vertices=0;const materials=new Set(),parts=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry,p=g.getAttribute('position');if(!p)throw new Error('Mesh missing positions');
    if(!Array.from(p.array).every(Number.isFinite))throw new Error('Nonfinite vertex');
    if(!g.getAttribute('normal'))g.computeVertexNormals();
    if(!g.getAttribute('uv')) {
      g.computeBoundingBox();const b=g.boundingBox,size=new THREE.Vector3();b.getSize(size);
      const uv=new Float32Array(p.count*2);
      for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)-b.min.x)/Math.max(.001,size.x);uv[i*2+1]=(p.getY(i)-b.min.y)/Math.max(.001,size.y);}
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    }
    const count=(g.index?.count??p.count)/3;
    if(!Number.isInteger(count)||count<1)throw new Error('Invalid triangles');
    triangles+=count;vertices+=p.count;
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {
      if(!material.isMeshStandardMaterial)throw new Error('Use PBR MeshStandardMaterial');
      if(material.map||material.normalMap)throw new Error('Build GLB uses geometry/PBR; runtime adds shared original procedural surfaces');
      materials.add(material);
    }
    parts.push({name:mesh.name,triangles:count});
  });
  const bounds=new THREE.Box3().setFromObject(root);
  return {triangles,vertices,meshes:parts.length,materials:[...materials].map(m=>({name:m.name,color:m.color.getHexString(),roughness:m.roughness,metalness:m.metalness})),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},parts};
}
export async function exportModel(root,output,{minimum=120000,maximum=250000,maxBytes=6000000,label='Original procedural character'}={}) {
  const metrics=measureModel(root);
  if(metrics.triangles<minimum||metrics.triangles>maximum)throw new Error(`Triangle budget ${metrics.triangles}, expected ${minimum}..${maximum}`);
  if(metrics.bounds.min[1]<-.01||metrics.bounds.max[1]<1.5||metrics.bounds.max[1]>2.25)throw new Error('Feet at zero; height 1.5..2.25m');
  const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
  const bytes=Buffer.from(buffer);if(bytes.length>=maxBytes)throw new Error(`Model ${bytes.length} exceeds build allocation ${maxBytes}`);
  const path=output instanceof URL?fileURLToPath(output):output;
  const game=fileURLToPath(new URL('../',import.meta.url));
  const receipt={label,url:relative(game,path).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...metrics,provenance:'Original authored procedural mesh; no third-party art or Blender. Concept reference is supplied codex-imagen plate.',quality:'Procedural interpretation, not a photoreal sculpt or acceptance grade.'};
  guard();mkdirSync(dirname(path),{recursive:true});guard();writeFileSync(path,bytes);
  guard();writeFileSync(join(dirname(path),'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({url:receipt.url,bytes:receipt.bytes,sha256:receipt.sha256,triangles:metrics.triangles,meshes:metrics.meshes}));
  return receipt;
}
