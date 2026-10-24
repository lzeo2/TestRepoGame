import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

// The exact previously made snarl asset. No primitive stand-in is substituted.
export const SECRET_ASSET_URL = new URL('../assets/secret-cave-creature.glb', import.meta.url).href;
let template = null;
let loading = null;
let loadError = null;
const waiting = new Set();

export function secretAssetStatus() { return { ready: !!template, loading: !!loading, error: loadError }; }

export function prepareSecretTemplate(importedScene) {
  const wrapper = new THREE.Group();
  wrapper.name = 'Earlier snarling cave creature';
  wrapper.add(importedScene);
  const bounds = new THREE.Box3().setFromObject(wrapper);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x + size.y + size.z) || Math.min(size.x, size.y, size.z) <= 0) throw new Error('The secret GLB has invalid bounds.');
  // Preserve the creature's low, wide anatomy. Fit its footprint rather than
  // stretching a crouching animal upright to match the other creatures' height.
  const scale = Math.min(2.3 / size.y, 2.15 / size.x, 2.15 / size.z);
  const center = bounds.getCenter(new THREE.Vector3());
  importedScene.position.set(-center.x, -bounds.min.y, -center.z);
  wrapper.scale.setScalar(scale);
  wrapper.userData.baseY = 0;
  wrapper.userData.normalizedHeight = size.y * scale;
  wrapper.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      // One shared PBR set for every clone; preserve the GLB's original textures.
      material.envMapIntensity = 0.7;
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
        if (material[key]) material[key].anisotropy = 2;
      }
    }
  });
  return wrapper;
}

function install(root) {
  root.clear();
  const model = template.clone(true);
  root.add(model);
  root.userData.rig = model;
  root.userData.pendingAsset = false;
  root.userData.height = template.userData.normalizedHeight * root.scale.y;
  root.visible = true;
}

export function loadSecretCharacter(url = SECRET_ASSET_URL) {
  if (template) return Promise.resolve(template);
  if (loading) return loading;
  loadError = null;
  loading = new GLTFLoader().loadAsync(url).then(gltf => {
    template = prepareSecretTemplate(gltf.scene);
    for (const root of waiting) install(root);
    waiting.clear();
    loading = null;
    return template;
  }).catch(error => {
    loading = null;
    loadError = error;
    throw error;
  });
  return loading;
}

export function createSecretCharacter(scale = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  root.userData = { kind: 8, characterName: 'The Uninvited', characterType: 'secret', animatedParts: [], pendingAsset: !template };
  if (template) install(root);
  else { root.visible = false; waiting.add(root); }
  return root;
}

export function disposeSecretCharacter(root) {
  waiting.delete(root);
  root.removeFromParent();
  root.clear();
  root.userData = {};
  // Geometry, materials and texture maps remain cached for other instances.
}
