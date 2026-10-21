import * as THREE from '../vendor/three.module.js';

const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, -1);
const PAPER = '#eee5cd', INK = '#20201f', GRAPHITE = '#494a46';
const RED = '#b55043', ORANGE = '#bd743e', WOOD = '#c1a16a', GLUE = '#dedfc8';
const COLORS = {
  hook: '#c18a38', volley: RED, slam: '#8c68a1', overtime: '#4e80a7',
  turret: RED, barricade: '#4e80a7', grenade: '#c18a38', chaingun: '#8c68a1',
  longshot: '#c18a38', tether: '#8c68a1', headshot: RED, xray: '#4e80a7',
  puddle: '#4e80a7', glue: '#8c68a1', missionbomb: '#c18a38', aura: '#70884c'
};
const GENERIC = ['shot', 'melee', 'parry', 'dash', 'jump', 'slide', 'explosion'];
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;

// Geometry belongs to one hero or manager; materials belong to one hero or handle.
function geometryKit() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    ball: new THREE.SphereGeometry(0.5, 10, 6), diamond: new THREE.OctahedronGeometry(0.5),
    ring: new THREE.TorusGeometry(0.5, 0.045, 4, 20), nib: new THREE.ConeGeometry(0.5, 1, 3)
  };
}
function paints(depthTest = true) {
  const cache = new Map();
  return {
    get(color, wireframe = false) {
      const key = `${color}:${wireframe}`;
      if (!cache.has(key)) {
        cache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, depthTest, depthWrite: depthTest, wireframe }));
      }
      return cache.get(key);
    },
    dispose() { for (const material of cache.values()) material.dispose(); cache.clear(); }
  };
}
function mesh(parent, geo, material, size = [1, 1, 1], at = [0, 0, 0]) {
  const part = new THREE.Mesh(geo, material);
  part.scale.set(...size); part.position.set(...at); parent.add(part);
  return part;
}
function beam(parent, geo, material, a, b, width = 0.06) {
  const delta = b.clone().sub(a), length = delta.length();
  const part = mesh(parent, geo, material, [width, Math.max(length, 0.0001), width]);
  part.position.copy(a).addScaledVector(delta, 0.5);
  if (length > 0) part.quaternion.setFromUnitVectors(UP, delta.divideScalar(length));
  return part;
}
function disposeGeometry(kit) { for (const geo of Object.values(kit)) geo.dispose(); }

/** Feet at Y=0, face -Z. The caller owns group.position and scene membership. */
export function createHeroVisual(id) {
  if (!['stampead', 'turretina', 'snipeoff', 'gooey'].includes(id)) throw new RangeError(`Unknown hero: ${id}`);
  const group = new THREE.Group(), body = new THREE.Group(), kit = geometryKit(), paint = paints();
  group.name = id; body.name = 'bob'; group.add(body);
  const add = (shape, color, size, at, parent = body) => mesh(parent, kit[shape], paint.get(color), size, at);
  const feet = [], arms = [];
  const foot = (x, size, color) => {
    const pivot = new THREE.Group(); pivot.position.x = x; body.add(pivot); feet.push(pivot);
    add('box', color, size, [0, size[1] / 2, 0], pivot); return pivot;
  };
  const hand = (x, shape, color, size, y = 0.95) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); body.add(pivot); arms.push(pivot);
    add(shape, color, size, [0, -0.12, -0.12], pivot); return pivot;
  };
  let eyeY, eyeZ, eyeGap;
  if (id === 'stampead') {
    for (const x of [-0.28, 0.28]) {
      const boot = foot(x, [0.39, 0.28, 0.72], GRAPHITE);
      for (let i = 0; i < 4; i++) add('box', INK, [0.4, 0.035, 0.06], [0, 0.25, -0.27 + i * 0.18], boot);
    }
    for (const x of [-0.28, 0.28]) add('box', GRAPHITE, [0.22, 0.28, 0.25], [x, 0.39, 0]);
    add('box', PAPER, [0.88, 0.83, 0.57], [0, 0.91, 0]);
    add('box', PAPER, [1.16, 0.22, 0.64], [0, 1.25, 0]);
    add('cylinder', GRAPHITE, [0.25, 0.22, 0.25], [0, 1.43, 0]);
    add('ball', INK, [0.92, 0.42, 0.68], [0, 1.65, 0]);
    add('box', PAPER, [0.48, 0.17, 0.04], [0, 1.59, -0.335]);
    hand(-0.57, 'box', PAPER, [0.26, 0.48, 0.32]);
    const fist = hand(0.65, 'box', RED, [0.53, 0.52, 0.63]);
    add('box', INK, [0.48, 0.1, 0.6], [0, -0.39, -0.12], fist);
    eyeY = 1.61; eyeZ = -0.362; eyeGap = 0.12;
  } else if (id === 'turretina') {
    for (const x of [-0.19, 0.19]) foot(x, [0.25, 0.35, 0.38], GRAPHITE);
    add('box', PAPER, [0.67, 0.82, 0.44], [0, 0.87, 0]);
    for (const x of [-0.17, 0.17]) add('box', WOOD, [0.26, 0.43, 0.035], [x, 1.02, -0.25]).rotation.z = x;
    add('ball', PAPER, [0.47, 0.44, 0.43], [0, 1.47, 0]);
    add('cylinder', ORANGE, [0.28, 0.18, 0.28], [0, 1.74, 0.07]);
    for (const y of [1.65, 1.83]) add('cylinder', GRAPHITE, [0.43, 0.055, 0.4], [0, y, 0.07]);
    hand(-0.4, 'box', PAPER, [0.19, 0.5, 0.23]);
    const gun = hand(0.41, 'box', GRAPHITE, [0.25, 0.23, 0.65], 1.12);
    add('box', RED, [0.28, 0.11, 0.5], [0, 0.05, -0.18], gun);
    add('box', INK, [0.13, 0.19, 0.28], [0, -0.15, -0.51], gun);
    add('box', WOOD, [0.34, 0.4, 0.32], [-0.46, 0.73, 0.02]);
    add('box', INK, [0.1, 0.12, 0.04], [-0.46, 0.8, -0.16]);
    eyeY = 1.48; eyeZ = -0.214; eyeGap = 0.085;
  } else if (id === 'snipeoff') {
    for (const x of [-0.12, 0.12]) foot(x, [0.16, 0.57, 0.3], GRAPHITE);
    add('box', PAPER, [0.39, 0.73, 0.32], [0, 0.99, 0]);
    for (const x of [-0.12, 0.12]) add('box', PAPER, [0.18, 0.53, 0.08], [x, 0.57, 0.22]).rotation.x = 0.2;
    add('box', WOOD, [0.27, 0.31, 0.29], [0, 1.49, 0]);
    add('nib', WOOD, [0.51, 0.39, 0.46], [0, 1.82, 0]);
    add('nib', INK, [0.18, 0.16, 0.16], [0, 1.99, 0]);
    hand(-0.29, 'box', PAPER, [0.14, 0.51, 0.18], 1.16);
    const rifle = hand(0.29, 'box', WOOD, [0.14, 0.13, 1.48], 1.2);
    for (let i = 0; i < 8; i++) add('box', INK, [0.095, 0.017, 0.022], [0.02, -0.047, -0.74 + i * 0.15], rifle);
    eyeY = 1.52; eyeZ = -0.154; eyeGap = 0.06;
  } else {
    for (const x of [-0.24, 0.24]) foot(x, [0.4, 0.14, 0.48], GLUE);
    add('ball', GLUE, [1.12, 1.1, 0.91], [0, 0.57, 0]);
    add('ball', GLUE, [0.77, 0.8, 0.73], [0, 1.09, 0]);
    const lid = new THREE.Group(); lid.position.set(0.03, 1.52, 0); lid.rotation.set(0.12, 0, -0.22); body.add(lid);
    add('cylinder', ORANGE, [0.9, 0.13, 0.78], [0, 0, 0], lid);
    add('cylinder', PAPER, [0.64, 0.045, 0.55], [0, 0.08, 0], lid);
    for (const x of [-0.65, 0.65]) hand(x, 'ball', GLUE, [0.49, 0.49, 0.5], 0.82);
    beam(body, kit.cylinder, paint.get(GRAPHITE), new THREE.Vector3(0, 1.25, -0.35), new THREE.Vector3(0, 0.78, -0.49), 0.025);
    add('box', PAPER, [0.4, 0.33, 0.035], [0, 0.68, -0.49]).rotation.z = -0.1;
    eyeY = 1.2; eyeZ = -0.355; eyeGap = 0.12;
  }
  for (const x of [-eyeGap, eyeGap]) {
    add('box', INK, [0.048, 0.048, 0.025], [x, eyeY, eyeZ]).name = 'eye';
  }
  let clock = 0, disposed = false;
  return {
    group,
    update(dt, { state = 'idle', speed = 0, yaw = 0, aiming = false } = {}) {
      if (disposed) return;
      clock += Math.max(0, finite(dt)); group.rotation.y = finite(yaw);
      const moving = Math.min(1, Math.abs(finite(speed)) / 8), step = Math.sin(clock * 11) * moving;
      body.position.y = Math.abs(step) * 0.045;
      body.scale.y = state === 'slide' ? 0.58 : 1;
      body.rotation.x = state === 'slide' ? -0.24 : state === 'jump' ? -0.12 : state === 'fall' ? 0.1 : state === 'dash' ? -0.2 : 0;
      feet.forEach((part, i) => { part.rotation.x = state === 'slide' ? 0 : step * (i ? -0.3 : 0.3); });
      arms.forEach((part, i) => { part.rotation.x = aiming ? -0.18 : step * (i ? 0.12 : -0.12); });
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent(); group.clear(); paint.dispose(); disposeGeometry(kit);
    }
  };
}

/** Pure visual effects. Root positions stay caller-owned, including projectiles. */
export class AbilityFX {
  constructor(scene) {
    this.scene = scene; this.kit = geometryKit(); this.handles = new Map(); this.disposed = false;
  }
  get count() { return this.handles.size; }
  emit(id, { origin = new THREE.Vector3(), target, direction = FRONT, color = COLORS[id] ?? WOOD, duration = 1, targets = [], radius } = {}) {
    if (this.disposed) throw new Error('AbilityFX is disposed');
    if (!Object.hasOwn(COLORS, id) && !GENERIC.includes(id)) throw new RangeError(`Unknown effect: ${id}`);
    if (this.count >= 100) this.handles.keys().next().value.dispose();
    const group = new THREE.Group(), paint = paints(id !== 'xray'), kit = this.kit;
    group.name = id; group.position.copy(origin);
    group.renderOrder = id === 'xray' ? 1000 : 0;
    const delta = target ? target.clone().sub(origin) : direction.clone().normalize().multiplyScalar(id === 'longshot' ? 24 : 6);
    const length = delta.length(), heading = length > 0 ? delta.clone().normalize() : FRONT;
    const yaw = Math.atan2(-heading.x, -heading.z);
    if (id === 'hook' || id === 'tether') group.quaternion.setFromUnitVectors(UP, heading);
    else if (['shot', 'longshot', 'volley', 'glue', 'chaingun'].includes(id)) group.quaternion.setFromUnitVectors(FRONT, heading);
    else if (id !== 'xray') group.rotation.y = yaw;
    const add = (shape, size, at, parent = group, tint = color, wire = false) => mesh(parent, kit[shape], paint.get(tint, wire), size, at);
    const rod = (a, b, width = 0.06, parent = group, tint = color) => beam(parent, kit.cylinder, paint.get(tint), new THREE.Vector3(...a), new THREE.Vector3(...b), width);
    const child = () => { const part = new THREE.Group(); group.add(part); return part; };
    const r = Math.max(0.1, finite(radius, id === 'aura' ? 9 : id === 'slam' ? 7 : 4));
    let animate = () => {};
    if (id === 'hook') {
      const count = Math.max(1, Math.min(48, Math.ceil(length / 0.6))), step = length / count;
      for (let i = 0; i < count; i++) {
        const link = child(); link.position.y = (i + 0.5) * step; link.rotation.y = i % 2 * Math.PI / 2;
        for (const x of [-0.12, 0.12]) add('box', [0.055, step + 0.08, 0.055], [x, 0, 0], link);
        for (const y of [-step / 2, step / 2]) add('box', [0.29, 0.055, 0.055], [0, y, 0], link);
      }
    } else if (id === 'volley' || id === 'glue') {
      const fan = [], count = id === 'volley' ? 5 : 7;
      for (let i = 0; i < count; i++) {
        const part = child(); part.rotation.y = (i - (count - 1) / 2) * 0.16;
        const projectile = new THREE.Group(); part.add(projectile); fan.push(projectile);
        add(id === 'volley' ? 'box' : 'ball', id === 'volley' ? [0.45, 0.24, 0.42] : [0.35 + i % 3 * 0.1, 0.35, 0.4], [0, 0, 0], projectile);
        if (id === 'volley') add('cylinder', [0.16, 0.3, 0.16], [0, 0.25, 0], projectile, INK);
      }
      animate = (t) => fan.forEach(p => { p.position.z = -0.5 - t * Math.min(12, Math.max(3, length)); });
    } else if (id === 'slam' || id === 'parry') {
      for (let i = 0; i < 3; i++) {
        const s = 1 - i * 0.27, seal = child();
        for (const sign of [-1, 1]) {
          add('box', [s * 2, 0.055, 0.07], [0, 0.04 + i * 0.025, sign * s], seal);
          add('box', [0.07, 0.055, s * 2], [sign * s, 0.04 + i * 0.025, 0], seal);
        }
        if (id === 'parry') { seal.rotation.x = Math.PI / 2; seal.position.set(0, 1, -0.9); }
      }
      animate = t => {
        const s = id === 'slam' ? 0.3 + t * r : 0.65 + t * 0.3;
        if (id === 'parry') group.scale.setScalar(s); else group.scale.set(s, 1, s);
      };
    } else if (id === 'overtime') {
      for (let i = 0; i < 4; i++) {
        const bracket = child(); bracket.rotation.y = i * Math.PI / 2;
        add('box', [0.1, 1.6, 0.12], [0.7, 0.9, 0], bracket);
        for (const y of [0.15, 1.65]) add('box', [0.38, 0.1, 0.12], [0.55, y, 0], bracket);
      }
      animate = (_, age) => { group.rotation.y = yaw + age * 1.4; };
    } else if (id === 'turret') {
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        rod([0, 0.65, 0], [Math.cos(a) * 0.52, 0.04, Math.sin(a) * 0.52], 0.11, group, GRAPHITE);
      }
      add('box', [0.65, 0.28, 0.75], [0, 0.84, 0]);
      add('box', [0.45, 0.08, 0.6], [0, 1.04, 0], group, PAPER);
      rod([0, 0.85, -0.35], [0, 0.85, -1.1], 0.18, group, INK);
    } else if (id === 'barricade') {
      for (let i = 0; i < 5; i++) {
        const slab = child(); slab.position.set((i - 2) * 0.72, 0, i % 2 * 0.12); slab.rotation.y = i % 2 ? -0.12 : 0.12;
        add('box', [0.7, 1.8, 0.22], [0, 0.9, 0], slab);
        add('box', [0.29, 0.16, 0.22], [-0.15, 1.85, 0], slab, PAPER);
      }
    } else if (id === 'grenade') {
      const weight = child(); add('diamond', [0.65, 0.7, 0.65], [0, 0, 0], weight);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        rod([0, 0, 0], [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], 0.045, weight, INK);
      }
      animate = (_, age) => {
        weight.position.y = 0.35 + Math.abs(Math.sin(age * 8)) * 0.22;
        weight.rotation.set(age * 3, age * 2, 0);
      };
    } else if (id === 'chaingun') {
      const drum = child(); add('cylinder', [0.67, 0.3, 0.67], [0, 0, 0], drum, GRAPHITE).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, x = Math.cos(a) * 0.23, y = Math.sin(a) * 0.23;
        rod([x, y, 0], [x, y, -0.95], 0.115, drum);
        rod([x, y, -1.15 - i % 2 * 0.3], [x, y, -1.65 - i % 2 * 0.3], 0.035, drum, PAPER);
      }
      animate = (_, age) => { drum.rotation.z = age * 13; };
    } else if (id === 'longshot' || id === 'shot') {
      const l = id === 'shot' ? Math.min(2, Math.max(0.3, length)) : Math.max(0.1, length);
      rod([0, 0, 0], [0, 0, -l], id === 'shot' ? 0.055 : 0.035);
      add('nib', [0.12, 0.4, 0.12], [0, 0, -l]).rotation.x = -Math.PI / 2;
    } else if (id === 'tether') {
      const n = Math.max(8, Math.min(128, Math.ceil(length * 6))); let last = [0, 0, 0];
      for (let i = 1; i <= n; i++) {
        const a = i * Math.PI / 2, coil = i === n ? 0 : 0.15;
        const next = [Math.cos(a) * coil, length * i / n, Math.sin(a) * coil]; rod(last, next, 0.055); last = next;
      }
    } else if (id === 'headshot') {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        add('diamond', [0.2, 0.5, 0.2], [Math.cos(a) * 0.5, 1.95, Math.sin(a) * 0.5]);
      }
      animate = (_, age) => { group.rotation.y = yaw + age; };
    } else if (id === 'xray') {
      for (const point of targets.length ? targets : target ? [target] : []) {
        const p = point.clone().sub(origin);
        add('box', [0.95, 1.9, 0.75], [p.x, p.y + 0.95, p.z], group, color, true);
        add('diamond', [0.5, 0.5, 0.5], [p.x, p.y + 1.6, p.z], group, color, true);
      }
      add('ring', [1.5, 1.5, 1], [0, 1.2, -0.8]);
    } else if (id === 'puddle' || id === 'aura') {
      add('cylinder', [r * 1.65, 0.08, r * 1.8], [0, 0.045, 0]);
      if (id === 'puddle') {
        for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7;
          add('cylinder', [r * 0.8, 0.07, r * (0.6 + i % 3 * 0.12)], [Math.cos(a) * r * 0.65, 0.04, Math.sin(a) * r * 0.6]);
        }
      } else {
        const crosses = [];
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, cross = child();
          cross.position.set(Math.cos(a) * r * 0.65, 0, Math.sin(a) * r * 0.65); crosses.push(cross);
          add('box', [0.16, 0.65, 0.16], [0, 0, 0], cross, PAPER);
          add('box', [0.5, 0.16, 0.16], [0, 0, 0], cross, PAPER);
        }
        animate = (_, age) => crosses.forEach((p, i) => { p.position.y = 0.4 + (age * 0.65 + i * 0.23) % 1.8; });
      }
    } else if (id === 'missionbomb') {
      const memo = child(), splat = child(); add('box', [0.55, 0.55, 0.55], [0, 0, 0], memo, PAPER);
      for (const x of [-0.15, 0.15]) add('box', [0.025, 0.56, 0.56], [x, 0, 0], memo);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const wedge = add('nib', [0.6, 1.6, 0.16], [Math.cos(a), 0.08, Math.sin(a)], splat);
        wedge.rotation.set(Math.PI / 2, 0, a - Math.PI / 2);
      }
      animate = t => {
        memo.visible = t < 0.65; splat.visible = !memo.visible;
        memo.position.y = 0.4 + Math.sin(t * Math.PI) * 1.2; memo.rotation.z = t * 3;
        splat.scale.setScalar(0.5 + t * r / 2);
      };
    } else if (id === 'melee') {
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.25;
        add('box', [0.32, 0.18, 0.22], [Math.sin(a) * 1.3, 0.8, -Math.cos(a) * 1.3]).rotation.y = -a;
      }
      animate = t => { group.rotation.y = yaw + (t - 0.5) * 0.7; };
    } else if (id === 'dash' || id === 'slide') {
      for (let i = 0; i < 3; i++) for (const sign of [-1, 1]) {
        add('box', [0.08, id === 'slide' ? 0.045 : 0.15, 0.75], [sign * 0.25, id === 'slide' ? 0.04 : 0.6, i * 0.7]).rotation.y = sign * 0.6;
      }
      animate = t => { group.scale.z = 0.4 + t * 1.5; };
    } else if (id === 'jump') {
      for (let i = 0; i < 2; i++) add('ring', [1 + i * 0.4, 1 + i * 0.4, 1], [0, 0.08 + i * 0.35, 0]).rotation.x = Math.PI / 2;
      add('diamond', [0.2, 0.6, 0.2], [0, 0.8, 0]); animate = t => { group.scale.setScalar(0.5 + t); };
    } else if (id === 'explosion') {
      add('diamond', [0.8, 0.8, 0.8], [0, 0.3, 0]);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        rod([Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4], [Math.cos(a) * 1.8, i % 3 * 0.35, Math.sin(a) * 1.8], 0.12);
      }
      animate = t => { group.scale.setScalar(0.3 + t * r); };
    }
    const lifetime = Math.max(0.001, finite(duration, 1)); let age = 0, removed = false;
    const handle = {
      group, remaining: lifetime, position: group.position,
      dispose: () => {
        if (removed) return;
        removed = true; handle.remaining = 0; group.removeFromParent(); group.clear();
        paint.dispose(); this.handles.delete(handle);
      }
    };
    this.scene.add(group); animate(0, 0);
    this.handles.set(handle, dt => {
      age += dt; handle.remaining = Math.max(0, lifetime - age);
      if (handle.remaining === 0) handle.dispose(); else animate(age / lifetime, age);
    });
    return handle;
  }
  update(dt) { dt = Math.max(0, finite(dt)); for (const tick of this.handles.values()) tick(dt); }
  clear() { for (const handle of this.handles.keys()) handle.dispose(); }
  dispose() {
    if (this.disposed) return;
    this.clear(); disposeGeometry(this.kit); this.disposed = true;
  }
}
