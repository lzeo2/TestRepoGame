import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';

const cache=new Map(),pending=new Map(),surfaces=new Map();
const entries={stampead:[120000,250000],turretina:[120000,250000],snipeoff:[120000,250000],gooey:[120000,250000],trooper:[15000,40000]};
const base=new URL('./models/',import.meta.url),isNode=typeof window==='undefined';
async function bytesAt(url) {
  if(isNode){const {readFile}=await import('node:fs/promises');const b=await readFile(url);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
  const response=await fetch(url,{redirect:'error'});if(!response.ok)throw new Error(`Character asset HTTP ${response.status}`);return response.arrayBuffer();
}
async function digest(bytes) {
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function loadCharacter(id) {
  if(!Object.hasOwn(entries,id))throw new RangeError('Unknown character');
  if(cache.has(id))return cache.get(id);
  if(pending.has(id))return pending.get(id);
  const promise=(async()=>{
    const [bytes,receiptBytes]=await Promise.all([bytesAt(new URL(`${id}/model.glb`,base)),bytesAt(new URL(`${id}/receipt.json`,base))]);
    const receipt=JSON.parse(new TextDecoder().decode(receiptBytes));
    if(bytes.byteLength>=8388608||bytes.byteLength!==receipt.bytes||receipt.url!==`models/${id}/model.glb`||await digest(bytes)!==receipt.sha256)throw new Error(`Character integrity mismatch: ${id}`);
    const header=new DataView(bytes),length=header.getUint32(12,true);
    if(header.getUint32(0,true)!==0x46546c67||header.getUint32(8,true)!==bytes.byteLength||length>bytes.byteLength-20)throw new Error('Invalid character GLB');
    const document=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
    if(document.buffers?.length!==1||document.buffers.some(b=>b.uri)||document.images?.length)throw new Error('Character GLB must be self-contained geometry/PBR; external resources forbidden');
    const gltf=await new GLTFLoader().parseAsync(bytes,'');
    let triangles=0;const names=[];
    gltf.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;names.push(o.name);}});
    const [minimum,maximum]=entries[id];
    if(triangles<minimum||triangles>maximum||triangles!==receipt.triangles)throw new Error(`Character triangle mismatch: ${id}/${triangles}`);
    const asset={root:gltf.scene,metadata:Object.freeze({id,bytes:receipt.bytes,sha256:receipt.sha256,triangles,meshes:names.length})};
    cache.set(id,asset);return asset;
  })();
  pending.set(id,promise);
  try{return await promise;}catch(error){pending.delete(id);throw error;}
}
export async function preloadHeroes(){return Promise.all(['stampead','turretina','snipeoff','gooey'].map(loadCharacter));}
export function characterMetadata(){return [...cache.values()].map(a=>a.metadata);}

// Original shared 512px weave/scuff/normal surfaces, not copied concept pixels.
function surface(family) {
  if(surfaces.has(family))return surfaces.get(family);
  const size=512,color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const cloth=family==='cloth',skin=family==='skin';
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4,n=((x*13+y*37+(x*y)%97)%31)/31;
    const weave=cloth?((x%6<2?-.06:.02)+(y%6<2?-.05:.02)):0;
    const seam=!skin&&(x%128<2||y%128<2)?-.13:0;
    const scratch=family==='metal'&&(x*7+y*3)%163===0?-.15:0;
    const v=Math.round(255*Math.max(.55,Math.min(1,.93+n*.07+weave+seam+scratch)));
    color[i]=color[i+1]=color[i+2]=v;color[i+3]=255;
    normal[i]=128+Math.round(Math.sin(x*(cloth?1.04:.13))*5);
    normal[i+1]=128+Math.round(Math.cos(y*(cloth?1.04:.17))*5);normal[i+2]=254;normal[i+3]=255;
  }
  const map=new THREE.DataTexture(color,size,size),normalMap=new THREE.DataTexture(normal,size,size);
  for(const texture of [map,normalMap]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;}
  map.colorSpace=THREE.SRGBColorSpace;
  const result={map,normalMap};surfaces.set(family,result);return result;
}
export function cloneCharacter(id,{shareGeometry=false}={}) {
  const asset=cache.get(id);if(!asset)throw new Error(`Character not preloaded: ${id}`);
  const group=asset.root.clone(true),geometryCopies=new Map(),materialCopies=new Map();
  group.traverse(o=>{
    if(!o.isMesh)return;
    if(!shareGeometry){
      if(!geometryCopies.has(o.geometry))geometryCopies.set(o.geometry,o.geometry.clone());
      o.geometry=geometryCopies.get(o.geometry);
    }
    const copy=material=>{
      if(!materialCopies.has(material)) {
        const m=material.clone(),name=m.name.toLowerCase();
        const family=/skin|face|ear|lip/.test(name)?'skin':/cloth|coat|cape|canvas|fabric|trouser/.test(name)?'cloth':/leather|strap|boot|pouch/.test(name)?'leather':m.metalness>.3?'metal':'rubber';
        const textures=surface(family);m.map=textures.map;m.normalMap=textures.normalMap;m.normalScale.setScalar(family==='skin'?.015:.06);m.needsUpdate=true;
        materialCopies.set(material,m);
      }
      return materialCopies.get(material);
    };
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
    o.castShadow=o.receiveShadow=true;
  });
  group.userData.model=asset.metadata;
  let disposed=false;
  return {group,metadata:asset.metadata,dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometryCopies.forEach(g=>g.dispose());materialCopies.forEach(m=>m.dispose());group.clear();}};
}
export function disposeCharacterAssets() {
  for(const asset of cache.values()) {
    const geometries=new Set(),materials=new Set();asset.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  for(const textures of surfaces.values())for(const texture of Object.values(textures))texture.dispose();
  cache.clear();pending.clear();surfaces.clear();
}
