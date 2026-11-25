import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {clone} from '../vendor/addons/utils/SkeletonUtils.js';

export const MODEL_FILES=Object.freeze({
  soldier:'FactionA_Soldier_LOD0.glb',
  tank:'faction_a_tank_lod0.glb',
  jet:'A_Kestrel_multirole.glb',
  ship:'faction_a_patrol_lod0.glb'
});

// Instances own cloned materials/skeletons; templates alone own shared geometry/textures.
function release(object,shared=false) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set(),images=new Set();
  object.traverse(node=>{
    if(shared && node.geometry)geometries.add(node.geometry);
    if(node.skeleton)skeletons.add(node.skeleton);
    for(const mat of node.material ? (Array.isArray(node.material)?node.material:[node.material]) : []) {
      materials.add(mat);
      if(shared)for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);
    }
  });
  for(const skeleton of skeletons)skeleton.dispose();
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
  for(const texture of textures){if(texture.image)images.add(texture.image);texture.dispose();}
  for(const image of images)image.close?.();
}

export function createDeliveredActor(gltf,kind,team) {
  const object=clone(gltf.scene),materials=new Map(),color=new T.Color(team===0?0x509ade:0xd26d54);
  const tint={soldier:/^(Uniform|Armor|Badge)$/,tank:/^paint_/,jet:/_(paint|ochre)$/,ship:/^naval$/}[kind];
  object.traverse(node=>{
    if(!node.material)return;
    const copy=source=>{
      if(!materials.has(source)) {
        const mat=source.clone();
        if(tint?.test(source.name))mat.color.lerp(color,.8);
        materials.set(source,mat);
      }
      return materials.get(source);
    };
    node.material=Array.isArray(node.material)?node.material.map(copy):copy(node.material);
  });
  const mixer=kind==='soldier'?new T.AnimationMixer(object):null;
  const actions=new Map();
  if(mixer)for(const clip of gltf.animations)actions.set(clip.name,mixer.clipAction(clip));
  const yaw=object.getObjectByName(kind==='tank'?'turret_yaw':'deck_gun_yaw');
  const pitch=object.getObjectByName(kind==='tank'?'cannon_pitch':'deck_gun_pitch');
  let action=null,disposed=false;
  return {object,update(e,dt,walking){
    if(disposed)return;
    if(mixer && dt>0) {
      const next=e.alive ? actions.get(walking?'walk_in_place':'idle_breath') : null;
      if(next!==action){action?.fadeOut(.15);next?.reset().fadeIn(.15).play();action=next;}
      mixer.update(dt);
    }
    if(yaw)yaw.rotation.y=(e.aimYaw??e.yaw)-e.yaw;
    if(pitch)pitch.rotation.x=e.aimPitch??0;
  },dispose(){
    if(disposed)return;disposed=true;
    if(mixer){mixer.stopAllAction();mixer.uncacheRoot(object);}
    object.removeFromParent();release(object);
  }};
}

export function createDeliveredModels() {
  const templates=new Map(),loader=new GLTFLoader();let disposed=false;
  for(const [kind,file] of Object.entries(MODEL_FILES)) {
    const url=new URL('../assets/models/'+file,import.meta.url);
    loader.loadAsync(url.href).then(gltf=>{
      if(disposed)release(gltf.scene,true);
      else templates.set(kind,gltf);
    }).catch(error=>console.warn(`Delivered ${kind} unavailable; retaining blockout.`,error));
  }
  return {instantiate(kind,team){
    const gltf=templates.get(kind);
    return !disposed && gltf ? createDeliveredActor(gltf,kind,team) : null;
  },dispose(){
    if(disposed)return;disposed=true;
    for(const gltf of templates.values())release(gltf.scene,true);
    templates.clear();
  }};
}
