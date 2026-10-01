import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { BY_ID, OPTIONAL_HIDDEN_SPECIES } from './data.js';
import { REGION_LAYOUTS } from './region-data.js';

// Presentation only: the core supplies authoritative positions and the sole clock.
export function createView(canvas, { onCheckpoint = () => {}, reducedMotion = false } = {}) {
  let renderer;
  try {
    const context = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!context) throw new Error('WebGL 1 is unavailable');
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false });
  } catch (error) { throw new Error(`Foldwild 3D view unavailable: ${error.message}`); }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eee9d8');
  scene.fog = new THREE.Fog('#eee9d8', 42, 100);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  scene.add(new THREE.HemisphereLight(0xfff8e9, 0x727965, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-5, 10, 6);
  scene.add(sun);
  const root = new THREE.Group();
  scene.add(root);
  const loader = new GLTFLoader(), cache = new Map(), slots = new Map();
  const geometries = new Map(), materials = new Map(), sceneInstances = [];
  const failures = new Set(), pointers = new Map();
  const playerPosition = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), lookAt = new THREE.Vector3();
  const projected = new THREE.Vector3(), cameraHit = new THREE.Vector3(), cameraRay = new THREE.Ray();
  const raycaster = new THREE.Raycaster(), matrixPart = new THREE.Object3D();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), rayPoint = new THREE.Vector3();
  let generation = 0, disposed = false, mode = 'world', quality = 'low', frames = 0, elapsed = 0;
  let points = [], visiblePoints = [], region = 0, player = null, cameraYaw = 0, playerYaw = 0;
  let effect = null, walking = 0, npcParts = [], npcs = [], cameraBoxes = [];
  let appearance = { skin: '#bc916b', coat: '#365a74', hair: '#38342d', pack: '#ac9265' };
  const hiddenAvailable = Boolean(OPTIONAL_HIDDEN_SPECIES &&
    typeof OPTIONAL_HIDDEN_SPECIES.id === 'string' && validModelPath(OPTIONAL_HIDDEN_SPECIES.model));
  const pointTypes = ['wild', 'rival', 'camp', 'exit', 'npc', 'merchant', 'mentor', 'contract', 'supply'];

  function validModelPath(path) {
    return typeof path === 'string' && /^models\/[a-zA-Z0-9_/-]+\.glb$/.test(path) && !path.includes('..');
  }
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
    return materials.get(color);
  }
  function geometry(kind) {
    if (!geometries.has(kind)) {
      let value;
      if (kind === 'cone') value = new THREE.ConeGeometry(1, 1, 5);
      else if (kind === 'rock') value = new THREE.IcosahedronGeometry(1, 0);
      else if (kind === 'ground') value = new THREE.PlaneGeometry(1, 1);
      else if (kind === 'roof') {
        // Original six-vertex gabled paper roof, not a borrowed house asset.
        value = new THREE.BufferGeometry();
        value.setAttribute('position', new THREE.Float32BufferAttribute([
          -.5,0,-.5, 0,1,-.5, .5,0,-.5, -.5,0,.5, .5,0,.5, 0,1,.5,
          -.5,0,-.5, -.5,0,.5, 0,1,.5, -.5,0,-.5, 0,1,.5, 0,1,-.5,
          .5,0,-.5, 0,1,-.5, 0,1,.5, .5,0,-.5, 0,1,.5, .5,0,.5
        ], 3));
        value.computeVertexNormals();
      } else if (kind === 'kite') {
        value = new THREE.BufferGeometry();
        value.setAttribute('position', new THREE.Float32BufferAttribute([
          0,.4,0, -.35,0,.08, 0,-.14,0, 0,.4,0, 0,-.14,0, .35,0,.08,
          0,-.14,0, -.12,-.55,0, .12,-.55,0
        ], 3));
        value.computeVertexNormals();
      } else value = new THREE.BoxGeometry(1, 1, 1);
      geometries.set(kind, value);
    }
    return geometries.get(kind);
  }
  function shape(parent, kind, color, x, y, z, w, h, d, yaw = 0) {
    const mesh = new THREE.Mesh(geometry(kind), material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.y = yaw;
    parent.add(mesh);
    return mesh;
  }
  function instanceMatrix(mesh, index, x, y, z, w, h, d, yaw = 0) {
    matrixPart.position.set(x, y, z);
    matrixPart.scale.set(w, h, d);
    matrixPart.rotation.set(0, yaw, 0);
    matrixPart.updateMatrix();
    mesh.setMatrixAt(index, matrixPart.matrix);
  }
  function instances(parent, kind, parts) {
    if (!parts.length) return null;
    const mesh = new THREE.InstancedMesh(geometry(kind), material('#ffffff'), parts.length);
    parts.forEach((part, i) => {
      instanceMatrix(mesh, i, ...part.slice(1));
      mesh.setColorAt(i, new THREE.Color(part[0]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    parent.add(mesh);
    sceneInstances.push(mesh);
    return mesh;
  }
  function human(colors) {
    const group = new THREE.Group();
    shape(group, 'cone', colors.coat, 0, .79, 0, .4, .72, .32, Math.PI / 5);
    shape(group, 'box', colors.skin, 0, 1.3, 0, .28, .3, .28);
    shape(group, 'box', colors.hair, 0, 1.48, -.015, .31, .13, .3);
    shape(group, 'box', '#383a3a', -.13, .24, 0, .18, .48, .22);
    shape(group, 'box', '#383a3a', .13, .24, 0, .18, .48, .22);
    shape(group, 'box', colors.pack, 0, .82, -.22, .32, .44, .16);
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
  function retire(entry) {
    entry.retired = true;
    if (!entry.refs && entry.base) { disposeModel(entry.base); entry.base = null; }
  }
  function release(slot) {
    if (slot.closed) return;
    slot.closed = true;
    if (slot.frame) root.remove(slot.frame);
    if (slot.entry) {
      slot.entry.refs--;
      if (slot.entry.retired) retire(slot.entry);
    }
  }
  function acquire(path) {
    let entry = cache.get(path);
    if (entry) cache.delete(path);
    else {
      entry = { refs: 0, retired: false, base: null };
      entry.promise = loader.loadAsync(new URL(path, import.meta.url).href).then(gltf => {
        entry.base = gltf.scene;
        // A pending request may finish after eviction or disposal.
        if (entry.retired && !entry.refs) retire(entry);
        return gltf.scene;
      }).catch(error => { if (cache.get(path) === entry) cache.delete(path); throw error; });
    }
    entry.refs++;
    cache.set(path, entry);
    while (cache.size > 12) {
      const [oldPath, old] = cache.entries().next().value;
      cache.delete(oldPath);
      retire(old);
    }
    return entry;
  }
  function reset(nextMode) {
    generation++;
    mode = nextMode;
    for (const slot of slots.values()) release(slot);
    slots.clear();
    root.clear();
    for (const mesh of sceneInstances) mesh.dispose();
    sceneInstances.length = 0;
    failures.clear();
    points = []; visiblePoints = []; npcs = []; npcParts = []; cameraBoxes = [];
    player = null; effect = null; walking = 0;
    pointers.clear();
    return generation;
  }
  function reportFailure(id, reason) {
    failures.add(`${id}: ${reason}`);
    const message = document.getElementById('message');
    if (message) message.textContent = `3D model unavailable. Marker used instead. ${[...failures].join('; ')}`;
  }
  function cosmetic(parent, id, size, family) {
    if (!['badge', 'scarf', 'paper-hat'].includes(id)) return;
    const bird = /wing|sail|strider/i.test(family);
    const side = size.x * .5 + .04;
    // Side/back anchors leave the source face and silhouette intact. Fit is not an all-80 certification.
    if (id === 'badge') shape(parent, 'box', '#b59a53', side, size.y * (bird ? .5 : .65), 0, .045, .16, .16);
    if (id === 'scarf') shape(parent, 'box', '#8b4f3d', -side, size.y * .6, size.z * .18, .08, .18, size.z * .55);
    if (id === 'paper-hat') shape(parent, 'cone', '#e1cfaa', 0, size.y + .16, -size.z * .1, .24, .3, .24);
  }
  function creature(key, id, x, z, rotation, token, target = 1.45, cosmeticId = 'none') {
    const slot = { key, id, closed: false, entry: null, frame: null, x, z, path: null };
    slots.set(key, slot);
    slot.promise = (async () => {
      try {
        const species = BY_ID[id] || (hiddenAvailable && OPTIONAL_HIDDEN_SPECIES.id === id ? OPTIONAL_HIDDEN_SPECIES : null);
        if (!species || !validModelPath(species.model)) throw new Error('no valid local model descriptor');
        slot.path = species.model;
        slot.entry = acquire(species.model);
        const base = await slot.entry.promise;
        if (disposed || generation !== token || slot.closed) return;
        const model = base.clone(true);
        const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
        const extent = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(extent) || extent <= 0) throw new Error('empty or invalid model bounds');
        const center = bounds.getCenter(new THREE.Vector3()), scale = target / extent;
        model.position.set(-center.x, -bounds.min.y, -center.z);
        const scaled = new THREE.Group(), frame = new THREE.Group();
        scaled.add(model); scaled.scale.setScalar(scale); frame.add(scaled);
        cosmetic(frame, cosmeticId, size.multiplyScalar(scale), species.family);
        frame.position.set(x, 0, z); frame.rotation.y = rotation;
        slot.frame = frame; root.add(frame);
      } catch (error) {
        if (disposed || generation !== token || slot.closed) return;
        if (slot.entry) { slot.entry.refs--; if (slot.entry.retired) retire(slot.entry); slot.entry = null; }
        reportFailure(id, error.message);
        const group = new THREE.Group();
        shape(group, 'cone', '#b98040', 0, .5, 0, .45, 1, .45);
        group.position.set(x, 0, z); slot.frame = group; root.add(group);
      }
    })();
    return slot.promise;
  }
  function terrain(index, battle = false) {
    const layout = REGION_LAYOUTS[index] || REGION_LAYOUTS[0], palette = layout.palette;
    const ground = shape(root, 'ground', palette.ground, 0, -.025, 0, 160, 160, 1);
    ground.rotation.x = -Math.PI / 2;
    const batches = { box: [], roof: [], cone: [], rock: [] };
    const part = (kind, color, x, y, z, w, h, d, yaw = 0) => batches[kind].push([color, x, y, z, w, h, d, yaw]);
    if (battle) {
      part('box', palette.path || '#d6c9a9', 0, -.008, 0, 14, .025, 7);
      for (let i = 0; i < 12; i++) {
        const x = -13 + i * 2.4, z = -7 - (i % 3) * 2;
        part('box', '#6d5840', x, 1, z, .35, 2, .35);
        part('rock', palette.leaves, x, 2.8, z, 1.5, 1.8, 1.5);
      }
      for (const x of [-14, -8, 8, 14]) part('rock', palette.stone, x, 2, -18, 7, 4, 4);
    } else {
      for (const path of layout.paths) for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
        part('box', palette.path || '#d6c9a9', (a.x + b.x) / 2, -.008, (a.z + b.z) / 2, layout.pathWidth || 3.1, .025, Math.hypot(dx, dz) + 1, Math.atan2(dx, dz));
      }
      for (const prop of layout.props) {
        const { kind, x, z } = prop;
        const w = prop.w || 2, h = prop.h || 2, d = prop.d || w, yaw = prop.yaw || prop.rotation || 0;
        const color = prop.color;
        if (kind === 'house' || kind === 'stall') {
          part('box', color || '#e3d8b9', x, h / 2, z, w, h, d, yaw);
          part('roof', prop.roofColor || '#8f6c4e', x, h, z, w + .7, h * .38, d + .7, yaw);
          const frontX = x + Math.sin(yaw) * (d / 2 + .015), frontZ = z + Math.cos(yaw) * (d / 2 + .015);
          part('box', '#514837', frontX, .7, frontZ, .9, 1.4, .035, yaw);
          for (const side of [-1, 1]) part('box', '#6c7d7b', frontX + Math.cos(yaw) * w * .3 * side, h * .64,
            frontZ - Math.sin(yaw) * w * .3 * side, .65, .65, .04, yaw);
          // Renderer camera avoidance uses the same authored obstacle rectangles as movement.
          for (const c of layout.colliders) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ)
            cameraBoxes.push(new THREE.Box3(new THREE.Vector3(c.minX - .2, 0, c.minZ - .2), new THREE.Vector3(c.maxX + .2, h * 1.4, c.maxZ + .2)));
        } else if (kind === 'tree' || kind === 'grove') {
          part('box', prop.trunkColor || '#6d5840', x, h * .35, z, .3, h * .7, .3);
          part('rock', color || palette.leaves, x, h * .85, z, w, h * .55, d);
        } else if (kind === 'bridge') {
          // Individual planks and rails, resting over the flat river rather than a marker pedestal.
          const count = Math.max(4, Math.ceil(w / .6));
          for (let i = 0; i < count; i++) {
            const offset = (i + .5) * w / count - w / 2;
            part('box', color || '#ac8c5a', x + Math.cos(yaw) * offset, .10, z - Math.sin(yaw) * offset, w / count - .035, .18, d, yaw);
          }
          for (const side of [-1, 1]) {
            const rx = x + Math.sin(yaw) * d * .46 * side, rz = z + Math.cos(yaw) * d * .46 * side;
            part('box', '#785d3d', rx, .8, rz, w, .12, .1, yaw);
            for (const end of [-1, 1]) part('box', '#785d3d', rx + Math.cos(yaw) * w * .43 * end, .46,
              rz - Math.sin(yaw) * w * .43 * end, .12, .92, .12);
          }
        } else if (kind === 'water') part('box', color || palette.water, x, -.005, z, w, .018, d, yaw);
        else if (kind === 'rock' || kind === 'hill' || kind === 'landmark') part('rock', color || palette.stone, x, h * .4, z, w, h * .6, d, yaw);
        else if (kind === 'tent') part('roof', color || '#e1d2b1', x, 0, z, w, h, d, yaw);
        else part('box', color || '#a58a61', x, h / 2, z, w, h, d, yaw);
      }
      for (const point of points) {
        if (point.type === 'camp') part('roof', '#e1d2b1', point.x + 1.2, 0, point.z - 1.2, 1.8, 1.3, 1.6);
        if (point.type === 'exit') {
          part('box', '#785d3d', point.x, .65, point.z, .15, 1.3, .15);
          part('box', '#ded2ad', point.x, 1.15, point.z, .8, .35, .1);
        }
        if (point.type === 'supply') part('box', '#aa8b59', point.x, .2, point.z, .45, .4, .45);
      }
    }
    for (const [kind, parts] of Object.entries(batches)) instances(root, kind, parts);
  }
  function buildNPCs() {
    const limit = quality === 'low' ? 4 : 8;
    npcs = points.filter(p => ['rival', 'npc', 'merchant', 'mentor', 'contract'].includes(p.type))
      .filter(p => Math.hypot(p.x - playerPosition.x, p.z - playerPosition.z) < 32)
      .sort((a, b) => Math.hypot(a.x - playerPosition.x, a.z - playerPosition.z) - Math.hypot(b.x - playerPosition.x, b.z - playerPosition.z)).slice(0, limit);
    const definitions = [
      ['cone', 0, .79, 0, .4, .72, .32, 'coat'], ['box', 0, 1.3, 0, .28, .3, .28, 'skin'],
      ['box', 0, 1.48, -.015, .31, .13, .3, 'hair'], ['box', -.13, .24, 0, .18, .48, .22, 'legs'],
      ['box', .13, .24, 0, .18, .48, .22, 'legs'], ['box', 0, .82, -.22, .32, .44, .16, 'pack']
    ];
    for (const item of npcParts) { root.remove(item.mesh); item.mesh.dispose(); sceneInstances.splice(sceneInstances.indexOf(item.mesh), 1); }
    npcParts = [];
    for (const def of definitions) {
      const [kind, ox, oy, oz, w, h, d, key] = def;
      const parts = npcs.map((p, i) => {
        const colors = { skin: ['#bc916b', '#8c6149', '#d5b494'][i % 3], coat: p.type === 'merchant' ? '#81613f' : p.type === 'rival' ? '#7b4f34' : '#48637a', hair: '#38342d', legs: '#383a3a', pack: '#ac9265' };
        const color = p.appearance?.[key] || colors[key];
        return [color, p.x + ox, oy, p.z + oz, w, h, d, kind === 'cone' ? Math.PI / 5 : 0];
      });
      const mesh = instances(root, kind, parts);
      if (mesh) npcParts.push({ mesh, def });
    }
  }
  function nearbyVisuals() {
    if (mode !== 'world' || disposed) return [];
    visiblePoints = points.filter(p => Math.hypot(p.x - playerPosition.x, p.z - playerPosition.z) < 32);
    const wild = visiblePoints.filter(p => p.type === 'wild').sort((a, b) =>
      Math.hypot(a.x - playerPosition.x, a.z - playerPosition.z) - Math.hypot(b.x - playerPosition.x, b.z - playerPosition.z)).slice(0, quality === 'low' ? 4 : 6);
    const wanted = new Set(wild.map(p => p.id));
    for (const [key, slot] of slots) if (!wanted.has(key)) { release(slot); slots.delete(key); }
    const pending = [];
    for (const p of wild) {
      if (!slots.has(p.id)) pending.push(creature(p.id, p.speciesId, p.x, p.z, Math.PI, generation, 1.45, p.cosmeticId));
      else pending.push(slots.get(p.id).promise);
    }
    const oldIds = npcs.map(p => p.id).join('|');
    const newIds = visiblePoints.filter(p => ['rival', 'npc', 'merchant', 'mentor', 'contract'].includes(p.type)).sort((a, b) =>
      Math.hypot(a.x - playerPosition.x, a.z - playerPosition.z) - Math.hypot(b.x - playerPosition.x, b.z - playerPosition.z)).slice(0, quality === 'low' ? 4 : 8).map(p => p.id).join('|');
    if (oldIds !== newIds) buildNPCs();
    visiblePoints = visiblePoints.filter(p => p.type === 'wild' ? wanted.has(p.id) :
      ['rival', 'npc', 'merchant', 'mentor', 'contract'].includes(p.type) ? npcs.some(n => n.id === p.id) : true);
    return pending;
  }
  function avoidCamera(position) {
    cameraRay.origin.copy(lookAt);
    cameraRay.direction.copy(position).sub(lookAt).normalize();
    let distance = position.distanceTo(lookAt);
    for (const box of cameraBoxes) if (cameraRay.intersectBox(box, cameraHit)) distance = Math.min(distance, Math.max(.7, lookAt.distanceTo(cameraHit) - .25));
    position.copy(lookAt).addScaledVector(cameraRay.direction, distance);
  }
  function cameraPosition(instant = false, dt = 0) {
    if (mode === 'battle') { desiredCamera.set(0, 3.6, 8.5); lookAt.set(0, .8, 0); }
    else {
      desiredCamera.set(playerPosition.x + Math.sin(cameraYaw) * 10, 5.6, playerPosition.z + Math.cos(cameraYaw) * 10);
      lookAt.set(playerPosition.x, .6, playerPosition.z);
      avoidCamera(desiredCamera);
    }
    camera.position.lerp(desiredCamera, instant || reducedMotion ? 1 : 1 - Math.exp(-dt * 7));
    if (mode === 'world') avoidCamera(camera.position);
    camera.lookAt(lookAt); camera.updateMatrixWorld();
  }
  async function showWorld({ region: index = 0, position = { x: 0, z: 16, yaw: 0 }, points: worldPoints = [], appearance: nextAppearance } = {}) {
    if (disposed) return;
    reset('world'); region = REGION_LAYOUTS[index] ? index : 0;
    points = worldPoints.filter(p => p && (typeof p.id === 'string' || Number.isFinite(p.id)) &&
      Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) <= 80 && Math.abs(p.z) <= 80 && pointTypes.includes(p.type)).map(p => ({ ...p }));
    if (nextAppearance) setAppearance(nextAppearance);
    terrain(region);
    player = human(appearance); root.add(player);
    setPlayerPosition(position.x, position.z, position.yaw || 0);
    cameraPosition(true);
    await Promise.all(nearbyVisuals());
  }
  function setPlayerPosition(x, z, angle = 0) {
    if (disposed || !Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(angle)) return;
    if (mode === 'world' && Math.hypot(x - playerPosition.x, z - playerPosition.z) > .001) walking = .16;
    playerPosition.set(x, 0, z); playerYaw = angle;
    if (player) { player.position.copy(playerPosition); player.rotation.y = angle + Math.PI; }
    if (mode === 'world') nearbyVisuals();
  }
  async function showBattle({ playerSpeciesId, enemySpeciesId, region: index = 0, playerCosmeticId = 'none', enemyCosmeticId = 'none' }) {
    if (disposed) return;
    const token = reset('battle'); region = REGION_LAYOUTS[index] ? index : 0;
    terrain(region, true); cameraPosition(true);
    await Promise.all([
      creature('player', playerSpeciesId, -1.85, 0, Math.PI / 2, token, 2.4, playerCosmeticId),
      creature('enemy', enemySpeciesId, 1.85, 0, -Math.PI / 2, token, 2.4, enemyCosmeticId)
    ]);
  }
  function clearEffect() {
    if (effect?.object) root.remove(effect.object);
    for (const slot of slots.values()) if (slot.frame) slot.frame.position.set(slot.x, 0, slot.z);
    effect = null;
  }
  function animateAction({ type, side = 'player', result } = {}) {
    if (disposed || mode !== 'battle' || reducedMotion || !['ability', 'capture', 'hit'].includes(type)) return;
    clearEffect(); effect = { type, side, result, elapsed: 0, object: null };
    if (type === 'capture') {
      const paper = material('#eee9d8');
      paper.side = THREE.DoubleSide;
      effect.object = new THREE.Mesh(geometry('kite'), paper);
      effect.object.position.set(-1.85, 1.2, .5); root.add(effect.object);
    }
  }
  function render(dtSeconds) {
    if (disposed) return;
    const dt = Number.isFinite(dtSeconds) ? THREE.MathUtils.clamp(dtSeconds, 0, .1) : 0;
    elapsed += dt; walking = Math.max(0, walking - dt);
    if (!reducedMotion) {
      if (player) player.position.y = walking ? Math.abs(Math.sin(elapsed * 13)) * .075 : 0;
      for (const [key, slot] of slots) if (slot.frame && mode === 'world') slot.frame.position.y = Math.sin(elapsed * 1.8 + String(key).length) * .025;
      if (dt) for (const { mesh, def } of npcParts) {
        const [, ox, oy, oz, w, h, d] = def;
        npcs.forEach((p, i) => instanceMatrix(mesh, i, p.x + ox, oy + Math.sin(elapsed * 1.4 + i) * .012, p.z + oz, w, h, d, def[0] === 'cone' ? Math.PI / 5 : 0));
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    if (effect) {
      effect.elapsed += dt;
      const duration = effect.type === 'capture' ? .65 : .42, t = Math.min(1, effect.elapsed / duration);
      const acting = slots.get(effect.side)?.frame, target = slots.get(effect.side === 'enemy' ? 'player' : 'enemy')?.frame;
      const direction = effect.side === 'enemy' ? -1 : 1;
      if (effect.type === 'capture') {
        const failed = ['miss', 'failed', 'lost'].includes(effect.result);
        const end = failed ? 3.4 : 1.85;
        effect.object.position.set(-1.85 + (end + 1.85) * t, 1.2 + Math.sin(t * Math.PI) * 1.1 - (failed ? t * .8 : 0), .5 - .5 * t);
        effect.object.rotation.set(.25 * Math.sin(t * Math.PI), t * .6, -.5 * t);
      } else {
        // Assign from the static anchor, never accumulate movement from previous frames.
        if (acting && effect.type === 'ability') acting.position.x = slots.get(effect.side).x + direction * Math.sin(t * Math.PI) * .65;
        if (acting && effect.type === 'hit') acting.position.x = slots.get(effect.side).x - direction * Math.sin(t * Math.PI) * .18;
        if (target && effect.type === 'ability') target.position.x = slots.get(effect.side === 'enemy' ? 'player' : 'enemy').x + direction * Math.sin(Math.max(0, t - .35) / .65 * Math.PI) * .18;
      }
      if (t === 1) clearEffect();
    }
    cameraPosition(false, dt); renderer.render(scene, camera); frames++;
  }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(), width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const maxW = quality === 'low' ? 960 : 1280, maxH = quality === 'low' ? 540 : 720;
    const scale = Math.min(1, maxW / width, maxH / height);
    renderer.setSize(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)), false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function setQuality(value) {
    if (!['low', 'standard'].includes(value)) throw new Error('Unknown Foldwild quality');
    if (disposed) return;
    quality = value; resize(); if (mode === 'world') nearbyVisuals();
  }
  function setAppearance(value = {}) {
    if (disposed || !value || typeof value !== 'object') return;
    const aliases = { skin: 'skinTone', coat: 'coatColor', hair: 'hairColor', pack: 'backpackColor' };
    for (const [key, alias] of Object.entries(aliases)) {
      const color = value[key] || value[alias];
      if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) appearance[key] = color;
    }
    if (player) { root.remove(player); player = human(appearance); root.add(player); player.position.copy(playerPosition); player.rotation.y = playerYaw + Math.PI; }
  }
  function orbitCamera(delta) {
    if (disposed || !Number.isFinite(delta)) return;
    cameraYaw = THREE.MathUtils.euclideanModulo(cameraYaw + delta + Math.PI, Math.PI * 2) - Math.PI;
    if (mode === 'world') cameraPosition(true);
  }
  function recenterCamera() { if (!disposed) { cameraYaw = playerYaw; cameraPosition(true); } }
  function getCameraYaw() { return cameraYaw; }
  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    if (reducedMotion) {
      clearEffect(); if (player) player.position.y = 0;
      for (const slot of slots.values()) if (slot.frame) slot.frame.position.y = 0;
      cameraPosition(true);
    }
  }
  function pointerDown(event) {
    if (mode !== 'world' || ![0, 2].includes(event.button)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY,
      token: generation, moved: event.button === 2, touch: event.pointerType === 'touch' });
    if (pointers.size > 1) for (const p of pointers.values()) p.moved = true;
    if (event.isTrusted) canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    const dx = event.clientX - p.x;
    if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 8) p.moved = true;
    if (p.moved && (!p.touch || pointers.size > 1)) orbitCamera(-dx * .008 / (p.touch ? 2 : 1));
    p.x = event.clientX; p.y = event.clientY;
  }
  function pointerUp(event) {
    const start = pointers.get(event.pointerId); pointers.delete(event.pointerId);
    if (!start || start.moved || start.token !== generation || mode !== 'world' ||
      Math.hypot(event.clientX - start.startX, event.clientY - start.startY) > 8) return;
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    raycaster.setFromCamera(new THREE.Vector2(x / rect.width * 2 - 1, 1 - y / rect.height * 2), camera);
    if (!raycaster.ray.intersectPlane(groundPlane, rayPoint)) return;
    let closest = null, distance = Infinity;
    for (const p of visiblePoints) {
      projected.set(p.x, .6, p.z).project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) continue;
      const px = (projected.x + 1) * rect.width / 2, py = (1 - projected.y) * rect.height / 2;
      projected.set(p.x, .6, p.z);
      cameraRay.origin.copy(camera.position);
      cameraRay.direction.copy(projected).sub(camera.position).normalize();
      const depth = camera.position.distanceTo(projected);
      if (cameraBoxes.some(box => cameraRay.intersectBox(box, cameraHit) && camera.position.distanceTo(cameraHit) < depth - .2)) continue;
      const d = Math.hypot(p.x - rayPoint.x, p.z - rayPoint.z);
      if ((d < 1.5 || Math.hypot(px - x, py - y) <= 22) && d < distance) { closest = p; distance = d; }
    }
    if (closest) onCheckpoint(closest.id);
  }
  function pointerCancel(event) { pointers.delete(event.pointerId); }
  function contextMenu(event) { event.preventDefault(); }
  const listeners = { pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerUp,
    pointercancel: pointerCancel, lostpointercapture: pointerCancel, contextmenu: contextMenu };
  for (const [name, callback] of Object.entries(listeners)) canvas.addEventListener(name, callback);
  function inspect() {
    const loaded = [...new Set([...slots.values()].filter(s => s.frame && s.entry).map(s => s.path))];
    return Object.freeze({ mode, frames, quality, cameraYaw, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      cacheSize: cache.size, countLoadedModels: loaded.length, loadedModels: Object.freeze(loaded), fallbackModels: Object.freeze([...failures]),
      hiddenAvailable, width: canvas.width, height: canvas.height, npcCount: npcs.length,
      cameraPosition: Object.freeze({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      actorPositions: Object.freeze(Object.fromEntries([...slots].filter(([, s]) => s.frame).map(([key, s]) =>
        [key, Object.freeze({ x: s.frame.position.x, y: s.frame.position.y, z: s.frame.position.z })]))),
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures });
  }
  function dispose() {
    if (disposed) return;
    reset(mode); disposed = true;
    for (const [name, callback] of Object.entries(listeners)) canvas.removeEventListener(name, callback);
    for (const entry of cache.values()) retire(entry);
    cache.clear();
    for (const value of geometries.values()) value.dispose();
    for (const value of materials.values()) value.dispose();
    renderer.dispose();
  }
  resize(); cameraPosition(true);
  return { showWorld, setPlayerPosition, showBattle, animateAction, render, resize, setReducedMotion,
    setAppearance, setQuality, orbitCamera, recenterCamera, getCameraYaw, inspect, dispose };
}
