import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';

export const EXPANSION_HERO_IDS=Object.freeze([
  'ballista','bindery','blotting-paper','calendar','carbon-copy','carbon-struct','cassette','claude-lampe',
  'curriculum','department','draftsman','envelope','filter','fridge','holepuncher','ink-station','inktracer','intercom',
  'kompressor','laminate','meter','notarize','odometer','office-plants','outbox','paper-jam','photocopy','phrase-marker',
  'regolith','rewind','shred','std-lib','stencil','sticky-note','transcriber','transit','value-error','vortex-prime','weigh','whitespace'
]);

const cache=new Map(),pending=new Map(),surfaces=new Map();
// Operator-delivered rigid assemblies supersede the larger procedural fallback budgets.
// Exact external counts/SHA/palette/rig also have to agree with their delivery manifest.
export const TRIO_HERO_IDS=Object.freeze(['spoollash','checkmate-regent','prism-warden']);
const entries={stampead:[1,250000],turretina:[1,250000],snipeoff:[1,250000],gooey:[1,250000],deployed_stapler:[1,80000],trooper:[15000,40000],'ribbon-seraph':[17888,17888],spoollash:[19448,19448],'checkmate-regent':[18148,18148],'prism-warden':[18454,18454]};
const externalName=id=>id==='gooey'?'gooey_sticky':id;
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
  if(typeof id!=='string'||(!Object.hasOwn(entries,id)&&!EXPANSION_HERO_IDS.includes(id)))throw new RangeError('Unknown character');
  if(cache.has(id))return cache.get(id);
  if(pending.has(id))return pending.get(id);
  const promise=(async()=>{
    if(EXPANSION_HERO_IDS.includes(id)) {
      const {loadExpansionCharacter}=await import('./character-expansion.mjs');
      const asset=await loadExpansionCharacter(id,{base,bytesAt,digest});
      cache.set(id,asset);return asset;
    }
    const jsonHashes=new Map();
    const jsonAt=async name=>{const bytes=await bytesAt(new URL(`${id}/${name}.json`,base));jsonHashes.set(name,await digest(bytes));return JSON.parse(new TextDecoder().decode(bytes));};
    const [bytes,receipt,manifest,palette,rig]=await Promise.all([
      bytesAt(new URL(`${id}/model.glb`,base)),jsonAt('receipt'),
      ...(id==='trooper'?[null,null,null]:['manifest','palette','rig'].map(jsonAt))
    ]);
    if(bytes.byteLength>=8388608||bytes.byteLength!==receipt.bytes||receipt.url!==`models/${id}/model.glb`||await digest(bytes)!==receipt.sha256)throw new Error(`Character integrity mismatch: ${id}`);
    if(bytes.byteLength<20)throw new Error('Truncated character GLB');
    const header=new DataView(bytes),length=header.getUint32(12,true);
    if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==bytes.byteLength||header.getUint32(16,true)!==0x4e4f534a||length>bytes.byteLength-20)throw new Error('Invalid character GLB');
    const document=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
    const trio=TRIO_HERO_IDS.includes(id),textured=id==='ribbon-seraph'||trio;
    const imageCount=id==='prism-warden'?24:18;
    if(document.buffers?.length!==1||document.buffers.some(b=>b.uri)||document.images?.some(image=>image.uri)||(!textured&&document.images?.length))throw new Error('Character GLB must be self-contained geometry/PBR; external resources forbidden');
    if(textured&&(document.images?.length!==imageCount||document.textures?.length!==imageCount||document.images.some(image=>image.mimeType!=='image/png'||!Number.isInteger(image.bufferView)||!document.bufferViews?.[image.bufferView])||document.skins?.length||document.animations?.length))throw new Error(`Invalid embedded PBR asset: ${id}`);
    let materialSlots;
    if(manifest) {
      for(const name of ['manifest','palette','rig'])if(receipt.metadataSHA256?.[`${name}.json`]!==jsonHashes.get(name))throw new Error(`External sidecar integrity mismatch: ${id}/${name}`);
      if(trio) {
        if(manifest.model!==id||manifest.sha256!==receipt.sha256||manifest.size_bytes!==bytes.byteLength||manifest.tri_count_LOD0!==receipt.triangles||manifest.texture_resolution!==512||!manifest.coordinate_system?.startsWith('glTF: metres, +Y up, -Z forward;')||manifest.external_dependencies?.length!==0)throw new Error(`External manifest mismatch: ${id}`);
      } else if(textured) {
        const variant=manifest.variant_stats?.['model.glb'];
        if(manifest.schema!=='jankolock_realistic_asset_v1'||manifest.model!==id||variant?.sha256!==receipt.sha256||variant.size_bytes!==bytes.byteLength||variant.tri_count!==receipt.triangles||manifest.size_bytes!==bytes.byteLength||manifest.tri_count_LOD0!==receipt.triangles||manifest.limits?.max_glb_bytes!==8000000||manifest.limits?.max_texture_dimension!==512||bytes.byteLength>=8000000||!manifest.coordinate_system.startsWith('glTF: metres, +Y up, -Z forward;'))throw new Error(`External manifest mismatch: ${id}`);
      } else if(manifest.model!==externalName(id)||manifest.sha256!==receipt.sha256||manifest.size_bytes!==bytes.byteLength||manifest.tri_count_LOD0!==receipt.triangles||!Number.isInteger(manifest.constraints?.GLB_cap_bytes)||manifest.constraints.GLB_cap_bytes<=0||manifest.constraints.units!=='metres'||manifest.constraints.glb_up!=='Y'||manifest.constraints.forward_glb!=='-Z'||bytes.byteLength>=Math.min(8388608,manifest.constraints.GLB_cap_bytes))throw new Error(`External manifest mismatch: ${id}`);
      if(palette.schema!==(textured?'semantic_pbr_palette_v1':'palette_v2')||rig.schema!=='rigid_parts_v2'||rig.version!==2||palette.model!==manifest.model||rig.model!==manifest.model)throw new Error(`External sidecar mismatch: ${id}`);
      materialSlots=textured?Object.values(palette.slots).flatMap(slot=>slot.gltf_material_indices.map(index=>({name:slot.material_name,gltf_material_index:index,base_color_linear_rgba:slot.rgba_linear,metallic:slot.metallic,roughness:slot.roughness}))):palette.material_slots;
      if(textured&&(materialSlots.length!==document.materials.length||new Set(materialSlots.map(slot=>slot.gltf_material_index)).size!==document.materials.length))throw new Error(`Incomplete PBR palette: ${id}`);
      for(const slot of materialSlots) {
        const color=slot.base_color_linear_rgba;
        if(document.materials[slot.gltf_material_index]?.name!==slot.name||!Array.isArray(color)||color.length!==4||!color.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||![slot.metallic,slot.roughness].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error(`Invalid palette slot: ${id}/${slot.name}`);
      }
    }
    const gltf=await new GLTFLoader().parseAsync(bytes,'');
    let triangles=0;const names=[],materialNames=new Set(),generatedUV=[];
    gltf.scene.traverse(o=>{
      if(!o.isMesh)return;
      const geometry=o.geometry,position=geometry.attributes.position;
      if(!geometry.getAttribute('uv')) {
        geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new THREE.Vector3());
        const axes=[0,1,2].sort((a,b)=>size.getComponent(b)-size.getComponent(a)),uv=new Float32Array(position.count*2);
        for(let i=0;i<position.count;i++)for(let j=0;j<2;j++)uv[i*2+j]=(position.getComponent(i,axes[j])-box.min.getComponent(axes[j]))/Math.max(.001,size.getComponent(axes[j]));
        geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));generatedUV.push(o.name);
      }
      triangles+=(geometry.index?.count??position.count)/3;names.push(o.name);
      for(const m of Array.isArray(o.material)?o.material:[o.material])materialNames.add(m.name);
    });
    const [minimum,maximum]=entries[id];
    if(triangles<minimum||triangles>maximum||triangles!==receipt.triangles)throw new Error(`Character triangle mismatch: ${id}/${triangles}`);
    if(rig) {
      if(new Set(rig.movable_nodes.map(n=>n.name)).size!==rig.movable_nodes.length||JSON.stringify(rig.movable_nodes.map(n=>n.name))!==JSON.stringify(manifest.rig_nodes))throw new Error(`External rig list mismatch: ${id}`);
      gltf.scene.updateMatrixWorld(true);
      for(const node of rig.movable_nodes) {
        const part=gltf.scene.getObjectByName(node.name),vector=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
        if(!vector(node.pivot_position)||!vector(node.pivot_model_position)||!part||(node.parent!==null&&part.parent?.name!==node.parent)||part.position.distanceTo(new THREE.Vector3(...node.pivot_position))>1e-4||part.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...node.pivot_model_position))>1e-4)throw new Error(`External rig pivot mismatch: ${id}/${node.name}`);
      }
    }
    const asset={root:gltf.scene,rig,palette:palette?{...palette,material_slots:materialSlots}:null,textured,metadata:Object.freeze({id,bytes:receipt.bytes,sha256:receipt.sha256,triangles,meshes:names.length,origin:manifest?'operator-external':'procedural',movableNodes:rig?.movable_nodes.length??0,paletteSlots:materialSlots?.length??0,generatedUV,unmatchedPaletteSlots:palette?[...materialNames].filter(n=>!materialSlots.some(s=>s.name===n)):[]})};
    cache.set(id,asset);return asset;
  })();
  pending.set(id,promise);
  try{return await promise;}catch(error){pending.delete(id);throw error;}
}
export async function preloadHeroes(){return Promise.all(['stampead','turretina','snipeoff','gooey','deployed_stapler'].map(loadCharacter));}
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
        const slot=asset.palette?.material_slots.find(s=>s.name===material.name);
        let m;
        if(asset.metadata.unlit) {
          // Flat expansion fills have no PBR/normal-scale contract or procedural replacement maps.
          m=new THREE.MeshBasicMaterial().copy(material);
          m.color.setRGB(...slot.base_color_linear_rgba.slice(0,3),THREE.LinearSRGBColorSpace);
          m.opacity=slot.base_color_linear_rgba[3];m.transparent=m.opacity<1;
          m.userData.paletteSlot=slot.name;
        } else {
          m=material.clone();const name=m.name.toLowerCase();
          // Embedded PBR maps already carry the supplied palette factors.
          if(slot&&!asset.textured){m.color.setRGB(...slot.base_color_linear_rgba.slice(0,3),THREE.LinearSRGBColorSpace);m.opacity=slot.base_color_linear_rgba[3];m.transparent=m.transparent||m.opacity<1;m.metalness=slot.metallic;m.roughness=slot.roughness;}
          const family=/skin|face|ear|lip|eye_white/.test(name)?'skin':/paper|folder/.test(name)?'paper':/cloth|coat|cape|canvas|fabric|trouser|audit_navy|postroom_oxblood|engineer_teal/.test(name)?'cloth':/leather|strap|boot|pouch/.test(name)?'leather':m.metalness>.3?'metal':'rubber';
          m.userData.paletteSlot=slot?.name??null;m.userData.surfaceFamily=family;
          if(!asset.textured){const textures=surface(family);m.map=textures.map;m.normalMap=textures.normalMap;m.normalScale.setScalar(family==='skin'?.015:.06);}
        }
        m.needsUpdate=true;
        materialCopies.set(material,m);
      }
      return materialCopies.get(material);
    };
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
    o.castShadow=o.receiveShadow=true;
  });
  group.userData.model=asset.metadata;
  let disposed=false;
  return {group,metadata:asset.metadata,rig:asset.rig,dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometryCopies.forEach(g=>g.dispose());materialCopies.forEach(m=>m.dispose());group.clear();}};
}
export function disposeCharacterAssets() {
  for(const asset of cache.values()) {
    const geometries=new Set(),materials=new Set();asset.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    const textures=new Set();
    materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);});
    textures.forEach(t=>{t.dispose();t.image?.close?.();});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  for(const textures of surfaces.values())for(const texture of Object.values(textures))texture.dispose();
  cache.clear();pending.clear();surfaces.clear();
}
