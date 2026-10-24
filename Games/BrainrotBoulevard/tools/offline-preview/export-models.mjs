/** Export actual Three.js geometry and CPU DataTextures for an offline Blender asset render.
 * Does not edit game code or replace/re-sculpt any geometry. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../vendor/three.module.js';
import { createCollectible } from '../../src/characters.js';
import { CATALOG } from '../../src/rules.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=process.argv[2] || path.join(ROOT,'previews/exported');
fs.mkdirSync(OUT,{recursive:true});
const geometries=[],materials=[],textures=[],models=[];
const gids=new Map(),mids=new Map(),tids=new Map();
const attrs=a=>a?Array.from(a.array):null;
function tex(t){
 if(!t) return null;
 if(tids.has(t.uuid))return tids.get(t.uuid);
 const id=textures.length; tids.set(t.uuid,id);
 const im=t.image;
 if(!im?.data)throw Error(`Texture ${t.name||t.uuid} is not a CPU DataTexture`);
 const file=`texture-${String(id).padStart(3,'0')}.rgba`;
 fs.writeFileSync(path.join(OUT,file),Buffer.from(im.data.buffer,im.data.byteOffset,im.data.byteLength));
 const channels=im.data.length/(im.width*im.height);
 textures.push({id,name:t.name,file,width:im.width,height:im.height,channels,arrayType:im.data.constructor.name,colorSpace:t.colorSpace,flipY:t.flipY,repeat:t.repeat.toArray(),offset:t.offset.toArray(),rotation:t.rotation,center:t.center.toArray(),wrapS:t.wrapS,wrapT:t.wrapT});
 return id;
}
function mat(m){
 if(mids.has(m.uuid))return mids.get(m.uuid);
 const id=materials.length; mids.set(m.uuid,id);
 const item={id,name:m.name||`material-${id}`,type:m.type,color:m.color?.toArray()||[1,1,1],roughness:m.roughness??0.7,metalness:m.metalness??0,emissive:m.emissive?.toArray()||[0,0,0],emissiveIntensity:m.emissiveIntensity??0,opacity:m.opacity,transparent:m.transparent,side:m.side,flatShading:m.flatShading,bumpScale:m.bumpScale??1,normalScale:m.normalScale?.toArray(),clearcoat:m.clearcoat??0,clearcoatRoughness:m.clearcoatRoughness??0,transmission:m.transmission??0,ior:m.ior??1.5};
 for(const slot of ['map','bumpMap','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap']) item[slot]=tex(m[slot]);
 materials.push(item); return id;
}
function geo(g){
 if(gids.has(g.uuid))return gids.get(g.uuid);
 const id=geometries.length; gids.set(g.uuid,id);
 geometries.push({id,name:g.name,position:attrs(g.attributes.position),normal:attrs(g.attributes.normal),uv:attrs(g.attributes.uv),index:attrs(g.index),groups:g.groups});return id;
}
for(let i=0;i<8;i++){
 const root=createCollectible(i);root.updateMatrixWorld(true);
 const meshes=[];let vertices=0,triangles=0;
 root.traverse(m=>{if(!m.isMesh)return;meshes.push({name:m.name||`mesh-${meshes.length}`,geometry:geo(m.geometry),materials:(Array.isArray(m.material)?m.material:[m.material]).map(mat),matrix:m.matrixWorld.toArray()});vertices+=m.geometry.attributes.position.count;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});
 const bounds=new THREE.Box3().setFromObject(root);
 models.push({index:i,name:CATALOG[i]?.name||`Creature ${i+1}`,meshes,vertices,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
}
const sourceFiles=['src/characters.js','src/character-surfaces.js'].filter(p=>fs.existsSync(path.join(ROOT,p))).map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex')}));
const result={format:'three-to-blender-offline-preview-1',generatedAt:new Date().toISOString(),sourceFiles,threeRevision:THREE.REVISION,geometries,materials,textures,models};
fs.writeFileSync(path.join(OUT,'models.json'),JSON.stringify(result));
console.log(JSON.stringify({out:OUT,geometries:geometries.length,materials:materials.length,textures:textures.length,models:models.map(({index,name,meshes,vertices,triangles,bounds})=>({index,name,meshes:meshes.length,vertices,triangles,bounds}))},null,2));
