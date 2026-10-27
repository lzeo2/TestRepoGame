// Original scene adapter; no renderer, simulation, clock or network implementation.
import { createFleetRig, VIEW_LIMITS } from './fleet-rig.mjs';

function resourcesOf(object, resources) {
  object.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material ?? [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
}

/**
 * assets: [{id, url, descriptor}], units: [{id, modelId}]. IDs are FC IDs.
 * Units without modelId remain unmodelled; unknown/duplicate IDs reject.
 * baseUrl is an absolute local asset base (normally new URL('../', import.meta.url)).
 * load(url) must return a fresh, detached GLTFLoader result, transferring ownership
 * of its scenes/resources. Do not supply a cache shared with another view/owner.
 * A rejected load must clean its own resources that it never returned to us.
 * Caller scene/resources remain owned by the caller. Loaded rigid clones share
 * owned mesh resources. Three 0.186 WebGPURenderer's StandardNodeLibrary handles
 * their existing standard/physical materials, retaining PBR factors and maps.
 * update takes ONLY the authenticated faction snapshot; reset hides/restores the
 * rig. Both reject after dispose; dispose is idempotent, including after errors.
 * No change to the caller's generic fleet, lights, environment or renderer.
 */
export async function createLocalFleetView(THREE, { scene, team, assets, units, baseUrl, load }) {
  if (THREE?.REVISION !== '186' || !scene?.isObject3D || ![0, 1].includes(team) || typeof load !== 'function')
    throw new TypeError('Three 0.186, scene, authenticated faction and loader required');
  if (!Array.isArray(assets) || assets.length > VIEW_LIMITS.units || !Array.isArray(units) || units.length > VIEW_LIMITS.units)
    throw new TypeError('Bounded assets and units required');
  const base = new URL(baseUrl);
  if (!['http:', 'https:', 'file:'].includes(base.protocol) || base.username || base.password)
    throw new TypeError('Local asset base required');
  const models = new Map(), ids = new Set();
  for (const asset of assets) {
    if (typeof asset?.id !== 'string' || !asset.id || models.has(asset.id) || typeof asset.url !== 'string' || !asset.url)
      throw new TypeError('Invalid or duplicate asset ID/URL');
    const url = new URL(asset.url, base);
    if (url.origin !== base.origin || url.protocol !== base.protocol || url.host !== base.host || url.username || url.password)
      throw new TypeError('External asset URL rejected');
    const descriptor = structuredClone(asset.descriptor);
    if (!descriptor?.objective_only || descriptor.player_vehicle_kind !== null || !Array.isArray(descriptor.articulation))
      throw new TypeError('Objective-only descriptor required');
    models.set(asset.id, { url: url.href, descriptor });
  }
  const bindings = units.map(unit => {
    if (typeof unit?.id !== 'string' || !unit.id || ids.has(unit.id) ||
        (unit.modelId !== undefined && !models.has(unit.modelId)))
      throw new TypeError('Invalid, duplicate or unknown unit/model ID');
    ids.add(unit.id);
    return { id: unit.id, modelId: unit.modelId };
  });
  function identityFrame() {
    scene.updateWorldMatrix(true, false);
    const identity = new THREE.Matrix4().elements;
    if (scene.matrixWorld.elements.some((n, i) => !Number.isFinite(n) || Math.abs(n - identity[i]) > 1e-8))
      throw new TypeError('Fleet scene must share the authority world frame');
  }
  identityFrame();
  const callerResources = new Set(), owned = new Set();
  resourcesOf(scene, callerResources);
  for (const value of [scene.background, scene.environment]) if (value?.isTexture) callerResources.add(value);
  let rig, disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const errors = [], attempt = action => { try { action(); } catch (error) { errors.push(error); } };
    attempt(() => rig?.dispose());
    const resources = [...owned];
    owned.clear(); models.clear(); callerResources.clear();
    for (const resource of resources) attempt(() => resource.dispose());
    if (errors.length) throw new AggregateError(errors, 'Local fleet cleanup failed');
  }
  try {
    // Sequential loading means no outstanding completion can escape failed setup cleanup.
    for (const model of models.values()) {
      const gltf = await load(model.url);
      const scenes = new Set([gltf?.scene, ...(gltf?.scenes ?? [])]);
      for (const object of scenes) if (object?.isObject3D && !object.parent) {
        const resources = new Set();
        resourcesOf(object, resources);
        for (const resource of resources) if (!callerResources.has(resource)) owned.add(resource);
      }
      if ([...scenes].some(object => !object?.isObject3D || object.parent))
        throw new TypeError('Fresh detached GLTF scenes required');
      model.object = gltf.scene;
      model.object.traverse(node => {
        if (node.isSkinnedMesh) throw new TypeError('Only inspected rigid fleet assets supported');
      });
    }
    identityFrame(); // Caller may have moved the scene during asynchronous loading.
    rig = createFleetRig(THREE, { parent: scene, team });
    for (const unit of bindings) if (unit.modelId !== undefined) {
      const model = models.get(unit.modelId);
      rig.bindUnit(unit.id, model.object.clone(true), model.descriptor);
    }
    return Object.freeze({ root: rig.root, update: rig.update, reset: rig.reset, dispose });
  } catch (error) {
    try { dispose(); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Local fleet setup and cleanup failed'); }
    throw error;
  }
}
