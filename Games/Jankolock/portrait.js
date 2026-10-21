const BASE = new URL('.', import.meta.url);
const HASH = 'abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9';
const BYTES = 10972672;

function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export async function mountPortrait(host, { signal, reducedMotion = false } = {}) {
  const controller = new AbortController();
  let disposed = false, renderer, scene, frame = 0, observer, previous = 0;
  let motionOff = Boolean(reducedMotion), dirty = true, pawn, camera, bumpUntil = 0;
  const keys = new Set(), pointers = new Map();
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'Portrait trophy hall');
  section.tabIndex = 0;
  const heading = document.createElement('h2');
  heading.textContent = 'Trophy hall';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back';
  back.style.minHeight = '44px';
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.textContent = 'Loading the supplied portrait...';
  const view = document.createElement('div');
  view.style.cssText = 'width:100%;height:clamp(240px,48vh,480px);position:relative';
  const instructions = document.createElement('p');
  instructions.textContent = 'WASD or arrow keys move the pawn. Bump the pedestal. The portrait is a photo-derived relief, not a full head scan.';
  const controls = document.createElement('div');
  controls.setAttribute('aria-label', 'Hall movement');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
  section.append(heading, back, message, view, instructions, controls);
  host.append(section);
  const result = {
    status: 'loading',
    dispose,
    setReducedMotion(value) { motionOff = Boolean(value); dirty = true; schedule(); }
  };
  const on = (target, type, fn, options = {}) => target.addEventListener(type, fn,
    { ...options, signal: controller.signal });
  const release = () => { keys.clear(); pointers.clear(); dirty = true; };
  function dispose() {
    if (disposed) return;
    disposed = true;
    result.status = 'disposed';
    controller.abort();
    signal?.removeEventListener('abort', dispose);
    cancelAnimationFrame(frame);
    observer?.disconnect();
    release();
    if (scene) disposeTree(scene);
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    section.remove();
  }
  function close() {
    dispose();
    host.dispatchEvent(new Event('portraitclose'));
  }
  function unavailable(text) {
    if (disposed || result.status === 'unavailable') return;
    result.status = 'unavailable';
    message.textContent = text + ' Use Back to return to the arena lobby.';
    release();
    cancelAnimationFrame(frame);
    observer?.disconnect();
    if (scene) { disposeTree(scene); scene = null; }
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
    view.replaceChildren();
    controls.hidden = true;
    instructions.hidden = true;
  }
  function schedule() {
    if (!disposed && result.status === 'ready' && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (disposed || result.status !== 'ready' || document.hidden) return;
    const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
    previous = now;
    const directions = new Set([...keys, ...pointers.values()]);
    let dx = Number(directions.has('right')) - Number(directions.has('left'));
    let dz = Number(directions.has('down')) - Number(directions.has('up'));
    const length = Math.hypot(dx, dz);
    if (length) {
      dx /= length; dz /= length;
      const x = Math.max(-2.3, Math.min(2.3, pawn.position.x + dx * dt * 1.5));
      const z = Math.max(-1.4, Math.min(2.5, pawn.position.z + dz * dt * 1.5));
      const distance = Math.hypot(x, z), radius = 0.82;
      if (distance < radius) {
        pawn.position.x = x / (distance || 1) * radius;
        pawn.position.z = z / (distance || 1) * radius;
        if (now > bumpUntil) {
          message.textContent = 'Bonk. The pedestal stays put.';
          bumpUntil = now + 700;
        }
      } else { pawn.position.x = x; pawn.position.z = z; }
      dirty = true;
    }
    const tilt = !motionOff && now < bumpUntil ? Math.sin(now / 55) * 0.09 : 0;
    if (pawn.rotation.z !== tilt) { pawn.rotation.z = tilt; dirty = true; }
    if (dirty) { renderer.render(scene, camera); dirty = false; }
    if (length || (!motionOff && now < bumpUntil)) schedule();
    else previous = 0;
  }
  on(back, 'click', close);
  on(section, 'keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    const direction = { w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down',
      a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction) { event.preventDefault(); keys.add(direction); schedule(); }
  });
  on(section, 'keyup', event => {
    const direction = { w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down',
      a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction) { event.preventDefault(); keys.delete(direction); }
  });
  on(section, 'focusout', event => { if (!section.contains(event.relatedTarget)) release(); });
  on(window, 'blur', release);
  on(window, 'pagehide', dispose);
  on(document, 'visibilitychange', () => { release(); previous = 0; if (!document.hidden) schedule(); });
  for (const [direction, label] of [['up', 'Forward'], ['left', 'Left'], ['down', 'Backwards'], ['right', 'Right']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.style.cssText = 'min-width:64px;min-height:44px;touch-action:none';
    on(button, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, direction); schedule();
    });
    const up = event => pointers.delete(event.pointerId);
    on(button, 'pointerup', up); on(button, 'pointercancel', up); on(button, 'lostpointercapture', up);
    controls.append(button);
  }
  signal?.addEventListener('abort', dispose, { once: true });
  if (signal?.aborted) { dispose(); return result; }
  try {
    const response = await fetch(new URL('portrait-config.json', BASE), { signal: controller.signal });
    if (!response.ok) throw new Error('manifest unavailable');
    const config = await response.json();
    if (disposed) return result;
    if (!config.enabled || config.integrity !== 'PASS') {
      unavailable('The supplied portrait is unavailable.'); return result;
    }
    if (config.url !== 'assets/portrait_relief.glb' || config.sha256 !== HASH || config.bytes !== BYTES)
      throw new Error('manifest integrity mismatch');
    const [THREE, { GLTFLoader }] = await Promise.all([
      import('./vendor/three.module.js'), import('./vendor/GLTFLoader.js')
    ]);
    if (disposed) return result;
    const canvas = document.createElement('canvas');
    const attributes = { antialias: true, alpha: false, powerPreference: 'low-power' };
    const context = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
    if (!context) { unavailable('WebGL is unavailable on this browser. Canvas arena play is unaffected.'); return result; }
    renderer = new THREE.WebGLRenderer({ canvas, context, ...attributes });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    canvas.setAttribute('aria-label', '3D trophy hall. Use the movement buttons or WASD.');
    on(canvas, 'webglcontextlost', event => {
      event.preventDefault();
      unavailable('The 3D context was lost. Canvas arena play is unaffected.');
    });
    view.append(canvas);
    const asset = await fetch(new URL(config.url, BASE), { signal: controller.signal });
    if (!asset.ok) throw new Error('asset unavailable');
    const bytes = await asset.arrayBuffer();
    if (disposed) return result;
    if (bytes.byteLength !== BYTES || !globalThis.crypto?.subtle) throw new Error('integrity verification unavailable');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      byte => byte.toString(16).padStart(2, '0')).join('');
    if (disposed) return result;
    if (digest !== HASH) throw new Error('asset integrity mismatch');
    const gltf = await new GLTFLoader().parseAsync(bytes, BASE.href);
    if (disposed) { disposeTree(gltf.scene); return result; }
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#eee8dc');
    const bust = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(bust);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.8 / size.y;
    bust.scale.setScalar(scale);
    bust.position.set(-center.x * scale, 0.7 - bounds.min.y * scale, -center.z * scale);
    scene.add(bust);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.7, 32),
      new THREE.MeshStandardMaterial({ color: '#746856', roughness: 1 }));
    pedestal.position.y = 0.35; scene.add(pedestal);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: '#d9d1c1', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005; scene.add(floor);
    pawn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: '#34312c' }));
    body.position.y = 0.16; pawn.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2),
      new THREE.MeshStandardMaterial({ color: '#b35337' }));
    head.position.y = 0.4; pawn.add(head);
    pawn.position.set(0, 0, 1.8); scene.add(pawn);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb3a0, 2.3));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-2, 4, 5); scene.add(light);
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
    function resize() {
      if (disposed || !renderer) return;
      const width = Math.max(1, view.clientWidth), height = Math.max(1, view.clientHeight);
      camera.aspect = width / height;
      // Front (+Z): include the entire bust, pedestal, and pawn even in portrait layouts.
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max(1.55 / Math.tan(vertical), 2.65 / (Math.tan(vertical) * camera.aspect));
      camera.position.set(0, 1.95, distance + 1);
      camera.lookAt(0, 1.15, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false); dirty = true; schedule();
    }
    observer = new ResizeObserver(resize); observer.observe(view);
    result.status = 'ready';
    message.textContent = 'Portrait loaded. WASD or the movement buttons move the pawn.';
    resize(); section.focus({ preventScroll: true });
  } catch (error) {
    if (!disposed) unavailable('The supplied portrait could not load (' +
      (error.message?.includes('integrity') ? 'integrity check failed' : '3D unavailable') + '). Canvas arena play is unaffected.');
  }
  return result;
}
