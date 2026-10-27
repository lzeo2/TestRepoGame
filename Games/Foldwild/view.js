import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { BY_ID, OPTIONAL_HIDDEN_SPECIES } from './data.js';
import { REGION_LAYOUTS } from './region-data.js';

// Local +Z is the face/front. Pivots use radians, with feet grounded at y=0.
export function createHuman(colors, geometry, material) {
  const rig = new THREE.Group();
  rig.name = 'human';
  const pivots = {};
  const pivot = (name, x, y, z) => {
    const group = new THREE.Group(); group.name = name; group.position.set(x, y, z);
    rig.add(group); pivots[name] = group; return group;
  };
  const part = (parent, name, color, x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(geometry('box'), material(color));
    mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh);
    return mesh;
  };
  const torso = pivot('torso', 0, .85, 0);
  part(torso, 'jacket', colors.coat, 0, .16, 0, .43, .56, .26);
  part(torso, 'shirt', '#eee9d8', 0, .33, .14, .13, .2, .025);
  part(torso, 'belt', '#514537', 0, -.1, .015, .44, .07, .28);
  part(torso, 'buckle', '#c7a25b', 0, -.1, .165, .08, .06, .035);
  part(torso, 'pack', colors.pack, 0, .14, -.22, .32, .4, .18);
  if (colors.role === 'merchant') part(torso, 'apron', '#d6c9a9', 0, -.015, .165, .29, .37, .035);
  if (colors.role === 'mentor') part(torso, 'scarf', '#d8bd83', .11, .3, .175, .12, .28, .035);
  if (colors.role === 'rival') part(torso, 'trial-badge', '#d8bd83', -.12, .23, .175, .09, .1, .035);
  for (const side of [-1, 1]) part(torso, 'pack-strap', colors.pack, side * .16, .2, .15, .045, .39, .035);
  const head = pivot('head', 0, 1.27, 0);
  part(head, 'neck', colors.skin, 0, .01, 0, .13, .15, .14);
  part(head, 'face', colors.skin, 0, .2, 0, .29, .32, .27);
  part(head, 'nose', colors.skin, 0, .18, .155, .075, .08, .07);
  for (const side of [-1, 1]) part(head, 'eye', '#292c2c', side * .075, .24, .14, .038, .04, .025);
  if (colors.hairStyle !== 'none') {
    part(head, 'hair', colors.hair, 0, .37, -.015, .31, colors.hairStyle === 'cropped' ? .055 : .1, .3);
    part(head, 'hair-back', colors.hair, 0, colors.hairStyle === 'long' ? .16 : .27, -.14, .3,
      colors.hairStyle === 'long' ? .38 : .18, .08);
  }
  for (const [side, name] of [[-1, 'left'], [1, 'right']]) {
    const arm = pivot(`${name}Arm`, side * .29, 1.12, 0);
    part(arm, 'sleeve', colors.coat, 0, -.15, 0, .15, .31, .2);
    part(arm, 'hand', colors.skin, 0, -.37, .015, .12, .15, .14);
    const leg = pivot(`${name}Leg`, side * .115, .73, 0);
    part(leg, 'trouser', '#383a3a', 0, -.175, 0, .18, .35, .21);
    const knee = new THREE.Group(); knee.name = `${name}Knee`; knee.position.y = -.35; leg.add(knee);
    part(knee, 'shin', '#383a3a', 0, -.175, 0, .17, .35, .2);
    const ankle = new THREE.Group(); ankle.name = `${name}Ankle`; ankle.position.y = -.35; knee.add(ankle);
    part(ankle, 'boot', '#514537', 0, 0, .045, .2, .16, .32);
    leg.userData.knee = knee; leg.userData.ankle = ankle;
    poseHumanLeg(leg, 0, 0);
  }
  rig.userData.pivots = pivots;
  return rig;
}

// Two equal .35-unit links; ankle counter-rotation keeps the boot sole horizontal.
function poseHumanLeg(leg, forward, lift) {
  const down = .65 - lift, reach = Math.min(.6999, Math.hypot(down, forward));
  const bend = Math.acos(reach / .7);
  leg.rotation.x = -Math.atan2(forward, down) - bend;
  leg.userData.knee.rotation.x = bend * 2;
  leg.userData.ankle.rotation.x = -leg.rotation.x - bend * 2;
}

// Presentation samples only controller positions and render dt, never advances the world.
export function updateHumanMotion(rig, position, dt, reducedMotion = false) {
  const targetYaw = position.yaw + Math.PI;
  const motion = rig.userData.motion ||= { x: position.x, z: position.z, phase: 0, speed: 0, weight: 0 };
  const distance = Math.hypot(position.x - motion.x, position.z - motion.z);
  rig.position.set(position.x, 0, position.z);
  const turn = Math.atan2(Math.sin(targetYaw - rig.rotation.y), Math.cos(targetYaw - rig.rotation.y));
  if (dt > 0 || reducedMotion) rig.rotation.y += turn * (reducedMotion ? 1 : 1 - Math.exp(-dt * 16));
  if (dt <= 0 && !reducedMotion) return;
  motion.x = position.x; motion.z = position.z;
  // Teleports are not footsteps. One cycle travels one world unit, not a wall-clock sine.
  motion.speed = dt > 0 && distance < 1 ? distance / dt : 0;
  if (!reducedMotion && motion.speed > .01) motion.phase = (motion.phase + distance) % 1;
  const moving = !reducedMotion && motion.speed > .01;
  motion.weight = reducedMotion ? 0 : moving ? 1 - (1 - motion.weight) * Math.exp(-dt * 24) : motion.weight * Math.exp(-dt * 24);
  if (motion.weight > .999) motion.weight = 1;
  if (motion.weight < .001) { motion.weight = 0; motion.phase = 0; }
  const pivots = rig.userData.pivots;
  for (const [side, offset] of [['left', 0], ['right', .5]]) {
    const phase = (motion.phase + offset) % 1;
    const stance = phase < .5;
    const progress = stance ? phase * 2 : (phase - .5) * 2;
    const forward = motion.weight ? (stance ? .25 - .5 * progress : -.25 + .5 * progress) * motion.weight : 0;
    const lift = stance ? 0 : Math.sin(progress * Math.PI) * .13 * motion.weight;
    poseHumanLeg(pivots[`${side}Leg`], forward, lift);
    pivots[`${side}Arm`].rotation.x = forward * 2.2;
  }
}

export function inspectHumanMotion(rig) {
  if (!rig) return null;
  rig.updateMatrixWorld(true);
  const vector = v => Object.freeze({ x: v.x, y: v.y, z: v.z });
  const motion = rig.userData.motion;
  const limbs = {};
  for (const side of ['left', 'right']) {
    const leg = rig.userData.pivots[`${side}Leg`], ankle = leg.userData.ankle;
    const boot = ankle.getObjectByName('boot');
    const sole = boot.localToWorld(new THREE.Vector3(0, -.5, 0));
    limbs[side] = Object.freeze({ hip: leg.rotation.x, knee: leg.userData.knee.rotation.x,
      ankle: ankle.rotation.x, arm: rig.userData.pivots[`${side}Arm`].rotation.x,
      grounded: Math.abs(sole.y) < .002, sole: vector(sole) });
  }
  return Object.freeze({ position: vector(rig.position), yaw: rig.rotation.y,
    speed: motion?.speed || 0, phase: motion?.phase || 0, weight: motion?.weight || 0,
    limbs: Object.freeze(limbs) });
}

// No source creature skeleton is assumed: battle feedback transforms the grounded frame only.
export function battleMotion(type, t) {
  const ease = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  if (type === 'hit') return { acting: -.18 * (t < .2 ? ease(t / .2) : 1 - ease((t - .2) / .8)), target: 0 };
  const lunge = t < .18 ? -.1 * ease(t / .18) : t < .4 ? -.1 + .8 * ease((t - .18) / .22) : .7 * (1 - ease((t - .4) / .6));
  const impact = t < .4 ? 0 : t < .52 ? .2 * ease((t - .4) / .12) : .2 * (1 - ease((t - .52) / .48));
  return { acting: lunge, target: impact };
}

// A few useful signs, not a label on every collectible. Positions come from metadata.
export function presentationSigns(layout) {
  return (layout.landmarks || []).filter(site => ['outpost', 'bridge-loop', 'waystone'].includes(site.id) || site.pointIds.includes('rival'))
    .map(site => ({ id: site.id, name: site.name, x: site.x, z: site.z,
      trial: site.pointIds.includes('rival') }));
}

export function destinationSignLayout(site, x = site.x + (site.trial ? -3.3 : 2), z = site.z - 2.4) {
  return { x, y: 2.05, z, width: 3, height: .75 };
}

// Presentation only: the core supplies authoritative positions and the sole clock.
export function createView(canvas, { onCheckpoint = () => {}, onDiagnostic = null, reducedMotion = false } = {}) {
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
  const pointers = new Map(), labelResources = [], landmarkLabels = [];
  const playerPosition = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), lookAt = new THREE.Vector3();
  const projected = new THREE.Vector3(), cameraHit = new THREE.Vector3(), cameraRay = new THREE.Ray();
  const raycaster = new THREE.Raycaster(), matrixPart = new THREE.Object3D();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), rayPoint = new THREE.Vector3();
  let generation = 0, disposed = false, mode = 'world', quality = 'low', frames = 0;
  let points = [], visiblePoints = [], region = 0, player = null, cameraYaw = 0, playerYaw = 0;
  let effect = null, npcParts = [], npcs = [], cameraBoxes = [];
  let inspectionYaw = 0, inspectionBounds = null;
  let contextStatus = 'available', lastDiagnostic = '', directMessage = '';
  const inspectionCenter = new THREE.Vector3();
  let appearance = { skin: '#bc916b', coat: '#365a74', hair: '#38342d', hairStyle: 'short', pack: '#ac9265' };
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
  function human(colors) { return createHuman(colors, geometry, material); }
  function destinationSign(site, signX, signZ) {
    const { x, y, z, width, height } = destinationSignLayout(site, signX, signZ);
    shape(root, 'box', '#514537', x, .9, z, .13, 1.8, .13);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eee9d8'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#514537'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = '#292c2c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px sans-serif';
    const words = site.name.split(' '), lines = [''];
    for (const word of words) {
      const i = lines.length - 1, next = `${lines[i]} ${word}`.trim();
      if (ctx.measureText(next).width > 470 && lines[i]) lines.push(word); else lines[i] = next;
    }
    lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, 256, lines.length > 1 ? 41 + i * 47 : 64, 470));
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(mat); label.position.set(x, y, z); label.scale.set(width, height, 1);
    root.add(label); landmarkLabels.push(label); labelResources.push(texture, mat);
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
    if (!entry.refs) {
      entry.cancel?.();
      if (entry.base) { disposeModel(entry.base); entry.base = null; }
    }
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
      entry.promise = new Promise((resolve, reject) => {
        let settled = false;
        const fail = error => {
          if (settled) return;
          settled = true; clearTimeout(timer); entry.cancel = null;
          reject(error);
        };
        const timer = setTimeout(() => fail(new Error('local model load exceeded 20 seconds')), 20000);
        entry.cancel = () => fail(new Error('local model load canceled'));
        // GLTFLoader has no abort API. A late result still owns resources to dispose.
        Promise.resolve().then(() => loader.loadAsync(new URL(path, import.meta.url).href)).then(gltf => {
          if (settled) { disposeModel(gltf.scene); return; }
          settled = true; clearTimeout(timer); entry.cancel = null;
          entry.base = gltf.scene;
          if (entry.retired && !entry.refs) retire(entry);
          resolve(gltf.scene);
        }, fail);
      }).catch(error => {
        if (cache.get(path) === entry) cache.delete(path);
        retire(entry);
        throw error;
      });
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
    for (const resource of labelResources) resource.dispose();
    labelResources.length = 0; landmarkLabels.length = 0;
    for (const mesh of sceneInstances) mesh.dispose();
    sceneInstances.length = 0;
    points = []; visiblePoints = []; npcs = []; npcParts = []; cameraBoxes = [];
    player = null; effect = null; inspectionBounds = null;
    pointers.clear();
    notifyDiagnostic();
    return generation;
  }
  function diagnostic() {
    const pendingModels = Object.freeze([...new Set([...slots.values()].filter(s => !s.closed && !s.frame).map(s => s.id))]);
    const fallbackModels = Object.freeze([...new Set([...slots.values()].filter(s => !s.closed && s.failure).map(s => s.failure))]);
    const parts = [];
    if (contextStatus !== 'available') parts.push(contextStatus === 'lost'
      ? '3D context lost. Text and buttons remain available; waiting for browser recovery. Reload if it does not recover.'
      : '3D context restored; waiting for a rendered frame.');
    if (pendingModels.length) parts.push(`Loading local 3D models: ${pendingModels.join(', ')}. Text and buttons remain available.`);
    if (fallbackModels.length) parts.push(`3D model unavailable. Marker used instead. ${fallbackModels.join('; ')}`);
    return Object.freeze({ contextStatus, pendingModels, fallbackModels, message: parts.join(' ') });
  }
  function notifyDiagnostic() {
    if (disposed) return;
    const status = diagnostic(), key = JSON.stringify(status);
    if (onDiagnostic) {
      if (key !== lastDiagnostic) onDiagnostic(status);
    } else {
      const message = document.getElementById('message');
      if (message && (status.message || message.textContent === directMessage)) message.textContent = status.message;
      directMessage = status.message;
    }
    lastDiagnostic = key;
  }
  function reportFailure(slot, reason) {
    slot.failure = `${slot.id}: ${reason}`;
  }
  function cosmetic(parent, id, size) {
    if (id === 'paper-hat') { shape(parent, 'cone', '#e1cfaa', 0, size.y + .16, -size.z * .1, .24, .3, .24); return; }
    if (!['badge', 'scarf'].includes(id)) return;
    const side = id === 'badge' ? 1 : -1, thickness = id === 'badge' ? .045 : .08;
    // Cast only at creation, against the scaled source clone before adding any accessories.
    parent.updateMatrixWorld(true);
    for (const z of [0, size.z * .2, -size.z * .2]) for (const fraction of [.55, .45, .7, .3]) {
      raycaster.set(new THREE.Vector3(side * (size.x / 2 + 1), size.y * fraction, z), new THREE.Vector3(-side, 0, 0));
      const hit = raycaster.intersectObject(parent, true)[0];
      if (!hit) continue;
      const anchor = parent.worldToLocal(hit.point.clone());
      const mesh = shape(parent, 'box', id === 'badge' ? '#b59a53' : '#8b4f3d',
        anchor.x + side * thickness / 2, anchor.y, anchor.z, thickness,
        id === 'badge' ? .16 : .18, id === 'badge' ? .16 : size.z * .55);
      return { id, anchor, mesh, side };
    }
    const message = document.getElementById('message');
    if (message) message.textContent = 'Accessory unavailable: no source surface found. Original model shown without it.';
    return { id, anchor: null };
  }
  function creature(key, id, x, z, rotation, token, target = 1.45, cosmeticId = 'none') {
    const slot = { key, id, closed: false, entry: null, frame: null, x, z, path: null };
    slots.set(key, slot);
    notifyDiagnostic();
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
        slot.attachment = cosmetic(frame, cosmeticId, size.multiplyScalar(scale));
        frame.position.set(x, 0, z); frame.rotation.y = rotation;
        slot.frame = frame; root.add(frame);
      } catch (error) {
        if (disposed || generation !== token || slot.closed) return;
        if (slot.entry) { slot.entry.refs--; if (slot.entry.retired) retire(slot.entry); slot.entry = null; }
        reportFailure(slot, error.message);
        const group = new THREE.Group();
        shape(group, 'cone', '#b98040', 0, .5, 0, .45, 1, .45);
        group.position.set(x, 0, z); slot.frame = group; root.add(group);
      } finally {
        if (!disposed && generation === token && !slot.closed) notifyDiagnostic();
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
      // Sparse dark verge blocks distinguish the main trail from bridge and trial branches.
      for (const route of layout.routes || []) {
        if (!['trial-spur', 'bridge-loop'].includes(route.id)) continue;
        const color = route.id === 'trial-spur' ? '#785338' : '#45596b';
        const path = route.paths[route.paths.length - 1];
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
          if (length < .001) continue;
          const count = Math.ceil(length / 7);
          for (let j = 0; j < count; j++) {
            const t = (j + .5) / count;
            part('box', color, a.x + dx * t + dz / length * 1.5, .035, a.z + dz * t - dx / length * 1.5,
              .28, .1, .8, Math.atan2(dx, dz));
          }
        }
      }
      for (const site of presentationSigns(layout)) {
        destinationSign(site);
        if (site.trial) {
          // An open timber trial arch frames the actual trainer, not the old decorative stone.
          for (const side of [-1, 1]) part('box', '#785338', site.x + side * 2, 1.4, site.z - 1, .24, 2.8, .24);
          part('box', '#785338', site.x, 2.7, site.z - 1, 4.3, .24, .28);
          for (const side of [-1, 1]) part('box', '#d8bd83', site.x + side * 1.6, 2.2, site.z - 1, .45, .65, .08);
          const path = layout.routes.find(route => route.id === 'trial-spur')?.paths.at(-1);
          if (path?.length > 1) destinationSign({ ...site, name: `To ${site.name}` }, path[0].x + 2, path[0].z - 2.4);
        }
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
          part('rock', color || palette.leaves, x, h * .75, z, w, h * .45, d);
          part('rock', color || palette.leaves, x + .25, h * .98, z - .15, w * .7, h * .35, d * .7);
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
    for (const item of npcParts) { root.remove(item.mesh); item.mesh.dispose(); sceneInstances.splice(sceneInstances.indexOf(item.mesh), 1); }
    npcParts = [];
    const parts = [];
    npcs.forEach((p, i) => {
      const colors = { skin: ['#bc916b', '#8c6149', '#d5b494'][i % 3], coat: p.type === 'merchant' ? '#81613f' : p.type === 'rival' ? '#7b4f34' : p.type === 'mentor' ? '#685478' : '#48637a', hair: '#38342d', hairStyle: 'short', pack: '#ac9265', role: p.type, ...p.appearance };
      p.rig = human(colors); p.rig.position.set(p.x, 0, p.z);
      p.rig.rotation.y = Math.atan2(playerPosition.x - p.x, playerPosition.z - p.z);
      p.rig.traverse(node => { if (node.isMesh) parts.push(node); });
    });
    if (!parts.length) return;
    const mesh = new THREE.InstancedMesh(geometry('box'), material('#ffffff'), parts.length);
    parts.forEach((node, i) => mesh.setColorAt(i, node.material.color));
    root.add(mesh); sceneInstances.push(mesh); npcParts.push({ mesh, parts });
    updateNPCParts();
  }
  function updateNPCParts() {
    for (const p of npcs) p.rig.updateMatrixWorld(true);
    for (const { mesh, parts } of npcParts) {
      parts.forEach((node, i) => mesh.setMatrixAt(i, node.matrixWorld));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }
  function nearbyVisuals() {
    if (mode !== 'world' || disposed) return [];
    visiblePoints = points.filter(p => Math.hypot(p.x - playerPosition.x, p.z - playerPosition.z) < (p.type === 'wild' ? 40 : 32));
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
    notifyDiagnostic();
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
    else if (mode === 'inspection') {
      const radius = inspectionBounds ? inspectionBounds.getSize(projected).length() / 2 : 1.4;
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfFov = Math.min(vertical, Math.atan(Math.tan(vertical) * camera.aspect));
      // Bounding sphere fits every deliberate rotation, including portrait hosts and accessories.
      const distance = radius * 1.08 / Math.sin(halfFov);
      lookAt.copy(inspectionCenter);
      desiredCamera.set(Math.sin(inspectionYaw) * Math.cos(.18), Math.sin(.18), Math.cos(inspectionYaw) * Math.cos(.18))
        .multiplyScalar(distance).add(lookAt);
    } else {
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
    player.rotation.y = playerYaw + Math.PI;
    updateHumanMotion(player, { x: playerPosition.x, z: playerPosition.z, yaw: playerYaw }, 0);
    cameraPosition(true);
    await Promise.all(nearbyVisuals());
  }
  function setPlayerPosition(x, z, angle = 0) {
    if (disposed || !Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(angle)) return;
    playerPosition.set(x, 0, z); playerYaw = angle;
    if (player) player.position.copy(playerPosition);
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
  async function showInspection({ speciesId, cosmeticId = 'none' } = {}) {
    if (disposed) return;
    if (typeof speciesId !== 'string' || !Object.hasOwn(BY_ID, speciesId) || !validModelPath(BY_ID[speciesId].model))
      throw new Error('Unknown Foldwild inspection species');
    if (!['none', 'badge', 'scarf', 'paper-hat'].includes(cosmeticId)) throw new Error('Unknown Foldwild inspection cosmetic');
    const token = reset('inspection');
    inspectionYaw = 0; inspectionCenter.set(0, 1.2, 0);
    const ground = shape(root, 'ground', '#ded8c8', 0, -.025, 0, 160, 160, 1);
    ground.rotation.x = -Math.PI / 2;
    cameraPosition(true);
    await creature('inspection', speciesId, 0, 0, 0, token, 2.4, cosmeticId);
    if (disposed || generation !== token) return;
    const frame = slots.get('inspection')?.frame;
    if (frame) {
      inspectionBounds = new THREE.Box3().setFromObject(frame);
      inspectionBounds.getCenter(inspectionCenter);
      cameraPosition(true);
    }
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
    if (contextStatus === 'lost') { notifyDiagnostic(); return; }
    const dt = Number.isFinite(dtSeconds) ? THREE.MathUtils.clamp(dtSeconds, 0, .1) : 0;
    if (player) updateHumanMotion(player, { x: playerPosition.x, z: playerPosition.z, yaw: playerYaw }, dt, reducedMotion);
    // World creatures and waiting NPCs remain planted; no invented source-model rig or idle bounce.
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
        const pose = battleMotion(effect.type, t);
        if (acting) acting.position.x = slots.get(effect.side).x + direction * pose.acting;
        if (target && effect.type === 'ability') target.position.x = slots.get(effect.side === 'enemy' ? 'player' : 'enemy').x + direction * pose.target;
      }
      if (t === 1) clearEffect();
    }
    for (const label of landmarkLabels) label.visible = mode === 'world' && label.position.distanceTo(playerPosition) < 28;
    cameraPosition(false, dt); renderer.render(scene, camera); frames++;
    if (contextStatus === 'restoring') { contextStatus = 'available'; notifyDiagnostic(); }
  }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect(), width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const maxW = quality === 'low' ? 960 : 1280, maxH = quality === 'low' ? 540 : 720;
    const scale = Math.min(1, maxW / width, maxH / height);
    renderer.setSize(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)), false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (mode === 'inspection') cameraPosition(true);
  }
  function setQuality(value) {
    if (!['low', 'standard'].includes(value)) throw new Error('Unknown Foldwild quality');
    if (disposed) return;
    quality = value; resize(); if (mode === 'world') nearbyVisuals();
  }
  function setAppearance(value = {}) {
    if (disposed || !value || typeof value !== 'object') return;
    const aliases = { skin: 'skinTone', coat: 'coatColor', hair: 'hairColor', pack: 'backpackColor' };
    let changed = false;
    for (const [key, alias] of Object.entries(aliases)) {
      const color = [value[key], value[alias], key === 'pack' ? value.backpack : null]
        .find(candidate => typeof candidate === 'string' && /^#[0-9a-f]{6}$/i.test(candidate));
      if (color && color !== appearance[key]) { appearance[key] = color; changed = true; }
    }
    if (['short', 'cropped', 'long', 'none'].includes(value.hair) && value.hair !== appearance.hairStyle) {
      appearance.hairStyle = value.hair; changed = true;
    }
    if (player && changed) { root.remove(player); player = human(appearance); root.add(player); player.position.copy(playerPosition); player.rotation.y = playerYaw + Math.PI; }
  }
  function orbitCamera(delta) {
    if (disposed || !Number.isFinite(delta)) return;
    if (mode === 'inspection') inspectionYaw = THREE.MathUtils.euclideanModulo(inspectionYaw + delta + Math.PI, Math.PI * 2) - Math.PI;
    else cameraYaw = THREE.MathUtils.euclideanModulo(cameraYaw + delta + Math.PI, Math.PI * 2) - Math.PI;
    if (mode === 'world' || mode === 'inspection') cameraPosition(true);
  }
  function recenterCamera() {
    if (disposed) return;
    if (mode === 'inspection') inspectionYaw = 0;
    else cameraYaw = playerYaw;
    cameraPosition(true);
  }
  function getCameraYaw() { return cameraYaw; }
  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    if (reducedMotion) {
      clearEffect();
      if (player) updateHumanMotion(player, { x: playerPosition.x, z: playerPosition.z, yaw: playerYaw }, 0, true);
      for (const slot of slots.values()) if (slot.frame) slot.frame.position.y = 0;
      cameraPosition(true);
    }
  }
  function pointerDown(event) {
    if (!['world', 'inspection'].includes(mode) || ![0, 2].includes(event.button)) return;
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
    if (p.moved && (mode === 'inspection' || !p.touch || pointers.size > 1)) orbitCamera(-dx * .008 / (p.touch && mode === 'world' ? 2 : 1));
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
  function contextLost(event) {
    event.preventDefault();
    contextStatus = 'lost';
    notifyDiagnostic();
  }
  function contextRestored() {
    // THREE's earlier listener rebuilds GPU state; retained CPU models are not new loads.
    contextStatus = 'restoring';
    resize(); notifyDiagnostic();
  }
  const listeners = { pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerUp,
    pointercancel: pointerCancel, lostpointercapture: pointerCancel, contextmenu: contextMenu,
    webglcontextlost: contextLost, webglcontextrestored: contextRestored };
  for (const [name, callback] of Object.entries(listeners)) canvas.addEventListener(name, callback);
  function inspect() {
    const loaded = [...new Set([...slots.values()].filter(s => s.frame && s.entry).map(s => s.path))];
    return Object.freeze({ mode, frames, quality, cameraYaw, inspectionYaw, ...diagnostic(), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      modelReferences: [...slots.values()].filter(s => s.entry).length,
      inspectionBounds: inspectionBounds ? Object.freeze({
        min: Object.freeze({ x: inspectionBounds.min.x, y: inspectionBounds.min.y, z: inspectionBounds.min.z }),
        max: Object.freeze({ x: inspectionBounds.max.x, y: inspectionBounds.max.y, z: inspectionBounds.max.z })
      }) : null,
      cosmeticAttachments: Object.freeze([...slots.values()].filter(s => s.attachment).map(s => {
        const a = s.attachment, vector = v => v ? Object.freeze({ x: v.x, y: v.y, z: v.z }) : null;
        return Object.freeze({ speciesId: s.id, cosmeticId: a.id, attached: Boolean(a.mesh),
          anchor: vector(a.anchor), position: vector(a.mesh?.position), thickness: a.mesh?.scale.x ?? null, side: a.side ?? null });
      })),
      cameraTarget: Object.freeze({ x: lookAt.x, y: lookAt.y, z: lookAt.z }),
      cacheSize: cache.size, countLoadedModels: loaded.length, loadedModels: Object.freeze(loaded),
      hiddenAvailable, width: canvas.width, height: canvas.height, npcCount: npcs.length,
      cameraPosition: Object.freeze({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      playerMotion: inspectHumanMotion(player),
      npcMotion: Object.freeze(npcs.map(p => Object.freeze({ id: p.id, pose: inspectHumanMotion(p.rig) }))),
      actorPositions: Object.freeze(Object.fromEntries([...slots].filter(([, s]) => s.frame).map(([key, s]) =>
        [key, Object.freeze({ x: s.frame.position.x, y: s.frame.position.y, z: s.frame.position.z })]))),
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures });
  }
  function dispose() {
    if (disposed) return;
    disposed = true; reset(mode);
    for (const [name, callback] of Object.entries(listeners)) canvas.removeEventListener(name, callback);
    for (const entry of cache.values()) retire(entry);
    cache.clear();
    for (const value of geometries.values()) value.dispose();
    for (const value of materials.values()) value.dispose();
    renderer.dispose();
  }
  resize(); cameraPosition(true);
  return { showWorld, setPlayerPosition, showBattle, showInspection, animateAction, render, resize, setReducedMotion,
    setAppearance, setQuality, orbitCamera, recenterCamera, getCameraYaw, inspect, dispose };
}
