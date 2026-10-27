// Clean expansion bodies only. Supplier/operator-declared originals, not independently proven authorship.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';

import { EXPANSION_HERO_IDS } from './character-assets.mjs';
export const EXPANSION_RECEIPT_SHA256='e7718db920d875e631e421fdb5d97953152a78ac3dbc8a1f1a812d164b96db0f';
let receiptPending;
const check=(ok,message)=>{if(!ok)throw new Error(`Expansion ${message}`);};
const close=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Number.isFinite(v)&&Math.abs(v-b[i])<2e-5);
const vector=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
const allowed=id=>{if(typeof id!=='string'||!EXPANSION_HERO_IDS.includes(id))throw new RangeError('Unknown character');};

// Used before GLTFLoader: no remote resources, unsupported extensions, malformed buffers or nonfinite geometry.
export function inspectExpansionGLB(bytes) {
  check(bytes instanceof ArrayBuffer&&bytes.byteLength>=28&&bytes.byteLength<1000000,'GLB size');
  const view=new DataView(bytes),length=view.getUint32(12,true);
  check(view.getUint32(0,true)===0x46546c67&&view.getUint32(4,true)===2&&view.getUint32(8,true)===bytes.byteLength,'GLB header');
  check(length%4===0&&20+length+8<=bytes.byteLength&&view.getUint32(16,true)===0x4e4f534a,'JSON chunk');
  const end=28+length,binLength=view.getUint32(20+length,true);
  check(binLength%4===0&&end+binLength===bytes.byteLength&&view.getUint32(24+length,true)===0x004e4942,'BIN chunk');
  const d=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
  const noURI=value=>{if(value&&typeof value==='object'){check(!Object.hasOwn(value,'uri'),'URI forbidden');Object.values(value).forEach(noURI);}};
  noURI(d);
  check(d.asset?.version==='2.0'&&d.buffers?.length===1&&Number.isInteger(d.buffers[0].byteLength)&&d.buffers[0].byteLength>0&&binLength-d.buffers[0].byteLength>=0&&binLength-d.buffers[0].byteLength<=3,'embedded buffer');
  check(['images','textures','skins','animations'].every(k=>!d[k]?.length),'clean geometry only');
  check([...(d.extensionsUsed??[]),...(d.extensionsRequired??[])].every(x=>x==='KHR_materials_unlit'),'unsupported extension');
  for(const b of d.bufferViews??[])check(b.buffer===0&&Number.isInteger(b.byteLength)&&b.byteLength>0&&Number.isInteger(b.byteOffset??0)&&(b.byteOffset??0)>=0&&(b.byteOffset??0)+b.byteLength<=d.buffers[0].byteLength,'bufferView bounds');
  const arrays=(d.accessors??[]).map(a=>{
    const info={5126:[4,'getFloat32'],5123:[2,'getUint16'],5125:[4,'getUint32'],5121:[1,'getUint8']}[a.componentType];
    const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],b=d.bufferViews[a.bufferView];
    check(info&&n&&b&&!a.sparse&&!a.normalized&&Number.isInteger(a.count)&&a.count>0&&a.count<1000000,'accessor format');
    const [width,get]=info,start=a.byteOffset??0,stride=b.byteStride??n*width;
    check(Number.isInteger(start)&&start>=0&&start%width===0&&Number.isInteger(stride)&&stride>=n*width&&stride%width===0&&start+(a.count-1)*stride+n*width<=b.byteLength&&((b.byteOffset??0)+start)%width===0,'accessor bounds');
    return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>{
      const value=view[get](end+(b.byteOffset??0)+start+i*stride+j*width,true);check(Number.isFinite(value),'nonfinite accessor');return value;
    }));
  });
  let triangles=0;
  for(const mesh of d.meshes??[])for(const p of mesh.primitives??[]) {
    const a=d.accessors[p.attributes?.POSITION],positions=arrays[p.attributes?.POSITION],normal=arrays[p.attributes?.NORMAL];
    check((p.mode??4)===4&&!p.targets&&!p.extensions&&a?.componentType===5126&&a.type==='VEC3'&&normal?.length===positions?.length,'primitive format');
    for(const index of Object.values(p.attributes))check(arrays[index]?.length===positions.length,'attribute count');
    check(normal.every(row=>row.length===3&&Math.abs(row.reduce((sum,x)=>sum+x*x,0)-1)<.001),'normal length');
    const index=d.accessors[p.indices],indices=arrays[p.indices];
    check(index?.type==='SCALAR'&&[5121,5123,5125].includes(index.componentType)&&indices.length%3===0&&indices.every(([i])=>i>=0&&i<positions.length),'actual index range');
    check(Number.isInteger(p.material)&&p.material>=0&&p.material<d.materials?.length,'material index');
    triangles+=indices.length/3;
  }
  const names=new Set(),parents=new Map();
  for(const [i,n] of (d.nodes??[]).entries()) {
    check(typeof n.name==='string'&&!names.has(n.name),'unique node names');names.add(n.name);
    for(const [key,size] of [['translation',3],['rotation',4],['scale',3],['matrix',16]])if(n[key])check(n[key].length===size&&n[key].every(Number.isFinite),'finite transform');
    if(n.rotation)check(Math.abs(n.rotation.reduce((s,x)=>s+x*x,0)-1)<1e-5,'quaternion');
    if(n.scale)check(n.scale.every(x=>Math.abs(x)>1e-10),'singular scale');
    if(n.matrix)check(!n.translation&&!n.rotation&&!n.scale&&close([n.matrix[3],n.matrix[7],n.matrix[11],n.matrix[15]],[0,0,0,1]),'affine matrix');
    if(n.mesh!==undefined)check(Number.isInteger(n.mesh)&&!!d.meshes[n.mesh],'mesh index');
    for(const child of n.children??[]){check(Number.isInteger(child)&&!!d.nodes[child]&&!parents.has(child),'single-parent hierarchy');parents.set(child,i);}
  }
  const visited=new Set();
  const walk=i=>{check(d.nodes[i]&&!visited.has(i),'cycle/scene node');visited.add(i);for(const child of d.nodes[i].children??[])walk(child);};
  for(const i of d.scenes?.[d.scene??0]?.nodes??[]){check(!parents.has(i),'scene root parent');walk(i);}
  check(visited.size===d.nodes?.length&&visited.size>0&&!names.has('FX_ROOT'),'reachable clean nodes');
  check(d.materials?.length===4&&d.materials.every(m=>m.extensions?.KHR_materials_unlit&&m.pbrMetallicRoughness?.baseColorFactor?.length===4&&m.pbrMetallicRoughness.baseColorFactor.every(v=>Number.isFinite(v)&&v>=0&&v<=1)),'four unlit colors');
  return {document:d,triangles,parents};
}

export function validateExpansionSidecars(id,{document:d,triangles,parents},manifest,palette,rig,pin) {
  allowed(id);
  check(manifest.schema==='jank3d_hero_expansion_asset_v1'&&manifest.id===id&&manifest.model===id&&manifest.glb_sha256===pin.sha256&&manifest.glb_bytes===pin.bytes&&manifest.size_bytes===pin.bytes&&manifest.triangles===triangles&&manifest.tri_count_LOD0===triangles&&triangles===pin.triangles&&manifest.external_dependencies?.length===0&&manifest.files?.runtime==='model.glb','manifest schema/pins');
  check(palette.schema==='semantic_palette_v1'&&palette.model===id&&rig.schema==='rigid_parts_v2'&&rig.version===2&&rig.model===id&&rig.coordinate_system?.startsWith('glTF: metres, +Y up, -Z forward;'),'palette/rig schema');
  check(JSON.stringify(Object.keys(palette.slots).sort())===JSON.stringify(['accent','ink','manila','paper']),'semantic slots');
  const slots=Object.values(palette.slots).flatMap(slot=>slot.gltf_material_indices.map(index=>({name:slot.material_name,gltf_material_index:index,base_color_linear_rgba:slot.rgba_linear})));
  check(slots.length===4&&new Set(slots.map(s=>s.gltf_material_index)).size===4,'complete palette');
  for(const slot of slots){const m=d.materials[slot.gltf_material_index];check(m?.name===slot.name&&close(slot.base_color_linear_rgba,m.pbrMetallicRoughness.baseColorFactor),'linear palette');}
  check(JSON.stringify(manifest.material_slots)===JSON.stringify(d.materials.map(m=>m.name)),'material names');
  check(Array.isArray(rig.movable_nodes)&&rig.movable_nodes.length===pin.joints.length&&manifest.movable_nodes===pin.joints.length&&new Set(rig.movable_nodes.map(n=>n.name)).size===rig.movable_nodes.length&&JSON.stringify(manifest.rig_nodes)===JSON.stringify(rig.movable_nodes.map(n=>n.name)),'rig list');
  for(const joint of rig.movable_nodes) {
    const node=d.nodes[joint.gltf_node_index],parent=parents.get(joint.gltf_node_index);
    check(node?.name===joint.name&&(parent===undefined?null:d.nodes[parent].name)===joint.parent&&vector(joint.pivot_position)&&vector(joint.pivot_model_position)&&close(node.translation??[0,0,0],joint.pivot_position),'named joint parent/pivot');
    for(const field of ['rotation_deg','translation_m'])for(const axis of ['x','y','z']){const range=joint[field]?.[axis];check(range==='free'||(Array.isArray(range)&&range.length===2&&range.every(Number.isFinite)&&range[0]<=range[1]),'motion range');}
  }
  return slots;
}

export async function loadExpansionCharacter(id,{base,bytesAt,digest}) {
  allowed(id);
  const expansionBase=new URL('expansion40/',base);
  if(!receiptPending)receiptPending=(async()=>{
    const data=await bytesAt(new URL('intake-receipt.json',expansionBase));
    check(await digest(data)===EXPANSION_RECEIPT_SHA256,'central receipt integrity');
    const receipt=JSON.parse(new TextDecoder().decode(data));
    check(receipt.schema==='independent-jank40-intake-v1'&&JSON.stringify(Object.keys(receipt.heroes))===JSON.stringify(EXPANSION_HERO_IDS),'central receipt schema/allowlist');
    return receipt;
  })().catch(error=>{receiptPending=undefined;throw error;});
  const receipt=await receiptPending,pin=receipt.heroes[id].variants.clean;
  const files=await Promise.all(['model.glb','manifest.json','palette.json','rig.json'].map(async name=>{
    const bytes=await bytesAt(new URL(`${id}/${name}`,expansionBase)),expected=receipt.selected_files.find(f=>f.path===`${id}/${name}`);
    check(expected&&bytes.byteLength===expected.bytes&&await digest(bytes)===expected.sha256,`integrity ${id}/${name}`);
    return name==='model.glb'?bytes:JSON.parse(new TextDecoder().decode(bytes));
  }));
  const [bytes,manifest,palette,rig]=files,inspected=inspectExpansionGLB(bytes);
  const slots=validateExpansionSidecars(id,inspected,manifest,palette,rig,pin);
  check(bytes.byteLength===pin.bytes,'GLB byte pin');
  const gltf=await new GLTFLoader().parseAsync(bytes,'');
  gltf.scene.updateMatrixWorld(true);
  let triangles=0,meshes=0;
  const materials=new Set(),box=new THREE.Box3().makeEmpty(),vertex=new THREE.Vector3();
  gltf.scene.traverse(node=>{
    check(node.matrixWorld.elements.every(Number.isFinite),'finite world matrix');
    if(!node.isMesh)return;
    const geometry=node.geometry,p=geometry.attributes.position;
    check(p&&geometry.attributes.normal?.count===p.count,'loaded attributes');
    for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(node.matrixWorld);check(vertex.toArray().every(Number.isFinite),'finite world vertex');box.expandByPoint(vertex);}
    triangles+=geometry.index.count/3;meshes++;
    for(const m of Array.isArray(node.material)?node.material:[node.material]){check(m.isMeshBasicMaterial,'loaded unlit material');materials.add(m.name);}
  });
  check(triangles===pin.triangles&&meshes===pin.mesh_nodes&&materials.size===4,'loaded geometry counts');
  const bodyBounds=Object.freeze({min:Object.freeze(box.min.toArray()),max:Object.freeze(box.max.toArray())});
  check(close(bodyBounds.min,pin.body_bounds.min)&&close(bodyBounds.max,pin.body_bounds.max),'exact body bounds pin');
  for(const joint of rig.movable_nodes) {
    const part=gltf.scene.getObjectByName(joint.name);let descendants=0;
    part?.traverse(n=>{if(n.isMesh)descendants++;});
    check(part&&descendants>0&&close(part.getWorldPosition(vertex).toArray(),joint.pivot_model_position),'real joint descendants/world pivot');
  }
  return {root:gltf.scene,rig,palette:{...palette,material_slots:slots},textured:false,
    metadata:Object.freeze({id,bytes:pin.bytes,sha256:pin.sha256,triangles,meshes,origin:'operator-external',
      provenance:'Supplier/operator-declared original; creation history not independently verified',
      movableNodes:rig.movable_nodes.length,paletteSlots:slots.length,generatedUV:[],unmatchedPaletteSlots:[],unlit:true,bodyBounds})};
}
