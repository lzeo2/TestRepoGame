import * as THREE from '../vendor/three.module.js';
import { cloneCharacter } from '../character-assets.mjs';

const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, -1);
const PAPER = '#eee5cd', INK = '#20201f', GRAPHITE = '#494a46';
const RED = '#b55043', WOOD = '#c1a16a';
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

/** Feet at Y=0, face -Z. Preload the real GLBs before constructing a runtime. */
export { createHeroVisual } from './hero-model.mjs';

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
    let animate = () => {}, externalAsset = null, aimAt = null;
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
      externalAsset = cloneCharacter('deployed_stapler', { shareGeometry: true });
      group.add(externalAsset.group);
      group.userData.model = externalAsset.metadata;
      const yawHead=externalAsset.group.getObjectByName('yaw_head'),pitchHead=externalAsset.group.getObjectByName('head_pitch');
      const press=externalAsset.group.getObjectByName('stapler_press'),recoil=externalAsset.group.getObjectByName('barrel_recoil');
      const yawRest=yawHead.rotation.y,pitchRest=pitchHead.rotation.x,pressRest=press.rotation.x,recoilRest=recoil.position.z;
      let lastShot=-1;
      aimAt = point => {
        const delta=point.clone().sub(yawHead.getWorldPosition(new THREE.Vector3()));
        yawHead.rotation.y=yawRest+Math.atan2(-delta.x,-delta.z)-group.rotation.y;
        delta.copy(point).sub(pitchHead.getWorldPosition(new THREE.Vector3()));
        pitchHead.rotation.x=pitchRest+THREE.MathUtils.clamp(Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),-Math.PI/6,Math.PI/4);
        lastShot=age;
      };
      animate=(_,age)=>{
        // Shot-driven recoil only; the tripod stays fixed while the supplied bearing aims.
        const amount=Math.max(0,1-(age-lastShot)/.12);
        press.rotation.x=pressRest-THREE.MathUtils.degToRad(12)*amount;
        recoil.position.z=recoilRest-.03*amount;
      };

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
      rod([0, 0, 0], [0, 0, -l], id === 'shot' ? 0.055 : 0.09);
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
      const cages = (targets.length ? targets : target ? [target] : []).map(point => ({
        point, box: add('box', [0.95, 1.9, 0.75], [0, 0, 0], group, color, true),
        head: add('diamond', [0.5, 0.5, 0.5], [0, 0, 0], group, color, true)
      }));
      add('ring', [1.5, 1.5, 1], [0, 1.2, -0.8]);
      animate = () => cages.forEach(({point, box, head}) => {
        box.position.copy(point).sub(group.position); box.position.y += 0.95;
        head.position.copy(point).sub(group.position); head.position.y += 1.6;
      });
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
      group, remaining: lifetime, position: group.position, aimAt, muzzle:externalAsset?.group.getObjectByName('muzzle'),
      dispose: () => {
        if (removed) return;
        removed = true; handle.remaining = 0; externalAsset?.dispose(); group.removeFromParent(); group.clear();
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
