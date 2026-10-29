import * as THREE from './vendor/three.module.js';

const height = { guardian: 16, walker: 14, 'base-guardian': 16, shrine: 11, patron: 24 };
const order = ['guardian', 'walker', 'base-guardian', 'shrine', 'patron'];
const clamp = n => Math.max(0, Math.min(1, n));
const nameOf = goal => `${goal.lane} ${goal.type.replaceAll('-', ' ')}${goal.type === 'patron' ? ` P${goal.patronPhase}` : ''}`;

// Parent owns text, audio, DOM and route/LOS authority. label(readout, worldAnchor)
// updates ONE label; label(null, null) hides it. No label resources transfer here.
// sync(sim, camera, {hero, events, lane?, isOccluded?}) returns a readout each tick.
// isOccluded({sim, hero, camera, goal, from, to}) returns true/false, else unknown.
// completion is a one-sync pulse; its event is the actual receipt, or null when
// destruction was observed after the parent drained events. No simulation writes.
export function createObjectiveGuide(scene, { label } = {}) {
  const group = new THREE.Group();
  group.name = 'objective-guide';
  group.visible = false;
  const diamondGeometry = new THREE.OctahedronGeometry(.9, 0);
  const barGeometry = new THREE.PlaneGeometry(1, 1);
  const goalMaterial = new THREE.MeshBasicMaterial({ color: 0xe4ba51, depthTest: true });
  const backMaterial = new THREE.MeshBasicMaterial({ color: 0x20201f, depthTest: true });
  const diamond = new THREE.Mesh(diamondGeometry, goalMaterial);
  const bar = new THREE.Group();
  const back = new THREE.Mesh(barGeometry, backMaterial);
  const fill = new THREE.Mesh(barGeometry, goalMaterial);
  back.scale.set(5, .45, 1);
  fill.position.z = .01;
  bar.position.y = -1.6;
  bar.add(back, fill);
  group.add(diamond, bar);
  scene.add(group);
  const anchor = new THREE.Vector3(), projected = new THREE.Vector3(), local = new THREE.Vector3();
  const orientation = new THREE.Quaternion();
  let disposed = false, previous = null, host = null, lastTime = -Infinity;
  let seen = new WeakSet();
  const eventIds = new Set(), completed = new Set();

  function sync(sim, camera, { hero, events = sim.events ?? [], lane = hero?.lane, isOccluded } = {}) {
    if (disposed) return null;
    if (sim !== host || sim.time < lastTime) {
      previous = null; seen = new WeakSet(); eventIds.clear(); completed.clear(); host = sim;
    }
    lastTime = sim.time;
    let completion = null;
    // Event.id is the STRUCTURE id in this host, not an event sequence number.
    for (const event of events) {
      if (!event || event.type !== 'objective_fall') continue;
      const key = event.eventId ?? event.sequence;
      const duplicate = seen.has(event) || key != null && eventIds.has(key);
      seen.add(event);
      if (key != null) eventIds.add(key);
      if (!duplicate && previous?.id === event.id && !completed.has(event.id)) {
        completion = { goalId: event.id, name: previous.name, event, observedDestruction: false };
        completed.add(event.id);
      }
    }
    if (previous && !completed.has(previous.id)) {
      const old = sim.structures.find(s => s.id === previous.id);
      if (old?.alive === false && old.hp <= 0) {
        completion = { goalId: old.id, name: previous.name, event: null, observedDestruction: true };
        completed.add(old.id);
      }
    }
    const legal = hero && sim.phase !== 'pregame' && sim.phase !== 'finished'
      ? sim.structures.filter(s => s.team !== hero.team && s.alive && s.hp > 0 && s.vulnerable) : [];
    const distanceTo = s => Math.hypot(s.position.x - hero.position.x, s.position.y - hero.position.y, s.position.z - hero.position.z);
    legal.sort((a, b) => Number(b.lane === lane) - Number(a.lane === lane) ||
      order.indexOf(a.type) - order.indexOf(b.type) || distanceTo(a) - distanceTo(b) || a.id.localeCompare(b.id));
    const goal = legal[0];
    if (!goal) {
      previous = null; group.visible = false; label?.(null, null);
      return { goalId: null, name: null, distance: null, progress: null,
        offscreenDirection: null, occluded: null, routeHint: null, completion };
    }
    const name = nameOf(goal), hpFraction = clamp(goal.hp / Math.max(1, goal.maxHp));
    anchor.set(goal.position.x, goal.position.y + (height[goal.type] ?? 16), goal.position.z);
    group.position.copy(anchor);
    group.visible = true;
    fill.scale.set(5 * hpFraction, .35, 1);
    fill.position.x = (5 * hpFraction - 5) / 2;
    let offscreenDirection = null, ndc = null;
    if (camera) {
      camera.updateWorldMatrix(true, false);
      bar.quaternion.copy(camera.getWorldQuaternion(orientation));
      projected.copy(anchor).project(camera);
      local.copy(anchor).applyMatrix4(camera.matrixWorldInverse);
      ndc = { x: projected.x, y: projected.y, z: projected.z };
      if (local.z >= 0 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1) {
        // Camera-space bearing remains stable behind the camera. This is NOT a path.
        const x = local.x / camera.aspect, y = local.y;
        const length = Math.hypot(x, y);
        offscreenDirection = length > 1e-8 ? { x: x / length, y: y / length } : { x: 0, y: -1 };
      }
    }
    const result = isOccluded?.({ sim, hero, camera, goal, from: camera?.getWorldPosition(new THREE.Vector3()) ?? hero.position, to: anchor.clone() });
    const occluded = typeof result === 'boolean' ? result : null;
    const readout = { goalId: goal.id, name, distance: distanceTo(goal), hp: goal.hp, maxHp: goal.maxHp,
      hpFraction, progress: 1 - hpFraction, vulnerable: goal.vulnerable, patronPhase: goal.patronPhase ?? null,
      ndc, offscreenDirection, occluded,
      routeHint: occluded === true ? 'Blocked view. Find a lane approach; bearing is not a route.' : 'Bearing only; route not checked.', completion };
    previous = { id: goal.id, name };
    label?.(readout, anchor.clone());
    return readout;
  }
  return { sync, dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent(); previous = null; host = null;
    eventIds.clear(); completed.clear();
    diamondGeometry.dispose(); barGeometry.dispose(); goalMaterial.dispose(); backMaterial.dispose();
    label?.(null, null);
  } };
}
