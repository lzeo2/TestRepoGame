const THUMB_SIZE = 44;

// Each base owns one pointer. The controller reads snapshots in its existing loop.
export function createTouchJoystick(element, { enabled = () => true, deadZone = .12 } = {}) {
  const thumb = element.querySelector('[data-stick-thumb]');
  const zone = Number.isFinite(deadZone) ? Math.max(0, Math.min(.99, deadZone)) : .12;
  const previousTouchAction = element.style.touchAction;
  element.style.touchAction = 'none';
  let owner = null, centerX = 0, centerY = 0, radius = 0;
  let x = 0, y = 0, disposed = false, painted = '';

  function paint(px, py) {
    const transform = `translate(-50%, -50%) translate(${px}px, ${py}px)`;
    if (thumb && painted !== transform) {
      thumb.style.transform = transform;
      painted = transform;
    }
  }

  function clear() {
    const pointerId = owner;
    owner = null;
    x = y = 0;
    paint(0, 0);
    // Reset first: releasePointerCapture may synchronously dispatch lost capture.
    if (pointerId !== null && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }

  function update(event) {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      clear();
      return;
    }
    const dx = event.clientX - centerX, dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance)) {
      clear();
      return;
    }
    const travel = Math.min(distance, radius);
    const ux = distance ? dx / distance : 0, uy = distance ? dy / distance : 0;
    const magnitude = Math.max(0, (travel / radius - zone) / (1 - zone));
    x = magnitude ? ux * magnitude : 0;
    y = magnitude ? uy * magnitude : 0;
    const outputLength = Math.hypot(x, y);
    if (outputLength > 1) {
      const correction = (1 - Number.EPSILON) / outputLength;
      x *= correction;
      y *= correction;
    }
    paint(ux * travel, uy * travel);
  }

  function down(event) {
    if (disposed || owner !== null || event.button !== 0 || !enabled()) return;
    const rect = element.getBoundingClientRect();
    if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) return;
    // A fixed 44px thumb stays inside the circular base; undersized bases stay idle.
    radius = (Math.min(rect.width, rect.height) - THUMB_SIZE) / 2;
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    if (radius <= 0 || !Number.isFinite(centerX) || !Number.isFinite(centerY)) return;
    event.preventDefault();
    owner = event.pointerId;
    try {
      element.setPointerCapture(owner);
    } catch (error) {
      // A pointer can end before capture is established; never retain stale input.
      clear();
      return;
    }
    update(event);
  }

  function move(event) {
    if (disposed || event.pointerId !== owner) return;
    event.preventDefault();
    if (!enabled()) { clear(); return; }
    update(event);
  }

  function end(event) {
    if (event.pointerId !== owner) return;
    event.preventDefault();
    clear();
  }

  const listeners = { pointerdown: down, pointermove: move, pointerup: end, pointercancel: end, lostpointercapture: end };
  for (const [type, listener] of Object.entries(listeners)) element.addEventListener(type, listener, { passive: false });
  paint(0, 0);

  return {
    snapshot: () => ({ x, y, active: owner !== null }),
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      for (const [type, listener] of Object.entries(listeners)) element.removeEventListener(type, listener);
      if (element.style.touchAction === 'none') element.style.touchAction = previousTouchAction;
    },
  };
}
