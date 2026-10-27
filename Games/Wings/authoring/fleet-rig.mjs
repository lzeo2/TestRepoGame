// Original presentation-only module. Three is injected; no upstream renderer or combat code.
// API and adapter-only view channels are documented in rig-notes.md.
export const VIEW_LIMITS = Object.freeze({ units: 12, projectiles: 72, effects: 128, events: 256 });
const finite = (x, name) => {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new TypeError(`Invalid ${name}`);
  return x;
};
const vector = (v, length, name) => {
  if (!Array.isArray(v) || v.length !== length) throw new TypeError(`Invalid ${name}`);
  return v.map(x => {
    finite(x, name);
    if (Math.abs(x) > 100000) throw new TypeError(`Out-of-bounds ${name}`);
    return x;
  });
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function createFleetRig(THREE, { parent, team }) {
  if (!parent?.isObject3D || (team !== 0 && team !== 1)) throw new TypeError('Parent and authenticated faction required');
  const root = new THREE.Group();
  root.name = 'fleet-presentation';
  parent.add(root);
  let effectsRoot = new THREE.Group();
  effectsRoot.name = 'authoritative-fleet-effects';
  root.add(effectsRoot);
  let geometry = new THREE.SphereGeometry(1, 8, 6);
  let materials = {
    fire: new THREE.MeshBasicMaterial({ color: 0xffbd69 }),
    impact: new THREE.MeshBasicMaterial({ color: 0xff7542, wireframe: true }),
    projectile: new THREE.MeshBasicMaterial({ color: 0xffde9b }),
  };
  const bindings = new Map(), effects = new Map(), projectiles = new Map();
  let disposed = false, round = null, lastEvent = 0, clock = 0, lastTick = -1;
  const delta = new THREE.Quaternion(), point = new THREE.Vector3(), direction = new THREE.Vector3();
  function active() { if (disposed) throw new Error('Fleet rig disposed'); }
  function clearVisuals() {
    for (const item of effects.values()) item.mesh.removeFromParent();
    for (const mesh of projectiles.values()) mesh.removeFromParent();
    effects.clear(); projectiles.clear();
  }
  function restore(binding, run = action => action()) {
    for (const [node, rest] of binding.rest) {
      run(() => node.position.copy(rest.position));
      run(() => node.quaternion.copy(rest.quaternion));
      run(() => node.scale.copy(rest.scale));
      run(() => { node.visible = rest.visible; });
    }
    run(() => binding.container.position.set(0, 0, 0));
    run(() => binding.container.quaternion.identity());
    run(() => { binding.container.visible = false; });
    binding.visible = false; binding.alive = false; binding.deadAt = null; binding.wake = false;
  }
  function bindUnit(id, object, descriptor) {
    active();
    if (typeof id !== 'string' || !id || bindings.has(id) || bindings.size >= VIEW_LIMITS.units || !object?.isObject3D)
      throw new TypeError('Invalid or duplicate fleet binding');
    if (!descriptor?.objective_only || descriptor.player_vehicle_kind !== null || !Array.isArray(descriptor.articulation))
      throw new TypeError('Objective-only descriptor required');
    const modelRoot = object.getObjectByName(descriptor.root);
    if (!modelRoot) throw new TypeError(`Missing actual root ${descriptor.root}`);
    const find = name => {
      const node = modelRoot.getObjectByName(name);
      if (!node) throw new TypeError(`Missing actual node ${name}`);
      return node;
    };
    const controls = descriptor.articulation.map(control => {
      const node = find(control.node), axis = new THREE.Vector3(...vector(control.axis_local, 3, 'local axis'));
      if (Math.abs(axis.length() - 1) > 1e-5) throw new TypeError('Unit articulation axis required');
      let limits = null;
      if (control.limits_rad != null) {
        limits = vector(control.limits_rad, 2, 'limits');
        if (limits[0] > limits[1]) throw new TypeError('Reversed limits');
      }
      const maxRate = finite(control.mapping?.maximum_rad_s ?? 100, 'spinner rate limit');
      if (maxRate <= 0 || maxRate > 100) throw new TypeError('Invalid spinner rate limit');
      return { node, name: control.node, axis, limits, maxRate };
    });
    const anchors = new Map();
    if (descriptor.main_gun_geometry) {
      const gun = descriptor.main_gun_geometry;
      anchors.set('main_gun', { node: find(gun.muzzle_node), basis: find(gun.pitch_node),
        direction: vector(gun.bore_direction_pitch_local, 3, 'bore direction') });
    }
    for (const launch of descriptor.launch_origins ?? [])
      anchors.set(launch.node, { node: find(launch.node), basis: find(launch.node),
        direction: vector(launch.direction_local, 3, 'launch direction') });
    const rest = new Map();
    object.traverse(node => rest.set(node, { position: node.position.clone(), quaternion: node.quaternion.clone(),
      scale: node.scale.clone(), visible: node.visible }));
    const originalParent = object.parent, container = new THREE.Group();
    container.name = `fleet-unit:${id}`;
    container.add(object); root.add(container);
    const binding = { object, originalParent, container, controls, anchors, rest,
      isSub: descriptor.schema === 'wings_original_submarine_asset_v1', deadAt: null };
    restore(binding); bindings.set(id, binding);
    return container;
  }
  function reset() {
    active(); clearVisuals();
    for (const binding of bindings.values()) restore(binding);
    round = null; lastEvent = 0; lastTick = -1; clock = 0;
  }
  function eligibleSource(id) {
    return !bindings.has(id) || bindings.get(id).visible;
  }
  function snapshotTime(snapshot) {
    if (!Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0 || !Number.isSafeInteger(snapshot.round) || snapshot.round < 0)
      throw new TypeError('Invalid snapshot clock');
    const remainder = finite(snapshot.remainderMs ?? 0, 'remainder');
    if (remainder < 0 || remainder >= 50) throw new TypeError('Invalid remainder');
    return snapshot.tick * .05 + remainder / 1000;
  }
  function update(snapshot) {
    active();
    if (snapshot?.mode !== 'factions' || !Array.isArray(snapshot.units) || !Array.isArray(snapshot.events) ||
        !Array.isArray(snapshot.projectiles) || snapshot.units.length > VIEW_LIMITS.units ||
        snapshot.events.length > VIEW_LIMITS.events || snapshot.projectiles.length > VIEW_LIMITS.projectiles)
      throw new TypeError('Bounded faction snapshot required');
    const nextClock = snapshotTime(snapshot);
    if (round !== null && snapshot.round < round) throw new TypeError('Stale round requires reset');
    if (round !== snapshot.round) { reset(); round = snapshot.round; }
    if (snapshot.tick < lastTick || nextClock < clock) throw new TypeError('Snapshot rewind requires reset');
    if (!snapshot.paused) clock = nextClock;
    lastTick = snapshot.tick;
    // Missing hostile submarine units are NEVER reconstructed from contacts/cells/private scenario data.
    for (const binding of bindings.values()) {
      binding.visible = false; binding.container.visible = false; binding.wake = false;
    }
    const ids = new Set();
    for (const unit of snapshot.units) {
      if (ids.has(unit.id)) throw new TypeError('Duplicate snapshot unit');
      ids.add(unit.id);
      const binding = bindings.get(unit.id);
      if (!binding) continue;
      const position = vector(unit.position, 3, 'unit position');
      const hp = finite(unit.hp, 'unit HP');
      if (typeof unit.alive !== 'boolean') throw new TypeError('Invalid alive state');
      const alive = unit.alive && hp > 0, view = unit.view ?? {};
      const orientation = vector(view.orientation ?? [0, 0, 0, 1], 4, 'orientation');
      if (Math.abs(Math.hypot(...orientation)-1) > 1e-5) throw new TypeError('Unit quaternion required');
      binding.container.position.fromArray(position);
      binding.container.quaternion.fromArray(orientation);
      if (!alive) {
        binding.deadAt ??= clock;
        // Cosmetic sink follows authoritative death only; it never changes simulation HP/objectives.
        binding.container.position.y -= Math.min(15, (clock-binding.deadAt)*1.5);
      } else {
        binding.deadAt = null;
        for (const control of binding.controls) {
          let angle = 0;
          if (control.limits) {
            angle = clamp(finite(view.angles?.[control.name] ?? 0, 'hinge angle'), ...control.limits);
          } else {
            const spin = view.spinners?.[control.name];
            if (spin) {
              const phase = finite(spin.phaseRad, 'spinner phase'), rate = finite(spin.rateRadS, 'spinner speed');
              const epoch = finite(spin.epochSeconds, 'spinner epoch');
              if (Math.abs(rate) > control.maxRate || epoch < 0 || epoch > clock) throw new TypeError('Invalid spinner channel');
              angle = (phase + rate*(clock-epoch)) % (Math.PI*2);
            }
          }
          control.node.quaternion.copy(binding.rest.get(control.node).quaternion)
            .multiply(delta.setFromAxisAngle(control.axis, angle));
        }
      }
      binding.alive = alive;
      binding.visible = alive || clock-binding.deadAt < 10;
      binding.container.visible = binding.visible;
      // Eligibility only, no exact-position wake for an omitted/deep/contact-only submarine.
      binding.wake = alive && (!binding.isSub || unit.depth === 'surfaced') && Math.abs(position[1]) <= .05;
    }
    root.updateWorldMatrix(true, true);
    const liveProjectiles = new Set();
    for (const projectile of snapshot.projectiles) {
      if (!eligibleSource(projectile.source) || (projectile.medium === 'underwater' && projectile.team !== team)) continue;
      if (!Number.isInteger(projectile.id) || projectile.id < 0) throw new TypeError('Invalid projectile ID');
      const p = vector(projectile.position, 3, 'projectile position');
      liveProjectiles.add(projectile.id);
      let mesh = projectiles.get(projectile.id);
      if (!mesh) {
        mesh = new THREE.Mesh(geometry, materials.projectile); mesh.name = `fleet-projectile:${projectile.id}`;
        mesh.scale.setScalar(.22); effectsRoot.add(mesh); projectiles.set(projectile.id, mesh);
      }
      mesh.position.fromArray(p); // Authoritative snapshot position; no extrapolation/hit simulation.
    }
    for (const [id, mesh] of projectiles) if (!liveProjectiles.has(id)) { mesh.removeFromParent(); projectiles.delete(id); }
    for (const event of snapshot.events) {
      if (!Number.isInteger(event.id) || event.id < 1) throw new TypeError('Invalid event ID');
      if (event.id <= lastEvent) continue;
      lastEvent = event.id;
      if (event.round !== round || !eligibleSource(event.source) || !eligibleSource(event.unit)) continue;
      if (!['fire', 'impact'].includes(event.type)) continue;
      if (!Number.isInteger(event.tick) || event.tick < 0) throw new TypeError('Invalid event tick');
      const born = event.tick*.05, ttl = event.type === 'fire' ? .18 : .6;
      if (born > clock || clock-born >= ttl) continue;
      const p = vector(event.position, 3, 'event position');
      if (effects.size >= VIEW_LIMITS.effects) continue;
      const mesh = new THREE.Mesh(geometry, materials[event.type]);
      mesh.name = `fleet-${event.type}:${event.id}`; mesh.position.fromArray(p); effectsRoot.add(mesh);
      effects.set(event.id, { mesh, born, ttl, source: event.source, unit: event.unit });
    }
    for (const [id, item] of effects) {
      const age = clock-item.born;
      if (age >= item.ttl || !eligibleSource(item.source) || !eligibleSource(item.unit)) {
        item.mesh.removeFromParent(); effects.delete(id);
      } else item.mesh.scale.setScalar(.3 + age/item.ttl*1.2);
    }
  }
  function muzzleWorld(id, key = 'main_gun') {
    active();
    const binding = bindings.get(id), anchor = binding?.anchors.get(key);
    if (!binding?.visible || !binding.alive || !anchor) return null;
    anchor.node.updateWorldMatrix(true, false); anchor.basis.updateWorldMatrix(true, false);
    anchor.node.getWorldPosition(point);
    direction.fromArray(anchor.direction).transformDirection(anchor.basis.matrixWorld);
    return { position: point.toArray(), direction: direction.toArray() };
  }
  function wakeEligible(id) { return !disposed && !!bindings.get(id)?.wake; }
  function dispose() {
    if (disposed) return;
    disposed = true; // Set before any caller/backend event can reenter cleanup or application.
    const errors = [], attempt = action => { try { action(); } catch (error) { errors.push(error); } };
    const oldEffects = [...effects.values()], oldProjectiles = [...projectiles.values()], oldBindings = [...bindings.values()];
    const oldGeometry = geometry, oldMaterials = Object.values(materials), oldEffectsRoot = effectsRoot;
    effects.clear(); projectiles.clear(); bindings.clear();
    geometry = null; materials = null; effectsRoot = null;
    for (const item of oldEffects) attempt(() => item.mesh.removeFromParent());
    for (const mesh of oldProjectiles) attempt(() => mesh.removeFromParent());
    for (const binding of oldBindings) {
      restore(binding, attempt);
      attempt(() => binding.object.removeFromParent());
      if (binding.originalParent) attempt(() => binding.originalParent.add(binding.object));
      attempt(() => binding.container.removeFromParent());
      binding.rest.clear(); binding.anchors.clear(); binding.controls.length = 0;
      binding.object = null; binding.originalParent = null; binding.container = null;
    }
    attempt(() => oldEffectsRoot.removeFromParent());
    attempt(() => root.removeFromParent());
    for (const child of [...root.children]) attempt(() => root.remove(child));
    attempt(() => oldGeometry.dispose());
    for (const material of oldMaterials) attempt(() => material.dispose());
    if (errors.length) throw new AggregateError(errors, 'Fleet rig cleanup failed', { cause: errors[0] });
  }
  return Object.freeze({ root, bindUnit, update, muzzleWorld, wakeEligible, reset, dispose,
    stats: () => ({ bindings: bindings.size, effects: effects.size, projectiles: projectiles.size, disposed }) });
}
