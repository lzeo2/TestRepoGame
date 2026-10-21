import * as THREE from './vendor/three.module.js';

export function createFreeCamera(camera, canvas, extent = 1000) {
  const target = new THREE.Vector3(0, 140, 160);
  let yaw = 0, pitch = -.65, targetYaw = yaw, targetPitch = pitch, pointer = null;
  const keys = new Set(), listeners = [];
  let inputVersion = 0;
  camera.rotation.order = 'YXZ';
  camera.position.copy(target);
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
  on(window, 'keyup', event => keys.delete(event.code));
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
    targetPitch = THREE.MathUtils.clamp(targetPitch - (event.clientY - pointer.y) * .004, -Math.PI / 2 + .02, .35);
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
      targetYaw = newYaw;
      targetPitch = THREE.MathUtils.clamp(newPitch, -Math.PI / 2 + .02, .35);
      if (snap) { camera.position.copy(target); yaw = targetYaw; pitch = targetPitch; camera.rotation.set(pitch, yaw, 0); }
    },
    update(dt) {
      dt = THREE.MathUtils.clamp(dt, 0, .1);
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const speed = Math.max(8, target.y * .85) * dt / (forward && right ? Math.SQRT2 : 1);
      target.x += (-Math.sin(targetYaw) * forward + Math.cos(targetYaw) * right) * speed;
      target.z += (-Math.cos(targetYaw) * forward - Math.sin(targetYaw) * right) * speed;
      target.x = THREE.MathUtils.clamp(target.x, -extent, extent);
      target.z = THREE.MathUtils.clamp(target.z, -extent, extent);
      const ease = 1 - Math.exp(-10 * dt);
      camera.position.lerp(target, ease);
      yaw += (targetYaw - yaw) * ease;
      pitch += (targetPitch - pitch) * ease;
      camera.rotation.set(pitch, yaw, 0);
    },
    dispose() { listeners.forEach(remove => remove()); keys.clear(); },
  };
}
