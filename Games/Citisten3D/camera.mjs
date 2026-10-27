import * as THREE from './vendor/three.module.js';

// Fit the starter square and a complete dry-bank crossing, not the entire map.
export function initialTownPose(roads, terrain, width, height, fov = 60) {
  const mid = Math.floor(roads.size / 2), radius = 3;
  let left = mid - radius;
  if (terrain.layout === 'river-v1') {
    for (let z = mid - radius; z <= mid + radius; z++) {
      left = Math.min(left, Math.floor(terrain.centerAt(z) - terrain.halfWidth - terrain.bankWidth) - 1);
    }
  }
  const a = roads.center(Math.max(0, left), mid - radius);
  const b = roads.center(Math.min(roads.size - 1, mid + radius), mid + radius);
  const phone = width <= 600, tilt = phone ? .5 : .72;
  // Closed mobile Map ends 265px above the bottom; collapsed tools occupy ~114px.
  // Aim below both the top HUD and Map, leaving the bottom tools clear.
  const screenY = phone ? .76 : .52;
  const tan = Math.tan(fov * Math.PI / 360), aspect = Math.max(1, width) / Math.max(1, height);
  const retreat = 1 / Math.tan(tilt + Math.atan((2 * screenY - 1) * tan));
  // Nearest corner includes the hall's 17m roof (20m allowance), with 9% side margins.
  const depth = (b.x - a.x) / 2 / (tan * aspect * .82) + (b.z - a.z) / 2 * Math.cos(tilt) + 20 * Math.sin(tilt);
  const y = Math.min(400, Math.max(phone ? 280 : 215, depth / (Math.sin(tilt) + retreat * Math.cos(tilt))));
  return { x: (a.x + b.x) / 2, y, z: (a.z + b.z) / 2 + y * retreat, yaw: 0, pitch: -tilt };
}

export function createFreeCamera(camera, canvas, extent = 1000, floorHeight = () => 0) {
  const target = new THREE.Vector3(0, 140, 160);
  let yaw = 0, pitch = -.65, targetYaw = yaw, targetPitch = pitch, pointer = null;
  const keys = new Set(), listeners = [];
  let inputVersion = 0;
  camera.rotation.order = 'YXZ';
  camera.position.copy(target);
  // Sweep at sub-trunk intervals, including the radius, so narrow boxes cannot be crossed between frames.
  function clearance(from, to) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z)));
    let floor = 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      floor = Math.max(floor, floorHeight(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, 1) + 2);
    }
    to.y = Math.max(to.y, floor);
  }
  function on(node, name, listener, options) {
    node.addEventListener(name, listener, options);
    listeners.push(() => node.removeEventListener(name, listener, options));
  }
  const editable = node => node instanceof HTMLElement && (node.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(node.tagName));
  on(window, 'keydown', event => {
    if (editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      keys.add(event.code); inputVersion++; event.preventDefault();
    }
  });
  on(window, 'keyup', event => keys.delete(event.code), { capture: true });
  on(window, 'blur', () => { keys.clear(); pointer = null; });
  on(canvas, 'contextmenu', event => event.preventDefault());
  on(canvas, 'pointerdown', event => {
    if (event.button !== 1 && event.button !== 2) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId); inputVersion++; event.preventDefault();
  });
  on(canvas, 'pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    targetYaw -= (event.clientX - pointer.x) * .004;
    targetPitch = THREE.MathUtils.clamp(targetPitch - (event.clientY - pointer.y) * .004, -Math.PI / 2 + .02, Math.PI / 2 - .02);
    pointer.x = event.clientX; pointer.y = event.clientY; inputVersion++;
  });
  const release = event => { if (event.pointerId === pointer?.id) pointer = null; };
  on(canvas, 'pointerup', release);
  on(canvas, 'pointercancel', release);
  on(canvas, 'lostpointercapture', release);
  on(canvas, 'wheel', event => {
    event.preventDefault(); inputVersion++;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
    target.y = THREE.MathUtils.clamp(target.y * Math.exp(THREE.MathUtils.clamp(delta * .0015, -2, 2)), 2, 400);
  }, { passive: false });
  return {
    get inputVersion() { return inputVersion; },
    get target() { return { x: target.x, y: target.y, z: target.z, yaw: targetYaw, pitch: targetPitch }; },
    setPose({ x, y, z, yaw: newYaw = targetYaw, pitch: newPitch = targetPitch }, snap = false) {
      if (![x, y, z, newYaw, newPitch].every(Number.isFinite)) throw new RangeError('Invalid camera pose');
      target.set(THREE.MathUtils.clamp(x, -extent, extent), THREE.MathUtils.clamp(y, 2, 400), THREE.MathUtils.clamp(z, -extent, extent));
      clearance(camera.position, target);
      targetYaw = newYaw;
      targetPitch = THREE.MathUtils.clamp(newPitch, -Math.PI / 2 + .02, Math.PI / 2 - .02);
      if (snap) { camera.position.copy(target); yaw = targetYaw; pitch = targetPitch; camera.rotation.set(pitch, yaw, 0); }
    },
    update(dt) {
      dt = THREE.MathUtils.clamp(dt, 0, .1);
      const previous = target.clone();
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const speed = Math.max(8, target.y * .85) * dt / (forward && right ? Math.SQRT2 : 1);
      target.x += (-Math.sin(targetYaw) * forward + Math.cos(targetYaw) * right) * speed;
      target.z += (-Math.cos(targetYaw) * forward - Math.sin(targetYaw) * right) * speed;
      target.x = THREE.MathUtils.clamp(target.x, -extent, extent);
      target.z = THREE.MathUtils.clamp(target.z, -extent, extent);
      clearance(previous, target);
      const ease = 1 - Math.exp(-10 * dt);
      const next = camera.position.clone().lerp(target, ease);
      clearance(camera.position, next); camera.position.copy(next);
      yaw += (targetYaw - yaw) * ease;
      pitch += (targetPitch - pitch) * ease;
      camera.rotation.set(pitch, yaw, 0);
    },
    dispose() { listeners.forEach(remove => remove()); keys.clear(); },
  };
}
