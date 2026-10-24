import { LoadingManager } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

// r160 addons from HEAD:Games/Jankolock/vendor, used with the unchanged r186 core.
// Their complete upstream MIT notice is retained in each vendor file.
export const MODEL_DIRECTORIES = Object.freeze({
  residential: 'residential_row', commercial: 'commercial', industrial: 'industrial_shed',
  power: 'power_plant', water: 'water_tower', police: 'police_station', fire: 'fire_station',
  park: 'park_lot', townhall: 'town_hall', wall: 'wall_segment', watchtower: 'watchtower',
  citizen: 'citizen', zombie: 'zombie', car: 'compact_car', tree: 'tree_deciduous',
  patrol_car: 'patrol_car', utility_car: 'utility_car',
});
export const EXTERNAL_DIRECTORIES = Object.freeze([...Object.values(MODEL_DIRECTORIES), 'terrain_water_materials']);
const base = new URL('./models/', import.meta.url);

export function resourceURL(value, relativeTo = base) {
  const url = new URL(value, relativeTo);
  if (url.protocol === 'data:') return url.href;
  if (url.protocol === 'blob:' && url.origin === base.origin) return url.href;
  if (['http:', 'https:'].includes(url.protocol) && url.origin === base.origin && !url.username && !url.password) return url.href;
  throw new Error(`Nonlocal model resource rejected: ${url.protocol}//${url.host}`);
}
async function localFetch(url) {
  const response = await fetch(resourceURL(url), { redirect: 'error', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Model resource HTTP ${response.status}: ${url}`);
  return response;
}

// No process-global GLTF cache: one load owns its resources. Kits share those
// resources between all their instances; independent consumers never lose theirs.
export function disposeExternalModels(models) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  for (const gltf of models) for (const scene of gltf.scenes || [gltf.scene]) scene?.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) {
    for (const image of Array.isArray(texture.source?.data) ? texture.source.data : [texture.source?.data]) if (image?.close) images.add(image);
    texture.dispose();
  }
  for (const image of images) image.close();
}

export async function loadExternalModel(directory, lod = 0) {
  if (!EXTERNAL_DIRECTORIES.includes(directory)) throw new RangeError('Unknown external model directory');
  if (![0, 1, 2].includes(lod)) throw new RangeError('LOD must be 0, 1 or 2');
  // This separate material sample has no supplied LOD1/2. Never silently substitute.
  if (directory === 'terrain_water_materials' && lod !== 0) throw new RangeError('Material set has only LOD0');
  const folder = new URL(`${directory}/`, base);
  const filename = lod === 0 ? 'model.glb' : `model_LOD${lod}.glb`;
  const [bytes, rig, assembly] = await Promise.all([
    localFetch(new URL(filename, folder)).then(r => r.arrayBuffer()),
    localFetch(new URL('rig.json', folder)).then(r => r.json()),
    directory === 'park_lot' ? localFetch(new URL('assembly.json', folder)).then(r => r.json()) : null,
  ]);
  const header = new DataView(bytes);
  if (bytes.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
      header.getUint32(8, true) !== bytes.byteLength || header.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid GLB header');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, header.getUint32(12, true))));
  const resources = new Map(), ownedURLs = [];
  let gltf;
  try {
    // Prefetch declared external resources with redirects disabled, so even a
    // same-origin redirect cannot escape to a third party through Three loaders.
    for (const item of [...(json.buffers || []), ...(json.images || [])]) if (item.uri) {
      const url = resourceURL(item.uri, folder);
      if (!resources.has(url)) {
        const response = await localFetch(url), objectURL = URL.createObjectURL(await response.blob());
        resources.set(url, objectURL); ownedURLs.push(objectURL);
      }
    }
    const manager = new LoadingManager(), failures = [];
    manager.setURLModifier(value => {
      try {
        const url = resourceURL(value, folder);
        if (resources.has(url)) return resources.get(url);
        if (url.startsWith('blob:') || url.startsWith('data:')) return url;
        throw new Error('Undeclared model resource rejected');
      } catch (error) { failures.push(value); throw error; }
    });
    // GLTFLoader normally logs failed textures and substitutes null. This kit
    // must fail readiness instead of silently dropping authored PBR maps.
    manager.onError = url => failures.push(url);
    gltf = await new GLTFLoader(manager).parseAsync(bytes, folder.href);
    if (failures.length) throw new Error(`Model texture load failed (${failures.length})`);
    gltf.scene.userData.external = { directory, lod, rig, assembly };
    // Scene resources own disposal; completed parser caches are no longer needed.
    delete gltf.parser;
    return gltf;
  } catch (error) {
    if (gltf) disposeExternalModels([gltf]);
    throw error;
  } finally {
    for (const url of ownedURLs) URL.revokeObjectURL(url);
  }
}
