import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { BY_ID, OPTIONAL_HIDDEN_SPECIES } from './data.js';

// The core owns movement, encounters and the animation clock. This module only draws.
export function createView(canvas, { onCheckpoint = () => {}, reducedMotion = false } = {}) {
  let renderer;
  try {
    const context = canvas.getContext('webgl', { alpha: false, antialias: true });
    if (!context) throw new Error('WebGL 1 is unavailable');
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  } catch (error) {
    throw new Error(`Foldwild 3D view unavailable: ${error.message}`);
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eee9d8');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 90);
  scene.add(new THREE.HemisphereLight(0xfff8e9, 0x727965, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-5, 10, 6);
  scene.add(sun);
  const root = new THREE.Group();
  scene.add(root);
  const loader = new GLTFLoader();
  const modelPromises = new Map();
  const activeEntries = [];
  const loaded = new Set();
  const failures = new Set();
  const geometries = new Map();
  const materials = new Map();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const rayPoint = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let generation = 0, disposed = false, mode = 'world', frames = 0;
  let points = [], player = null, yaw = 0, effect = null, pointer = null;
  let playerPosition = new THREE.Vector3();
  const hiddenAvailable = Boolean(OPTIONAL_HIDDEN_SPECIES &&
    typeof OPTIONAL_HIDDEN_SPECIES.id === 'string' && validModelPath(OPTIONAL_HIDDEN_SPECIES.model));

  function validModelPath(path) {
    return typeof path === 'string' && /^models\/[a-zA-Z0-9_/-]+\.glb$/.test(path) && !path.includes('..');
  }
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
    return materials.get(color);
  }
  function geometry(kind) {
    if (!geometries.has(kind)) {
      const value = kind === 'cone' ? new THREE.ConeGeometry(1, 1, 5) :
        kind === 'rock' ? new THREE.IcosahedronGeometry(1, 0) :
        kind === 'pad' ? new THREE.CylinderGeometry(1, 1, 1, 8) : new THREE.BoxGeometry(1, 1, 1);
      geometries.set(kind, value);
    }
    return geometries.get(kind);
  }
  function shape(parent, kind, color, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(geometry(kind), material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  function human(color) {
    const group = new THREE.Group();
    shape(group, 'box', color, 0, 0.77, 0, 0.48, 0.65, 0.3);
    shape(group, 'box', '#bc916b', 0, 1.23, 0, 0.29, 0.29, 0.29);
    shape(group, 'box', '#282820', 0, 1.43, 0, 0.54, 0.12, 0.42);
    shape(group, 'box', '#383a3a', -0.14, 0.23, 0, 0.18, 0.46, 0.22);
    shape(group, 'box', '#383a3a', 0.14, 0.23, 0, 0.18, 0.46, 0.22);
    return group;
  }
  function disposeModel(base) {
    const resources = new Set();
    base.traverse(node => {
      if (!node.isMesh) return;
      resources.add(node.geometry);
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
        resources.add(mat);
        for (const value of Object.values(mat)) if (value?.isTexture) resources.add(value);
      }
    });
    for (const resource of resources) resource.dispose();
  }
  function release(entry) {
    entry.refs--;
    if (entry.retired && entry.refs === 0 && entry.base) {
      disposeModel(entry.base);
      entry.base = null;
    }
  }
  function acquire(path) {
    let entry = modelPromises.get(path);
    if (entry) modelPromises.delete(path);
    else {
      entry = { refs: 0, retired: false, base: null, promise: null };
      entry.promise = loader.loadAsync(new URL(path, import.meta.url).href).then(gltf => {
        entry.base = gltf.scene;
        return gltf.scene;
      });
    }
    entry.refs++;
    modelPromises.set(path, entry);
    // Clones share resources. Evicted entries retire only after their last user releases them.
    while (modelPromises.size > 12) {
      const [oldPath, old] = modelPromises.entries().next().value;
      modelPromises.delete(oldPath);
      old.retired = true;
      if (old.refs === 0 && old.base) { disposeModel(old.base); old.base = null; }
    }
    return entry;
  }
  function reset(nextMode) {
    generation++;
    mode = nextMode;
    root.clear();
    for (const entry of activeEntries) release(entry);
    activeEntries.length = 0;
    loaded.clear();
    failures.clear();
    points = [];
    player = null;
    effect = null;
    pointer = null;
    camera.fov = 45;
    camera.updateProjectionMatrix();
    return generation;
  }
  function reportFailure(id, reason) {
    failures.add(`${id}: ${reason}`);
    const message = document.getElementById('message');
    if (message) message.textContent = `3D model unavailable. Marker used instead. ${[...failures].join('; ')}`;
  }
  async function creature(id, x, z, rotation, token) {
    const species = BY_ID[id] || (hiddenAvailable && OPTIONAL_HIDDEN_SPECIES.id === id ? OPTIONAL_HIDDEN_SPECIES : null);
    let entry;
    try {
      if (!species || !validModelPath(species.model)) throw new Error('no valid local model descriptor');
      entry = acquire(species.model);
      const base = await entry.promise;
      if (disposed || generation !== token) { release(entry); return; }
      const model = base.clone(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) throw new Error('empty or invalid model bounds');
      const center = bounds.getCenter(new THREE.Vector3());
      const frame = new THREE.Group();
      const target = species.tier === 'boss' ? 2.65 : species.stage >= 3 ? 1.95 : 1.45;
      const scale = THREE.MathUtils.clamp(target / extent, 0.25, 5);
      model.position.set(-center.x, -bounds.min.y, -center.z);
      const scaled = new THREE.Group();
      scaled.add(model);
      scaled.scale.setScalar(scale);
      frame.add(scaled);
      frame.position.set(x, 0.08, z);
      frame.rotation.y = rotation;
      root.add(frame);
      activeEntries.push(entry);
      loaded.add(species.model);
    } catch (error) {
      if (entry) release(entry);
      if (disposed || generation !== token) return;
      reportFailure(id, error.message);
      shape(root, 'cone', '#b98040', x, 0.55, z, 0.55, 1, 0.55);
    }
  }
  function terrain(region, battle = false) {
    const palette = [
      { ground: '#879867', stone: '#c7c0a7', leaves: '#506446' },
      { ground: '#c5b285', stone: '#afa58c', leaves: '#697a56' },
      { ground: '#b29476', stone: '#8c7965', leaves: '#6c6b49' }
    ][region] || { ground: '#879867', stone: '#c7c0a7', leaves: '#506446' };
    shape(root, 'box', palette.ground, 0, -0.2, 0, 28, 0.4, 20);
    shape(root, 'box', '#d6c9a9', 0, 0.012, 0, battle ? 9 : 3, 0.025, battle ? 6 : 20);
    if (!battle) shape(root, 'box', '#d6c9a9', 0, 0.014, -2, 21, 0.025, 2.2);
    if (region === 1) shape(root, 'box', '#527d96', 10.5, 0.01, 0, 5, 0.03, 20);
    const trees = [[-8, -7], [-11, -2], [-8, 5], [7, -7], [11, 5], [6, 7]];
    for (const [x, z] of trees) {
      shape(root, 'box', '#66513d', x, 0.7, z, 0.35, 1.4, 0.35);
      shape(root, 'cone', palette.leaves, x, 2.1, z, 1.65, 2.2, 1.65);
    }
    for (const [x, z, height] of [[-12, -8, 2.5], [12, -8, 3], [-12, 8, 1.5], [8, 8, 2]]) {
      shape(root, 'rock', palette.stone, x, height / 2, z, 1.8, height, 1.4);
    }
  }
  function cameraPosition(instant = false, dt = 0) {
    if (mode === 'battle') {
      desiredCamera.set(0, 3, 7);
      lookAt.set(0, 0.6, 0);
    } else {
      desiredCamera.set(playerPosition.x + Math.sin(yaw) * 8, 5, playerPosition.z + Math.cos(yaw) * 8);
      lookAt.set(playerPosition.x, 0.7, playerPosition.z);
    }
    camera.position.lerp(desiredCamera, instant || reducedMotion ? 1 : 1 - Math.exp(-dt * 7));
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
  }
  async function showWorld({ region = 0, position = { x: 0, z: 4 }, points: worldPoints = [] } = {}) {
    if (disposed) return;
    const token = reset('world');
    terrain(region);
    player = human('#365a74');
    root.add(player);
    setPlayerPosition(position.x, position.z);
    cameraPosition(true);
    let wildCount = 0, npcShown = false;
    const pending = [];
    points = worldPoints.filter(point => point && (typeof point.id === 'string' || Number.isFinite(point.id)) &&
      Number.isFinite(point.x) && Number.isFinite(point.z) && Math.abs(point.x) <= 14 && Math.abs(point.z) <= 10 &&
      ['wild', 'rival', 'camp', 'exit'].includes(point.type));
    for (const point of points) {
      shape(root, 'pad', point.type === 'wild' ? '#d6c9a9' : '#b98040', point.x, 0.045, point.z, 0.85, 0.08, 0.85);
      if (point.type === 'wild' && wildCount++ < 3) pending.push(creature(point.speciesId, point.x, point.z, Math.PI, token));
      if (point.type === 'rival' && !npcShown) {
        const npc = human('#7b4f34');
        npc.position.set(point.x, 0.08, point.z);
        root.add(npc);
        npcShown = true;
      }
      if (point.type === 'camp') {
        const tent = shape(root, 'cone', '#eee9d8', point.x, 0.7, point.z - 0.5, 1.15, 1.25, 1.15);
        tent.rotation.y = Math.PI / 4;
        shape(root, 'box', '#66513d', point.x + 1, 0.2, point.z, 0.5, 0.4, 0.5);
      }
      if (point.type === 'exit') shape(root, 'box', '#365a74', point.x, 0.35, point.z, 0.9, 0.6, 0.25);
    }
    await Promise.all(pending);
  }
  function setPlayerPosition(x, z, angle = 0) {
    if (disposed || !Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(angle)) return;
    playerPosition.set(x, 0, z);
    yaw = angle;
    if (player) { player.position.copy(playerPosition); player.rotation.y = angle + Math.PI; }
  }
  async function showBattle({ playerSpeciesId, enemySpeciesId }) {
    if (disposed) return;
    const token = reset('battle');
    terrain(0, true);
    shape(root, 'pad', '#c7c0a7', -1.8, 0.035, 0, 1.5, 0.06, 1.5);
    shape(root, 'pad', '#c7c0a7', 1.8, 0.035, 0, 1.5, 0.06, 1.5);
    cameraPosition(true);
    await Promise.all([
      creature(playerSpeciesId, -1.8, 0, Math.PI / 2, token),
      creature(enemySpeciesId, 1.8, 0, -Math.PI / 2, token)
    ]);
  }
  function animateAction({ type, side }) {
    if (disposed || mode !== 'battle' || reducedMotion || !['ability', 'capture', 'hit'].includes(type)) return;
    if (effect?.object) root.remove(effect.object);
    effect = { type, side, elapsed: 0, object: null };
    if (type === 'capture') {
      if (!geometries.has('kite')) {
        const kite = new THREE.BufferGeometry();
        kite.setAttribute('position', new THREE.Float32BufferAttribute([
          0, 0.4, 0, -0.3, -0.1, 0, 0.3, -0.1, 0,
          0, -0.1, 0, -0.12, -0.5, 0, 0.12, -0.5, 0
        ], 3));
        kite.computeVertexNormals();
        geometries.set('kite', kite);
        const paper = new THREE.MeshStandardMaterial({ color: '#eee9d8', roughness: 1, metalness: 0, side: THREE.DoubleSide });
        materials.set('kite-paper', paper);
      }
      effect.object = new THREE.Mesh(geometries.get('kite'), materials.get('kite-paper'));
      effect.object.position.set(-1.8, 1.2, 0.5);
      root.add(effect.object);
    } else if (type === 'hit') {
      effect.object = shape(root, 'pad', '#b98040', side === 'enemy' ? 1.8 : -1.8, 0.12, 0, 0.35, 0.06, 0.35);
    }
  }
  function render(dtSeconds) {
    if (disposed) return;
    const dt = Number.isFinite(dtSeconds) ? THREE.MathUtils.clamp(dtSeconds, 0, 0.1) : 0;
    if (effect) {
      effect.elapsed += dt;
      const duration = effect.type === 'capture' ? 0.45 : 0.2;
      const t = Math.min(1, effect.elapsed / duration);
      if (effect.type === 'capture') {
        effect.object.position.set(-1.8 + 3.6 * t, 1.2 + Math.sin(t * Math.PI) * 0.65, 0.5);
        effect.object.rotation.z = -t * 0.4;
      } else if (effect.type === 'ability') {
        camera.fov = 45 - Math.sin(t * Math.PI) * 3;
        camera.updateProjectionMatrix();
      } else if (effect.object) effect.object.scale.set(0.35 + t * 0.5, 0.06, 0.35 + t * 0.5);
      if (t === 1) {
        if (effect.object) root.remove(effect.object);
        effect = null;
        camera.fov = 45;
        camera.updateProjectionMatrix();
      }
    }
    cameraPosition(false, dt);
    renderer.render(scene, camera);
    frames++;
  }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const scale = Math.min(1, 1280 / width, 720 / height);
    renderer.setSize(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    if (reducedMotion) {
      if (effect?.object) root.remove(effect.object);
      effect = null;
      camera.fov = 45;
      camera.updateProjectionMatrix();
      cameraPosition(true);
    }
  }
  function pointerDown(event) {
    if (event.isPrimary === false || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, token: generation };
  }
  function pointerUp(event) {
    const start = pointer;
    pointer = null;
    if (!start || event.pointerId !== start.id || start.token !== generation || mode !== 'world' ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    raycaster.setFromCamera(new THREE.Vector2(x / rect.width * 2 - 1, 1 - y / rect.height * 2), camera);
    if (!raycaster.ray.intersectPlane(groundPlane, rayPoint)) return;
    let closest = null, distance = Infinity;
    for (const point of points) {
      const d = Math.hypot(point.x - rayPoint.x, point.z - rayPoint.z);
      projected.set(point.x, 0, point.z).project(camera);
      const px = (projected.x + 1) * rect.width / 2, py = (1 - projected.y) * rect.height / 2;
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;
      if ((d <= 1.8 || Math.hypot(px - x, py - y) <= 22) && d < distance) { closest = point; distance = d; }
    }
    if (closest) onCheckpoint(closest.id);
  }
  function pointerCancel() { pointer = null; }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  function inspect() {
    return Object.freeze({ mode, frames, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      loadedModels: Object.freeze([...loaded]), fallbackModels: Object.freeze([...failures]), hiddenAvailable,
      width: canvas.width, height: canvas.height });
  }
  function dispose() {
    if (disposed) return;
    reset(mode);
    disposed = true;
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    for (const entry of modelPromises.values()) {
      entry.retired = true;
      if (entry.refs === 0 && entry.base) { disposeModel(entry.base); entry.base = null; }
    }
    modelPromises.clear();
    for (const value of geometries.values()) value.dispose();
    for (const value of materials.values()) value.dispose();
    renderer.dispose();
  }
  resize();
  cameraPosition(true);
  return { showWorld, setPlayerPosition, showBattle, animateAction, render, resize, setReducedMotion, inspect, dispose };
}
